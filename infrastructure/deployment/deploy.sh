#!/bin/bash

# LivyFlow Infrastructure Deployment Script
# Comprehensive deployment automation for multi-cloud environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/infrastructure"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/livyflow_deploy_${TIMESTAMP}.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
CLOUD_PROVIDER="aws"
DOMAIN_NAME="livyflow.com"
REGION="us-east-1"
DRY_RUN="false"
SKIP_TESTS="false"
AUTO_APPROVE="false"
DESTROY="false"
VERBOSE="false"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}" >&2
            echo "[$timestamp] [ERROR] $message" >> "$LOG_FILE"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} ${message}"
            echo "[$timestamp] [WARN] $message" >> "$LOG_FILE"
            ;;
        INFO)
            echo -e "${GREEN}[INFO]${NC} ${message}"
            echo "[$timestamp] [INFO] $message" >> "$LOG_FILE"
            ;;
        DEBUG)
            if [[ "$VERBOSE" == "true" ]]; then
                echo -e "${BLUE}[DEBUG]${NC} ${message}"
            fi
            echo "[$timestamp] [DEBUG] $message" >> "$LOG_FILE"
            ;;
        *)
            echo "$message"
            echo "[$timestamp] $message" >> "$LOG_FILE"
            ;;
    esac
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy LivyFlow infrastructure to cloud environments

OPTIONS:
    -e, --environment ENV       Environment to deploy (dev|staging|prod) [default: dev]
    -c, --cloud PROVIDER       Cloud provider (aws|gcp|azure) [default: aws]
    -r, --region REGION         Cloud region [default: us-east-1]
    -d, --domain DOMAIN         Domain name [default: livyflow.com]
    --dry-run                   Show what would be deployed without making changes
    --skip-tests               Skip infrastructure validation tests
    --auto-approve             Auto-approve Terraform changes (use with caution)
    --destroy                  Destroy infrastructure instead of creating
    -v, --verbose              Enable verbose output
    -h, --help                 Show this help message

EXAMPLES:
    # Deploy to development environment
    $0 -e dev

    # Deploy to production with auto-approve (CI/CD)
    $0 -e prod --auto-approve

    # Dry run for staging environment
    $0 -e staging --dry-run

    # Destroy development environment
    $0 -e dev --destroy

    # Deploy to GCP production
    $0 -e prod -c gcp --auto-approve

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -c|--cloud)
                CLOUD_PROVIDER="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -d|--domain)
                DOMAIN_NAME="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --auto-approve)
                AUTO_APPROVE="true"
                shift
                ;;
            --destroy)
                DESTROY="true"
                shift
                ;;
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log ERROR "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    log INFO "Validating environment and prerequisites..."
    
    # Check required tools
    local required_tools=("terraform" "kubectl" "helm" "docker" "jq" "yq")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log ERROR "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check cloud provider specific tools
    case $CLOUD_PROVIDER in
        aws)
            if ! command -v aws &> /dev/null; then
                log ERROR "AWS CLI is not installed"
                exit 1
            fi
            
            # Verify AWS credentials
            if ! aws sts get-caller-identity &> /dev/null; then
                log ERROR "AWS credentials are not configured"
                exit 1
            fi
            ;;
        gcp)
            if ! command -v gcloud &> /dev/null; then
                log ERROR "Google Cloud SDK is not installed"
                exit 1
            fi
            
            # Verify GCP authentication
            if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
                log ERROR "GCP authentication is not configured"
                exit 1
            fi
            ;;
        azure)
            if ! command -v az &> /dev/null; then
                log ERROR "Azure CLI is not installed"
                exit 1
            fi
            
            # Verify Azure authentication
            if ! az account show &> /dev/null; then
                log ERROR "Azure authentication is not configured"
                exit 1
            fi
            ;;
    esac
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log ERROR "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
        exit 1
    fi
    
    # Validate cloud provider
    if [[ ! "$CLOUD_PROVIDER" =~ ^(aws|gcp|azure)$ ]]; then
        log ERROR "Invalid cloud provider: $CLOUD_PROVIDER. Must be aws, gcp, or azure"
        exit 1
    fi
    
    log INFO "Environment validation completed successfully"
}

