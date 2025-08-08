# CDN and Caching Strategies for LivyFlow

## Overview
This document outlines comprehensive Content Delivery Network (CDN) and caching strategies to optimize performance, reduce latency, and minimize costs for LivyFlow's global user base.

## Multi-Layer Caching Architecture

### Layer 1: CloudFront CDN (Global Edge Caching)
**Purpose**: Global content distribution and edge caching
**TTL**: Static assets (1 year), API responses (5-15 minutes)
**Coverage**: 400+ global edge locations

### Layer 2: Application Load Balancer (Regional Caching)
**Purpose**: Regional load distribution and SSL termination
**TTL**: Dynamic content (1-5 minutes)
**Coverage**: Regional availability zones

### Layer 3: Kubernetes Ingress (Cluster-level Caching)
**Purpose**: Ingress-level caching and rate limiting
**TTL**: API responses (1-5 minutes)
**Coverage**: Within Kubernetes cluster

### Layer 4: Application Cache (Redis/ElastiCache)
**Purpose**: Session data, frequently accessed data
**TTL**: Session data (24 hours), API cache (5-30 minutes)
**Coverage**: Application-level caching

### Layer 5: Database Query Cache (PostgreSQL + Connection Pooling)
**Purpose**: Query result caching and connection optimization
**TTL**: Query cache (1-15 minutes)
**Coverage**: Database level

## CloudFront CDN Configuration

### Primary Distribution
```json
{
  "DistributionConfig": {
    "CallerReference": "livyflow-primary-2024",
    "Aliases": {
      "Quantity": 3,
      "Items": [
        "livyflow.com",
        "www.livyflow.com", 
        "app.livyflow.com"
      ]
    },
    "DefaultRootObject": "index.html",
    "Comment": "LivyFlow Primary CDN Distribution",
    "PriceClass": "PriceClass_100",
    "Enabled": true,
    "HttpVersion": "http2and3",
    "IsIPV6Enabled": true,
    
    "Origins": {
      "Quantity": 3,
      "Items": [
        {
          "Id": "S3-Frontend-Assets",
          "DomainName": "livyflow-frontend-prod-xxxx.s3.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": "origin-access-identity/cloudfront/XXXXX"
          },
          "ConnectionAttempts": 3,
          "ConnectionTimeout": 10,
          "OriginShield": {
            "Enabled": true,
            "OriginShieldRegion": "us-east-1"
          }
        },
        {
          "Id": "ALB-API-Backend",
          "DomainName": "livyflow-alb-prod.us-east-1.elb.amazonaws.com",
          "CustomOriginConfig": {
            "HTTPPort": 80,
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "https-only",
            "OriginSslProtocols": {
              "Quantity": 1,
              "Items": ["TLSv1.2"]
            },
            "OriginReadTimeout": 30,
            "OriginKeepaliveTimeout": 5
          },
          "OriginShield": {
            "Enabled": true,
            "OriginShieldRegion": "us-east-1"
          }
        },
        {
          "Id": "Failover-Origin",
          "DomainName": "livyflow-failover.s3-website.amazonaws.com",
          "CustomOriginConfig": {
            "HTTPPort": 80,
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "http-only"
          }
        }
      ]
    },
    
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-Frontend-Assets",
      "ViewerProtocolPolicy": "redirect-to-https",
      "Compress": true,
      "CachePolicyId": "custom-frontend-policy",
      "OriginRequestPolicyId": "custom-origin-policy",
      "ResponseHeadersPolicyId": "custom-security-headers",
      "RealtimeLogConfigArn": "arn:aws:logs:us-east-1:ACCOUNT:log-group:cloudfront-realtime"
    },
    
    "CacheBehaviors": {
      "Quantity": 5,
      "Items": [
        {
          "PathPattern": "/api/v1/auth/*",
          "TargetOriginId": "ALB-API-Backend",
          "ViewerProtocolPolicy": "https-only",
          "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
          "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
          "TTL": 0,
          "Compress": true,
          "AllowedMethods": {
            "Quantity": 7,
            "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
          }
        },
        {
          "PathPattern": "/api/v1/transactions*",
          "TargetOriginId": "ALB-API-Backend",
          "ViewerProtocolPolicy": "https-only", 
          "CachePolicyId": "custom-api-cache-policy",
          "TTL": 300,
          "Compress": true
        },
        {
          "PathPattern": "/api/v1/budgets*",
          "TargetOriginId": "ALB-API-Backend",
          "ViewerProtocolPolicy": "https-only",
          "CachePolicyId": "custom-api-cache-policy", 
          "TTL": 900,
          "Compress": true
        },
        {
          "PathPattern": "/static/*",
          "TargetOriginId": "S3-Frontend-Assets",
          "ViewerProtocolPolicy": "redirect-to-https",
          "CachePolicyId": "custom-static-assets-policy",
          "TTL": 31536000,
          "Compress": true
        },
        {
          "PathPattern": "*.js",
          "TargetOriginId": "S3-Frontend-Assets", 
          "ViewerProtocolPolicy": "redirect-to-https",
          "CachePolicyId": "custom-static-assets-policy",
          "TTL": 31536000,
          "Compress": true
        }
      ]
    },
    
    "CustomErrorResponses": {
      "Quantity": 3,
      "Items": [
        {
          "ErrorCode": 404,
          "ResponsePagePath": "/index.html",
          "ResponseCode": "200",
          "ErrorCachingMinTTL": 300
        },
        {
          "ErrorCode": 403,
          "ResponsePagePath": "/index.html", 
          "ResponseCode": "200",
          "ErrorCachingMinTTL": 300
        },
        {
          "ErrorCode": 500,
          "ResponsePagePath": "/error.html",
          "ResponseCode": "500",
          "ErrorCachingMinTTL": 60
        }
      ]
    },
    
    "WebACLId": "arn:aws:wafv2:us-east-1:ACCOUNT:global/webacl/livyflow-waf/xxxxx",
    
    "Logging": {
      "Enabled": true,
      "IncludeCookies": false,
      "Bucket": "livyflow-cloudfront-logs.s3.amazonaws.com",
      "Prefix": "access-logs/"
    }
  }
}
```

