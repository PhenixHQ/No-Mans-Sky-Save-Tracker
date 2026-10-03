// NMS Save Tracker - app window (unofficial fan-made app for No Man's Sky)
// A small Windows program that shows the Tracker in its own window using
// Microsoft WebView2 (part of Windows 10 and 11), instead of an Edge window.
// It starts the local helper (app\server.ps1) in the background if it isn't
// running yet, then shows http://127.0.0.1:47831/ - the same page as before.
// Links to other websites open in your normal browser.
//
// Build: see source/window/build.sh (Mono mcs) - the result is "NMS Save Tracker.exe"
// in the app folder, with the WebView2 libraries in app\lib.

using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("NMS Save Tracker")]
[assembly: AssemblyProduct("NMS Save Tracker")]
[assembly: AssemblyDescription("Unofficial fan-made app for No Man's Sky")]
[assembly: AssemblyVersion("2.1.0.0")]
[assembly: AssemblyFileVersion("2.1.0.0")]

namespace NmsSaveTracker
{
  static class Program
  {
    public const string AppName = "NMS Save Tracker";
    public const int Port = 47831;
    public static string AppDir, DataDir, LibDir, LogFile;

    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hWnd);

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

      // Sharp text on scaled screens (per-monitor v2 on Windows 10 1703+, plain DPI-aware before that)
      try { if (!SetProcessDpiAwarenessContext(new IntPtr(-4))) SetProcessDPIAware(); } catch { try { SetProcessDPIAware(); } catch { } }

      // The WebView2 libraries live in app\lib, not next to the exe
      AppDomain.CurrentDomain.AssemblyResolve += (s, e) => {
        string f = Path.Combine(LibDir, new AssemblyName(e.Name).Name + ".dll");
        return File.Exists(f) ? Assembly.LoadFrom(f) : null;
      };

      // One window at a time: a second launch brings the first one forward
      bool fresh;
      using (var mutex = new Mutex(true, "NMSSaveTracker.Window", out fresh))
      {
        if (!fresh) { BringOtherForward(); return 0; }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        try { return Run(); }
        catch (Exception ex) { Log("crashed: " + ex); MessageBox.Show("The app window couldn't start:\n\n" + ex.Message + "\n\nOpening the app in Edge instead.", AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning); OpenInBrowser(); return 1; }
      }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static int Run() { Application.Run(new MainForm()); return 0; }

    static void BringOtherForward()
    {
      var me = Process.GetCurrentProcess();
      foreach (var p in Process.GetProcessesByName(me.ProcessName))
      {
        if (p.Id == me.Id || p.MainWindowHandle == IntPtr.Zero) continue;
        if (IsIconic(p.MainWindowHandle)) ShowWindow(p.MainWindowHandle, 9);
        SetForegroundWindow(p.MainWindowHandle);
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

    public static void StartHelper()
    {
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
  }

  class MainForm : Form
  {
    Microsoft.Web.WebView2.WinForms.WebView2 web;
    Label status;
    string boundsFile;

    public MainForm()
    {
      Text = Program.AppName;
      try { Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location); } catch { }
      try { var ico = Path.Combine(Program.AppDir, "web", "icon.ico"); if (File.Exists(ico)) Icon = new Icon(ico); } catch { }
      BackColor = Color.FromArgb(0x15, 0x21, 0x2A);
      StartPosition = FormStartPosition.Manual;
      boundsFile = Path.Combine(Program.DataDir, "window.txt");
      PlaceWindow();

      status = new Label { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter, ForeColor = Color.FromArgb(0xCB, 0xD5, 0xD9), Font = new Font("Segoe UI", 11f), Text = "Starting the NMS Save Tracker…" };
      Controls.Add(status);
      Shown += async (s, e) => await Start();
      FormClosing += (s, e) => SaveBounds();
    }

    void PlaceWindow()
    {
      float scale = 1f;
      try { using (var g = CreateGraphics()) scale = g.DpiX / 96f; } catch { }
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
        var r = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
        File.WriteAllText(boundsFile, r.X + "," + r.Y + "," + r.Width + "," + r.Height + (WindowState == FormWindowState.Maximized ? ",max" : ""));
      }
      catch { }
    }

    async System.Threading.Tasks.Task Start()
    {
      // 1. make sure the helper is running
      bool up = await System.Threading.Tasks.Task.Run(() => Program.HelperUp());
      if (!up)
      {
        try { Program.StartHelper(); }
        catch (Exception ex) { Program.Log("could not start the helper: " + ex.Message); }
        for (int i = 0; i < 40 && !up; i++)
        {
          await System.Threading.Tasks.Task.Delay(500);
          up = await System.Threading.Tasks.Task.Run(() => Program.HelperUp());
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
        Microsoft.Web.WebView2.Core.CoreWebView2Environment.SetLoaderDllFolderPath(Program.LoaderFolder());
        var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, Path.Combine(Program.DataDir, "webview2"));
        web = new Microsoft.Web.WebView2.WinForms.WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = BackColor };
        Controls.Add(web);
        await web.EnsureCoreWebView2Async(env);
        var cw = web.CoreWebView2;
        cw.Settings.IsStatusBarEnabled = false;
        cw.Settings.IsPasswordAutosaveEnabled = false;
        cw.Settings.IsGeneralAutofillEnabled = false;
        cw.DocumentTitleChanged += (s, e) => { var t = cw.DocumentTitle; Text = string.IsNullOrEmpty(t) || t.StartsWith("127.0.0.1") ? Program.AppName : t; };
        cw.NewWindowRequested += (s, e) => { e.Handled = true; Program.OpenExternal(e.Uri); };
        cw.NavigationStarting += (s, e) => {
          var u = e.Uri ?? "";
          if (u.StartsWith(Program.Url) || u.StartsWith("data:") || u.StartsWith("blob:") || u.StartsWith("about:")) return;
          e.Cancel = true; Program.OpenExternal(u);
        };
        web.Source = new Uri(Program.Url);
        Controls.Remove(status);
        Program.Log("window opened (WebView2 " + cw.Environment.BrowserVersionString + ")");
      }
      catch (Exception ex)
      {
        Program.Log("WebView2 unavailable: " + ex.Message);
        Program.OpenInBrowser();
        Close();
      }
    }
  }
}