# Setup Terraform backend
setup_terraform_backend() {
    log INFO "Setting up Terraform backend for $CLOUD_PROVIDER..."
    
    case $CLOUD_PROVIDER in
        aws)
            # Create S3 bucket for Terraform state if it doesn't exist
            local bucket_name="livyflow-terraform-state-${ENVIRONMENT}-$(date +%s | tail -c 6)"
            
            if ! aws s3 ls "s3://livyflow-terraform-state-${ENVIRONMENT}" &> /dev/null; then
                log INFO "Creating S3 bucket for Terraform state..."
                aws s3 mb "s3://livyflow-terraform-state-${ENVIRONMENT}" --region "$REGION"
                
                # Enable versioning
                aws s3api put-bucket-versioning \
                    --bucket "livyflow-terraform-state-${ENVIRONMENT}" \
                    --versioning-configuration Status=Enabled
                
                # Enable server-side encryption
                aws s3api put-bucket-encryption \
                    --bucket "livyflow-terraform-state-${ENVIRONMENT}" \
                    --server-side-encryption-configuration '{
                        "Rules": [{
                            "ApplyServerSideEncryptionByDefault": {
                                "SSEAlgorithm": "AES256"
                            }
                        }]
                    }'
            fi
            
            # Create DynamoDB table for state locking if it doesn't exist
            if ! aws dynamodb describe-table --table-name "livyflow-terraform-lock-${ENVIRONMENT}" &> /dev/null; then
                log INFO "Creating DynamoDB table for Terraform state locking..."
                aws dynamodb create-table \
                    --table-name "livyflow-terraform-lock-${ENVIRONMENT}" \
                    --attribute-definitions AttributeName=LockID,AttributeType=S \
                    --key-schema AttributeName=LockID,KeyType=HASH \
                    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
                    --region "$REGION"
                
                # Wait for table to be created
                aws dynamodb wait table-exists --table-name "livyflow-terraform-lock-${ENVIRONMENT}"
            fi
            ;;
        gcp)
            # Create GCS bucket for Terraform state
            local bucket_name="livyflow-terraform-state-${ENVIRONMENT}"
            if ! gsutil ls "gs://${bucket_name}" &> /dev/null; then
                log INFO "Creating GCS bucket for Terraform state..."
                gsutil mb -l "$REGION" "gs://${bucket_name}"
                gsutil versioning set on "gs://${bucket_name}"
            fi
            ;;
        azure)
            # Create Azure Storage Account and Container
            local storage_account="livyflowterraform${ENVIRONMENT}"
            local resource_group="livyflow-${ENVIRONMENT}-rg"
            
            if ! az storage account show --name "$storage_account" --resource-group "$resource_group" &> /dev/null; then
                log INFO "Creating Azure Storage Account for Terraform state..."
                az storage account create \
                    --name "$storage_account" \
                    --resource-group "$resource_group" \
                    --location "$REGION" \
                    --sku Standard_LRS \
                    --encryption-services blob
                
                # Create container
                az storage container create \
                    --name tfstate \
                    --account-name "$storage_account"
            fi
            ;;
    esac
    
    log INFO "Terraform backend setup completed"
}

# Initialize Terraform
init_terraform() {
    log INFO "Initializing Terraform..."
    
    cd "$INFRASTRUCTURE_DIR/terraform"
    
    # Create terraform.tfvars file
    cat > terraform.tfvars << EOF
environment = "$ENVIRONMENT"
primary_cloud = "$CLOUD_PROVIDER"
primary_aws_region = "$REGION"
domain_name = "$DOMAIN_NAME"
terraform_state_bucket = "livyflow-terraform-state-$ENVIRONMENT"
terraform_lock_table = "livyflow-terraform-lock-$ENVIRONMENT"
EOF
    
    # Initialize Terraform with backend configuration
    local backend_config=""
    case $CLOUD_PROVIDER in
        aws)
            backend_config="-backend-config=bucket=livyflow-terraform-state-$ENVIRONMENT -backend-config=region=$REGION"
            ;;
        gcp)
            backend_config="-backend-config=bucket=livyflow-terraform-state-$ENVIRONMENT"
            ;;
        azure)
            backend_config="-backend-config=storage_account_name=livyflowterraform$ENVIRONMENT -backend-config=container_name=tfstate"
            ;;
    esac
    
    terraform init $backend_config
    
    log INFO "Terraform initialization completed"
}

