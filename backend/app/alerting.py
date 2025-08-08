"""
Intelligent Alerting System
Provides smart alerting with dynamic thresholds, escalation policies, and alert suppression
"""

import asyncio
import json
import time
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from collections import deque, defaultdict
import smtplib
import httpx
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

from .monitoring import metrics_collector
from .logging_config import business_logger

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

@dataclass
class AlertRule:
    """Definition of an alert rule"""
    id: str
    name: str
    description: str
    metric: str
    condition: str  # gt, lt, eq, anomaly
    threshold: float
    severity: AlertSeverity
    duration_minutes: int = 5  # How long condition must persist
    cooldown_minutes: int = 30  # Minimum time between alerts
    tags: Dict[str, str] = None
    escalation_policy: str = "default"
    enabled: bool = True
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}

@dataclass
class Alert:
    """Alert instance"""
    id: str
    rule_id: str
    rule_name: str
    message: str
    severity: AlertSeverity
    status: AlertStatus
    metric_value: float
    threshold: float
    created_at: datetime
    updated_at: datetime
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    context: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.context is None:
            self.context = {}

class EscalationPolicy:
    """Defines how alerts should be escalated"""
    
    def __init__(self, name: str, steps: List[Dict[str, Any]]):
        self.name = name
        self.steps = steps  # [{"delay_minutes": 0, "channels": ["email"], "recipients": ["oncall"]}]

class AlertChannel:
    """Base class for alert channels"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
    
    async def send_alert(self, alert: Alert, recipients: List[str]):
        """Send alert through this channel"""
        raise NotImplementedError

class EmailChannel(AlertChannel):
    """Email alert channel"""
    
    async def send_alert(self, alert: Alert, recipients: List[str]):
        """Send email alert"""
        try:
            smtp_config = self.config.get('smtp', {})
            server = smtplib.SMTP(smtp_config.get('host', 'localhost'), smtp_config.get('port', 587))
            
            if smtp_config.get('tls', True):
                server.starttls()
            
            if smtp_config.get('username') and smtp_config.get('password'):
                server.login(smtp_config['username'], smtp_config['password'])
            
            for recipient in recipients:
                message = self._create_email_message(alert, recipient)
                server.send_message(message)
            
            server.quit()
            return True
            
        except Exception as e:
            logging.error(f"Failed to send email alert: {e}")
            return False
    
    def _create_email_message(self, alert: Alert, recipient: str):
        """Create email message for alert"""
        message = MimeMultipart()
        message['From'] = self.config.get('from_email', 'alerts@livyflow.com')
        message['To'] = recipient
        message['Subject'] = f"[{alert.severity.value.upper()}] {alert.rule_name}"
        
        body = f"""
Alert: {alert.rule_name}
Severity: {alert.severity.value}
Status: {alert.status.value}
Created: {alert.created_at.isoformat()}

Message: {alert.message}

Metric Value: {alert.metric_value}
Threshold: {alert.threshold}

Context:
{json.dumps(alert.context, indent=2)}

