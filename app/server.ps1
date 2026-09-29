# NMS Save Tracker - local helper
# Serves the app to a private window on this PC only (127.0.0.1), reads your
# No Man's Sky saves for Sync, and stores your app data in the "data" folder
# next to this app. It never changes your game files or saves.

$ErrorActionPreference = 'Stop'
$AppDir    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$WebDir    = Join-Path $AppDir 'web'
$DataDir   = Join-Path $AppDir 'data'
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }
$DataFile  = Join-Path $DataDir 'companion.json'
$PathsFile = Join-Path $DataDir 'paths.json'
$LogFile   = Join-Path $DataDir 'helper.log'
$Port      = 47831
$Prefix    = "http://127.0.0.1:$Port/"
$AutoSaves = Join-Path $env:APPDATA 'HelloGames\NMS'
$Utf8      = New-Object System.Text.UTF8Encoding($false)
$AppName   = 'NMS Save Tracker'

function Write-Log([string]$msg) {
  try { Add-Content -Path $LogFile -Value ("{0:u}  {1}" -f (Get-Date), $msg) -Encoding UTF8 } catch {}
}

function Find-Edge {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
  )
  foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}

function Open-Window {
  $edge = Find-Edge
  $profileDir = Join-Path $DataDir 'window'
  if ($edge) {
    Start-Process -FilePath $edge -ArgumentList @("--app=$Prefix", "--user-data-dir=`"$profileDir`"", '--window-size=1280,880', '--no-first-run', '--no-default-browser-check')
  } else {
    Start-Process $Prefix
  }
}

# ---------- desktop shortcut ----------
function New-Shortcut {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $lnk = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop "$AppName.lnk"))
  $lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
  $lnk.Arguments = '"' + (Join-Path $AppDir "$AppName.vbs") + '"'
  $lnk.WorkingDirectory = $AppDir
  $lnk.IconLocation = (Join-Path $WebDir 'icon.ico') + ',0'
  $lnk.Description = "$AppName for No Man's Sky (unofficial fan-made app)"
  $lnk.Save()
}
# Swap the old "Voidigaunt Companion" desktop shortcut for the new name, once.
function Update-OldShortcut {
  try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $old = Join-Path $desktop 'Voidigaunt Companion.lnk'
    if ((Test-Path $old) -and -not (Test-Path (Join-Path $desktop "$AppName.lnk"))) { New-Shortcut; Remove-Item $old -Force; Write-Log 'Replaced old desktop shortcut' }
  } catch { Write-Log "Shortcut update skipped: $($_.Exception.Message)" }
}

# ---------- game and save folders ----------
function Read-Paths {
  if (Test-Path $PathsFile) { try { return (Get-Content -Raw -Path $PathsFile -Encoding UTF8 | ConvertFrom-Json) } catch {} }
  return [pscustomobject]@{ game = $null; saves = $null }
}
function Save-Paths($p) { [System.IO.File]::WriteAllText($PathsFile, (ConvertTo-Json -InputObject $p -Compress), $Utf8) }

function Test-GameDir([string]$dir) {
  if (-not $dir -or -not (Test-Path -LiteralPath $dir -PathType Container)) { return @{ ok = $false; detail = 'Folder not found.' } }
  $banks = Join-Path $dir 'GAMEDATA\PCBANKS'
  $exe = Join-Path $dir 'Binaries\NMS.exe'
  if (-not (Test-Path -LiteralPath $banks)) { return @{ ok = $false; detail = 'This folder has no GAMEDATA\PCBANKS, so it is not the No Man''s Sky game folder. Pick the folder that contains GAMEDATA and Binaries.' } }
  $paks = @(Get-ChildItem -LiteralPath $banks -Filter '*.pak' -File -ErrorAction SilentlyContinue).Count
  $d = "Found No Man's Sky: $paks game data files"
  if (Test-Path -LiteralPath $exe) { $d += ', NMS.exe present' }
  return @{ ok = ($paks -gt 0); detail = $d + '.' }
}

function Get-SteamLibraries {
  $roots = @()
  foreach ($k in @('HKCU:\Software\Valve\Steam', 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam', 'HKLM:\SOFTWARE\Valve\Steam')) {
    try { $v = Get-ItemProperty -Path $k -ErrorAction Stop; foreach ($n in @('SteamPath', 'InstallPath')) { if ($v.$n) { $roots += ($v.$n -replace '/', '\') } } } catch {}
  }
  $libs = @()
  foreach ($r in ($roots | Select-Object -Unique)) {
    $libs += $r
    $vdf = Join-Path $r 'steamapps\libraryfolders.vdf'
    if (Test-Path $vdf) {
      foreach ($m in [regex]::Matches((Get-Content -Raw $vdf), '"path"\s+"([^"]+)"')) { $libs += ($m.Groups[1].Value -replace '\\\\', '\') }
    }
  }
  return $libs | Select-Object -Unique
}

function Find-Game {
  $cands = @()
  foreach ($lib in Get-SteamLibraries) { $cands += (Join-Path $lib "steamapps\common\No Man's Sky") }
  foreach ($k in @('HKLM:\SOFTWARE\WOW6432Node\GOG.com\Games\1446213994', 'HKLM:\SOFTWARE\GOG.com\Games\1446213994')) {
    try { $v = Get-ItemProperty -Path $k -ErrorAction Stop; if ($v.path) { $cands += $v.path } } catch {}
  }
  foreach ($d in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
    $cands += (Join-Path $d.Root "Program Files (x86)\Steam\steamapps\common\No Man's Sky")
    $cands += (Join-Path $d.Root "SteamLibrary\steamapps\common\No Man's Sky")
    $cands += (Join-Path $d.Root "XboxGames\No Man's Sky\Content")
    $cands += (Join-Path $d.Root "GOG Games\No Man's Sky")
  }
  foreach ($c in ($cands | Select-Object -Unique)) { if ((Test-GameDir $c).ok) { return $c } }
  return $null
}

function Get-SaveDirs {
  # Returns folders that hold save*.hg files: @{ id; full }
  $p = Read-Paths
  $out = @()
  if ($p.saves) {
    if (Test-Path -LiteralPath $p.saves) {
      if (@(Get-ChildItem -LiteralPath $p.saves -Filter 'save*.hg' -File -ErrorAction SilentlyContinue).Count) { $out += @{ id = 'manual'; full = $p.saves } }
      else { Get-ChildItem -LiteralPath $p.saves -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(st_\d+|DefaultUser)$' } | ForEach-Object { $out += @{ id = 'manual:' + $_.Name; full = $_.FullName } } }
    }
    return ,$out
  }
  if (Test-Path $AutoSaves) {
    Get-ChildItem -Path $AutoSaves -Directory | Where-Object { $_.Name -match '^(st_\d+|DefaultUser)$' } | ForEach-Object { $out += @{ id = $_.Name; full = $_.FullName } }
  }
  return ,$out
}

function Get-Saves {
  $list = @()
  foreach ($d in (Get-SaveDirs)) {
    Get-ChildItem -LiteralPath $d.full -File | Where-Object { $_.Name -match '^save\d*\.hg$' } | ForEach-Object {
      $list += [pscustomobject]@{ dir = $d.id; name = $_.Name; size = $_.Length; mtime = [int64](($_.LastWriteTimeUtc - [datetime]'1970-01-01').TotalMilliseconds) }
    }
  }
  return ,$list
}

function Paths-Status {
  $p = Read-Paths
  $gAuto = $null; $gPath = $p.game; $gSrc = 'manual'
  if (-not $gPath) { $gAuto = Find-Game; $gPath = $gAuto; $gSrc = 'auto' }
  $g = if ($gPath) { Test-GameDir $gPath } else { @{ ok = $false; detail = 'Could not find No Man''s Sky automatically. Pick the game folder by hand.' } }
  $dirs = Get-SaveDirs; $count = @(Get-Saves).Count
  $sPath = if ($p.saves) { $p.saves } else { $AutoSaves }
  $sOk = $count -gt 0
  $sDetail = if ($sOk) { "Found $count save file" + $(if ($count -ne 1) { 's' } else { '' }) + " in $(@($dirs).Count) account folder" + $(if (@($dirs).Count -ne 1) { 's' } else { '' }) + '.' } else { 'No save*.hg files here. Steam and GOG saves are in %APPDATA%\HelloGames\NMS. Game Pass saves use a different format this app cannot read yet.' }
  return @{ game = @{ path = $gPath; source = $gSrc; ok = [bool]$g.ok; detail = $g.detail }; saves = @{ path = $sPath; source = $(if ($p.saves) { 'manual' } else { 'auto' }); ok = $sOk; detail = $sDetail } }
}

function Pick-Folder([string]$title, [string]$start) {
  Add-Type -AssemblyName System.Windows.Forms
  $owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false; WindowState = 'Minimized' }
  $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
  $dlg.Description = $title
  $dlg.ShowNewFolderButton = $false
  if ($start -and (Test-Path -LiteralPath $start)) { $dlg.SelectedPath = $start }
  try { $r = $dlg.ShowDialog($owner) } finally { $owner.Dispose() }
  if ($r -eq [System.Windows.Forms.DialogResult]::OK) { return $dlg.SelectedPath }
  return $null
}

# ---------- server ----------
# Already running? Just open another window.
try {
  $r = Invoke-WebRequest -UseBasicParsing -Uri ($Prefix + 'api/ping') -Headers @{ 'X-VC' = '1' } -TimeoutSec 2
  if ($r.StatusCode -eq 200) { Open-Window; exit }
} catch {}

$Mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
  '.json' = 'application/json; charset=utf-8'; '.ico' = 'image/x-icon'; '.png' = 'image/png'; '.svg' = 'image/svg+xml';
  '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8'
}

function Send($ctx, [int]$code, [byte[]]$bytes, [string]$type) {
  $res = $ctx.Response
  $res.StatusCode = $code
  $res.ContentType = $type
  $res.Headers['Cache-Control'] = 'no-store'
  $res.Headers['X-Content-Type-Options'] = 'nosniff'
  $res.ContentLength64 = $bytes.Length
  if ($bytes.Length -gt 0) { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
  $res.OutputStream.Close()
}
function SendText($ctx, [int]$code, [string]$text, [string]$type = 'application/json; charset=utf-8') { Send $ctx $code ($Utf8.GetBytes($text)) $type }
function SendJson($ctx, $obj) { SendText $ctx 200 (ConvertTo-Json -InputObject $obj -Compress -Depth 5) }
function Read-Body($req, [int]$max) {
  if ($req.ContentLength64 -gt $max) { throw 'too large' }
  $sr = New-Object System.IO.StreamReader($req.InputStream, $Utf8)
  try { return $sr.ReadToEnd() } finally { $sr.Dispose() }
}

function Read-Shared([string]$path) {
  $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try { $ms = New-Object System.IO.MemoryStream; $fs.CopyTo($ms); return ,$ms.ToArray() } finally { $fs.Dispose() }
}

function Handle($ctx) {
  $req  = $ctx.Request
  $path = $req.Url.AbsolutePath
  if ($path.StartsWith('/api/')) {
    if ($req.Headers['X-VC'] -ne '1') { SendText $ctx 403 '{"error":"forbidden"}'; return }
    $script:lastPing = Get-Date
    switch ($path) {
      '/api/ping'  { SendText $ctx 200 '{"ok":true,"app":"nms-save-tracker","helper":4}'; return }
      '/api/saves' { SendText $ctx 200 (ConvertTo-Json -InputObject (Get-Saves) -Compress -Depth 3); return }
      '/api/save'  {
        $dir = $req.QueryString['dir']; $name = $req.QueryString['name']
        if ($name -notmatch '^save\d*\.hg$') { SendText $ctx 400 '{"error":"bad save name"}'; return }
        $d = Get-SaveDirs | Where-Object { $_.id -eq $dir } | Select-Object -First 1
        if (-not $d) { SendText $ctx 404 '{"error":"save folder not found"}'; return }
        $p = Join-Path $d.full $name
        if (-not (Test-Path -LiteralPath $p)) { SendText $ctx 404 '{"error":"save not found"}'; return }
        Send $ctx 200 (Read-Shared $p) 'application/octet-stream'; return
      }
      '/api/data'  {
        if ($req.HttpMethod -eq 'POST') {
          $body = Read-Body $req 20MB
          if (-not $body.TrimStart().StartsWith('{')) { SendText $ctx 400 '{"error":"not json"}'; return }
          $tmp = $DataFile + '.tmp'
          [System.IO.File]::WriteAllText($tmp, $body, $Utf8)
          if (Test-Path $DataFile) { Copy-Item $DataFile ($DataFile + '.bak') -Force }
          Move-Item $tmp $DataFile -Force
          SendText $ctx 200 '{"ok":true}'; return
        }
        if (Test-Path $DataFile) { Send $ctx 200 ([System.IO.File]::ReadAllBytes($DataFile)) 'application/json; charset=utf-8' }
        else { SendText $ctx 200 '{}' }
        return
      }
      '/api/paths' {
        if ($req.HttpMethod -eq 'POST') {
          $in = (Read-Body $req 64KB) | ConvertFrom-Json
          $p = Read-Paths
          $cur = @{ game = $p.game; saves = $p.saves }
          foreach ($k in @('game', 'saves')) {
            if ($in.PSObject.Properties.Name -contains $k) {
              $v = $in.$k
              if ($v) { $v = [string]$v; if (-not (Test-Path -LiteralPath $v -PathType Container)) { SendText $ctx 400 ('{"error":"That folder does not exist."}'); return } }
              $cur[$k] = $(if ($v) { $v } else { $null })
            }
          }
          Save-Paths ([pscustomobject]$cur)
        }
        SendJson $ctx (Paths-Status); return
      }
      '/api/pickfolder' {
        $kind = $req.QueryString['kind']
        $st = Paths-Status
        $start = if ($kind -eq 'game') { $st.game.path } else { $st.saves.path }
        $title = if ($kind -eq 'game') { 'Pick your No Man''s Sky game folder (the one with GAMEDATA and Binaries in it)' } else { 'Pick the folder with your No Man''s Sky saves (save.hg files, or the st_ folders)' }
        $picked = Pick-Folder $title $start
        $script:lastPing = Get-Date
        SendJson $ctx @{ path = $picked }; return
      }
      '/api/open' {
        $u = $req.QueryString['url']
        if ($u -notmatch '^https://github\.com/[\w.-]+/[\w.-]+/issues/new\?') { SendText $ctx 400 '{"error":"only GitHub issue links"}'; return }
        Start-Process $u
        SendText $ctx 200 '{"ok":true}'; return
      }
      '/api/shortcut' { New-Shortcut; SendText $ctx 200 '{"ok":true}'; return }
      '/api/report' {
        if ($req.HttpMethod -ne 'POST') { SendText $ctx 405 '{"error":"post only"}'; return }
        $body = Read-Body $req 512KB
        $dir = Join-Path $DataDir 'reports'
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
        $name = 'bug-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt'
        [System.IO.File]::WriteAllText((Join-Path $dir $name), ($body -replace "`r?`n", "`r`n"), $Utf8)
        SendText $ctx 200 ('{"ok":true,"file":"' + $name + '"}'); return
      }
      '/api/openreports' {
        $dir = Join-Path $DataDir 'reports'
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
        Start-Process -FilePath 'explorer.exe' -ArgumentList ('"' + $dir + '"')
        SendText $ctx 200 '{"ok":true}'; return
      }
      '/api/quit' { SendText $ctx 200 '{"ok":true}'; $script:quit = $true; return }
      default { SendText $ctx 404 '{"error":"unknown"}'; return }
    }
  }
  if ($req.HttpMethod -ne 'GET') { SendText $ctx 405 'Method not allowed' 'text/plain'; return }
  $rel = [System.Uri]::UnescapeDataString($path.TrimStart('/'))
  if ($rel -eq '') { $rel = 'index.html' }
  $full = [System.IO.Path]::GetFullPath((Join-Path $WebDir $rel))
  $root = [System.IO.Path]::GetFullPath($WebDir)
  if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) { SendText $ctx 404 'Not found' 'text/plain'; return }
  $ext = [System.IO.Path]::GetExtension($full).ToLower()
  $type = $Mime[$ext]; if (-not $type) { $type = 'application/octet-stream' }
  Send $ctx 200 ([System.IO.File]::ReadAllBytes($full)) $type
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)
try { $listener.Start() } catch { Write-Log "Could not start on port $Port : $($_.Exception.Message)"; exit 1 }
Write-Log "Helper started"
Update-OldShortcut
$script:lastPing = (Get-Date).AddSeconds(90)   # grace period while the window opens
$script:quit = $false
Open-Window

while ($listener.IsListening -and -not $script:quit) {
  $task = $listener.GetContextAsync()
  while (-not $task.AsyncWaitHandle.WaitOne(1000)) {
    if (((Get-Date) - $script:lastPing).TotalSeconds -gt 45) { $script:quit = $true; break }
  }
  if ($script:quit) { break }
  $ctx = $task.GetAwaiter().GetResult()
  try { Handle $ctx } catch {
    Write-Log "Error on $($ctx.Request.Url.AbsolutePath): $($_.Exception.Message)"
    try { SendText $ctx 500 '{"error":"helper error"}' } catch {}
  }
}
$listener.Stop()
Write-Log "Helper stopped"
