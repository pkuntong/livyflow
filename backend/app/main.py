from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging
from app.auth import get_current_user
from app.plaid_client import create_link_token, exchange_public_token, get_transactions, get_accounts, store_access_token, get_access_token_for_user
from app.config import settings
from datetime import datetime, timedelta
from fastapi.responses import JSONResponse, FileResponse
import csv
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import tempfile
import os
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for budgets (in production, use a database)
budgets_storage = {}

# Notification models
class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str  # 'info', 'warning', 'success'
    budget_id: Optional[str] = None

class Notification(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    budget_id: Optional[str] = None
    created_at: str
    read: bool = False

# In-memory storage for notifications (in production, use a database)
notifications_storage = {}

# Insight models
class Insight(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    type: str  # 'spending', 'savings', 'subscription', 'pattern'
    category: Optional[str] = None
    amount: Optional[float] = None
    created_at: str

# In-memory storage for insights (in production, use a database)
insights_storage = {}

# Budget models
class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float
    description: Optional[str] = None

class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    monthly_limit: Optional[float] = None
    description: Optional[str] = None

class Budget(BaseModel):
    id: str
    user_id: str
    category: str
    monthly_limit: float
    description: Optional[str] = None
    created_at: str
    updated_at: str
    actual_spent: float = 0.0
    remaining: float = 0.0
    percentage_used: float = 0.0

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
        
        logger.info("🌐 Calling Plaid API to exchange public token...")
        result = exchange_public_token(request.public_token, user_id)
        
        logger.info("✅ Public token exchanged successfully")
        logger.info(f"🔑 Access token: {result.access_token[:20]}...")
        logger.info(f"🆔 Item ID: {result.item_id}")
        
        # Store the access_token and item_id in database associated with the user_id
        # In a real application, you would use a proper database like PostgreSQL, MongoDB, etc.
        # For now, we'll log the storage action
        logger.info("💾 Storing access token in database")
        logger.info(f"   - User ID: {user_id}")
        logger.info(f"   - Access Token: {result.access_token[:20]}...")
        logger.info(f"   - Item ID: {result.item_id}")
        logger.info(f"   - Timestamp: {datetime.now().isoformat()}")
        
        # Store the access token (in-memory for development)
        store_access_token(user_id, result.access_token, result.item_id)
        
        # TODO: Implement actual database storage
        # Example database storage (pseudo-code):
        # await db.plaid_connections.create({
        #     user_id: user_id,
        #     access_token: result.access_token,
        #     item_id: result.item_id,
        #     created_at: datetime.now(),
        #     institution_name: metadata.institution?.name if available
        # })
        
        return {
            "access_token": result.access_token,
            "item_id": result.item_id,
            "user_id": user_id,
            "stored": True,
            "message": "Access token stored successfully"
        }
    except Exception as e:
        logger.error(f"❌ Failed to exchange public token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to exchange public token: {str(e)}"
        )

@app.get("/api/v1/plaid/accounts")
async def get_plaid_accounts(current_user: dict = Depends(get_current_user)):
    """
    Get bank accounts from Plaid using the stored access token.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching Plaid accounts")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get the access token for this user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.error(f"❌ No access token found for user: {user_id}")
            raise HTTPException(
                status_code=400,
                detail="No bank account connected. Please connect your bank account first."
            )
        
        logger.info(f"🔑 Access token found: {access_token[:20]}...")
        logger.info("🌐 Calling Plaid API to get accounts...")
        result = get_accounts(access_token)
        
        logger.info("✅ Accounts fetched successfully")
        logger.info(f"🏦 Account count: {len(result.accounts)}")
        
        # Convert accounts to JSON-serializable format
        accounts_data = []
        for account in result.accounts:
            account_data = {
                "account_id": account.account_id,
                "name": account.name,
                "type": account.type,
                "subtype": account.subtype,
                "mask": account.mask,
                "balances": {
                    "available": account.balances.available,
                    "current": account.balances.current,
                    "limit": account.balances.limit,
                    "iso_currency_code": account.balances.iso_currency_code,
                    "unofficial_currency_code": account.balances.unofficial_currency_code
                }
            }
            accounts_data.append(account_data)
        
        return {
            "accounts": accounts_data,
            "item": {
                "item_id": result.item.item_id,
                "institution_id": result.item.institution_id
            },
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get accounts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get accounts: {str(e)}"
        )

@app.get("/api/v1/plaid/transactions")
async def get_plaid_transactions(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    count: Optional[int] = Query(100, description="Number of transactions to return"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get transactions from Plaid using the stored access token.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching Plaid transactions")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"📅 Date range: {start_date} to {end_date}")
    logger.info(f"📊 Count: {count}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get the access token for this user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.error(f"❌ No access token found for user: {user_id}")
            raise HTTPException(
                status_code=400,
                detail="No bank account connected. Please connect your bank account first."
            )
        
        logger.info(f"🔑 Access token found: {access_token[:20]}...")
        logger.info("🌐 Calling Plaid API to get transactions...")
        result = get_transactions(access_token, start_date, end_date, count)
        
        logger.info("✅ Transactions fetched successfully")
        logger.info(f"💰 Transaction count: {len(result.transactions)}")
        logger.info(f"📊 Total transactions: {result.total_transactions}")
        
        # Convert transactions to JSON-serializable format
        transactions_data = []
        for transaction in result.transactions:
            transaction_data = {
                "transaction_id": transaction.transaction_id,
                "account_id": transaction.account_id,
                "name": transaction.name,
                "amount": transaction.amount,
                "date": transaction.date,
                "category": transaction.category,
                "merchant_name": transaction.merchant_name,
                "payment_channel": transaction.payment_channel,
                "pending": transaction.pending,
                "personal_finance_category": {
                    "primary": transaction.personal_finance_category.primary,
                    "detailed": transaction.personal_finance_category.detailed
                } if transaction.personal_finance_category else None
            }
            transactions_data.append(transaction_data)
        
        return {
            "transactions": transactions_data,
            "total_transactions": result.total_transactions,
            "request_id": result.request_id,
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get transactions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get transactions: {str(e)}"
        )

@app.get("/api/v1/alerts")
async def get_user_alerts(current_user: dict = Depends(get_current_user)):
    """
    Get financial alerts for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching user alerts")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        alerts = []
        
        # Get the access token for this user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.info(f"ℹ️ No access token found for user: {user_id} - no alerts to generate")
            return {
                "alerts": [],
                "user_id": user_id,
                "message": "No bank account connected"
            }
        
        logger.info(f"🔑 Access token found: {access_token[:20]}...")
        
        # 1. Check for low balance accounts
        logger.info("🔍 Checking for low balance accounts...")
        try:
            accounts_result = get_accounts(access_token)
            for account in accounts_result.accounts:
                if account.balances.current and account.balances.current < 100:
                    alerts.append({
                        "id": f"low_balance_{account.account_id}",
                        "type": "warning",
                        "title": "Low Balance Alert",
                        "message": f"Low balance on {account.name}: ${account.balances.current:.2f}",
                        "account_id": account.account_id,
                        "account_name": account.name,
                        "balance": account.balances.current,
                        "timestamp": datetime.now().isoformat(),
                        "category": "balance"
                    })
                    logger.info(f"⚠️ Low balance alert for {account.name}: ${account.balances.current}")
        except Exception as e:
            logger.warning(f"⚠️ Could not check account balances: {str(e)}")
        
        # 2. Check for large transactions (over $500)
        logger.info("🔍 Checking for large transactions...")
        try:
            # Get transactions from the last 7 days
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            transactions_result = get_transactions(
                access_token, 
                start_date.strftime('%Y-%m-%d'), 
                end_date.strftime('%Y-%m-%d'), 
                100
            )
            
            for transaction in transactions_result.transactions:
                if abs(transaction.amount) > 500:
                    alerts.append({
                        "id": f"large_transaction_{transaction.transaction_id}",
                        "type": "info",
                        "title": "Large Transaction",
                        "message": f"Large transaction: {transaction.name} - ${abs(transaction.amount):.2f}",
                        "transaction_id": transaction.transaction_id,
                        "transaction_name": transaction.name,
                        "amount": transaction.amount,
                        "date": transaction.date,
                        "timestamp": datetime.now().isoformat(),
                        "category": "transaction"
                    })
                    logger.info(f"💡 Large transaction alert: {transaction.name} - ${abs(transaction.amount)}")
        except Exception as e:
            logger.warning(f"⚠️ Could not check for large transactions: {str(e)}")
        
        # 3. Check for budget alerts (this would require budget data from frontend)
        # For now, we'll add a placeholder for budget alerts
        logger.info("🔍 Checking for budget alerts...")
        # TODO: Implement budget alert checking when budget data is available
        
        logger.info(f"✅ Generated {len(alerts)} alerts for user {user_id}")
        
        return {
            "alerts": alerts,
            "user_id": user_id,
            "count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get alerts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get alerts: {str(e)}"
        )

@app.get("/api/v1/export/transactions")
async def export_transactions(
    format: str = Query(..., description="Export format: csv or pdf"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    count: Optional[int] = Query(100, description="Number of transactions to return"),
    current_user: dict = Depends(get_current_user)
):
    """
    Export transactions in CSV or PDF format.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Exporting transactions in {format.upper()} format")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"📅 Date range: {start_date} to {end_date}")
    logger.info(f"📊 Count: {count}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get the access token for this user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.error(f"❌ No access token found for user: {user_id}")
            raise HTTPException(
                status_code=400,
                detail="No bank account connected. Please connect your bank account first."
            )
        
        logger.info(f"🔑 Access token found: {access_token[:20]}...")
        logger.info("🌐 Calling Plaid API to get transactions...")
        result = get_transactions(access_token, start_date, end_date, count)
        
        logger.info("✅ Transactions fetched successfully")
        logger.info(f"💰 Transaction count: {len(result.transactions)}")
        logger.info(f"📊 Total transactions: {result.total_transactions}")
        
        if format.lower() == 'csv':
            return await generate_csv_export(result.transactions, user_id)
        elif format.lower() == 'pdf':
            return await generate_pdf_export(result.transactions, user_id)
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid format. Use 'csv' or 'pdf'"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to export transactions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export transactions: {str(e)}"
        )

async def generate_csv_export(transactions, user_id):
    """Generate CSV export of transactions"""
    csv_data = io.StringIO()
    csv_writer = csv.writer(csv_data)
    
    # Write header
    csv_writer.writerow([
        "Transaction ID", "Account ID", "Name", "Amount", "Date", 
        "Category", "Merchant Name", "Payment Channel", "Pending", 
        "Primary Category", "Detailed Category"
    ])
    
    # Write transaction data
    for transaction in transactions:
        csv_writer.writerow([
            transaction.transaction_id,
            transaction.account_id,
            transaction.name,
            f"${transaction.amount:.2f}",
            transaction.date,
            ", ".join(transaction.category) if transaction.category else "",
            transaction.merchant_name or "",
            transaction.payment_channel or "",
            "Yes" if transaction.pending else "No",
            transaction.personal_finance_category.primary if transaction.personal_finance_category else "",
            transaction.personal_finance_category.detailed if transaction.personal_finance_category else ""
        ])
    
    csv_data.seek(0)
    
    return FileResponse(
        io.BytesIO(csv_data.getvalue().encode('utf-8')),
        filename=f"livyflow_transactions_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=livyflow_transactions_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

async def generate_pdf_export(transactions, user_id):
    """Generate PDF export of transactions"""
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        doc = SimpleDocTemplate(tmp_file.name, pagesize=A4)
        elements = []
        
        # Add title
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        title = Paragraph("LivyFlow Transaction Report", title_style)
        elements.append(title)
        
        # Add report info
        info_style = ParagraphStyle(
            'Info',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=20,
            alignment=TA_LEFT
        )
        info_text = f"""
        Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        Total Transactions: {len(transactions)}<br/>
        User ID: {user_id}
        """
        info = Paragraph(info_text, info_style)
        elements.append(info)
        elements.append(Spacer(1, 20))
        
        # Prepare table data
        table_data = [["Date", "Name", "Amount", "Category", "Merchant", "Status"]]
        
        for transaction in transactions:
            amount_str = f"${transaction.amount:.2f}"
            if transaction.amount < 0:
                amount_str = f"-${abs(transaction.amount):.2f}"
            
            category_str = transaction.personal_finance_category.primary if transaction.personal_finance_category else "Uncategorized"
            merchant_str = transaction.merchant_name or "N/A"
            status_str = "Pending" if transaction.pending else "Completed"
            
            table_data.append([
                transaction.date,
                transaction.name[:30] + "..." if len(transaction.name) > 30 else transaction.name,
                amount_str,
                category_str,
                merchant_str[:20] + "..." if len(merchant_str) > 20 else merchant_str,
                status_str
            ])
        
        # Create table
        table = Table(table_data, repeatRows=1)
        
        # Style the table
        table_style = TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows styling
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),  # Amount column right-aligned
            ('ALIGN', (5, 1), (5, -1), 'CENTER'),  # Status column center-aligned
            
            # Grid styling
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            
            # Column widths
            ('COLWIDTH', (0, 0), (0, -1), 60),  # Date
            ('COLWIDTH', (1, 0), (1, -1), 120),  # Name
            ('COLWIDTH', (2, 0), (2, -1), 60),   # Amount
            ('COLWIDTH', (3, 0), (3, -1), 80),   # Category
            ('COLWIDTH', (4, 0), (4, -1), 80),   # Merchant
            ('COLWIDTH', (5, 0), (5, -1), 60),   # Status
        ])
        
        table.setStyle(table_style)
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        
        # Read the file and return it
        with open(tmp_file.name, 'rb') as f:
            pdf_content = f.read()
        
        # Clean up temporary file
        os.unlink(tmp_file.name)
        
        return FileResponse(
            io.BytesIO(pdf_content),
            filename=f"livyflow_transactions_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=livyflow_transactions_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
        )

# Helper functions for budget management
def generate_budget_id():
    """Generate a unique budget ID"""
    return f"budget_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

def get_user_budgets(user_id: str) -> List[dict]:
    """Get all budgets for a user"""
    return budgets_storage.get(user_id, [])

def save_user_budgets(user_id: str, budgets: List[dict]):
    """Save budgets for a user"""
    budgets_storage[user_id] = budgets

def calculate_category_spending(user_id: str, category: str, month: str = None) -> float:
    """Calculate actual spending for a category in a given month"""
    try:
        # Get the access token for this user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return 0.0
        
        # If no month specified, use current month
        if not month:
            month = datetime.now().strftime('%Y-%m')
        
        # Calculate start and end dates for the month
        start_date = f"{month}-01"
        if month == datetime.now().strftime('%Y-%m'):
            end_date = datetime.now().strftime('%Y-%m-%d')
        else:
            # Get last day of the month
            next_month = datetime.strptime(f"{month}-01", '%Y-%m-%d') + timedelta(days=32)
            last_day = (next_month.replace(day=1) - timedelta(days=1)).day
            end_date = f"{month}-{last_day:02d}"
        
        logger.info(f"💰 Calculating spending for category '{category}' in {month}")
        logger.info(f"📅 Date range: {start_date} to {end_date}")
        
        # Get transactions for the month
        result = get_transactions(access_token, start_date, end_date, 1000)
        
        # Calculate total spending for the category
        total_spent = 0.0
        for transaction in result.transactions:
            # Check if transaction matches the category
            if transaction.personal_finance_category:
                primary_category = transaction.personal_finance_category.primary.lower()
                detailed_category = transaction.personal_finance_category.detailed.lower()
                category_lower = category.lower()
                
                # Match by primary or detailed category
                if (category_lower in primary_category or 
                    category_lower in detailed_category or
                    primary_category in category_lower or
                    detailed_category in category_lower):
                    # Only count negative amounts (spending)
                    if transaction.amount < 0:
                        total_spent += abs(transaction.amount)
        
        logger.info(f"✅ Total spent for '{category}' in {month}: ${total_spent:.2f}")
        return total_spent
        
    except Exception as e:
        logger.error(f"❌ Error calculating spending for category '{category}': {str(e)}")
        return 0.0

def update_budget_with_spending(budget: dict, user_id: str) -> dict:
    """Update budget with actual spending data"""
    try:
        # Calculate actual spending for the current month
        current_month = datetime.now().strftime('%Y-%m')
        actual_spent = calculate_category_spending(user_id, budget['category'], current_month)
        
        # Calculate remaining and percentage
        remaining = budget['monthly_limit'] - actual_spent
        percentage_used = (actual_spent / budget['monthly_limit']) * 100 if budget['monthly_limit'] > 0 else 0
        
        # Update budget with spending data
        budget['actual_spent'] = round(actual_spent, 2)
        budget['remaining'] = round(remaining, 2)
        budget['percentage_used'] = round(percentage_used, 1)
        
        return budget
    except Exception as e:
        logger.error(f"❌ Error updating budget with spending: {str(e)}")
        return budget

@app.post("/api/v1/budgets")
async def create_budget(
    budget_data: BudgetCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new budget for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Creating new budget")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"📊 Budget data: {budget_data}")
    
    try:
        user_id = current_user["user_id"]
        
        # Generate budget ID and timestamps
        budget_id = generate_budget_id()
        now = datetime.now().isoformat()
        
        # Create budget object
        budget = {
            "id": budget_id,
            "user_id": user_id,
            "category": budget_data.category,
            "monthly_limit": budget_data.monthly_limit,
            "description": budget_data.description,
            "created_at": now,
            "updated_at": now,
            "actual_spent": 0.0,
            "remaining": budget_data.monthly_limit,
            "percentage_used": 0.0
        }
        
        # Get existing budgets for user
        user_budgets = get_user_budgets(user_id)
        
        # Check if budget already exists for this category
        existing_budget = next((b for b in user_budgets if b['category'].lower() == budget_data.category.lower()), None)
        if existing_budget:
            raise HTTPException(
                status_code=400,
                detail=f"Budget already exists for category: {budget_data.category}"
            )
        
        # Add new budget
        user_budgets.append(budget)
        save_user_budgets(user_id, user_budgets)
        
        # Update budget with actual spending data
        updated_budget = update_budget_with_spending(budget, user_id)
        
        logger.info(f"✅ Budget created successfully: {budget_id}")
        
        # Create welcome notification for new budget
        create_notification(
            user_id=user_id,
            title=f"New Budget Created: {budget_data.category}",
            message=f"Your {budget_data.category} budget has been set to ${budget_data.monthly_limit:.2f} per month. Track your spending to stay on target!",
            notification_type="info",
            budget_id=budget_id
        )
        
        return {
            "message": "Budget created successfully",
            "budget": updated_budget
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create budget: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create budget: {str(e)}"
        )

@app.get("/api/v1/budgets")
async def get_budgets(current_user: dict = Depends(get_current_user)):
    """
    Get all budgets for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching user budgets")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get budgets for user
        user_budgets = get_user_budgets(user_id)
        
        # Update each budget with actual spending data
        updated_budgets = []
        for budget in user_budgets:
            updated_budget = update_budget_with_spending(budget, user_id)
            updated_budgets.append(updated_budget)
        
        logger.info(f"✅ Retrieved {len(updated_budgets)} budgets for user {user_id}")
        
        return {
            "budgets": updated_budgets,
            "count": len(updated_budgets),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get budgets: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get budgets: {str(e)}"
        )

@app.put("/api/v1/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    budget_data: BudgetUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing budget for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Updating budget: {budget_id}")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"📊 Update data: {budget_data}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get budgets for user
        user_budgets = get_user_budgets(user_id)
        
        # Find the budget to update
        budget_index = next((i for i, b in enumerate(user_budgets) if b['id'] == budget_id), None)
        if budget_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Budget not found: {budget_id}"
            )
        
        # Check if user owns this budget
        if user_budgets[budget_index]['user_id'] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only update your own budgets"
            )
        
        # Update budget fields
        budget = user_budgets[budget_index]
        if budget_data.category is not None:
            # Check if new category already exists (excluding current budget)
            existing_budget = next((b for b in user_budgets 
                                  if b['id'] != budget_id and 
                                  b['category'].lower() == budget_data.category.lower()), None)
            if existing_budget:
                raise HTTPException(
                    status_code=400,
                    detail=f"Budget already exists for category: {budget_data.category}"
                )
            budget['category'] = budget_data.category
        
        if budget_data.monthly_limit is not None:
            budget['monthly_limit'] = budget_data.monthly_limit
        
        if budget_data.description is not None:
            budget['description'] = budget_data.description
        
        budget['updated_at'] = datetime.now().isoformat()
        
        # Save updated budgets
        save_user_budgets(user_id, user_budgets)
        
        # Update budget with actual spending data
        updated_budget = update_budget_with_spending(budget, user_id)
        
        logger.info(f"✅ Budget updated successfully: {budget_id}")
        
        return {
            "message": "Budget updated successfully",
            "budget": updated_budget
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update budget: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update budget: {str(e)}"
        )

@app.delete("/api/v1/budgets/{budget_id}")
async def delete_budget(
    budget_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a budget for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Deleting budget: {budget_id}")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get budgets for user
        user_budgets = get_user_budgets(user_id)
        
        # Find the budget to delete
        budget_index = next((i for i, b in enumerate(user_budgets) if b['id'] == budget_id), None)
        if budget_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Budget not found: {budget_id}"
            )
        
        # Check if user owns this budget
        if user_budgets[budget_index]['user_id'] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only delete your own budgets"
            )
        
        # Remove budget
        deleted_budget = user_budgets.pop(budget_index)
        save_user_budgets(user_id, user_budgets)
        
        logger.info(f"✅ Budget deleted successfully: {budget_id}")
        logger.info(f"🗑️ Deleted budget category: {deleted_budget['category']}")
        
        return {
            "message": "Budget deleted successfully",
            "deleted_budget": deleted_budget
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete budget: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete budget: {str(e)}"
        )

