param(
  [Parameter(Mandatory = $true)]
  [string] $ApiKey,
  [Parameter(Mandatory = $true)]
  [int] $IssueSetID
)

$ErrorActionPreference = 'Stop'

Write-Host "Comparing REST vs GraphQL for issuesetID=$IssueSetID" -ForegroundColor Cyan

$headers = @{
  'x-dreamfactory-api-key' = $ApiKey
  'x-nectar-api-key' = $ApiKey
  'Accept' = 'application/json'
}

# REST call
$restUrl = "https://api.mirabeltechnologies.com/api/v2/modernluxury/_proc/api_GetIssues?issuesetID=$IssueSetID"
$restResp = Invoke-WebRequest -Uri $restUrl -Headers $headers -Method Get
$restJson = $restResp.Content | ConvertFrom-Json

if (-not $restJson) { throw "REST returned no data" }

# GraphQL call (typed 'issues' query)
$gqlBody = @{
  query = "query GetIssues($issuesetID: Int!) { issues(serviceName: \"modernluxury\", issuesetID: $issuesetID) { ID Name } }"
  variables = @{ issuesetID = $IssueSetID }
} | ConvertTo-Json -Depth 5

$gqlResp = Invoke-WebRequest -Uri 'https://api.mirabeltechnologies.com/graphql' -Headers $headers -Method Post -Body $gqlBody -ContentType 'application/json'
$gqlJson = $gqlResp.Content | ConvertFrom-Json

if ($gqlJson.errors) {
  throw ("GraphQL error: " + ($gqlJson.errors | ConvertTo-Json -Depth 5))
}

$gqlIssues = $gqlJson.data.issues
if (-not $gqlIssues) { throw "GraphQL returned no issues" }

# Project both to comparable sets: ID|Name
$restPairs = $restJson | ForEach-Object { "{0}|{1}" -f $_.ID, $_.Name }
$gqlPairs = $gqlIssues | ForEach-Object { "{0}|{1}" -f $_.ID, $_.Name }

$restSorted = $restPairs | Sort-Object -Unique
$gqlSorted = $gqlPairs | Sort-Object -Unique

# Compare sets
$missingInGql = Compare-Object -ReferenceObject $restSorted -DifferenceObject $gqlSorted -IncludeEqual:$false | Where-Object { $_.SideIndicator -eq '<=' } | Select-Object -ExpandProperty InputObject
$extraInGql   = Compare-Object -ReferenceObject $restSorted -DifferenceObject $gqlSorted -IncludeEqual:$false | Where-Object { $_.SideIndicator -eq '=>' } | Select-Object -ExpandProperty InputObject

# Ensure GraphQL only returned requested fields (ID, Name)
$hasOnlyRequested = $true
foreach ($row in $gqlIssues) {
  $keys = @($row.PSObject.Properties.Name)
  $unexpected = $keys | Where-Object { $_ -notin @('ID','Name') }
  if ($unexpected.Count -gt 0) { $hasOnlyRequested = $false; break }
}

Write-Host "REST count: $($restJson.Count) | GraphQL count: $($gqlIssues.Count)" -ForegroundColor Yellow

if ($missingInGql.Count -gt 0) {
  Write-Host "Missing in GraphQL:" -ForegroundColor Red
  $missingInGql | ForEach-Object { Write-Host "  $_" }
}
if ($extraInGql.Count -gt 0) {
  Write-Host "Extra in GraphQL:" -ForegroundColor Red
  $extraInGql | ForEach-Object { Write-Host "  $_" }
}

if (($missingInGql.Count -eq 0) -and ($extraInGql.Count -eq 0) -and $hasOnlyRequested) {
  Write-Host "SUCCESS: GraphQL returns the same ID/Name pairs as REST, and only the requested columns." -ForegroundColor Green
  exit 0
}

if (-not $hasOnlyRequested) {
  Write-Host "FAIL: GraphQL returned columns other than ID and Name." -ForegroundColor Red
}

Write-Host "Mismatch detected between REST and GraphQL results." -ForegroundColor Red
exit 1


