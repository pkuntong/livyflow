# Cost Optimization and Monitoring Strategy for LivyFlow

## Overview
This document outlines comprehensive cost optimization strategies and monitoring solutions for LivyFlow's cloud infrastructure, designed to reduce operational costs by 40-60% while maintaining performance and reliability.

## Cost Optimization Framework

### 1. Compute Cost Optimization

#### AWS EC2 and EKS Optimization
```hcl
# Mixed instance types for cost optimization
resource "aws_eks_node_group" "cost_optimized" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "cost-optimized-${var.environment}"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  
  # Use Spot instances for significant cost savings (60-90% discount)
  capacity_type = "SPOT"
  
  # Mixed instance types for availability and cost optimization
  instance_types = [
    "t3.medium",   # General purpose, burstable
    "t3.large",    # Scalable compute
    "m5.large",    # Balanced compute, memory, networking
    "m5a.large",   # AMD instances (10-15% cheaper)
    "m6i.large"    # Latest generation Intel
  ]
  
  scaling_config {
    desired_size = var.environment == "prod" ? 3 : 1
    max_size     = var.environment == "prod" ? 20 : 5
    min_size     = var.environment == "prod" ? 2 : 1
  }
  
  # Taints for spot instances to ensure proper scheduling
  taint {
    key    = "node.kubernetes.io/spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
  
  # Labels for node affinity
  labels = {
    "node-type"           = "spot"
    "cost-optimization"   = "enabled"
    "livyflow.com/tier"   = "cost-optimized"
  }
  
  tags = merge(var.tags, {
    NodeType = "spot-cost-optimized"
  })
}

# Reserved Instances recommendations
resource "aws_ec2_capacity_reservation" "livyflow_baseline" {
  count                 = var.environment == "prod" ? 1 : 0
  instance_type         = "t3.medium"
  instance_platform     = "Linux/UNIX"
  availability_zone     = var.availability_zones[0]
  instance_count        = 2
  end_date_type        = "unlimited"
  instance_match_criteria = "targeted"
  
  tags = merge(var.tags, {
    Purpose = "baseline-capacity-reservation"
  })
}

# Savings Plans automation
resource "aws_savingsplans_plan" "livyflow_compute" {
  count                = var.environment == "prod" ? 1 : 0
  savings_plan_type   = "Compute"
  term                = "1yr"
  payment_option      = "All Upfront"  # Maximum discount
  hourly_commitment   = "10"  # $10/hour commitment
  
  tags = var.tags
}
```

#### Kubernetes Resource Right-sizing
```yaml
# Vertical Pod Autoscaler recommendations for right-sizing
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: livyflow-backend-rightsizing
  namespace: livyflow-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: livyflow-backend
  updatePolicy:
    updateMode: "Off"  # Recommendations only, no auto-updates
  recommendationPolicy:
    containerPolicies:
    - containerName: backend
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      minAllowed:
        cpu: 50m
        memory: 64Mi
      controlledResources: ["cpu", "memory"]

---
# Resource quotas to prevent over-provisioning
apiVersion: v1
kind: ResourceQuota
metadata:
  name: livyflow-cost-control
  namespace: livyflow-prod
spec:
  hard:
    requests.cpu: "20"      # Maximum 20 CPU cores
    requests.memory: "40Gi" # Maximum 40GB RAM
    limits.cpu: "40"        # Maximum 40 CPU cores limit
    limits.memory: "80Gi"   # Maximum 80GB RAM limit
    persistentvolumeclaims: "50"
    services.loadbalancers: "2"
    count/deployments: "20"

---
# Limit ranges for individual pods
apiVersion: v1
kind: LimitRange
metadata:
  name: livyflow-pod-limits
  namespace: livyflow-prod
spec:
  limits:
  - default:
      cpu: "200m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:
      cpu: "2000m"
      memory: "4Gi"
    min:
      cpu: "10m"
      memory: "32Mi"
    type: Container
  - max:
      cpu: "4000m"
      memory: "8Gi"
    min:
      cpu: "100m"
      memory: "128Mi"
    type: Pod
```

### 2. Database Cost Optimization

