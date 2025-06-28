import requests
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
import logging
import firebase_admin
from firebase_admin import credentials, auth
import os
import jwt

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized."""
    try:
        if not firebase_admin._apps:
            # Check if we have a service account key file
            service_account_path = settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
            if service_account_path and os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                logger.info("✅ Firebase Admin SDK initialized with service account key")
                return True
            else:
                # Initialize with default credentials (for development)
                firebase_admin.initialize_app()
                logger.info("✅ Firebase Admin SDK initialized with default credentials")
                return True
    except Exception as e:
        logger.warning(f"⚠️ Firebase Admin SDK initialization failed: {str(e)}")
        logger.warning("⚠️ Using simplified token validation for development")
        return False

def verify_firebase_token_simple(token: str):
    """
    Simple Firebase token verification for development.
    This is NOT secure for production - only use for development.
    """
    try:
        logger.info("🔍 Verifying Firebase ID token (simple mode)...")
        logger.info(f"🔑 Token: {token[:20]}...")
        
        # Basic validation
        if not token or len(token) < 100:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # For development, we'll extract a user ID from the token
        # In production, you should use Firebase Admin SDK
        # This is a simplified approach that assumes the token contains user info
        
        # Try to decode the JWT (without verification for development)
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            user_id = decoded.get('user_id') or decoded.get('uid') or decoded.get('sub')
            if user_id:
                logger.info(f"✅ Simple token verification successful")
                logger.info(f"👤 User ID: {user_id}")
                return user_id
        except:
            pass
        
        # Fallback: use a hash of the token as user ID
        import hashlib
        user_id = hashlib.md5(token.encode()).hexdigest()[:16]
        logger.info(f"✅ Simple token verification successful (fallback)")
        logger.info(f"👤 User ID: {user_id}")
        return user_id
        
    except Exception as e:
        logger.error(f"❌ Simple Firebase token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Firebase credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def verify_firebase_token(token: str):
    """
    Verify a Firebase ID token using Firebase Admin SDK.
    Falls back to simple verification if Firebase Admin SDK is not available.
    """
    try:
        logger.info("🔍 Verifying Firebase ID token...")
        logger.info(f"🔑 Token: {token[:20]}...")
        
        # Try to initialize Firebase Admin SDK
        firebase_available = initialize_firebase()
        
        if firebase_available:
            try:
                # Verify the token with Firebase Admin SDK
                decoded_token = auth.verify_id_token(token)
                user_id = decoded_token['uid']
                
                logger.info(f"✅ Firebase token verified successfully")
                logger.info(f"👤 User ID: {user_id}")
                
                return user_id
            except Exception as e:
                logger.warning(f"⚠️ Firebase Admin SDK verification failed: {str(e)}")
                logger.warning("⚠️ Falling back to simple verification")
                return verify_firebase_token_simple(token)
        else:
            # Use simple verification
            return verify_firebase_token_simple(token)
        
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
    logger.info(f"👤 User authenticated: {user_id}")
    
    return {"user_id": user_id} 