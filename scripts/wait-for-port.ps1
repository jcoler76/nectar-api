param(
  [Parameter(Mandatory=$true)][int]$Port,
  [ValidateSet('free','listening')][string]$State = 'listening',
  [int]$TimeoutSeconds = 30
)

function Test-PortListening {
  param([int]$Port)
  # Primary: check kernel state
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conns -and $conns.Count -gt 0) { return $true }
  } catch {}
  # Fallback: attempt TCP connect
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $completed = $iar.AsyncWaitHandle.WaitOne(150)
    if ($completed -and $client.Connected) { $client.Close(); return $true }
    $client.Close()
  } catch {}
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('localhost', $Port, $null, $null)
    $completed = $iar.AsyncWaitHandle.WaitOne(150)
    if ($completed -and $client.Connected) { $client.Close(); return $true }
    $client.Close()
  } catch {}
  return $false
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
  $isListening = Test-PortListening -Port $Port
  if ($State -eq 'listening' -and $isListening) { Write-Host "Port $Port is listening."; exit 0 }
  if ($State -eq 'free' -and -not $isListening) { Write-Host "Port $Port is free."; exit 0 }
  Start-Sleep -Milliseconds 300
}

Write-Host "Timeout waiting for port $Port to become $State."
exit 1
