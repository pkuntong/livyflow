# LivyFlow Infrastructure - Multi-Cloud Terraform Configuration
# Optimized for cost efficiency and scalability

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }

  # Remote state configuration - choose one
  backend "s3" {
    bucket = var.terraform_state_bucket
    key    = "livyflow/terraform.tfstate"
    region = var.primary_aws_region
    
    dynamodb_table = var.terraform_lock_table
    encrypt        = true
  }
}

# Variables for multi-cloud configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "primary_cloud" {
  description = "Primary cloud provider (aws, gcp, azure)"
  type        = string
  default     = "aws"
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.primary_cloud)
    error_message = "Primary cloud must be aws, gcp, or azure."
  }
}

variable "enable_multi_cloud" {
  description = "Enable multi-cloud deployment for disaster recovery"
  type        = bool
  default     = false
}

variable "primary_aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "secondary_aws_region" {
  description = "Secondary AWS region for DR"
  type        = string
  default     = "us-west-2"
}

variable "gcp_project" {
  description = "GCP Project ID"
  type        = string
  default     = ""
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "azure_location" {
  description = "Azure location"
  type        = string
  default     = "East US"
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "livyflow.com"
}

variable "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
}

variable "terraform_lock_table" {
  description = "DynamoDB table for Terraform state locking"
  type        = string
}

# Common tags for all resources
locals {
  common_tags = {
    Environment   = var.environment
    Project       = "LivyFlow"
    ManagedBy    = "Terraform"
    CostCenter   = "Engineering"
    Application  = "financial-management"
  }
  
  # Cost optimization settings
  cost_optimization = {
    enable_spot_instances = var.environment != "prod"
    enable_scheduled_scaling = true
    enable_rightsizing = true
  }
}

# Data sources for availability zones
data "aws_availability_zones" "available" {
  state = "available"
  count = var.primary_cloud == "aws" ? 1 : 0
}

# Main module calls based on primary cloud
module "aws_infrastructure" {
  count  = var.primary_cloud == "aws" ? 1 : 0
  source = "./modules/aws"
  
  environment              = var.environment
  primary_region          = var.primary_aws_region
  secondary_region        = var.secondary_aws_region
  availability_zones      = data.aws_availability_zones.available[0].names
  domain_name             = var.domain_name
  enable_multi_az         = var.environment == "prod"
  enable_disaster_recovery = var.enable_multi_cloud
  cost_optimization       = local.cost_optimization
  tags                   = local.common_tags
}

module "gcp_infrastructure" {
  count  = var.primary_cloud == "gcp" ? 1 : 0
  source = "./modules/gcp"
  
  project_id        = var.gcp_project
  environment       = var.environment
  region           = var.gcp_region
  domain_name      = var.domain_name
  cost_optimization = local.cost_optimization
  labels           = local.common_tags
}

module "azure_infrastructure" {
  count  = var.primary_cloud == "azure" ? 1 : 0
  source = "./modules/azure"
  
  environment       = var.environment
  location         = var.azure_location
  domain_name      = var.domain_name
  cost_optimization = local.cost_optimization
  tags             = local.common_tags
}

# Kubernetes deployment (cloud-agnostic)
module "kubernetes" {
  source = "./modules/kubernetes"
  
  environment       = var.environment
  cluster_endpoint  = var.primary_cloud == "aws" ? module.aws_infrastructure[0].eks_cluster_endpoint : (
                     var.primary_cloud == "gcp" ? module.gcp_infrastructure[0].gke_cluster_endpoint : 
                     module.azure_infrastructure[0].aks_cluster_endpoint
                     )
  cluster_ca_cert   = var.primary_cloud == "aws" ? module.aws_infrastructure[0].eks_cluster_ca_certificate : (
                     var.primary_cloud == "gcp" ? module.gcp_infrastructure[0].gke_cluster_ca_certificate : 
                     module.azure_infrastructure[0].aks_cluster_ca_certificate
                     )
  domain_name       = var.domain_name
  cost_optimization = local.cost_optimization
}

# Monitoring and observability
module "monitoring" {
  source = "./modules/monitoring"
  
  environment    = var.environment
  primary_cloud  = var.primary_cloud
  domain_name    = var.domain_name
  
  # Cloud-specific monitoring endpoints
  cluster_name = var.primary_cloud == "aws" ? module.aws_infrastructure[0].eks_cluster_name : (
                var.primary_cloud == "gcp" ? module.gcp_infrastructure[0].gke_cluster_name : 
                module.azure_infrastructure[0].aks_cluster_name
                )
}

# Outputs
output "application_url" {
  description = "Primary application URL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API endpoint URL"
  value       = "https://api.${var.domain_name}"
}

output "monitoring_dashboard" {
  description = "Monitoring dashboard URL"
  value       = "https://monitoring.${var.domain_name}"
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost in USD"
  value = {
    startup_tier    = "$150-300"
    growth_tier     = "$500-1000" 
    enterprise_tier = "$2000-5000"
  }
}

output "cost_optimization_savings" {
  description = "Estimated monthly savings from optimization"
  value = {
    spot_instances      = "40-60% on compute"
    reserved_instances  = "30-50% on steady workloads"
    rightsizing        = "20-30% on over-provisioned resources"
    scheduled_scaling  = "15-25% on predictable workloads"
  }
}