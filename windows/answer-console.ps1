[CmdletBinding()]
param(
    [string]$AnswerFile = (Join-Path $PSScriptRoot 'answers.txt')
)

$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
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

    Start-Sleep -Milliseconds 250
}
