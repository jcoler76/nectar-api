# Start the Enhanced GitHub Issue Auto-Resolver with AI Acceptance Criteria
param(
    [int]$PollInterval = 300,  # Default 5 minutes
    [string]$ApiUrl = "http://localhost:3001"
)

Write-Host "🚀 Starting Enhanced GitHub Issue Auto-Resolver..." -ForegroundColor Green
Write-Host "✨ Features:" -ForegroundColor Yellow
Write-Host "   - Automatic acceptance criteria generation using AI" -ForegroundColor Cyan
Write-Host "   - Support for multiple issue types (bug, feature, technical, enhancement)" -ForegroundColor Cyan  
Write-Host "   - Intelligent label management" -ForegroundColor Cyan
Write-Host "   - Integration with Claude Code workflow" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   - Poll interval: $PollInterval seconds" -ForegroundColor White
Write-Host "   - API URL: $ApiUrl" -ForegroundColor White
Write-Host "   - Target labels: needs-acceptance-criteria, auto-resolve" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Workflow:" -ForegroundColor Yellow
Write-Host "   1. Create issue with 'needs-acceptance-criteria' label" -ForegroundColor White
Write-Host "   2. AI generates comprehensive acceptance criteria" -ForegroundColor White
Write-Host "   3. Label automatically changes to 'auto-resolve'" -ForegroundColor White
Write-Host "   4. Claude Code processes the issue for implementation" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Red
Write-Host "========================================================================================" -ForegroundColor Green

# Run the enhanced poller
& ".\scripts\enhanced-issue-poller.ps1" -PollInterval $PollInterval -ApiUrl $ApiUrl