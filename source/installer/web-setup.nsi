; NMS Save Tracker - small web installer (NSIS 3). It has no version of the app inside: when run, it asks
; GitHub for the newest release, downloads that release's full installer and runs it quietly.
; Build: makensis source/installer/web-setup.nsi (run from the repo root). Needs the repo's releases to be public.
Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!define APP "NMS Save Tracker"
!define REPO "PhenixHQ/No-Mans-Sky-Save-Tracker"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\NMSSaveTracker"
!define ROOT "..\.."
!define STUBVER "1.0.0.0"

Name "${APP}"
Caption "${APP} Setup"
OutFile "${ROOT}\release\NMS-Save-Tracker-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
InstallDirRegKey HKCU "${UNKEY}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${APP} - unofficial fan-made app"

VIProductVersion "${STUBVER}"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} web installer (gets the newest version)"
VIAddVersionKey "FileVersion" "${STUBVER}"
VIAddVersionKey "ProductVersion" "latest"
VIAddVersionKey "LegalCopyright" "Unofficial fan-made app for No Man's Sky"

!define MUI_ICON "${ROOT}\web\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "${APP}"
!define MUI_WELCOMEPAGE_TEXT "An unofficial, fan-made companion app for No Man's Sky.$\r$\n$\r$\nThis installer always gets the newest version: it downloads it from the app's GitHub page and installs it, so it needs an internet connection. The app itself works offline.$\r$\n$\r$\nIt installs for your Windows user only and doesn't need admin rights. If the app is open, it will be closed first."
!define MUI_FINISHPAGE_TITLE "${APP} is installed"
!define MUI_FINISHPAGE_TEXT "Version $Tag is installed."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open ${APP} now"

Var Tag

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetDetailsView show
  InitPluginsDir
  File "/oname=$PLUGINSDIR\get-latest.ps1" "get-latest.ps1"
  StrCpy $Tag "?"
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\get-latest.ps1" -Repo "${REPO}" -Out "$PLUGINSDIR\full-setup.exe" -TagFile "$PLUGINSDIR\tag.txt"'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "The newest version couldn't be downloaded (see the details for why).$\r$\n$\r$\nCheck your internet connection and try again, or download the full installer from:$\r$\nhttps://github.com/${REPO}/releases"
    Abort "Download failed."
  ${EndIf}
  FileOpen $1 "$PLUGINSDIR\tag.txt" r
  FileRead $1 $Tag
  FileClose $1
  ; trim the line break
  trim:
    StrCpy $2 $Tag 1 -1
    StrCmp $2 "$\n" +3
    StrCmp $2 "$\r" +2
    Goto trimmed
    StrCpy $Tag $Tag -1
    Goto trim
  trimmed:
  DetailPrint "Installing $Tag..."
  ExecWait '"$PLUGINSDIR\full-setup.exe" /S /D=$INSTDIR' $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "The installer for $Tag stopped with an error ($0).$\r$\n$\r$\nYou can download the full installer from:$\r$\nhttps://github.com/${REPO}/releases"
    Abort "Install failed."
  ${EndIf}
  ${IfNot} ${FileExists} "$INSTDIR\${APP}.exe"
    MessageBox MB_ICONSTOP|MB_OK "The app wasn't found after installing. Try the full installer from:$\r$\nhttps://github.com/${REPO}/releases"
    Abort "Install failed."
  ${EndIf}
  DetailPrint "Done: $Tag is installed in $INSTDIR"
SectionEnd
