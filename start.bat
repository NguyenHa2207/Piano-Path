@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 (
    echo Setup failed. Install Node.js LTS and check your internet connection.
    pause
    exit /b 1
  )
)
call npm start
pause