### Custom Cache Policies
```json
{
  "CustomCachePolicies": [
    {
      "Name": "livyflow-frontend-policy",
      "Comment": "Cache policy for frontend assets",
      "DefaultTTL": 86400,
      "MaxTTL": 31536000,
      "MinTTL": 1,
      "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingGzip": true,
        "EnableAcceptEncodingBrotli": true,
        "QueryStringsConfig": {
          "QueryStringBehavior": "none"
        },
        "HeadersConfig": {
          "HeaderBehavior": "whitelist",
          "Headers": {
            "Quantity": 3,
            "Items": ["Accept", "Accept-Language", "Authorization"]
          }
        },
        "CookiesConfig": {
          "CookieBehavior": "none"
        }
      }
    },
    {
      "Name": "livyflow-api-cache-policy",
      "Comment": "Cache policy for API endpoints",
      "DefaultTTL": 300,
      "MaxTTL": 3600,
      "MinTTL": 0,
      "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingGzip": true,
        "EnableAcceptEncodingBrotli": true,
        "QueryStringsConfig": {
          "QueryStringBehavior": "whitelist",
          "QueryStrings": {
            "Quantity": 5,
            "Items": ["limit", "offset", "sort", "filter", "date_range"]
          }
        },
        "HeadersConfig": {
          "HeaderBehavior": "whitelist",
          "Headers": {
            "Quantity": 4,
            "Items": ["Authorization", "Content-Type", "Accept", "User-Agent"]
          }
        },
        "CookiesConfig": {
          "CookieBehavior": "whitelist",
          "Cookies": {
            "Quantity": 2,
            "Items": ["session_id", "csrf_token"]
          }
        }
      }
    }
  ]
}
```

## Application-Level Caching Strategy

