@echo off
echo ===== Nectar API Development Environment (DEBUG MODE) =====

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

REM Best-effort: free common candidate ports before selection
echo Preflight: freeing common candidate ports (3001,3011,3021,3031, 4001-4006, 5001-5006)...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\ensure-ports-free.ps1" -Ports 3001,3011,3021,3031,4001,4002,4003,4004,4005,4006,5001,5002,5003,5004,5005,5006 -TimeoutSeconds 15 >nul 2>&1
if errorlevel 1 (
  echo Warning: Some candidate ports could not be freed; continuing...
)

REM Choose dynamic ports to avoid collisions; prefer 3001/4001/5000
set "TMP_API_PORT=%TEMP%\nectar_api_port.txt"
set "TMP_ADMIN_PORT=%TEMP%\nectar_admin_api_port.txt"
set "TMP_MARKETING_PORT=%TEMP%\nectar_marketing_api_port.txt"
set "TMP_DB_URL=%TEMP%\nectar_database_url.txt"
if exist "%TMP_API_PORT%" del /f /q "%TMP_API_PORT%" >nul 2>&1
if exist "%TMP_ADMIN_PORT%" del /f /q "%TMP_ADMIN_PORT%" >nul 2>&1
if exist "%TMP_MARKETING_PORT%" del /f /q "%TMP_MARKETING_PORT%" >nul 2>&1
if exist "%TMP_DB_URL%" del /f /q "%TMP_DB_URL%" >nul 2>&1

echo DEBUG: Checking if scripts\choose-free-port.ps1 exists...
if not exist "scripts\choose-free-port.ps1" (
  echo ERROR: scripts\choose-free-port.ps1 not found!
  echo Current directory: %CD%
  echo Listing scripts directory:
  dir scripts\ 2>nul || echo Scripts directory does not exist!
  goto :error_exit
)

echo DEBUG: Attempting to select API port...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\choose-free-port.ps1" -Preferred 3001 -Fallbacks "3011,3021,3031" > "%TMP_API_PORT%" 2>&1
if errorlevel 1 (
  echo ERROR: Failed to select a free API port.
  echo PowerShell output:
  type "%TMP_API_PORT%" 2>nul || echo No output file created
  goto :error_exit
)
set /p API_PORT=<"%TMP_API_PORT%"
if not defined API_PORT (
  echo ERROR: API port selection returned empty value.
  echo File contents:
  type "%TMP_API_PORT%" 2>nul || echo File not found
  goto :error_exit
)
echo DEBUG: Selected API port: %API_PORT%

echo DEBUG: Attempting to select Admin API port...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\choose-free-port.ps1" -Preferred 4001 -Fallbacks "4002,4003,4004,4005,4006" > "%TMP_ADMIN_PORT%" 2>&1
if errorlevel 1 (
  echo ERROR: Failed to select a free Admin API port.
  echo PowerShell output:
  type "%TMP_ADMIN_PORT%" 2>nul || echo No output file created
  goto :error_exit
)
set /p ADMIN_API_PORT=<"%TMP_ADMIN_PORT%"
if not defined ADMIN_API_PORT (
  echo ERROR: Admin API port selection returned empty value.
  echo File contents:
  type "%TMP_ADMIN_PORT%" 2>nul || echo File not found
  goto :error_exit
)
echo DEBUG: Selected Admin API port: %ADMIN_API_PORT%

echo DEBUG: Attempting to select Marketing API port...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\choose-free-port.ps1" -Preferred 5001 -Fallbacks "5002,5003,5004,5005,5006" > "%TMP_MARKETING_PORT%" 2>&1
if errorlevel 1 (
  echo ERROR: Failed to select a free Marketing API port.
  echo PowerShell output:
  type "%TMP_MARKETING_PORT%" 2>nul || echo No output file created
  goto :error_exit
)
set /p MARKETING_API_PORT=<"%TMP_MARKETING_PORT%"
if not defined MARKETING_API_PORT (
  echo ERROR: Marketing API port selection returned empty value.
  echo File contents:
  type "%TMP_MARKETING_PORT%" 2>nul || echo File not found
  goto :error_exit
)
echo DEBUG: Selected Marketing API port: %MARKETING_API_PORT%

echo Selected backend ports: API=%API_PORT%, ADMIN=%ADMIN_API_PORT%, MARKETING=%MARKETING_API_PORT%

echo DEBUG: Checking server\.env file...
if not exist "server\.env" (
  echo ERROR: server/.env not found. Please restore it; we will not modify it.
  echo Current directory: %CD%
  echo Listing server directory:
  dir server\ 2>nul || echo Server directory does not exist!
  goto :error_exit
)

echo DEBUG: Extracting DATABASE_URL...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\extract-database-url.ps1" -EnvPath "server/.env" -OutFile "%TMP_DB_URL%" 2>&1
if errorlevel 3 (
  echo ERROR: server/.env not found.
  goto :error_exit
)
if errorlevel 2 (
  echo ERROR: DATABASE_URL is missing in server/.env. Please add it; we will not modify the file.
  echo Current server/.env contents:
  type "server\.env" 2>nul || echo Could not read server/.env
  goto :error_exit
)
if errorlevel 1 (
  echo ERROR: Failed to read DATABASE_URL from server/.env.
  echo Script output:
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\extract-database-url.ps1" -EnvPath "server/.env" -OutFile "%TMP_DB_URL%"
  goto :error_exit
)

echo DEBUG: DATABASE_URL extracted successfully
echo Database URL file contents:
type "%TMP_DB_URL%" 2>nul || echo Could not read database URL file

echo DEBUG: Script completed successfully up to this point.
echo Press any key to continue with server startup, or Ctrl+C to exit...
pause

goto :eof

:error_exit
echo.
echo DEBUG: Script failed. Window will remain open for debugging.
echo Press any key to exit...
pause
exit /b 1