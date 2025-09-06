param(
    [string]$Action = "list",
    [int]$IssueNumber = 0
)

Write-Host "=================================="
Write-Host "  GitHub Issue Checker - LOCAL  "  
Write-Host "=================================="
Write-Host ""

if ($Action -eq "list") {
    Write-Host "Checking for auto-resolve issues..."
    
    $issues = gh issue list --label "auto-resolve" --state open --json number,title,author | ConvertFrom-Json
    
    if ($issues.Count -eq 0) {
        Write-Host "No open auto-resolve issues!"
        Write-Host ""
        Write-Host "Create one with:"
        Write-Host "  gh issue create --title `"Your feature`" --label `"auto-resolve`""
    } else {
        Write-Host "Found $($issues.Count) issue(s):"
        Write-Host ""
        
        foreach ($issue in $issues) {
            Write-Host "Issue #$($issue.number): $($issue.title)"
            Write-Host "   Author: $($issue.author.login)"
            Write-Host ""
        }
        
        Write-Host "Commands:"
        Write-Host "  .\checkgit view 5      - View details"
        Write-Host "  .\checkgit resolve 5   - Start work"
    }
} elseif ($Action -eq "view") {
    if ($IssueNumber -eq 0) {
        Write-Host "Need issue number: .\checkgit view 5"
    } else {
        Write-Host "Issue #$IssueNumber details:"
        Write-Host ""
        gh issue view $IssueNumber
    }
} elseif ($Action -eq "resolve") {
    if ($IssueNumber -eq 0) {
        Write-Host "Need issue number: .\checkgit resolve 5"
    } else {
        Write-Host "Setting up resolution for issue #$IssueNumber"
        
        $branch = "feature/issue-$IssueNumber"
        Write-Host "Creating branch: $branch"
        
        git checkout -b $branch 2>$null
        if ($LASTEXITCODE -ne 0) {
            git checkout $branch
        }
        
        Write-Host "Branch ready!"
        Write-Host ""
        Write-Host "Now tell me: 'Resolve GitHub issue #$IssueNumber'"
    }
} else {
    Write-Host "Usage:"
    Write-Host "  .\checkgit              - List issues"
    Write-Host "  .\checkgit view 5       - View issue #5"  
    Write-Host "  .\checkgit resolve 5    - Start resolving #5"
}

Write-Host ""