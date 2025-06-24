from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import logging
from typing import Dict, List
from .email_service import email_service
from .plaid_client import get_transactions, get_access_token_for_user

logger = logging.getLogger(__name__)

# In-memory storage for user preferences (in production, use a database)
user_preferences = {}

# In-memory storage for budgets (in production, use a database)
budgets_storage = {}

def get_user_budgets(user_id: str) -> List[dict]:
    """Get all budgets for a user."""
    return budgets_storage.get(user_id, [])

def calculate_category_spending(user_id: str, category: str, month: str = None) -> float:
    """Calculate total spending for a specific category and month."""
    try:
        # Get access token for user
        access_token = get_access_token_for_user(user_id)
        if not access_token:
            return 0.0
        
        # Calculate date range for the month
        if month:
            start_date = datetime.strptime(month, '%Y-%m')
            end_date = (start_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        else:
            # Current month
            now = datetime.now()
            start_date = now.replace(day=1)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        # Get transactions for the month
        transactions_response = get_transactions(
            access_token,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            1000
        )
        
        if not transactions_response or 'transactions' not in transactions_response:
            return 0.0
        
        transactions = transactions_response['transactions']
        total_spent = 0.0
        
        for transaction in transactions:
            if transaction.get('amount') and transaction.get('amount') < 0:  # Only spending transactions
                transaction_category = transaction.get('category', ['Other'])[0] if transaction.get('category') else 'Other'
                if transaction_category == category:
                    total_spent += abs(transaction['amount'])
        
        return total_spent
        
    except Exception as e:
        logger.error(f"❌ Error calculating category spending: {str(e)}")
        return 0.0

class WeeklyEmailScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()
        logger.info("🚀 Weekly email scheduler started")
        
    def schedule_weekly_emails(self):
        """Schedule weekly email summaries to run every Monday at 9 AM."""
        self.scheduler.add_job(
            func=self.send_weekly_summaries,
            trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
            id='weekly_email_summary',
            name='Send weekly budget summary emails',
            replace_existing=True
        )
        logger.info("📅 Weekly email summaries scheduled for Mondays at 9 AM")
    
    def send_weekly_summaries(self):
        """Send weekly budget summary emails to all opted-in users."""
        logger.info("📧 Starting weekly email summary job")
        
        # Get all users who have opted in for weekly emails
        opted_in_users = [
            user_id for user_id, prefs in user_preferences.items()
            if prefs.get('weekly_email_summary', False)
        ]
        
        logger.info(f"📧 Found {len(opted_in_users)} users opted in for weekly emails")
        
        for user_id in opted_in_users:
            try:
                self.send_weekly_summary_for_user(user_id)
            except Exception as e:
                logger.error(f"❌ Failed to send weekly summary for user {user_id}: {str(e)}")
        
        logger.info("✅ Weekly email summary job completed")
    
    def send_weekly_summary_for_user(self, user_id: str):
        """Send weekly budget summary email for a specific user."""
        logger.info(f"📧 Generating weekly summary for user: {user_id}")
        
        # Calculate date range for the past week
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=7)
        
        # Get user's transactions for the past week
        transactions = self.get_user_transactions_for_week(user_id, start_date, end_date)
        
        if not transactions:
            logger.info(f"ℹ️ No transactions found for user {user_id} in the past week")
            return
        
        # Calculate summary data
        summary_data = self.calculate_weekly_summary(user_id, transactions, start_date, end_date)
        
        # Get user data
        user_data = self.get_user_data(user_id)
        
        # Generate and send email
        html_content = email_service.generate_weekly_summary_html(user_data, summary_data)
        
        if user_data.get('email'):
            success = email_service.send_email(
                to_email=user_data['email'],
                subject="Your LivyFlow Weekly Budget Summary",
                html_content=html_content
            )
            
            if success:
                logger.info(f"✅ Weekly summary email sent to user {user_id}")
            else:
                logger.error(f"❌ Failed to send weekly summary email to user {user_id}")
        else:
            logger.warning(f"⚠️ No email address found for user {user_id}")
    
    def get_user_transactions_for_week(self, user_id: str, start_date, end_date) -> List[Dict]:
        """Get user's transactions for the specified week."""
        try:
            # Check if user has Plaid access token
            access_token = get_access_token_for_user(user_id)
            
            if access_token:
                # Get Plaid transactions
                transactions = get_transactions(
                    access_token=access_token,
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d'),
                    count=500
                )
                
                if transactions and 'transactions' in transactions:
                    return transactions['transactions']
            
            # Fallback to manual transactions (if any)
            # For now, return empty list - in production, you'd fetch from database
            return []
            
        except Exception as e:
            logger.error(f"❌ Error fetching transactions for user {user_id}: {str(e)}")
            return []
    
    def calculate_weekly_summary(self, user_id: str, transactions: List[Dict], start_date, end_date) -> Dict:
        """Calculate weekly spending summary from transactions."""
        total_spent = 0
        category_spending = {}
        
        # Process transactions
        for transaction in transactions:
            amount = abs(float(transaction.get('amount', 0)))
            category = transaction.get('category', ['Other'])[0] if transaction.get('category') else 'Other'
            
            total_spent += amount
            
            if category not in category_spending:
                category_spending[category] = 0
            category_spending[category] += amount
        
        # Get top 3 spending categories
        top_categories = sorted(
            [{'name': cat, 'amount': amount} for cat, amount in category_spending.items()],
            key=lambda x: x['amount'],
            reverse=True
        )[:3]
        
        # Check for exceeded budgets
        exceeded_budgets = self.check_exceeded_budgets(user_id, category_spending)
        
        # Generate encouragement message
        encouragement = self.generate_encouragement(total_spent, exceeded_budgets)
        
        return {
            'week_range': f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}",
            'total_spent': total_spent,
            'top_categories': top_categories,
            'exceeded_budgets': exceeded_budgets,
            'encouragement_title': encouragement['title'],
            'encouragement_message': encouragement['message']
        }
    
    def check_exceeded_budgets(self, user_id: str, category_spending: Dict) -> List[Dict]:
        """Check if any budgets were exceeded this week."""
        exceeded_budgets = []
        user_budgets = get_user_budgets(user_id)
        
        for budget in user_budgets:
            category = budget.get('category')
            if category in category_spending:
                weekly_limit = budget.get('monthly_limit', 0) / 4  # Approximate weekly limit
                spent = category_spending[category]
                
                if spent > weekly_limit:
                    exceeded_budgets.append({
                        'category': category,
                        'spent': spent,
                        'limit': weekly_limit
                    })
        
        return exceeded_budgets
    
    def generate_encouragement(self, total_spent: float, exceeded_budgets: List[Dict]) -> Dict:
        """Generate encouragement message based on spending patterns."""
        if exceeded_budgets:
            return {
                'title': 'Keep Going! 💪',
                'message': f"You exceeded your budget in {len(exceeded_budgets)} categories this week. Don't worry - every week is a new opportunity to improve! Consider reviewing your spending habits and adjusting your budgets if needed."
            }
        elif total_spent < 100:
            return {
                'title': 'Amazing Week! 🌟',
                'message': f"Great job keeping your spending low at ${total_spent:.2f} this week! You're on track to reach your financial goals."
            }
        else:
            return {
                'title': 'Good Progress! 👍',
                'message': f"You spent ${total_spent:.2f} this week. Keep monitoring your spending to stay within your budget goals."
            }
    
    def get_user_data(self, user_id: str) -> Dict:
        """Get user data for email personalization."""
        # In production, fetch from database
        # For now, return basic data
        return {
            'name': 'there',  # Would be fetched from user profile
            'email': 'user@example.com'  # Would be fetched from user profile
        }
    
    def set_user_preference(self, user_id: str, preference: str, value: bool):
        """Set user preference for email notifications."""
        if user_id not in user_preferences:
            user_preferences[user_id] = {}
        
        user_preferences[user_id][preference] = value
        logger.info(f"✅ Set {preference}={value} for user {user_id}")
    
    def get_user_preference(self, user_id: str, preference: str) -> bool:
        """Get user preference for email notifications."""
        return user_preferences.get(user_id, {}).get(preference, False)
    
    def get_all_user_preferences(self, user_id: str) -> Dict:
        """Get all preferences for a user."""
        return user_preferences.get(user_id, {})

# Global scheduler instance
weekly_scheduler = WeeklyEmailScheduler() 