### Redis Cluster Configuration
```yaml
# Redis configuration for high-performance caching
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: livyflow-prod
spec:
  serviceName: redis-cluster
  replicas: 6  # 3 masters + 3 replicas
  template:
    spec:
      containers:
      - name: redis
        image: redis:7.2-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        env:
        - name: REDIS_CLUSTER_ANNOUNCE_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: REDIS_CLUSTER_ANNOUNCE_PORT
          value: "6379"
        - name: REDIS_CLUSTER_ANNOUNCE_BUS_PORT
          value: "16379"
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      initContainers:
      - name: redis-cluster-init
        image: redis:7.2-alpine
        command:
        - sh
        - -c
        - |
          redis-cli --cluster create \
            redis-cluster-0.redis-cluster:6379 \
            redis-cluster-1.redis-cluster:6379 \
            redis-cluster-2.redis-cluster:6379 \
            redis-cluster-3.redis-cluster:6379 \
            redis-cluster-4.redis-cluster:6379 \
            redis-cluster-5.redis-cluster:6379 \
            --cluster-replicas 1 --cluster-yes
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 20Gi

---
# Redis configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: livyflow-prod
data:
  redis.conf: |
    # Network and security
    bind 0.0.0.0
    protected-mode no
    port 6379
    
    # Cluster configuration
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 15000
    cluster-announce-ip ${REDIS_CLUSTER_ANNOUNCE_IP}
    cluster-announce-port ${REDIS_CLUSTER_ANNOUNCE_PORT}
    cluster-announce-bus-port ${REDIS_CLUSTER_ANNOUNCE_BUS_PORT}
    
    # Memory and persistence
    maxmemory 800mb
    maxmemory-policy allkeys-lru
    save 900 1
    save 300 10
    save 60 10000
    
    # Performance tuning
    tcp-keepalive 60
    timeout 0
    tcp-backlog 511
    
    # Logging
    loglevel notice
    logfile /data/redis.log
    
    # Security (use AUTH token from secret)
    requirepass ${REDIS_PASSWORD}
    
    # Append only file
    appendonly yes
    appendfsync everysec
    
    # Compression
    rdbcompression yes
    rdbchecksum yes
```

