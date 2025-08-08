# Monitoring module for LivyFlow - Comprehensive observability stack

variable "environment" { type = string }
variable "primary_cloud" { type = string }
variable "domain_name" { type = string }
variable "cluster_name" { type = string }

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/livyflow/${var.environment}/application"
  retention_in_days = var.environment == "prod" ? 30 : 7
  
  tags = {
    Environment = var.environment
    Component   = "application-logs"
  }
}

resource "aws_cloudwatch_log_group" "security_logs" {
  name              = "/aws/livyflow/${var.environment}/security"
  retention_in_days = var.environment == "prod" ? 90 : 30
  
  tags = {
    Environment = var.environment
    Component   = "security-logs"
  }
}

resource "aws_cloudwatch_log_group" "audit_logs" {
  name              = "/aws/livyflow/${var.environment}/audit"
  retention_in_days = var.environment == "prod" ? 365 : 90
  
  tags = {
    Environment = var.environment
    Component   = "audit-logs"
  }
}

# CloudWatch Dashboards
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "LivyFlow-${var.environment}-Overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/EKS", "cluster_node_count", "ClusterName", var.cluster_name],
            [".", "cluster_failed_node_count", ".", "."],
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "EKS Cluster Health"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", "livyflow-${var.environment}"],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "RDS Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "livyflow-${var.environment}"],
            [".", "CacheHits", ".", "."],
            [".", "CacheMisses", ".", "."],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "ElastiCache Performance"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", "DISTRIBUTION_ID"],
            [".", "BytesDownloaded", ".", "."],
            [".", "CacheHitRate", ".", "."],
            [".", "ErrorRate", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = data.aws_region.current.name
          title   = "CloudFront Performance"
          period  = 300
        }
      }
    ]
  })
}

# Application Performance Dashboard
resource "aws_cloudwatch_dashboard" "application" {
  dashboard_name = "LivyFlow-${var.environment}-Application"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "log"
        x      = 0
        y      = 0
        width  = 24
        height = 6

        properties = {
          query = "SOURCE '${aws_cloudwatch_log_group.application_logs.name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 100"
          region = data.aws_region.current.name
          title = "Recent Application Errors"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          query = "SOURCE '${aws_cloudwatch_log_group.application_logs.name}' | filter @message like /response_time/ | stats avg(response_time) by bin(5m)"
          region = data.aws_region.current.name
          title = "Average Response Time"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          query = "SOURCE '${aws_cloudwatch_log_group.application_logs.name}' | filter @message like /status_code/ | stats count() by status_code"
          region = data.aws_region.current.name
          title = "HTTP Status Code Distribution"
        }
      }
    ]
  })
}