@app.get("/api/v1/budgets/spending-summary")
async def get_spending_summary(current_user: dict = Depends(get_current_user)):
    """
    Get spending summary for budget categories.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching spending summary")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get budgets for user
        user_budgets = get_user_budgets(user_id)
        
        # Calculate spending summary
        total_budget = sum(budget['monthly_limit'] for budget in user_budgets)
        total_spent = 0.0
        category_spending = []
        
        for budget in user_budgets:
            updated_budget = update_budget_with_spending(budget, user_id)
            total_spent += updated_budget['actual_spent']
            
            category_spending.append({
                "category": updated_budget['category'],
                "budget": updated_budget['monthly_limit'],
                "spent": updated_budget['actual_spent'],
                "remaining": updated_budget['remaining'],
                "percentage": updated_budget['percentage_used']
            })
        
        total_remaining = total_budget - total_spent
        overall_percentage = (total_spent / total_budget * 100) if total_budget > 0 else 0
        
        logger.info(f"✅ Spending summary calculated")
        logger.info(f"💰 Total budget: ${total_budget:.2f}")
        logger.info(f"💸 Total spent: ${total_spent:.2f}")
        logger.info(f"📊 Overall percentage: {overall_percentage:.1f}%")
        
        return {
            "summary": {
                "total_budget": round(total_budget, 2),
                "total_spent": round(total_spent, 2),
                "total_remaining": round(total_remaining, 2),
                "overall_percentage": round(overall_percentage, 1)
            },
            "category_spending": category_spending,
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get spending summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get spending summary: {str(e)}"
        )

@app.get("/api/v1/budgets/suggestions")
async def get_budget_suggestions(current_user: dict = Depends(get_current_user)):
    """
    Get smart budget suggestions based on spending patterns.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Generating budget suggestions")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get user's transactions
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.info(f"ℹ️ No access token found for user: {user_id} - no suggestions to generate")
            return {
                "suggestions": [],
                "message": "Connect your bank account to get personalized budget suggestions",
                "user_id": user_id
            }
        
        # Get transactions from the last 3 months
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=90)
        
        try:
            transactions_response = get_transactions(access_token, start_date, end_date, 1000)
            transactions = transactions_response.get('transactions', [])
        except Exception as e:
            logger.error(f"❌ Error fetching transactions for budget suggestions: {str(e)}")
            return {
                "suggestions": [],
                "message": "Unable to fetch transaction data for suggestions",
                "user_id": user_id
            }
        
        if not transactions:
            logger.info(f"ℹ️ No transactions found for user: {user_id} - no suggestions to generate")
            return {
                "suggestions": [],
                "message": "No transaction data available for budget suggestions",
                "user_id": user_id
            }
        
        # Analyze spending by category
        category_spending = {}
        category_transactions = {}
        
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') > 0:  # Only spending transactions
                category = transaction.get('category', ['Other'])[0] if transaction.get('category') else 'Other'
                
                if category not in category_spending:
                    category_spending[category] = []
                    category_transactions[category] = []
                
                category_spending[category].append(abs(transaction['amount']))
                category_transactions[category].append(transaction)
        
        suggestions = []
        
        for category, amounts in category_spending.items():
            if len(amounts) < 2:  # Skip categories with less than 2 transactions
                continue
            
            # Calculate statistics
            total_spent = sum(amounts)
            avg_monthly = total_spent / 3  # Average over 3 months
            median_amount = sorted(amounts)[len(amounts) // 2]
            
            # Detect outliers (transactions > 2x median)
            outliers = [amount for amount in amounts if amount > median_amount * 2]
            outlier_percentage = len(outliers) / len(amounts) * 100
            
            # Calculate suggested budget
            # Base: Average monthly spending
            # Adjust for outliers: if >20% are outliers, use 75th percentile instead
            if outlier_percentage > 20:
                # Use 75th percentile to account for occasional high spending
                sorted_amounts = sorted(amounts)
                percentile_75 = sorted_amounts[int(len(sorted_amounts) * 0.75)]
                suggested_budget = percentile_75
            else:
                # Use average monthly spending
                suggested_budget = avg_monthly
            
            # Round to nearest $10
            suggested_budget = round(suggested_budget / 10) * 10
            
            # Only suggest if spending is significant (>$50 total over 3 months)
            if total_spent > 50:
                # Determine confidence level
                if len(amounts) >= 10:
                    confidence = "high"
                elif len(amounts) >= 5:
                    confidence = "medium"
                else:
                    confidence = "low"
                
                # Generate insight message
                if outlier_percentage > 20:
                    insight = f"Based on {len(amounts)} transactions. {outlier_percentage:.0f}% were high-value purchases, so we've adjusted the suggestion to account for occasional spikes."
                else:
                    insight = f"Based on {len(amounts)} transactions over 3 months. Spending is relatively consistent."
                
                suggestions.append({
                    "category": category,
                    "category_display": category.replace('_', ' ').title(),
                    "suggested_budget": suggested_budget,
                    "avg_monthly_spending": round(avg_monthly, 2),
                    "total_spent_3months": round(total_spent, 2),
                    "transaction_count": len(amounts),
                    "outlier_percentage": round(outlier_percentage, 1),
                    "confidence": confidence,
                    "insight": insight,
                    "last_transaction_date": max(t.get('date', '') for t in category_transactions[category])
                })
        
        # Sort by suggested budget (highest first)
        suggestions.sort(key=lambda x: x['suggested_budget'], reverse=True)
        
        logger.info(f"✅ Generated {len(suggestions)} budget suggestions for user {user_id}")
        
        return {
            "suggestions": suggestions,
            "count": len(suggestions),
            "analysis_period": "3 months",
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get budget suggestions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get budget suggestions: {str(e)}"
        )

# Helper functions for notification management
def generate_notification_id():
    """Generate a unique notification ID"""
    return f"notification_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

def get_user_notifications(user_id: str) -> List[dict]:
    """Get all notifications for a user"""
    return notifications_storage.get(user_id, [])

def save_user_notifications(user_id: str, notifications: List[dict]):
    """Save notifications for a user"""
    notifications_storage[user_id] = notifications

def create_notification(user_id: str, title: str, message: str, notification_type: str, budget_id: str = None):
    """Create a new notification for a user"""
    notification_id = generate_notification_id()
    now = datetime.now().isoformat()
    
    notification = {
        "id": notification_id,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "budget_id": budget_id,
        "created_at": now,
        "read": False
    }
    
    # Get existing notifications for user
    user_notifications = get_user_notifications(user_id)
    
    # Add new notification at the beginning (most recent first)
    user_notifications.insert(0, notification)
    
    # Keep only the last 50 notifications per user
    if len(user_notifications) > 50:
        user_notifications = user_notifications[:50]
    
    save_user_notifications(user_id, user_notifications)
    
    logger.info(f"🔔 Created notification for user {user_id}: {title}")
    return notification

def check_budget_alerts(user_id: str):
    """Check budgets and create alerts if needed"""
    try:
        user_budgets = get_user_budgets(user_id)
        
        for budget in user_budgets:
            # Update budget with current spending
            updated_budget = update_budget_with_spending(budget, user_id)
            
            # Check for over-budget alert
            if updated_budget['percentage_used'] >= 100:
                # Check if we already have an over-budget notification for this budget
                existing_notifications = get_user_notifications(user_id)
                over_budget_exists = any(
                    n.get('budget_id') == budget['id'] and 
                    n.get('type') == 'warning' and 
                    'over budget' in n.get('title', '').lower()
                    for n in existing_notifications
                )
                
                if not over_budget_exists:
                    create_notification(
                        user_id=user_id,
                        title=f"Over Budget Alert: {budget['category']}",
                        message=f"You've exceeded your {budget['category']} budget by ${abs(updated_budget['remaining']):.2f}. Consider reviewing your spending.",
                        notification_type="warning",
                        budget_id=budget['id']
                    )
            
            # Check for close to limit alert (80-99%)
            elif updated_budget['percentage_used'] >= 80 and updated_budget['percentage_used'] < 100:
                # Check if we already have a close to limit notification for this budget
                existing_notifications = get_user_notifications(user_id)
                close_limit_exists = any(
                    n.get('budget_id') == budget['id'] and 
                    n.get('type') == 'info' and 
                    'close to limit' in n.get('title', '').lower()
                    for n in existing_notifications
                )
                
                if not close_limit_exists:
                    create_notification(
                        user_id=user_id,
                        title=f"Close to Limit: {budget['category']}",
                        message=f"You're at {updated_budget['percentage_used']:.1f}% of your {budget['category']} budget. Only ${updated_budget['remaining']:.2f} remaining.",
                        notification_type="info",
                        budget_id=budget['id']
                    )
            
            # Check for success notification (under 50% at month-end)
            elif updated_budget['percentage_used'] <= 50:
                # Only create success notification once per month per budget
                current_month = datetime.now().strftime('%Y-%m')
                existing_notifications = get_user_notifications(user_id)
                success_exists = any(
                    n.get('budget_id') == budget['id'] and 
                    n.get('type') == 'success' and 
                    'great job' in n.get('title', '').lower() and
                    n.get('created_at', '').startswith(current_month)
                    for n in existing_notifications
                )
                
                if not success_exists:
                    create_notification(
                        user_id=user_id,
                        title=f"Great Job: {budget['category']}",
                        message=f"You're doing great with your {budget['category']} budget! You've only used {updated_budget['percentage_used']:.1f}% so far.",
                        notification_type="success",
                        budget_id=budget['id']
                    )
    
    except Exception as e:
        logger.error(f"❌ Error checking budget alerts: {str(e)}")

@app.get("/api/v1/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """
    Get all notifications for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching user notifications")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get notifications for user
        user_notifications = get_user_notifications(user_id)
        
        # Check for new budget alerts
        check_budget_alerts(user_id)
        
        # Get updated notifications after checking alerts
        updated_notifications = get_user_notifications(user_id)
        
        logger.info(f"✅ Retrieved {len(updated_notifications)} notifications for user {user_id}")
        
        return {
            "notifications": updated_notifications,
            "count": len(updated_notifications),
            "unread_count": len([n for n in updated_notifications if not n['read']]),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get notifications: {str(e)}"
        )

@app.post("/api/v1/notifications")
async def create_notification_endpoint(
    notification_data: NotificationCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new notification for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Creating new notification")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"📝 Notification data: {notification_data}")
    
    try:
        user_id = current_user["user_id"]
        
        # Validate notification type
        valid_types = ['info', 'warning', 'success']
        if notification_data.type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid notification type. Must be one of: {valid_types}"
            )
        
        # Create notification
        notification = create_notification(
            user_id=user_id,
            title=notification_data.title,
            message=notification_data.message,
            notification_type=notification_data.type,
            budget_id=notification_data.budget_id
        )
        
        logger.info(f"✅ Notification created successfully: {notification['id']}")
        
        return {
            "message": "Notification created successfully",
            "notification": notification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create notification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create notification: {str(e)}"
        )

@app.patch("/api/v1/notifications/{notification_id}")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a notification as read for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Marking notification as read: {notification_id}")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get notifications for user
        user_notifications = get_user_notifications(user_id)
        
        # Find the notification to update
        notification_index = next((i for i, n in enumerate(user_notifications) if n['id'] == notification_id), None)
        if notification_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Notification not found: {notification_id}"
            )
        
        # Check if user owns this notification
        if user_notifications[notification_index]['user_id'] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only update your own notifications"
            )
        
        # Mark as read
        user_notifications[notification_index]['read'] = True
        
        # Save updated notifications
        save_user_notifications(user_id, user_notifications)
        
        logger.info(f"✅ Notification marked as read: {notification_id}")
        
        return {
            "message": "Notification marked as read",
            "notification": user_notifications[notification_index]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to mark notification as read: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to mark notification as read: {str(e)}"
        )