Alert ID: {alert.id}
        """
        
        message.attach(MimeText(body, 'plain'))
        return message

class SlackChannel(AlertChannel):
    """Slack alert channel"""
    
    async def send_alert(self, alert: Alert, recipients: List[str]):
        """Send Slack alert"""
        try:
            webhook_url = self.config.get('webhook_url')
            if not webhook_url:
                return False
            
            color_map = {
                AlertSeverity.LOW: "#36a64f",
                AlertSeverity.MEDIUM: "#ff9500",
                AlertSeverity.HIGH: "#ff0000",
                AlertSeverity.CRITICAL: "#8b0000"
            }
            
            payload = {
                "attachments": [
                    {
                        "color": color_map.get(alert.severity, "#ff0000"),
                        "title": f"{alert.severity.value.upper()}: {alert.rule_name}",
                        "text": alert.message,
                        "fields": [
                            {"title": "Metric Value", "value": str(alert.metric_value), "short": True},
                            {"title": "Threshold", "value": str(alert.threshold), "short": True},
                            {"title": "Status", "value": alert.status.value, "short": True},
                            {"title": "Alert ID", "value": alert.id, "short": True}
                        ],
                        "footer": "LivyFlow Monitoring",
                        "ts": int(alert.created_at.timestamp())
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload)
                return response.status_code == 200
                
        except Exception as e:
            logging.error(f"Failed to send Slack alert: {e}")
            return False

class WebhookChannel(AlertChannel):
    """Generic webhook alert channel"""
    
    async def send_alert(self, alert: Alert, recipients: List[str]):
        """Send webhook alert"""
        try:
            webhook_url = self.config.get('url')
            if not webhook_url:
                return False
            
            payload = {
                "alert": asdict(alert),
                "recipients": recipients,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            headers = self.config.get('headers', {})
            timeout = self.config.get('timeout', 30)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url, 
                    json=payload, 
                    headers=headers, 
                    timeout=timeout
                )
                return response.status_code < 400
                
        except Exception as e:
            logging.error(f"Failed to send webhook alert: {e}")
            return False

class AnomalyDetector:
    """Detects anomalies in metrics using statistical methods"""
    
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.metric_histories: Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_size))
        self.baselines: Dict[str, Dict[str, float]] = {}
    
    def add_metric_value(self, metric_name: str, value: float, timestamp: float = None):
        """Add metric value for anomaly detection"""
        if timestamp is None:
            timestamp = time.time()
        
        self.metric_histories[metric_name].append({'value': value, 'timestamp': timestamp})
        self._update_baseline(metric_name)
    
    def is_anomaly(self, metric_name: str, value: float, sensitivity: float = 2.0) -> bool:
        """Check if value is an anomaly"""
        baseline = self.baselines.get(metric_name)
        if not baseline or len(self.metric_histories[metric_name]) < 10:
            return False
        
        z_score = abs(value - baseline['mean']) / max(baseline['std_dev'], 0.1)
        return z_score > sensitivity
    
    def _update_baseline(self, metric_name: str):
        """Update statistical baseline for metric"""
        history = self.metric_histories[metric_name]
        if len(history) < 3:
            return
        
        values = [entry['value'] for entry in history]
        mean = sum(values) / len(values)
        
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std_dev = variance ** 0.5
        
        self.baselines[metric_name] = {
            'mean': mean,
            'std_dev': std_dev,
            'min': min(values),
            'max': max(values),
            'updated_at': time.time()
        }

class AlertManager:
    """Manages alert rules, evaluation, and dispatching"""
    
    def __init__(self):
        self.rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=10000)
        self.channels: Dict[str, AlertChannel] = {}
        self.escalation_policies: Dict[str, EscalationPolicy] = {}
        self.anomaly_detector = AnomalyDetector()
        
        # Alert suppression tracking
        self.alert_counts: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.suppression_rules: List[Dict[str, Any]] = []
        
        # Set up default channels and policies
        self._setup_defaults()
        
        # Start background tasks
        self._evaluation_task = None
        self._cleanup_task = None
    
    def _setup_defaults(self):
        """Setup default channels and escalation policies"""
        # Default email channel
        self.channels['email'] = EmailChannel('email', {
            'smtp': {
                'host': 'localhost',
                'port': 587,
                'tls': True,
                'username': None,
                'password': None
            },
            'from_email': 'alerts@livyflow.com'
        })
        
        # Default escalation policy
        self.escalation_policies['default'] = EscalationPolicy('default', [
            {"delay_minutes": 0, "channels": ["email"], "recipients": ["oncall@livyflow.com"]},
            {"delay_minutes": 15, "channels": ["slack"], "recipients": ["#alerts"]},
            {"delay_minutes": 30, "channels": ["email", "slack"], "recipients": ["manager@livyflow.com"]}
        ])
        
        # Critical escalation policy
        self.escalation_policies['critical'] = EscalationPolicy('critical', [
            {"delay_minutes": 0, "channels": ["email", "slack"], "recipients": ["oncall@livyflow.com", "#critical-alerts"]},
            {"delay_minutes": 5, "channels": ["email"], "recipients": ["manager@livyflow.com"]},
            {"delay_minutes": 15, "channels": ["webhook"], "recipients": ["pager_service"]}
        ])
    
    async def start(self):
        """Start alert manager"""
        self._evaluation_task = asyncio.create_task(self._evaluation_loop())
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logging.info("Alert manager started")
    
    async def stop(self):
        """Stop alert manager"""
        if self._evaluation_task:
            self._evaluation_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()
        logging.info("Alert manager stopped")
    
    def add_rule(self, rule: AlertRule):
        """Add alert rule"""
        self.rules[rule.id] = rule
        business_logger.log_user_action('system', 'alert_rule_added', rule_id=rule.id, rule_name=rule.name)
    
    def remove_rule(self, rule_id: str):
        """Remove alert rule"""
        if rule_id in self.rules:
            rule_name = self.rules[rule_id].name
            del self.rules[rule_id]
            business_logger.log_user_action('system', 'alert_rule_removed', rule_id=rule_id, rule_name=rule_name)
    
    def add_channel(self, channel: AlertChannel):
        """Add alert channel"""
        self.channels[channel.name] = channel
    
    def add_escalation_policy(self, policy: EscalationPolicy):
        """Add escalation policy"""
        self.escalation_policies[policy.name] = policy
    
    async def _evaluation_loop(self):
        """Main evaluation loop"""
        while True:
            try:
                await self._evaluate_all_rules()
                await asyncio.sleep(30)  # Evaluate every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in alert evaluation: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _cleanup_loop(self):
        """Cleanup old alerts"""
        while True:
            try:
                await self._cleanup_resolved_alerts()
                await asyncio.sleep(3600)  # Cleanup every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in alert cleanup: {e}")
                await asyncio.sleep(3600)
    
    async def _evaluate_all_rules(self):
        """Evaluate all active rules"""
        current_metrics = metrics_collector.get_metrics_summary()
        
        for rule in self.rules.values():
            if not rule.enabled:
                continue
            
            try:
                await self._evaluate_rule(rule, current_metrics)
            except Exception as e:
                logging.error(f"Error evaluating rule {rule.id}: {e}")
    
    async def _evaluate_rule(self, rule: AlertRule, metrics: Dict[str, Any]):
        """Evaluate a single rule"""
        metric_value = self._get_metric_value(rule.metric, metrics)
        if metric_value is None:
            return
        
        # Add to anomaly detector
        self.anomaly_detector.add_metric_value(rule.metric, metric_value)
        
        # Check condition
        condition_met = self._check_condition(rule, metric_value)
        
        existing_alert = self._get_active_alert_for_rule(rule.id)
        
        if condition_met:
            if existing_alert:
                # Update existing alert
                existing_alert.metric_value = metric_value
                existing_alert.updated_at = datetime.utcnow()
            else:
                # Create new alert if cooldown period has passed
                if self._is_cooldown_active(rule.id):
                    return
                
                alert = await self._create_alert(rule, metric_value)
                if not self._should_suppress_alert(alert):
                    await self._dispatch_alert(alert)
        else:
            if existing_alert and existing_alert.status == AlertStatus.ACTIVE:
                # Resolve alert
                await self._resolve_alert(existing_alert)
    
    def _get_metric_value(self, metric_name: str, metrics: Dict[str, Any]) -> Optional[float]:
        """Get current value for a metric"""
        # Check gauges
        if metric_name in metrics.get('gauges', {}):
            return float(metrics['gauges'][metric_name])
        
        # Check counters
        if metric_name in metrics.get('counters', {}):
            return float(metrics['counters'][metric_name])
        
        # Check histograms (use average)
        if metric_name in metrics.get('histograms', {}):
            histogram_data = metrics['histograms'][metric_name]
            return float(histogram_data.get('avg', 0))
        
        return None
    
    def _check_condition(self, rule: AlertRule, value: float) -> bool:
        """Check if rule condition is met"""
        if rule.condition == 'gt':
            return value > rule.threshold
        elif rule.condition == 'lt':
            return value < rule.threshold
        elif rule.condition == 'eq':
            return abs(value - rule.threshold) < 0.001  # Float equality
        elif rule.condition == 'anomaly':
            return self.anomaly_detector.is_anomaly(rule.metric, value, rule.threshold)
        else:
            return False
    
    def _get_active_alert_for_rule(self, rule_id: str) -> Optional[Alert]:
        """Get active alert for rule"""
        for alert in self.active_alerts.values():
            if alert.rule_id == rule_id and alert.status == AlertStatus.ACTIVE:
                return alert
        return None
    
    def _is_cooldown_active(self, rule_id: str) -> bool:
        """Check if rule is in cooldown period"""
        rule = self.rules.get(rule_id)
        if not rule:
            return False
        
        # Check recent alerts for this rule
        cutoff_time = datetime.utcnow() - timedelta(minutes=rule.cooldown_minutes)
        
        for alert in reversed(self.alert_history):
            if alert.rule_id == rule_id and alert.created_at > cutoff_time:
                return True
        
        return False
    
    async def _create_alert(self, rule: AlertRule, metric_value: float) -> Alert:
        """Create new alert"""
        alert_id = f"alert_{int(time.time() * 1000)}_{rule.id}"
        
        message = f"{rule.description} - Current value: {metric_value}, Threshold: {rule.threshold}"
        
        alert = Alert(
            id=alert_id,
            rule_id=rule.id,
            rule_name=rule.name,
            message=message,
            severity=rule.severity,
            status=AlertStatus.ACTIVE,
            metric_value=metric_value,
            threshold=rule.threshold,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            context={
                'metric': rule.metric,
                'condition': rule.condition,
                'tags': rule.tags
            }
        )
        
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Track alert creation
        business_logger.log_user_action(
            'system', 'alert_created',
            alert_id=alert_id,
            rule_id=rule.id,
            severity=rule.severity.value,
            metric_value=metric_value
        )
        
        return alert
    
    def _should_suppress_alert(self, alert: Alert) -> bool:
        """Check if alert should be suppressed"""
        # Track alert frequency
        rule_id = alert.rule_id
        current_time = time.time()
        
        # Clean old entries (last hour)
        cutoff_time = current_time - 3600
        alert_times = self.alert_counts[rule_id]
        while alert_times and alert_times[0] < cutoff_time:
            alert_times.popleft()
        
        alert_times.append(current_time)
        
        # Suppress if too many alerts in short time
        if len(alert_times) > 10:  # More than 10 alerts per hour
            alert.status = AlertStatus.SUPPRESSED
            business_logger.log_user_action(
                'system', 'alert_suppressed',
                alert_id=alert.id,
                reason='frequency_limit'
            )
            return True
        
        # Check custom suppression rules
        for rule in self.suppression_rules:
            if self._matches_suppression_rule(alert, rule):
                alert.status = AlertStatus.SUPPRESSED
                business_logger.log_user_action(
                    'system', 'alert_suppressed',
                    alert_id=alert.id,
                    reason=rule.get('reason', 'custom_rule')
                )
                return True
        
        return False
    
    def _matches_suppression_rule(self, alert: Alert, rule: Dict[str, Any]) -> bool:
        """Check if alert matches suppression rule"""
        # Example suppression rule matching
        if rule.get('severity') and alert.severity.value not in rule['severity']:
            return False
        
        if rule.get('tags'):
            for key, value in rule['tags'].items():
                if alert.context.get('tags', {}).get(key) != value:
                    return False
        
        return True
    
    async def _dispatch_alert(self, alert: Alert):
        """Dispatch alert through escalation policy"""
        rule = self.rules[alert.rule_id]
        policy = self.escalation_policies.get(rule.escalation_policy, self.escalation_policies['default'])
        
        # Start escalation
        asyncio.create_task(self._execute_escalation(alert, policy))
    
    async def _execute_escalation(self, alert: Alert, policy: EscalationPolicy):
        """Execute escalation policy"""
        for step in policy.steps:
            if alert.status != AlertStatus.ACTIVE:
                break  # Stop if alert was acknowledged or resolved
            
            # Wait for delay
            delay_minutes = step.get('delay_minutes', 0)
            if delay_minutes > 0:
                await asyncio.sleep(delay_minutes * 60)
            
            # Check if alert is still active
            if alert.status != AlertStatus.ACTIVE:
                break
            
            # Send through specified channels
            channels = step.get('channels', [])
            recipients = step.get('recipients', [])
            
            for channel_name in channels:
                if channel_name in self.channels:
                    try:
                        success = await self.channels[channel_name].send_alert(alert, recipients)
                        if success:
                            business_logger.log_user_action(
                                'system', 'alert_sent',
                                alert_id=alert.id,
                                channel=channel_name,
                                recipients=recipients
                            )
                    except Exception as e:
                        logging.error(f"Failed to send alert through {channel_name}: {e}")
    
    async def _resolve_alert(self, alert: Alert):
        """Resolve an alert"""
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.utcnow()
        alert.updated_at = datetime.utcnow()
        
        # Remove from active alerts
        if alert.id in self.active_alerts:
            del self.active_alerts[alert.id]
        
        business_logger.log_user_action(
            'system', 'alert_resolved',
            alert_id=alert.id,
            duration_minutes=(alert.resolved_at - alert.created_at).total_seconds() / 60
        )
    
    async def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_by = user_id
            alert.updated_at = datetime.utcnow()
            
            business_logger.log_user_action(
                user_id, 'alert_acknowledged',
                alert_id=alert_id
            )
            
            return True
        return False
    
    async def _cleanup_resolved_alerts(self):
        """Clean up old resolved alerts"""
        cutoff_time = datetime.utcnow() - timedelta(days=7)  # Keep for 7 days
        
        # Remove old alerts from history
        while (self.alert_history and 
               self.alert_history[0].created_at < cutoff_time and
               self.alert_history[0].status in [AlertStatus.RESOLVED, AlertStatus.SUPPRESSED]):
            self.alert_history.popleft()
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary"""
        active_count = len(self.active_alerts)
        severity_counts = defaultdict(int)
        
        for alert in self.active_alerts.values():
            severity_counts[alert.severity.value] += 1
        
        return {
            'active_alerts': active_count,
            'severity_breakdown': dict(severity_counts),
            'total_rules': len(self.rules),
            'enabled_rules': sum(1 for rule in self.rules.values() if rule.enabled),
            'escalation_policies': len(self.escalation_policies),
            'channels': len(self.channels)
        }

