@echo off
title Stop Tenvora Local Stack
echo Stopping Tenvora local processes...

taskkill /FI "WINDOWTITLE eq Tenvora Backend API*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Tenvora Frontend Web*" /T /F >nul 2>&1
taskkill /IM Tenvora.Api.exe /F >nul 2>&1

echo.
echo Tenvora local servers stopped.
timeout /t 2 >nul
