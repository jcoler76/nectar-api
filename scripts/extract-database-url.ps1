param(
  [Parameter(Mandatory=$true)][string]$EnvPath,
  [Parameter(Mandatory=$true)][string]$OutFile
)

if (-not (Test-Path -LiteralPath $EnvPath)) {
  Write-Error "Env file not found: $EnvPath"
  exit 3
}

try {
  $line = Get-Content -LiteralPath $EnvPath -ErrorAction Stop | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -Last 1
} catch {
  Write-Error $_.Exception.Message
  exit 1
}

if (-not $line) {
  Write-Error "DATABASE_URL not found in $EnvPath"
  exit 2
}

# Strip leading key and optional quotes
$val = $line -replace '^\s*DATABASE_URL\s*=\s*',''
$val = $val.Trim()
# If value is wrapped in single or double quotes, strip them
if ($val.StartsWith('"') -and $val.EndsWith('"')) {
    $val = $val.Substring(1, $val.Length - 2)
} elseif ($val.StartsWith("'") -and $val.EndsWith("'")) {
    $val = $val.Substring(1, $val.Length - 2)
}

# Write normalized value
Set-Content -LiteralPath $OutFile -Value $val -Encoding UTF8
exit 0

