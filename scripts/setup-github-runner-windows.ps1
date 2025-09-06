# GitHub Actions Self-Hosted Runner Setup for Windows
# Run this script in PowerShell as Administrator

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubToken,
    
    [string]$RunnerName = "windows-vpn-runner",
    [string]$RunnerVersion = "2.319.1"
)

Write-Host "🏃 Setting up GitHub Actions Self-Hosted Runner for Windows" -ForegroundColor Green

# Create runner directory
$RunnerDir = "C:\actions-runner"
if (!(Test-Path $RunnerDir)) {
    New-Item -ItemType Directory -Path $RunnerDir
    Write-Host "✅ Created runner directory: $RunnerDir" -ForegroundColor Green
}

# Change to runner directory
Set-Location $RunnerDir

# Download GitHub Actions Runner
$RunnerZip = "actions-runner-win-x64-$RunnerVersion.zip"
$DownloadUrl = "https://github.com/actions/runner/releases/download/v$RunnerVersion/$RunnerZip"

if (!(Test-Path $RunnerZip)) {
    Write-Host "📥 Downloading GitHub Actions Runner..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $RunnerZip
    Write-Host "✅ Downloaded: $RunnerZip" -ForegroundColor Green
}

# Extract runner
if (!(Test-Path "config.cmd")) {
    Write-Host "📦 Extracting runner..." -ForegroundColor Yellow
    Expand-Archive -Path $RunnerZip -DestinationPath . -Force
    Write-Host "✅ Extracted runner files" -ForegroundColor Green
}

# Configure runner
Write-Host "⚙️ Configuring runner..." -ForegroundColor Yellow
Write-Host "Runner will be configured with labels: windows,vpn,staging,production" -ForegroundColor Cyan

$ConfigArgs = @(
    "--url", "https://github.com/jcolermirabel/mirabel-api",
    "--token", $GitHubToken,
    "--name", $RunnerName,
    "--labels", "windows,vpn,staging,production",
    "--work", "_work",
    "--replace"
)

& .\config.cmd @ConfigArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Runner configured successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Runner configuration failed!" -ForegroundColor Red
    exit 1
}

# Install as Windows Service
Write-Host "🔧 Installing runner as Windows Service..." -ForegroundColor Yellow
& .\svc.cmd install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service installed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Service installation failed!" -ForegroundColor Red
    exit 1
}

# Start the service
Write-Host "🚀 Starting GitHub Actions Runner service..." -ForegroundColor Yellow
& .\svc.cmd start

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service started successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Service start failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 GitHub Actions Runner Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify the runner appears in: https://github.com/jcolermirabel/mirabel-api/settings/actions/runners" -ForegroundColor White
Write-Host "2. Connect to your VPN when deployments need to run" -ForegroundColor White
Write-Host "3. Push to staging branch to test automated deployment" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Service Management:" -ForegroundColor Cyan
Write-Host "  Start:  `& '$RunnerDir\svc.cmd' start" -ForegroundColor White
Write-Host "  Stop:   `& '$RunnerDir\svc.cmd' stop" -ForegroundColor White
Write-Host "  Status: Get-Service 'actions.runner.jcolermirabel-mirabel-api.$RunnerName'" -ForegroundColor White
Write-Host ""
Write-Host "📁 Runner Location: $RunnerDir" -ForegroundColor Cyan
