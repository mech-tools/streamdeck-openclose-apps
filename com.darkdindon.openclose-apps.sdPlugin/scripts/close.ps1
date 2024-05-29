param(
	# Name of the program to close
	[Parameter(Mandatory = $true)]
	[string]$program
)

# Close the first eligible process and close
$processes = Get-Process -Name "$program"
$process = $processes | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
$process.CloseMainWindow()