param(
	# Name of the program to kill
	[Parameter(Mandatory = $true)]
	[string]$program
)

# Kill all processes by name
Stop-Process -Name "$program" -Force