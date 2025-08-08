from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.configuration import Configuration
from plaid import Environment
from datetime import datetime, timedelta
import logging
from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# SECURITY WARNING: In-memory storage is NOT secure for production
# In production, use a secure database with encryption at rest
access_token_storage = {}

def store_access_token(user_id: str, access_token: str, item_id: str):
    """Store access token for a user (in-memory for development)."""
    access_token_storage[user_id] = {
        'access_token': access_token,
        'item_id': item_id,
        'stored_at': datetime.now().isoformat()
    }
    logger.info(f"Access token stored for user: {user_id[:8]}...")

def get_access_token_for_user(user_id: str):
    """Get access token for a user (from in-memory storage for development)."""
    if user_id not in access_token_storage:
        return None
    
    stored_data = access_token_storage[user_id]
    logger.info(f"Retrieved access token for user: {user_id[:8]}...")
    return stored_data['access_token']

def get_plaid_client():
    """Initialize and return a Plaid client with configuration from environment variables."""
    logger.info("🔧 Initializing Plaid client")
    
    # Validate required environment variables
    if not settings.PLAID_CLIENT_ID:
        error_msg = "PLAID_CLIENT_ID environment variable is not set"
        logger.error(f"❌ {error_msg}")
        raise ValueError(error_msg)
    
    if not settings.PLAID_SECRET:
        error_msg = "PLAID_SECRET environment variable is not set"
        logger.error(f"❌ {error_msg}")
        raise ValueError(error_msg)
    
    # Dynamically load the PLAID_ENV variable
    environment = settings.PLAID_ENV.lower()
    logger.info(f"🌍 Environment from config: {environment}")
    
    # Map environment to Plaid Environment enum
    if environment == "production":
        plaid_env = Environment.Production
        logger.info("🔒 Using Plaid Production environment")
    elif environment == "development":
        plaid_env = Environment.Development
        logger.info("🔒 Using Plaid Development environment")
    else:
        plaid_env = Environment.Sandbox
        logger.info("🔒 Using Plaid Sandbox environment")
    
    # Safety log to confirm the environment
    logger.info(f"🔒 [Plaid] Running in: {plaid_env}")
    
    logger.info(f"Client ID: {settings.PLAID_CLIENT_ID[:8]}...")
    logger.info(f"Secret configured: {'Yes' if settings.PLAID_SECRET else 'No'}")
    
    try:
        logger.info("🔧 Creating Plaid configuration...")
        configuration = Configuration(
            host=plaid_env,
            api_key={
                'clientId': settings.PLAID_CLIENT_ID,
                'secret': settings.PLAID_SECRET,
            }
        )
        logger.info("✅ Plaid configuration created")
        
        logger.info("🔧 Creating Plaid API client...")
        api_client = plaid_api.ApiClient(configuration)
        logger.info("✅ Plaid API client created")
        
        logger.info("🔧 Creating Plaid API instance...")
        client = plaid_api.PlaidApi(api_client)
        logger.info("✅ Plaid client initialized successfully")
        
        return client
    except Exception as e:
        logger.error(f"❌ Failed to initialize Plaid client: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        logger.error(f"❌ Environment: {environment}")
        logger.error(f"❌ Plaid env enum: {plaid_env}")
        logger.error(f"❌ Client ID length: {len(settings.PLAID_CLIENT_ID) if settings.PLAID_CLIENT_ID else 0}")
        logger.error(f"❌ Secret length: {len(settings.PLAID_SECRET) if settings.PLAID_SECRET else 0}")
        raise

def create_link_token(user_id: str):
    """Create a Plaid link token for the specified user."""
    logger.info(f"🔄 Creating link token for user: {user_id}")
    
    try:
        client = get_plaid_client()
        
        request_kwargs = {
            'products': [Products("auth"), Products("transactions")],
            'client_name': "LivyFlow",
            'country_codes': [CountryCode("US")],
            'language': "en",
            'user': LinkTokenCreateRequestUser(client_user_id=user_id)
        }
        # For OAuth-based institutions (e.g., Bank of America), Plaid requires a redirect_uri
        if settings.PLAID_REDIRECT_URI:
            request_kwargs['redirect_uri'] = settings.PLAID_REDIRECT_URI
            logger.info(f"🔗 Using redirect_uri: {settings.PLAID_REDIRECT_URI}")
        
        request = LinkTokenCreateRequest(**request_kwargs)
        
        logger.info("📤 Link token request details:")
        logger.info(f"   - Products: {[p.value for p in request.products]}")
        logger.info(f"   - Client name: {request.client_name}")
        logger.info(f"   - Country codes: {[c.value for c in request.country_codes]}")
        logger.info(f"   - Language: {request.language}")
        logger.info(f"   - User ID: {request.user.client_user_id}")
        if settings.PLAID_REDIRECT_URI:
            logger.info(f"   - Redirect URI: {settings.PLAID_REDIRECT_URI}")
        
        logger.info("🌐 Making Plaid API call: link_token_create")
        response = client.link_token_create(request)
        
        logger.info("Link token created successfully")
        logger.info(f"Link token: {response.link_token[:8]}...")
        
        return response.link_token
    except Exception as e:
        logger.error(f"❌ Failed to create link token: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise

def exchange_public_token(public_token: str, user_id: str):
    """Exchange a public token for an access token."""
    logger.info(f"🔄 Exchanging public token for user: {user_id}")
    logger.info(f"🔑 Public token: {public_token[:20]}...")
    
    try:
        client = get_plaid_client()
        
        request = ItemPublicTokenExchangeRequest(
            public_token=public_token
        )
        
        logger.info("📤 Token exchange request details:")
        logger.info(f"   - Public token: {request.public_token[:20]}...")
        
        logger.info("🌐 Making Plaid API call: item_public_token_exchange")
        response = client.item_public_token_exchange(request)
        
        logger.info("Public token exchanged successfully")
        logger.info(f"Access token: {response.access_token[:8]}...")
        logger.info(f"Item ID: {response.item_id[:8]}...")
        
        # In a real application, you would store the access_token and item_id
        # in your database associated with the user_id
        logger.info("💾 Ready to save access token to database")
        
        store_access_token(user_id, response.access_token, response.item_id)
        
        return response
    except Exception as e:
        logger.error(f"❌ Failed to exchange public token: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise

def get_accounts(access_token: str):
    """Get bank accounts from Plaid using the access token."""
    logger.info("🔄 Fetching accounts from Plaid")
    logger.info(f"🔑 Access token: {access_token[:20]}...")
    
    try:
        client = get_plaid_client()
        
        request = AccountsGetRequest(
            access_token=access_token
        )
        
        logger.info("📤 Accounts request details:")
        logger.info(f"   - Access token: {request.access_token[:20]}...")
        
        logger.info("🌐 Making Plaid API call: accounts_get")
        response = client.accounts_get(request)
        
        logger.info("Accounts fetched successfully")
        logger.info(f"Account count: {len(response.accounts)}")
        logger.info(f"Item ID: {response.item.item_id[:8]}...")
        logger.info(f"Institution: {response.item.institution_id}")
        
        # Log sample account details
        if response.accounts:
            sample_account = response.accounts[0]
            logger.info("📋 Sample account:")
            logger.info(f"   - Name: {sample_account.name}")
            logger.info(f"   - Type: {sample_account.type}")
            logger.info(f"   - Subtype: {sample_account.subtype}")
            logger.info(f"   - Mask: {sample_account.mask}")
            logger.info(f"   - Balance: {sample_account.balances.current}")
        
        return response
    except Exception as e:
        logger.error(f"❌ Failed to get accounts: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        raise

def get_transactions(access_token: str, start_date: str = None, end_date: str = None, count: int = 100):
    """Get transactions from Plaid using the access token."""
    logger.info("🔄 Fetching transactions from Plaid")
    logger.info(f"🔑 Access token: {access_token[:20]}...")
    logger.info(f"📅 Date range: {start_date} to {end_date}")
    logger.info(f"📊 Count: {count}")
    
    try:
        # Validate access token
        if not access_token or len(access_token.strip()) == 0:
            logger.error("❌ Access token is empty or None")
            raise ValueError("Access token is required")
        
        logger.info("🔧 Initializing Plaid client...")
        client = get_plaid_client()
        logger.info("✅ Plaid client initialized")
        
        # Validate and set default dates
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            logger.info(f"📅 Using default start date: {start_date}")
        else:
            # Validate start_date format
            try:
                datetime.strptime(start_date, '%Y-%m-%d')
                logger.info(f"✅ Start date format is valid: {start_date}")
            except ValueError:
                logger.error(f"❌ Invalid start_date format: {start_date}")
                raise ValueError(f"Invalid start_date format. Expected YYYY-MM-DD, got: {start_date}")
        
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
            logger.info(f"📅 Using default end date: {end_date}")
        else:
            # Validate end_date format
            try:
                datetime.strptime(end_date, '%Y-%m-%d')
                logger.info(f"✅ End date format is valid: {end_date}")
            except ValueError:
                logger.error(f"❌ Invalid end_date format: {end_date}")
                raise ValueError(f"Invalid end_date format. Expected YYYY-MM-DD, got: {end_date}")
        
        # Validate count
        if count < 1 or count > 100:
            logger.error(f"❌ Invalid count value: {count}")
            raise ValueError("Count must be between 1 and 100")
        
        logger.info("📤 Building transactions request...")
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
        try:
            response = client.transactions_get(request)
            logger.info("✅ Plaid API call successful")
        except Exception as api_error:
            logger.error(f"❌ Plaid API call failed: {str(api_error)}")
            logger.error(f"❌ Error type: {type(api_error).__name__}")
            
            # Log detailed error information
            if hasattr(api_error, 'body'):
                logger.error(f"❌ Plaid error body: {api_error.body}")
                if isinstance(api_error.body, dict):
                    logger.error(f"❌ Plaid error_code: {api_error.body.get('error_code', 'UNKNOWN')}")
                    logger.error(f"❌ Plaid error_message: {api_error.body.get('error_message', 'No message')}")
                    logger.error(f"❌ Plaid display_message: {api_error.body.get('display_message', 'No display message')}")
                    logger.error(f"❌ Plaid request_id: {api_error.body.get('request_id', 'No request ID')}")
            
            # Re-raise the error with more context
            raise
        
        logger.info("Transactions fetched successfully")
        logger.info(f"Transaction count: {len(response.transactions)}")
        logger.info(f"Total transactions: {response.total_transactions}")
        logger.info(f"Request ID: {response.request_id[:8]}...")
        
        # Log sample transaction details
        if response.transactions:
            sample_txn = response.transactions[0]
            logger.info("📋 Sample transaction:")
            logger.info(f"   - Name: {sample_txn.name}")
            logger.info(f"   - Amount: {sample_txn.amount}")
            logger.info(f"   - Date: {sample_txn.date}")
            logger.info(f"   - Category: {sample_txn.category}")
            logger.info(f"   - Transaction ID: {sample_txn.transaction_id}")
        else:
            logger.info("📋 No transactions found in response")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Failed to get transactions: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        
        # Log additional context for debugging
        logger.error(f"❌ Access token length: {len(access_token) if access_token else 0}")
        logger.error(f"❌ Start date: {start_date}")
        logger.error(f"❌ End date: {end_date}")
        logger.error(f"❌ Count: {count}")
        
        # Re-raise the error
        raise 