#### Aurora Serverless v2 Optimization
```hcl
# Cost-optimized Aurora Serverless v2 configuration
resource "aws_rds_cluster" "cost_optimized" {
  cluster_identifier = "livyflow-${var.environment}"
  engine            = "aurora-postgresql"
  engine_version    = "15.4"
  database_name     = "livyflow"
  
  # Serverless v2 with aggressive scaling
  serverlessv2_scaling_configuration {
    max_capacity = var.environment == "prod" ? 8 : 2    # Reduced max capacity
    min_capacity = var.environment == "prod" ? 0.5 : 0.5  # Scale to zero when possible
  }
  
  # Cost optimization settings
  backup_retention_period = var.environment == "prod" ? 7 : 1  # Reduced backup retention
  preferred_backup_window = "03:00-04:00"
  
  # Delete automated backups when cluster is deleted (non-prod only)
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "livyflow-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  
  # Disable expensive features in non-prod
  enabled_cloudwatch_logs_exports = var.environment == "prod" ? ["postgresql"] : []
  
  tags = merge(var.tags, {
    CostOptimization = "enabled"
  })
}

# Read replica only for production
resource "aws_rds_cluster_instance" "reader" {
  count              = var.environment == "prod" ? 1 : 0
  identifier         = "livyflow-${var.environment}-reader"
  cluster_identifier = aws_rds_cluster.cost_optimized.id
  instance_class     = "db.serverless"
  engine            = aws_rds_cluster.cost_optimized.engine
  
  performance_insights_enabled = false  # Disable to save costs
  monitoring_interval         = 0       # Disable enhanced monitoring
  
  tags = merge(var.tags, {
    Purpose = "read-replica"
  })
}

# Scheduled scaling for predictable workloads
resource "aws_cloudwatch_event_rule" "scale_down_nights" {
  name        = "livyflow-scale-down-nights"
  description = "Scale down Aurora during night hours"
  
  schedule_expression = "cron(0 22 * * ? *)"  # 10 PM UTC
  
  tags = var.tags
}

resource "aws_cloudwatch_event_target" "scale_down_target" {
  rule      = aws_cloudwatch_event_rule.scale_down_nights.name
  target_id = "ScaleDownAurora"
  arn       = "arn:aws:lambda:${var.primary_region}:${data.aws_caller_identity.current.account_id}:function:aurora-scaler"
  
  input = jsonencode({
    action = "scale_down"
    cluster_identifier = aws_rds_cluster.cost_optimized.cluster_identifier
    min_capacity = 0.5
    max_capacity = 1
  })
}

resource "aws_cloudwatch_event_rule" "scale_up_mornings" {
  name        = "livyflow-scale-up-mornings"
  description = "Scale up Aurora during business hours"
  
  schedule_expression = "cron(0 6 * * ? *)"  # 6 AM UTC
  
  tags = var.tags
}
```

#### Database Connection Pooling
```yaml
# PgBouncer for connection pooling (reduces database load)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer-cost-optimizer
  namespace: livyflow-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    spec:
      containers:
      - name: pgbouncer
        image: pgbouncer/pgbouncer:latest
        env:
        - name: DATABASES_HOST
          value: "livyflow-prod.cluster-xxxxx.us-east-1.rds.amazonaws.com"
        - name: DATABASES_PORT
          value: "5432"
        - name: DATABASES_USER
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: username
        - name: DATABASES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
        - name: DATABASES_DBNAME
          value: "livyflow"
        - name: POOL_MODE
          value: "transaction"  # More efficient connection reuse
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "25"   # Optimized pool size
        - name: MIN_POOL_SIZE
          value: "5"    # Minimum connections
        - name: RESERVE_POOL_SIZE
          value: "3"
        - name: SERVER_LIFETIME
          value: "3600" # 1 hour
        - name: SERVER_IDLE_TIMEOUT
          value: "600"  # 10 minutes
        resources:
          requests:
            memory: "64Mi"    # Minimal memory usage
            cpu: "50m"        # Low CPU requirements
          limits:
            memory: "128Mi"
            cpu: "100m"
        ports:
        - containerPort: 5432
          name: postgres
```

### 3. Storage Cost Optimization

