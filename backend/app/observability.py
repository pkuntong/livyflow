"""
Observability Integration Module
Initializes and coordinates all monitoring, logging, and alerting components
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .monitoring import (
    MonitoringMiddleware, 
    metrics_collector, 
    health_checker, 
    system_metrics,
    business_metrics
)
from .logging_config import setup_logging, business_logger
from .alerting import alert_manager, initialize_alert_rules
from .synthetic_monitoring import synthetic_monitor, initialize_synthetic_monitoring
from .log_aggregation import log_aggregator, initialize_log_aggregation
from .monitoring_routes import router as monitoring_router

class ObservabilityManager:
    """Central manager for all observability components"""
    
    def __init__(self):
        self.initialized = False
        self.components = {
            'logging': setup_logging,
            'metrics': self._init_metrics,
            'alerting': self._init_alerting,
            'synthetic_monitoring': self._init_synthetic,
            'log_aggregation': self._init_log_aggregation
        }
        
    async def initialize(self, app: FastAPI):
        """Initialize all observability components"""
        if self.initialized:
            return
            
        logging.info("Initializing observability system...")
        
        try:
            # Initialize logging first
            logger = setup_logging()
            business_logger.log_user_action('system', 'observability_init_started')
            
            # Add monitoring middleware
            app.add_middleware(MonitoringMiddleware, metrics_collector=metrics_collector)
            
            # Include monitoring routes
            app.include_router(monitoring_router)
            
            # Initialize components
            await self._init_metrics()
            await self._init_alerting()
            await self._init_synthetic()
            await self._init_log_aggregation()
            
            self.initialized = True
            business_logger.log_user_action('system', 'observability_init_completed')
            logging.info("Observability system initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to initialize observability system: {e}")
            business_logger.log_error(e, {'component': 'observability_init'})
            raise
    
    async def _init_metrics(self):
        """Initialize metrics collection"""
        # Start system metrics collection
        asyncio.create_task(system_metrics.start_collection())
        logging.info("Metrics collection initialized")
    
    async def _init_alerting(self):
        """Initialize alerting system"""
        await initialize_alert_rules()
        logging.info("Alerting system initialized")
    
    async def _init_synthetic(self):
        """Initialize synthetic monitoring"""
        await initialize_synthetic_monitoring()
        logging.info("Synthetic monitoring initialized")
    
    async def _init_log_aggregation(self):
        """Initialize log aggregation"""
        await initialize_log_aggregation()
        logging.info("Log aggregation initialized")
    
    async def shutdown(self):
        """Shutdown all observability components"""
        if not self.initialized:
            return
            
        logging.info("Shutting down observability system...")
        
        try:
            # Stop components
            await alert_manager.stop()
            await synthetic_monitor.stop_monitoring()
            await log_aggregator.stop()
            system_metrics.stop_collection()
            
            business_logger.log_user_action('system', 'observability_shutdown')
            logging.info("Observability system shutdown completed")
            
        except Exception as e:
            logging.error(f"Error during observability shutdown: {e}")
        
        self.initialized = False
    
    def get_health_status(self):
        """Get overall health status of observability system"""
        return {
            'initialized': self.initialized,
            'components': {
                'metrics': True,  # Always available
                'alerting': self.initialized,
                'synthetic_monitoring': synthetic_monitor.running,
                'log_aggregation': log_aggregator.running
            },
            'timestamp': asyncio.get_event_loop().time()
        }

# Global observability manager
observability_manager = ObservabilityManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for observability"""
    # Startup
    await observability_manager.initialize(app)
    
    # Setup periodic tasks
    periodic_tasks = [
        asyncio.create_task(_periodic_health_check()),
        asyncio.create_task(_periodic_metrics_summary())
    ]
    
    try:
        yield
    finally:
        # Shutdown
        for task in periodic_tasks:
            task.cancel()
        await observability_manager.shutdown()

async def _periodic_health_check():
    """Periodic health check and reporting"""
    while True:
        try:
            # Generate health summary
            health_summary = await health_checker.run_health_checks()
            
            # Track business metric
            business_metrics.track_user_action(
                'system',
                'periodic_health_check',
                health_summary
            )
            
            # Log if unhealthy
            if health_summary['status'] != 'healthy':
                business_logger.log_performance_issue(
                    'system',
                    'health_check',
                    0,  # Binary healthy/unhealthy
                    1,
                    details=health_summary
                )
            
            await asyncio.sleep(300)  # Every 5 minutes
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logging.error(f"Error in periodic health check: {e}")
            await asyncio.sleep(300)

