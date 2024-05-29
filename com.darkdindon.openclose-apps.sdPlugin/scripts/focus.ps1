param(
    # Name of the program to focus
    [Parameter(Mandatory = $true)]
    [string]$program
)

# Load necessary tools
Add-Type @"
    using System;
    using System.Runtime.InteropServices;

    public class Win32Functions {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr processId);

        [DllImport("kernel32.dll")]
        public static extern uint GetCurrentThreadId();

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool BringWindowToTop(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool ShowWindow(IntPtr hWnd, uint nCmdShow);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsIconic(IntPtr hWnd);
    }
"@

# Function that will momentarily attach a thread to the current shell and focus the window
Function ForceForegroundWindow {
    Param (
        [System.IntPtr]$hWnd
    )

    $foreThread = [Win32Functions]::GetWindowThreadProcessId(([Win32Functions]::GetForegroundWindow()), [System.IntPtr]::Zero)
    $appThread = [Win32Functions]::GetCurrentThreadId()
    $SW_SHOW = 9

    if ($foreThread -ne $appThread) {
        [Win32Functions]::AttachThreadInput($foreThread, $appThread, $true)
        if ([Win32Functions]::IsIconic($hWnd)) {
            [Win32Functions]::ShowWindow($hWnd, $SW_SHOW)
        }
        [Win32Functions]::BringWindowToTop($hWnd)
        [Win32Functions]::AttachThreadInput($foreThread, $appThread, $false)
    }
    else {
        [Win32Functions]::ShowWindow($hWnd, $SW_SHOW)
        [Win32Functions]::BringWindowToTop($hWnd)
    }
}

# Get the first eligible process and focus
$processes = Get-Process -Name "$program"
$process = $processes | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if ($process) {
    $windowHandle = $process.MainWindowHandle
    ForceForegroundWindow $windowHandle
}