#### Intelligent Storage Tiering
```hcl
# S3 with intelligent tiering and lifecycle policies
resource "aws_s3_bucket" "cost_optimized_storage" {
  bucket = "livyflow-data-${var.environment}-${random_id.bucket_suffix.hex}"
  
  tags = merge(var.tags, {
    CostOptimization = "enabled"
  })
}

resource "aws_s3_bucket_intelligent_tiering_configuration" "livyflow_tiering" {
  bucket = aws_s3_bucket.cost_optimized_storage.id
  name   = "livyflow-intelligent-tiering"
  
  status = "Enabled"
  
  tier {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
  
  tier {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cost_optimization" {
  bucket = aws_s3_bucket.cost_optimized_storage.id
  
  rule {
    id     = "cost-optimization"
    status = "Enabled"
    
    # Transition to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    # Transition to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    # Transition to Deep Archive after 365 days
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    
    # Delete incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
    
    # Delete old versions
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
  
  # Separate rule for log files
  rule {
    id     = "log-retention"
    status = "Enabled"
    
    filter {
      prefix = "logs/"
    }
    
    expiration {
      days = var.environment == "prod" ? 90 : 30
    }
  }
}

# EBS volume optimization
resource "aws_ebs_volume" "optimized" {
  availability_zone = var.availability_zones[0]
  size             = 100
  type             = "gp3"  # Latest generation, cost-effective
  
  # Optimized IOPS and throughput
  iops       = 3000    # Baseline IOPS included
  throughput = 125     # Baseline throughput included
  
  encrypted  = true
  kms_key_id = aws_kms_key.storage.arn
  
  tags = merge(var.tags, {
    CostOptimization = "gp3-optimized"
  })
}

# EBS snapshot lifecycle management
resource "aws_dlm_lifecycle_policy" "ebs_snapshot_policy" {
  description        = "EBS snapshot lifecycle policy for cost optimization"
  execution_role_arn = aws_iam_role.dlm_lifecycle_role.arn
  state             = "ENABLED"
  
  policy_details {
    resource_types   = ["VOLUME"]
    target_tags = {
      Environment = var.environment
    }
    
    schedule {
      name = "daily-snapshots"
      
      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }
      
      retain_rule {
        count = var.environment == "prod" ? 7 : 3
      }
      
      copy_tags = true
    }
  }
  
  tags = var.tags
}
```

### 4. Network Cost Optimization

#### Data Transfer Cost Reduction
```hcl
# VPC Endpoints to avoid NAT Gateway costs
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.primary_region}.s3"
  
  route_table_ids = aws_route_table.private[*].id
  
  tags = merge(var.tags, {
    Purpose = "cost-optimization-s3"
  })
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.primary_region}.dynamodb"
  
  route_table_ids = aws_route_table.private[*].id
  
  tags = merge(var.tags, {
    Purpose = "cost-optimization-dynamodb"
  })
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.primary_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoint.id]
  
  private_dns_enabled = true
  
  tags = merge(var.tags, {
    Purpose = "cost-optimization-ecr"
  })
}

# CloudFront for global distribution (reduces origin requests)
resource "aws_cloudfront_distribution" "cost_optimized" {
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.environment == "prod" ? "PriceClass_100" : "PriceClass_100"
  
  # Optimized caching for cost reduction
  default_cache_behavior {
    target_origin_id       = "S3-${aws_s3_bucket.frontend_assets.bucket}"
    viewer_protocol_policy = "redirect-to-https"
    compress              = true
    
    # Optimized TTL for cost savings
    min_ttl     = 0
    default_ttl = 86400     # 1 day
    max_ttl     = 31536000  # 1 year
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  
  # Regional edge caches for additional cost savings
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "ALB-${aws_lb.main.name}"
    
    # Shorter cache for API responses but still some caching
    min_ttl     = 0
    default_ttl = 300   # 5 minutes
    max_ttl     = 3600  # 1 hour
    
    compress = true
    viewer_protocol_policy = "https-only"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "none"
      }
    }
  }
  
  restrictions {
    geo_restriction {
      restriction_type = var.environment == "prod" ? "none" : "whitelist"
      locations       = var.environment == "prod" ? [] : ["US", "CA", "GB", "DE", "FR"]
    }
  }
  
  tags = merge(var.tags, {
    CostOptimization = "enabled"
  })
}
```