async def _periodic_metrics_summary():
    """Periodic metrics summary and insights"""
    while True:
        try:
            # Get metrics summary
            metrics_summary = metrics_collector.get_metrics_summary()
            
            # Generate insights
            insights = _generate_metrics_insights(metrics_summary)
            
            # Log insights
            if insights:
                business_logger.log_user_action(
                    'system',
                    'metrics_insights',
                    insights=insights
                )
            
            await asyncio.sleep(900)  # Every 15 minutes
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logging.error(f"Error in periodic metrics summary: {e}")
            await asyncio.sleep(900)

def _generate_metrics_insights(metrics_summary):
    """Generate insights from metrics"""
    insights = []
    
    # Check error rates
    total_requests = sum(
        count for key, count in metrics_summary['counters'].items()
        if 'http_requests_total' in key
    )
    total_errors = sum(
        count for key, count in metrics_summary['counters'].items()
        if 'http_errors_total' in key
    )
    
    if total_requests > 0:
        error_rate = (total_errors / total_requests) * 100
        if error_rate > 5:  # More than 5% error rate
            insights.append({
                'type': 'high_error_rate',
                'severity': 'high' if error_rate > 10 else 'medium',
                'value': error_rate,
                'message': f'Error rate is {error_rate:.2f}%'
            })
    
    # Check response times
    response_times = metrics_summary['histograms'].get('http_request_duration_ms', {})
    if response_times.get('p95', 0) > 5000:  # P95 > 5 seconds
        insights.append({
            'type': 'slow_response_time',
            'severity': 'medium',
            'value': response_times['p95'],
            'message': f'95th percentile response time is {response_times["p95"]:.0f}ms'
        })
    
    # Check system resources
    cpu_usage = metrics_summary['gauges'].get('system_cpu_percent', 0)
    if cpu_usage > 80:
        insights.append({
            'type': 'high_cpu_usage',
            'severity': 'high' if cpu_usage > 90 else 'medium',
            'value': cpu_usage,
            'message': f'CPU usage is {cpu_usage:.1f}%'
        })
    
    memory_usage = metrics_summary['gauges'].get('system_memory_percent', 0)
    if memory_usage > 85:
        insights.append({
            'type': 'high_memory_usage',
            'severity': 'high' if memory_usage > 95 else 'medium',
            'value': memory_usage,
            'message': f'Memory usage is {memory_usage:.1f}%'
        })
    
    return insights

# Utility functions for manual instrumentation
def track_business_event(event_type: str, user_id: str = None, **kwargs):
    """Helper function to track business events"""
    business_metrics.track_user_action(user_id or 'system', event_type, kwargs)
    business_logger.log_user_action(user_id or 'system', event_type, **kwargs)

def track_financial_transaction(user_id: str, amount: float, currency: str, category: str, **kwargs):
    """Helper function to track financial transactions"""
    business_metrics.track_financial_transaction(user_id, amount, currency, category)
    business_logger.log_financial_transaction(
        user_id, 
        kwargs.get('transaction_id', 'unknown'),
        amount, 
        currency,
        category=category,
        **kwargs
    )

def track_api_performance(endpoint: str, user_id: str, duration_ms: float, success: bool, **kwargs):
    """Helper function to track API performance"""
    business_metrics.track_api_usage(endpoint, user_id, success, duration_ms)
    business_logger.log_api_call(endpoint, user_id, duration_ms, 200 if success else 500, **kwargs)

def track_user_journey(user_id: str, journey_step: str, **kwargs):
    """Helper function to track user journey steps"""
    business_metrics.track_user_action(user_id, f'journey_{journey_step}', kwargs)
    business_logger.log_user_action(user_id, f'journey_{journey_step}', **kwargs)

# Decorator for automatic instrumentation
def monitor_function(func_name: str = None):
    """Decorator to automatically monitor function performance"""
    def decorator(func):
        import functools
        import time
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            name = func_name or func.__name__
            
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                # Track successful execution
                metrics_collector.record_histogram(
                    f'function_duration_ms',
                    duration_ms,
                    tags={'function': name, 'status': 'success'}
                )
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                # Track failed execution
                metrics_collector.record_histogram(
                    f'function_duration_ms',
                    duration_ms,
                    tags={'function': name, 'status': 'error'}
                )
                
                # Log error
                business_logger.log_error(e, {'function': name, 'duration_ms': duration_ms})
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            name = func_name or func.__name__
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                # Track successful execution
                metrics_collector.record_histogram(
                    f'function_duration_ms',
                    duration_ms,
                    tags={'function': name, 'status': 'success'}
                )
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                # Track failed execution
                metrics_collector.record_histogram(
                    f'function_duration_ms',
                    duration_ms,
                    tags={'function': name, 'status': 'error'}
                )
                
                # Log error
                business_logger.log_error(e, {'function': name, 'duration_ms': duration_ms})
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator