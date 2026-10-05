; NMS Save Tracker - Windows installer (NSIS 3). Build: makensis source/installer/setup.nsi (run from the repo root)
Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"
!define APP "NMS Save Tracker"
!define VER "2.4.3"
!define VERFULL "2.4.3.0"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\NMSSaveTracker"
!define ROOT "..\.."

Name "${APP} ${VER} beta"
OutFile "${ROOT}\release\NMS-Save-Tracker-${VER}-beta-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
InstallDirRegKey HKCU "${UNKEY}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${APP} ${VER} - unofficial fan-made app"

VIProductVersion "${VERFULL}"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} installer"
VIAddVersionKey "FileVersion" "${VER}"
VIAddVersionKey "ProductVersion" "${VER}"
VIAddVersionKey "LegalCopyright" "Unofficial fan-made app for No Man's Sky"

!define MUI_ICON "${ROOT}\web\icon.ico"
!define MUI_UNICON "${ROOT}\web\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "${APP} ${VER} (beta)"
!define MUI_WELCOMEPAGE_TEXT "An unofficial, fan-made companion app for No Man's Sky.$\r$\n$\r$\nIt reads your save to show your inventories, crafting, goals, galaxy map and an in-game overlay (F8).$\r$\n$\r$\nIt installs for your Windows user only and doesn't need admin rights. If the app is open, it will be closed first."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open ${APP} now"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Show the README"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  ; close a running copy (it would lock the exe)
  nsExec::Exec 'taskkill /IM "${APP}.exe" /F'
  Sleep 800
  SetOutPath "$INSTDIR"
  File "/oname=${APP}.exe" "${ROOT}\NMS Save Tracker.exe"
  File "/oname=${APP}.vbs" "${ROOT}\NMS Save Tracker.vbs"
  File "README.txt"
  SetOutPath "$INSTDIR\app"
  File "${ROOT}\app\server.ps1"
  SetOutPath "$INSTDIR\app\lib"
  File /r "${ROOT}\app\lib\*.*"
  SetOutPath "$INSTDIR\web"
  File "${ROOT}\web\index.html"
  File "${ROOT}\web\mapping.json"
  File "${ROOT}\web\config.json"
  File "${ROOT}\web\icon.ico"
  CreateDirectory "$INSTDIR\data"

  ; shortcuts
  SetOutPath "$INSTDIR"
  CreateShortCut "$SMPROGRAMS\${APP}.lnk" "$INSTDIR\${APP}.exe" "" "$INSTDIR\web\icon.ico"
  CreateShortCut "$DESKTOP\${APP}.lnk" "$INSTDIR\${APP}.exe" "" "$INSTDIR\web\icon.ico"

  ; uninstaller + Apps & features entry
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VER}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "Unofficial fan-made app"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\web\icon.ico"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" $0
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM "${APP}.exe" /F'
  Sleep 800
  Delete "$SMPROGRAMS\${APP}.lnk"
  Delete "$DESKTOP\${APP}.lnk"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\web"
  Delete "$INSTDIR\${APP}.exe"
  Delete "$INSTDIR\${APP}.vbs"
  Delete "$INSTDIR\README.txt"
  Delete "$INSTDIR\Uninstall.exe"
  MessageBox MB_YESNO|MB_ICONQUESTION "Also delete your app data (goals, notes, settings, icon cache and save backups)?$\r$\n$\r$\nYour No Man's Sky saves are not touched either way." /SD IDNO IDNO keep
    RMDir /r "$INSTDIR\data"
  keep:
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
SectionEnd
