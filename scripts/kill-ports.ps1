param(
  [int[]]$Ports = @(3000,3001,3002,3003),
  [int]$WaitSeconds = 8
)

Write-Host "== Port cleanup: checking" ($Ports -join ', ')

function Get-PidsForPort {
  param([int]$Port)
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  } catch {
    $conns = @()
  }
  if (-not $conns) { return @() }
  return ($conns | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique)
}

function Kill-Pid {
  param([int]$TargetPid)
  try {
    if ($TargetPid -eq $PID) { return }
    $proc = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
    if ($null -ne $proc) {
      Write-Host ("  - Killing PID {0} ({1})" -f $TargetPid, $proc.ProcessName)
      Stop-Process -Id $TargetPid -Force -ErrorAction SilentlyContinue
    } else {
      # Some system processes (e.g., PID 4) are not exposed via Get-Process
      Write-Host ("  - Attempt taskkill /T for PID {0}" -f $TargetPid)
      cmd /c "taskkill /PID $TargetPid /F /T >nul 2>&1"
    }
  } catch {
    Write-Host ("  - Failed to kill PID {0}: {1}" -f $TargetPid, $_.Exception.Message)
  }
}

function IsPortReserved {
  param([int]$Port)
  try {
    $ranges = (netsh interface ipv4 show excludedportrange protocol=tcp) 2>$null
    if (-not $ranges) { return $false }
    foreach ($line in $ranges) {
      if ($line -match '^\s*(\d+)\s*-\s*(\d+)\s*$') {
        $start = [int]$Matches[1]
        $end   = [int]$Matches[2]
        if ($Port -ge $start -and $Port -le $end) { return $true }
      }
    }
  } catch { }
  return $false
}

foreach ($port in $Ports) {
  Write-Host "Checking port $port..."
  $pids = Get-PidsForPort -Port $port
  if ($pids.Count -eq 0) {
    Write-Host "  - Free"
    continue
  }

  Write-Host "  - In use by PIDs: $($pids -join ', ')"
  foreach ($procId in $pids) { Kill-Pid -TargetPid $procId }

  $deadline = (Get-Date).AddSeconds($WaitSeconds)
  while ((Get-PidsForPort -Port $port).Count -gt 0 -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }

  $remaining = Get-PidsForPort -Port $port
  if ($remaining.Count -gt 0) {
    Write-Host "  - Still in use after kill attempts by PIDs: $($remaining -join ', ')"
    if (IsPortReserved -Port $port) {
      Write-Host "  - Warning: Port $port appears reserved by the OS (excluded range). Consider changing the port or clearing exclusions."
    }
  } else {
    Write-Host "  - Freed"
  }
}

Write-Host "Port cleanup finished."
