"""
Monitoring Routes for FastAPI
Provides endpoints for health checks, metrics, and monitoring data
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel

from .monitoring import (
    metrics_collector,
    health_checker,
    business_metrics,
    system_metrics,
    health_endpoint,
    metrics_endpoint,
    ready_endpoint,
    live_endpoint
)

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# Pydantic models for request/response
class MetricSubmission(BaseModel):
    type: str
    data: Dict[str, Any]
    timestamp: float

class AlertRule(BaseModel):
    name: str
    metric: str
    threshold: float
    operator: str  # gt, lt, eq
    duration_minutes: int = 5
    severity: str = 'medium'  # low, medium, high, critical

class LogEntry(BaseModel):
    level: str
    message: str
    timestamp: float
    context: Optional[Dict[str, Any]] = None

# In-memory storage for demo (use proper database in production)
alert_rules: List[AlertRule] = []
recent_alerts: List[Dict[str, Any]] = []
log_entries: List[LogEntry] = []

@router.get("/health", response_model=dict)
async def get_health():
    """Comprehensive health check endpoint"""
    return await health_endpoint()

@router.get("/health/ready")
async def get_readiness():
    """Kubernetes-style readiness probe"""
    return await ready_endpoint()

@router.get("/health/live")
async def get_liveness():
    """Kubernetes-style liveness probe"""
    return await live_endpoint()

@router.get("/metrics", response_model=dict)
async def get_metrics():
    """Get application metrics in JSON format"""
    return await metrics_endpoint()

@router.get("/metrics/prometheus", response_class=PlainTextResponse)
async def get_prometheus_metrics():
    """Get metrics in Prometheus format"""
    metrics_data = metrics_collector.get_metrics_summary()
    
    prometheus_output = []
    
    # Convert counters
    for name, value in metrics_data['counters'].items():
        clean_name = name.split('[')[0]  # Remove tags for now
        prometheus_output.append(f"# TYPE {clean_name} counter")
        prometheus_output.append(f"{clean_name} {value}")
    
    # Convert gauges
    for name, value in metrics_data['gauges'].items():
        clean_name = name.split('[')[0]
        prometheus_output.append(f"# TYPE {clean_name} gauge")
        prometheus_output.append(f"{clean_name} {value}")
    
    # Convert histograms
    for name, histogram_data in metrics_data['histograms'].items():
        clean_name = name.split('[')[0]
        prometheus_output.append(f"# TYPE {clean_name} histogram")
        prometheus_output.append(f"{clean_name}_count {histogram_data['count']}")
        prometheus_output.append(f"{clean_name}_sum {histogram_data['avg'] * histogram_data['count']}")
        prometheus_output.append(f"{clean_name}_bucket{{le=\"+Inf\"}} {histogram_data['count']}")
    
    return "\n".join(prometheus_output)

@router.post("/metrics")
async def submit_metrics(metric_data: MetricSubmission, request: Request):
    """Receive metrics from frontend"""
    try:
        # Process frontend metrics
        await process_frontend_metrics(metric_data.data, metric_data.type)
        
        # Track metric submission
        business_metrics.track_api_usage(
            'metric_submission',
            getattr(request.state, 'user_id', 'anonymous'),
            True,
            0
        )
        
        return {"status": "success", "timestamp": time.time()}
        
    except Exception as e:
        # Track error
        business_metrics.track_api_usage(
            'metric_submission',
            getattr(request.state, 'user_id', 'anonymous'),
            False,
            0
        )
        
        raise HTTPException(status_code=500, detail=str(e))

async def process_frontend_metrics(data: Dict[str, Any], metric_type: str):
    """Process metrics received from frontend"""
    if metric_type == 'batch':
        # Process batch metrics
        for category, metrics_list in data.get('metrics', {}).items():
            for metric in metrics_list:
                await process_single_frontend_metric(category, metric)
    
    elif metric_type == 'error':
        # Process error metrics
        for error in data if isinstance(data, list) else [data]:
            metrics_collector.increment_counter(
                'frontend_errors_total',
                tags={
                    'error_type': error.get('type', 'unknown'),
                    'severity': error.get('severity', 'low')
                }
            )
    
    elif metric_type == 'business_event':
        # Process business events
        event = data if isinstance(data, dict) else data[0]
        event_type = event.get('type', 'unknown')
        
        metrics_collector.increment_counter(
            f'business_events_{event_type}_total',
            tags={'user_id': event.get('userId', 'anonymous')}
        )

async def process_single_frontend_metric(category: str, metric: Dict[str, Any]):
    """Process individual frontend metric"""
    try:
        if category == 'performance':
            # Track performance metrics
            perf_type = metric.get('type', 'unknown')
            value = metric.get('value', 0)
            
            if perf_type in ['navigation', 'lcp', 'fid']:
                metrics_collector.record_histogram(
                    f'frontend_{perf_type}_ms',
                    float(value),
                    tags={'page': metric.get('url', 'unknown')}
                )
        
        elif category == 'userActions':
            # Track user interactions
            action = metric.get('action', 'unknown')
            metrics_collector.increment_counter(
                'frontend_user_actions_total',
                tags={
                    'action': action,
                    'category': metric.get('category', 'unknown')
                }
            )
        
        elif category == 'apiCalls':
            # Track frontend API calls
            url = metric.get('url', 'unknown')
            duration = metric.get('duration', 0)
            status = metric.get('status', 0)
            
            metrics_collector.record_histogram(
                'frontend_api_duration_ms',
                float(duration),
                tags={'endpoint': url, 'status': str(status)}
            )
            
            if status >= 400:
                metrics_collector.increment_counter(
                    'frontend_api_errors_total',
                    tags={'endpoint': url, 'status': str(status)}
                )
        
        elif category == 'businessEvents':
            # Track business events from frontend
            event_type = metric.get('type', 'unknown')
            metrics_collector.increment_counter(
                f'frontend_business_{event_type}_total',
                tags={'user_id': metric.get('userId', 'anonymous')}
            )
            
    except Exception as e:
        print(f"Error processing frontend metric: {e}")

@router.get("/dashboard")
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard data"""
    try:
        # Get system metrics
        metrics_data = metrics_collector.get_metrics_summary()
        
        # Get health status
        health_data = await health_checker.run_health_checks()
        
        # Calculate error rates
        error_rate = calculate_error_rate()
        
        # Get recent alerts
        recent_alerts_data = get_recent_alerts()
        
        # Get top endpoints by traffic
        top_endpoints = get_top_endpoints()
        
        # Get performance percentiles
        performance_data = get_performance_metrics()
        
        return {
            'timestamp': time.time(),
            'health': health_data,
            'metrics': metrics_data,
            'error_rate': error_rate,
            'alerts': recent_alerts_data,
            'top_endpoints': top_endpoints,
            'performance': performance_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def calculate_error_rate() -> Dict[str, float]:
    """Calculate error rates for different endpoints"""
    total_requests = sum(metrics_collector.counters.get(key, 0) 
                        for key in metrics_collector.counters 
                        if 'http_requests_total' in key)
    
    total_errors = sum(metrics_collector.counters.get(key, 0) 
                      for key in metrics_collector.counters 
                      if 'http_errors_total' in key)
    
    return {
        'overall_error_rate': (total_errors / total_requests * 100) if total_requests > 0 else 0,
        'total_requests': total_requests,
        'total_errors': total_errors
    }

def get_recent_alerts() -> List[Dict[str, Any]]:
    """Get recent alerts"""
    return recent_alerts[-50:]  # Last 50 alerts

def get_top_endpoints() -> List[Dict[str, Any]]:
    """Get top endpoints by request count"""
    endpoint_counts = {}
    
    for key, count in metrics_collector.counters.items():
        if 'http_requests_total' in key and '[' in key:
            # Extract endpoint from tags
            tags_part = key.split('[')[1].split(']')[0]
            for tag in tags_part.split(','):
                if 'endpoint=' in tag:
                    endpoint = tag.split('=')[1]
                    endpoint_counts[endpoint] = endpoint_counts.get(endpoint, 0) + count
    
    # Sort by count
    sorted_endpoints = sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)
    
    return [
        {'endpoint': endpoint, 'requests': count}
        for endpoint, count in sorted_endpoints[:10]
    ]