# Global alert manager instance
alert_manager = AlertManager()

# Pre-configured alert rules for LivyFlow
LIVYFLOW_ALERT_RULES = [
    AlertRule(
        id="high_error_rate",
        name="High Error Rate",
        description="HTTP error rate is too high",
        metric="http_errors_total",
        condition="gt",
        threshold=10,
        severity=AlertSeverity.HIGH,
        duration_minutes=5,
        escalation_policy="default"
    ),
    AlertRule(
        id="slow_response_time",
        name="Slow API Response Time",
        description="API response time is above threshold",
        metric="http_request_duration_ms",
        condition="gt",
        threshold=5000,
        severity=AlertSeverity.MEDIUM,
        duration_minutes=10,
        escalation_policy="default"
    ),
    AlertRule(
        id="high_cpu_usage",
        name="High CPU Usage",
        description="System CPU usage is critically high",
        metric="system_cpu_percent",
        condition="gt",
        threshold=85,
        severity=AlertSeverity.CRITICAL,
        duration_minutes=3,
        escalation_policy="critical"
    ),
    AlertRule(
        id="high_memory_usage",
        name="High Memory Usage",
        description="System memory usage is too high",
        metric="system_memory_percent",
        condition="gt",
        threshold=90,
        severity=AlertSeverity.HIGH,
        duration_minutes=5,
        escalation_policy="default"
    ),
    AlertRule(
        id="database_connection_failures",
        name="Database Connection Failures",
        description="Database connection failures detected",
        metric="database_errors_total",
        condition="gt",
        threshold=5,
        severity=AlertSeverity.CRITICAL,
        duration_minutes=2,
        escalation_policy="critical"
    ),
    AlertRule(
        id="transaction_anomaly",
        name="Transaction Volume Anomaly",
        description="Unusual transaction volume detected",
        metric="transactions_total",
        condition="anomaly",
        threshold=2.5,  # Z-score threshold
        severity=AlertSeverity.MEDIUM,
        duration_minutes=15,
        escalation_policy="default"
    )
]

async def initialize_alert_rules():
    """Initialize default alert rules"""
    for rule in LIVYFLOW_ALERT_RULES:
        alert_manager.add_rule(rule)
    
    await alert_manager.start()
    logging.info(f"Initialized {len(LIVYFLOW_ALERT_RULES)} alert rules")