# 🚀 LivyFlow Development Guide

## Quick Start

### Option 1: One Command (Recommended)
```bash
# On macOS/Linux:
./dev.sh

# On Windows:
dev.bat
```

### Option 2: Manual Start
```bash
# Start both frontend and backend with auto-reload:
npm run dev-full

# Or start them separately:
npm run dev          # Frontend only (http://localhost:5173)
npm run dev-backend  # Backend only (http://localhost:8000)
```

## 🔧 Available Commands

### Frontend Commands
- `npm run dev` - Start Vite dev server with auto-reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend Commands
- `npm run dev-backend` - Start backend with auto-reload
- `npm run dev-backend-reload` - Alternative backend start with explicit reload

### Combined Commands
- `npm run dev-full` - Start both frontend and backend concurrently
- `npm start` - Alias for dev-full

## 🔄 Auto-Reload Features

### Frontend (Vite)
- ✅ Hot Module Replacement (HMR)
- ✅ CSS hot reload
- ✅ Auto-restart on file changes
- ✅ Fast refresh for React components

### Backend (Uvicorn)
- ✅ Auto-restart on Python file changes
- ✅ Watches `backend/app/` directory
- ✅ Preserves server state during reload
- ✅ Detailed logging in development

## 🛠️ Development Workflow

1. **Start Development Environment**
   ```bash
   npm run dev-full
   ```

2. **Make Changes**
   - Edit frontend files in `src/` - changes appear instantly
   - Edit backend files in `backend/app/` - server auto-restarts

3. **Test Your Changes**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Health check: http://localhost:8000/api/health

4. **Stop Servers**
   - Press `Ctrl+C` in the terminal

## 🔍 Troubleshooting

### Backend Won't Start
```bash
# Check if you're in the right directory
ls package.json

# Check Python environment
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Won't Start
```bash
# Install dependencies
npm install

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
```bash
# Kill processes on port 8000
lsof -ti:8000 | xargs kill -9

# Kill processes on port 5173
lsof -ti:5173 | xargs kill -9
```

### Auto-Reload Not Working
```bash
# Check file permissions
chmod +x dev.sh

# Restart with explicit reload
npm run dev-backend-reload
```

## 📁 Project Structure
```
LivyFlow/
├── src/                 # Frontend React code
├── backend/
│   ├── app/            # Backend Python code
│   ├── run.py          # Backend startup script
│   └── requirements.txt
├── dev.sh              # Development startup (macOS/Linux)
├── dev.bat             # Development startup (Windows)
└── package.json        # Frontend dependencies & scripts
```

## 🎯 Tips for Efficient Development

1. **Use the dev.sh/dev.bat script** - It handles all setup automatically
2. **Keep both servers running** - Use `npm run dev-full` for concurrent development
3. **Check the logs** - Both servers provide detailed logging in development
4. **Use browser dev tools** - Network tab shows API calls to backend
5. **Test API endpoints** - Use http://localhost:8000/docs for FastAPI docs

## 🔗 Useful URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health
- **Plaid Test**: http://localhost:8000/api/v1/plaid/link-token/test 