def get_performance_metrics() -> Dict[str, Any]:
    """Get performance metrics summary"""
    performance_data = {}
    
    for key, values in metrics_collector.histograms.items():
        if 'duration' in key or 'time' in key:
            if values:
                performance_data[key] = {
                    'avg': sum(values) / len(values),
                    'p95': metrics_collector._percentile(values, 0.95),
                    'p99': metrics_collector._percentile(values, 0.99),
                    'count': len(values)
                }
    
    return performance_data

@router.post("/alerts/rules")
async def create_alert_rule(rule: AlertRule):
    """Create a new alert rule"""
    alert_rules.append(rule)
    return {"status": "created", "rule": rule}

@router.get("/alerts/rules")
async def get_alert_rules():
    """Get all alert rules"""
    return {"rules": alert_rules}

@router.delete("/alerts/rules/{rule_name}")
async def delete_alert_rule(rule_name: str):
    """Delete an alert rule"""
    global alert_rules
    alert_rules = [rule for rule in alert_rules if rule.name != rule_name]
    return {"status": "deleted"}

@router.post("/logs")
async def submit_log_entry(log_entry: LogEntry):
    """Submit a log entry"""
    log_entries.append(log_entry)
    
    # Keep only recent logs (last 1000)
    if len(log_entries) > 1000:
        log_entries.pop(0)
    
    return {"status": "logged"}

