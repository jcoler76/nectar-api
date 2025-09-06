# SAFE Local-Only GitHub Issue Workflow
# ✅ Everything runs on YOUR machine - no production risks
# ✅ NO automated polling in production
# ✅ NO OpenAI API calls in production
# ✅ Full control over every action

param(
    [switch]$ListIssues,
    [int]$IssueNumber,
    [switch]$GenerateCriteria,
    [switch]$Implement,
    [switch]$Interactive
)

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   SAFE LOCAL ISSUE RESOLVER" -ForegroundColor Green
    Write-Host "   Everything runs on YOUR machine" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "What would you like to do?" -ForegroundColor White
    Write-Host ""
    Write-Host "[1] List open auto-resolve issues" -ForegroundColor Cyan
    Write-Host "[2] View specific issue details" -ForegroundColor Cyan
    Write-Host "[3] Generate AI criteria for issue (LOCAL)" -ForegroundColor Cyan
    Write-Host "[4] Implement issue with Claude Code" -ForegroundColor Cyan
    Write-Host "[5] Create feature branch for issue" -ForegroundColor Cyan
    Write-Host "[Q] Quit" -ForegroundColor Red
    Write-Host ""
}

function List-Issues {
    Write-Host "`nFetching open issues with 'auto-resolve' label..." -ForegroundColor Yellow
    $issues = gh issue list --label "auto-resolve" --state open --json number,title,author,createdAt
    
    if ($issues -eq "[]") {
        Write-Host "No open auto-resolve issues found!" -ForegroundColor Green
        return
    }
    
    $issueList = $issues | ConvertFrom-Json
    Write-Host "`nOpen Auto-Resolve Issues:" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    foreach ($issue in $issueList) {
        Write-Host "`n#$($issue.number): $($issue.title)" -ForegroundColor White
        Write-Host "  Author: $($issue.author.login)" -ForegroundColor Gray
        Write-Host "  Created: $($issue.createdAt)" -ForegroundColor Gray
    }
    
    return $issueList
}

function View-Issue {
    param([int]$Number)
    
    Write-Host "`nFetching issue #$Number..." -ForegroundColor Yellow
    gh issue view $Number
}

function Generate-LocalCriteria {
    param([int]$Number)
    
    Write-Host "`n⚠️  AI Criteria Generation" -ForegroundColor Yellow
    Write-Host "This will make an API call to OpenAI (costs apply)" -ForegroundColor Red
    $confirm = Read-Host "Continue? (y/n)"
    
    if ($confirm -ne 'y') {
        Write-Host "Cancelled" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Generating criteria locally..." -ForegroundColor Cyan
    
    # Get issue details
    $issue = gh issue view $Number --json title,body,labels | ConvertFrom-Json
    
    # Here you would call your local AI service
    # For now, we'll create a template
    $criteria = @"
## 📋 Acceptance Criteria for Issue #$Number

### Functional Requirements
- [ ] Implement the main functionality: $($issue.title)
- [ ] Add proper error handling
- [ ] Include user feedback/notifications

### Technical Requirements  
- [ ] Follow existing code patterns
- [ ] Add comprehensive tests
- [ ] Update documentation

### Testing Requirements
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

---
*Generated locally on $(Get-Date)*
"@
    
    Write-Host "`nGenerated Criteria:" -ForegroundColor Green
    Write-Host $criteria
    
    $save = Read-Host "`nAdd to GitHub issue as comment? (y/n)"
    if ($save -eq 'y') {
        gh issue comment $Number --body $criteria
        Write-Host "✅ Criteria added to issue!" -ForegroundColor Green
    }
}

function Implement-Issue {
    param([int]$Number)
    
    Write-Host "`n🚀 Starting Implementation" -ForegroundColor Green
    Write-Host "This will run Claude Code on your LOCAL machine" -ForegroundColor Yellow
    
    # Create feature branch
    $branchName = "feature/issue-$Number"
    Write-Host "`nCreating branch: $branchName" -ForegroundColor Cyan
    git checkout -b $branchName
    
    Write-Host "`nRunning Claude Code..." -ForegroundColor Cyan
    $prompt = "Resolve GitHub issue #$Number"
    
    # This would run Claude Code - showing the command for safety
    Write-Host "Would execute: claude `"$prompt`"" -ForegroundColor Yellow
    Write-Host "`n⚠️  Run this command manually for safety:" -ForegroundColor Red
    Write-Host "claude `"$prompt`"" -ForegroundColor White
}

# Main execution
if ($Interactive) {
    while ($true) {
        Show-Menu
        $choice = Read-Host "Select option"
        
        switch ($choice) {
            '1' { 
                List-Issues
                Read-Host "`nPress Enter to continue"
            }
            '2' {
                $num = Read-Host "Enter issue number"
                View-Issue -Number $num
                Read-Host "`nPress Enter to continue"
            }
            '3' {
                $num = Read-Host "Enter issue number"
                Generate-LocalCriteria -Number $num
                Read-Host "`nPress Enter to continue"
            }
            '4' {
                $num = Read-Host "Enter issue number"
                Implement-Issue -Number $num
                Read-Host "`nPress Enter to continue"
            }
            '5' {
                $num = Read-Host "Enter issue number"
                $branch = "feature/issue-$num"
                git checkout -b $branch
                Write-Host "✅ Created branch: $branch" -ForegroundColor Green
                Read-Host "`nPress Enter to continue"
            }
            'Q' { exit }
            'q' { exit }
        }
    }
} else {
    # Command-line mode
    if ($ListIssues) {
        List-Issues
    }
    elseif ($IssueNumber -gt 0) {
        if ($GenerateCriteria) {
            Generate-LocalCriteria -Number $IssueNumber
        }
        elseif ($Implement) {
            Implement-Issue -Number $IssueNumber
        }
        else {
            View-Issue -Number $IssueNumber
        }
    }
    else {
        Write-Host "Use -Interactive for menu mode" -ForegroundColor Yellow
        Write-Host "Or specify -ListIssues or -IssueNumber with options" -ForegroundColor Yellow
    }
}