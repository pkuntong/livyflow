from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.configuration import Configuration
from datetime import datetime, timedelta
import logging
from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

def get_plaid_client():
    """Initialize and return a Plaid client with configuration from environment variables."""
    logger.info("🔧 Initializing Plaid client")
    logger.info(f"🌍 Environment: {settings.PLAID_ENV}")
    
    # Check if required environment variables are set
    if not settings.PLAID_CLIENT_ID:
        error_msg = "PLAID_CLIENT_ID environment variable is not set"
        logger.error(f"❌ {error_msg}")
        raise ValueError(error_msg)
    
    if not settings.PLAID_SECRET:
        error_msg = "PLAID_SECRET environment variable is not set"
        logger.error(f"❌ {error_msg}")
        raise ValueError(error_msg)
    
    logger.info(f"🆔 Client ID: {settings.PLAID_CLIENT_ID[:10]}...")
    
    # Map environment to correct Plaid host URL
    host_mapping = {
        'sandbox': 'https://sandbox.plaid.com',
        'development': 'https://development.plaid.com',
        'production': 'https://production.plaid.com'
    }
    
    host_url = host_mapping.get(settings.PLAID_ENV, 'https://sandbox.plaid.com')
    logger.info(f"🌐 Using Plaid host: {host_url}")
    
    configuration = Configuration(
        host=host_url,
        api_key={
            'clientId': settings.PLAID_CLIENT_ID,
            'secret': settings.PLAID_SECRET,
        }
    )
    
    api_client = plaid_api.ApiClient(configuration)
    client = plaid_api.PlaidApi(api_client)
    logger.info("✅ Plaid client initialized successfully")
    return client

def create_link_token(user_id: str):
    """Create a Plaid link token for the specified user."""
    logger.info(f"🔄 Creating link token for user: {user_id}")
    
    client = get_plaid_client()
    
    request = LinkTokenCreateRequest(
        products=[Products("auth"), Products("transactions")],
        client_name="LivyFlow",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(
            client_user_id=user_id
        )
    )
    
    logger.info("📤 Link token request details:")
    logger.info(f"   - Products: {[p.value for p in request.products]}")
    logger.info(f"   - Client name: {request.client_name}")
    logger.info(f"   - Country codes: {[c.value for c in request.country_codes]}")
    logger.info(f"   - Language: {request.language}")
    logger.info(f"   - User ID: {request.user.client_user_id}")
    
    logger.info("🌐 Making Plaid API call: link_token_create")
    response = client.link_token_create(request)
    
    logger.info("✅ Link token created successfully")
    logger.info(f"🔗 Link token: {response.link_token[:20]}...")
    
    return response.link_token

def exchange_public_token(public_token: str, user_id: str):
    """Exchange a public token for an access token."""
    logger.info(f"🔄 Exchanging public token for user: {user_id}")
    logger.info(f"🔑 Public token: {public_token[:20]}...")
    
    client = get_plaid_client()
    
    request = ItemPublicTokenExchangeRequest(
        public_token=public_token
    )
    
    logger.info("📤 Token exchange request details:")
    logger.info(f"   - Public token: {request.public_token[:20]}...")
    
    logger.info("🌐 Making Plaid API call: item_public_token_exchange")
    response = client.plaid_item_public_token_exchange(request)
    
    logger.info("✅ Public token exchanged successfully")
    logger.info(f"🔑 Access token: {response.access_token[:20]}...")
    logger.info(f"🆔 Item ID: {response.item_id}")
    
    # In a real application, you would store the access_token and item_id
    # in your database associated with the user_id
    logger.info("💾 Ready to save access token to database")
    
    return response

def get_transactions(access_token: str, start_date: str = None, end_date: str = None, count: int = 100):
    """Get transactions from Plaid using the access token."""
    logger.info("🔄 Fetching transactions from Plaid")
    logger.info(f"🔑 Access token: {access_token[:20]}...")
    logger.info(f"📅 Date range: {start_date} to {end_date}")
    logger.info(f"📊 Count: {count}")
    
    client = get_plaid_client()
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        logger.info(f"📅 Using default start date: {start_date}")
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
        logger.info(f"📅 Using default end date: {end_date}")
    
    request = TransactionsGetRequest(
        access_token=access_token,
        start_date=start_date,
        end_date=end_date,
        options=TransactionsGetRequestOptions(
            count=count,
            include_personal_finance_category=True
        )
    )
    
    logger.info("📤 Transactions request details:")
    logger.info(f"   - Access token: {request.access_token[:20]}...")
    logger.info(f"   - Start date: {request.start_date}")
    logger.info(f"   - End date: {request.end_date}")
    logger.info(f"   - Count: {request.options.count}")
    logger.info(f"   - Include categories: {request.options.include_personal_finance_category}")
    
    logger.info("🌐 Making Plaid API call: transactions_get")
    response = client.plaid_transactions_get(request)
    
    logger.info("✅ Transactions fetched successfully")
    logger.info(f"💰 Transaction count: {len(response.transactions)}")
    logger.info(f"📊 Total transactions: {response.total_transactions}")
    logger.info(f"🆔 Request ID: {response.request_id}")
    
    # Log sample transaction details
    if response.transactions:
        sample_txn = response.transactions[0]
        logger.info("📋 Sample transaction:")
        logger.info(f"   - Name: {sample_txn.name}")
        logger.info(f"   - Amount: {sample_txn.amount}")
        logger.info(f"   - Date: {sample_txn.date}")
        logger.info(f"   - Category: {sample_txn.category}")
    
    return response 