# Security Monitoring Dashboard
resource "aws_cloudwatch_dashboard" "security" {
  dashboard_name = "LivyFlow-${var.environment}-Security"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "log"
        x      = 0
        y      = 0
        width  = 24
        height = 6

        properties = {
          query = "SOURCE '${aws_cloudwatch_log_group.security_logs.name}' | fields @timestamp, @message | filter priority = \"CRITICAL\" | sort @timestamp desc | limit 50"
          region = data.aws_region.current.name
          title = "Critical Security Events"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          query = "SOURCE '${aws_cloudwatch_log_group.security_logs.name}' | filter @message like /authentication/ | stats count() by bin(1h)"
          region = data.aws_region.current.name
          title = "Authentication Events (Hourly)"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          query = "SOURCE '${aws_cloudwatch_log_group.security_logs.name}' | filter @message like /unauthorized/ | stats count() by bin(1h)"
          region = data.aws_region.current.name
          title = "Unauthorized Access Attempts"
        }
      }
    ]
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "livyflow-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors EKS cluster CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ClusterName = var.cluster_name
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "livyflow-${var.environment}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors EKS cluster memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ClusterName = var.cluster_name
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "livyflow-${var.environment}-database-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBClusterIdentifier = "livyflow-${var.environment}"
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "livyflow-${var.environment}-database-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBClusterIdentifier = "livyflow-${var.environment}"
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "application_errors" {
  alarm_name          = "livyflow-${var.environment}-application-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ErrorCount"
  namespace           = "LivyFlow/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors application error count"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = {
    Environment = var.environment
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "livyflow-${var.environment}-alerts"

  tags = {
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "alerts@${var.domain_name}"
}

resource "aws_sns_topic_subscription" "slack_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
}

# X-Ray Tracing
resource "aws_xray_sampling_rule" "livyflow" {
  rule_name      = "livyflow-${var.environment}"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "/api/v1/*"
  host           = "*.${var.domain_name}"
  http_method    = "*"
  service_type   = "*"
  service_name   = "livyflow-backend"
  resource_arn   = "*"

  tags = {
    Environment = var.environment
  }
}

# Cost and Usage Monitoring
resource "aws_ce_cost_category" "livyflow" {
  name         = "LivyFlow-${var.environment}"
  rule_version = "CostCategoryExpression.v1"

  rule {
    value = "Compute"
    rule {
      dimension {
        key           = "SERVICE"
        values        = ["Amazon Elastic Compute Cloud - Compute", "Amazon Elastic Kubernetes Service"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Database"
    rule {
      dimension {
        key           = "SERVICE"
        values        = ["Amazon Relational Database Service", "Amazon ElastiCache"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Storage"
    rule {
      dimension {
        key           = "SERVICE"
        values        = ["Amazon Simple Storage Service", "Amazon Elastic Block Store"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Network"
    rule {
      dimension {
        key           = "SERVICE"
        values        = ["Amazon CloudFront", "Amazon Virtual Private Cloud"]
        match_options = ["EQUALS"]
      }
    }
  }

  tags = {
    Environment = var.environment
  }
}

# Budget for cost monitoring
resource "aws_budgets_budget" "livyflow_monthly" {
  name     = "livyflow-${var.environment}-monthly-budget"
  budget_type = "COST"
  limit_amount = var.environment == "prod" ? "2000" : "500"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  time_period_start = "2024-01-01_00:00"

  cost_filters = {
    Tag = [
      "Environment:${var.environment}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["finance@${var.domain_name}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["finance@${var.domain_name}", "ops@${var.domain_name}"]
  }
}

# Custom metrics for application monitoring
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "livyflow-${var.environment}-error-count"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, requestId, level=\"ERROR\", ...]"

  metric_transformation {
    name      = "ErrorCount"
    namespace = "LivyFlow/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "response_time" {
  name           = "livyflow-${var.environment}-response-time"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, requestId, level, method, url, status, response_time, ...]"

  metric_transformation {
    name      = "ResponseTime"
    namespace = "LivyFlow/Application"
    value     = "$response_time"
    unit      = "Milliseconds"
  }
}

resource "aws_cloudwatch_log_metric_filter" "login_attempts" {
  name           = "livyflow-${var.environment}-login-attempts"
  log_group_name = aws_cloudwatch_log_group.security_logs.name
  pattern        = "[timestamp, level, event_type=\"login_attempt\", user_id, status, ...]"

  metric_transformation {
    name      = "LoginAttempts"
    namespace = "LivyFlow/Security"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "failed_login_attempts" {
  name           = "livyflow-${var.environment}-failed-login-attempts"
  log_group_name = aws_cloudwatch_log_group.security_logs.name
  pattern        = "[timestamp, level, event_type=\"login_attempt\", user_id, status=\"failed\", ...]"

  metric_transformation {
    name      = "FailedLoginAttempts"
    namespace = "LivyFlow/Security"
    value     = "1"
  }
}

# ElasticSearch for centralized logging (optional)
resource "aws_elasticsearch_domain" "livyflow_logs" {
  count         = var.environment == "prod" ? 1 : 0
  domain_name   = "livyflow-${var.environment}-logs"
  elasticsearch_version = "7.10"

  cluster_config {
    instance_type  = "t3.small.elasticsearch"
    instance_count = 2
    
    dedicated_master_enabled = false
    zone_awareness_enabled   = true
    
    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 20
  }

  vpc_options {
    subnet_ids = ["subnet-12345678", "subnet-87654321"]  # Replace with actual subnet IDs
    security_group_ids = [aws_security_group.elasticsearch[0].id]
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  node_to_node_encryption {
    enabled = true
  }

  encrypt_at_rest {
    enabled = true
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "admin"
      master_user_password = "YourSecurePassword123!"
    }
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "es:*"
        Principal = "*"
        Effect = "Allow"
        Resource = "arn:aws:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/livyflow-${var.environment}-logs/*"
        Condition = {
          IpAddress = {
            "aws:sourceIp" = ["10.0.0.0/8"]  # Restrict to VPC CIDR
          }
        }
      }
    ]
  })

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.elasticsearch_logs[0].arn
    log_type                 = "INDEX_SLOW_LOGS"
  }

  tags = {
    Environment = var.environment
    Component   = "logging"
  }
}

resource "aws_security_group" "elasticsearch" {
  count       = var.environment == "prod" ? 1 : 0
  name        = "livyflow-${var.environment}-elasticsearch"
  description = "Security group for ElasticSearch domain"
  vpc_id      = "vpc-12345678"  # Replace with actual VPC ID

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Component   = "elasticsearch"
  }
}

resource "aws_cloudwatch_log_group" "elasticsearch_logs" {
  count             = var.environment == "prod" ? 1 : 0
  name              = "/aws/elasticsearch/domains/livyflow-${var.environment}-logs"
  retention_in_days = 7

  tags = {
    Environment = var.environment
    Component   = "elasticsearch-logs"
  }
}

# Kinesis for real-time log streaming
resource "aws_kinesis_stream" "log_stream" {
  name        = "livyflow-${var.environment}-logs"
  shard_count = var.environment == "prod" ? 2 : 1

  shard_level_metrics = [
    "IncomingRecords",
    "OutgoingRecords",
  ]

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  tags = {
    Environment = var.environment
    Component   = "log-streaming"
  }
}

resource "aws_kinesis_firehose_delivery_stream" "log_delivery" {
  name        = "livyflow-${var.environment}-log-delivery"
  destination = "elasticsearch"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.log_stream.arn
    role_arn          = aws_iam_role.firehose_delivery_role.arn
  }

  elasticsearch_configuration {
    domain_arn = var.environment == "prod" ? aws_elasticsearch_domain.livyflow_logs[0].arn : null
    role_arn   = aws_iam_role.firehose_delivery_role.arn
    index_name = "livyflow-logs"
    
    processing_configuration {
      enabled = "true"

      processors {
        type = "Lambda"

        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = "${aws_lambda_function.log_processor.arn}:$LATEST"
        }
      }
    }
  }

  tags = {
    Environment = var.environment
    Component   = "log-delivery"
  }
}

# IAM role for Kinesis Firehose
resource "aws_iam_role" "firehose_delivery_role" {
  name = "livyflow-${var.environment}-firehose-delivery-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "firehose_delivery_policy" {
  role = aws_iam_role.firehose_delivery_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "es:ESHttpPost",
          "es:ESHttpPut"
        ]
        Resource = var.environment == "prod" ? "${aws_elasticsearch_domain.livyflow_logs[0].arn}/*" : "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:GetShardIterator",
          "kinesis:GetRecords"
        ]
        Resource = aws_kinesis_stream.log_stream.arn
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = aws_lambda_function.log_processor.arn
      }
    ]
  })
}

