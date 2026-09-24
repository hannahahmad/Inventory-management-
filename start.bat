@echo off
cd /d "%~dp0"
if exist "upso-asset-management-main\start.bat" (
    cd upso-asset-management-main
    call start.bat
) else (
    call start.bat
)
