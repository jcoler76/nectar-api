param(
  [string]$Match = 'server\\server.js'
)

Write-Host "== Killing node processes matching '$Match'"
try {
  $procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
} catch {
  $procs = @()
}

if (-not $procs) { Write-Host "  - None found"; return }

$targets = @()
foreach ($p in $procs) {
  $cmd = ($p.CommandLine | Out-String).Trim()
  if ($cmd -match $Match) { $targets += $p }
}

if ($targets.Count -eq 0) { Write-Host "  - None matched"; return }

foreach ($t in $targets) {
  Write-Host ("  - taskkill /T PID {0} : {1}" -f $t.ProcessId, $t.CommandLine)
  cmd /c "taskkill /PID $($t.ProcessId) /F /T >nul 2>&1"
}

Write-Host "Done killing server node processes."

