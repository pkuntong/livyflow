#!/usr/bin/env python3
"""
Run script for LivyFlow backend
"""
import uvicorn
from app.main import app
from app.config import settings
import logging

if __name__ == "__main__":
    # Configure logging for the server
    logging.basicConfig(
        level=logging.INFO if not settings.is_production() else logging.WARNING,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    
    if settings.is_production():
        logger.info(f"🚀 Starting LivyFlow API in PRODUCTION mode")
        logger.info(f"🌐 Server: {settings.HOST}:{settings.PORT}")
    else:
        logger.info(f"🚀 Starting LivyFlow API in DEVELOPMENT mode")
        logger.info(f"🌐 Server: {settings.HOST}:{settings.PORT}")
        logger.info(f"🔗 Health check: http://{settings.HOST}:{settings.PORT}/api/health")
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=not settings.is_production(),
        log_level="info" if not settings.is_production() else "warning"
    ) 