# Plan Terraform changes
plan_terraform() {
    log INFO "Planning Terraform changes..."
    
    cd "$INFRASTRUCTURE_DIR/terraform"
    
    local plan_args="-out=tfplan"
    
    if [[ "$DESTROY" == "true" ]]; then
        plan_args="$plan_args -destroy"
    fi
    
    terraform plan $plan_args
    
    # Save plan output for review
    terraform show -json tfplan > "tfplan_${TIMESTAMP}.json"
    
    log INFO "Terraform plan saved to tfplan_${TIMESTAMP}.json"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "Dry run completed. No changes will be applied."
        exit 0
    fi
}

# Apply Terraform changes
apply_terraform() {
    log INFO "Applying Terraform changes..."
    
    cd "$INFRASTRUCTURE_DIR/terraform"
    
    local apply_args="tfplan"
    
    if [[ "$AUTO_APPROVE" == "true" ]]; then
        apply_args="$apply_args -auto-approve"
    fi
    
    if terraform apply $apply_args; then
        log INFO "Terraform apply completed successfully"
        
        # Save outputs
        terraform output -json > "outputs_${TIMESTAMP}.json"
        log INFO "Terraform outputs saved to outputs_${TIMESTAMP}.json"
    else
        log ERROR "Terraform apply failed"
        exit 1
    fi
}

# Deploy Kubernetes resources
deploy_kubernetes() {
    if [[ "$DESTROY" == "true" ]]; then
        log INFO "Skipping Kubernetes deployment in destroy mode"
        return 0
    fi
    
    log INFO "Deploying Kubernetes resources..."
    
    # Get cluster credentials
    case $CLOUD_PROVIDER in
        aws)
            local cluster_name="livyflow-$ENVIRONMENT"
            aws eks update-kubeconfig --region "$REGION" --name "$cluster_name"
            ;;
        gcp)
            local cluster_name="livyflow-$ENVIRONMENT"
            local zone="${REGION}-a"  # Adjust based on your zone preference
            gcloud container clusters get-credentials "$cluster_name" --zone "$zone"
            ;;
        azure)
            local cluster_name="livyflow-$ENVIRONMENT"
            local resource_group="livyflow-$ENVIRONMENT-rg"
            az aks get-credentials --resource-group "$resource_group" --name "$cluster_name"
            ;;
    esac
    
    # Deploy Kubernetes manifests
    local k8s_dir="$INFRASTRUCTURE_DIR/kubernetes"
    
    # Create namespaces first
    kubectl apply -f "$k8s_dir/namespace.yaml"
    
    # Deploy ConfigMaps and Secrets
    kubectl apply -f "$k8s_dir/configmap.yaml"
    
    # Note: In production, secrets should be handled by external secret management
    if [[ "$ENVIRONMENT" != "prod" ]]; then
        kubectl apply -f "$k8s_dir/secrets.yaml"
    fi
    
    # Deploy services
    kubectl apply -f "$k8s_dir/services.yaml"
    
    # Deploy applications
    kubectl apply -f "$k8s_dir/deployments.yaml"
    
    # Deploy autoscaling configuration
    kubectl apply -f "$k8s_dir/autoscaling.yaml"
    
    # Wait for deployments to be ready
    log INFO "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=600s deployment/livyflow-backend -n "livyflow-$ENVIRONMENT"
    kubectl wait --for=condition=available --timeout=600s deployment/livyflow-frontend -n "livyflow-$ENVIRONMENT"
    
    log INFO "Kubernetes deployment completed successfully"
}

