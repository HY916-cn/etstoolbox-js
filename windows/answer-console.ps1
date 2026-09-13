[CmdletBinding()]
param(
    [string]$AnswerFile,
    [switch]$Once
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($AnswerFile)) {
    $scriptPath = $MyInvocation.MyCommand.Path
    if ([string]::IsNullOrWhiteSpace($scriptPath)) {
        throw 'The answer console script path could not be resolved.'
    }
    $AnswerFile = Join-Path (Split-Path -Parent $scriptPath) 'answers.txt'
}

try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $Host.UI.RawUI.WindowTitle = 'ETSToolbox Answer Console'
    $lastText = $null

    while ($true) {
        if (Test-Path -LiteralPath $AnswerFile -PathType Leaf) {
            $text = Get-Content -LiteralPath $AnswerFile -Raw -Encoding UTF8
        }
        else {
            $text = "ETSToolbox Answer Console`r`n`r`nWaiting for question data..."
        }

        if ($text -ne $lastText) {
            Clear-Host
            Write-Host $text
            Write-Host "`r`nPress Ctrl+C to close this window." -ForegroundColor DarkGray
            $lastText = $text
        }

        if ($Once) { break }
        Start-Sleep -Milliseconds 250
    }
}
catch {
    Write-Host "ETSToolbox answer console failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