### Application Cache Implementation
```python
# Enhanced caching service for FastAPI application
import redis
import json
import hashlib
import asyncio
from typing import Any, Optional, Dict, List
from functools import wraps
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger(__name__)

class CacheService:
    def __init__(self, redis_url: str, cluster_mode: bool = True):
        if cluster_mode:
            from rediscluster import RedisCluster
            self.redis = RedisCluster.from_url(redis_url, decode_responses=True)
        else:
            self.redis = redis.from_url(redis_url, decode_responses=True)
        
        # Cache configurations for different data types
        self.cache_configs = {
            'user_profile': {'ttl': 3600, 'prefix': 'user'},
            'transactions': {'ttl': 300, 'prefix': 'txn'},
            'budgets': {'ttl': 900, 'prefix': 'budget'},
            'analytics': {'ttl': 1800, 'prefix': 'analytics'},
            'session': {'ttl': 86400, 'prefix': 'session'},
            'rate_limit': {'ttl': 3600, 'prefix': 'ratelimit'}
        }
    
    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate consistent cache key from arguments"""
        key_data = f"{prefix}:{':'.join(map(str, args))}"
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = ':'.join(f"{k}={v}" for k, v in sorted_kwargs)
            key_data = f"{key_data}:{kwargs_str}"
        
        # Hash long keys to avoid Redis key length limits
        if len(key_data) > 250:
            key_hash = hashlib.sha256(key_data.encode()).hexdigest()[:16]
            return f"{prefix}:hash:{key_hash}"
        
        return key_data
    
    async def get(self, cache_type: str, *args, **kwargs) -> Optional[Any]:
        """Get cached data"""
        try:
            config = self.cache_configs.get(cache_type, {})
            cache_key = self._generate_cache_key(config.get('prefix', cache_type), *args, **kwargs)
            
            cached_data = await asyncio.to_thread(self.redis.get, cache_key)
            if cached_data:
                logger.info("Cache hit", cache_key=cache_key, cache_type=cache_type)
                return json.loads(cached_data)
            
            logger.debug("Cache miss", cache_key=cache_key, cache_type=cache_type)
            return None
            
        except Exception as e:
            logger.error("Cache get error", error=str(e), cache_type=cache_type)
            return None
    
    async def set(self, cache_type: str, data: Any, *args, ttl: Optional[int] = None, **kwargs) -> bool:
        """Set cached data"""
        try:
            config = self.cache_configs.get(cache_type, {})
            cache_key = self._generate_cache_key(config.get('prefix', cache_type), *args, **kwargs)
            cache_ttl = ttl or config.get('ttl', 3600)
            
            serialized_data = json.dumps(data, default=str)
            
            result = await asyncio.to_thread(
                self.redis.setex, 
                cache_key, 
                cache_ttl, 
                serialized_data
            )
            
            logger.info("Cache set", cache_key=cache_key, ttl=cache_ttl, cache_type=cache_type)
            return result
            
        except Exception as e:
            logger.error("Cache set error", error=str(e), cache_type=cache_type)
            return False
    
    async def delete(self, cache_type: str, *args, **kwargs) -> bool:
        """Delete cached data"""
        try:
            config = self.cache_configs.get(cache_type, {})
            cache_key = self._generate_cache_key(config.get('prefix', cache_type), *args, **kwargs)
            
            result = await asyncio.to_thread(self.redis.delete, cache_key)
            logger.info("Cache delete", cache_key=cache_key, cache_type=cache_type)
            return bool(result)
            
        except Exception as e:
            logger.error("Cache delete error", error=str(e), cache_type=cache_type)
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache keys matching pattern"""
        try:
            keys = await asyncio.to_thread(self.redis.keys, pattern)
            if keys:
                result = await asyncio.to_thread(self.redis.delete, *keys)
                logger.info("Cache pattern invalidated", pattern=pattern, keys_deleted=result)
                return result
            return 0
            
        except Exception as e:
            logger.error("Cache invalidate pattern error", error=str(e), pattern=pattern)
            return 0

# Initialize cache service
cache_service = CacheService(
    redis_url=os.getenv("REDIS_URL"),
    cluster_mode=os.getenv("REDIS_CLUSTER_MODE", "true").lower() == "true"
)

# Caching decorators
def cache_result(cache_type: str, ttl: Optional[int] = None):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to get from cache
            cached_result = await cache_service.get(cache_type, *args, **kwargs)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set(cache_type, result, *args, ttl=ttl, **kwargs)
            
            return result
        return wrapper
    return decorator

# Usage examples in API endpoints
@router.get("/users/{user_id}/transactions")
@cache_result("transactions", ttl=300)
async def get_user_transactions(
    user_id: str, 
    limit: int = 20, 
    offset: int = 0,
    date_range: Optional[str] = None
):
    # Database query logic here
    pass

@router.get("/users/{user_id}/monthly-summary")
@cache_result("analytics", ttl=1800)
async def get_monthly_summary(user_id: str, month: str):
    # Analytics calculation logic here
    pass
```

## Intelligent Cache Warming