# Run infrastructure tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log INFO "Skipping infrastructure tests"
        return 0
    fi
    
    log INFO "Running infrastructure validation tests..."
    
    # Test 1: Check if endpoints are accessible
    local api_url="https://api.$DOMAIN_NAME/health"
    local frontend_url="https://$DOMAIN_NAME"
    
    log INFO "Testing API endpoint: $api_url"
    if curl -f -s "$api_url" > /dev/null; then
        log INFO "API endpoint is accessible"
    else
        log WARN "API endpoint is not accessible yet (may take time for DNS propagation)"
    fi
    
    log INFO "Testing frontend endpoint: $frontend_url"
    if curl -f -s "$frontend_url" > /dev/null; then
        log INFO "Frontend endpoint is accessible"
    else
        log WARN "Frontend endpoint is not accessible yet (may take time for DNS propagation)"
    fi
    
    # Test 2: Check Kubernetes cluster health
    log INFO "Checking Kubernetes cluster health..."
    kubectl get nodes
    kubectl get pods -n "livyflow-$ENVIRONMENT"
    
    # Test 3: Check resource utilization
    log INFO "Checking resource utilization..."
    kubectl top nodes || log WARN "Metrics server may not be ready yet"
    kubectl top pods -n "livyflow-$ENVIRONMENT" || log WARN "Pod metrics may not be available yet"
    
    # Test 4: Validate monitoring stack
    if kubectl get namespace livyflow-monitoring &> /dev/null; then
        log INFO "Checking monitoring stack..."
        kubectl get pods -n livyflow-monitoring
    fi
    
    log INFO "Infrastructure tests completed"
}

# Cleanup function
cleanup() {
    log INFO "Performing cleanup..."
    
    # Remove temporary files
    rm -f "$INFRASTRUCTURE_DIR/terraform/tfplan"
    rm -f "$INFRASTRUCTURE_DIR/terraform/terraform.tfvars"
    
    log INFO "Cleanup completed"
}

# Main deployment function
deploy() {
    log INFO "Starting LivyFlow infrastructure deployment..."
    log INFO "Environment: $ENVIRONMENT"
    log INFO "Cloud Provider: $CLOUD_PROVIDER"
    log INFO "Region: $REGION"
    log INFO "Domain: $DOMAIN_NAME"
    log INFO "Log file: $LOG_FILE"
    
    # Pre-deployment steps
    validate_environment
    setup_terraform_backend
    
    # Terraform deployment
    init_terraform
    plan_terraform
    
    if [[ "$DRY_RUN" != "true" ]]; then
        apply_terraform
        deploy_kubernetes
        run_tests
    fi
    
    log INFO "Deployment completed successfully!"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        # Display important URLs and information
        echo ""
        echo -e "${GREEN}=== Deployment Summary ===${NC}"
        echo -e "${CYAN}Environment:${NC} $ENVIRONMENT"
        echo -e "${CYAN}Cloud Provider:${NC} $CLOUD_PROVIDER"
        echo -e "${CYAN}Region:${NC} $REGION"
        echo -e "${CYAN}Frontend URL:${NC} https://$DOMAIN_NAME"
        echo -e "${CYAN}API URL:${NC} https://api.$DOMAIN_NAME"
        
        if [[ "$ENVIRONMENT" == "prod" ]]; then
            echo -e "${CYAN}Monitoring Dashboard:${NC} https://grafana.internal.$DOMAIN_NAME"
        fi
        
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Update DNS records to point to the load balancer"
        echo "2. Configure SSL certificates"
        echo "3. Set up monitoring alerts"
        echo "4. Run application-specific tests"
        echo ""
    fi
}

# Error handling
handle_error() {
    local exit_code=$?
    log ERROR "Deployment failed with exit code $exit_code"
    cleanup
    exit $exit_code
}

# Set up error handling
trap handle_error ERR
trap cleanup EXIT

# Main execution
main() {
    parse_args "$@"
    deploy
}

# Run main function with all arguments
main "$@"