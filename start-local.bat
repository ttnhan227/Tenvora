@echo off
title Tenvora Local Stack Launcher
echo ===================================================
echo           Starting Tenvora Local Stack
echo ===================================================
echo.

:: 1. Ensure Docker PostgreSQL Container is running
echo [1/4] Ensuring PostgreSQL container is running (Docker)...
docker compose up -d postgres
echo.

:: 2. Setup ADB reverse port for connected Android devices
echo [2/4] Configuring ADB reverse port forwarding (5000 -> 5000)...
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1;%PATH%"
adb connect 192.168.1.7:36425 >nul 2>&1
adb reverse tcp:5000 tcp:5000 >nul 2>&1
echo Mobile reverse tunnel ready.
echo.

:: 3. Start Backend API (.NET) in a separate window
echo [3/4] Launching Backend API (http://localhost:5000)...
start "Tenvora Backend API" cmd /k "cd /d %~dp0 && dotnet run --project server"

:: 4. Start Frontend Web (Vite) in a separate window
echo [4/4] Launching Frontend Web (http://localhost:5173)...
start "Tenvora Frontend Web" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ===================================================
echo Tenvora is running!
echo   - Web Frontend:  http://localhost:5173
echo   - Backend API:   http://localhost:5000
echo   - Swagger Docs:  http://localhost:5000/swagger
echo   - Database:      Docker (tenvora-postgres on port 5434)
echo.
echo Your Account:
echo   - Email:         ttnhan227@gmail.com
echo.
echo For mobile screen mirroring, run: mirror-phone.bat
echo ===================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
