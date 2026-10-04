@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-verified-apk.ps1"
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-verified-apk.ps1" -Target "%~1"
)
set "INSTALL_RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %INSTALL_RESULT%
