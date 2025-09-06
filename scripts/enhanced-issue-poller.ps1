# LOCAL-ONLY GitHub Issue Auto-Resolver with AI Acceptance Criteria
# ⚠️ WARNING: This script runs ONLY on your LOCAL machine
# ⚠️ NEVER run this in production - it makes OpenAI API calls

param(
    [int]$PollInterval = 300,
    [string]$ProcessedIssuesFile = ".\.processed_issues_local",
    [string]$LogFile = ".\issue-poller-local.log",
    [string[]]$TargetLabels = @("auto-resolve"),
    [string]$ApiUrl = "http://localhost:3001"
)

# Create processed issues file if it doesn't exist
if (!(Test-Path $ProcessedIssuesFile)) {
    New-Item -Path $ProcessedIssuesFile -ItemType File -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp - $Message"
    Write-Host $logEntry
    Add-Content -Path $LogFile -Value $logEntry
}

function Get-ProcessedIssues {
    if (Test-Path $ProcessedIssuesFile) {
        return Get-Content $ProcessedIssuesFile -ErrorAction SilentlyContinue
    }
    return @()
}

function Add-ProcessedIssue {
    param([string]$IssueNumber)
    Add-Content -Path $ProcessedIssuesFile -Value $IssueNumber
}

function Get-IssueType {
    param($Issue)
    
    $labels = $Issue.labels | ForEach-Object { $_.name }
    
    if ($labels -contains "bug") { return "bug" }
    elseif ($labels -contains "enhancement") { return "enhancement" }
    elseif ($labels -contains "technical") { return "technical" }
    else { return "feature" }
}

function Generate-AcceptanceCriteria {
    param($Issue)
    
    $issueType = Get-IssueType $Issue
    
    # Prepare the request body
    $requestBody = @{
        issueData = @{
            title = $Issue.title
            body = $Issue.body
            labels = $Issue.labels
            assignees = $Issue.assignees
        }
        issueType = $issueType
        includeTestCases = $true
        includeTechnicalSpecs = $true
        includeBusinessContext = $true
    } | ConvertTo-Json -Depth 5
    
    try {
        Write-Log "Calling AI service to generate acceptance criteria for issue #$($Issue.number)..."
        
        $response = Invoke-RestMethod -Uri "$ApiUrl/api/acceptance-criteria/generate-acceptance-criteria" `
            -Method POST `
            -Body $requestBody `
            -ContentType "application/json" `
            -TimeoutSec 60
            
        if ($response.success) {
            Write-Log "Successfully generated acceptance criteria for issue #$($Issue.number)"
            return $response.formattedForGitHub
        } else {
            Write-Log "Failed to generate acceptance criteria: $($response.message)"
            return $null
        }
    }
    catch {
        Write-Log "Error calling AI service: $($_.Exception.Message)"
        
        # Fallback: Create basic acceptance criteria template
        $fallbackCriteria = @"
## 🤖 Basic Acceptance Criteria Template

### Functional Requirements
- [ ] Implement the requested functionality: $($Issue.title)
- [ ] Ensure proper error handling and validation
- [ ] Add appropriate user feedback and messaging

### Technical Requirements
- [ ] Follow existing code patterns and architecture
- [ ] Include proper logging and monitoring
- [ ] Add comprehensive unit tests
- [ ] Update documentation as needed

### Testing Requirements
- [ ] Test with valid inputs and edge cases
- [ ] Test error conditions and boundary cases
- [ ] Verify integration with existing features
- [ ] Perform cross-browser/device testing if UI changes

---
*Basic template generated - AI service unavailable*
"@
        
        return $fallbackCriteria
    }
}

Write-Log "Starting Enhanced GitHub Issue Auto-Resolver..."
Write-Log "Target labels: $($TargetLabels -join ', ')"
Write-Log "API URL: $ApiUrl"
Write-Log "Poll interval: $PollInterval seconds"

while ($true) {
    Write-Log "Checking for issues needing processing..."
    
    try {
        foreach ($label in $TargetLabels) {
            Write-Log "Checking for issues with label: $label"
            
            $issuesJson = gh issue list --state open --label $label --json number,title,url,body,labels,assignees | ConvertFrom-Json
            
            if ($issuesJson.Count -eq 0) {
                Write-Log "No issues found with label: $label"
                continue
            }
            
            Write-Log "Found $($issuesJson.Count) issue(s) with label: $label"
            
            foreach ($issue in $issuesJson) {
                $issueNumber = $issue.number.ToString()
                $processedIssues = Get-ProcessedIssues
                
                if ($processedIssues -contains $issueNumber) {
                    Write-Log "Issue #$issueNumber already processed, skipping"
                    continue
                }
                
                Write-Log "Processing issue #$($issue.number): $($issue.title)"
                
                # For auto-resolve issues, generate acceptance criteria AND queue for resolution
                if ($label -eq "auto-resolve") {
                    # First, generate acceptance criteria
                    Write-Log "Generating AI acceptance criteria for issue #$issueNumber"
                    
                    $criteria = Generate-AcceptanceCriteria $issue
                    
                    if ($criteria) {
                        # Add the acceptance criteria as a comment
                        gh issue comment $issueNumber --body $criteria
                        Write-Log "Added AI-generated acceptance criteria to issue #$issueNumber"
                    } else {
                        Write-Log "Failed to generate acceptance criteria for issue #$issueNumber (using fallback template)"
                    }
                    
                    # Then queue for auto-resolution
                    Write-Log "Queueing Claude Code resolution for issue #$issueNumber"
                    
                    # Add processing comment
                    $processingComment = @"
🤖 **Auto-Resolver Started**

Claude Code has detected this auto-resolve issue and will begin processing shortly.

- **Status:** Processing
- **Started:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- **Expected:** Implementation, tests, and PR creation

---
*This is an automated message from the Claude Code issue auto-resolver.*
"@
                    
                    gh issue comment $issueNumber --body $processingComment
                    Write-Log "Added processing comment to issue #$issueNumber"
                    
                    # Queue the Claude Code command
                    $claudeCommand = "claude `"Resolve GitHub issue #$issueNumber`""
                    Add-Content -Path ".\pending_claude_commands.txt" -Value $claudeCommand
                    Write-Log "Queued Claude Code resolution for issue #$issueNumber"
                }
                
                # Mark as processed
                Add-ProcessedIssue $issueNumber
                Write-Log "Marked issue #$issueNumber as processed"
            }
        }
        
        Write-Log "Completed processing cycle"
    }
    catch {
        Write-Log "Error during processing cycle: $($_.Exception.Message)"
    }
    
    Write-Log "Next check in $PollInterval seconds..."
    Write-Log "----------------------------------------"
    Start-Sleep -Seconds $PollInterval
}