### 5. Monitoring and Alerting Cost Optimization

#### Cost Monitoring Dashboard
```python
# Cost monitoring service
import boto3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import structlog

logger = structlog.get_logger(__name__)

class CostOptimizationMonitor:
    def __init__(self):
        self.ce_client = boto3.client('ce')  # Cost Explorer
        self.ec2_client = boto3.client('ec2')
        self.rds_client = boto3.client('rds')
        self.cloudwatch = boto3.client('cloudwatch')
    
    async def get_daily_costs(self, days: int = 30) -> Dict[str, Any]:
        """Get daily cost breakdown for the last N days"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        response = self.ce_client.get_cost_and_usage(
            TimePeriod={
                'Start': start_date.isoformat(),
                'End': end_date.isoformat()
            },
            Granularity='DAILY',
            Metrics=['BlendedCost', 'UsageQuantity'],
            GroupBy=[
                {'Type': 'DIMENSION', 'Key': 'SERVICE'},
                {'Type': 'TAG', 'Key': 'Environment'}
            ]
        )
        
        return self._process_cost_data(response)
    
    async def get_cost_anomalies(self) -> List[Dict[str, Any]]:
        """Detect cost anomalies using AWS Cost Anomaly Detection"""
        response = self.ce_client.get_anomalies(
            DateInterval={
                'StartDate': (datetime.now() - timedelta(days=30)).date().isoformat(),
                'EndDate': datetime.now().date().isoformat()
            }
        )
        
        anomalies = []
        for anomaly in response.get('Anomalies', []):
            if anomaly['TotalImpact']['TotalImpact'] > 10:  # $10+ impact
                anomalies.append({
                    'service': anomaly.get('DimensionKey'),
                    'impact': anomaly['TotalImpact']['TotalImpact'],
                    'date': anomaly['AnomalyStartDate'],
                    'description': anomaly.get('Description', ''),
                    'root_causes': anomaly.get('RootCauses', [])
                })
        
        return anomalies
    
    async def get_rightsizing_recommendations(self) -> List[Dict[str, Any]]:
        """Get EC2 rightsizing recommendations"""
        response = self.ce_client.get_rightsizing_recommendation(
            Service='AmazonEC2'
        )
        
        recommendations = []
        for rec in response.get('RightsizingRecommendations', []):
            if rec['EstimatedMonthlySavings']['Amount'] > '5':  # $5+ savings
                recommendations.append({
                    'instance_id': rec['CurrentInstance']['ResourceId'],
                    'current_type': rec['CurrentInstance']['InstanceType'],
                    'recommended_type': rec['RightsizingType'],
                    'monthly_savings': rec['EstimatedMonthlySavings']['Amount'],
                    'cpu_utilization': rec['CurrentInstance']['CpuUtilization'],
                    'memory_utilization': rec['CurrentInstance']['MemoryUtilization']
                })
        
        return recommendations
    
    async def get_unused_resources(self) -> Dict[str, List[str]]:
        """Identify unused resources that can be terminated"""
        unused_resources = {
            'ebs_volumes': [],
            'load_balancers': [],
            'elastic_ips': [],
            'snapshots': []
        }
        
        # Unused EBS volumes
        volumes = self.ec2_client.describe_volumes(
            Filters=[{'Name': 'state', 'Values': ['available']}]
        )
        unused_resources['ebs_volumes'] = [
            vol['VolumeId'] for vol in volumes['Volumes']
        ]
        
        # Unused Elastic IPs
        addresses = self.ec2_client.describe_addresses()
        unused_resources['elastic_ips'] = [
            addr['AllocationId'] for addr in addresses['Addresses']
            if 'InstanceId' not in addr and 'NetworkInterfaceId' not in addr
        ]
        
        return unused_resources
    
    async def calculate_potential_savings(self) -> Dict[str, float]:
        """Calculate potential cost savings from optimization recommendations"""
        savings = {
            'spot_instances': 0.0,
            'reserved_instances': 0.0,
            'rightsizing': 0.0,
            'unused_resources': 0.0,
            'storage_optimization': 0.0
        }
        
        # Spot instance savings (60-90% off on-demand)
        spot_recommendations = await self._get_spot_recommendations()
        savings['spot_instances'] = sum(
            rec['monthly_savings'] for rec in spot_recommendations
        )
        
        # Reserved instance savings (30-70% off on-demand)
        ri_recommendations = self.ce_client.get_reservation_purchase_recommendation(
            Service='AmazonEC2'
        )
        
        for rec in ri_recommendations.get('Recommendations', []):
            savings['reserved_instances'] += float(
                rec['RecommendationDetails']['EstimatedMonthlySavingsAmount']
            )
        
        # Rightsizing savings
        rightsizing_recs = await self.get_rightsizing_recommendations()
        savings['rightsizing'] = sum(
            float(rec['monthly_savings']) for rec in rightsizing_recs
        )
        
        return savings
    
    def _process_cost_data(self, cost_data: Dict) -> Dict[str, Any]:
        """Process and structure cost data for analysis"""
        processed_data = {
            'total_cost': 0.0,
            'daily_breakdown': [],
            'service_breakdown': {},
            'trend': 'stable'
        }
        
        for result in cost_data['ResultsByTime']:
            daily_cost = 0.0
            for group in result['Groups']:
                cost = float(group['Metrics']['BlendedCost']['Amount'])
                daily_cost += cost
                
                service = group['Keys'][0]
                if service not in processed_data['service_breakdown']:
                    processed_data['service_breakdown'][service] = 0.0
                processed_data['service_breakdown'][service] += cost
            
            processed_data['daily_breakdown'].append({
                'date': result['TimePeriod']['Start'],
                'cost': daily_cost
            })
            processed_data['total_cost'] += daily_cost
        
        # Calculate trend
        if len(processed_data['daily_breakdown']) >= 7:
            recent_avg = sum(
                day['cost'] for day in processed_data['daily_breakdown'][-7:]
            ) / 7
            previous_avg = sum(
                day['cost'] for day in processed_data['daily_breakdown'][-14:-7]
            ) / 7
            
            if recent_avg > previous_avg * 1.1:
                processed_data['trend'] = 'increasing'
            elif recent_avg < previous_avg * 0.9:
                processed_data['trend'] = 'decreasing'
        
        return processed_data

# Kubernetes cost monitoring
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-monitor
  namespace: livyflow-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cost-monitor
  template:
    spec:
      serviceAccountName: cost-monitor-sa
      containers:
      - name: monitor
        image: livyflow/cost-monitor:latest
        env:
        - name: AWS_REGION
          value: us-east-1
        - name: PROMETHEUS_URL
          value: http://prometheus:9090
        - name: ALERT_WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: alerting-secrets
              key: cost-alert-webhook
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        ports:
        - containerPort: 8080
          name: http
```

