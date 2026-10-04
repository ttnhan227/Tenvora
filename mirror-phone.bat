@echo off
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1;%PATH%"

set "TARGET=192.168.1.7:36425"
if not "%~1"=="" set "TARGET=%~1"

echo Connecting to Samsung Galaxy A25 (%TARGET%)...
adb connect %TARGET% >nul 2>&1
adb reverse tcp:5000 tcp:5000 >nul 2>&1

echo Starting screen mirror...
scrcpy -s %TARGET% --window-title="Samsung Galaxy A25 (Tenvora)" || scrcpy --window-title="Android Device (Tenvora)"
