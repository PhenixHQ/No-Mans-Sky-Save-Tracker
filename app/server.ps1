# NMS Save Tracker - local helper
# Serves the app to a private window on this PC only (127.0.0.1), reads your
# No Man's Sky saves for Sync, and stores your app data in the "data" folder
# next to this app. It never changes your game files. It only writes to a save
# when you use the opt-in save tools, never while the game is running, and it
# backs the save up to data\backups first.

$ErrorActionPreference = 'Stop'
$AppDir    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$WebDir    = Join-Path $AppDir 'web'
$DataDir   = Join-Path $AppDir 'data'
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }
$DataFile  = Join-Path $DataDir 'companion.json'
$PathsFile = Join-Path $DataDir 'paths.json'
$IconDir   = Join-Path $DataDir 'icons'
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

# ---------- save tools (opt-in in the app; every write is backed up first) ----------
$BackupDir = Join-Path $DataDir 'backups'
function Get-SaveDir([string]$id) { return (Get-SaveDirs | Where-Object { $_.id -eq $id } | Select-Object -First 1) }
function Test-SaveName([string]$n) { return ($n -match '^(save\d*|accountdata)\.hg$') }
function Test-GameRunning { return [bool](Get-Process -Name 'NMS' -ErrorAction SilentlyContinue) }
function Get-MTime([string]$p) { return [int64](((Get-Item -LiteralPath $p).LastWriteTimeUtc - [datetime]'1970-01-01').TotalMilliseconds) }
function New-Backup($d, [string]$name, [string]$label) {
  if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
  $src = Join-Path $d.full $name
  if (-not (Test-Path -LiteralPath $src)) { throw 'save not found' }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $id = $stamp + '-' + ($name -replace '\.hg$', '')
  $dst = Join-Path $BackupDir $id
  New-Item -ItemType Directory -Path $dst | Out-Null
  [System.IO.File]::WriteAllBytes((Join-Path $dst $name), (Read-Shared $src))
  $mf = Join-Path $d.full ('mf_' + $name)
  if (Test-Path -LiteralPath $mf) { [System.IO.File]::WriteAllBytes((Join-Path $dst ('mf_' + $name)), (Read-Shared $mf)) }
  $info = @{ id = $id; label = $label; dir = $d.id; name = $name; at = [int64]((Get-Date).ToUniversalTime() - [datetime]'1970-01-01').TotalMilliseconds; mtime = (Get-MTime $src); size = (Get-Item -LiteralPath $src).Length }
  [System.IO.File]::WriteAllText((Join-Path $dst 'info.json'), (ConvertTo-Json -InputObject $info -Compress), $Utf8)
  Write-Log "Backup $id ($label)"
  return $info
}
function Get-Backups {
  $out = @()
  if (Test-Path $BackupDir) {
    Get-ChildItem -LiteralPath $BackupDir -Directory | ForEach-Object {
      $f = Join-Path $_.FullName 'info.json'
      if (Test-Path $f) { try { $out += (Get-Content -Raw -LiteralPath $f -Encoding UTF8 | ConvertFrom-Json) } catch {} }
    }
  }
  return ,$out
}
function Get-BackupPath([string]$id) {
  if ($id -notmatch '^[0-9]{8}-[0-9]{6}-[0-9]{3}-[a-z0-9]+$') { return $null }
  $p = Join-Path $BackupDir $id
  if (Test-Path -LiteralPath $p -PathType Container) { return $p } else { return $null }
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

# ---------- game packs (read-only, for item icons) ----------
$script:BanksCache = $null; $script:BanksAt = [datetime]::MinValue
function Get-BanksDir {
  # Cached for a minute: the page reads many ranges in a row and finding the game can take a moment.
  if ($script:BanksCache -and ((Get-Date) - $script:BanksAt).TotalSeconds -lt 60) { return $script:BanksCache }
  $script:BanksCache = $null; $script:BanksAt = Get-Date
  $st = Paths-Status
  if (-not $st.game.ok -or -not $st.game.path) { return $null }
  $b = Join-Path $st.game.path 'GAMEDATA\PCBANKS'
  if (Test-Path -LiteralPath $b) { $script:BanksCache = $b; return $b } else { return $null }
}
function Read-Range([string]$path, [int64]$off, [int]$len) {
  $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    if ($off -ge $fs.Length) { return ,([byte[]]@()) }
    $len = [int][Math]::Min([int64]$len, $fs.Length - $off)
    $buf = New-Object byte[] $len
    [void]$fs.Seek($off, [System.IO.SeekOrigin]::Begin)
    $got = 0
    while ($got -lt $len) { $n = $fs.Read($buf, $got, $len - $got); if ($n -le 0) { break }; $got += $n }
    return ,$buf
  } finally { $fs.Dispose() }
}
function Read-BodyBytes($req, [int]$max) {
  if ($req.ContentLength64 -gt $max) { throw 'too large' }
  $ms = New-Object System.IO.MemoryStream
  try { $req.InputStream.CopyTo($ms); if ($ms.Length -gt $max) { throw 'too large' }; return ,$ms.ToArray() } finally { $ms.Dispose() }
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
  '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8'; '.webp' = 'image/webp'
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
      '/api/ping'  { SendText $ctx 200 '{"ok":true,"app":"nms-save-tracker","helper":7}'; return }
      '/api/gamerunning' { SendJson $ctx @{ running = (Test-GameRunning) }; return }
      '/api/savefiles' {
        # Every save, manifest and account file in one account folder (for the save tools).
        $d = Get-SaveDir ([string]$req.QueryString['dir']); if (-not $d) { SendText $ctx 404 '{"error":"save folder not found"}'; return }
        $list = @(Get-ChildItem -LiteralPath $d.full -File | Where-Object { $_.Name -match '^(mf_)?(save\d*|accountdata)\.hg$' } | ForEach-Object { [pscustomobject]@{ name = $_.Name; size = $_.Length; mtime = [int64](($_.LastWriteTimeUtc - [datetime]'1970-01-01').TotalMilliseconds) } })
        SendText $ctx 200 (ConvertTo-Json -InputObject @{ dir = $d.id; files = $list } -Compress -Depth 4); return
      }
      '/api/savefile' {
        $d = Get-SaveDir ([string]$req.QueryString['dir']); $name = [string]$req.QueryString['name']
        if (-not $d) { SendText $ctx 404 '{"error":"save folder not found"}'; return }
        if ($name -notmatch '^(mf_)?(save\d*|accountdata)\.hg$') { SendText $ctx 400 '{"error":"bad file name"}'; return }
        $p = Join-Path $d.full $name
        if (-not (Test-Path -LiteralPath $p)) { SendText $ctx 404 '{"error":"file not found"}'; return }
        Send $ctx 200 (Read-Shared $p) 'application/octet-stream'; return
      }
      '/api/savewrite' {
        # Body: 4-byte little-endian length of the new save, the save bytes, then the new manifest bytes.
        if ($req.HttpMethod -ne 'POST') { SendText $ctx 405 '{"error":"post only"}'; return }
        $d = Get-SaveDir ([string]$req.QueryString['dir']); $name = [string]$req.QueryString['name']; $label = [string]$req.QueryString['label']
        if (-not $d) { SendText $ctx 404 '{"error":"save folder not found"}'; return }
        if (-not (Test-SaveName $name)) { SendText $ctx 400 '{"error":"bad save name"}'; return }
        # menu=1: near-live mode. The player has confirmed the game is sitting at its main menu, where it doesn't hold the save.
        if ((Test-GameRunning) -and [string]$req.QueryString['menu'] -ne '1') { SendText $ctx 409 '{"error":"No Man''s Sky is running. Save and quit the game first, then try again.","running":true}'; return }
        $p = Join-Path $d.full $name; $mfp = Join-Path $d.full ('mf_' + $name)
        if (-not (Test-Path -LiteralPath $p) -or -not (Test-Path -LiteralPath $mfp)) { SendText $ctx 404 '{"error":"save or manifest not found"}'; return }
        [int64]$expect = 0
        if ([int64]::TryParse([string]$req.QueryString['expect'], [ref]$expect) -and $expect -gt 0) {
          if ([Math]::Abs((Get-MTime $p) - $expect) -gt 1500) { SendText $ctx 409 '{"error":"The save changed since it was loaded (the game saved again). Reload it in the save tools and make the change again."}'; return }
        }
        $body = Read-BodyBytes $req 64MB
        if ($body.Length -lt 8) { SendText $ctx 400 '{"error":"empty"}'; return }
        $n = [BitConverter]::ToUInt32($body, 0)
        if ($n -le 16 -or ($n + 4) -ge $body.Length) { SendText $ctx 400 '{"error":"bad body"}'; return }
        $save = New-Object byte[] $n; [Array]::Copy($body, 4, $save, 0, $n)
        $mfl = $body.Length - 4 - $n; $mf = New-Object byte[] $mfl; [Array]::Copy($body, 4 + $n, $mf, 0, $mfl)
        # 4276986341 = 0xFEEDA1E5, the marker at the start of every save chunk
        if ([BitConverter]::ToUInt32($save, 0) -ne [uint32]4276986341) { SendText $ctx 400 '{"error":"not a save"}'; return }
        if ($mfl -ne (Get-Item -LiteralPath $mfp).Length) { SendText $ctx 400 '{"error":"manifest size does not match"}'; return }
        if (-not $label) { $label = 'Before an edit' }
        $bk = New-Backup $d $name $label
        $tmp = $p + '.nmst.tmp'; $tmf = $mfp + '.nmst.tmp'
        [System.IO.File]::WriteAllBytes($tmp, $save); [System.IO.File]::WriteAllBytes($tmf, $mf)
        Move-Item -LiteralPath $tmp -Destination $p -Force
        Move-Item -LiteralPath $tmf -Destination $mfp -Force
        # read both files back and compare them with what was sent
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try {
          $h = { param($b) [BitConverter]::ToString($sha.ComputeHash([byte[]]$b)) }
          $same = ((& $h ([System.IO.File]::ReadAllBytes($p))) -eq (& $h $save)) -and ((& $h ([System.IO.File]::ReadAllBytes($mfp))) -eq (& $h $mf))
        } finally { $sha.Dispose() }
        Write-Log "Wrote $name in $($d.id) ($($save.Length) bytes, check $same, backup $($bk.id))"
        SendText $ctx 200 (ConvertTo-Json -InputObject @{ ok = $same; backup = $bk.id; mtime = (Get-MTime $p); size = $save.Length } -Compress); return
      }
      '/api/backups' {
        if ($req.HttpMethod -eq 'POST') {
          $act = [string]$req.QueryString['action']
          if ($act -eq 'create') {
            $d = Get-SaveDir ([string]$req.QueryString['dir']); $name = [string]$req.QueryString['name']
            if (-not $d -or -not (Test-SaveName $name)) { SendText $ctx 400 '{"error":"bad save"}'; return }
            $label = [string]$req.QueryString['label']; if (-not $label) { $label = 'Made by hand' }
            SendJson $ctx (New-Backup $d $name $label.Substring(0, [Math]::Min(80, $label.Length))); return
          }
          if ($act -eq 'delete') {
            $bp = Get-BackupPath ([string]$req.QueryString['id']); if (-not $bp) { SendText $ctx 404 '{"error":"no such backup"}'; return }
            Remove-Item -LiteralPath $bp -Recurse -Force; SendText $ctx 200 '{"ok":true}'; return
          }
          if ($act -eq 'label') {
            $bp = Get-BackupPath ([string]$req.QueryString['id']); if (-not $bp) { SendText $ctx 404 '{"error":"no such backup"}'; return }
            $f = Join-Path $bp 'info.json'; $info = Get-Content -Raw -LiteralPath $f -Encoding UTF8 | ConvertFrom-Json
            $l = [string]$req.QueryString['label']; $info.label = $l.Substring(0, [Math]::Min(80, $l.Length))
            [System.IO.File]::WriteAllText($f, (ConvertTo-Json -InputObject $info -Compress), $Utf8); SendText $ctx 200 '{"ok":true}'; return
          }
          if ($act -eq 'open') {
            if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
            Start-Process -FilePath 'explorer.exe' -ArgumentList ('"' + $BackupDir + '"'); SendText $ctx 200 '{"ok":true}'; return
          }
          SendText $ctx 400 '{"error":"unknown action"}'; return
        }
        SendText $ctx 200 (ConvertTo-Json -InputObject (Get-Backups) -Compress -Depth 3); return
      }
      '/api/backupfile' {
        $bp = Get-BackupPath ([string]$req.QueryString['id']); $name = [string]$req.QueryString['name']
        if (-not $bp -or $name -notmatch '^(mf_)?(save\d*|accountdata)\.hg$') { SendText $ctx 404 '{"error":"not found"}'; return }
        $f = Join-Path $bp $name; if (-not (Test-Path -LiteralPath $f)) { SendText $ctx 404 '{"error":"not found"}'; return }
        Send $ctx 200 ([System.IO.File]::ReadAllBytes($f)) 'application/octet-stream'; return
      }
      '/api/iconpack' {
        # One file with every icon, so the app can show them all at start-up with a single read.
        if ($req.HttpMethod -ne 'POST') { SendText $ctx 405 '{"error":"post only"}'; return }
        if (-not (Test-Path $IconDir)) { New-Item -ItemType Directory -Path $IconDir | Out-Null }
        $bytes = Read-BodyBytes $req 96MB
        $tmp = Join-Path $IconDir 'pack.bin.tmp'
        [System.IO.File]::WriteAllBytes($tmp, $bytes); Move-Item -LiteralPath $tmp -Destination (Join-Path $IconDir 'pack.bin') -Force
        SendText $ctx 200 '{"ok":true}'; return
      }
      '/api/paks'  {
        $b = Get-BanksDir
        if (-not $b) { SendJson $ctx @{ ok = $false; detail = 'Could not find your No Man''s Sky game files. Check the game folder in Settings, Game files.' }; return }
        $list = @(Get-ChildItem -LiteralPath $b -Filter 'NMSARC.*.pak' -File | ForEach-Object { [pscustomobject]@{ name = $_.Name; size = $_.Length; mtime = [int64](($_.LastWriteTimeUtc - [datetime]'1970-01-01').TotalMilliseconds) } })
        SendText $ctx 200 (ConvertTo-Json -InputObject @{ ok = $true; paks = $list } -Compress -Depth 4); return
      }
      '/api/pak'   {
        # Read-only byte ranges of the game's own pack files, so the page can copy item icons out of them.
        $name = $req.QueryString['name']
        if ($name -notmatch '^NMSARC\.[A-Za-z0-9_]+\.pak$') { SendText $ctx 400 '{"error":"bad pack name"}'; return }
        $b = Get-BanksDir; if (-not $b) { SendText $ctx 404 '{"error":"game not found"}'; return }
        $p = Join-Path $b $name
        if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { SendText $ctx 404 '{"error":"pack not found"}'; return }
        [int64]$off = 0; [int]$len = 0
        if (-not [int64]::TryParse([string]$req.QueryString['off'], [ref]$off) -or -not [int]::TryParse([string]$req.QueryString['len'], [ref]$len) -or $off -lt 0 -or $len -le 0 -or $len -gt 33554432) { SendText $ctx 400 '{"error":"bad range"}'; return }
        Send $ctx 200 (Read-Range $p $off $len) 'application/octet-stream'; return
      }
      '/api/icons' {
        if (-not (Test-Path $IconDir)) { New-Item -ItemType Directory -Path $IconDir | Out-Null }
        $idx = Join-Path $IconDir 'index.json'
        if ($req.HttpMethod -eq 'POST') {
          $file = [string]$req.QueryString['file']
          if ($file -eq 'index.json') {
            $body = Read-Body $req 8MB
            if (-not $body.TrimStart().StartsWith('{')) { SendText $ctx 400 '{"error":"not json"}'; return }
            [System.IO.File]::WriteAllText($idx, $body, $Utf8); SendText $ctx 200 '{"ok":true}'; return
          }
          if ($file -notmatch '^[A-Za-z0-9._-]{1,140}\.webp$' -or $file.Contains('..')) { SendText $ctx 400 '{"error":"bad icon name"}'; return }
          [System.IO.File]::WriteAllBytes((Join-Path $IconDir $file), (Read-BodyBytes $req 2MB))
          SendText $ctx 200 '{"ok":true}'; return
        }
        if (Test-Path $idx) { Send $ctx 200 ([System.IO.File]::ReadAllBytes($idx)) 'application/json; charset=utf-8' } else { SendText $ctx 200 '{}' }
        return
      }
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
          $script:BanksCache = $null
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
  $base = $WebDir
  if ($rel.StartsWith('icons/')) { $base = $IconDir; $rel = $rel.Substring(6) }
  $full = [System.IO.Path]::GetFullPath((Join-Path $base $rel))
  $root = [System.IO.Path]::GetFullPath($base)
  if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) { SendText $ctx 404 'Not found' 'text/plain'; return }
  $ext = [System.IO.Path]::GetExtension($full).ToLower()
  $type = $Mime[$ext]; if (-not $type) { $type = 'application/octet-stream' }
  $bytes = [System.IO.File]::ReadAllBytes($full)
  if ($base -eq $IconDir) {
    $res = $ctx.Response; $res.StatusCode = 200; $res.ContentType = $type; $res.Headers['Cache-Control'] = 'max-age=86400'; $res.Headers['X-Content-Type-Options'] = 'nosniff'
    $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length); $res.OutputStream.Close(); return
  }
  Send $ctx 200 $bytes $type
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
