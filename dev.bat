@echo off
REM LivyFlow Development Startup Script for Windows
REM This script starts both the frontend and backend servers

echo 🚀 Starting LivyFlow Development Environment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python first.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if backend directory exists
if not exist "backend" (
    echo ❌ Backend directory not found. Please ensure the backend directory exists.
    pause
    exit /b 1
)

echo ✅ Environment check passed
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
    echo.
)

REM Check if backend requirements are installed
if not exist "backend\venv" if not exist "backend\env" (
    echo 📦 Backend virtual environment not found. Please set up your Python environment:
    echo    cd backend
    echo    python -m venv venv
    echo    venv\Scripts\activate
    echo    pip install -r requirements.txt
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo 🌐 Starting servers...
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8000
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start both servers concurrently
npm run dev-full 