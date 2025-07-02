#!/bin/bash

# LivyFlow Development Startup Script
# This script starts both the frontend and backend servers

echo "🚀 Starting LivyFlow Development Environment..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found. Please ensure the backend directory exists."
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

# Check if backend requirements are installed
if [ ! -d "backend/venv" ] && [ ! -d "backend/env" ]; then
    echo "📦 Backend virtual environment not found. Please set up your Python environment:"
    echo "   cd backend"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
    echo "   pip install -r requirements.txt"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "🌐 Starting servers..."
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers concurrently
npm run dev-full 