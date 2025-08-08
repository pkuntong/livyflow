"""
Synthetic Monitoring System
Automated testing of critical user journeys and uptime monitoring
"""

import asyncio
import aiohttp
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

from .monitoring import metrics_collector, business_metrics
from .alerting import alert_manager, Alert, AlertSeverity, AlertStatus
from .logging_config import business_logger

class CheckType(Enum):
    HTTP_GET = "http_get"
    HTTP_POST = "http_post"
    API_ENDPOINT = "api_endpoint"
    USER_JOURNEY = "user_journey"
    TRANSACTION_FLOW = "transaction_flow"

class CheckStatus(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    ERROR = "error"

@dataclass
class SyntheticCheck:
    """Definition of a synthetic monitoring check"""
    id: str
    name: str
    description: str
    check_type: CheckType
    url: str
    method: str = "GET"
    headers: Dict[str, str] = None
    body: Dict[str, Any] = None
    timeout_seconds: int = 30
    expected_status: int = 200
    expected_response_time_ms: int = 5000
    expected_content: Optional[str] = None
    interval_minutes: int = 5
    enabled: bool = True
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.headers is None:
            self.headers = {}
        if self.tags is None:
            self.tags = {}

@dataclass
class CheckResult:
    """Result of a synthetic check"""
    check_id: str
    check_name: str
    status: CheckStatus
    response_time_ms: float
    response_status: Optional[int]
    response_size: int
    error_message: Optional[str]
    timestamp: datetime
    details: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}

@dataclass
class UserJourney:
    """Definition of a multi-step user journey"""
    id: str
    name: str
    description: str
    steps: List[Dict[str, Any]]
    timeout_seconds: int = 120
    interval_minutes: int = 15
    enabled: bool = True
    critical: bool = False

