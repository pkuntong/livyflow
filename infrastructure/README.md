# LivyFlow Cloud Infrastructure

## Overview

This repository contains the complete Infrastructure as Code (IaC) setup for LivyFlow, a financial management application. The infrastructure is designed to be cloud-agnostic, cost-optimized, secure, and scalable from startup to enterprise levels.

## Architecture Components

### 1. **Multi-Cloud Support**
- **AWS**: Primary cloud provider with EKS, Aurora Serverless v2, ElastiCache
- **GCP**: Alternative deployment with GKE, Cloud SQL, Memorystore
- **Azure**: Enterprise option with AKS, Azure Database, Redis Cache

### 2. **Container Orchestration**
- Kubernetes with advanced auto-scaling (HPA, VPA, KEDA)
- Service mesh with Istio for security and observability
- Multi-zone deployment for high availability

### 3. **Database Strategy**
- Aurora Serverless v2 with intelligent scaling (0.5-16 ACUs)
- Read replicas for analytics workloads
- Connection pooling with PgBouncer
- Automated backup and disaster recovery

### 4. **Caching & CDN**
- Multi-layer caching strategy
- CloudFront global CDN with 400+ edge locations
- Redis cluster for application caching
- Intelligent cache warming and invalidation

### 5. **Security & Compliance**
- Zero-trust network architecture
- End-to-end encryption (TLS 1.3, field-level encryption)
- PCI DSS, SOC 2, GDPR compliance ready
- Runtime security monitoring with Falco

### 6. **Cost Optimization**
- 60-90% savings with spot instances
- 30-50% reduction with reserved instances
- Intelligent resource right-sizing
- Automated cost monitoring and alerting

## Quick Start

### Prerequisites

Install required tools:
```bash
# macOS
brew install terraform kubectl helm aws-cli docker jq yq

# Ubuntu/Debian
sudo apt-get install terraform kubectl helm awscli docker.io jq yq

# Verify installations
terraform --version
kubectl version --client
helm version
aws --version
```

### Configuration

1. **Set up cloud credentials:**

```bash
# AWS
aws configure
aws sts get-caller-identity

# GCP (optional)
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Azure (optional)
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

2. **Configure environment variables:**

```bash
export ENVIRONMENT="dev"  # or "staging", "prod"
export CLOUD_PROVIDER="aws"  # or "gcp", "azure"
export DOMAIN_NAME="yourdomain.com"
export AWS_REGION="us-east-1"
```

### Deployment

1. **Deploy infrastructure:**

```bash
# Development environment
./infrastructure/deployment/deploy.sh -e dev

# Production with auto-approval (CI/CD)
./infrastructure/deployment/deploy.sh -e prod --auto-approve

# Dry run to see changes
./infrastructure/deployment/deploy.sh -e staging --dry-run
```

2. **Verify deployment:**

```bash
# Check cluster status
kubectl get nodes
kubectl get pods -n livyflow-prod

# Test endpoints
curl -f https://api.yourdomain.com/health
curl -f https://yourdomain.com
```

## Directory Structure

```
infrastructure/
├── terraform/                 # Terraform Infrastructure as Code
│   ├── main.tf               # Main configuration with multi-cloud support
│   ├── variables.tf          # Input variables
│   ├── outputs.tf            # Output values
│   └── modules/              # Reusable Terraform modules
│       ├── aws/              # AWS-specific resources
│       ├── gcp/              # GCP-specific resources
│       ├── azure/            # Azure-specific resources
│       ├── kubernetes/       # K8s cluster configuration
│       └── monitoring/       # Observability stack
├── kubernetes/               # Kubernetes manifests
│   ├── namespace.yaml        # Namespace configuration
│   ├── configmap.yaml        # Configuration management
│   ├── secrets.yaml          # Secrets (dev/staging only)
│   ├── deployments.yaml      # Application deployments
│   ├── services.yaml         # Service definitions
│   └── autoscaling.yaml      # Auto-scaling configuration
├── security/                 # Security configurations
│   └── security-compliance.md # Security framework
├── database/                 # Database optimization
│   └── optimization-strategies.md
├── cdn/                      # CDN and caching
│   └── caching-strategies.md
├── monitoring/               # Monitoring and cost optimization
│   └── cost-optimization.md
└── deployment/               # Deployment automation
    └── deploy.sh            # Main deployment script
