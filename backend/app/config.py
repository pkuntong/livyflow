import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Plaid Configuration
    PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
    PLAID_SECRET = os.getenv("PLAID_SECRET")
    PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")  # sandbox, development, or production
    
    # Firebase Configuration (for future use with Firebase Admin SDK)
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")

settings = Settings() 