"""
Advanced Logging Configuration
Provides structured logging with correlation IDs, context enrichment, and multiple outputs
"""

import logging
import logging.handlers
import json
import os
import sys
import time
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

import structlog
from structlog import configure, get_logger
from structlog.stdlib import LoggerFactory, add_log_level, add_logger_name
from structlog.processors import JSONRenderer, TimeStamper, add_log_level, StackInfoRenderer

class CorrelationIDProcessor:
    """Add correlation ID to log records"""
    
    def __call__(self, logger, method_name, event_dict):
        # Try to get correlation ID from context (request state, etc.)
        correlation_id = event_dict.get('correlation_id')
        if not correlation_id:
            # Generate one if not present
            correlation_id = f"corr_{int(time.time() * 1000)}"
        
        event_dict['correlation_id'] = correlation_id
        return event_dict

class ContextProcessor:
    """Add application context to log records"""
    
    def __call__(self, logger, method_name, event_dict):
        # Add application metadata
        event_dict.update({
            'service': 'livyflow-backend',
            'version': '1.0.0',
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'hostname': os.getenv('HOSTNAME', 'unknown'),
            'pid': os.getpid()
        })
        return event_dict

class SensitiveDataProcessor:
    """Remove sensitive data from logs"""
    
    SENSITIVE_KEYS = {
        'password', 'token', 'secret', 'key', 'auth', 'credential',
        'ssn', 'social_security', 'credit_card', 'bank_account'
    }
    
    def __call__(self, logger, method_name, event_dict):
        return self._sanitize_dict(event_dict)
    
    def _sanitize_dict(self, data):
        """Recursively sanitize dictionary"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_KEYS):
                    sanitized[key] = '[REDACTED]'
                elif isinstance(value, (dict, list)):
                    sanitized[key] = self._sanitize_dict(value)
                else:
                    sanitized[key] = value
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_dict(item) for item in data]
        else:
            return data

class ErrorEnrichmentProcessor:
    """Enrich error logs with additional context"""
    
    def __call__(self, logger, method_name, event_dict):
        # Add error enrichment for error-level logs
        if method_name in ('error', 'critical', 'exception'):
            # Add stack trace if not present
            if 'exc_info' in event_dict and event_dict['exc_info']:
                event_dict['stack_trace'] = traceback.format_exc()
            
            # Add error categorization
            event_dict['error_category'] = self._categorize_error(event_dict)
            
            # Add severity level
            event_dict['severity'] = self._determine_severity(event_dict, method_name)
        
        return event_dict
    
    def _categorize_error(self, event_dict):
        """Categorize error based on message and context"""
        message = str(event_dict.get('event', '')).lower()
        
        if any(keyword in message for keyword in ['database', 'connection', 'timeout']):
            return 'database_error'
        elif any(keyword in message for keyword in ['auth', 'permission', 'unauthorized']):
            return 'auth_error'
        elif any(keyword in message for keyword in ['validation', 'invalid', 'format']):
            return 'validation_error'
        elif any(keyword in message for keyword in ['network', 'http', 'api']):
            return 'network_error'
        elif any(keyword in message for keyword in ['memory', 'disk', 'cpu']):
            return 'resource_error'
        else:
            return 'application_error'
    
    def _determine_severity(self, event_dict, method_name):
        """Determine error severity"""
        if method_name == 'critical':
            return 'critical'
        elif method_name == 'error':
            category = event_dict.get('error_category', '')
            if category in ['database_error', 'resource_error']:
                return 'high'
            elif category in ['auth_error', 'network_error']:
                return 'medium'
            else:
                return 'low'
        else:
            return 'info'

class LogAggregator:
    """Aggregate logs and send to external systems"""
    
    def __init__(self):
        self.buffer = []
        self.buffer_size = 100
        self.flush_interval = 30  # seconds
        self.last_flush = time.time()
    
    def add_log(self, log_record):
        """Add log record to buffer"""
        self.buffer.append(log_record)
        
        # Flush if buffer is full or interval exceeded
        if (len(self.buffer) >= self.buffer_size or 
            time.time() - self.last_flush > self.flush_interval):
            self.flush()
    
    def flush(self):
        """Flush logs to external systems"""
        if not self.buffer:
            return
        
        try:
            # Send to log aggregation service (placeholder)
            self._send_to_external_service(self.buffer.copy())
            self.buffer.clear()
            self.last_flush = time.time()
        except Exception as e:
            print(f"Failed to flush logs: {e}")
    
    def _send_to_external_service(self, logs):
        """Send logs to external aggregation service"""
        # Placeholder for external service integration
        # In production, integrate with ELK stack, Datadog, etc.
        pass

# Global log aggregator
log_aggregator = LogAggregator()

class AggregatingHandler(logging.Handler):
    """Custom logging handler that aggregates logs"""
    
    def emit(self, record):
        try:
            # Convert log record to dict
            log_dict = {
                'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                'level': record.levelname,
                'message': record.getMessage(),
                'logger': record.name,
                'module': record.module,
                'function': record.funcName,
                'line': record.lineno,
                'thread': record.thread,
                'process': record.process
            }
            
            # Add extra fields
            if hasattr(record, '__dict__'):
                for key, value in record.__dict__.items():
                    if key not in log_dict and not key.startswith('_'):
                        log_dict[key] = value
            
            # Add to aggregator
            log_aggregator.add_log(log_dict)
            
        except Exception as e:
            print(f"Error in log aggregator: {e}")

def setup_logging():
    """Setup comprehensive logging configuration"""
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure structlog
    structlog.configure(
        processors=[
            CorrelationIDProcessor(),
            ContextProcessor(),
            SensitiveDataProcessor(),
            ErrorEnrichmentProcessor(),
            add_log_level,
            add_logger_name,
            TimeStamper(fmt="ISO"),
            StackInfoRenderer(),
            JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=LoggerFactory(),
        context_class=dict,
        cache_logger_on_first_use=True,
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler for development
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # File handlers for different log levels
    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "application.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    
    error_handler = logging.handlers.RotatingFileHandler(
        log_dir / "error.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    
    # JSON formatter for structured logging
    json_formatter = logging.Formatter(
        '{"timestamp":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s",'
        '"message":"%(message)s","module":"%(module)s","function":"%(funcName)s",'
        '"line":%(lineno)d}'
    )
    
    # Simple formatter for console
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Apply formatters
    console_handler.setFormatter(console_formatter)
    file_handler.setFormatter(json_formatter)
    error_handler.setFormatter(json_formatter)
    
    # Add aggregating handler
    aggregating_handler = AggregatingHandler()
    aggregating_handler.setLevel(logging.INFO)
    
    # Add handlers to root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)
    root_logger.addHandler(aggregating_handler)
    
    # Configure specific loggers
    
    # FastAPI logger
    fastapi_logger = logging.getLogger("fastapi")
    fastapi_logger.setLevel(logging.INFO)
    
    # Uvicorn logger
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(logging.INFO)
    
    # Database logger (if using SQLAlchemy)
    db_logger = logging.getLogger("sqlalchemy.engine")
    db_logger.setLevel(logging.WARNING)  # Only log warnings and errors
    
    # HTTP client logger
    http_logger = logging.getLogger("httpx")
    http_logger.setLevel(logging.WARNING)
    
    return get_logger()

# Business-specific logging utilities
class BusinessLogger:
    """Business-specific logging utilities"""
    
    def __init__(self):
        self.logger = get_logger("business")
    
    def log_user_action(self, user_id: str, action: str, **kwargs):
        """Log user actions"""
        self.logger.info(
            "User action",
            user_id=user_id,
            action=action,
            **kwargs
        )
    
    def log_financial_transaction(self, user_id: str, transaction_id: str, 
                                amount: float, currency: str, **kwargs):
        """Log financial transactions"""
        self.logger.info(
            "Financial transaction",
            user_id=user_id,
            transaction_id=transaction_id,
            amount=amount,
            currency=currency,
            **kwargs
        )
    
    def log_api_call(self, endpoint: str, user_id: str, duration_ms: float,
                    status_code: int, **kwargs):
        """Log API calls"""
        self.logger.info(
            "API call",
            endpoint=endpoint,
            user_id=user_id,
            duration_ms=duration_ms,
            status_code=status_code,
            **kwargs
        )
    
    def log_error(self, error: Exception, context: Dict[str, Any]):
        """Log errors with context"""
        self.logger.error(
            "Application error",
            error_type=type(error).__name__,
            error_message=str(error),
            context=context,
            exc_info=error
        )
    
    def log_security_event(self, event_type: str, user_id: str, 
                          severity: str = "medium", **kwargs):
        """Log security events"""
        self.logger.warning(
            "Security event",
            event_type=event_type,
            user_id=user_id,
            severity=severity,
            **kwargs
        )
    
    def log_performance_issue(self, component: str, metric: str, 
                             value: float, threshold: float, **kwargs):
        """Log performance issues"""
        self.logger.warning(
            "Performance issue",
            component=component,
            metric=metric,
            value=value,
            threshold=threshold,
            **kwargs
        )

# Log analysis utilities
class LogAnalyzer:
    """Analyze logs for patterns and insights"""
    
    def __init__(self):
        self.error_patterns = []
        self.performance_baselines = {}
    
    def analyze_error_patterns(self, time_window_hours: int = 24):
        """Analyze error patterns over time window"""
        # Placeholder for error pattern analysis
        # In production, this would analyze stored logs
        pass
    
    def detect_anomalies(self, metric: str, current_value: float):
        """Detect anomalies in metrics"""
        baseline = self.performance_baselines.get(metric)
        if baseline is None:
            self.performance_baselines[metric] = current_value
            return False
        
        # Simple anomaly detection (in production, use more sophisticated methods)
        deviation = abs(current_value - baseline) / baseline
        return deviation > 0.5  # 50% deviation threshold
    
    def update_baseline(self, metric: str, value: float):
        """Update performance baseline"""
        current_baseline = self.performance_baselines.get(metric, value)
        # Exponential moving average
        self.performance_baselines[metric] = 0.9 * current_baseline + 0.1 * value

# Global instances
business_logger = BusinessLogger()
log_analyzer = LogAnalyzer()

# Context managers for correlation tracking
class correlation_id_context:
    """Context manager for correlation ID tracking"""
    
    def __init__(self, correlation_id: str):
        self.correlation_id = correlation_id
        self.logger = get_logger()
    
    def __enter__(self):
        self.logger = self.logger.bind(correlation_id=self.correlation_id)
        return self.logger
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.logger.error(
                "Exception in correlation context",
                exc_info=(exc_type, exc_val, exc_tb)
            )

# Initialize logging
setup_logging()