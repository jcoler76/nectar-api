$apiUrl = "http://localhost:3001/api/developer/execute"
$apiKey = "jbcK8N4hrPwb8QH5TopOQPelGoSchme-"

$headers = @{
    "x-nectarstudio-developer-key" = $apiKey
    "Content-Type" = "application/json"
}

$body = @{
    endpointName = "api_CBActiveAuthentication"
    databaseName = "tech"
    parameters = @{
        email = "ian.public@yahoo.com"
        ProductID = 220
        productname = "Subscription - CM Magazine"
        planID = 42
    }
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body
    Write-Host "Success! Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Yellow
    }
}