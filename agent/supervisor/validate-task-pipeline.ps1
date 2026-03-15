param(
    [Parameter(Mandatory = $true)]
    [string]$TaskId,
    [switch]$Archive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-TaskField {
    param(
        [string]$Content,
        [string]$Name
    )

    $m = [regex]::Match($Content, "(?m)^\s*${Name}:\s*([^`r`n]+)\s*$")
    if ($m.Success) {
        return $m.Groups[1].Value.Trim()
    }
    return $null
}

function Count-AgentAuditEntries {
    param(
        [string]$AuditContent,
        [string]$Agent
    )

    $matches = [regex]::Matches($AuditContent, "(?m)^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - $Agent\s*$")
    return $matches.Count
}

$taskFile = Join-Path 'agent/tasks' "$TaskId.md"
if (-not (Test-Path $taskFile)) {
    throw "Task file not found: $taskFile"
}

$taskContent = Get-Content -Raw $taskFile
$pipeline = Get-TaskField -Content $taskContent -Name 'pipeline'
$status = Get-TaskField -Content $taskContent -Name 'status'

if ([string]::IsNullOrWhiteSpace($pipeline)) {
    throw "Unable to resolve pipeline from $taskFile"
}

$errors = New-Object System.Collections.Generic.List[string]

if ($pipeline -eq 'implementation') {
    $requiredFiles = @(
        "agent/tasks/$TaskId.md",
        "agent/tasks/$TaskId.agents-audit.md",
        "agent/tasks/$TaskId.plan.md",
        "agent/tasks/$TaskId.coder.md",
        "agent/tasks/$TaskId.test.md",
        "agent/tasks/$TaskId.review.md"
    )
    $requiredAgents = @('supervisor', 'planner', 'coder', 'tester', 'reviewer')
} elseif ($pipeline -eq 'architecture') {
    $requiredFiles = @(
        "agent/tasks/$TaskId.md",
        "agent/tasks/$TaskId.agents-audit.md",
        "agent/tasks/$TaskId.arch.md",
        "agent/tasks/$TaskId.split.md"
    )
    $requiredAgents = @('supervisor', 'architect', 'task-splitter')
} else {
    $errors.Add("Unsupported pipeline value: $pipeline")
    $requiredFiles = @()
    $requiredAgents = @()
}

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $errors.Add("Missing required artifact: $file")
    }
}

$auditFile = "agent/tasks/$TaskId.agents-audit.md"
if (Test-Path $auditFile) {
    $auditContent = Get-Content -Raw $auditFile
    foreach ($agent in $requiredAgents) {
        $count = Count-AgentAuditEntries -AuditContent $auditContent -Agent $agent
        if ($count -lt 2) {
            $errors.Add("Audit log has $count entries for '$agent'; expected at least 2")
        }
    }
}

if ($pipeline -eq 'implementation') {
    $reviewFile = "agent/tasks/$TaskId.review.md"
    if (Test-Path $reviewFile) {
        $reviewContent = Get-Content -Raw $reviewFile
        if ($reviewContent -notmatch '(?im)\bAPPROVED\b') {
            $errors.Add("Review report does not contain APPROVED decision: $reviewFile")
        }
    }
}

if ($Archive.IsPresent -and $status -ne 'done') {
    $errors.Add("Task status must be 'done' before archive, current status is '$status'")
}

if ($errors.Count -gt 0) {
    Write-Host "Pipeline validation failed for ${TaskId}:" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "- $err" -ForegroundColor Red
    }
    exit 1
}

Write-Host "Pipeline validation passed for $TaskId." -ForegroundColor Green

if ($Archive.IsPresent) {
    $destDir = "agent/done/$TaskId"
    New-Item -ItemType Directory -Force $destDir | Out-Null

    Get-ChildItem 'agent/tasks' -File |
        Where-Object { $_.Name -like "$TaskId*" } |
        Move-Item -Destination $destDir -Force

    Write-Host "Archived task artifacts to $destDir" -ForegroundColor Green
}
