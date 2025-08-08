# AWS Infrastructure Module for LivyFlow
# Optimized for financial applications with PCI compliance considerations

variable "environment" { type = string }
variable "primary_region" { type = string }
variable "secondary_region" { type = string }
variable "availability_zones" { type = list(string) }
variable "domain_name" { type = string }
variable "enable_multi_az" { type = bool }
variable "enable_disaster_recovery" { type = bool }
variable "cost_optimization" { type = map(any) }
variable "tags" { type = map(string) }

# AWS Provider configuration
provider "aws" {
  alias  = "primary"
  region = var.primary_region
  
  default_tags {
    tags = var.tags
  }
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
  
  default_tags {
    tags = merge(var.tags, { Region = "secondary" })
  }
}

# VPC Configuration with cost optimization
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(var.tags, {
    Name = "livyflow-vpc-${var.environment}"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "livyflow-igw-${var.environment}"
  })
}

# Public Subnets for Load Balancers
resource "aws_subnet" "public" {
  count             = var.enable_multi_az ? length(var.availability_zones) : 1
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = var.availability_zones[count.index]
  
  map_public_ip_on_launch = true
  
  tags = merge(var.tags, {
    Name = "livyflow-public-${var.availability_zones[count.index]}-${var.environment}"
    Type = "Public"
  })
}

# Private Subnets for Applications
resource "aws_subnet" "private" {
  count             = var.enable_multi_az ? length(var.availability_zones) : 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]
  
  tags = merge(var.tags, {
    Name = "livyflow-private-${var.availability_zones[count.index % length(var.availability_zones)]}-${var.environment}"
    Type = "Private"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

# Database Subnets (isolated)
resource "aws_subnet" "database" {
  count             = var.enable_multi_az ? length(var.availability_zones) : 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = var.availability_zones[count.index % length(var.availability_zones)]
  
  tags = merge(var.tags, {
    Name = "livyflow-database-${var.availability_zones[count.index % length(var.availability_zones)]}-${var.environment}"
    Type = "Database"
  })
}

# NAT Gateway for private subnets (cost-optimized)
resource "aws_eip" "nat" {
  count  = var.environment == "prod" && var.enable_multi_az ? length(aws_subnet.public) : 1
  domain = "vpc"
  
  tags = merge(var.tags, {
    Name = "livyflow-nat-eip-${count.index + 1}-${var.environment}"
  })
}

resource "aws_nat_gateway" "main" {
  count         = var.environment == "prod" && var.enable_multi_az ? length(aws_subnet.public) : 1
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(var.tags, {
    Name = "livyflow-nat-${count.index + 1}-${var.environment}"
  })
  
  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = merge(var.tags, {
    Name = "livyflow-public-rt-${var.environment}"
  })
}

resource "aws_route_table" "private" {
  count  = length(aws_nat_gateway.main)
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  
  tags = merge(var.tags, {
    Name = "livyflow-private-rt-${count.index + 1}-${var.environment}"
  })
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index % length(aws_route_table.private)].id
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "livyflow-alb-${var.environment}"
  description = "Application Load Balancer security group"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.tags, {
    Name = "livyflow-alb-sg-${var.environment}"
  })
}

resource "aws_security_group" "eks_nodes" {
  name        = "livyflow-eks-nodes-${var.environment}"
  description = "EKS node group security group"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.tags, {
    Name = "livyflow-eks-nodes-sg-${var.environment}"
  })
}

resource "aws_security_group" "rds" {
  name        = "livyflow-rds-${var.environment}"
  description = "RDS database security group"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }
  
  tags = merge(var.tags, {
    Name = "livyflow-rds-sg-${var.environment}"
  })
}

# EKS Cluster
resource "aws_iam_role" "eks_cluster" {
  name = "livyflow-eks-cluster-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_eks_cluster" "main" {
  name     = "livyflow-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"
  
  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = var.environment == "prod" ? false : true
    public_access_cidrs     = var.environment == "prod" ? [] : ["0.0.0.0/0"]
  }
  
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }
  
  enabled_cluster_log_types = [
    "api", "audit", "authenticator", "controllerManager", "scheduler"
  ]
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_cloudwatch_log_group.eks_cluster
  ]
  
  tags = var.tags
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/livyflow-${var.environment}/cluster"
  retention_in_days = var.environment == "prod" ? 90 : 30
  
  tags = var.tags
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS encryption key for livyflow-${var.environment}"
  deletion_window_in_days = 7
  
  tags = var.tags
}

resource "aws_kms_alias" "eks" {
  name          = "alias/livyflow-eks-${var.environment}"
  target_key_id = aws_kms_key.eks.key_id
}