@router.get("/logs")
async def get_logs(
    level: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get log entries"""
    filtered_logs = log_entries
    
    if level:
        filtered_logs = [log for log in log_entries if log.level == level]
    
    # Sort by timestamp descending
    sorted_logs = sorted(filtered_logs, key=lambda x: x.timestamp, reverse=True)
    
    return {
        "logs": sorted_logs[offset:offset + limit],
        "total": len(filtered_logs)
    }

@router.get("/system")
async def get_system_metrics():
    """Get current system metrics"""
    return {
        'cpu_percent': metrics_collector.gauges.get('system_cpu_percent', 0),
        'memory_percent': metrics_collector.gauges.get('system_memory_percent', 0),
        'disk_percent': metrics_collector.gauges.get('system_disk_percent', 0),
        'timestamp': time.time()
    }

# Background task to check alert rules
async def check_alert_rules():
    """Check alert rules and trigger alerts"""
    while True:
        try:
            for rule in alert_rules:
                await evaluate_alert_rule(rule)
            await asyncio.sleep(60)  # Check every minute
        except Exception as e:
            print(f"Error checking alert rules: {e}")
            await asyncio.sleep(60)

async def evaluate_alert_rule(rule: AlertRule):
    """Evaluate a single alert rule"""
    try:
        # Get current metric value
        current_value = get_metric_value(rule.metric)
        
        if current_value is None:
            return
        
        # Check threshold
        triggered = False
        if rule.operator == 'gt' and current_value > rule.threshold:
            triggered = True
        elif rule.operator == 'lt' and current_value < rule.threshold:
            triggered = True
        elif rule.operator == 'eq' and current_value == rule.threshold:
            triggered = True
        
        if triggered:
            # Create alert
            alert = {
                'rule_name': rule.name,
                'metric': rule.metric,
                'current_value': current_value,
                'threshold': rule.threshold,
                'severity': rule.severity,
                'timestamp': time.time(),
                'message': f"Alert: {rule.name} - {rule.metric} is {current_value} (threshold: {rule.threshold})"
            }
            
            recent_alerts.append(alert)
            
            # Keep only recent alerts
            if len(recent_alerts) > 1000:
                recent_alerts.pop(0)
            
            print(f"ALERT: {alert['message']}")
            
    except Exception as e:
        print(f"Error evaluating alert rule {rule.name}: {e}")

def get_metric_value(metric_name: str) -> Optional[float]:
    """Get current value for a metric"""
    # Check gauges first
    if metric_name in metrics_collector.gauges:
        return metrics_collector.gauges[metric_name]
    
    # Check counters
    if metric_name in metrics_collector.counters:
        return float(metrics_collector.counters[metric_name])
    
    # Check histograms (return average)
    if metric_name in metrics_collector.histograms:
        values = metrics_collector.histograms[metric_name]
        return sum(values) / len(values) if values else 0
    
    return None

# Start background tasks
@router.on_event("startup")
async def start_background_tasks():
    """Start background monitoring tasks"""
    asyncio.create_task(check_alert_rules())
    asyncio.create_task(system_metrics.start_collection())