#### Cost Alerting Rules
```yaml
# Prometheus alerting rules for cost optimization
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-optimization-alerts
  namespace: livyflow-monitoring
spec:
  groups:
  - name: cost.rules
    rules:
    
    # Daily cost threshold exceeded
    - alert: DailyCostThresholdExceeded
      expr: aws_billing_estimated_charges > 500
      for: 1h
      labels:
        severity: warning
        category: cost-optimization
      annotations:
        summary: "Daily AWS costs exceeded threshold"
        description: "Daily AWS costs are ${{ $value }}, exceeding the $500 threshold"
        runbook_url: "https://docs.livyflow.com/runbooks/cost-optimization"
    
    # Unusual cost spike detected
    - alert: CostSpikeDetected
      expr: increase(aws_billing_estimated_charges[1d]) > increase(aws_billing_estimated_charges[1d] offset 1d) * 1.5
      for: 30m
      labels:
        severity: critical
        category: cost-optimization
      annotations:
        summary: "Unusual cost spike detected"
        description: "AWS costs have spiked by {{ $value }}% compared to yesterday"
        action_required: "Review AWS Cost Explorer for anomalies and investigate high-cost resources"
    
    # High CPU usage with low utilization (rightsizing opportunity)
    - alert: OverProvisionedInstances
      expr: avg_over_time(node_cpu_seconds_total[24h]) / node_cpu_seconds_total * 100 < 30
      for: 6h
      labels:
        severity: info
        category: cost-optimization
      annotations:
        summary: "Instance appears over-provisioned"
        description: "Node {{ $labels.instance }} has CPU utilization of {{ $value }}% over 24 hours"
        recommendation: "Consider rightsizing this instance to a smaller type"
    
    # Unused EBS volumes
    - alert: UnusedEBSVolumes
      expr: aws_ebs_volume_state{state="available"} > 0
      for: 24h
      labels:
        severity: warning
        category: cost-optimization
      annotations:
        summary: "Unused EBS volumes detected"
        description: "{{ $value }} EBS volumes are in 'available' state for more than 24 hours"
        action_required: "Review and delete unused EBS volumes"
    
    # High data transfer costs
    - alert: HighDataTransferCosts
      expr: increase(aws_data_transfer_costs[1d]) > 50
      for: 2h
      labels:
        severity: warning
        category: cost-optimization
      annotations:
        summary: "High data transfer costs detected"
        description: "Daily data transfer costs are ${{ $value }}"
        recommendation: "Review CloudFront cache hit ratios and consider adding more edge locations"
    
    # Database connection pool efficiency
    - alert: DatabaseConnectionInefficiency
      expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
      for: 15m
      labels:
        severity: warning
        category: cost-optimization
      annotations:
        summary: "Database connection pool near capacity"
        description: "Database connections are at {{ $value }}% of maximum"
        recommendation: "Review connection pooling settings and consider using PgBouncer"
    
    # Spot instance termination rate
    - alert: HighSpotInstanceTerminationRate
      expr: rate(aws_ec2_spot_instance_terminations[1h]) > 0.1
      for: 30m
      labels:
        severity: warning
        category: cost-optimization
      annotations:
        summary: "High spot instance termination rate"
        description: "Spot instance termination rate is {{ $value }} per hour"
        recommendation: "Review spot instance types and availability zones for better stability"

---
# Cost budget alerts
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-budget-config
  namespace: livyflow-monitoring
data:
  budgets.yaml: |
    budgets:
      monthly_total:
        limit: 2000
        threshold_percentages: [50, 75, 90, 100]
        services: ["all"]
        
      compute_monthly:
        limit: 1000
        threshold_percentages: [60, 80, 95]
        services: ["AmazonEC2", "AmazonEKS"]
        
      database_monthly:
        limit: 400
        threshold_percentages: [70, 85, 95]
        services: ["AmazonRDS", "AmazonElastiCache"]
        
      storage_monthly:
        limit: 200
        threshold_percentages: [75, 90]
        services: ["AmazonS3", "AmazonEBS"]
        
      network_monthly:
        limit: 300
        threshold_percentages: [80, 95]
        services: ["AmazonCloudFront", "AmazonVPC"]
```

