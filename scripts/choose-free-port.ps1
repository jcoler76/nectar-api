param(
  [Parameter(Mandatory=$true)][int]$Preferred,
  [Parameter()][object]$Fallbacks = @(),
  [int]$MaxTries = 20
)

function Convert-ToIntArray {
  param([object]$Value)
  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Array]) { return @($Value | ForEach-Object { [int]$_ }) }
  $str = "$Value".Trim()
  if ([string]::IsNullOrWhiteSpace($str)) { return @() }
  $parts = $str -split '[,\s]+' | Where-Object { $_ -ne '' }
  return @($parts | ForEach-Object { [int]$_ })
}

function Test-PortFree {
  param([int]$Port)
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  } catch { $conns = @() }
  if ($conns -and $conns.Count -gt 0) { return $false }
  # TCP connect probe should fail quickly if no listener
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $completed = $iar.AsyncWaitHandle.WaitOne(120)
    $isOpen = $completed -and $client.Connected
    $client.Close()
    if ($isOpen) { return $false }
  } catch {}
  return $true
}

function Test-PortExcludedByOS {
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
  } catch {}
  return $false
}

$fb = Convert-ToIntArray -Value $Fallbacks
$candidates = @($Preferred) + $fb | Select-Object -Unique
foreach ($p in $candidates) {
  if (Test-PortExcludedByOS -Port $p) { continue }
  for ($i=0; $i -lt [Math]::Max(1,$MaxTries); $i++) {
    if (Test-PortFree -Port $p) { Write-Output $p; exit 0 }
    Start-Sleep -Milliseconds 200
  }
}

Write-Error "No free port found among: $($candidates -join ', ') (consider OS excluded ranges)"
exit 1