@app.delete("/api/v1/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a notification for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Deleting notification: {notification_id}")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get notifications for user
        user_notifications = get_user_notifications(user_id)
        
        # Find the notification to delete
        notification_index = next((i for i, n in enumerate(user_notifications) if n['id'] == notification_id), None)
        if notification_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Notification not found: {notification_id}"
            )
        
        # Check if user owns this notification
        if user_notifications[notification_index]['user_id'] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only delete your own notifications"
            )
        
        # Remove notification
        deleted_notification = user_notifications.pop(notification_index)
        save_user_notifications(user_id, user_notifications)
        
        logger.info(f"✅ Notification deleted successfully: {notification_id}")
        
        return {
            "message": "Notification deleted successfully",
            "deleted_notification": deleted_notification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete notification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete notification: {str(e)}"
        )

@app.post("/api/v1/notifications/test")
async def create_test_notifications(current_user: dict = Depends(get_current_user)):
    """
    Create test notifications for the authenticated user.
    This endpoint is for testing purposes only.
    """
    logger.info("🔄 Creating test notifications")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Create sample notifications
        test_notifications = [
            {
                "title": "Welcome to LivyFlow! 🎉",
                "message": "Your financial journey starts here. We'll help you track spending, set budgets, and achieve your financial goals.",
                "type": "success"
            },
            {
                "title": "Budget Alert: Food & Dining",
                "message": "You're at 85% of your Food & Dining budget. Only $45.00 remaining this month.",
                "type": "info"
            },
            {
                "title": "Over Budget: Entertainment",
                "message": "You've exceeded your Entertainment budget by $25.50. Consider reviewing your spending.",
                "type": "warning"
            },
            {
                "title": "Great Job: Transportation",
                "message": "You're doing great with your Transportation budget! You've only used 35% so far.",
                "type": "success"
            }
        ]
        
        created_notifications = []
        for notification_data in test_notifications:
            notification = create_notification(
                user_id=user_id,
                title=notification_data["title"],
                message=notification_data["message"],
                notification_type=notification_data["type"]
            )
            created_notifications.append(notification)
        
        logger.info(f"✅ Created {len(created_notifications)} test notifications")
        
        return {
            "message": f"Created {len(created_notifications)} test notifications",
            "notifications": created_notifications
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create test notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create test notifications: {str(e)}"
        )