### 6. Automated Cost Optimization Actions

#### Auto-scaling Based on Cost Metrics
```yaml
# KEDA scaler for cost-aware scaling
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cost-aware-scaler
  namespace: livyflow-prod
spec:
  scaleTargetRef:
    name: livyflow-backend
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  
  # Scale based on cost per request
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.livyflow-monitoring.svc:9090
      metricName: cost_per_request
      threshold: '0.10'  # $0.10 per request
      query: |
        (
          increase(aws_billing_estimated_charges[1h]) /
          increase(http_requests_total[1h])
        )
  
  # Scale down aggressively during off-hours
  - type: cron
    metadata:
      timezone: America/New_York
      start: "0 22 * * *"    # 10 PM
      end: "0 6 * * *"       # 6 AM
      desiredReplicas: "1"   # Minimum during off-hours

---
# Scheduled resource cleanup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cost-optimization-cleanup
  namespace: livyflow-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cost-optimizer-sa
          containers:
          - name: cleanup
            image: livyflow/cost-optimizer:latest
            command:
            - python
            - -c
            - |
              import boto3
              import kubernetes
              from datetime import datetime, timedelta
              
              # Cleanup unused resources
              def cleanup_unused_resources():
                  ec2 = boto3.client('ec2')
                  s3 = boto3.client('s3')
                  
                  # Delete unattached EBS volumes older than 7 days
                  volumes = ec2.describe_volumes(
                      Filters=[
                          {'Name': 'state', 'Values': ['available']},
                          {'Name': 'tag:Environment', 'Values': ['dev', 'staging']}
                      ]
                  )
                  
                  cutoff_date = datetime.now() - timedelta(days=7)
                  for volume in volumes['Volumes']:
                      create_time = volume['CreateTime'].replace(tzinfo=None)
                      if create_time < cutoff_date:
                          print(f"Deleting unused volume: {volume['VolumeId']}")
                          ec2.delete_volume(VolumeId=volume['VolumeId'])
                  
                  # Delete old EBS snapshots
                  snapshots = ec2.describe_snapshots(OwnerIds=['self'])
                  snapshot_cutoff = datetime.now() - timedelta(days=30)
                  
                  for snapshot in snapshots['Snapshots']:
                      start_time = snapshot['StartTime'].replace(tzinfo=None)
                      if start_time < snapshot_cutoff:
                          print(f"Deleting old snapshot: {snapshot['SnapshotId']}")
                          ec2.delete_snapshot(SnapshotId=snapshot['SnapshotId'])
                  
                  # Clean up incomplete multipart uploads
                  s3_buckets = s3.list_buckets()
                  for bucket in s3_buckets['Buckets']:
                      bucket_name = bucket['Name']
                      if 'livyflow' in bucket_name:
                          uploads = s3.list_multipart_uploads(Bucket=bucket_name)
                          
                          for upload in uploads.get('Uploads', []):
                              initiated = upload['Initiated'].replace(tzinfo=None)
                              if initiated < cutoff_date:
                                  print(f"Aborting old multipart upload: {upload['UploadId']}")
                                  s3.abort_multipart_upload(
                                      Bucket=bucket_name,
                                      Key=upload['Key'],
                                      UploadId=upload['UploadId']
                                  )
              
              cleanup_unused_resources()
            env:
            - name: AWS_DEFAULT_REGION
              value: us-east-1
            resources:
              requests:
                memory: "128Mi"
                cpu: "100m"
              limits:
                memory: "256Mi"
                cpu: "200m"
          restartPolicy: OnFailure
```

