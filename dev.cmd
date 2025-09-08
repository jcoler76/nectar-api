@echo off
echo ===== Nectar API Development Environment =====

echo Checking for processes on development ports...
:: Find and kill process on port 3000
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    echo Killing process with PID %%P on port 3000
    taskkill /F /PID %%P >nul 2>&1
)

:: Find and kill process on port 3001
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') DO (
    echo Killing process with PID %%P on port 3001
    taskkill /F /PID %%P >nul 2>&1
)

:: Find and kill process on port 3002
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') DO (
    echo Killing process with PID %%P on port 3002
    taskkill /F /PID %%P >nul 2>&1
)

:: Find and kill process on port 3003
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3003 ^| findstr LISTENING') DO (
    echo Killing process with PID %%P on port 3003
    taskkill /F /PID %%P >nul 2>&1
)

echo Creating environment files...
:: Create React app port configuration
echo PORT=3000> .env.development
echo REACT_APP_API_URL=http://localhost:3001>> .env.development

:: Create server port configuration
cd server
echo NODE_ENV=development> .env.new
echo PORT=3001>> .env.new
type .env | findstr /v "NODE_ENV" | findstr /v "PORT">> .env.new
move /Y .env.new .env >nul 2>&1
cd ..

:: Create admin-backend port configuration
cd admin-backend
echo NODE_ENV=development> .env.new
echo PORT=3003>> .env.new
if exist .env (
    type .env | findstr /v "NODE_ENV" | findstr /v "PORT">> .env.new
)
move /Y .env.new .env >nul 2>&1
cd ..

echo Starting development servers...

:: Start backend server in a new window (port 3001)
start "Nectar API Backend Server" cmd /k "cd server && echo Starting backend server on port 3001... && npm run dev"

:: Start admin-backend server in a new window (port 3003)
start "Nectar Admin Backend Server" cmd /k "cd admin-backend && echo Starting admin backend server on port 3003... && npm run dev"

:: Give backend servers time to start
timeout /t 3 /nobreak

:: Start frontend server in a new window (port 3000)
start "Nectar API Frontend" cmd /k "echo Starting frontend server on port 3000... && SET PORT=3000 && npm run start:frontend"

:: Start admin-frontend server in a new window (port 3002)
start "Nectar Admin Frontend" cmd /k "cd admin-frontend && echo Starting admin frontend server on port 3002... && SET PORT=3002 && npm start"

echo Development servers starting:
echo Main Backend API: http://localhost:3001
echo Main Frontend: http://localhost:3000
echo Admin Backend API: http://localhost:3003
echo Admin Frontend: http://localhost:3002
echo.
echo GraphQL Playground: http://localhost:3001/graphql
echo.
echo Application Ready:
echo - Main Frontend: Full React application with notifications
echo - Main Backend: Express API with GraphQL support
echo - Admin Frontend: Administrative interface
echo - Admin Backend: Admin API services
echo - Database: MongoDB with notification system
echo.
echo Use these URLs in your browser to access the application.
echo ========================================================= 