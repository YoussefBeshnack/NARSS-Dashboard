@echo off
title Starting NARSS Research Dashboard...

:: Launch Backend Server in a new terminal window
start "Backend Server" cmd /k "cd /d "%~dp0server" && npm run start"

:: Launch Frontend HTTP Server in a second new terminal window
start "Frontend Server" cmd /k "cd /d "%~dp0client" && python -m http.server 8000"

echo Project launched successfully!