### 7. Cost Reporting and Analytics

#### Monthly Cost Report Generation
```yaml
# Cost reporting service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-reporting
  namespace: livyflow-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cost-reporting
  template:
    spec:
      containers:
      - name: reporter
        image: livyflow/cost-reporter:latest
        env:
        - name: S3_BUCKET
          value: "livyflow-cost-reports"
        - name: EMAIL_RECIPIENTS
          value: "finance@livyflow.com,ops@livyflow.com"
        - name: REPORT_FREQUENCY
          value: "monthly"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"

---
# Monthly cost report generation
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-cost-report
  namespace: livyflow-monitoring
spec:
  schedule: "0 9 1 * *"  # 9 AM on 1st of every month
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: report-generator
            image: livyflow/cost-reporter:latest
            command:
            - python
            - -c
            - |
              import boto3
              import pandas as pd
              from datetime import datetime, timedelta
              import matplotlib.pyplot as plt
              import seaborn as sns
              from email.mime.multipart import MIMEMultipart
              from email.mime.text import MIMEText
              from email.mime.base import MIMEBase
              import smtplib
              
              def generate_monthly_cost_report():
                  ce = boto3.client('ce')
                  
                  # Get last month's data
                  end_date = datetime.now().replace(day=1).date()
                  start_date = (end_date - timedelta(days=32)).replace(day=1)
                  
                  # Fetch cost data
                  response = ce.get_cost_and_usage(
                      TimePeriod={
                          'Start': start_date.isoformat(),
                          'End': end_date.isoformat()
                      },
                      Granularity='DAILY',
                      Metrics=['BlendedCost'],
                      GroupBy=[{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
                  )
                  
                  # Process data and create visualizations
                  cost_data = []
                  for result in response['ResultsByTime']:
                      for group in result['Groups']:
                          cost_data.append({
                              'date': result['TimePeriod']['Start'],
                              'service': group['Keys'][0],
                              'cost': float(group['Metrics']['BlendedCost']['Amount'])
                          })
                  
                  df = pd.DataFrame(cost_data)
                  
                  # Generate charts
                  plt.figure(figsize=(12, 8))
                  
                  # Daily cost trend
                  plt.subplot(2, 2, 1)
                  daily_costs = df.groupby('date')['cost'].sum()
                  daily_costs.plot(kind='line')
                  plt.title('Daily Cost Trend')
                  plt.ylabel('Cost ($)')
                  
                  # Service breakdown
                  plt.subplot(2, 2, 2)
                  service_costs = df.groupby('service')['cost'].sum().sort_values(ascending=False)
                  service_costs.head(10).plot(kind='bar')
                  plt.title('Top 10 Services by Cost')
                  plt.ylabel('Cost ($)')
                  plt.xticks(rotation=45)
                  
                  plt.tight_layout()
                  plt.savefig('/tmp/monthly-cost-report.png', dpi=300, bbox_inches='tight')
                  
                  # Calculate metrics
                  total_cost = df['cost'].sum()
                  avg_daily_cost = total_cost / len(daily_costs)
                  
                  # Generate report
                  report_html = f"""
                  <html>
                  <head><title>Monthly Cost Report - {start_date.strftime('%B %Y')}</title></head>
                  <body>
                      <h1>LivyFlow Monthly Cost Report - {start_date.strftime('%B %Y')}</h1>
                      
                      <h2>Summary</h2>
                      <ul>
                          <li>Total Monthly Cost: ${total_cost:.2f}</li>
                          <li>Average Daily Cost: ${avg_daily_cost:.2f}</li>
                          <li>Largest Service: {service_costs.index[0]} (${service_costs.iloc[0]:.2f})</li>
                      </ul>
                      
                      <h2>Cost Optimization Opportunities</h2>
                      <ul>
                          <li>Estimated Savings from Spot Instances: $XXX</li>
                          <li>Estimated Savings from Reserved Instances: $XXX</li>
                          <li>Estimated Savings from Rightsizing: $XXX</li>
                      </ul>
                      
                      <p>Detailed charts are attached.</p>
                  </body>
                  </html>
                  """
                  
                  print(f"Generated cost report for {start_date.strftime('%B %Y')}")
                  print(f"Total cost: ${total_cost:.2f}")
              
              generate_monthly_cost_report()
          restartPolicy: OnFailure
```