# Lambda function for log processing
resource "aws_lambda_function" "log_processor" {
  filename      = "log_processor.zip"
  function_name = "livyflow-${var.environment}-log-processor"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "python3.9"

  source_code_hash = data.archive_file.log_processor_zip.output_base64sha256

  tags = {
    Environment = var.environment
    Component   = "log-processing"
  }
}

data "archive_file" "log_processor_zip" {
  type        = "zip"
  output_path = "log_processor.zip"
  
  source {
    content = <<EOF
import json
import base64
import gzip
import datetime

def handler(event, context):
    output = []
    
    for record in event['records']:
        # Decode the data
        compressed_payload = base64.b64decode(record['data'])
        uncompressed_payload = gzip.decompress(compressed_payload)
        log_data = json.loads(uncompressed_payload)
        
        # Process each log event
        for log_event in log_data['logEvents']:
            # Add timestamp and processing metadata
            processed_record = {
                'timestamp': datetime.datetime.fromtimestamp(log_event['timestamp'] / 1000).isoformat(),
                'message': log_event['message'],
                'log_group': log_data['logGroup'],
                'log_stream': log_data['logStream'],
                'processed_at': datetime.datetime.utcnow().isoformat()
            }
            
            # Encode the processed record
            output_record = {
                'recordId': record['recordId'],
                'result': 'Ok',
                'data': base64.b64encode(
                    json.dumps(processed_record).encode('utf-8')
                ).decode('utf-8')
            }
            output.append(output_record)
    
    return {'records': output}
EOF
    filename = "index.py"
  }
}

resource "aws_iam_role" "lambda_role" {
  name = "livyflow-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# Outputs
output "cloudwatch_dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_topic_arn" {
  description = "SNS Topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "elasticsearch_endpoint" {
  description = "ElasticSearch endpoint"
  value       = var.environment == "prod" ? aws_elasticsearch_domain.livyflow_logs[0].endpoint : null
}

output "kinesis_stream_name" {
  description = "Kinesis stream name for logging"
  value       = aws_kinesis_stream.log_stream.name
}

output "log_groups" {
  description = "CloudWatch log groups created"
  value = {
    application = aws_cloudwatch_log_group.application_logs.name
    security    = aws_cloudwatch_log_group.security_logs.name
    audit       = aws_cloudwatch_log_group.audit_logs.name
  }
}