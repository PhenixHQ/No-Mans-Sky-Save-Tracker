' NMS Save Tracker launcher (unofficial fan-made app for No Man's Sky)
' Double-click this to open the app. It starts a small helper in the
' background (no console window) that opens the app in its own window.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = appDir
sh.Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & appDir & "\app\server.ps1""", 0, False