@app.get("/api/v1/insights")
async def get_insights(current_user: dict = Depends(get_current_user)):
    """
    Get AI insights for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching user insights")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get existing insights for user
        user_insights = get_user_insights(user_id)
        
        # Generate new insights from spending patterns
        new_insights = analyze_spending_patterns(user_id)
        
        # Get updated insights after analysis
        updated_insights = get_user_insights(user_id)
        
        logger.info(f"✅ Retrieved {len(updated_insights)} insights for user {user_id}")
        
        return {
            "insights": updated_insights,
            "count": len(updated_insights),
            "new_insights_generated": len(new_insights),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get insights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get insights: {str(e)}"
        )

@app.post("/api/v1/insights/test")
async def create_test_insights(current_user: dict = Depends(get_current_user)):
    """
    Create test insights for the authenticated user.
    This endpoint is for testing purposes only.
    """
    logger.info("🔄 Creating test insights")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Create sample insights
        test_insights = [
            {
                "title": "Top Spending Category: Food & Dining",
                "description": "You spent $450.75 on Food & Dining this month. Consider setting a budget for this category.",
                "type": "spending",
                "category": "food_and_dining",
                "amount": 450.75
            },
            {
                "title": "Potential Subscriptions Detected",
                "description": "Found 3 recurring payments: Netflix, Spotify, Amazon Prime. Review these to ensure you're not paying for unused services.",
                "type": "subscription",
                "amount": 3
            },
            {
                "title": "High Spending Days Detected",
                "description": "You had 4 days with unusually high spending. Consider what triggers these spending spikes.",
                "type": "pattern",
                "amount": 4
            },
            {
                "title": "Savings Opportunity",
                "description": "You spent $1,250.00 this month. By reducing spending by 10%, you could save $125.00 monthly.",
                "type": "savings",
                "amount": 125.00
            },
            {
                "title": "Weekend Spending Pattern",
                "description": "You spend 65% of your money on weekends. Consider planning activities that don't require spending.",
                "type": "pattern",
                "amount": 0.65
            }
        ]
        
        created_insights = []
        for insight_data in test_insights:
            insight = create_insight(
                user_id=user_id,
                title=insight_data["title"],
                description=insight_data["description"],
                insight_type=insight_data["type"],
                category=insight_data.get("category"),
                amount=insight_data.get("amount")
            )
            created_insights.append(insight)
        
        logger.info(f"✅ Created {len(created_insights)} test insights")
        
        return {
            "message": f"Created {len(created_insights)} test insights",
            "insights": created_insights
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create test insights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create test insights: {str(e)}"
        )

# Helper functions for insight management
def generate_insight_id():
    """Generate a unique insight ID"""
    return f"insight_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

def get_user_insights(user_id: str) -> List[dict]:
    """Get all insights for a user"""
    return insights_storage.get(user_id, [])

def save_user_insights(user_id: str, insights: List[dict]):
    """Save insights for a user"""
    insights_storage[user_id] = insights

def create_insight(user_id: str, title: str, description: str, insight_type: str, category: str = None, amount: float = None):
    """Create a new insight for a user"""
    insight_id = generate_insight_id()
    now = datetime.now().isoformat()
    
    insight = {
        "id": insight_id,
        "user_id": user_id,
        "title": title,
        "description": description,
        "type": insight_type,
        "category": category,
        "amount": amount,
        "created_at": now
    }
    
    # Get existing insights for user
    user_insights = get_user_insights(user_id)
    
    # Add new insight at the beginning (most recent first)
    user_insights.insert(0, insight)
    
    # Keep only the last 20 insights per user
    if len(user_insights) > 20:
        user_insights = user_insights[:20]
    
    save_user_insights(user_id, user_insights)
    
    logger.info(f"🧠 Created insight for user {user_id}: {title}")
    return insight

def analyze_spending_patterns(user_id: str):
    """Analyze user's spending patterns and generate insights"""
    try:
        # Get user's transactions
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.info(f"ℹ️ No access token found for user: {user_id} - no insights to generate")
            return []
        
        # Get transactions from the last 30 days
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        try:
            transactions_response = get_transactions(access_token, start_date, end_date, 500)
            transactions = transactions_response.get('transactions', [])
        except Exception as e:
            logger.error(f"❌ Error fetching transactions for insights: {str(e)}")
            return []
        
        if not transactions:
            logger.info(f"ℹ️ No transactions found for user: {user_id} - no insights to generate")
            return []
        
        insights = []
        
        # 1. Analyze spending by category
        category_spending = {}
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') > 0:  # Only spending transactions
                category = transaction.get('category', ['Other'])[0] if transaction.get('category') else 'Other'
                if category not in category_spending:
                    category_spending[category] = 0
                category_spending[category] += abs(transaction['amount'])
        
        # Find top spending category
        if category_spending:
            top_category = max(category_spending.items(), key=lambda x: x[1])
            if top_category[1] > 100:  # Only create insight if spending > $100
                insights.append(create_insight(
                    user_id=user_id,
                    title=f"Top Spending Category: {top_category[0].replace('_', ' ').title()}",
                    description=f"You spent ${top_category[1]:.2f} on {top_category[0].replace('_', ' ')} this month. Consider setting a budget for this category.",
                    type="spending",
                    category=top_category[0],
                    amount=top_category[1]
                ))
        
        # 2. Detect subscriptions (recurring transactions)
        merchant_frequency = {}
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') > 0:
                merchant = transaction.get('merchant_name', 'Unknown')
                if merchant not in merchant_frequency:
                    merchant_frequency[merchant] = 0
                merchant_frequency[merchant] += 1
        
        # Find potential subscriptions (appears 2+ times)
        subscriptions = [merchant for merchant, count in merchant_frequency.items() if count >= 2]
        if subscriptions:
            insights.append(create_insight(
                user_id=user_id,
                title="Potential Subscriptions Detected",
                description=f"Found {len(subscriptions)} recurring payments: {', '.join(subscriptions[:3])}{'...' if len(subscriptions) > 3 else ''}. Review these to ensure you're not paying for unused services.",
                type="subscription",
                amount=len(subscriptions)
            ))
        
        # 3. Analyze spending trends
        daily_spending = {}
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') > 0:
                date = transaction.get('date')
                if date:
                    if date not in daily_spending:
                        daily_spending[date] = 0
                    daily_spending[date] += abs(transaction['amount'])
        
        # Find high spending days
        if daily_spending:
            avg_daily_spending = sum(daily_spending.values()) / len(daily_spending)
            high_spending_days = [date for date, amount in daily_spending.items() if amount > avg_daily_spending * 1.5]
            
            if high_spending_days:
                insights.append(create_insight(
                    user_id=user_id,
                    title="High Spending Days Detected",
                    description=f"You had {len(high_spending_days)} days with unusually high spending. Consider what triggers these spending spikes.",
                    type="pattern",
                    amount=len(high_spending_days)
                ))
        
        # 4. Savings opportunity
        total_spending = sum(abs(t.get('amount', 0)) for t in transactions if t.get('amount', 0) > 0)
        if total_spending > 500:  # Only if spending > $500
            potential_savings = total_spending * 0.1  # Assume 10% savings opportunity
            insights.append(create_insight(
                user_id=user_id,
                title="Savings Opportunity",
                description=f"You spent ${total_spending:.2f} this month. By reducing spending by 10%, you could save ${potential_savings:.2f} monthly.",
                type="savings",
                amount=potential_savings
            ))
        
        # 5. Weekend vs weekday spending
        weekend_spending = 0
        weekday_spending = 0
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') > 0:
                date = transaction.get('date')
                if date:
                    try:
                        transaction_date = datetime.strptime(date, '%Y-%m-%d').date()
                        if transaction_date.weekday() >= 5:  # Weekend
                            weekend_spending += abs(transaction['amount'])
                        else:
                            weekday_spending += abs(transaction['amount'])
                    except:
                        pass
        
        if weekend_spending > 0 and weekday_spending > 0:
            weekend_ratio = weekend_spending / (weekend_spending + weekday_spending)
            if weekend_ratio > 0.6:  # More than 60% on weekends
                insights.append(create_insight(
                    user_id=user_id,
                    title="Weekend Spending Pattern",
                    description=f"You spend {weekend_ratio:.1%} of your money on weekends. Consider planning activities that don't require spending.",
                    type="pattern",
                    amount=weekend_ratio
                ))
        
        logger.info(f"✅ Generated {len(insights)} insights for user {user_id}")
        return insights
        
    except Exception as e:
        logger.error(f"❌ Error analyzing spending patterns: {str(e)}")
        return []

