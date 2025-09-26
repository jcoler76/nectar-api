@echo off
echo ===== Nectar API Development Environment =====

setlocal ENABLEDELAYEDEXPANSION

echo Stopping any previously started dev windows...
taskkill /F /FI "WINDOWTITLE eq Nectar API Backend Server" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Nectar API Frontend" /T >nul 2>&1
timeout /t 1 /nobreak >nul

echo Ensuring no pm2-managed processes remain (optional)...
where pm2 >nul 2>&1 && pm2 delete all >nul 2>&1

REM Best-effort: free common candidate ports before selection
echo Preflight: freeing common candidate ports (3001,3011,3021,3031)...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports 3001,3011,3021,3031 -TimeoutSeconds 15 >nul 2>&1
if errorlevel 1 (
  echo Warning: Some candidate ports could not be freed; continuing...
)

REM Choose dynamic ports to avoid collisions; prefer 3001
set "TMP_API_PORT=%TEMP%\nectar_api_port.txt"
set "TMP_DB_URL=%TEMP%\nectar_database_url.txt"
if exist "%TMP_API_PORT%" del /f /q "%TMP_API_PORT%" >nul 2>&1
if exist "%TMP_DB_URL%" del /f /q "%TMP_DB_URL%" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\choose-free-port.ps1" -Preferred 3001 -Fallbacks "3011,3021,3031" > "%TMP_API_PORT%" 2>nul
if errorlevel 1 (
  echo ERROR: Failed to select a free API port. Check scripts\choose-free-port.ps1 output.
  pause
  exit /b 1
)
set /p API_PORT=<"%TMP_API_PORT%"
if not defined API_PORT (
  echo ERROR: API port selection returned empty value.
  pause
  exit /b 1
)

echo Selected backend port: API=%API_PORT%

echo Preflight: ensure backend port is free (%API_PORT%)...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports %API_PORT% -TimeoutSeconds 30
if errorlevel 1 (
    echo ERROR: Could not free backend port %API_PORT%. Aborting startup.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul

echo Ensuring no stray server Node process remains...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\kill-server-node.ps1" -Match "server\\server.js"
timeout /t 1 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports %API_PORT% -TimeoutSeconds 15
if errorlevel 1 (
    echo ERROR: Backend port still not free after kill attempt. Aborting.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul

echo Skipping .env modifications; using environment variables only...

:: Extract DATABASE_URL to a temp file
if not exist "server\.env" (
  echo ERROR: server/.env not found. Please restore it; we will not modify it.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\extract-database-url.ps1" -EnvPath "server/.env" -OutFile "%TMP_DB_URL%"
if errorlevel 3 (
  echo ERROR: server/.env not found.
  pause
  exit /b 1
)
if errorlevel 2 (
  echo ERROR: DATABASE_URL is missing in server/.env. Please add it; we will not modify the file.
  pause
  exit /b 1
)
if errorlevel 1 (
  echo ERROR: Failed to read DATABASE_URL from server/.env.
  pause
  exit /b 1
)

:: Create PowerShell launcher script for backend
set "BACKEND_LAUNCH_PS1=%TEMP%\nectar-start-backend.ps1"
if exist "%BACKEND_LAUNCH_PS1%" del /f /q "%BACKEND_LAUNCH_PS1%" >nul 2>&1

echo $env:NODE_ENV = 'development' > "%BACKEND_LAUNCH_PS1%"
echo $env:PORT = '%API_PORT%' >> "%BACKEND_LAUNCH_PS1%"
echo $env:DATABASE_URL = Get-Content -LiteralPath '%TMP_DB_URL%' -Raw >> "%BACKEND_LAUNCH_PS1%"
echo Set-Location -Path '%CD%\server' >> "%BACKEND_LAUNCH_PS1%"
echo npm run start >> "%BACKEND_LAUNCH_PS1%"

echo Starting development servers...

:: Start backend server in a new window (port %API_PORT%)
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-port.ps1" -Port %API_PORT% -State free -TimeoutSeconds 10 >nul 2>&1
start "Nectar API Backend Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%BACKEND_LAUNCH_PS1%"

:: Wait until backend is listening on %API_PORT% before continuing
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-port.ps1" -Port %API_PORT% -State listening -TimeoutSeconds 60
if errorlevel 1 (
    echo ERROR: Backend failed to listen on %API_PORT% in time. Aborting.
    pause
    exit /b 1
)

:: Backend is up; proceed to start frontend

echo Preflight: ensure frontend port is free (3000)...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports 3000 -TimeoutSeconds 30
if errorlevel 1 (
    echo ERROR: Could not free frontend port 3000. Aborting startup.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul

:: Start frontend server in a new window (port 3000)
start "Nectar API Frontend" cmd /k "echo Starting frontend server on port 3000... && SET PORT=3000 && SET REACT_APP_API_URL=http://localhost:%API_PORT% && npm run start:frontend"

echo Development servers starting:
echo Main Backend API: http://localhost:%API_PORT%
echo Main Frontend: http://localhost:3000
echo.
echo GraphQL Playground: http://localhost:%API_PORT%/graphql
echo.
echo Application Ready:
echo - Main Frontend: Platform dashboard and customer management
echo - Main Backend: Core API with GraphQL support
echo - Database: PostgreSQL via Prisma
echo.
echo NOTE: Admin and Marketing services are now separate microservices.
echo - Run 'nectar-admin\dev.cmd' for Admin Portal (ports 4000/4001)
echo - Run 'nectar-marketing\dev.cmd' for Marketing Site (ports 5000/5001)

echo.
echo Use these URLs in your browser to access the application.
echo ========================================================= 

endlocal 
