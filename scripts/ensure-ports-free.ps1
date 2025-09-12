param(
  [Parameter()][object]$Ports = @(3000,3001,3002,3003),
  [int]$TimeoutSeconds = 20,
  [int]$RetryDelayMs = 300
)

Write-Host "== Ensuring ports are free: " ($Ports -join ', ')

function Convert-ToIntArray {
  param([object]$Value)
  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Array]) { return @($Value | ForEach-Object { [int]$_ }) }
  $str = "$Value".Trim()
  if ([string]::IsNullOrWhiteSpace($str)) { return @() }
  $parts = $str -split '[,\s]+' | Where-Object { $_ -ne '' }
  return @($parts | ForEach-Object { [int]$_ })
}

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
    $ranges4 = (netsh interface ipv4 show excludedportrange protocol=tcp) 2>$null
    $ranges6 = (netsh interface ipv6 show excludedportrange protocol=tcp) 2>$null
    foreach ($ranges in @($ranges4, $ranges6)) {
      if (-not $ranges) { continue }
      foreach ($line in $ranges) {
        if ($line -match '^\s*(\d+)\s*-\s*(\d+)\s*$') {
          $start = [int]$Matches[1]
          $end   = [int]$Matches[2]
          if ($Port -ge $start -and $Port -le $end) { return $true }
        }
      }
    }
  } catch { }
  return $false
}

$portList = Convert-ToIntArray -Value $Ports
if (-not $portList -or $portList.Count -eq 0) {
  Write-Error "No valid ports provided."
  exit 1
}

$stubborn = @()

foreach ($port in $portList) {
  Write-Host "Checking port $port..."
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $pids = Get-PidsForPort -Port $port
    if ($pids.Count -eq 0) {
      Write-Host "  - Free"
      break
    }

    Write-Host "  - In use by PIDs: $($pids -join ', ')"
    foreach ($procId in $pids) { Kill-Pid -TargetPid $procId }

    Start-Sleep -Milliseconds $RetryDelayMs

    # If still in use, try a tree kill as well
    $still = Get-PidsForPort -Port $port
    if ($still.Count -gt 0) {
      foreach ($procId in $still) { cmd /c "taskkill /PID $procId /F /T >nul 2>&1" }
    }

    if ((Get-PidsForPort -Port $port).Count -eq 0) {
      Write-Host "  - Freed"
      break
    }
  }

  if ((Get-PidsForPort -Port $port).Count -gt 0) {
    Write-Host "  - Still in use after $(($TimeoutSeconds))s"
    if (IsPortReserved -Port $port) {
      Write-Host "  - Warning: Port $port appears reserved by the OS (excluded range)."
    }
    $stubborn += $port
  }
}

if ($stubborn.Count -gt 0) {
  Write-Error ("Failed to free ports: {0}" -f ($stubborn -join ', '))
  exit 1
}

Write-Host "All requested ports are free."
exit 0
