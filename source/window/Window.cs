// NMS Save Tracker - app window (unofficial fan-made app for No Man's Sky)
// A small Windows program that shows the Tracker in its own window using
// Microsoft WebView2 (part of Windows 10 and 11), instead of an Edge window.
// It starts the local helper (app\server.ps1) in the background if it isn't
// running yet, then shows http://127.0.0.1:47831/ - the same page as before.
// Links to other websites open in your normal browser.
//
// 2.4.0 adds the in-game overlay:
//  - a small always-on-top overlay window (goals, pinned recipes, money...)
//    that can be see-through and click-through, moved and resized,
//  - the full app as a side panel over part of the screen,
//  - hotkeys that work while the game has focus, and a tray icon so they
//    keep working when the main window is closed.
// Settings live in data\overlay.json; the page edits them through
// WebView2 messages (see Program.OnMessage).
//
// Build: see source/window/build.sh (Mono mcs) - the result is "NMS Save Tracker.exe"
// in the app folder, with the WebView2 libraries in app\lib.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("NMS Save Tracker")]
[assembly: AssemblyProduct("NMS Save Tracker")]
[assembly: AssemblyDescription("Unofficial fan-made app for No Man's Sky")]
[assembly: AssemblyVersion("2.4.0.0")]
[assembly: AssemblyFileVersion("2.4.0.0")]

namespace NmsSaveTracker
{
  // Everything the overlay remembers (data\overlay.json)
  public class OvCfg
  {
    public string HkOverlay = "F8";   // show / hide the overlay
    public string HkPanel = "F9";     // show / hide the app as a side panel
    public string HkClick = "F10";     // overlay click-through on / off
    public string PanelSide = "right";          // left | right
    public int PanelPct = 40;                   // panel width, % of the screen
    public int Opacity = 100;                   // overlay opacity, 30..100 %
    public bool Click = false;                  // overlay ignores the mouse
    public bool Pin = true;                     // overlay stays on screen when you go back to the game
    public bool OverlayOn = false;              // overlay was showing when the app closed
    public int OX, OY, OW, OH;                  // overlay bounds (0 = default)
    public bool Tray = true;                    // closing the window keeps the app in the tray
    public bool TrayTip = false;                // the "still running" tip was shown
  }

  static class Native
  {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint mods, uint vk);
    [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
    [DllImport("user32.dll")] public static extern bool ReleaseCapture();
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll", EntryPoint = "GetWindowLong")] public static extern int GetWindowLong(IntPtr hWnd, int idx);
    [DllImport("user32.dll", EntryPoint = "SetWindowLong")] public static extern int SetWindowLong(IntPtr hWnd, int idx, int val);
    [DllImport("user32.dll")] public static extern bool SetLayeredWindowAttributes(IntPtr hWnd, uint key, byte alpha, uint flags);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);

