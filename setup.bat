@echo off
REM Crypto Tracker Setup Script for Windows

echo 🚀 Crypto Tracker Setup
echo ======================

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

echo ✅ Docker is installed

REM Start services
echo.
echo Starting services with Docker Compose...
docker-compose up -d

echo.
echo ✅ Services started successfully!
echo.
echo 📍 Access points:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo 📦 Services:
docker-compose ps

pause