### Cache Warming Strategies
```python
# Cache warming service for predictive caching
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
import structlog

logger = structlog.get_logger(__name__)

class CacheWarmingService:
    def __init__(self, cache_service: CacheService, db_service):
        self.cache_service = cache_service
        self.db_service = db_service
        
    async def warm_user_data(self, user_id: str):
        """Warm cache with frequently accessed user data"""
        try:
            # Warm user profile
            user_profile = await self.db_service.get_user_profile(user_id)
            await self.cache_service.set("user_profile", user_profile, user_id)
            
            # Warm recent transactions
            recent_transactions = await self.db_service.get_recent_transactions(
                user_id, limit=50
            )
            await self.cache_service.set("transactions", recent_transactions, user_id, "recent")
            
            # Warm active budgets
            active_budgets = await self.db_service.get_active_budgets(user_id)
            await self.cache_service.set("budgets", active_budgets, user_id, "active")
            
            # Warm monthly summary for current month
            current_month = datetime.now().strftime("%Y-%m")
            monthly_summary = await self.db_service.get_monthly_summary(user_id, current_month)
            await self.cache_service.set("analytics", monthly_summary, user_id, current_month)
            
            logger.info("Cache warmed for user", user_id=user_id)
            
        except Exception as e:
            logger.error("Cache warming error", user_id=user_id, error=str(e))
    
    async def warm_popular_data(self):
        """Warm cache with globally popular data"""
        try:
            # Warm category data
            categories = await self.db_service.get_all_categories()
            await self.cache_service.set("categories", categories, "all")
            
            # Warm market insights (if applicable)
            market_insights = await self.db_service.get_market_insights()
            await self.cache_service.set("analytics", market_insights, "market", "insights")
            
            logger.info("Popular data cache warmed")
            
        except Exception as e:
            logger.error("Popular data cache warming error", error=str(e))
    
    async def scheduled_cache_warming(self):
        """Scheduled cache warming based on usage patterns"""
        # Get list of active users (logged in within last 24 hours)
        active_users = await self.db_service.get_active_users(
            since=datetime.now() - timedelta(hours=24)
        )
        
        # Warm cache for active users (limit to top 1000)
        for user_id in active_users[:1000]:
            await self.warm_user_data(user_id)
            await asyncio.sleep(0.1)  # Avoid overwhelming the system
        
        # Warm popular data
        await self.warm_popular_data()
        
        logger.info("Scheduled cache warming completed", users_warmed=len(active_users[:1000]))

# Kubernetes CronJob for cache warming
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cache-warming
  namespace: livyflow-prod
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cache-warmer
            image: livyflow/cache-warmer:latest
            command:
            - python
            - -c
            - |
              import asyncio
              from cache_warming_service import CacheWarmingService
              
              async def main():
                  warmer = CacheWarmingService()
                  await warmer.scheduled_cache_warming()
              
              asyncio.run(main())
            envFrom:
            - configMapRef:
                name: livyflow-config
            - secretRef:
                name: livyflow-secrets
            resources:
              requests:
                memory: "256Mi"
                cpu: "100m"
              limits:
                memory: "512Mi"
                cpu: "200m"
          restartPolicy: OnFailure
```

## Cache Invalidation Strategy

### Smart Cache Invalidation
```python
# Cache invalidation service
class CacheInvalidationService:
    def __init__(self, cache_service: CacheService):
        self.cache_service = cache_service
        
        # Define invalidation rules
        self.invalidation_rules = {
            'transaction_created': [
                'transactions:{user_id}:*',
                'analytics:{user_id}:*',
                'budget:{user_id}:*'
            ],
            'budget_updated': [
                'budget:{user_id}:*',
                'analytics:{user_id}:*'
            ],
            'user_profile_updated': [
                'user:{user_id}:*',
                'analytics:{user_id}:*'
            ],
            'category_updated': [
                'categories:*',
                'transactions:*:*',
                'analytics:*:*'
            ]
        }
    
    async def invalidate_on_event(self, event_type: str, context: Dict[str, Any]):
        """Invalidate cache based on domain events"""
        try:
            patterns = self.invalidation_rules.get(event_type, [])
            
            for pattern_template in patterns:
                # Format pattern with context variables
                pattern = pattern_template.format(**context)
                
                # Invalidate matching cache keys
                deleted_count = await self.cache_service.invalidate_pattern(pattern)
                
                logger.info(
                    "Cache invalidated",
                    event_type=event_type,
                    pattern=pattern,
                    keys_deleted=deleted_count
                )
                
        except Exception as e:
            logger.error(
                "Cache invalidation error",
                event_type=event_type,
                error=str(e)
            )

# Event-driven cache invalidation
from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class DomainEvent:
    event_type: str
    context: Dict[str, Any]
    timestamp: datetime

class EventBus:
    def __init__(self, cache_invalidation_service: CacheInvalidationService):
        self.cache_invalidation_service = cache_invalidation_service
        self.subscribers = []
    
    async def publish(self, event: DomainEvent):
        """Publish domain event and trigger cache invalidation"""
        await self.cache_invalidation_service.invalidate_on_event(
            event.event_type,
            event.context
        )
        
        # Notify other subscribers
        for subscriber in self.subscribers:
            await subscriber.handle_event(event)

# Usage in API endpoints
@router.post("/transactions")
async def create_transaction(transaction_data: TransactionCreate, user_id: str):
    # Create transaction in database
    transaction = await transaction_service.create(transaction_data, user_id)
    
    # Publish domain event for cache invalidation
    await event_bus.publish(DomainEvent(
        event_type="transaction_created",
        context={"user_id": user_id},
        timestamp=datetime.now()
    ))
    
    return transaction
```

