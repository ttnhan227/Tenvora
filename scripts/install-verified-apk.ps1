param([string]$Target = '', [switch]$DownloadOnly)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$api = 'https://api.github.com/repos/ttnhan227/Tenvora'
try {
    Write-Host 'Downloading the latest verified Tenvora app...'
    $token = $null
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        $token = (& gh auth token 2>$null | Out-String).Trim()
    }
    if (!$token -and (Get-Command git -ErrorAction SilentlyContinue)) {
        $credentials = "protocol=https`nhost=github.com`n`n" | & git credential fill 2>$null
        foreach ($line in $credentials) {
            if ($line.StartsWith('password=')) { $token = $line.Substring(9) }
        }
    }
    if (!$token) { throw 'GitHub sign-in is needed. Sign in through Git or GitHub CLI, then try again.' }
    $headers = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'Tenvora-verified-installer' }
    $runs = Invoke-RestMethod -Uri "$api/actions/workflows/build-mobile.yml/runs?branch=main&status=success&per_page=1" -Headers $headers
    $run = $runs.workflow_runs | Select-Object -First 1
    if (!$run) { throw 'No successful Android build is available yet.' }
    $jobs = Invoke-RestMethod -Uri "$api/actions/runs/$($run.id)/jobs" -Headers $headers
    $certificateCheck = @($jobs.jobs.steps | Where-Object {
        $_.name -eq 'Verify distribution signing certificate' -and $_.conclusion -eq 'success'
    })
    if ($certificateCheck.Count -eq 0) { throw 'This build has not passed distribution certificate verification. Installation was stopped.' }
    $artifacts = Invoke-RestMethod -Uri "$api/actions/runs/$($run.id)/artifacts" -Headers $headers
    $artifact = $artifacts.artifacts | Where-Object { $_.name -eq 'tenvora-mobile-apk' -and !$_.expired } | Select-Object -First 1
    if (!$artifact) { throw 'The verified download has expired or is missing. A new verified APK build is needed.' }
    $directory = Join-Path $repositoryRoot ('.audit\verified-apk\' + $run.id)
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $archive = Join-Path $directory 'download.zip'
    Invoke-WebRequest -UseBasicParsing -Uri $artifact.archive_download_url -Headers $headers -OutFile $archive -TimeoutSec 180
    if ($artifact.digest -and $artifact.digest.StartsWith('sha256:')) {
        $digest = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($digest -ne $artifact.digest.Substring(7).ToLowerInvariant()) { throw 'The download checksum did not match. Installation was stopped.' }
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $directory -Force
    $apk = Join-Path $directory 'tenvora-mobile.apk'
    if (!(Test-Path -LiteralPath $apk -PathType Leaf)) { throw 'The download did not contain the app installer.' }
    Write-Host ('Verified build: ' + $run.head_sha.Substring(0, 7))
    Write-Host ('Build page: ' + $run.html_url)
    if ($DownloadOnly) { Write-Host ('Downloaded: ' + $apk); exit 0 }
    $adbCommand = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCommand) { $adb = $adbCommand.Source }
    else {
        $packages = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
        $adbFile = Get-ChildItem -Path (Join-Path $packages 'Genymobile.scrcpy_*\scrcpy-*\adb.exe') -ErrorAction SilentlyContinue | Select-Object -First 1
        if (!$adbFile) { throw 'Android connection tools were not found. Install scrcpy or Android platform-tools first.' }
        $adb = $adbFile.FullName
    }
    if (!$Target) {
        $deviceLines = & $adb devices
        $devices = @($deviceLines | Where-Object { $_ -match '^\S+\s+device$' } | ForEach-Object { ($_ -split '\s+')[0] })
        if ($devices.Count -eq 1) { $Target = $devices[0] }
        elseif ($devices.Count -gt 1) {
            Write-Host ('Connected phones: ' + ($devices -join ', '))
            $Target = Read-Host 'Enter the phone to use'
        } else {
            Write-Host 'Connect by USB with USB debugging enabled, or enable Wireless debugging on your phone.'
            $Target = Read-Host 'For Wi-Fi, enter the IP address and port shown on your phone (for example 192.168.1.7:42655)'
        }
    }
    if (!$Target.Trim()) { throw 'No phone was selected. Connect your phone and run this file again.' }
    if ($Target -match ':') {
        & $adb connect $Target
        if ($LASTEXITCODE -ne 0) { throw 'Could not connect. Check the current wireless debugging address and port.' }
    }
    $deviceState = & $adb -s $Target get-state 2>$null
    if ($LASTEXITCODE -ne 0 -or ($deviceState | Out-String).Trim() -ne 'device') {
        throw 'Your phone is not ready. Unlock it and accept its debugging permission, then try again.'
    }
    Write-Host 'Installing the verified app on your phone...'
    $installOutput = & $adb -s $Target install -r $apk 2>&1
    $installResult = $LASTEXITCODE
    $installOutput | ForEach-Object { Write-Host $_ }
    if ($installResult -ne 0) {
        if (($installOutput | Out-String) -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match') {
            throw 'The installed app uses a different signing key. Nothing was uninstalled. Share this message before removing your existing app.'
        }
        throw 'Installation failed. Nothing was uninstalled; check the message above.'
    }
    Write-Host 'Tenvora was installed successfully. Open it on your phone and sign in with Google.' -ForegroundColor Green
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