class SyntheticMonitor:
    """Main synthetic monitoring system"""
    
    def __init__(self):
        self.checks: Dict[str, SyntheticCheck] = {}
        self.journeys: Dict[str, UserJourney] = {}
        self.results: Dict[str, List[CheckResult]] = {}
        self.running = False
        self.tasks: List[asyncio.Task] = []
        
        # Setup default checks
        self._setup_default_checks()
        self._setup_user_journeys()
    
    def _setup_default_checks(self):
        """Setup default monitoring checks for LivyFlow"""
        
        # Health check endpoints
        health_check = SyntheticCheck(
            id="health_check",
            name="Health Check",
            description="Basic health endpoint check",
            check_type=CheckType.HTTP_GET,
            url="/api/monitoring/health",
            expected_status=200,
            expected_response_time_ms=1000,
            interval_minutes=1
        )
        
        # API availability checks
        api_checks = [
            SyntheticCheck(
                id="auth_api",
                name="Authentication API",
                description="Check auth endpoint availability",
                check_type=CheckType.API_ENDPOINT,
                url="/api/auth/status",
                expected_status=200,
                expected_response_time_ms=2000,
                interval_minutes=5
            ),
            SyntheticCheck(
                id="transactions_api",
                name="Transactions API",
                description="Check transactions endpoint",
                check_type=CheckType.API_ENDPOINT,
                url="/api/transactions/health",
                expected_status=200,
                expected_response_time_ms=3000,
                interval_minutes=5
            ),
            SyntheticCheck(
                id="budgets_api",
                name="Budgets API",
                description="Check budgets endpoint",
                check_type=CheckType.API_ENDPOINT,
                url="/api/budgets/health",
                expected_status=200,
                expected_response_time_ms=2000,
                interval_minutes=5
            ),
            SyntheticCheck(
                id="plaid_api",
                name="Plaid Integration",
                description="Check Plaid integration status",
                check_type=CheckType.API_ENDPOINT,
                url="/api/plaid/health",
                expected_status=200,
                expected_response_time_ms=5000,
                interval_minutes=10,
                tags={"critical": "true", "external": "true"}
            )
        ]
        
        # Add all checks
        for check in [health_check] + api_checks:
            self.add_check(check)
    
    def _setup_user_journeys(self):
        """Setup critical user journey tests"""
        
        # User registration journey
        registration_journey = UserJourney(
            id="user_registration",
            name="User Registration Flow",
            description="Complete user registration process",
            steps=[
                {
                    "name": "Load registration page",
                    "method": "GET",
                    "url": "/signup",
                    "expected_status": 200
                },
                {
                    "name": "Submit registration form",
                    "method": "POST",
                    "url": "/api/auth/register",
                    "body": {
                        "email": "test@example.com",
                        "password": "TestPassword123",
                        "name": "Test User"
                    },
                    "expected_status": 201
                },
                {
                    "name": "Verify email sent",
                    "method": "GET",
                    "url": "/api/auth/verify-status",
                    "expected_status": 200
                }
            ],
            interval_minutes=30,
            critical=True
        )
        
        # Bank connection journey
        bank_connection_journey = UserJourney(
            id="bank_connection",
            name="Bank Account Connection",
            description="Connect bank account via Plaid",
            steps=[
                {
                    "name": "Create link token",
                    "method": "POST",
                    "url": "/api/plaid/create_link_token",
                    "expected_status": 200,
                    "expected_content": "link_token"
                },
                {
                    "name": "Exchange public token",
                    "method": "POST",
                    "url": "/api/plaid/exchange_public_token",
                    "body": {"public_token": "test_token"},
                    "expected_status": 200
                }
            ],
            interval_minutes=60,
            critical=True
        )
        
        # Transaction retrieval journey
        transaction_journey = UserJourney(
            id="transaction_retrieval",
            name="Transaction Data Retrieval",
            description="Fetch and display transaction data",
            steps=[
                {
                    "name": "Get transactions",
                    "method": "GET",
                    "url": "/api/transactions",
                    "expected_status": 200
                },
                {
                    "name": "Get transaction categories",
                    "method": "GET",
                    "url": "/api/transactions/categories",
                    "expected_status": 200
                },
                {
                    "name": "Get monthly summary",
                    "method": "GET",
                    "url": "/api/transactions/summary",
                    "expected_status": 200
                }
            ],
            interval_minutes=15
        )
        
        # Budget management journey
        budget_journey = UserJourney(
            id="budget_management",
            name="Budget Management Flow",
            description="Create and manage budgets",
            steps=[
                {
                    "name": "Get budget categories",
                    "method": "GET",
                    "url": "/api/budgets/categories",
                    "expected_status": 200
                },
                {
                    "name": "Create budget",
                    "method": "POST",
                    "url": "/api/budgets",
                    "body": {
                        "category": "groceries",
                        "amount": 500,
                        "period": "monthly"
                    },
                    "expected_status": 201
                },
                {
                    "name": "Get budget status",
                    "method": "GET",
                    "url": "/api/budgets/status",
                    "expected_status": 200
                }
            ],
            interval_minutes=45
        )
        
        # Add all journeys
        for journey in [registration_journey, bank_connection_journey, transaction_journey, budget_journey]:
            self.add_journey(journey)
    
    def add_check(self, check: SyntheticCheck):
        """Add a synthetic check"""
        self.checks[check.id] = check
        if check.id not in self.results:
            self.results[check.id] = []
    
    def add_journey(self, journey: UserJourney):
        """Add a user journey"""
        self.journeys[journey.id] = journey
        if journey.id not in self.results:
            self.results[journey.id] = []
    
    async def start_monitoring(self):
        """Start synthetic monitoring"""
        self.running = True
        
        # Start individual checks
        for check in self.checks.values():
            if check.enabled:
                task = asyncio.create_task(self._run_check_loop(check))
                self.tasks.append(task)
        
        # Start user journey monitoring
        for journey in self.journeys.values():
            if journey.enabled:
                task = asyncio.create_task(self._run_journey_loop(journey))
                self.tasks.append(task)
        
        logging.info(f"Started synthetic monitoring with {len(self.tasks)} monitoring tasks")
    
    async def stop_monitoring(self):
        """Stop synthetic monitoring"""
        self.running = False
        
        # Cancel all tasks
        for task in self.tasks:
            task.cancel()
        
        # Wait for tasks to complete
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()
        
        logging.info("Stopped synthetic monitoring")
    
    async def _run_check_loop(self, check: SyntheticCheck):
        """Run a single check in a loop"""
        while self.running:
            try:
                result = await self._execute_check(check)
                self._store_result(check.id, result)
                self._process_result(result)
                
                # Wait for next interval
                await asyncio.sleep(check.interval_minutes * 60)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in check loop for {check.name}: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error
    
    async def _run_journey_loop(self, journey: UserJourney):
        """Run a user journey in a loop"""
        while self.running:
            try:
                result = await self._execute_journey(journey)
                self._store_result(journey.id, result)
                self._process_result(result)
                
                # Wait for next interval
                await asyncio.sleep(journey.interval_minutes * 60)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in journey loop for {journey.name}: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def _execute_check(self, check: SyntheticCheck) -> CheckResult:
        """Execute a single synthetic check"""
        start_time = time.time()
        
        try:
            timeout = aiohttp.ClientTimeout(total=check.timeout_seconds)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                # Prepare request
                kwargs = {
                    'headers': check.headers,
                    'timeout': timeout
                }
                
                if check.method.upper() == 'POST' and check.body:
                    kwargs['json'] = check.body
                
                # Make request
                async with session.request(check.method, check.url, **kwargs) as response:
                    response_time = (time.time() - start_time) * 1000
                    content = await response.text()
                    
                    # Determine status
                    status = CheckStatus.SUCCESS
                    error_message = None
                    
                    if response.status != check.expected_status:
                        status = CheckStatus.FAILURE
                        error_message = f"Expected status {check.expected_status}, got {response.status}"
                    elif response_time > check.expected_response_time_ms:
                        status = CheckStatus.FAILURE
                        error_message = f"Response time {response_time:.0f}ms exceeded limit {check.expected_response_time_ms}ms"
                    elif check.expected_content and check.expected_content not in content:
                        status = CheckStatus.FAILURE
                        error_message = f"Expected content '{check.expected_content}' not found"
                    
                    return CheckResult(
                        check_id=check.id,
                        check_name=check.name,
                        status=status,
                        response_time_ms=response_time,
                        response_status=response.status,
                        response_size=len(content),
                        error_message=error_message,
                        timestamp=datetime.utcnow(),
                        details={
                            'url': check.url,
                            'method': check.method,
                            'response_headers': dict(response.headers),
                            'content_preview': content[:200] if content else None
                        }
                    )
        
        except asyncio.TimeoutError:
            return CheckResult(
                check_id=check.id,
                check_name=check.name,
                status=CheckStatus.TIMEOUT,
                response_time_ms=(time.time() - start_time) * 1000,
                response_status=None,
                response_size=0,
                error_message=f"Request timed out after {check.timeout_seconds} seconds",
                timestamp=datetime.utcnow()
            )
        
        except Exception as e:
            return CheckResult(
                check_id=check.id,
                check_name=check.name,
                status=CheckStatus.ERROR,
                response_time_ms=(time.time() - start_time) * 1000,
                response_status=None,
                response_size=0,
                error_message=str(e),
                timestamp=datetime.utcnow()
            )
    
    async def _execute_journey(self, journey: UserJourney) -> CheckResult:
        """Execute a user journey with multiple steps"""
        start_time = time.time()
        session_data = {}
        
        try:
            timeout = aiohttp.ClientTimeout(total=journey.timeout_seconds)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                for i, step in enumerate(journey.steps):
                    step_start = time.time()
                    
                    # Prepare request
                    kwargs = {
                        'headers': step.get('headers', {}),
                    }
                    
                    if step.get('body'):
                        kwargs['json'] = step['body']
                    
                    # Make request
                    async with session.request(
                        step['method'], 
                        step['url'], 
                        **kwargs
                    ) as response:
                        step_time = (time.time() - step_start) * 1000
                        content = await response.text()
                        
                        # Store step result
                        session_data[f"step_{i+1}"] = {
                            'name': step['name'],
                            'status': response.status,
                            'response_time_ms': step_time,
                            'success': response.status == step.get('expected_status', 200)
                        }
                        
                        # Check step success
                        if response.status != step.get('expected_status', 200):
                            total_time = (time.time() - start_time) * 1000
                            return CheckResult(
                                check_id=journey.id,
                                check_name=journey.name,
                                status=CheckStatus.FAILURE,
                                response_time_ms=total_time,
                                response_status=response.status,
                                response_size=len(content),
                                error_message=f"Step '{step['name']}' failed: expected {step.get('expected_status', 200)}, got {response.status}",
                                timestamp=datetime.utcnow(),
                                details=session_data
                            )
                        
                        # Check expected content
                        expected_content = step.get('expected_content')
                        if expected_content and expected_content not in content:
                            total_time = (time.time() - start_time) * 1000
                            return CheckResult(
                                check_id=journey.id,
                                check_name=journey.name,
                                status=CheckStatus.FAILURE,
                                response_time_ms=total_time,
                                response_status=response.status,
                                response_size=len(content),
                                error_message=f"Step '{step['name']}' failed: expected content not found",
                                timestamp=datetime.utcnow(),
                                details=session_data
                            )
                
                # All steps successful
                total_time = (time.time() - start_time) * 1000
                return CheckResult(
                    check_id=journey.id,
                    check_name=journey.name,
                    status=CheckStatus.SUCCESS,
                    response_time_ms=total_time,
                    response_status=200,
                    response_size=0,
                    error_message=None,
                    timestamp=datetime.utcnow(),
                    details=session_data
                )
        
        except asyncio.TimeoutError:
            return CheckResult(
                check_id=journey.id,
                check_name=journey.name,
                status=CheckStatus.TIMEOUT,
                response_time_ms=(time.time() - start_time) * 1000,
                response_status=None,
                response_size=0,
                error_message=f"Journey timed out after {journey.timeout_seconds} seconds",
                timestamp=datetime.utcnow(),
                details=session_data
            )
        
        except Exception as e:
            return CheckResult(
                check_id=journey.id,
                check_name=journey.name,
                status=CheckStatus.ERROR,
                response_time_ms=(time.time() - start_time) * 1000,
                response_status=None,
                response_size=0,
                error_message=str(e),
                timestamp=datetime.utcnow(),
                details=session_data
            )
    
    def _store_result(self, check_id: str, result: CheckResult):
        """Store check result"""
        if check_id not in self.results:
            self.results[check_id] = []
        
        self.results[check_id].append(result)
        
        # Keep only recent results (last 1000)
        if len(self.results[check_id]) > 1000:
            self.results[check_id].pop(0)
    
    def _process_result(self, result: CheckResult):
        """Process check result and update metrics"""
        # Update metrics
        metrics_collector.increment_counter(
            'synthetic_checks_total',
            tags={
                'check_id': result.check_id,
                'status': result.status.value
            }
        )
        
        metrics_collector.record_histogram(
            'synthetic_response_time_ms',
            result.response_time_ms,
            tags={'check_id': result.check_id}
        )
        
        # Track business metrics
        if result.status != CheckStatus.SUCCESS:
            business_metrics.track_api_usage(
                f"synthetic_{result.check_id}",
                'system',
                False,
                result.response_time_ms
            )
            
            # Create alert for failed checks
            self._create_failure_alert(result)
        else:
            business_metrics.track_api_usage(
                f"synthetic_{result.check_id}",
                'system',
                True,
                result.response_time_ms
            )
        
        # Log result
        business_logger.log_user_action(
            'system',
            'synthetic_check_completed',
            check_id=result.check_id,
            check_name=result.check_name,
            status=result.status.value,
            response_time_ms=result.response_time_ms,
            error_message=result.error_message
        )
    
    def _create_failure_alert(self, result: CheckResult):
        """Create alert for failed synthetic check"""
        severity = AlertSeverity.HIGH
        
        # Determine severity based on check type and failure
        check = self.checks.get(result.check_id)
        journey = self.journeys.get(result.check_id)
        
        if journey and journey.critical:
            severity = AlertSeverity.CRITICAL
        elif check and check.tags.get('critical') == 'true':
            severity = AlertSeverity.CRITICAL
        elif result.status == CheckStatus.TIMEOUT:
            severity = AlertSeverity.HIGH
        else:
            severity = AlertSeverity.MEDIUM
        
        # Create alert
        alert_id = f"synthetic_alert_{int(time.time() * 1000)}_{result.check_id}"
        alert = Alert(
            id=alert_id,
            rule_id=f"synthetic_{result.check_id}",
            rule_name=f"Synthetic Check Failure: {result.check_name}",
            message=f"Synthetic check '{result.check_name}' failed: {result.error_message}",
            severity=severity,
            status=AlertStatus.ACTIVE,
            metric_value=0,  # Binary success/failure
            threshold=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            context={
                'check_id': result.check_id,
                'check_type': 'synthetic',
                'response_time_ms': result.response_time_ms,
                'response_status': result.response_status,
                'failure_reason': result.error_message
            }
        )
        
        # Add to alert manager (if available)
        try:
            alert_manager.active_alerts[alert_id] = alert
            alert_manager.alert_history.append(alert)
        except Exception as e:
            logging.error(f"Failed to create synthetic check alert: {e}")
    
    def get_check_status(self, check_id: str) -> Dict[str, Any]:
        """Get status summary for a check"""
        results = self.results.get(check_id, [])
        if not results:
            return {'status': 'unknown', 'message': 'No results available'}
        
        recent_results = results[-10:]  # Last 10 results
        success_count = sum(1 for r in recent_results if r.status == CheckStatus.SUCCESS)
        avg_response_time = sum(r.response_time_ms for r in recent_results) / len(recent_results)
        
        latest_result = results[-1]
        
        return {
            'status': latest_result.status.value,
            'success_rate': (success_count / len(recent_results)) * 100,
            'avg_response_time_ms': avg_response_time,
            'last_check': latest_result.timestamp.isoformat(),
            'last_error': latest_result.error_message,
            'total_checks': len(results)
        }
    
    def get_overall_status(self) -> Dict[str, Any]:
        """Get overall synthetic monitoring status"""
        total_checks = len(self.checks) + len(self.journeys)
        active_checks = sum(1 for c in self.checks.values() if c.enabled) + \
                       sum(1 for j in self.journeys.values() if j.enabled)
        
        # Calculate success rates
        success_rates = []
        for check_id in list(self.checks.keys()) + list(self.journeys.keys()):
            results = self.results.get(check_id, [])
            if results:
                recent_results = results[-10:]
                success_count = sum(1 for r in recent_results if r.status == CheckStatus.SUCCESS)
                success_rates.append((success_count / len(recent_results)) * 100)
        
        overall_success_rate = sum(success_rates) / len(success_rates) if success_rates else 0
        
        return {
            'total_checks': total_checks,
            'active_checks': active_checks,
            'overall_success_rate': overall_success_rate,
            'monitoring_status': 'running' if self.running else 'stopped',
            'last_updated': datetime.utcnow().isoformat()
        }

# Global synthetic monitor instance
synthetic_monitor = SyntheticMonitor()

async def initialize_synthetic_monitoring():
    """Initialize and start synthetic monitoring"""
    await synthetic_monitor.start_monitoring()
    logging.info("Synthetic monitoring initialized")