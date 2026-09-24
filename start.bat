@echo off
cd /d "%~dp0"
node run.js
if errorlevel 1 pause