@app.get("/api/v1/transactions/trends")
async def get_spending_trends(
    category: Optional[str] = Query(None, description="Filter by specific category"),
    range: Optional[str] = Query("6", description="Number of months to analyze (default: 6)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get spending trends over time, grouped by month and category.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching spending trends")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"📊 Category filter: {category}")
    logger.info(f"📅 Range: {range} months")
    
    try:
        user_id = current_user["user_id"]
        
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return {
                "trends": [],
                "message": "No bank account connected. Connect your bank to see spending trends."
            }
        
        # Calculate date range
        try:
            months_back = int(range)
            if months_back <= 0 or months_back > 24:
                months_back = 6  # Default to 6 months if invalid
        except ValueError:
            months_back = 6
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months_back * 30)
        
        logger.info(f"📅 Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        # Get transactions from Plaid
        transactions_response = get_transactions(
            access_token,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            500  # Get more transactions for better trend analysis
        )
        
        if not transactions_response or not transactions_response.transactions:
            logger.info("ℹ️ No transactions found for trend analysis")
            return {
                "trends": [],
                "message": "No transactions found for the selected period."
            }
        
        # Group transactions by month and category
        trends_data = {}
        
        for transaction in transactions_response.transactions:
            # Skip income transactions (positive amounts)
            if transaction.amount > 0:
                continue
                
            # Parse transaction date
            try:
                tx_date = datetime.strptime(transaction.date, '%Y-%m-%d')
                month_key = tx_date.strftime('%Y-%m')
            except ValueError:
                continue
            
            # Get category (use primary category or 'Other' if none)
            tx_category = 'Other'
            if transaction.category and len(transaction.category) > 0:
                tx_category = transaction.category[0]
            
            # Apply category filter if specified
            if category and tx_category.lower() != category.lower():
                continue
            
            # Initialize month if not exists
            if month_key not in trends_data:
                trends_data[month_key] = {}
            
            # Initialize category if not exists
            if tx_category not in trends_data[month_key]:
                trends_data[month_key][tx_category] = 0.0
            
            # Add transaction amount (convert to positive for spending)
            trends_data[month_key][tx_category] += abs(transaction.amount)
        
        # Convert to response format
        trends = []
        for month in sorted(trends_data.keys()):
            month_data = {
                "month": month,
                "categories": []
            }
            
            for cat, amount in trends_data[month].items():
                month_data["categories"].append({
                    "category": cat,
                    "amount": round(amount, 2)
                })
            
            trends.append(month_data)
        
        logger.info(f"✅ Retrieved trends for {len(trends)} months")
        logger.info(f"📊 Categories found: {len(set([cat for month in trends_data.values() for cat in month.keys()]))}")
        
        return {
            "trends": trends,
            "date_range": {
                "start_date": start_date.strftime('%Y-%m-%d'),
                "end_date": end_date.strftime('%Y-%m-%d'),
                "months_analyzed": months_back
            },
            "category_filter": category
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch spending trends: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch spending trends: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 