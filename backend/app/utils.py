"""
Utility functions shared across the application.
"""
import logging
from typing import List, Dict
from datetime import datetime, timedelta
from .plaid_client import get_transactions, get_access_token_for_user

logger = logging.getLogger(__name__)

# In-memory storage for budgets (in production, use a database)
budgets_storage = {}

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