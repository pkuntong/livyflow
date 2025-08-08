"""
Log Aggregation and Analysis System
Collects, indexes, and analyzes logs for troubleshooting and insights
"""

import asyncio
import json
import re
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
from enum import Enum
import hashlib
import gzip
from pathlib import Path

from .monitoring import metrics_collector
from .alerting import alert_manager, AlertSeverity
from .logging_config import business_logger

class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: datetime
    level: LogLevel
    logger: str
    message: str
    module: Optional[str] = None
    function: Optional[str] = None
    line: Optional[int] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    correlation_id: Optional[str] = None
    extra_fields: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.extra_fields is None:
            self.extra_fields = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/indexing"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['level'] = self.level.value
        return data

@dataclass
class LogPattern:
    """Identified log pattern"""
    id: str
    pattern: str
    frequency: int
    first_seen: datetime
    last_seen: datetime
    severity: LogLevel
    sample_messages: List[str]
    
class LogAggregator:
    """Main log aggregation system"""
    
    def __init__(self, storage_path: str = "logs/aggregated"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # In-memory indices
        self.recent_logs: List[LogEntry] = []
        self.log_patterns: Dict[str, LogPattern] = {}
        self.user_logs: Dict[str, List[LogEntry]] = defaultdict(list)
        self.error_signatures: Dict[str, int] = defaultdict(int)
        
        # Analysis data
        self.hourly_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.daily_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        
        # Configuration
        self.max_recent_logs = 10000
        self.pattern_detection_enabled = True
        self.anomaly_detection_enabled = True
        
        # Background tasks
        self.running = False
        self.analysis_task = None
        self.cleanup_task = None
    
    async def start(self):
        """Start log aggregation system"""
        self.running = True
        self.analysis_task = asyncio.create_task(self._analysis_loop())
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logging.info("Log aggregation system started")
    
    async def stop(self):
        """Stop log aggregation system"""
        self.running = False
        if self.analysis_task:
            self.analysis_task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
        logging.info("Log aggregation system stopped")
    
    def ingest_log(self, log_entry: LogEntry):
        """Ingest a single log entry"""
        # Add to recent logs
        self.recent_logs.append(log_entry)
        
        # Maintain size limit
        if len(self.recent_logs) > self.max_recent_logs:
            self.recent_logs.pop(0)
        
        # Index by user if available
        if log_entry.user_id:
            self.user_logs[log_entry.user_id].append(log_entry)
            if len(self.user_logs[log_entry.user_id]) > 1000:  # Limit per user
                self.user_logs[log_entry.user_id].pop(0)
        
        # Update statistics
        self._update_stats(log_entry)
        
        # Pattern detection
        if self.pattern_detection_enabled:
            self._detect_patterns(log_entry)
        
        # Store to disk (async)
        asyncio.create_task(self._store_log_entry(log_entry))
        
        # Track metrics
        metrics_collector.increment_counter(
            'logs_ingested_total',
            tags={'level': log_entry.level.value, 'logger': log_entry.logger}
        )
        
        # Immediate analysis for critical logs
        if log_entry.level in [LogLevel.ERROR, LogLevel.CRITICAL]:
            asyncio.create_task(self._analyze_error(log_entry))
    
    def _update_stats(self, log_entry: LogEntry):
        """Update hourly and daily statistics"""
        hour_key = log_entry.timestamp.strftime('%Y-%m-%d %H:00')
        day_key = log_entry.timestamp.strftime('%Y-%m-%d')
        
        # Hourly stats
        self.hourly_stats[hour_key]['total'] += 1
        self.hourly_stats[hour_key][log_entry.level.value] += 1
        self.hourly_stats[hour_key][log_entry.logger] += 1
        
        # Daily stats
        self.daily_stats[day_key]['total'] += 1
        self.daily_stats[day_key][log_entry.level.value] += 1
        self.daily_stats[day_key][log_entry.logger] += 1
    
    def _detect_patterns(self, log_entry: LogEntry):
        """Detect recurring log patterns"""
        # Create pattern signature
        pattern_signature = self._create_pattern_signature(log_entry.message)
        
        if pattern_signature in self.log_patterns:
            # Update existing pattern
            pattern = self.log_patterns[pattern_signature]
            pattern.frequency += 1
            pattern.last_seen = log_entry.timestamp
            
            # Add sample message if not already present
            if log_entry.message not in pattern.sample_messages and len(pattern.sample_messages) < 5:
                pattern.sample_messages.append(log_entry.message)
        else:
            # Create new pattern
            pattern = LogPattern(
                id=pattern_signature,
                pattern=pattern_signature,
                frequency=1,
                first_seen=log_entry.timestamp,
                last_seen=log_entry.timestamp,
                severity=log_entry.level,
                sample_messages=[log_entry.message]
            )
            self.log_patterns[pattern_signature] = pattern
    
    def _create_pattern_signature(self, message: str) -> str:
        """Create a signature for pattern detection"""
        # Replace numbers, UUIDs, timestamps, etc. with placeholders
        patterns = [
            (r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', '<TIMESTAMP>'),  # ISO timestamps
            (r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}', '<TIMESTAMP>'),   # Standard timestamps
            (r'\b\d+\.\d+\.\d+\.\d+\b', '<IP_ADDRESS>'),               # IP addresses
            (r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b', '<UUID>'),  # UUIDs
            (r'\b\d+\b', '<NUMBER>'),                                   # Numbers
            (r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', '<EMAIL>'),  # Email addresses
            (r'/api/[^/]+/\d+', '/api/<RESOURCE>/<ID>'),               # API paths with IDs
            (r'user_id=\w+', 'user_id=<USER_ID>'),                     # User IDs
        ]
        
        normalized = message
        for pattern, replacement in patterns:
            normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
        
        return hashlib.md5(normalized.encode()).hexdigest()[:16]
    
    async def _store_log_entry(self, log_entry: LogEntry):
        """Store log entry to disk"""
        try:
            # Organize by date
            date_str = log_entry.timestamp.strftime('%Y-%m-%d')
            log_file = self.storage_path / f"{date_str}.jsonl"
            
            # Append to file
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry.to_dict()) + '\n')
        
        except Exception as e:
            logging.error(f"Failed to store log entry: {e}")
    
    async def _analyze_error(self, log_entry: LogEntry):
        """Immediate analysis for error logs"""
        # Create error signature
        error_signature = self._create_error_signature(log_entry)
        self.error_signatures[error_signature] += 1
        
        # Check for error spike
        if self.error_signatures[error_signature] > 5:  # More than 5 occurrences
            await self._create_error_spike_alert(error_signature, log_entry)
        
        # Track error metrics
        metrics_collector.increment_counter(
            'error_logs_total',
            tags={
                'logger': log_entry.logger,
                'signature': error_signature[:8]  # Shortened signature
            }
        )
    
    def _create_error_signature(self, log_entry: LogEntry) -> str:
        """Create signature for error deduplication"""
        components = [
            log_entry.logger,
            log_entry.module or '',
            log_entry.function or '',
            self._create_pattern_signature(log_entry.message)
        ]
        return hashlib.md5('|'.join(components).encode()).hexdigest()
    
    async def _create_error_spike_alert(self, error_signature: str, sample_log: LogEntry):
        """Create alert for error spikes"""
        try:
            count = self.error_signatures[error_signature]
            
            # Create alert through alert manager
            alert_data = {
                'rule_name': 'Error Log Spike',
                'message': f'Error spike detected: {count} occurrences of {sample_log.message[:100]}...',
                'severity': 'high' if count > 10 else 'medium',
                'context': {
                    'error_signature': error_signature,
                    'count': count,
                    'logger': sample_log.logger,
                    'sample_message': sample_log.message
                }
            }
            
            business_logger.log_user_action(
                'system',
                'error_spike_detected',
                **alert_data['context']
            )
        
        except Exception as e:
            logging.error(f"Failed to create error spike alert: {e}")
    
    async def _analysis_loop(self):
        """Background analysis loop"""
        while self.running:
            try:
                await self._run_analysis()
                await asyncio.sleep(300)  # Run every 5 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in analysis loop: {e}")
                await asyncio.sleep(300)
    
    async def _cleanup_loop(self):
        """Background cleanup loop"""
        while self.running:
            try:
                await self._cleanup_old_data()
                await asyncio.sleep(3600)  # Run every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in cleanup loop: {e}")
                await asyncio.sleep(3600)
    
    async def _run_analysis(self):
        """Run periodic log analysis"""
        # Anomaly detection
        if self.anomaly_detection_enabled:
            await self._detect_anomalies()
        
        # Pattern analysis
        await self._analyze_patterns()
        
        # Performance insights
        await self._generate_insights()
    
    async def _detect_anomalies(self):
        """Detect anomalies in log patterns"""
        # Get recent hourly stats
        recent_hours = sorted(self.hourly_stats.keys())[-24:]  # Last 24 hours
        
        if len(recent_hours) < 6:  # Need at least 6 hours of data
            return
        
        # Calculate baselines
        for hour in recent_hours[-6:]:  # Last 6 hours
            stats = self.hourly_stats[hour]
            
            # Compare with previous hours
            historical_stats = [self.hourly_stats[h] for h in recent_hours[:-6]]
            
            for log_level in ['ERROR', 'WARNING']:
                current_count = stats.get(log_level, 0)
                historical_counts = [s.get(log_level, 0) for s in historical_stats]
                
                if not historical_counts:
                    continue
                
                avg_historical = sum(historical_counts) / len(historical_counts)
                
                # Anomaly if current is 3x historical average and > 10
                if current_count > max(10, 3 * avg_historical):
                    await self._create_anomaly_alert(log_level, current_count, avg_historical, hour)
    
    async def _create_anomaly_alert(self, log_level: str, current_count: int, historical_avg: float, hour: str):
        """Create alert for log anomaly"""
        business_logger.log_user_action(
            'system',
            'log_anomaly_detected',
            log_level=log_level,
            current_count=current_count,
            historical_average=historical_avg,
            hour=hour,
            anomaly_ratio=current_count / max(historical_avg, 1)
        )
    
    async def _analyze_patterns(self):
        """Analyze detected patterns for insights"""
        # Find most frequent patterns
        frequent_patterns = sorted(
            self.log_patterns.values(),
            key=lambda p: p.frequency,
            reverse=True
        )[:10]
        
        # Analyze pattern trends
        for pattern in frequent_patterns:
            if pattern.frequency > 100 and pattern.severity in [LogLevel.ERROR, LogLevel.WARNING]:
                business_logger.log_user_action(
                    'system',
                    'frequent_log_pattern',
                    pattern_id=pattern.id,
                    frequency=pattern.frequency,
                    severity=pattern.severity.value,
                    first_seen=pattern.first_seen.isoformat(),
                    sample_message=pattern.sample_messages[0] if pattern.sample_messages else None
                )
    
    async def _generate_insights(self):
        """Generate performance and operational insights"""
        # Service health insights
        recent_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        hour_key = recent_hour.strftime('%Y-%m-%d %H:00')
        
        if hour_key in self.hourly_stats:
            stats = self.hourly_stats[hour_key]
            total_logs = stats.get('total', 0)
            error_logs = stats.get('ERROR', 0) + stats.get('CRITICAL', 0)
            
            if total_logs > 0:
                error_rate = (error_logs / total_logs) * 100
                
                business_logger.log_user_action(
                    'system',
                    'hourly_log_summary',
                    hour=hour_key,
                    total_logs=total_logs,
                    error_logs=error_logs,
                    error_rate=error_rate
                )
    
    async def _cleanup_old_data(self):
        """Clean up old log data"""
        # Remove old in-memory data
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        self.recent_logs = [
            log for log in self.recent_logs 
            if log.timestamp > cutoff_time
        ]
        
        # Clean old hourly stats (keep 7 days)
        cutoff_hour = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d %H:00')
        old_hours = [hour for hour in self.hourly_stats.keys() if hour < cutoff_hour]
        for hour in old_hours:
            del self.hourly_stats[hour]
        
        # Compress old log files
        await self._compress_old_logs()
    
    async def _compress_old_logs(self):
        """Compress old log files"""
        try:
            # Find log files older than 7 days
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            
            for log_file in self.storage_path.glob("*.jsonl"):
                try:
                    # Parse date from filename
                    date_str = log_file.stem
                    file_date = datetime.strptime(date_str, '%Y-%m-%d')
                    
                    if file_date < cutoff_date:
                        # Compress file
                        compressed_file = log_file.with_suffix('.jsonl.gz')
                        
                        with open(log_file, 'rb') as f_in:
                            with gzip.open(compressed_file, 'wb') as f_out:
                                f_out.write(f_in.read())
                        
                        # Remove original
                        log_file.unlink()
                        
                except Exception as e:
                    logging.error(f"Failed to compress log file {log_file}: {e}")
        
        except Exception as e:
            logging.error(f"Error in log compression: {e}")
    
    # Query methods
    def search_logs(
        self, 
        query: Optional[str] = None,
        level: Optional[LogLevel] = None,
        logger: Optional[str] = None,
        user_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[LogEntry]:
        """Search logs with filters"""
        results = []
        
        # Search in recent logs (in-memory)
        for log_entry in reversed(self.recent_logs):  # Most recent first
            if len(results) >= limit:
                break
            
            # Apply filters
            if level and log_entry.level != level:
                continue
            if logger and log_entry.logger != logger:
                continue
            if user_id and log_entry.user_id != user_id:
                continue
            if start_time and log_entry.timestamp < start_time:
                continue
            if end_time and log_entry.timestamp > end_time:
                continue
            if query and query.lower() not in log_entry.message.lower():
                continue
            
            results.append(log_entry)
        
        return results
    
    def get_log_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get log statistics for the specified time period"""
        # Get recent hourly stats
        recent_hours = sorted(self.hourly_stats.keys())[-hours:]
        
        total_logs = 0
        level_counts = defaultdict(int)
        logger_counts = defaultdict(int)
        
        for hour in recent_hours:
            stats = self.hourly_stats[hour]
            total_logs += stats.get('total', 0)
            
            for key, count in stats.items():
                if key in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']:
                    level_counts[key] += count
                elif key != 'total':
                    logger_counts[key] += count
        
        return {
            'total_logs': total_logs,
            'level_distribution': dict(level_counts),
            'top_loggers': dict(sorted(logger_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
            'error_rate': (level_counts['ERROR'] + level_counts['CRITICAL']) / max(total_logs, 1) * 100,
            'time_period_hours': hours,
            'patterns_detected': len(self.log_patterns),
            'unique_errors': len(self.error_signatures)
        }
    
    def get_user_activity(self, user_id: str, limit: int = 50) -> List[LogEntry]:
        """Get recent log activity for a specific user"""
        user_logs = self.user_logs.get(user_id, [])
        return sorted(user_logs, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def get_top_patterns(self, limit: int = 10) -> List[LogPattern]:
        """Get most frequent log patterns"""
        return sorted(
            self.log_patterns.values(),
            key=lambda p: p.frequency,
            reverse=True
        )[:limit]

# Global log aggregator instance
log_aggregator = LogAggregator()

# Custom log handler for integration
class AggregatorHandler(logging.Handler):
    """Custom logging handler that sends logs to aggregator"""
    
    def emit(self, record):
        try:
            # Convert log record to LogEntry
            log_entry = LogEntry(
                timestamp=datetime.fromtimestamp(record.created),
                level=LogLevel(record.levelname),
                logger=record.name,
                message=record.getMessage(),
                module=getattr(record, 'module', None),
                function=getattr(record, 'funcName', None),
                line=getattr(record, 'lineno', None),
                user_id=getattr(record, 'user_id', None),
                request_id=getattr(record, 'request_id', None),
                correlation_id=getattr(record, 'correlation_id', None),
                extra_fields=getattr(record, 'extra_fields', {})
            )
            
            # Send to aggregator
            log_aggregator.ingest_log(log_entry)
            
        except Exception as e:
            # Don't let log handling errors break the application
            print(f"Error in log aggregator handler: {e}")

async def initialize_log_aggregation():
    """Initialize log aggregation system"""
    await log_aggregator.start()
    
    # Add handler to root logger
    root_logger = logging.getLogger()
    aggregator_handler = AggregatorHandler()
    aggregator_handler.setLevel(logging.INFO)
    root_logger.addHandler(aggregator_handler)
    
    logging.info("Log aggregation system initialized")