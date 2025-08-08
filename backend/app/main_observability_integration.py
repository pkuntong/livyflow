"""
Integration file to add observability to existing FastAPI application
Include this in your main.py file to enable comprehensive monitoring
"""

from app.observability import (
    observability_manager,
    lifespan,
    track_business_event,
    track_financial_transaction,
    track_api_performance,
    track_user_journey,
    monitor_function
)

# Example of how to integrate observability into your existing FastAPI app

def setup_observability(app):
    """
    Setup observability for your FastAPI application
    Call this function after creating your FastAPI app instance
    """
    
    # Method 1: Using lifespan context manager (FastAPI 0.93+)
    # Replace your app creation with:
    # app = FastAPI(lifespan=lifespan, title="LivyFlow API", version="1.0.0")
    
    # Method 2: Manual initialization (for older FastAPI versions)
    @app.on_event("startup")
    async def startup_observability():
        await observability_manager.initialize(app)
    
    @app.on_event("shutdown")
    async def shutdown_observability():
        await observability_manager.shutdown()

# Example usage in your existing endpoints:

# In your transaction endpoints:
@monitor_function("create_transaction")
async def create_transaction(transaction_data, current_user):
    # Your existing logic here
    
    # Track business event
    track_financial_transaction(
        user_id=current_user.uid,
        amount=transaction_data.amount,
        currency="USD",
        category=transaction_data.category,
        transaction_id=transaction_data.id,
        merchant=transaction_data.merchant_name
    )
    
    # Track user journey
    track_user_journey(
        user_id=current_user.uid,
        journey_step="transaction_created",
        category=transaction_data.category,
        amount=transaction_data.amount
    )
    
    return {"status": "success"}

# In your budget endpoints:
@monitor_function("create_budget")
async def create_budget(budget_data, current_user):
    # Your existing logic here
    
    # Track business event
    track_business_event(
        "budget_created",
        user_id=current_user.uid,
        category=budget_data.category,
        amount=budget_data.amount,
        period=budget_data.period
    )
    
    return {"status": "success"}

# In your Plaid endpoints:
@monitor_function("plaid_link_token")
async def create_link_token_endpoint(current_user):
    import time
    start_time = time.time()
    
    try:
        # Your existing Plaid logic here
        result = {"link_token": "placeholder"}
        
        # Track API performance
        track_api_performance(
            endpoint="/api/plaid/create_link_token",
            user_id=current_user.uid,
            duration_ms=(time.time() - start_time) * 1000,
            success=True
        )
        
        # Track user journey
        track_user_journey(
            user_id=current_user.uid,
            journey_step="bank_connection_started"
        )
        
        return result
        
    except Exception as e:
        # Track failed API call
        track_api_performance(
            endpoint="/api/plaid/create_link_token",
            user_id=current_user.uid,
            duration_ms=(time.time() - start_time) * 1000,
            success=False,
            error=str(e)
        )
        raise

# In your authentication endpoints:
@monitor_function("user_login")
async def login_endpoint(login_data):
    # Your existing auth logic here
    
    # Track business event
    track_business_event(
        "user_login",
        user_id=login_data.user_id,  # After successful auth
        method="email_password",
        timestamp=time.time()
    )
    
    # Track user journey
    track_user_journey(
        user_id=login_data.user_id,
        journey_step="login_completed"
    )
    
    return {"status": "success", "token": "jwt_token_here"}

# For middleware integration:
def add_user_context_to_monitoring():
    """
    Example middleware to add user context to monitoring
    """
    from fastapi import Request
    from starlette.middleware.base import BaseHTTPMiddleware
    
    class UserContextMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            # Extract user info from request (JWT, session, etc.)
            user_id = request.headers.get("X-User-ID")  # Example
            
            # Add to request state for monitoring
            request.state.user_id = user_id
            
            response = await call_next(request)
            return response
    
    return UserContextMiddleware

# Health check endpoints that can be used with your existing app:
def add_health_endpoints(app):
    """Add health check endpoints to your existing app"""
    
    @app.get("/health")
    async def health_check():
        health_status = await observability_manager.get_health_status()
        return health_status
    
    @app.get("/metrics")
    async def get_metrics():
        from app.monitoring import metrics_collector
        return metrics_collector.get_metrics_summary()
    
    @app.get("/status")
    async def get_status():
        return {
            "status": "operational",
            "timestamp": time.time(),
            "version": "1.0.0"
        }

# Example of custom business metrics:
def track_livyflow_specific_events():
    """Examples of LivyFlow-specific event tracking"""
    
    def track_budget_alert(user_id: str, budget_id: str, utilization: float):
        track_business_event(
            "budget_alert_triggered",
            user_id=user_id,
            budget_id=budget_id,
            utilization_percent=utilization,
            severity="high" if utilization > 100 else "medium"
        )
    
    def track_subscription_detected(user_id: str, merchant: str, amount: float):
        track_business_event(
            "subscription_detected",
            user_id=user_id,
            merchant=merchant,
            amount=amount,
            detection_method="pattern_analysis"
        )
    
    def track_insights_generated(user_id: str, insight_type: str, confidence: float):
        track_business_event(
            "insight_generated",
            user_id=user_id,
            insight_type=insight_type,
            confidence_score=confidence
        )
    
    def track_export_report(user_id: str, report_type: str, format: str):
        track_business_event(
            "report_exported",
            user_id=user_id,
            report_type=report_type,
            format=format
        )
    
    return {
        "track_budget_alert": track_budget_alert,
        "track_subscription_detected": track_subscription_detected,
        "track_insights_generated": track_insights_generated,
        "track_export_report": track_export_report
    }

# Configuration for different environments:
OBSERVABILITY_CONFIG = {
    "development": {
        "log_level": "INFO",
        "metrics_enabled": True,
        "synthetic_monitoring_enabled": True,
        "alerting_enabled": False,  # Disable alerts in dev
        "log_aggregation_enabled": True
    },
    "staging": {
        "log_level": "INFO",
        "metrics_enabled": True,
        "synthetic_monitoring_enabled": True,
        "alerting_enabled": True,
        "log_aggregation_enabled": True
    },
    "production": {
        "log_level": "WARNING",
        "metrics_enabled": True,
        "synthetic_monitoring_enabled": True,
        "alerting_enabled": True,
        "log_aggregation_enabled": True
    }
}

def configure_observability_for_environment(environment: str = "development"):
    """Configure observability based on environment"""
    config = OBSERVABILITY_CONFIG.get(environment, OBSERVABILITY_CONFIG["development"])
    
    import logging
    logging.getLogger().setLevel(getattr(logging, config["log_level"]))
    
    return config

# Example of how to add to existing main.py:
"""
# In your main.py, add these imports at the top:
from app.main_observability_integration import (
    setup_observability,
    add_health_endpoints,
    configure_observability_for_environment
)

# After creating your FastAPI app:
app = FastAPI(title="LivyFlow API", version="1.0.0")

# Configure for your environment
env_config = configure_observability_for_environment(os.getenv("ENVIRONMENT", "development"))

# Setup observability
setup_observability(app)

# Add health endpoints
add_health_endpoints(app)

# Your existing middleware and routes...
"""