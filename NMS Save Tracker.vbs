' NMS Save Tracker launcher (unofficial fan-made app for No Man's Sky)
' Double-click this to open the app. It starts a small helper in the
' background (no console window) and opens the app in its own window.
' If "NMS Save Tracker.exe" is here, that is started instead (same app).
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = appDir
exe = appDir & "\NMS Save Tracker.exe"
If fso.FileExists(exe) Then
  ' The app's own window starts the helper itself
  sh.Run """" & exe & """", 1, False
  WScript.Quit
End If
sh.Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & appDir & "\app\server.ps1""", 0, False