# EKS Node Group with cost optimization
resource "aws_iam_role" "eks_nodes" {
  name = "livyflow-eks-nodes-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# Launch Template for cost-optimized node groups
resource "aws_launch_template" "eks_nodes" {
  name_prefix   = "livyflow-eks-${var.environment}-"
  image_id      = data.aws_ami.eks_worker.id
  instance_type = var.environment == "prod" ? "t3.medium" : "t3.small"
  
  vpc_security_group_ids = [aws_security_group.eks_nodes.id]
  
  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cluster_name        = aws_eks_cluster.main.name
    endpoint           = aws_eks_cluster.main.endpoint
    certificate        = aws_eks_cluster.main.certificate_authority[0].data
  }))
  
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = var.environment == "prod" ? 100 : 50
      volume_type = "gp3"
      encrypted   = true
      kms_key_id  = aws_kms_key.eks.arn
    }
  }
  
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                = "required"
    http_put_response_hop_limit = 2
  }
  
  monitoring {
    enabled = true
  }
  
  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "livyflow-eks-node-${var.environment}"
    })
  }
}

data "aws_ami" "eks_worker" {
  filter {
    name   = "name"
    values = ["amazon-eks-node-${aws_eks_cluster.main.version}-v*"]
  }
  
  most_recent = true
  owners      = ["602401143452"]
}

# Primary Node Group (On-Demand for critical workloads)
resource "aws_eks_node_group" "primary" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "livyflow-primary-${var.environment}"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  
  capacity_type = "ON_DEMAND"
  
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }
  
  scaling_config {
    desired_size = var.environment == "prod" ? 3 : 1
    max_size     = var.environment == "prod" ? 10 : 3
    min_size     = var.environment == "prod" ? 2 : 1
  }
  
  update_config {
    max_unavailable = 1
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy,
  ]
  
  tags = var.tags
}

# Spot Instance Node Group (Cost optimization for non-critical workloads)
resource "aws_eks_node_group" "spot" {
  count = var.cost_optimization.enable_spot_instances ? 1 : 0
  
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "livyflow-spot-${var.environment}"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  
  capacity_type = "SPOT"
  instance_types = ["t3.medium", "t3.large", "m5.large"]
  
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }
  
  scaling_config {
    desired_size = var.environment == "prod" ? 2 : 1
    max_size     = var.environment == "prod" ? 8 : 2
    min_size     = 0
  }
  
  update_config {
    max_unavailable = 1
  }
  
  taint {
    key    = "node.kubernetes.io/spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy,
  ]
  
  tags = merge(var.tags, {
    NodeType = "spot"
  })
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "livyflow-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id
  
  enable_deletion_protection = var.environment == "prod"
  
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }
  
  tags = var.tags
}

# S3 Bucket for ALB logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "livyflow-alb-logs-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "prod"
  
  tags = var.tags
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.main.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

