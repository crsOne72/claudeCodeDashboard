Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$proc = Get-Process | Where-Object { $_.MainWindowTitle -like '*Claude*Dashboard*' -or $_.ProcessName -eq 'claude-code-dashboard' }
if ($proc) {
    foreach ($p in $proc) {
        if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
            [Win32]::ShowWindow($p.MainWindowHandle, 9)
            [Win32]::SetForegroundWindow($p.MainWindowHandle)
            Write-Host "Brought window to front: $($p.MainWindowTitle)"
        }
    }
} else {
    Write-Host "Dashboard process not found"
}

Start-Sleep -Seconds 2

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save("C:\Users\cever\Projekte\claudeCodeDashboard\screenshot.png")
$graphics.Dispose()
$bitmap.Dispose()
Write-Host "Screenshot saved"