```

## Environment Configuration

### Development Environment
- **Cost**: ~$150-300/month
- **Resources**: Minimal setup with basic monitoring
- **Scaling**: 1-3 nodes, single AZ
- **Features**: Development-focused with relaxed security

### Staging Environment
- **Cost**: ~$500-1000/month
- **Resources**: Production-like with reduced capacity
- **Scaling**: 2-5 nodes, multi-AZ
- **Features**: Full feature parity with production

### Production Environment
- **Cost**: ~$2000-5000/month (before optimization)
- **Resources**: High availability, multi-region
- **Scaling**: 3-20 nodes, auto-scaling enabled
- **Features**: Full security, compliance, monitoring

## Security Configuration

### Network Security
```yaml
# Zero-trust network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: zero-trust-policy
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
  # Only allow specific traffic patterns
```

### Data Encryption
- **At Rest**: AES-256 encryption with customer-managed KMS keys
- **In Transit**: TLS 1.3 for all communications
- **Application Level**: Field-level encryption for PII

### Access Control
- **RBAC**: Kubernetes role-based access control
- **IAM**: Cloud provider identity and access management
- **Service Mesh**: Istio with mutual TLS

## Cost Optimization

### Compute Savings
- **Spot Instances**: 60-90% savings for fault-tolerant workloads
- **Reserved Instances**: 30-50% savings for baseline capacity
- **Right-sizing**: 20-35% reduction through automated optimization

### Database Optimization
- **Aurora Serverless v2**: Pay-per-second billing with auto-scaling
- **Connection Pooling**: Reduce database connection overhead
- **Query Optimization**: Automated performance tuning

### Storage Efficiency
- **Intelligent Tiering**: Automatic movement to cheaper storage classes
- **Lifecycle Policies**: Automated cleanup of unused resources
- **Compression**: Reduced storage and bandwidth costs

### Monitoring and Alerting
```yaml
# Cost alert configuration
- alert: DailyCostThresholdExceeded
  expr: aws_billing_estimated_charges > 500
  labels:
    severity: warning
  annotations:
    summary: "Daily AWS costs exceeded $500"
```

## Disaster Recovery

### Multi-Region Setup
- **Primary Region**: us-east-1 (or your preferred region)
- **DR Region**: us-west-2 (automated failover)
- **RTO**: < 15 minutes
- **RPO**: < 5 minutes

### Backup Strategy
- **Database**: Automated backups with point-in-time recovery
- **Configuration**: Infrastructure as Code in version control
- **Secrets**: Encrypted backup in secure storage

## Monitoring and Observability

### Metrics Collection
- **Prometheus**: Time-series metrics collection
- **Grafana**: Visualization and dashboards
- **CloudWatch**: Cloud provider native monitoring

### Logging
- **Centralized Logging**: ELK stack or cloud native solutions
- **Log Aggregation**: Structured logging with correlation IDs
- **Retention**: Configurable based on compliance requirements

### Alerting
- **PagerDuty**: Critical incident management
- **Slack**: Team notifications
- **Email**: Management reporting

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Production
      run: |
        ./infrastructure/deployment/deploy.sh -e prod --auto-approve
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Troubleshooting

### Common Issues

1. **Deployment Failures**
```bash
# Check Terraform state
terraform show
terraform refresh

# Validate Kubernetes resources
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

2. **Networking Issues**
```bash
# Test internal connectivity
kubectl exec -it <pod-name> -- nslookup kubernetes.default
kubectl exec -it <pod-name> -- curl -v http://service-name:port/health
```

3. **Database Connectivity**
```bash
# Check database endpoint
kubectl get secrets database-credentials -o yaml
kubectl port-forward svc/pgbouncer 5432:5432
psql -h localhost -p 5432 -U postgres -d livyflow
```

### Performance Optimization

1. **Database Query Performance**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

2. **Cache Hit Ratios**
```bash
# Redis cache performance
kubectl exec -it redis-0 -- redis-cli info stats
kubectl exec -it redis-0 -- redis-cli info memory
```

3. **Resource Utilization**
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n livyflow-prod
```

## Maintenance

### Regular Tasks

1. **Security Updates**
```bash
# Update container images
docker pull livyflow/backend:latest
docker pull livyflow/frontend:latest

# Update Kubernetes
kubectl version
helm repo update
```

2. **Backup Verification**
```bash
# Test database restore
aws rds restore-db-cluster-to-point-in-time \
  --restore-to-time "2024-01-01T12:00:00Z"
```

3. **Cost Review**
```bash
# Monthly cost analysis
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY
```

## Support and Contributing

### Getting Help
- **Documentation**: Check this README and inline documentation
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request with detailed description

### Code Standards
- **Terraform**: Use consistent formatting with `terraform fmt`
- **YAML**: Validate with `yamllint`
- **Shell Scripts**: Follow ShellCheck recommendations

## License

This infrastructure code is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

## Security

For security issues, please email security@livyflow.com instead of creating public issues.

---

**Note**: This infrastructure setup is designed for production use but requires customization for your specific requirements. Always review and test changes in non-production environments first.