import os
from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator, ConfigDict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # Allow extra fields to prevent validation errors from frontend env vars
    model_config = ConfigDict(extra='ignore')
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")  # Optional, already safe
    PORT: int = 8000  # Default value, will be validated by field_validator
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://livyflow.com",  # Production frontend domain
        "https://www.livyflow.com"  # Production frontend domain with www
    ]
    
    # Add additional production origins from environment variable if in production
    if ENVIRONMENT == "production":
        PRODUCTION_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
        if PRODUCTION_ORIGINS and PRODUCTION_ORIGINS[0]:
            ALLOWED_ORIGINS.extend([origin.strip() for origin in PRODUCTION_ORIGINS if origin.strip()])
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_CLIENT_ID: Optional[str] = None
    FIREBASE_AUTH_URI: str = "https://accounts.google.com/o/oauth2/auth"
    FIREBASE_TOKEN_URI: str = "https://oauth2.googleapis.com/token"
    FIREBASE_AUTH_PROVIDER_X509_CERT_URL: str = "https://www.googleapis.com/oauth2/v1/certs"
    FIREBASE_CLIENT_X509_CERT_URL: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: Optional[str] = None
    
    # Plaid Configuration - REQUIRED
    PLAID_CLIENT_ID: str
    PLAID_SECRET: str
    PLAID_ENV: str = "production"
    
    # Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@livyflow.com"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    @field_validator('PORT', mode='before')
    @classmethod
    def validate_port(cls, v: Union[str, int, None]) -> int:
        """Validate PORT field to handle empty strings and invalid integers."""
        if v is None:
            return 8000
        
        # Handle string values
        if isinstance(v, str):
            v = v.strip()
            if not v:  # Empty string
                return 8000
            try:
                port = int(v)
            except ValueError:
                print(f"⚠️  Invalid PORT value '{v}', defaulting to 8000")
                return 8000
        else:
            # Handle int values
            try:
                port = int(v)
            except (ValueError, TypeError):
                print(f"⚠️  Invalid PORT value '{v}', defaulting to 8000")
                return 8000
        
        # Validate port range
        if port < 1 or port > 65535:
            print(f"⚠️  PORT {port} out of range (1-65535), defaulting to 8000")
            return 8000
        
        return port
    
    @field_validator('PLAID_ENV')
    @classmethod
    def validate_plaid_env(cls, v: str) -> str:
        valid_envs = ['sandbox', 'development', 'production']
        if v not in valid_envs:
            raise ValueError(f'PLAID_ENV must be one of {valid_envs}, got {v}')
        return v
    
    @field_validator('PLAID_CLIENT_ID')
    @classmethod
    def validate_plaid_client_id(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError('PLAID_CLIENT_ID is required and cannot be empty')
        return v.strip()
    
    @field_validator('PLAID_SECRET')
    @classmethod
    def validate_plaid_secret(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError('PLAID_SECRET is required and cannot be empty')
        return v.strip()
    
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

# Create settings instance with validation
try:
    settings = Settings()
    print(f"✅ Configuration loaded successfully")
    print(f"🌍 Environment: {settings.ENVIRONMENT}")
    print(f"🔒 Plaid Environment: {settings.PLAID_ENV}")
    print(f"🆔 Plaid Client ID: {settings.PLAID_CLIENT_ID[:8]}...")
    print(f"🔑 Plaid Secret: {settings.PLAID_SECRET[:8]}...")
    print(f"🚀 Running on {settings.HOST}:{settings.PORT}")
except Exception as e:
    print(f"❌ Configuration error: {e}")
    raise 