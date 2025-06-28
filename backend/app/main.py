from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import logging
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app.auth import get_current_user
from app.plaid_client import create_link_token, exchange_public_token, get_transactions, get_accounts, store_access_token, get_access_token_for_user
from app.config import settings
from app.email_service import email_service
from app.scheduler import weekly_scheduler
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
import json

# Configure logging based on environment
if settings.is_production():
    logging.basicConfig(
        level=logging.WARNING,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

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

# Alert Rule Models
class AlertRule(BaseModel):
    id: str
    user_id: str
    name: str
    type: str  # "balance_low", "spending_high", "recurring_subscription", "budget_exceeded"
    condition: str  # "balance < 50", "spending > 500", etc.
    threshold: float
    enabled: bool = True
    created_at: str
    last_triggered: Optional[str] = None
    trigger_count: int = 0

class CreateAlertRuleRequest(BaseModel):
    name: str
    type: str
    threshold: float
    enabled: bool = True

class AlertTrigger(BaseModel):
    id: str
    alert_rule_id: str
    user_id: str
    message: str
    triggered_at: str
    resolved: bool = False
    resolved_at: Optional[str] = None

# In-memory storage for alert rules and triggers
alert_rules: Dict[str, List[AlertRule]] = {}
alert_triggers: Dict[str, List[AlertTrigger]] = {}

def get_alert_rules_for_user(user_id: str) -> List[AlertRule]:
    """Get all alert rules for a user."""
    return alert_rules.get(user_id, [])

def save_alert_rule(alert_rule: AlertRule):
    """Save an alert rule for a user."""
    if alert_rule.user_id not in alert_rules:
        alert_rules[alert_rule.user_id] = []
    alert_rules[alert_rule.user_id].append(alert_rule)

def get_alert_triggers_for_user(user_id: str) -> List[AlertTrigger]:
    """Get all alert triggers for a user."""
    return alert_triggers.get(user_id, [])

def save_alert_trigger(trigger: AlertTrigger):
    """Save an alert trigger for a user."""
    if trigger.user_id not in alert_triggers:
        alert_triggers[trigger.user_id] = []
    alert_triggers[trigger.user_id].append(trigger)

app = FastAPI(
    title="LivyFlow API", 
    version="1.0.0",
    debug=settings.DEBUG
)

# Add CORS middleware with production-ready configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

class PublicTokenRequest(BaseModel):
    public_token: str

@app.get("/")
async def root():
    return {"message": "LivyFlow API is running", "environment": settings.ENVIRONMENT}

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify backend is running.
    No authentication required.
    """
    if not settings.is_production():
        logger.info("🏥 Health check requested")
    return {
        "status": "healthy",
        "message": "LivyFlow API is running",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/plaid/link-token")
async def create_plaid_link_token(current_user: dict = Depends(get_current_user)):
    """
    Create a Plaid link token for the authenticated user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Creating Plaid link token")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    # Console log to confirm link token request (as requested)
    print(f"[Plaid] Link token request by: {current_user.get('email', 'unknown')}")
    
    try:
        user_id = current_user["user_id"]
        logger.info("🌐 Calling Plaid API to create link token...")
        link_token = create_link_token(user_id)
        
        logger.info("✅ Link token created successfully")
        logger.info(f"🔗 Link token: {link_token[:20]}...")
        
        # Console log to confirm link token response (as requested)
        print(f"[Plaid] Link Token Response: {link_token[:20]}...")
        
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

@app.get("/api/v1/budgets/summary")
async def get_budget_summary(current_user: dict = Depends(get_current_user)):
    """
    Get budget summary comparing actual spending vs budget for each category.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching budget summary")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get budgets for user
        user_budgets = get_user_budgets(user_id)
        
        if not user_budgets:
            logger.info(f"ℹ️ No budgets found for user: {user_id}")
            return {
                "message": "No budgets found. Create your first budget to get started.",
                "budgets": [],
                "summary": {
                    "total_budget": 0,
                    "total_spent": 0,
                    "total_remaining": 0,
                    "overall_percentage": 0
                },
                "user_id": user_id
            }
        
        # Calculate summary for each budget
        total_budget = 0
        total_spent = 0
        budget_summaries = []
        
        for budget in user_budgets:
            # Update budget with actual spending data
            updated_budget = update_budget_with_spending(budget, user_id)
            
            total_budget += updated_budget['monthly_limit']
            total_spent += updated_budget['actual_spent']
            
            # Determine status
            if updated_budget['percentage_used'] >= 100:
                status = "over_budget"
                status_color = "red"
            elif updated_budget['percentage_used'] >= 80:
                status = "near_limit"
                status_color = "yellow"
            else:
                status = "on_track"
                status_color = "green"
            
            budget_summaries.append({
                "id": updated_budget['id'],
                "category": updated_budget['category'],
                "budget_limit": updated_budget['monthly_limit'],
                "actual_spent": updated_budget['actual_spent'],
                "remaining": updated_budget['remaining'],
                "percentage_used": updated_budget['percentage_used'],
                "status": status,
                "status_color": status_color,
                "description": updated_budget.get('description', '')
            })
        
        total_remaining = total_budget - total_spent
        overall_percentage = (total_spent / total_budget * 100) if total_budget > 0 else 0
        
        # Count budgets by status
        over_budget_count = len([b for b in budget_summaries if b['status'] == 'over_budget'])
        near_limit_count = len([b for b in budget_summaries if b['status'] == 'near_limit'])
        on_track_count = len([b for b in budget_summaries if b['status'] == 'on_track'])
        
        logger.info(f"✅ Budget summary calculated")
        logger.info(f"💰 Total budget: ${total_budget:.2f}")
        logger.info(f"💸 Total spent: ${total_spent:.2f}")
        logger.info(f"📊 Overall percentage: {overall_percentage:.1f}%")
        logger.info(f"🚨 Over budget: {over_budget_count}, Near limit: {near_limit_count}, On track: {on_track_count}")
        
        return {
            "budgets": budget_summaries,
            "summary": {
                "total_budget": round(total_budget, 2),
                "total_spent": round(total_spent, 2),
                "total_remaining": round(total_remaining, 2),
                "overall_percentage": round(overall_percentage, 1),
                "over_budget_count": over_budget_count,
                "near_limit_count": near_limit_count,
                "on_track_count": on_track_count
            },
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get budget summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get budget summary: {str(e)}"
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
    logger.info("🗑️ Deleting notification")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    logger.info(f"🔔 Notification ID: {notification_id}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get user notifications
        user_notifications = get_user_notifications(user_id)
        
        # Find the notification to delete
        notification_to_delete = None
        for notification in user_notifications:
            if notification["id"] == notification_id:
                notification_to_delete = notification
                break
        
        if not notification_to_delete:
            logger.warning(f"⚠️ Notification {notification_id} not found for user {user_id}")
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )
        
        # Remove the notification
        updated_notifications = [n for n in user_notifications if n["id"] != notification_id]
        save_user_notifications(user_id, updated_notifications)
        
        logger.info(f"✅ Notification {notification_id} deleted successfully")
        
        return {
            "message": "Notification deleted successfully",
            "notification_id": notification_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete notification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete notification: {str(e)}"
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

@app.get("/api/v1/insights/monthly")
async def get_monthly_insights(current_user: dict = Depends(get_current_user)):
    """
    Get monthly spending insights comparing current month to previous month.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching monthly insights")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return {
                "insights": [],
                "summary": {
                    "current_month_total": 0,
                    "previous_month_total": 0,
                    "total_change_percent": 0,
                    "message": "No bank account connected. Connect your bank to see monthly insights."
                },
                "category_changes": [],
                "largest_increase": None,
                "largest_decrease": None
            }
        
        # Calculate date ranges for current and previous month
        now = datetime.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Previous month
        if now.month == 1:
            previous_month_start = now.replace(year=now.year-1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            previous_month_start = now.replace(month=now.month-1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # End dates
        current_month_end = now
        previous_month_end = current_month_start - timedelta(microseconds=1)
        
        logger.info(f"📅 Current month: {current_month_start.strftime('%Y-%m-%d')} to {current_month_end.strftime('%Y-%m-%d')}")
        logger.info(f"📅 Previous month: {previous_month_start.strftime('%Y-%m-%d')} to {previous_month_end.strftime('%Y-%m-%d')}")
        
        # Get transactions for both months
        current_month_transactions = get_transactions(
            access_token,
            current_month_start.strftime('%Y-%m-%d'),
            current_month_end.strftime('%Y-%m-%d'),
            500
        )
        
        previous_month_transactions = get_transactions(
            access_token,
            previous_month_start.strftime('%Y-%m-%d'),
            previous_month_end.strftime('%Y-%m-%d'),
            500
        )
        
        # Process current month transactions
        current_month_spending = {}
        current_month_total = 0
        
        if current_month_transactions and current_month_transactions.transactions:
            for transaction in current_month_transactions.transactions:
                if transaction.amount < 0:  # Only spending transactions
                    category = 'Other'
                    if transaction.category and len(transaction.category) > 0:
                        category = transaction.category[0]
                    
                    if category not in current_month_spending:
                        current_month_spending[category] = 0
                    
                    current_month_spending[category] += abs(transaction.amount)
                    current_month_total += abs(transaction.amount)
        
        # Process previous month transactions
        previous_month_spending = {}
        previous_month_total = 0
        
        if previous_month_transactions and previous_month_transactions.transactions:
            for transaction in previous_month_transactions.transactions:
                if transaction.amount < 0:  # Only spending transactions
                    category = 'Other'
                    if transaction.category and len(transaction.category) > 0:
                        category = transaction.category[0]
                    
                    if category not in previous_month_spending:
                        previous_month_spending[category] = 0
                    
                    previous_month_spending[category] += abs(transaction.amount)
                    previous_month_total += abs(transaction.amount)
        
        # Calculate category changes
        all_categories = set(list(current_month_spending.keys()) + list(previous_month_spending.keys()))
        category_changes = []
        
        for category in all_categories:
            current_amount = current_month_spending.get(category, 0)
            previous_amount = previous_month_spending.get(category, 0)
            
            if previous_amount > 0:
                change_percent = ((current_amount - previous_amount) / previous_amount) * 100
            else:
                change_percent = 100 if current_amount > 0 else 0
            
            category_changes.append({
                "category": category,
                "current_amount": round(current_amount, 2),
                "previous_amount": round(previous_amount, 2),
                "change_amount": round(current_amount - previous_amount, 2),
                "change_percent": round(change_percent, 1),
                "is_increase": change_percent > 0
            })
        
        # Sort by absolute change percentage
        category_changes.sort(key=lambda x: abs(x["change_percent"]), reverse=True)
        
        # Find largest increase and decrease
        largest_increase = None
        largest_decrease = None
        
        for change in category_changes:
            if change["change_percent"] > 0 and (largest_increase is None or change["change_percent"] > largest_increase["change_percent"]):
                largest_increase = change
            elif change["change_percent"] < 0 and (largest_decrease is None or change["change_percent"] < largest_decrease["change_percent"]):
                largest_decrease = change
        
        # Calculate total change percentage
        total_change_percent = 0
        if previous_month_total > 0:
            total_change_percent = ((current_month_total - previous_month_total) / previous_month_total) * 100
        
        # Generate summary message
        summary_message = ""
        if current_month_total == 0 and previous_month_total == 0:
            summary_message = "Not enough data yet for insights. Start spending to see monthly comparisons."
        elif current_month_total == 0:
            summary_message = "Great job! No spending this month compared to last month."
        elif previous_month_total == 0:
            summary_message = "This is your first month of tracked spending. Keep it up!"
        else:
            if total_change_percent > 10:
                summary_message = f"Spending is up {abs(total_change_percent):.1f}% this month. Consider reviewing your budget."
            elif total_change_percent < -10:
                summary_message = f"Excellent! Spending is down {abs(total_change_percent):.1f}% this month."
            else:
                summary_message = f"Spending is relatively stable this month ({total_change_percent:+.1f}% change)."
        
        logger.info(f"✅ Generated monthly insights for {len(category_changes)} categories")
        logger.info(f"📊 Current month total: ${current_month_total:.2f}")
        logger.info(f"📊 Previous month total: ${previous_month_total:.2f}")
        
        return {
            "insights": category_changes,
            "summary": {
                "current_month_total": round(current_month_total, 2),
                "previous_month_total": round(previous_month_total, 2),
                "total_change_percent": round(total_change_percent, 1),
                "message": summary_message
            },
            "category_changes": category_changes,
            "largest_increase": largest_increase,
            "largest_decrease": largest_decrease
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch monthly insights: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch monthly insights: {str(e)}"
        )

@app.get("/api/v1/budget/recommendations")
async def get_budget_recommendations(current_user: dict = Depends(get_current_user)):
    """
    Get smart budget recommendations based on past 3 months of spending.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching budget recommendations")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return {
                "recommendations": {},
                "message": "No bank account connected. Connect your bank to get budget recommendations.",
                "has_data": False
            }
        
        # Calculate date range for past 3 months
        now = datetime.now()
        end_date = now
        start_date = now - timedelta(days=90)  # 3 months back
        
        logger.info(f"📅 Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        # Get transactions for the past 3 months
        transactions_response = get_transactions(
            access_token,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            1000  # Get more transactions for better analysis
        )
        
        if not transactions_response or not transactions_response.transactions:
            logger.info("ℹ️ No transactions found for budget recommendations")
            return {
                "recommendations": {},
                "message": "We need more transaction history to recommend budgets. Start spending to get personalized suggestions.",
                "has_data": False
            }
        
        # Group transactions by category and month
        category_monthly_spending = {}
        
        for transaction in transactions_response.transactions:
            if transaction.amount < 0:  # Only spending transactions
                # Parse transaction date
                try:
                    tx_date = datetime.strptime(transaction.date, '%Y-%m-%d')
                    month_key = tx_date.strftime('%Y-%m')
                except ValueError:
                    continue
                
                # Get category
                category = 'Other'
                if transaction.category and len(transaction.category) > 0:
                    category = transaction.category[0]
                
                # Initialize category if not exists
                if category not in category_monthly_spending:
                    category_monthly_spending[category] = {}
                
                # Initialize month if not exists
                if month_key not in category_monthly_spending[category]:
                    category_monthly_spending[category][month_key] = 0.0
                
                # Add transaction amount
                category_monthly_spending[category][month_key] += abs(transaction.amount)
        
        # Calculate recommendations
        recommendations = {}
        total_recommendations = 0
        
        for category, monthly_data in category_monthly_spending.items():
            if len(monthly_data) >= 1:  # Need at least 1 month of data
                # Calculate average monthly spending
                total_spending = sum(monthly_data.values())
                num_months = len(monthly_data)
                average_monthly = total_spending / num_months
                
                # Add 10% buffer for the recommendation
                recommended_budget = average_monthly * 1.1
                
                recommendations[category] = {
                    "amount": round(recommended_budget, 2),
                    "average_monthly": round(average_monthly, 2),
                    "months_analyzed": num_months,
                    "total_spent": round(total_spending, 2)
                }
                
                total_recommendations += recommended_budget
        
        # Sort recommendations by amount (highest first)
        sorted_recommendations = dict(sorted(
            recommendations.items(), 
            key=lambda x: x[1]["amount"], 
            reverse=True
        ))
        
        logger.info(f"✅ Generated {len(recommendations)} budget recommendations")
        logger.info(f"📊 Total recommended budget: ${total_recommendations:.2f}")
        
        if len(recommendations) == 0:
            return {
                "recommendations": {},
                "message": "We need more transaction history to recommend budgets. Start spending to get personalized suggestions.",
                "has_data": False
            }
        
        return {
            "recommendations": sorted_recommendations,
            "total_recommended": round(total_recommendations, 2),
            "categories_analyzed": len(recommendations),
            "message": f"Based on your past {len(list(category_monthly_spending.values())[0])} months of spending, here are our recommendations:",
            "has_data": True
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch budget recommendations: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch budget recommendations: {str(e)}"
        )

@app.get("/api/v1/transactions/recurring")
async def get_recurring_subscriptions(current_user: dict = Depends(get_current_user)):
    """
    Detect recurring subscriptions from transaction history.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Detecting recurring subscriptions")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return {
                "subscriptions": [],
                "message": "No bank account connected. Connect your bank to detect recurring subscriptions.",
                "has_data": False
            }
        
        # Get transactions for the past 6 months to detect patterns
        now = datetime.now()
        end_date = now
        start_date = now - timedelta(days=180)  # 6 months back
        
        logger.info(f"📅 Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        # Get transactions
        transactions_response = get_transactions(
            access_token,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            1000  # Get more transactions for better pattern detection
        )
        
        if not transactions_response or not transactions_response.transactions:
            logger.info("ℹ️ No transactions found for subscription detection")
            return {
                "subscriptions": [],
                "message": "No transactions found. Start making purchases to detect recurring subscriptions.",
                "has_data": False
            }
        
        # Group transactions by merchant and amount
        merchant_groups = {}
        
        for transaction in transactions_response.transactions:
            if transaction.amount < 0:  # Only spending transactions
                # Use merchant name or transaction name
                merchant_name = transaction.merchant_name or transaction.name or "Unknown Merchant"
                
                # Create a key based on merchant (not amount, to detect price changes)
                group_key = merchant_name.lower().strip()
                
                if group_key not in merchant_groups:
                    merchant_groups[group_key] = {
                        "merchant": merchant_name,
                        "transactions": [],
                        "amounts": [],
                        "dates": []
                    }
                
                merchant_groups[group_key]["transactions"].append(transaction)
                merchant_groups[group_key]["amounts"].append(abs(transaction.amount))
                merchant_groups[group_key]["dates"].append(transaction.date)
        
        # Analyze patterns for recurring subscriptions
        recurring_subscriptions = []
        
        for group_key, group_data in merchant_groups.items():
            if len(group_data["transactions"]) >= 2:  # Need at least 2 transactions to detect pattern
                dates = sorted(group_data["dates"])
                
                # Calculate intervals between transactions
                intervals = []
                for i in range(1, len(dates)):
                    try:
                        date1 = datetime.strptime(dates[i-1], '%Y-%m-%d')
                        date2 = datetime.strptime(dates[i], '%Y-%m-%d')
                        interval = (date2 - date1).days
                        intervals.append(interval)
                    except ValueError:
                        continue
                
                if intervals:
                    avg_interval = sum(intervals) / len(intervals)
                    std_dev = (sum((x - avg_interval) ** 2 for x in intervals) / len(intervals)) ** 0.5
                    
                    # Determine frequency based on average interval
                    frequency = "Unknown"
                    if 25 <= avg_interval <= 35:
                        frequency = "Monthly"
                    elif 85 <= avg_interval <= 95:
                        frequency = "Quarterly"
                    elif 350 <= avg_interval <= 380:
                        frequency = "Yearly"
                    elif 13 <= avg_interval <= 17:
                        frequency = "Bi-weekly"
                    elif 6 <= avg_interval <= 8:
                        frequency = "Weekly"
                    
                    # Check if pattern is consistent (low standard deviation)
                    is_consistent = std_dev <= 5  # Allow 5 days variation
                    
                    # Check if recent (last transaction within last 60 days)
                    try:
                        last_date = datetime.strptime(dates[-1], '%Y-%m-%d')
                        is_recent = (now - last_date).days <= 60
                    except ValueError:
                        is_recent = False
                    
                    # Consider it recurring if consistent pattern and recent
                    if is_consistent and is_recent:
                        # Analyze amount changes
                        amounts = group_data["amounts"]
                        current_amount = amounts[-1]  # Most recent amount
                        previous_amount = amounts[-2] if len(amounts) > 1 else current_amount
                        
                        # Calculate amount change
                        amount_change = current_amount - previous_amount
                        amount_change_percent = (amount_change / previous_amount * 100) if previous_amount > 0 else 0
                        
                        # Determine if there's been a price increase
                        has_increase = amount_change > 0.01  # More than 1 cent increase
                        increase_alert = None
                        
                        if has_increase and amount_change_percent > 5:  # More than 5% increase
                            increase_alert = f"Price increased by ${amount_change:.2f} ({amount_change_percent:.1f}%)"
                        elif has_increase:
                            increase_alert = f"Price increased by ${amount_change:.2f}"
                        
                        # Get the most recent transaction for additional details
                        latest_transaction = max(group_data["transactions"], key=lambda x: x.date)
                        
                        subscription = {
                            "id": f"sub_{len(recurring_subscriptions)}",
                            "name": group_data["merchant"],
                            "amount": round(current_amount, 2),
                            "previous_amount": round(previous_amount, 2),
                            "amount_change": round(amount_change, 2),
                            "amount_change_percent": round(amount_change_percent, 1),
                            "has_increase": has_increase,
                            "increase_alert": increase_alert,
                            "frequency": frequency,
                            "last_date": dates[-1],
                            "next_expected": None,
                            "transaction_count": len(group_data["transactions"]),
                            "avg_interval": round(avg_interval, 1),
                            "category": latest_transaction.category[0] if latest_transaction.category else "Other"
                        }
                        
                        # Calculate next expected date
                        if frequency == "Monthly":
                            next_date = last_date + timedelta(days=30)
                        elif frequency == "Quarterly":
                            next_date = last_date + timedelta(days=90)
                        elif frequency == "Yearly":
                            next_date = last_date + timedelta(days=365)
                        elif frequency == "Bi-weekly":
                            next_date = last_date + timedelta(days=14)
                        elif frequency == "Weekly":
                            next_date = last_date + timedelta(days=7)
                        else:
                            next_date = last_date + timedelta(days=avg_interval)
                        
                        subscription["next_expected"] = next_date.strftime('%Y-%m-%d')
                        
                        recurring_subscriptions.append(subscription)
        
        # Sort by amount (highest first)
        recurring_subscriptions.sort(key=lambda x: x["amount"], reverse=True)
        
        logger.info(f"✅ Detected {len(recurring_subscriptions)} recurring subscriptions")
        
        if len(recurring_subscriptions) == 0:
            return {
                "subscriptions": [],
                "message": "No recurring subscriptions detected. This could mean you don't have any subscriptions, or we need more transaction history.",
                "has_data": False
            }
        
        # Calculate total monthly cost
        total_monthly = 0
        for sub in recurring_subscriptions:
            if sub["frequency"] == "Monthly":
                total_monthly += sub["amount"]
            elif sub["frequency"] == "Quarterly":
                total_monthly += sub["amount"] / 3
            elif sub["frequency"] == "Yearly":
                total_monthly += sub["amount"] / 12
            elif sub["frequency"] == "Bi-weekly":
                total_monthly += sub["amount"] * 2
            elif sub["frequency"] == "Weekly":
                total_monthly += sub["amount"] * 4
        
        # Count subscriptions with price increases
        price_increases = [sub for sub in recurring_subscriptions if sub["has_increase"]]
        
        return {
            "subscriptions": recurring_subscriptions,
            "total_monthly": round(total_monthly, 2),
            "subscription_count": len(recurring_subscriptions),
            "price_increases_count": len(price_increases),
            "message": f"Found {len(recurring_subscriptions)} recurring subscriptions in your transaction history.",
            "has_data": True
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to detect recurring subscriptions: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to detect recurring subscriptions: {str(e)}"
        )


@app.post("/api/v1/alerts")
async def create_alert_rule(request: CreateAlertRuleRequest, current_user: dict = Depends(get_current_user)):
    """
    Create a new alert rule.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Creating new alert rule")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Validate alert type
        valid_types = ["balance_low", "spending_high", "recurring_subscription", "budget_exceeded"]
        if request.type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid alert type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Create alert rule
        alert_rule = AlertRule(
            id=f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
            user_id=user_id,
            name=request.name,
            type=request.type,
            condition=f"{request.type} {request.threshold}",
            threshold=request.threshold,
            enabled=request.enabled,
            created_at=datetime.now().isoformat()
        )
        
        save_alert_rule(alert_rule)
        
        logger.info(f"✅ Alert rule created: {alert_rule.name}")
        
        return {
            "message": "Alert rule created successfully",
            "alert_rule": alert_rule
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create alert rule: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create alert rule: {str(e)}"
        )

@app.get("/api/v1/alerts")
async def get_alert_rules(current_user: dict = Depends(get_current_user)):
    """
    Get all alert rules for the current user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching alert rules")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        user_alerts = get_alert_rules_for_user(user_id)
        
        logger.info(f"✅ Retrieved {len(user_alerts)} alert rules for user {user_id}")
        
        return {
            "alert_rules": user_alerts,
            "count": len(user_alerts)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch alert rules: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch alert rules: {str(e)}"
        )

@app.delete("/api/v1/alerts/{alert_id}")
async def delete_alert_rule(alert_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete an alert rule.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Deleting alert rule: {alert_id}")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        user_alerts = get_alert_rules_for_user(user_id)
        
        # Find and remove the alert rule
        alert_found = False
        for i, alert in enumerate(user_alerts):
            if alert.id == alert_id:
                deleted_alert = user_alerts.pop(i)
                alert_found = True
                logger.info(f"✅ Alert rule deleted: {deleted_alert.name}")
                break
        
        if not alert_found:
            raise HTTPException(
                status_code=404,
                detail="Alert rule not found"
            )
        
        return {
            "message": "Alert rule deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to delete alert rule: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete alert rule: {str(e)}"
        )

@app.patch("/api/v1/alerts/{alert_id}")
async def update_alert_rule(alert_id: str, request: CreateAlertRuleRequest, current_user: dict = Depends(get_current_user)):
    """
    Update an alert rule.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Updating alert rule: {alert_id}")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        user_alerts = get_alert_rules_for_user(user_id)
        
        # Find and update the alert rule
        alert_found = False
        for alert in user_alerts:
            if alert.id == alert_id:
                alert.name = request.name
                alert.type = request.type
                alert.threshold = request.threshold
                alert.enabled = request.enabled
                alert.condition = f"{request.type} {request.threshold}"
                alert_found = True
                logger.info(f"✅ Alert rule updated: {alert.name}")
                break
        
        if not alert_found:
            raise HTTPException(
                status_code=404,
                detail="Alert rule not found"
            )
        
        return {
            "message": "Alert rule updated successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to update alert rule: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update alert rule: {str(e)}"
        )

@app.post("/api/v1/alerts/check")
async def check_alerts(current_user: dict = Depends(get_current_user)):
    """
    Check all alert rules for the current user and trigger alerts if conditions are met.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Checking alert rules")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        user_alerts = get_alert_rules_for_user(user_id)
        
        if not user_alerts:
            logger.info("ℹ️ No alert rules found for user")
            return {
                "message": "No alert rules to check",
                "triggers": []
            }
        
        # Get access token for user to fetch financial data
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id} - skipping alert checks")
            return {
                "message": "No bank account connected. Connect your bank to enable alert checks.",
                "triggers": []
            }
        
        triggered_alerts = []
        
        for alert_rule in user_alerts:
            if not alert_rule.enabled:
                continue
                
            try:
                if alert_rule.type == "balance_low":
                    # Check account balances
                    accounts_response = get_accounts(access_token)
                    if accounts_response and accounts_response.accounts:
                        for account in accounts_response.accounts:
                            if account.balances.current < alert_rule.threshold:
                                trigger = AlertTrigger(
                                    id=f"trigger_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
                                    alert_rule_id=alert_rule.id,
                                    user_id=user_id,
                                    message=f"⚠️ Low balance alert: {account.name} balance is ${account.balances.current:.2f} (below ${alert_rule.threshold:.2f})",
                                    triggered_at=datetime.now().isoformat()
                                )
                                save_alert_trigger(trigger)
                                triggered_alerts.append(trigger)
                                
                                # Update alert rule trigger count
                                alert_rule.trigger_count += 1
                                alert_rule.last_triggered = datetime.now().isoformat()
                                
                elif alert_rule.type == "spending_high":
                    # Check spending for the current week
                    now = datetime.now()
                    week_start = now - timedelta(days=now.weekday())
                    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
                    
                    transactions_response = get_transactions(
                        access_token,
                        week_start.strftime('%Y-%m-%d'),
                        now.strftime('%Y-%m-%d'),
                        1000
                    )
                    
                    if transactions_response and transactions_response.transactions:
                        total_spending = sum(abs(t.amount) for t in transactions_response.transactions if t.amount < 0)
                        
                        if total_spending > alert_rule.threshold:
                            trigger = AlertTrigger(
                                id=f"trigger_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
                                alert_rule_id=alert_rule.id,
                                user_id=user_id,
                                message=f"💰 High spending alert: You've spent ${total_spending:.2f} this week (above ${alert_rule.threshold:.2f})",
                                triggered_at=datetime.now().isoformat()
                            )
                            save_alert_trigger(trigger)
                            triggered_alerts.append(trigger)
                            
                            # Update alert rule trigger count
                            alert_rule.trigger_count += 1
                            alert_rule.last_triggered = datetime.now().isoformat()
                
                elif alert_rule.type == "recurring_subscription":
                    # Check for new recurring subscriptions
                    # This would be implemented when we have subscription detection
                    pass
                
                elif alert_rule.type == "budget_exceeded":
                    # Check if any budgets are exceeded
                    # This would be implemented when we have budget tracking
                    pass
                    
            except Exception as e:
                logger.error(f"❌ Error checking alert rule {alert_rule.id}: {str(e)}")
                continue
        
        logger.info(f"✅ Alert check completed. {len(triggered_alerts)} alerts triggered")
        
        return {
            "message": f"Alert check completed. {len(triggered_alerts)} alerts triggered.",
            "triggers": triggered_alerts
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to check alerts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check alerts: {str(e)}"
        )

@app.get("/api/v1/alerts/triggers")
async def get_alert_triggers(current_user: dict = Depends(get_current_user)):
    """
    Get all alert triggers for the current user.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching alert triggers")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        user_triggers = get_alert_triggers_for_user(user_id)
        
        # Sort by triggered_at (newest first)
        user_triggers.sort(key=lambda x: x.triggered_at, reverse=True)
        
        logger.info(f"✅ Retrieved {len(user_triggers)} alert triggers for user {user_id}")
        
        return {
            "triggers": user_triggers,
            "count": len(user_triggers)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch alert triggers: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch alert triggers: {str(e)}"
        )

@app.patch("/api/v1/alerts/triggers/{trigger_id}/resolve")
async def resolve_alert_trigger(trigger_id: str, current_user: dict = Depends(get_current_user)):
    """
    Mark an alert trigger as resolved.
    Requires authentication via Bearer token.
    """
    logger.info(f"🔄 Resolving alert trigger: {trigger_id}")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        user_triggers = get_alert_triggers_for_user(user_id)
        
        # Find and resolve the trigger
        trigger_found = False
        for trigger in user_triggers:
            if trigger.id == trigger_id:
                trigger.resolved = True
                trigger.resolved_at = datetime.now().isoformat()
                trigger_found = True
                logger.info(f"✅ Alert trigger resolved: {trigger_id}")
                break
        
        if not trigger_found:
            raise HTTPException(
                status_code=404,
                detail="Alert trigger not found"
            )
        
        return {
            "message": "Alert trigger resolved successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to resolve alert trigger: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resolve alert trigger: {str(e)}"
        )

@app.get("/api/v1/reports/monthly")
async def get_monthly_report(current_user: dict = Depends(get_current_user)):
    """
    Get monthly spending report with total spent per category for the current month.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching monthly spending report")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return {
                "message": "Connect your bank account to view spending reports",
                "total_spent": 0,
                "categories": [],
                "user_id": user_id
            }
        
        # Calculate current month date range
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        try:
            transactions_response = get_transactions(
                access_token,
                month_start.strftime('%Y-%m-%d'),
                month_end.strftime('%Y-%m-%d'),
                1000
            )
            transactions = transactions_response.get('transactions', [])
        except Exception as e:
            logger.error(f"❌ Error fetching transactions for monthly report: {str(e)}")
            return {
                "message": "Unable to fetch transaction data",
                "total_spent": 0,
                "categories": [],
                "user_id": user_id
            }
        
        if not transactions:
            logger.info(f"ℹ️ No transactions found for user: {user_id} in current month")
            return {
                "message": "No transactions found for the current month",
                "total_spent": 0,
                "categories": [],
                "user_id": user_id
            }
        
        # Analyze spending by category
        category_spending = {}
        total_spent = 0
        
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') < 0:  # Only spending transactions
                amount = abs(transaction['amount'])
                category = transaction.get('category', ['Other'])[0] if transaction.get('category') else 'Other'
                
                if category not in category_spending:
                    category_spending[category] = 0
                
                category_spending[category] += amount
                total_spent += amount
        
        # Convert to list format for response
        categories = []
        for category, amount in category_spending.items():
            percentage = (amount / total_spent * 100) if total_spent > 0 else 0
            categories.append({
                "category": category,
                "amount": round(amount, 2),
                "percentage": round(percentage, 1)
            })
        
        # Sort by amount (highest first)
        categories.sort(key=lambda x: x['amount'], reverse=True)
        
        logger.info(f"✅ Monthly report generated")
        logger.info(f"💰 Total spent: ${total_spent:.2f}")
        logger.info(f"📊 Categories: {len(categories)}")
        
        return {
            "total_spent": round(total_spent, 2),
            "categories": categories,
            "month": now.strftime('%B %Y'),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get monthly report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get monthly report: {str(e)}"
        )

@app.get("/api/v1/reports/weekly")
async def get_weekly_report(current_user: dict = Depends(get_current_user)):
    """
    Get weekly spending report with daily spending totals for the past 7 days.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching weekly spending report")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return {
                "message": "Connect your bank account to view spending reports",
                "daily_spending": [],
                "total_spent": 0,
                "user_id": user_id
            }
        
        # Calculate past 7 days date range
        now = datetime.now()
        week_start = now - timedelta(days=7)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        try:
            transactions_response = get_transactions(
                access_token,
                week_start.strftime('%Y-%m-%d'),
                week_end.strftime('%Y-%m-%d'),
                1000
            )
            transactions = transactions_response.get('transactions', [])
        except Exception as e:
            logger.error(f"❌ Error fetching transactions for weekly report: {str(e)}")
            return {
                "message": "Unable to fetch transaction data",
                "daily_spending": [],
                "total_spent": 0,
                "user_id": user_id
            }
        
        if not transactions:
            logger.info(f"ℹ️ No transactions found for user: {user_id} in past 7 days")
            return {
                "message": "No transactions found for the past 7 days",
                "daily_spending": [],
                "total_spent": 0,
                "user_id": user_id
            }
        
        # Initialize daily spending dictionary
        daily_spending = {}
        total_spent = 0
        
        # Initialize all 7 days with 0 spending
        for i in range(7):
            date = (now - timedelta(days=i)).strftime('%Y-%m-%d')
            daily_spending[date] = 0
        
        # Analyze spending by day
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') < 0:  # Only spending transactions
                amount = abs(transaction['amount'])
                date = transaction.get('date', '')
                
                if date in daily_spending:
                    daily_spending[date] += amount
                    total_spent += amount
        
        # Convert to list format for response (reverse chronological order)
        daily_data = []
        for i in range(6, -1, -1):  # Last 7 days in reverse order
            date = (now - timedelta(days=i))
            date_str = date.strftime('%Y-%m-%d')
            day_name = date.strftime('%A')
            
            daily_data.append({
                "date": date_str,
                "day": day_name,
                "amount": round(daily_spending.get(date_str, 0), 2)
            })
        
        logger.info(f"✅ Weekly report generated")
        logger.info(f"💰 Total spent: ${total_spent:.2f}")
        logger.info(f"📊 Days with transactions: {len([d for d in daily_data if d['amount'] > 0])}")
        
        return {
            "daily_spending": daily_data,
            "total_spent": round(total_spent, 2),
            "period": f"{week_start.strftime('%B %d')} - {now.strftime('%B %d, %Y')}",
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get weekly report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get weekly report: {str(e)}"
        )

@app.get("/api/v1/reports/categories")
async def get_category_report(current_user: dict = Depends(get_current_user)):
    """
    Get category spending report with percentage breakdown of all spending by category.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching category spending report")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            logger.warning(f"⚠️ No access token found for user: {user_id}")
            return {
                "message": "Connect your bank account to view spending reports",
                "total_spent": 0,
                "categories": [],
                "user_id": user_id
            }
        
        # Get transactions from the last 3 months for a comprehensive view
        now = datetime.now()
        start_date = now - timedelta(days=90)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        try:
            transactions_response = get_transactions(
                access_token,
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d'),
                2000
            )
            transactions = transactions_response.get('transactions', [])
        except Exception as e:
            logger.error(f"❌ Error fetching transactions for category report: {str(e)}")
            return {
                "message": "Unable to fetch transaction data",
                "total_spent": 0,
                "categories": [],
                "user_id": user_id
            }
        
        if not transactions:
            logger.info(f"ℹ️ No transactions found for user: {user_id} in past 3 months")
            return {
                "message": "No transactions found for the past 3 months",
                "total_spent": 0,
                "categories": [],
                "user_id": user_id
            }
        
        # Analyze spending by category
        category_spending = {}
        total_spent = 0
        
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') < 0:  # Only spending transactions
                amount = abs(transaction['amount'])
                category = transaction.get('category', ['Other'])[0] if transaction.get('category') else 'Other'
                
                if category not in category_spending:
                    category_spending[category] = {
                        'amount': 0,
                        'transaction_count': 0,
                        'avg_amount': 0
                    }
                
                category_spending[category]['amount'] += amount
                category_spending[category]['transaction_count'] += 1
                total_spent += amount
        
        # Calculate averages and percentages
        categories = []
        for category, data in category_spending.items():
            percentage = (data['amount'] / total_spent * 100) if total_spent > 0 else 0
            avg_amount = data['amount'] / data['transaction_count'] if data['transaction_count'] > 0 else 0
            
            categories.append({
                "category": category,
                "amount": round(data['amount'], 2),
                "percentage": round(percentage, 1),
                "transaction_count": data['transaction_count'],
                "avg_amount": round(avg_amount, 2)
            })
        
        # Sort by amount (highest first)
        categories.sort(key=lambda x: x['amount'], reverse=True)
        
        logger.info(f"✅ Category report generated")
        logger.info(f"💰 Total spent: ${total_spent:.2f}")
        logger.info(f"📊 Categories: {len(categories)}")
        
        return {
            "total_spent": round(total_spent, 2),
            "categories": categories,
            "period": f"{start_date.strftime('%B %d, %Y')} - {now.strftime('%B %d, %Y')}",
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get category report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get category report: {str(e)}"
        )

# Email Preferences Models
class EmailPreferences(BaseModel):
    weekly_email_summary: bool = False
    budget_alerts: bool = True
    spending_alerts: bool = True
    account_alerts: bool = True

class EmailPreferencesUpdate(BaseModel):
    weekly_email_summary: Optional[bool] = None
    budget_alerts: Optional[bool] = None
    spending_alerts: Optional[bool] = None
    account_alerts: Optional[bool] = None

@app.get("/api/v1/email/preferences")
async def get_email_preferences(current_user: dict = Depends(get_current_user)):
    """
    Get user's email notification preferences.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Fetching email preferences")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        preferences = weekly_scheduler.get_all_user_preferences(user_id)
        
        # Return default preferences if none set
        email_prefs = {
            "weekly_email_summary": preferences.get("weekly_email_summary", False),
            "budget_alerts": preferences.get("budget_alerts", True),
            "spending_alerts": preferences.get("spending_alerts", True),
            "account_alerts": preferences.get("account_alerts", True)
        }
        
        logger.info(f"✅ Retrieved email preferences for user {user_id}")
        return email_prefs
        
    except Exception as e:
        logger.error(f"❌ Failed to get email preferences: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get email preferences: {str(e)}"
        )

@app.patch("/api/v1/email/preferences")
async def update_email_preferences(
    preferences: EmailPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user's email notification preferences.
    Requires authentication via Bearer token.
    """
    logger.info("🔄 Updating email preferences")
    logger.info(f"👤 User ID: {current_user['user_id']}")
    
    try:
        user_id = current_user["user_id"]
        
        # Update each preference if provided
        if preferences.weekly_email_summary is not None:
            weekly_scheduler.set_user_preference(user_id, "weekly_email_summary", preferences.weekly_email_summary)
            logger.info(f"📧 Set weekly_email_summary={preferences.weekly_email_summary} for user {user_id}")
        
        if preferences.budget_alerts is not None:
            weekly_scheduler.set_user_preference(user_id, "budget_alerts", preferences.budget_alerts)
            logger.info(f"📧 Set budget_alerts={preferences.budget_alerts} for user {user_id}")
        
        if preferences.spending_alerts is not None:
            weekly_scheduler.set_user_preference(user_id, "spending_alerts", preferences.spending_alerts)
            logger.info(f"📧 Set spending_alerts={preferences.spending_alerts} for user {user_id}")
        
        if preferences.account_alerts is not None:
            weekly_scheduler.set_user_preference(user_id, "account_alerts", preferences.account_alerts)
            logger.info(f"📧 Set account_alerts={preferences.account_alerts} for user {user_id}")
        
        # Return updated preferences
        updated_prefs = weekly_scheduler.get_all_user_preferences(user_id)
        email_prefs = {
            "weekly_email_summary": updated_prefs.get("weekly_email_summary", False),
            "budget_alerts": updated_prefs.get("budget_alerts", True),
            "spending_alerts": updated_prefs.get("spending_alerts", True),
            "account_alerts": updated_prefs.get("account_alerts", True)
        }
        
        logger.info(f"✅ Updated email preferences for user {user_id}")
        return email_prefs
        
    except Exception as e:
        logger.error(f"❌ Failed to update email preferences: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update email preferences: {str(e)}"
        )


# Initialize the weekly email scheduler when the app starts
@app.on_event("startup")
async def startup_event():
    """Initialize services when the app starts."""
    logger.info("🚀 Starting LivyFlow API...")
    
    # Schedule weekly email summaries
    weekly_scheduler.schedule_weekly_emails()
    
    logger.info("✅ LivyFlow API started successfully")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 