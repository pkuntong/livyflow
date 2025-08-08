"""
Backend Monitoring and Observability Module
Provides comprehensive monitoring for FastAPI backend including metrics, logging, and health checks
"""

import time
import json
import logging
import psutil
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import uuid

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class MetricData:
    """Structured metric data"""
    name: str
    value: float
    tags: Dict[str, str]
    timestamp: float
    metric_type: str  # counter, gauge, histogram

@dataclass
class RequestMetrics:
    """Request-level metrics"""
    request_id: str
    method: str
    path: str
    status_code: int
    duration_ms: float
    request_size: int
    response_size: int
    user_id: Optional[str]
    timestamp: float
    error: Optional[str] = None

class MetricsCollector:
    """Collects and stores application metrics"""
    
    def __init__(self):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = defaultdict(float)
        self.histograms: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
    def increment_counter(self, name: str, value: int = 1, tags: Dict[str, str] = None):
        """Increment a counter metric"""
        key = self._build_key(name, tags)
        self.counters[key] += value
        self._store_metric(MetricData(name, value, tags or {}, time.time(), 'counter'))
    
    def set_gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """Set a gauge metric"""
        key = self._build_key(name, tags)
        self.gauges[key] = value
        self._store_metric(MetricData(name, value, tags or {}, time.time(), 'gauge'))
    
    def record_histogram(self, name: str, value: float, tags: Dict[str, str] = None):
        """Record a histogram value"""
        key = self._build_key(name, tags)
        self.histograms[key].append(value)
        self._store_metric(MetricData(name, value, tags or {}, time.time(), 'histogram'))
    
    def _build_key(self, name: str, tags: Dict[str, str] = None) -> str:
        """Build metric key with tags"""
        if not tags:
            return name
        tag_str = ','.join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{name}[{tag_str}]"
    
    def _store_metric(self, metric: MetricData):
        """Store metric for export"""
        self.metrics[metric.name].append(metric)
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics"""
        return {
            'counters': dict(self.counters),
            'gauges': dict(self.gauges),
            'histograms': {
                key: {
                    'count': len(values),
                    'avg': sum(values) / len(values) if values else 0,
                    'min': min(values) if values else 0,
                    'max': max(values) if values else 0,
                    'p95': self._percentile(values, 0.95) if values else 0,
                    'p99': self._percentile(values, 0.99) if values else 0
                }
                for key, values in self.histograms.items()
            }
        }
    
    def _percentile(self, values: deque, percentile: float) -> float:
        """Calculate percentile from deque"""
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile)
        return sorted_values[min(index, len(sorted_values) - 1)]

class HealthChecker:
    """System health monitoring"""
    
    def __init__(self):
        self.checks = {}
        self.last_check_time = {}
    
    def register_check(self, name: str, check_func, interval_seconds: int = 60):
        """Register a health check function"""
        self.checks[name] = {
            'func': check_func,
            'interval': interval_seconds,
            'last_result': None,
            'last_error': None
        }
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run all health checks"""
        results = {}
        overall_status = 'healthy'
        
        for name, check_info in self.checks.items():
            try:
                # Check if we need to run this check
                last_check = self.last_check_time.get(name, 0)
                if time.time() - last_check < check_info['interval']:
                    results[name] = check_info['last_result']
                    continue
                
                # Run the check
                if asyncio.iscoroutinefunction(check_info['func']):
                    result = await check_info['func']()
                else:
                    result = check_info['func']()
                
                check_info['last_result'] = result
                check_info['last_error'] = None
                self.last_check_time[name] = time.time()
                results[name] = result
                
                if result.get('status') != 'healthy':
                    overall_status = 'degraded'
                
            except Exception as e:
                error_result = {
                    'status': 'unhealthy',
                    'error': str(e),
                    'timestamp': time.time()
                }
                check_info['last_result'] = error_result
                check_info['last_error'] = str(e)
                self.last_check_time[name] = time.time()
                results[name] = error_result
                overall_status = 'unhealthy'
        
        return {
            'status': overall_status,
            'timestamp': time.time(),
            'checks': results
        }

class MonitoringMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for request monitoring"""
    
    def __init__(self, app, metrics_collector: MetricsCollector):
        super().__init__(app)
        self.metrics = metrics_collector
        self.active_requests = {}
    
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        request_size = int(request.headers.get('content-length', 0))
        
        # Get user info if available
        user_id = getattr(request.state, 'user_id', None)
        
        # Track active request
        self.active_requests[request_id] = {
            'start_time': start_time,
            'path': request.url.path,
            'method': request.method,
            'user_id': user_id
        }
        
        # Track request start
        self.metrics.increment_counter(
            'http_requests_total',
            tags={'method': request.method, 'endpoint': request.url.path}
        )
        
        try:
            response = await call_next(request)
            
            # Calculate metrics
            duration = time.time() - start_time
            duration_ms = duration * 1000
            
            # Get response size
            response_size = 0
            if hasattr(response, 'body'):
                response_size = len(response.body) if response.body else 0
            
            # Record metrics
            self.metrics.record_histogram(
                'http_request_duration_ms',
                duration_ms,
                tags={'method': request.method, 'status': str(response.status_code)}
            )
            
            self.metrics.increment_counter(
                'http_responses_total',
                tags={
                    'method': request.method,
                    'status': str(response.status_code),
                    'endpoint': request.url.path
                }
            )
            
            # Track request metrics
            request_metrics = RequestMetrics(
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                request_size=request_size,
                response_size=response_size,
                user_id=user_id,
                timestamp=start_time
            )
            
            # Log structured request data
            logger.info(
                "Request completed",
                extra={
                    'request_id': request_id,
                    'method': request.method,
                    'path': request.url.path,
                    'status_code': response.status_code,
                    'duration_ms': duration_ms,
                    'user_id': user_id
                }
            )
            
            # Alert on slow requests
            if duration_ms > 5000:  # 5 seconds
                logger.warning(
                    "Slow request detected",
                    extra={
                        'request_id': request_id,
                        'duration_ms': duration_ms,
                        'path': request.url.path,
                        'method': request.method
                    }
                )
                
                self.metrics.increment_counter(
                    'slow_requests_total',
                    tags={'endpoint': request.url.path}
                )
            
            return response
            
        except Exception as e:
            # Track error
            duration = time.time() - start_time
            duration_ms = duration * 1000
            
            self.metrics.increment_counter(
                'http_errors_total',
                tags={
                    'method': request.method,
                    'endpoint': request.url.path,
                    'error_type': type(e).__name__
                }
            )
            
            # Log error with context
            logger.error(
                "Request failed",
                extra={
                    'request_id': request_id,
                    'method': request.method,
                    'path': request.url.path,
                    'duration_ms': duration_ms,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'user_id': user_id
                },
                exc_info=True
            )
            
            raise
        finally:
            # Remove from active requests
            self.active_requests.pop(request_id, None)

class SystemMetrics:
    """System resource monitoring"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self._collecting = False
    
    async def start_collection(self):
        """Start collecting system metrics"""
        self._collecting = True
        while self._collecting:
            try:
                await self._collect_metrics()
                await asyncio.sleep(30)  # Collect every 30 seconds
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    def stop_collection(self):
        """Stop collecting system metrics"""
        self._collecting = False
    
    async def _collect_metrics(self):
        """Collect current system metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        self.metrics.set_gauge('system_cpu_percent', cpu_percent)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        self.metrics.set_gauge('system_memory_percent', memory.percent)
        self.metrics.set_gauge('system_memory_used_bytes', memory.used)
        self.metrics.set_gauge('system_memory_available_bytes', memory.available)
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        self.metrics.set_gauge('system_disk_percent', disk.percent)
        self.metrics.set_gauge('system_disk_used_bytes', disk.used)
        self.metrics.set_gauge('system_disk_free_bytes', disk.free)
        
        # Network metrics (if available)
        try:
            network = psutil.net_io_counters()
            self.metrics.set_gauge('system_network_bytes_sent', network.bytes_sent)
            self.metrics.set_gauge('system_network_bytes_recv', network.bytes_recv)
        except:
            pass  # Network stats may not be available in some environments

# Global instances
metrics_collector = MetricsCollector()
health_checker = HealthChecker()
system_metrics = SystemMetrics(metrics_collector)

# Health check functions
def database_health_check():
    """Check database connectivity"""
    try:
        # Add your database connection check here
        # For example, a simple query to verify connection
        return {
            'status': 'healthy',
            'timestamp': time.time(),
            'details': 'Database connection successful'
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'timestamp': time.time(),
            'error': str(e)
        }

def external_service_health_check():
    """Check external service dependencies"""
    services = ['plaid', 'firebase']
    results = {}
    overall_healthy = True
    
    for service in services:
        try:
            # Add actual service health checks here
            # This is a placeholder
            results[service] = {
                'status': 'healthy',
                'response_time_ms': 100,  # Mock response time
                'timestamp': time.time()
            }
        except Exception as e:
            results[service] = {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': time.time()
            }
            overall_healthy = False
    
    return {
        'status': 'healthy' if overall_healthy else 'degraded',
        'timestamp': time.time(),
        'services': results
    }

# Register health checks
health_checker.register_check('database', database_health_check, 60)
health_checker.register_check('external_services', external_service_health_check, 120)

# API Models
class HealthResponse(BaseModel):
    status: str
    timestamp: float
    checks: Dict[str, Any]

class MetricsResponse(BaseModel):
    counters: Dict[str, int]
    gauges: Dict[str, float]
    histograms: Dict[str, Dict[str, float]]

# Monitoring endpoints
async def health_endpoint() -> HealthResponse:
    """Health check endpoint"""
    health_data = await health_checker.run_health_checks()
    return HealthResponse(**health_data)

async def metrics_endpoint() -> MetricsResponse:
    """Metrics endpoint"""
    metrics_data = metrics_collector.get_metrics_summary()
    return MetricsResponse(**metrics_data)

async def ready_endpoint():
    """Readiness check endpoint"""
    # Check if all critical services are ready
    health_data = await health_checker.run_health_checks()
    
    if health_data['status'] in ['healthy', 'degraded']:
        return {"status": "ready", "timestamp": time.time()}
    else:
        raise HTTPException(status_code=503, detail="Service not ready")

async def live_endpoint():
    """Liveness check endpoint"""
    # Simple liveness check
    return {"status": "alive", "timestamp": time.time()}

# Business metrics tracking
class BusinessMetrics:
    """Track business-specific metrics"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
    
    def track_user_action(self, user_id: str, action: str, metadata: Dict[str, Any] = None):
        """Track user actions"""
        self.metrics.increment_counter(
            'user_actions_total',
            tags={'action': action, 'user_id': user_id}
        )
        
        logger.info(
            "User action tracked",
            extra={
                'user_id': user_id,
                'action': action,
                'metadata': metadata,
                'timestamp': time.time()
            }
        )
    
    def track_financial_transaction(self, user_id: str, amount: float, currency: str, category: str):
        """Track financial transactions"""
        self.metrics.increment_counter(
            'transactions_total',
            tags={'currency': currency, 'category': category}
        )
        
        self.metrics.record_histogram(
            'transaction_amounts',
            amount,
            tags={'currency': currency, 'category': category}
        )
        
        logger.info(
            "Financial transaction tracked",
            extra={
                'user_id': user_id,
                'amount': amount,
                'currency': currency,
                'category': category,
                'timestamp': time.time()
            }
        )
    
    def track_api_usage(self, api_name: str, user_id: str, success: bool, response_time_ms: float):
        """Track API usage patterns"""
        status = 'success' if success else 'error'
        
        self.metrics.increment_counter(
            'api_calls_total',
            tags={'api': api_name, 'status': status}
        )
        
        self.metrics.record_histogram(
            'api_response_time_ms',
            response_time_ms,
            tags={'api': api_name}
        )

business_metrics = BusinessMetrics(metrics_collector)