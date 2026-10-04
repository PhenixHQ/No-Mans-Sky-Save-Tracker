#!/bin/bash
# Builds "NMS Save Tracker.exe" (the app window) with Mono's C# compiler.
# Needs: mono-mcs, libmono-system-windows-forms4.0-cil, and the WebView2 SDK
# libraries (Microsoft.Web.WebView2.Core.dll / .WinForms.dll + runtimes/*/native/WebView2Loader.dll)
# in app/lib. They come from Microsoft's WebView2 SDK (BSD license).
set -e
cd "$(dirname "$0")/../.."
mcs -nologo -target:winexe -platform:anycpu -optimize+ -codepage:utf8 \
  -win32icon:web/icon.ico \
  -r:System.dll -r:System.Drawing.dll -r:System.Windows.Forms.dll -r:System.Web.Extensions.dll \
  -r:app/lib/Microsoft.Web.WebView2.Core.dll -r:app/lib/Microsoft.Web.WebView2.WinForms.dll \
  -out:"NMS Save Tracker.exe" source/window/Window.cs
ls -la "NMS Save Tracker.exe"
