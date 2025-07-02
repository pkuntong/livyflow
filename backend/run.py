#!/usr/bin/env python3
"""
Run script for LivyFlow backend with auto-reload for development
"""
import uvicorn
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from app.main import app
    from app.config import settings
    import logging
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure you're running this from the project root directory")
    print("💡 Try: npm run dev-backend")
    sys.exit(1)

if __name__ == "__main__":
    # Configure logging for the server
    logging.basicConfig(
        level=logging.INFO if not settings.is_production() else logging.WARNING,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    
    # Check if we're in development mode
    is_dev = not settings.is_production()
    
    if is_dev:
        logger.info(f"🚀 Starting LivyFlow API in DEVELOPMENT mode")
        logger.info(f"🌐 Server: {settings.HOST}:{settings.PORT}")
        logger.info(f"🔗 Health check: http://{settings.HOST}:{settings.PORT}/api/health")
        logger.info(f"🔄 Auto-reload: ENABLED")
        logger.info(f"📁 Watching for changes in: {backend_dir}/app")
    else:
        logger.info(f"🚀 Starting LivyFlow API in PRODUCTION mode")
        logger.info(f"🌐 Server: {settings.HOST}:{settings.PORT}")
    
    try:
        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=is_dev,
            reload_dirs=[str(backend_dir / "app")] if is_dev else None,
            log_level="info" if is_dev else "warning",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Server failed to start: {e}")
        sys.exit(1) 