from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging
from app.auth import get_current_user
from app.plaid_client import create_link_token, exchange_public_token, get_transactions
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LivyFlow API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PublicTokenRequest(BaseModel):
    public_token: str

@app.get("/")
async def root():
    return {"message": "LivyFlow API is running"}

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify backend is running.
    No authentication required.
    """
    logger.info("🏥 Health check requested")
    return {
        "status": "healthy",
        "message": "LivyFlow API is running",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.get("/api/v1/plaid/link-token")
async def create_plaid_link_token(current_user: dict = Depends(get_current_user)):
    """
    Create a Plaid link token for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Creating Plaid link token")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        logger.info("🌐 Calling Plaid API to create link token...")
        link_token = create_link_token(user_id)
        
        logger.info("✅ Link token created successfully")
        logger.info(f"🔗 Link token: {link_token[:20]}...")
        
        return {
            "link_token": link_token,
            "user_id": user_id
        }
    except ValueError as e:
        logger.error(f"❌ Configuration error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Plaid configuration error: {str(e)}. Please check environment variables."
        )
    except Exception as e:
        logger.error(f"❌ Failed to create Plaid link token: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Plaid link token: {str(e)}"
        )

@app.post("/api/v1/plaid/exchange-token")
async def exchange_plaid_token(
    request: PublicTokenRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Exchange a public token for an access token.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Exchanging Plaid public token")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"🔑 Public token: {request.public_token[:20]}...")
    
    try:
        user_id = current_user["user_id"]
        
        # In a real application, you would validate that this access_token
        # belongs to the authenticated user by checking your database
        
        logger.info("🌐 Calling Plaid API to exchange public token...")
        result = exchange_public_token(request.public_token, user_id)
        
        logger.info("✅ Public token exchanged successfully")
        logger.info(f"🔑 Access token: {result.access_token[:20]}...")
        logger.info(f"🆔 Item ID: {result.item_id}")
        
        # In a real application, you would store the access_token and item_id
        # in your database associated with the user_id
        logger.info("💾 Ready to save access token to database")
        
        return {
            "access_token": result.access_token,
            "item_id": result.item_id,
            "user_id": user_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to exchange public token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to exchange public token: {str(e)}"
        )

@app.get("/api/v1/plaid/transactions")
async def get_plaid_transactions(
    access_token: str = Query(..., description="Plaid access token"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    count: Optional[int] = Query(100, description="Number of transactions to return"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get recent transactions from Plaid using the stored access token.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching Plaid transactions")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"🔑 Access token: {access_token[:20]}...")
    logger.info(f"📅 Date range: {start_date} to {end_date}")
    logger.info(f"📊 Count: {count}")
    
    try:
        user_id = current_user["user_id"]
        
        # In a real application, you would validate that this access_token
        # belongs to the authenticated user by checking your database
        
        logger.info("🌐 Calling Plaid API to get transactions...")
        result = get_transactions(access_token, start_date, end_date, count)
        
        logger.info("✅ Transactions fetched successfully")
        logger.info(f"💰 Transaction count: {len(result.transactions)}")
        logger.info(f"📊 Total transactions: {result.total_transactions}")
        logger.info(f"🆔 Request ID: {result.request_id}")
        
        return {
            "transactions": result.transactions,
            "total_transactions": result.total_transactions,
            "request_id": result.request_id,
            "user_id": user_id
        }
    except Exception as e:
        logger.error(f"❌ Failed to get transactions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get transactions: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 