@echo off
cd /d "%~dp0"
echo Pulling latest changes...
git pull
echo.
echo Pushing your changes to GitHub...
git push
echo.
echo Done. Press any key to close this window.
pause >nul
