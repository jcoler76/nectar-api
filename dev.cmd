@echo off
echo ===== Nectar API Development Environment =====

setlocal ENABLEDELAYEDEXPANSION

echo Stopping any previously started dev windows...
taskkill /F /FI "WINDOWTITLE eq Nectar API Backend Server" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Nectar Admin Backend Server" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Nectar Marketing Backend Server" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Nectar API Frontend" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Nectar Admin Frontend" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Nectar Marketing Frontend" /T >nul 2>&1
timeout /t 1 /nobreak >nul

echo Ensuring no pm2-managed processes remain (optional)...
where pm2 >nul 2>&1 && pm2 delete all >nul 2>&1

REM Choose dynamic ports to avoid collisions; prefer 3001/4001/5000
set "TMP_API_PORT=%TEMP%\nectar_api_port.txt"
set "TMP_ADMIN_PORT=%TEMP%\nectar_admin_api_port.txt"
set "TMP_MARKETING_PORT=%TEMP%\nectar_marketing_api_port.txt"
set "TMP_DB_URL=%TEMP%\nectar_database_url.txt"
if exist "%TMP_API_PORT%" del /f /q "%TMP_API_PORT%" >nul 2>&1
if exist "%TMP_ADMIN_PORT%" del /f /q "%TMP_ADMIN_PORT%" >nul 2>&1
if exist "%TMP_MARKETING_PORT%" del /f /q "%TMP_MARKETING_PORT%" >nul 2>&1
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

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\choose-free-port.ps1" -Preferred 4001 -Fallbacks "4002,4003,4004,4005,4006" > "%TMP_ADMIN_PORT%" 2>nul
if errorlevel 1 (
  echo ERROR: Failed to select a free Admin API port. Check scripts\choose-free-port.ps1 output.
  pause
  exit /b 1
)
set /p ADMIN_API_PORT=<"%TMP_ADMIN_PORT%"
if not defined ADMIN_API_PORT (
  echo ERROR: Admin API port selection returned empty value.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\choose-free-port.ps1" -Preferred 5001 -Fallbacks "5002,5003,5004,5005,5006" > "%TMP_MARKETING_PORT%" 2>nul
if errorlevel 1 (
  echo ERROR: Failed to select a free Marketing API port. Check scripts\choose-free-port.ps1 output.
  pause
  exit /b 1
)
set /p MARKETING_API_PORT=<"%TMP_MARKETING_PORT%"
if not defined MARKETING_API_PORT (
  echo ERROR: Marketing API port selection returned empty value.
  pause
  exit /b 1
)

echo Selected backend ports: API=%API_PORT%, ADMIN=%ADMIN_API_PORT%, MARKETING=%MARKETING_API_PORT%

echo Preflight: ensure backend ports are free (%API_PORT%, %ADMIN_API_PORT%, %MARKETING_API_PORT%)...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports %API_PORT%,%ADMIN_API_PORT%,%MARKETING_API_PORT% -TimeoutSeconds 30
if errorlevel 1 (
    echo ERROR: Could not free backend ports %API_PORT%/%ADMIN_API_PORT%/%MARKETING_API_PORT%. Aborting startup.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul

echo Ensuring no stray server Node process remains...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\kill-server-node.ps1" -Match "server\\server.js"
timeout /t 1 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports %API_PORT%,%ADMIN_API_PORT%,%MARKETING_API_PORT% -TimeoutSeconds 15
if errorlevel 1 (
    echo ERROR: Backend ports still not free after kill attempt. Aborting.
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

:: Create PowerShell launcher scripts for backend/admin-backend
set "BACKEND_LAUNCH_PS1=%TEMP%\nectar-start-backend.ps1"
set "ADMIN_LAUNCH_PS1=%TEMP%\nectar-start-admin-backend.ps1"
set "MARKETING_LAUNCH_PS1=%TEMP%\nectar-start-marketing-backend.ps1"
if exist "%BACKEND_LAUNCH_PS1%" del /f /q "%BACKEND_LAUNCH_PS1%" >nul 2>&1
if exist "%ADMIN_LAUNCH_PS1%" del /f /q "%ADMIN_LAUNCH_PS1%" >nul 2>&1
if exist "%MARKETING_LAUNCH_PS1%" del /f /q "%MARKETING_LAUNCH_PS1%" >nul 2>&1

echo $env:NODE_ENV = 'development' > "%BACKEND_LAUNCH_PS1%"
echo $env:PORT = '%API_PORT%' >> "%BACKEND_LAUNCH_PS1%"
echo $env:DATABASE_URL = Get-Content -LiteralPath '%TMP_DB_URL%' -Raw >> "%BACKEND_LAUNCH_PS1%"
echo Set-Location -Path '%CD%\server' >> "%BACKEND_LAUNCH_PS1%"
echo npm run start >> "%BACKEND_LAUNCH_PS1%"

echo $env:NODE_ENV = 'development' > "%ADMIN_LAUNCH_PS1%"
echo $env:PORT = '%ADMIN_API_PORT%' >> "%ADMIN_LAUNCH_PS1%"
echo $env:DATABASE_URL = Get-Content -LiteralPath '%TMP_DB_URL%' -Raw >> "%ADMIN_LAUNCH_PS1%"
echo Set-Location -Path '%CD%\admin-backend' >> "%ADMIN_LAUNCH_PS1%"
echo npm run dev >> "%ADMIN_LAUNCH_PS1%"

echo $env:NODE_ENV = 'development' > "%MARKETING_LAUNCH_PS1%"
echo $env:MARKETING_PORT = '%MARKETING_API_PORT%' >> "%MARKETING_LAUNCH_PS1%"
echo Set-Location -Path '%CD%\marketing-site\backend' >> "%MARKETING_LAUNCH_PS1%"
echo npm run start >> "%MARKETING_LAUNCH_PS1%"

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

:: Start admin-backend server in a new window (port %ADMIN_API_PORT%)
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-port.ps1" -Port %ADMIN_API_PORT% -State free -TimeoutSeconds 10 >nul 2>&1
start "Nectar Admin Backend Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%ADMIN_LAUNCH_PS1%"

:: Wait until admin-backend is listening on %ADMIN_API_PORT% before continuing
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-port.ps1" -Port %ADMIN_API_PORT% -State listening -TimeoutSeconds 60
if errorlevel 1 (
    echo ERROR: Admin backend failed to listen on %ADMIN_API_PORT% in time. Aborting.
    pause
    exit /b 1
)

:: Start marketing-backend server in a new window (port %MARKETING_API_PORT%)
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-port.ps1" -Port %MARKETING_API_PORT% -State free -TimeoutSeconds 10 >nul 2>&1
start "Nectar Marketing Backend Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%MARKETING_LAUNCH_PS1%"

:: Wait until marketing-backend is listening on %MARKETING_API_PORT% before frontends
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-port.ps1" -Port %MARKETING_API_PORT% -State listening -TimeoutSeconds 60
if errorlevel 1 (
    echo ERROR: Marketing backend failed to listen on %MARKETING_API_PORT% in time. Aborting.
    pause
    exit /b 1
)

:: Backends are up; proceed to start frontends

echo Preflight: ensure frontend ports are free (3000, 4000, 5000)...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports 3000,4000,5000 -TimeoutSeconds 30
if errorlevel 1 (
    echo ERROR: Could not free frontend ports 3000/4000/5000. Aborting startup.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul

:: Start frontend server in a new window (port 3000)
start "Nectar API Frontend" cmd /k "echo Starting frontend server on port 3000... && SET PORT=3000 && SET REACT_APP_API_URL=http://localhost:%API_PORT% && npm run start:frontend"

:: Start admin-frontend server in a new window (port 4000)
start "Nectar Admin Frontend" cmd /k "cd admin-frontend && echo Starting admin frontend server on port 4000... && SET PORT=4000 && npm start"

:: Start marketing-frontend server in a new window (port 5000)
start "Nectar Marketing Frontend" cmd /k "cd marketing-site\frontend && echo Starting marketing frontend server on port 5000... && SET PORT=5000 && SET REACT_APP_MARKETING_API_URL=http://localhost:%MARKETING_API_PORT%/api/marketing && npm start"

echo Development servers starting:
echo Main Backend API: http://localhost:%API_PORT%
echo Main Frontend: http://localhost:3000
echo Admin Backend API: http://localhost:%ADMIN_API_PORT%
echo Admin Frontend: http://localhost:4000
echo Marketing Backend API: http://localhost:%MARKETING_API_PORT%
echo Marketing Frontend: http://localhost:5000
echo.
echo GraphQL Playground: http://localhost:%API_PORT%/graphql
echo.
echo Application Ready:
echo - Main Frontend: Customer application (self-hosted ready)
echo - Main Backend: Customer API with GraphQL support
echo - Admin Frontend: Administrative interface (platform management)
echo - Admin Backend: Admin API services
echo - Marketing Frontend: Public marketing site (lead generation)
echo - Marketing Backend: Marketing API with Stripe integration
echo - Database: PostgreSQL via Prisma

echo.
echo Use these URLs in your browser to access the application.
echo ========================================================= 

endlocal 
