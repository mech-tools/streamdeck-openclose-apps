param(
  # Path to executable
  [Parameter(Mandatory = $true)]
  [string]$path,

  # If process should run with elevated privileges
  [switch]$RunAsAdmin,

  # Handle how process windows behave on start
  [string]$WindowStyle = "Normal",

  # Arguments passed to the executable
  [string]$Arguments,

  # Handle closing the window right after the app launched
  [switch]$closeWindow
)

# Computing params
$params = @{
  FilePath    = $path
  PassThru    = $true
  WindowStyle = $WindowStyle
}

if ($Arguments -ne $Null -and $Arguments -ne "") {
  $params.ArgumentList = "$Arguments"
}

if ($RunAsAdmin -ne $False) {
  $params.Verb = "RunAs"
}

# Start and store the reference to the process
$process = Start-Process @params

# Wait x seconds for the process to have a window opened then close it
if ($closeWindow) {
  $timeout = 10
  $elapsedTime = 0

  while ($elapsedTime -lt $timeout) {
    $process.Refresh()

    if ($process.MainWindowHandle -ne 0) {
      $process.CloseMainWindow()
      break
    }

    Start-Sleep -Seconds 1
    $elapsedTime++
  }
}