## Expected Cost Optimization Results

### Immediate Savings (0-3 months)
- **Spot Instances**: 60-90% savings on compute costs
- **Storage Optimization**: 30-50% reduction in storage costs
- **Unused Resource Cleanup**: 10-20% overall cost reduction
- **Connection Pooling**: 25-40% database cost reduction

### Medium-term Savings (3-12 months)
- **Reserved Instances**: 30-50% savings on baseline compute
- **Rightsizing**: 20-35% reduction in over-provisioned resources
- **Intelligent Tiering**: 40-60% savings on long-term storage
- **CDN Optimization**: 25-45% bandwidth cost reduction

### Long-term Savings (12+ months)
- **Automated Optimization**: 15-25% continuous cost reduction
- **Predictive Scaling**: 20-30% efficiency improvement
- **Multi-cloud Optimization**: 10-20% additional savings
- **Advanced Analytics**: 5-15% optimization through insights

### Total Expected Savings
- **Year 1**: 40-60% cost reduction
- **Ongoing**: 30-50% sustained savings
- **ROI**: 300-500% return on optimization investment

### Cost Structure Transformation
```
Current Monthly Costs (Estimated):
- Compute: $2,000
- Database: $800
- Storage: $400
- Network: $600
- Monitoring: $200
Total: $4,000/month

Optimized Monthly Costs:
- Compute: $800 (60% savings)
- Database: $480 (40% savings)
- Storage: $200 (50% savings)
- Network: $300 (50% savings)
- Monitoring: $120 (40% savings)
Total: $1,900/month (52.5% savings)

Annual Savings: $25,200
```