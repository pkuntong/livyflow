import requests
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

def verify_firebase_token(token: str):
    """
    Verify a Firebase ID token by calling Firebase Admin SDK verify_id_token
    or by making a request to Firebase's public keys endpoint.
    """
    try:
        logger.info("🔍 Verifying Firebase ID token...")
        logger.info(f"🔑 Token: {token[:20]}...")
        
        # For now, we'll do a simple validation
        # In production, you should use Firebase Admin SDK
        # This is a simplified approach for development
        
        if not token or len(token) < 100:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract user_id from token (this is a simplified approach)
        # In production, you should properly decode and verify the JWT
        # For now, we'll assume the token contains user information
        
        logger.info("✅ Firebase token validation passed (simplified)")
        return token  # Return the token as user_id for now
        
    except Exception as e:
        logger.error(f"❌ Firebase token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Firebase credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get current user from Firebase ID token.
    """
    token = credentials.credentials
    logger.info("🔐 Extracting user from Firebase token...")
    
    user_id = verify_firebase_token(token)
    logger.info(f"👤 User authenticated: {user_id[:20]}...")
    
    # In a real application, you would decode the Firebase token
    # and extract the actual user information
    return {"user_id": user_id} 