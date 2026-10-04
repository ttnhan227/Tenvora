@echo off
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1;%PATH%"

set "TARGET=192.168.1.7:42655"
if not "%~1"=="" (
    echo %~1 | findstr ":" >nul
    if errorlevel 1 (
        set "TARGET=192.168.1.7:%~1"
    ) else (
        set "TARGET=%~1"
    )
)

set "APK_PATH=mobile\build\app\outputs\flutter-apk\app-debug.apk"
if not exist "%APK_PATH%" set "APK_PATH=mobile\build\app\outputs\flutter-apk\tenvora-galaxy-a25-google.apk"
if not exist "%APK_PATH%" set "APK_PATH=client\public\downloads\tenvora-mobile.apk"

if not exist "%APK_PATH%" (
    echo [ERROR] No APK file found to install.
    exit /b 1
)

echo [1/3] Syncing latest build (%APK_PATH%) to web downloads...
if not exist "client\public\downloads" mkdir "client\public\downloads"
copy /y "%APK_PATH%" "client\public\downloads\tenvora-mobile.apk" >nul 2>&1
copy /y "%APK_PATH%" "mobile\build\app\outputs\flutter-apk\tenvora-galaxy-a25-google.apk" >nul 2>&1

echo [2/3] Connecting to Android device (%TARGET%)...
adb connect %TARGET%
adb -s %TARGET% reverse tcp:5000 tcp:5000 >nul 2>&1

echo [3/3] Installing %APK_PATH% to phone...
adb -s %TARGET% install -r "%APK_PATH%"
if %errorlevel% neq 0 (
    echo Retrying with default device target...
    adb install -r "%APK_PATH%"
)

echo.
echo ========================================================
echo  APK pushed to phone and synced to web successfully!
echo ========================================================
