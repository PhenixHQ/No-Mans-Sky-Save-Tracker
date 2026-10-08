# Used by the small web installer (NMS-Save-Tracker-Setup.exe): asks GitHub for the newest
# release of the app and downloads its full installer. Nothing else is sent or saved.
param([string]$Repo, [string]$Out, [string]$TagFile)
$ErrorActionPreference = 'Stop'
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $h = @{ 'User-Agent' = 'NMS-Save-Tracker-Installer'; 'Accept' = 'application/vnd.github+json' }
  Write-Output 'Asking GitHub for the newest version...'
  $rels = Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$Repo/releases?per_page=10" -Headers $h -TimeoutSec 20
  $rel = @($rels) | Where-Object { -not $_.draft } | Select-Object -First 1
  if (-not $rel) { throw 'No releases have been published yet.' }
  $a = @($rel.assets) | Where-Object { $_.name -match '^NMS-Save-Tracker-\d[\w.\-]*-Setup\.exe$' } | Select-Object -First 1
  if (-not $a) { throw "Version $($rel.tag_name) has no installer file attached." }
  if ($a.browser_download_url -notmatch ('^https://github\.com/' + [regex]::Escape($Repo) + '/releases/download/')) { throw 'Unexpected download address.' }
  Write-Output ('Newest version: ' + $rel.tag_name + ' (' + [math]::Round($a.size / 1MB, 1) + ' MB)')
  Write-Output 'Downloading...'
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -UseBasicParsing -Uri $a.browser_download_url -OutFile $Out -Headers @{ 'User-Agent' = 'NMS-Save-Tracker-Installer' } -TimeoutSec 300
  if ((Get-Item -LiteralPath $Out).Length -ne [int64]$a.size) { throw 'The download was incomplete.' }
  if ([string]$a.digest -match '^sha256:([0-9a-f]{64})$') {
    $want = $Matches[1]; $got = (Get-FileHash -Algorithm SHA256 -LiteralPath $Out).Hash.ToLower()
    if ($got -ne $want) { throw 'The download did not match the checksum GitHub lists for it.' }
    Write-Output 'Checksum OK.'
  }
  Set-Content -LiteralPath $TagFile -Value $rel.tag_name -Encoding ASCII
  Write-Output 'Download complete.'
  exit 0
} catch {
  Write-Output ('Error: ' + $_.Exception.Message)
  exit 1
}