## Performance Monitoring and Optimization

### Cache Metrics and Monitoring
```yaml
# Prometheus monitoring for cache performance
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: redis-cluster-metrics
  namespace: livyflow-prod
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: redis-cluster
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics

---
# Redis exporter for metrics
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: livyflow-prod
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: redis-exporter
  template:
    spec:
      containers:
      - name: redis-exporter
        image: oliver006/redis_exporter:latest
        env:
        - name: REDIS_ADDR
          value: "redis://redis-cluster:6379"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: livyflow-secrets
              key: REDIS_PASSWORD
        ports:
        - containerPort: 9121
          name: metrics
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

### Cache Performance Alerts
```yaml
# Prometheus alerting rules for cache performance
groups:
- name: cache.rules
  rules:
  - alert: HighCacheMissRate
    expr: redis_keyspace_misses_total / redis_keyspace_hits_total > 0.3
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High cache miss rate detected"
      description: "Cache miss rate is {{ $value | humanizePercentage }} for more than 5 minutes"

  - alert: RedisMemoryUsageHigh
    expr: redis_memory_used_bytes / redis_config_maxmemory * 100 > 85
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Redis memory usage is high"
      description: "Redis memory usage is {{ $value | humanizePercentage }} of the maximum configured memory"

  - alert: RedisConnectionPoolExhausted
    expr: redis_connected_clients > 1000
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Redis connection pool near exhaustion"
      description: "Redis has {{ $value }} connected clients"

  - alert: CacheResponseTimeHigh
    expr: histogram_quantile(0.95, rate(cache_request_duration_seconds_bucket[5m])) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Cache response time is high"
      description: "95th percentile cache response time is {{ $value }}s"
```

## CDN and Cache Performance Optimization Results

### Expected Performance Improvements
- **90% reduction in page load time** for returning users
- **75% reduction in API response time** for cached endpoints  
- **60% reduction in database load** through intelligent caching
- **50% reduction in bandwidth costs** with CloudFront CDN
- **40% improvement in user experience** with sub-second response times

### Cost Optimization Benefits
- **CloudFront**: $0.085/GB vs $0.15/GB direct bandwidth (43% savings)
- **Redis ElastiCache**: $0.017/hour vs Aurora reads (60% savings for cached queries)
- **Origin Shield**: Additional 15% reduction in origin requests
- **Compression**: 70% bandwidth reduction for text-based content

### Scalability Enhancements
- **Global reach**: <100ms latency worldwide with CloudFront edge locations
- **Auto-scaling**: Redis cluster scales from 3 to 15 nodes based on demand
- **Intelligent routing**: CloudFront automatically routes to fastest edge location
- **Failover**: Automatic failover to secondary origins within 30 seconds

### Security Features
- **WAF Integration**: Real-time threat detection and blocking
- **DDoS Protection**: AWS Shield Standard included with CloudFront
- **SSL/TLS**: End-to-end encryption with latest TLS protocols
- **Access Controls**: Origin access identity prevents direct S3 access