param(
  [Parameter(Mandatory=$true)][string]$TargetPath,
  [Parameter(Mandatory=$true)][string[]]$Set,
  [switch]$NoBackup
)

# Ensure directory exists
$targetDir = Split-Path -Parent $TargetPath
if (-not [string]::IsNullOrWhiteSpace($targetDir) -and -not (Test-Path $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# Parse incoming updates into a dictionary
$updates = @{}
foreach ($pair in $Set) {
  if ($pair -match '^(?<k>[^=]+)=(?<v>.*)$') {
    $key = $matches.k.Trim()
    $val = $matches.v
    if (-not [string]::IsNullOrWhiteSpace($key)) { $updates[$key] = $val }
  }
}

# Read existing lines (if any)
$existingLines = @()
if (Test-Path $TargetPath) {
  $existingLines = Get-Content -LiteralPath $TargetPath -ErrorAction SilentlyContinue
}

# Backup
if ((-not $NoBackup) -and (Test-Path $TargetPath)) {
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backupPath = "$TargetPath.$timestamp.bak"
  Copy-Item -LiteralPath $TargetPath -Destination $backupPath -Force
}

# Merge: replace existing KEY= lines when key is in updates; preserve non-matching lines
$applied = New-Object System.Collections.Generic.HashSet[string]
$newLines = New-Object System.Collections.Generic.List[string]
$kvPattern = '^(?<k>[^=#\s]+)=(?<v>.*)$'

foreach ($line in $existingLines) {
  if ($line -match $kvPattern) {
    $k = $matches.k.Trim()
    if ($updates.ContainsKey($k)) {
      $newLines.Add("$k=" + $updates[$k])
      [void]$applied.Add($k)
    } else {
      $newLines.Add($line)
    }
  } else {
    $newLines.Add($line)
  }
}

# Append any not-yet-applied updates
foreach ($k in $updates.Keys) {
  if (-not $applied.Contains($k)) {
    $newLines.Add("$k=" + $updates[$k])
  }
}

# Write out with CRLF
Set-Content -LiteralPath $TargetPath -Value $newLines -Encoding UTF8