data "aws_elb_service_account" "main" {}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  
  rule {
    id     = "log_retention"
    status = "Enabled"
    
    expiration {
      days = var.environment == "prod" ? 90 : 30
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# RDS PostgreSQL with cost optimization
resource "aws_db_subnet_group" "main" {
  name       = "livyflow-db-subnet-${var.environment}"
  subnet_ids = aws_subnet.database[*].id
  
  tags = merge(var.tags, {
    Name = "livyflow-db-subnet-group-${var.environment}"
  })
}

resource "aws_rds_cluster_parameter_group" "main" {
  family = "aurora-postgresql15"
  name   = "livyflow-cluster-pg-${var.environment}"
  
  parameter {
    name  = "log_statement"
    value = var.environment == "prod" ? "all" : "none"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking longer than 1 second
  }
  
  tags = var.tags
}

resource "aws_rds_cluster" "main" {
  cluster_identifier      = "livyflow-${var.environment}"
  engine                 = "aurora-postgresql"
  engine_version         = "15.4"
  availability_zones     = slice(var.availability_zones, 0, var.enable_multi_az ? 3 : 1)
  database_name          = "livyflow"
  master_username        = "postgres"
  manage_master_user_password = true
  
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name
  db_subnet_group_name           = aws_db_subnet_group.main.name
  vpc_security_group_ids         = [aws_security_group.rds.id]
  
  backup_retention_period = var.environment == "prod" ? 30 : 7
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"
  
  storage_encrypted   = true
  kms_key_id         = aws_kms_key.rds.arn
  deletion_protection = var.environment == "prod"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = var.tags
}

# Aurora Serverless v2 instances for cost optimization
resource "aws_rds_cluster_instance" "main" {
  count              = var.environment == "prod" ? (var.enable_multi_az ? 2 : 1) : 1
  identifier         = "livyflow-${var.environment}-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine            = aws_rds_cluster.main.engine
  engine_version    = aws_rds_cluster.main.engine_version
  
  performance_insights_enabled = var.environment == "prod"
  monitoring_interval         = var.environment == "prod" ? 60 : 0
  monitoring_role_arn        = var.environment == "prod" ? aws_iam_role.rds_monitoring[0].arn : null
  
  tags = var.tags
}

# Serverless v2 scaling configuration
resource "aws_rds_cluster" "serverless_scaling" {
  count = 0 # This is handled in the main cluster above
  
  serverlessv2_scaling_configuration {
    max_capacity = var.environment == "prod" ? 16 : 4
    min_capacity = var.environment == "prod" ? 2 : 0.5
  }
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "RDS encryption key for livyflow-${var.environment}"
  deletion_window_in_days = 7
  
  tags = var.tags
}

resource "aws_kms_alias" "rds" {
  name          = "alias/livyflow-rds-${var.environment}"
  target_key_id = aws_kms_key.rds.key_id
}

# RDS Enhanced Monitoring Role
resource "aws_iam_role" "rds_monitoring" {
  count = var.environment == "prod" ? 1 : 0
  name  = "livyflow-rds-monitoring-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.environment == "prod" ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ElastiCache Redis for session management and caching
resource "aws_elasticache_subnet_group" "main" {
  name       = "livyflow-cache-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
  
  tags = var.tags
}

resource "aws_security_group" "elasticache" {
  name        = "livyflow-elasticache-${var.environment}"
  description = "ElastiCache Redis security group"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }
  
  tags = merge(var.tags, {
    Name = "livyflow-elasticache-sg-${var.environment}"
  })
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "livyflow-${var.environment}"
  description                  = "Redis cluster for LivyFlow ${var.environment}"
  
  node_type                    = var.environment == "prod" ? "cache.t3.micro" : "cache.t3.nano"
  port                        = 6379
  parameter_group_name        = "default.redis7"
  
  num_cache_clusters          = var.enable_multi_az && var.environment == "prod" ? 2 : 1
  automatic_failover_enabled  = var.enable_multi_az && var.environment == "prod"
  multi_az_enabled           = var.enable_multi_az && var.environment == "prod"
  
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.elasticache.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result
  
  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  tags = var.tags
}

resource "random_password" "redis_auth" {
  length  = 32
  special = true
}

# Route53 for DNS management
resource "aws_route53_zone" "main" {
  name = var.domain_name
  
  tags = var.tags
}

# ACM Certificate for SSL/TLS
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = var.tags
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront Distribution for global CDN
resource "aws_s3_bucket" "frontend_assets" {
  bucket        = "livyflow-frontend-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "prod"
  
  tags = var.tags
}

resource "aws_s3_bucket_public_access_block" "frontend_assets" {
  bucket = aws_s3_bucket.frontend_assets.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for LivyFlow ${var.environment}"
}

resource "aws_s3_bucket_policy" "frontend_assets" {
  bucket = aws_s3_bucket.frontend_assets.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_assets.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_s3_bucket.frontend_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend_assets.bucket}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${aws_lb.main.name}"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  aliases = [var.domain_name, "www.${var.domain_name}"]
  
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend_assets.bucket}"
    compress              = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
  
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALB-${aws_lb.main.name}"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "X-Forwarded-For"]
      cookies {
        forward = "all"
      }
    }
    
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
    viewer_protocol_policy = "https-only"
  }
  
  price_class = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }
  
  tags = var.tags
}

# Route53 records for the domain
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id               = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id               = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# WAF for application protection
resource "aws_wafv2_web_acl" "main" {
  name  = "livyflow-waf-${var.environment}"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  rule {
    name     = "RateLimitRule"
    priority = 3
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = var.environment == "prod" ? 2000 : 1000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "livyflowWAF"
    sampled_requests_enabled   = true
  }
  
  tags = var.tags
}

# Outputs
output "eks_cluster_endpoint" { value = aws_eks_cluster.main.endpoint }
output "eks_cluster_name" { value = aws_eks_cluster.main.name }
output "eks_cluster_ca_certificate" { value = aws_eks_cluster.main.certificate_authority[0].data }
output "rds_endpoint" { value = aws_rds_cluster.main.endpoint }
output "redis_endpoint" { value = aws_elasticache_replication_group.main.configuration_endpoint_address }
output "cloudfront_domain" { value = aws_cloudfront_distribution.main.domain_name }
output "s3_frontend_bucket" { value = aws_s3_bucket.frontend_assets.bucket }
output "route53_zone_id" { value = aws_route53_zone.main.zone_id }
output "load_balancer_dns" { value = aws_lb.main.dns_name }