    public const int WM_HOTKEY = 0x0312, WM_NCHITTEST = 0x84, WM_NCLBUTTONDOWN = 0xA1;
    public const int HTCLIENT = 1, HTCAPTION = 2, HTLEFT = 10, HTRIGHT = 11, HTTOP = 12, HTTOPLEFT = 13, HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;
    public const int GWL_EXSTYLE = -20, WS_EX_TRANSPARENT = 0x20, WS_EX_TOOLWINDOW = 0x80, WS_EX_TOPMOST = 0x8, WS_EX_LAYERED = 0x80000, WS_EX_NOACTIVATE = 0x08000000;
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);

    public static bool Ours(IntPtr h)
    {
      if (h == IntPtr.Zero) return false;
      uint pid; GetWindowThreadProcessId(h, out pid);
      return pid == (uint)Process.GetCurrentProcess().Id;
    }

    // Edge hit test for a borderless window: 'pad' pixels around the client area resize it
    public static int EdgeHit(Form f, Point screen, int pad, bool left, bool right, bool top, bool bottom)
    {
      var p = f.PointToClient(screen);
      bool l = left && p.X < pad, r = right && p.X >= f.ClientSize.Width - pad, t = top && p.Y < pad, b = bottom && p.Y >= f.ClientSize.Height - pad;
      if (t && l) return HTTOPLEFT; if (t && r) return HTTOPRIGHT; if (b && l) return HTBOTTOMLEFT; if (b && r) return HTBOTTOMRIGHT;
      if (l) return HTLEFT; if (r) return HTRIGHT; if (t) return HTTOP; if (b) return HTBOTTOM;
      return 0;
    }
  }

  static class Program
  {
    public const string AppName = "NMS Save Tracker";
    public const int Port = 47831;
    public static string AppDir, DataDir, LibDir, LogFile, CfgFile;
    public static OvCfg Cfg = new OvCfg();
    public static MainForm Win;
    public static OverlayForm Overlay;
    public static Hotkeys HK;
    public static bool Quitting;
    static Task<CoreWebView2Environment> envTask;
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 8 * 1024 * 1024 };

    public static void Log(string msg)
    {
      try { File.AppendAllText(LogFile, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") + "Z  window: " + msg + Environment.NewLine); } catch { }
    }

    [STAThread]
    static int Main()
    {
      AppDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
      DataDir = Path.Combine(AppDir, "data");
      LibDir = Path.Combine(AppDir, "app", "lib");
      try { Directory.CreateDirectory(DataDir); } catch { }
      LogFile = Path.Combine(DataDir, "helper.log");
      CfgFile = Path.Combine(DataDir, "overlay.json");

      // Sharp text on scaled screens (per-monitor v2 on Windows 10 1703+, plain DPI-aware before that)
      try { if (!Native.SetProcessDpiAwarenessContext(new IntPtr(-4))) Native.SetProcessDPIAware(); } catch { try { Native.SetProcessDPIAware(); } catch { } }

      // The WebView2 libraries live in app\lib, not next to the exe
      AppDomain.CurrentDomain.AssemblyResolve += (s, e) => {
        string f = Path.Combine(LibDir, new AssemblyName(e.Name).Name + ".dll");
        return File.Exists(f) ? Assembly.LoadFrom(f) : null;
      };

      // One app at a time: a second launch shows the first one's window (even when it sits in the tray)
      bool fresh;
      using (var mutex = new Mutex(true, "NMSSaveTracker.Window", out fresh))
      {
        if (!fresh)
        {
          try { using (var ev = EventWaitHandle.OpenExisting("NMSSaveTracker.Show")) ev.Set(); return 0; } catch { }
          BringOtherForward(); return 0;
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        LoadCfg();
        try { return Run(); }
        catch (Exception ex) { Log("crashed: " + ex); MessageBox.Show("The app window couldn't start:\n\n" + ex.Message + "\n\nOpening the app in Edge instead.", AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning); OpenInBrowser(); return 1; }
      }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static int Run()
    {
      Win = new MainForm();
      // A second launch sets this event; show the window then
      var show = new EventWaitHandle(false, EventResetMode.AutoReset, "NMSSaveTracker.Show");
      var t = new Thread(() => { while (true) { show.WaitOne(); if (Quitting) return; try { Win.BeginInvoke((Action)(() => Win.ShowNormal())); } catch { } } });
      t.IsBackground = true; t.Start();
      Application.Run(Win);
      return 0;
    }

    static void BringOtherForward()
    {
      var me = Process.GetCurrentProcess();
      foreach (var p in Process.GetProcessesByName(me.ProcessName))
      {
        if (p.Id == me.Id || p.MainWindowHandle == IntPtr.Zero) continue;
        if (Native.IsIconic(p.MainWindowHandle)) Native.ShowWindow(p.MainWindowHandle, 9);
        Native.SetForegroundWindow(p.MainWindowHandle);
        return;
      }
    }

    public static string Url { get { return "http://127.0.0.1:" + Port + "/"; } }

    public static bool HelperUp()
    {
      try
      {
        var rq = (HttpWebRequest)WebRequest.Create(Url + "api/ping");
        rq.Headers.Add("X-VC", "1"); rq.Timeout = 1500; rq.Proxy = null;
        using (var rs = (HttpWebResponse)rq.GetResponse()) return rs.StatusCode == HttpStatusCode.OK;
      }
      catch { return false; }
    }

    static DateTime lastStart = DateTime.MinValue;
    public static void StartHelper()
    {
      if ((DateTime.UtcNow - lastStart).TotalSeconds < 25) return; // one is already starting
      lastStart = DateTime.UtcNow;
      string ps1 = Path.Combine(AppDir, "app", "server.ps1");
      var si = new ProcessStartInfo("powershell.exe", "-NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + ps1 + "\" -NoWindow");
      si.UseShellExecute = false; si.CreateNoWindow = true; si.WorkingDirectory = AppDir;
      Process.Start(si);
      Log("started the helper");
    }

    // Fallback when WebView2 isn't available: the old Edge app window
    public static void OpenInBrowser()
    {
      string[] edges = {
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe") };
      try
      {
        if (!HelperUp()) { StartHelper(); for (int i = 0; i < 40 && !HelperUp(); i++) Thread.Sleep(500); }
        foreach (var e in edges)
          if (File.Exists(e)) { Process.Start(e, "--app=" + Url + " --user-data-dir=\"" + Path.Combine(DataDir, "window") + "\" --window-size=1280,880 --no-first-run --no-default-browser-check"); return; }
        Process.Start(Url);
      }
      catch (Exception ex) { Log("could not open a browser: " + ex.Message); }
    }

    public static void OpenExternal(string uri)
    {
      if (uri == null || !(uri.StartsWith("https://") || uri.StartsWith("http://") || uri.StartsWith("mailto:"))) return;
      try { Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true }); } catch (Exception ex) { Log("could not open link: " + ex.Message); }
    }

    public static string LoaderFolder()
    {
      string arch = (Environment.GetEnvironmentVariable("PROCESSOR_ARCHITECTURE") ?? "").ToUpperInvariant();
      string sub = IntPtr.Size == 4 ? "win-x86" : arch == "ARM64" ? "win-arm64" : "win-x64";
      return Path.Combine(LibDir, "runtimes", sub, "native");
    }

    // One WebView2 environment shared by the main window and the overlay
    public static Task<CoreWebView2Environment> Env()
    {
      if (envTask == null)
      {
        CoreWebView2Environment.SetLoaderDllFolderPath(LoaderFolder());
        envTask = CoreWebView2Environment.CreateAsync(null, Path.Combine(DataDir, "webview2"));
      }
      return envTask;
    }

    // Common set-up for a WebView2 that shows the app page
    public static async Task Attach(WebView2 web, string role, string url)
    {
      await web.EnsureCoreWebView2Async(await Env());
      var cw = web.CoreWebView2;
      cw.Settings.IsStatusBarEnabled = false;
      cw.Settings.IsPasswordAutosaveEnabled = false;
      cw.Settings.IsGeneralAutofillEnabled = false;
      cw.Settings.IsZoomControlEnabled = role == "main";
      // No browser shortcuts (Ctrl+P print, Ctrl+F find, F5 reload...): they clash with hotkeys and do nothing useful here
      cw.Settings.AreBrowserAcceleratorKeysEnabled = false;
      cw.NewWindowRequested += (s, e) => { e.Handled = true; OpenExternal(e.Uri); };
      cw.NavigationStarting += (s, e) => {
        var u = e.Uri ?? "";
        if (u.StartsWith(Url) || u.StartsWith("data:") || u.StartsWith("blob:") || u.StartsWith("about:")) return;
        e.Cancel = true; OpenExternal(u);
      };
      cw.WebMessageReceived += (s, e) => { string m = null; try { m = e.TryGetWebMessageAsString(); } catch { } if (m != null) OnMessage(role, m); };
      web.Source = new Uri(url);
    }

    // ---------- settings ----------
    static void LoadCfg()
    {
      try { if (File.Exists(CfgFile)) Cfg = Json.Deserialize<OvCfg>(File.ReadAllText(CfgFile)) ?? new OvCfg(); }
      catch (Exception ex) { Log("overlay.json unreadable, using defaults: " + ex.Message); Cfg = new OvCfg(); }
      Cfg.PanelPct = Math.Max(20, Math.Min(85, Cfg.PanelPct));
      Cfg.Opacity = Math.Max(30, Math.Min(100, Cfg.Opacity));
      if (Cfg.PanelSide != "left") Cfg.PanelSide = "right";
    }
    public static void SaveCfg()
    {
      try { string tmp = CfgFile + ".tmp"; File.WriteAllText(tmp, Json.Serialize(Cfg)); if (File.Exists(CfgFile)) File.Delete(CfgFile); File.Move(tmp, CfgFile); }
      catch (Exception ex) { Log("could not save overlay.json: " + ex.Message); }
    }

    // ---------- page <-> window messages ----------
    static string S(Dictionary<string, object> d, string k) { object v; return d.TryGetValue(k, out v) && v != null ? Convert.ToString(v) : null; }
    static bool? B(Dictionary<string, object> d, string k) { object v; if (d.TryGetValue(k, out v) && v is bool) return (bool)v; return null; }
    static int? N(Dictionary<string, object> d, string k) { object v; if (d.TryGetValue(k, out v) && v != null) { try { return Convert.ToInt32(v); } catch { } } return null; }

    public static void OnMessage(string role, string json)
    {
      Dictionary<string, object> m;
      try { m = Json.Deserialize<Dictionary<string, object>>(json); } catch { return; }
      if (m == null) return;
      string t = S(m, "t");
      try
      {
        switch (t)
        {
          case "hello": SendCfg(role == "overlay" ? Overlay != null ? Overlay.Web : null : Win.Web); break;
          case "saved": if (Overlay != null) Post(Overlay.Web, "{\"t\":\"state\"}"); break;
          case "setcfg":
            {
              object o; if (!m.TryGetValue("cfg", out o)) break;
              var c = o as Dictionary<string, object>; if (c == null) break;
              bool keys = false, look = false, dock = false;
              string s;
              if ((s = S(c, "HkOverlay")) != null) { Cfg.HkOverlay = s; keys = true; }
              if ((s = S(c, "HkPanel")) != null) { Cfg.HkPanel = s; keys = true; }
              if ((s = S(c, "HkClick")) != null) { Cfg.HkClick = s; keys = true; }
              if ((s = S(c, "PanelSide")) != null) { Cfg.PanelSide = s == "left" ? "left" : "right"; dock = true; }
              int? n;
              if ((n = N(c, "PanelPct")) != null) { Cfg.PanelPct = Math.Max(20, Math.Min(85, n.Value)); dock = true; }
              if ((n = N(c, "Opacity")) != null) { Cfg.Opacity = Math.Max(30, Math.Min(100, n.Value)); look = true; }
              bool? b;
              if ((b = B(c, "Tray")) != null) Cfg.Tray = b.Value;
              if ((b = B(c, "Pin")) != null) Cfg.Pin = b.Value;
              if ((b = B(c, "Click")) != null) { Cfg.Click = b.Value; look = true; }
              if (keys) HK.RegisterAll();
              if (look && Overlay != null) Overlay.ApplyLook();
              if (dock) Win.Redock();
              SaveCfg(); Broadcast();
              break;
            }
          case "overlay": { bool? on = B(m, "on"); bool show = on ?? !(Overlay != null && Overlay.Visible); SetOverlay(show); if (!show && role == "overlay") BackToGame(false); break; }
          case "game": if (role == "overlay") OverlayToGame(); break;
          case "click": ToggleClick(); break;
          case "opacity": { int? d = N(m, "d"); if (d != null) { Cfg.Opacity = Math.Max(30, Math.Min(100, Cfg.Opacity + d.Value)); if (Overlay != null) Overlay.ApplyLook(); SaveCfg(); Broadcast(); } break; }
          case "drag": if (role == "overlay" && Overlay != null) Overlay.StartDrag(); break;
          case "panel": { bool? on = B(m, "on"); if (on == false) Win.HidePanel(); else Win.ShowPanel(); break; }
          case "panel-exit": Win.ShowNormal(); break;
          case "open": { Win.ShowPanel(); string sec = S(m, "sec"); if (sec != null) Post(Win.Web, Json.Serialize(new Dictionary<string, object> { { "t", "go" }, { "sec", sec } })); break; }
          case "quit": Quit(); break;
        }
      }
      catch (Exception ex) { Log("message " + t + " failed: " + ex.Message); }
    }

    public static void Post(WebView2 web, string json)
    {
      try { if (web != null && web.CoreWebView2 != null) web.CoreWebView2.PostWebMessageAsJson(json); } catch { }
    }

    static string CfgJson()
    {
      var d = new Dictionary<string, object> {
        { "t", "cfg" }, { "cfg", Cfg },
        { "hk", HK != null ? HK.Status : new Dictionary<string, string>() },
        { "panel", Win != null && Win.InPanel && Win.Visible },
        { "overlay", Overlay != null && Overlay.Visible },
        { "inuse", Overlay != null && Overlay.Visible && Native.GetForegroundWindow() == Overlay.Handle },
        { "ver", "2.4.0" } };
      return Json.Serialize(d);
    }
    public static void SendCfg(WebView2 web) { Post(web, CfgJson()); }
    public static void Broadcast()
    {
      string j = CfgJson();
      if (Win != null) Post(Win.Web, j);
      if (Overlay != null) Post(Overlay.Web, j);
      if (Win != null) Win.UpdateTray();
    }

    // ---------- actions (hotkeys, tray, page buttons) ----------
    public static void SetOverlay(bool on)
    {
      if (on)
      {
        if (Overlay == null || Overlay.IsDisposed) { Overlay = new OverlayForm(); }
        Overlay.ShowNoActivate();
      }
      else if (Overlay != null) Overlay.Hide();
      Cfg.OverlayOn = on; SaveCfg(); Broadcast();
    }
    // The window that had focus before we took it (normally the game)
    public static IntPtr Game = IntPtr.Zero;
    public static void RememberGame()
    {
      var fg = Native.GetForegroundWindow();
      if (fg != IntPtr.Zero && !Native.Ours(fg)) Game = fg;
    }
    public static void BackToGame(bool force)
    {
      if (Game != IntPtr.Zero && Native.IsWindow(Game)) Native.SetForegroundWindow(Game);
    }
    // F8: hidden -> show and take the mouse; in use -> back to the game; showing but the game has the mouse -> take it
    public static void OverlayKey()
    {
      bool vis = Overlay != null && Overlay.Visible;
      bool inUse = vis && Native.GetForegroundWindow() == Overlay.Handle;
      if (inUse) { OverlayToGame(); return; }
      RememberGame();
      if (!vis) SetOverlay(true);
      if (Cfg.Click) { Cfg.Click = false; Overlay.ApplyLook(); SaveCfg(); }
      Overlay.TakeFocus();
      Broadcast();
    }
    public static void OverlayToGame()
    {
      if (!Cfg.Pin && Overlay != null) { Overlay.Hide(); Cfg.OverlayOn = false; SaveCfg(); }
      BackToGame(false);
      Broadcast();
    }
    public static void ToggleClick()
    {
      Cfg.Click = !Cfg.Click;
      if (Cfg.Click && (Overlay == null || !Overlay.Visible)) SetOverlay(true);
      if (Overlay != null) Overlay.ApplyLook();
      SaveCfg(); Broadcast();
    }
    public static void Hotkey(int id)
    {
      if (id == 1) OverlayKey();
      else if (id == 2) Win.TogglePanel();
      else if (id == 3) ToggleClick();
    }
    public static void Quit()
    {
      Quitting = true;
      SaveCfg();
      try { if (HK != null) HK.UnregisterAll(); } catch { }
      try { if (Overlay != null) Overlay.Close(); } catch { }
      Win.CloseForReal();
    }
  }

  // Global hotkeys (work while the game has focus), on their own hidden window
  class Hotkeys : NativeWindow
  {
    public Dictionary<string, string> Status = new Dictionary<string, string>();
    readonly string[] names = { "", "overlay", "panel", "click" };
    public Hotkeys() { CreateHandle(new CreateParams()); }

    public static bool Parse(string s, out uint mods, out uint vk)
    {
      mods = 0; vk = 0;
      if (string.IsNullOrEmpty(s) || s == "None") return false;
      string key = null;
      foreach (var raw in s.Split(new[] { '+' }))
      {
        var p = raw.Trim(); var l = p.ToLowerInvariant();
        if (l == "ctrl" || l == "control") mods |= 2; else if (l == "shift") mods |= 4; else if (l == "alt") mods |= 1; else if (l == "win") mods |= 8; else key = p;
      }
      if (key == null) return false;
      if (key.Length == 1)
      {
        char c = char.ToUpperInvariant(key[0]);
        if ((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) vk = c;
      }
      else if ((key[0] == 'F' || key[0] == 'f') && key.Length <= 3)
      {
        int n; if (int.TryParse(key.Substring(1), out n) && n >= 1 && n <= 24) vk = (uint)(0x6F + n);
      }
      if (vk == 0) { Keys k; if (Enum.TryParse(key, true, out k)) vk = (uint)k; }
      return vk != 0;
    }

    public void RegisterAll()
    {
      UnregisterAll();
      string[] hk = { null, Program.Cfg.HkOverlay, Program.Cfg.HkPanel, Program.Cfg.HkClick };
      for (int id = 1; id <= 3; id++)
      {
        uint mods, vk;
        if (!Parse(hk[id], out mods, out vk)) { Status[names[id]] = "off"; continue; }
        bool ok = Native.RegisterHotKey(Handle, id, mods | 0x4000 /* no repeat */, vk);
        Status[names[id]] = ok ? "ok" : "taken";
        if (!ok) Program.Log("hotkey " + hk[id] + " is already used by another program");
      }
    }
    public void UnregisterAll() { for (int id = 1; id <= 3; id++) Native.UnregisterHotKey(Handle, id); }

    protected override void WndProc(ref Message m)
    {
      if (m.Msg == Native.WM_HOTKEY) { try { Program.Hotkey(m.WParam.ToInt32()); } catch (Exception ex) { Program.Log("hotkey failed: " + ex.Message); } return; }
      base.WndProc(ref m);
    }
  }

  class MainForm : Form
  {
    public WebView2 Web;
    Label status;
    string boundsFile;
    NotifyIcon tray;
    ToolStripMenuItem miPanel, miOverlay, miClick;
    System.Windows.Forms.Timer keepAlive;
    bool reallyClose;
    float scale = 1f;

    // side panel
    public bool InPanel;
    Rectangle normalBounds; FormWindowState normalState = FormWindowState.Normal;
    Screen panelScreen;
    int pad;

    public MainForm()
    {
      Text = Program.AppName;
      try { Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location); } catch { }
      try { var ico = Path.Combine(Program.AppDir, "web", "icon.ico"); if (File.Exists(ico)) Icon = new Icon(ico); } catch { }
      BackColor = Color.FromArgb(0x15, 0x21, 0x2A);
      StartPosition = FormStartPosition.Manual;
      boundsFile = Path.Combine(Program.DataDir, "window.txt");
      try { using (var g = CreateGraphics()) scale = g.DpiX / 96f; } catch { }
      pad = (int)Math.Round(6 * scale);
      PlaceWindow();

      status = new Label { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter, ForeColor = Color.FromArgb(0xCB, 0xD5, 0xD9), Font = new Font("Segoe UI", 11f), Text = "Starting the NMS Save Tracker…" };
      Controls.Add(status);
      MakeTray();
      Shown += async (s, e) => await Start();
      FormClosing += OnClosing;
      ResizeEnd += (s, e) => { if (InPanel) PanelResized(); };
    }

    void PlaceWindow()
    {
      var wa = Screen.PrimaryScreen.WorkingArea;
      int w = Math.Min((int)(1280 * scale), wa.Width), h = Math.Min((int)(880 * scale), wa.Height);
      Bounds = new Rectangle(wa.Left + (wa.Width - w) / 2, wa.Top + (wa.Height - h) / 2, w, h);
      MinimumSize = new Size((int)(560 * scale), (int)(420 * scale));
      try
      {
        if (!File.Exists(boundsFile)) return;
        var p = File.ReadAllText(boundsFile).Trim().Split(new[] { ',' });
        var r = new Rectangle(int.Parse(p[0]), int.Parse(p[1]), int.Parse(p[2]), int.Parse(p[3]));
        foreach (var sc in Screen.AllScreens)
          if (sc.WorkingArea.IntersectsWith(r) && r.Width >= 300 && r.Height >= 200) { Bounds = r; break; }
        if (p.Length > 4 && p[4] == "max") WindowState = FormWindowState.Maximized;
      }
      catch { }
    }

    void SaveBounds()
    {
      try
      {
        Rectangle r; bool max;
        if (InPanel) { r = normalBounds; max = normalState == FormWindowState.Maximized; }
        else { r = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds; max = WindowState == FormWindowState.Maximized; }
        if (r.Width < 300 || r.Height < 200) return;
        File.WriteAllText(boundsFile, r.X + "," + r.Y + "," + r.Width + "," + r.Height + (max ? ",max" : ""));
      }
      catch { }
    }

    // ---------- tray ----------
    void MakeTray()
    {
      var menu = new ContextMenuStrip();
      var open = new ToolStripMenuItem("Open NMS Save Tracker", null, (s, e) => ShowNormal()) { Font = new Font(SystemFonts.MenuFont, FontStyle.Bold) };
      miPanel = new ToolStripMenuItem("Side panel", null, (s, e) => TogglePanel());
      miOverlay = new ToolStripMenuItem("Overlay", null, (s, e) => Program.SetOverlay(!(Program.Overlay != null && Program.Overlay.Visible)));
      miClick = new ToolStripMenuItem("Overlay click-through", null, (s, e) => Program.ToggleClick());
      menu.Items.AddRange(new ToolStripItem[] { open, miPanel, miOverlay, miClick, new ToolStripSeparator(), new ToolStripMenuItem("Quit", null, (s, e) => Program.Quit()) });
      menu.Opening += (s, e) => UpdateTray();
      tray = new NotifyIcon { Icon = Icon, Text = Program.AppName, ContextMenuStrip = menu, Visible = true };
      tray.DoubleClick += (s, e) => ShowNormal();
    }
    static string Hk(string k) { return string.IsNullOrEmpty(k) || k == "None" ? "" : "   (" + k + ")"; }
    public void UpdateTray()
    {
      if (miPanel == null) return;
      var c = Program.Cfg;
      miPanel.Text = (InPanel && Visible ? "Hide side panel" : "Show as side panel") + Hk(c.HkPanel);
      miOverlay.Text = (Program.Overlay != null && Program.Overlay.Visible ? "Hide overlay" : "Show overlay") + Hk(c.HkOverlay);
      miClick.Text = "Overlay click-through" + Hk(c.HkClick);
      miClick.Checked = c.Click;
    }

    void OnClosing(object s, FormClosingEventArgs e)
    {
      if (!reallyClose && !Program.Quitting && Program.Cfg.Tray && e.CloseReason == CloseReason.UserClosing)
      {
        e.Cancel = true;
        SaveBounds();
        if (InPanel) ExitPanel(false);
        Hide(); Program.Broadcast();
        if (!Program.Cfg.TrayTip)
        {
          Program.Cfg.TrayTip = true; Program.SaveCfg();
          try { tray.ShowBalloonTip(6000, Program.AppName, "Still running here so the overlay hotkeys keep working. Right-click this icon to quit, or turn this off in Settings & help > Overlay.", ToolTipIcon.Info); } catch { }
        }
        return;
      }
      SaveBounds();
      Program.Quitting = true;
      try { if (Program.Overlay != null) Program.Overlay.Close(); } catch { }
      try { tray.Visible = false; tray.Dispose(); } catch { }
    }
    public void CloseForReal() { reallyClose = true; Close(); }

    // ---------- start-up ----------
    async Task Start()
    {
      // 1. make sure the helper is running
      bool up = await Task.Run(() => Program.HelperUp());
      if (!up)
      {
        try { Program.StartHelper(); }
        catch (Exception ex) { Program.Log("could not start the helper: " + ex.Message); }
        for (int i = 0; i < 40 && !up; i++)
        {
          await Task.Delay(500);
          up = await Task.Run(() => Program.HelperUp());
        }
      }
      if (!up)
      {
        status.Text = "The helper didn't start.\nSee data\\helper.log in the app folder, or open \"NMS Save Tracker.vbs\" instead.";
        Program.Log("helper did not answer after 20 s");
        return;
      }

      // 2. show the app in WebView2
      try
      {
        Web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = BackColor };
        Controls.Add(Web);
        await Program.Attach(Web, "main", Program.Url);
        var cw = Web.CoreWebView2;
        cw.DocumentTitleChanged += (s, e) => { var t = cw.DocumentTitle; Text = string.IsNullOrEmpty(t) || t.StartsWith("127.0.0.1") ? Program.AppName : t; };
        Controls.Remove(status);
        Program.Log("window opened (WebView2 " + cw.Environment.BrowserVersionString + ")");
      }
      catch (Exception ex)
      {
        Program.Log("WebView2 unavailable: " + ex.Message);
        Program.OpenInBrowser();
        Program.Quitting = true; reallyClose = true;
        Close();
        return;
      }

      // 3. hotkeys, keep-alive, and the overlay if it was open last time
      try { Program.HK = new Hotkeys(); Program.HK.RegisterAll(); } catch (Exception ex) { Program.Log("hotkeys unavailable: " + ex.Message); }
      keepAlive = new System.Windows.Forms.Timer { Interval = 10000 };
      // The page pings the helper too, but a hidden page's timers slow down; this keeps the helper alive
      // while the app sits in the tray, and restarts it if it stopped.
      keepAlive.Tick += async (s, e) => { bool ok = await Task.Run(() => Program.HelperUp()); if (!ok) { try { Program.StartHelper(); } catch { } } };
      keepAlive.Start();
      UpdateTray();
      if (Program.Cfg.OverlayOn) Program.SetOverlay(true);
    }

    // ---------- normal window / side panel ----------
    public void ShowNormal()
    {
      if (InPanel) ExitPanel(true);
      if (!Visible) Show();
      if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
      Activate(); Native.SetForegroundWindow(Handle);
      Program.Broadcast();
    }

    public void TogglePanel()
    {
      if (InPanel && Visible)
      {
        if (Native.Ours(Native.GetForegroundWindow()) && !(Program.Overlay != null && Native.GetForegroundWindow() == Program.Overlay.Handle)) HidePanel();
        else { Activate(); Native.SetForegroundWindow(Handle); }
        return;
      }
      ShowPanel();
    }

    public void ShowPanel()
    {
      Program.RememberGame();
      var g = Program.Game;
      var sc = g != IntPtr.Zero && Native.IsWindow(g) ? Screen.FromHandle(g) : Screen.FromPoint(Cursor.Position);
      if (!InPanel)
      {
        normalState = WindowState == FormWindowState.Minimized ? FormWindowState.Normal : WindowState;
        normalBounds = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
        if (!Visible) normalBounds = Bounds;
        InPanel = true;
      }
      panelScreen = sc;
      WindowState = FormWindowState.Normal;
      FormBorderStyle = FormBorderStyle.None;
      MinimumSize = new Size(Math.Min((int)(320 * scale), sc.Bounds.Width / 4), 200);
      TopMost = true;
      BackColor = Color.FromArgb(0x3A, 0x4A, 0x50);
      Redock();
      if (!Visible) Show();
      Activate(); Native.SetForegroundWindow(Handle);
      if (Web != null) Web.Focus();
      Program.Broadcast();
    }

    public void Redock()
    {
      if (!InPanel) return;
      var b = (panelScreen ?? Screen.FromControl(this)).Bounds;
      int w = Math.Max(MinimumSize.Width, b.Width * Program.Cfg.PanelPct / 100);
      bool left = Program.Cfg.PanelSide == "left";
      Padding = left ? new Padding(0, 0, pad, 0) : new Padding(pad, 0, 0, 0);
      Bounds = new Rectangle(left ? b.Left : b.Right - w, b.Top, w, b.Height);
    }

    void PanelResized()
    {
      var b = (panelScreen ?? Screen.FromControl(this)).Bounds;
      Program.Cfg.PanelPct = Math.Max(20, Math.Min(85, (int)Math.Round(Width * 100.0 / b.Width)));
      Redock(); Program.SaveCfg(); Program.Broadcast();
    }

    public void HidePanel()
    {
      if (!InPanel) return;
      Hide();
      Program.BackToGame(false);
      Program.Broadcast();
    }

    void ExitPanel(bool restore)
    {
      if (!InPanel) return;
      InPanel = false;
      TopMost = false;
      Padding = new Padding(0);
      BackColor = Color.FromArgb(0x15, 0x21, 0x2A);
      FormBorderStyle = FormBorderStyle.Sizable;
      MinimumSize = new Size((int)(560 * scale), (int)(420 * scale));
      if (restore && normalBounds.Width > 0) { Bounds = normalBounds; WindowState = normalState; }
    }

    protected override void WndProc(ref Message m)
    {
      base.WndProc(ref m);
      if (m.Msg == Native.WM_NCHITTEST && InPanel && (int)m.Result == Native.HTCLIENT)
      {
        bool left = Program.Cfg.PanelSide == "left";
        int x = unchecked((short)(long)m.LParam), y = unchecked((short)((long)m.LParam >> 16));
        int hit = Native.EdgeHit(this, new Point(x, y), pad, !left, left, false, false);
        if (hit != 0) m.Result = (IntPtr)hit;
      }
    }
  }

  // The small always-on-top overlay
  class OverlayForm : Form
  {
    public WebView2 Web;
    int pad;
    bool started;

    public OverlayForm()
    {
      Text = Program.AppName + " overlay";
      try { Icon = Program.Win.Icon; } catch { }
      FormBorderStyle = FormBorderStyle.None;
      ShowInTaskbar = false;
      StartPosition = FormStartPosition.Manual;
      BackColor = Color.FromArgb(0x3A, 0x4A, 0x50);
      float scale = 1f;
      try { using (var g = CreateGraphics()) scale = g.DpiX / 96f; } catch { }
      pad = Math.Max(4, (int)Math.Round(5 * scale));
      Padding = new Padding(pad);
      MinimumSize = new Size((int)(220 * scale), (int)(120 * scale));
      var c = Program.Cfg;
      var r = new Rectangle(c.OX, c.OY, c.OW, c.OH);
      bool onScreen = false;
      foreach (var sc in Screen.AllScreens) if (sc.Bounds.IntersectsWith(r)) onScreen = true;
      if (r.Width < 150 || r.Height < 100 || !onScreen)
      {
        var wa = Screen.PrimaryScreen.WorkingArea;
        int w = (int)(340 * scale), h = (int)(460 * scale);
        r = new Rectangle(wa.Right - w - (int)(24 * scale), wa.Top + (int)(90 * scale), w, h);
      }
      Bounds = r;
      ResizeEnd += (s, e) => SaveBounds();
      Move += (s, e) => { if (Visible) SaveBoundsSoon(); };
      Activated += (s, e) => Program.Broadcast();
      Deactivate += (s, e) => { if (!Program.Quitting) Program.Broadcast(); };
      FormClosing += (s, e) => { SaveBounds(); if (!Program.Quitting && e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Program.SetOverlay(false); } };
    }

    protected override bool ShowWithoutActivation { get { return true; } }
    protected override CreateParams CreateParams
    {
      get { var cp = base.CreateParams; cp.ExStyle |= Native.WS_EX_TOOLWINDOW | Native.WS_EX_TOPMOST; return cp; }
    }

    public void ShowNoActivate()
    {
      if (!Visible) Show();
      Native.SetWindowPos(Handle, Native.HWND_TOPMOST, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010 /* no size, move, activate */);
      ApplyLook();
      if (!started) { started = true; StartWeb(); }
    }

    async void StartWeb()
    {
      try
      {
        Web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(0x15, 0x21, 0x2A) };
        Controls.Add(Web);
        await Program.Attach(Web, "overlay", Program.Url + "?overlay=1");
      }
      catch (Exception ex) { Program.Log("overlay could not start: " + ex.Message); }
    }

    // See-through and click-through use a layered window
    public void ApplyLook()
    {
      if (!IsHandleCreated) return;
      var c = Program.Cfg;
      int ex = Native.GetWindowLong(Handle, Native.GWL_EXSTYLE);
      bool layered = c.Click || c.Opacity < 100;
      ex = layered ? ex | Native.WS_EX_LAYERED : ex & ~Native.WS_EX_LAYERED;
      ex = c.Click ? ex | Native.WS_EX_TRANSPARENT : ex & ~Native.WS_EX_TRANSPARENT;
      Native.SetWindowLong(Handle, Native.GWL_EXSTYLE, ex);
      if (layered) Native.SetLayeredWindowAttributes(Handle, 0, (byte)Math.Round(c.Opacity * 255 / 100.0), 2 /* LWA_ALPHA */);
      Native.SetWindowPos(Handle, Native.HWND_TOPMOST, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010 | 0x0020 /* frame changed */);
    }

    public void TakeFocus()
    {
      if (!Visible) Show();
      Activate();
      Native.SetForegroundWindow(Handle);
      if (Web != null) Web.Focus();
    }

    public void StartDrag()
    {
      Native.ReleaseCapture();
      Native.SendMessage(Handle, Native.WM_NCLBUTTONDOWN, (IntPtr)Native.HTCAPTION, IntPtr.Zero);
      SaveBounds();
    }

    System.Windows.Forms.Timer saveT;
    void SaveBoundsSoon()
    {
      if (saveT == null) { saveT = new System.Windows.Forms.Timer { Interval = 800 }; saveT.Tick += (s, e) => { saveT.Stop(); SaveBounds(); }; }
      saveT.Stop(); saveT.Start();
    }
    void SaveBounds()
    {
      if (WindowState != FormWindowState.Normal || Width < 100) return;
      var c = Program.Cfg; c.OX = Left; c.OY = Top; c.OW = Width; c.OH = Height; Program.SaveCfg();
    }

    protected override void WndProc(ref Message m)
    {
      base.WndProc(ref m);
      if (m.Msg == Native.WM_NCHITTEST && (int)m.Result == Native.HTCLIENT)
      {
        int x = unchecked((short)(long)m.LParam), y = unchecked((short)((long)m.LParam >> 16));
        int hit = Native.EdgeHit(this, new Point(x, y), pad, true, true, true, true);
        if (hit != 0) m.Result = (IntPtr)hit;
      }
    }
  }
}
