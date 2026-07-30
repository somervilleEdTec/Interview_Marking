#Requires -Version 5.0
<#
.SYNOPSIS
  Strip transcription data from Interview Marking local stores on uninstall.
.DESCRIPTION
  Always removes transcript / transcriptTurns / resolved mark text from
  interview-marking-store.json under known Electron userData paths.
  Settings (criteria, bindings, sessions shell, controller assignment) are kept.
  Mirrors src/storage/store.ts stripTranscriptData.
#>
$ErrorActionPreference = "SilentlyContinue"

$storeNames = @("interview-marking-store.json")
$appDirs = @(
  "Interview Marking",
  "interview-marking",
  "InterviewMarking"
)

$roots = @()
foreach ($base in @($env:APPDATA, $env:LOCALAPPDATA)) {
  if (-not $base) { continue }
  foreach ($dir in $appDirs) {
    $roots += (Join-Path $base $dir)
  }
}

function Strip-StoreFile([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  try {
    $raw = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) { return }
    $json = $raw | ConvertFrom-Json
    if ($null -eq $json) { return }

    if ($json.project -and $json.project.sessions) {
      foreach ($session in @($json.project.sessions)) {
        if ($session.PSObject.Properties.Name -contains "transcript") {
          $session.PSObject.Properties.Remove("transcript")
        }
        if ($session.PSObject.Properties.Name -contains "transcriptTurns") {
          $session.PSObject.Properties.Remove("transcriptTurns")
        }
        if ($session.marks) {
          foreach ($mark in @($session.marks)) {
            if ($mark.PSObject.Properties.Name -contains "resolved") {
              $mark.PSObject.Properties.Remove("resolved")
            }
          }
        }
      }
    }

    $out = $json | ConvertTo-Json -Depth 30 -Compress
    Set-Content -LiteralPath $path -Value $out -Encoding UTF8
  } catch {
    # If the store cannot be rewritten, delete it so transcripts cannot linger.
    Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  }
}

foreach ($root in $roots) {
  foreach ($name in $storeNames) {
    Strip-StoreFile (Join-Path $root $name)
  }
}

exit 0
