# Kubernetes module for LivyFlow - Cloud-agnostic deployments

variable "environment" { type = string }
variable "cluster_endpoint" { type = string }
variable "cluster_ca_cert" { type = string }
variable "domain_name" { type = string }
variable "cost_optimization" { type = map(any) }

# Kubernetes provider configuration
provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", "livyflow-${var.environment}"]
  }
}

provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", "livyflow-${var.environment}"]
    }
  }
}

# Create namespaces
resource "kubernetes_namespace" "livyflow" {
  metadata {
    name = "livyflow-${var.environment}"
    
    labels = {
      "app.kubernetes.io/name"     = "livyflow"
      "app.kubernetes.io/instance" = var.environment
      "environment"                = var.environment
      "cost-optimization"          = "enabled"
    }
  }
}

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "livyflow-monitoring"
    
    labels = {
      "app.kubernetes.io/name" = "monitoring"
      "environment"            = "shared"
    }
  }
}

resource "kubernetes_namespace" "security" {
  metadata {
    name = "security-monitoring"
    
    labels = {
      "app.kubernetes.io/name" = "security"
      "environment"            = "shared"
    }
  }
}

# Install NGINX Ingress Controller
resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  
  create_namespace = true
  
  values = [
    yamlencode({
      controller = {
        replicaCount = var.environment == "prod" ? 3 : 1
        
        resources = {
          limits = {
            cpu    = "1000m"
            memory = "1Gi"
          }
          requests = {
            cpu    = "500m"
            memory = "512Mi"
          }
        }
        
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-type"                    = "nlb"
            "service.beta.kubernetes.io/aws-load-balancer-backend-protocol"        = "tcp"
            "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
            "service.beta.kubernetes.io/aws-load-balancer-ssl-cert"               = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"
            "service.beta.kubernetes.io/aws-load-balancer-ssl-ports"              = "443"
          }
        }
        
        config = {
          "use-proxy-protocol"    = "true"
          "compute-full-forwarded-for" = "true"
          "use-forwarded-headers" = "true"
          "proxy-real-ip-cidr"    = "10.0.0.0/8"
          "server-tokens"         = "false"
          "ssl-protocols"         = "TLSv1.2 TLSv1.3"
          "ssl-ciphers"          = "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384"
        }
        
        metrics = {
          enabled = true
          service = {
            annotations = {
              "prometheus.io/scrape" = "true"
              "prometheus.io/port"   = "10254"
            }
          }
        }
        
        podSecurityContext = {
          runAsUser  = 101
          runAsGroup = 82
          fsGroup    = 82
        }
        
        affinity = {
          podAntiAffinity = {
            requiredDuringSchedulingIgnoredDuringExecution = [
              {
                labelSelector = {
                  matchExpressions = [
                    {
                      key      = "app.kubernetes.io/name"
                      operator = "In"
                      values   = ["ingress-nginx"]
                    }
                  ]
                }
                topologyKey = "kubernetes.io/hostname"
              }
            ]
          }
        }
      }
    })
  ]
}

# Install Cert-Manager for automatic SSL certificates
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  
  create_namespace = true
  
  values = [
    yamlencode({
      installCRDs = true
      
      resources = {
        limits = {
          cpu    = "100m"
          memory = "128Mi"
        }
        requests = {
          cpu    = "50m"
          memory = "64Mi"
        }
      }
      
      webhook = {
        resources = {
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
        }
      }
      
      cainjector = {
        resources = {
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
        }
      }
      
      global = {
        priorityClassName = "system-cluster-critical"
      }
    })
  ]
}

# ClusterIssuer for Let's Encrypt
resource "kubernetes_manifest" "letsencrypt_issuer" {
  depends_on = [helm_release.cert_manager]
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    
    metadata = {
      name = "letsencrypt-prod"
    }
    
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = "ssl@${var.domain_name}"
        
        privateKeySecretRef = {
          name = "letsencrypt-prod"
        }
        
        solvers = [
          {
            http01 = {
              ingress = {
                class = "nginx"
              }
            }
          }
        ]
      }
    }
  }
}

# Install Prometheus Operator for monitoring
resource "helm_release" "prometheus_operator" {
  name       = "prometheus-operator"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  
  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          retention = var.environment == "prod" ? "30d" : "7d"
          
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = var.environment == "prod" ? "100Gi" : "20Gi"
                  }
                }
              }
            }
          }
          
          resources = {
            limits = {
              cpu    = "2000m"
              memory = "4Gi"
            }
            requests = {
              cpu    = "500m"
              memory = "2Gi"
            }
          }
          
          securityContext = {
            runAsUser     = 65534
            runAsGroup    = 65534
            runAsNonRoot  = true
            fsGroup       = 65534
          }
        }
      }
      
      grafana = {
        adminPassword = "changeme-in-production"
        
        persistence = {
          enabled      = true
          storageClassName = "gp3"
          size         = "10Gi"
        }
        
        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "200m"
            memory = "256Mi"
          }
        }
        
        ingress = {
          enabled = true
          ingressClassName = "nginx"
          hosts   = ["grafana.internal.${var.domain_name}"]
          
          annotations = {
            "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
            "nginx.ingress.kubernetes.io/auth-type" = "basic"
            "nginx.ingress.kubernetes.io/auth-secret" = "grafana-basic-auth"
          }
          
          tls = [
            {
              secretName = "grafana-tls"
              hosts      = ["grafana.internal.${var.domain_name}"]
            }
          ]
        }
        
        securityContext = {
          runAsUser     = 472
          runAsGroup    = 472
          runAsNonRoot  = true
          fsGroup       = 472
        }
      }
      
      alertmanager = {
        alertmanagerSpec = {
          retention = "120h"
          
          storage = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "10Gi"
                  }
                }
              }
            }
          }
          
          resources = {
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
      
      nodeExporter = {
        enabled = true
      }
      
      kubeStateMetrics = {
        enabled = true
      }
      
      defaultRules = {
        create = true
        rules = {
          alertmanager       = true
          etcd              = false  # Not applicable for managed EKS
          general           = true
          k8s               = true
          kubeApiserver     = true
          kubePrometheusNodeAlerting = true
          kubernetesApps    = true
          kubernetesResources = true
          kubernetesStorage = true
          kubernetesSystem  = true
          node              = true
          prometheus        = true
        }
      }
    })
  ]
}

# Install KEDA for event-driven autoscaling
resource "helm_release" "keda" {
  name       = "keda"
  repository = "https://kedacore.github.io/charts"
  chart      = "keda"
  namespace  = "keda-system"
  
  create_namespace = true
  
  values = [
    yamlencode({
      image = {
        keda = {
          repository = "ghcr.io/kedacore/keda"
          tag        = "2.12.1"
        }
        metricsApiServer = {
          repository = "ghcr.io/kedacore/keda-metrics-apiserver"
          tag        = "2.12.1"
        }
        webhooks = {
          repository = "ghcr.io/kedacore/keda-admission-webhooks"
          tag        = "2.12.1"
        }
      }
      
      resources = {
        operator = {
          limits = {
            cpu    = "1000m"
            memory = "1000Mi"
          }
          requests = {
            cpu    = "100m"
            memory = "100Mi"
          }
        }
        
        metricServer = {
          limits = {
            cpu    = "1000m"
            memory = "1000Mi"
          }
          requests = {
            cpu    = "100m"
            memory = "100Mi"
          }
        }
        
        webhooks = {
          limits = {
            cpu    = "50m"
            memory = "100Mi"
          }
          requests = {
            cpu    = "10m"
            memory = "10Mi"
          }
        }
      }
      
      securityContext = {
        operator = {
          runAsNonRoot = true
          runAsUser    = 1001
        }
        metricServer = {
          runAsNonRoot = true
          runAsUser    = 1001
        }
        webhooks = {
          runAsNonRoot = true
          runAsUser    = 1001
        }
      }
    })
  ]
}

# Install Falco for runtime security
resource "helm_release" "falco" {
  name       = "falco"
  repository = "https://falcosecurity.github.io/charts"
  chart      = "falco"
  namespace  = kubernetes_namespace.security.metadata[0].name
  
  values = [
    yamlencode({
      falco = {
        rules_file = [
          "/etc/falco/falco_rules.yaml",
          "/etc/falco/falco_rules.local.yaml",
          "/etc/falco/k8s_audit_rules.yaml",
          "/etc/falco/rules.d"
        ]
        
        json_output = true
        json_include_output_property = true
        
        http_output = {
          enabled = true
          url     = "http://falco-exporter:9376/api/v1/alerts"
        }
        
        grpc = {
          enabled = true
          bind_address = "0.0.0.0:5060"
          threadiness = 8
        }
        
        grpc_output = {
          enabled = true
        }
      }
      
      resources = {
        limits = {
          cpu    = "1000m"
          memory = "1024Mi"
        }
        requests = {
          cpu    = "100m"
          memory = "512Mi"
        }
      }
      
      tolerations = [
        {
          effect   = "NoSchedule"
          key      = "node-role.kubernetes.io/master"
          operator = "Exists"
        },
        {
          effect   = "NoSchedule"
          key      = "node-role.kubernetes.io/control-plane"
          operator = "Exists"
        }
      ]
      
      falcoctl = {
        artifact = {
          install = {
            enabled = true
          }
          follow = {
            enabled = true
          }
        }
        
        config = {
          artifact = {
            allowedTypes = ["rulesfile"]
            install = {
              resolveDeps = true
              refs = [
                "falco-rules:0"
              ]
            }
            follow = {
              refs = [
                "falco-rules:0"
              ]
            }
          }
        }
      }
      
      customRules = {
        "livyflow-rules.yaml" = <<-EOT
          - rule: Unauthorized Process in Financial Container
            desc: Detect unauthorized processes in financial application containers
            condition: >
              container and
              k8s.ns.name="livyflow-${var.environment}" and
              not proc.name in (python, uvicorn, nginx, redis-server, postgres)
            output: >
              Unauthorized process in financial container 
              (user=%user.name command=%proc.cmdline container=%container.id image=%container.image.repository)
            priority: CRITICAL
            tags: [process, financial]
          
          - rule: Sensitive Data Access
            desc: Detect access to sensitive financial data files
            condition: >
              open_read and
              k8s.ns.name="livyflow-${var.environment}" and
              (fd.name contains "/secrets/" or 
               fd.name contains ".pem" or 
               fd.name contains ".key" or
               fd.name contains "credentials")
            output: >
              Sensitive file access detected
              (user=%user.name file=%fd.name container=%container.id)
            priority: WARNING
            tags: [file, sensitive-data]
        EOT
      }
    })
  ]
}

# Install External Secrets Operator
resource "helm_release" "external_secrets" {
  name       = "external-secrets"
  repository = "https://charts.external-secrets.io"
  chart      = "external-secrets"
  namespace  = "external-secrets-system"
  
  create_namespace = true
  
  values = [
    yamlencode({
      installCRDs = true
      
      resources = {
        limits = {
          cpu    = "100m"
          memory = "128Mi"
        }
        requests = {
          cpu    = "10m"
          memory = "32Mi"
        }
      }
      
      securityContext = {
        runAsNonRoot = true
        runAsUser    = 65534
        fsGroup      = 65534
      }
      
      webhook = {
        resources = {
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
          requests = {
            cpu    = "10m"
            memory = "32Mi"
          }
        }
      }
      
      certController = {
        resources = {
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
          requests = {
            cpu    = "10m"
            memory = "32Mi"
          }
        }
      }
    })
  ]
}

# Install Cluster Autoscaler
resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  
  values = [
    yamlencode({
      autoDiscovery = {
        clusterName = "livyflow-${var.environment}"
        enabled     = true
      }
      
      awsRegion = "us-east-1"
      
      resources = {
        limits = {
          cpu    = "100m"
          memory = "300Mi"
        }
        requests = {
          cpu    = "100m"
          memory = "300Mi"
        }
      }
      
      extraArgs = {
        "v"                                = 4
        "stderrthreshold"                 = "info"
        "skip-nodes-with-local-storage"   = false
        "expander"                        = "least-waste"
        "node-group-auto-discovery"       = "asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/livyflow-${var.environment}"
        "balance-similar-node-groups"     = true
        "scale-down-enabled"              = true
        "scale-down-delay-after-add"      = "10m"
        "scale-down-unneeded-time"        = "10m"
        "scale-down-utilization-threshold" = "0.5"
        "max-node-provision-time"         = "15m"
        "scan-interval"                   = "10s"
      }
      
      serviceMonitor = {
        enabled = true
        namespace = kubernetes_namespace.monitoring.metadata[0].name
      }
      
      podSecurityPolicy = {
        create = false
      }
      
      rbac = {
        serviceAccount = {
          create = true
          name   = "cluster-autoscaler"
          annotations = {
            "eks.amazonaws.com/role-arn" = "arn:aws:iam::ACCOUNT_ID:role/livyflow-cluster-autoscaler-role"
          }
        }
      }
    })
  ]
}

# Install Metrics Server (if not already installed)
resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server"
  chart      = "metrics-server"
  namespace  = "kube-system"
  
  values = [
    yamlencode({
      args = [
        "--cert-dir=/tmp",
        "--secure-port=4443",
        "--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname",
        "--kubelet-use-node-status-port"
      ]
      
      resources = {
        limits = {
          cpu    = "100m"
          memory = "128Mi"
        }
        requests = {
          cpu    = "50m"
          memory = "64Mi"
        }
      }
      
      securityContext = {
        runAsNonRoot = true
        runAsUser    = 1000
        fsGroup      = 2000
      }
    })
  ]
}

# Install Vertical Pod Autoscaler
resource "helm_release" "vpa" {
  name       = "vpa"
  repository = "https://charts.fairwinds.com/stable"
  chart      = "vpa"
  namespace  = "vpa-system"
  
  create_namespace = true
  
  values = [
    yamlencode({
      recommender = {
        enabled = true
        resources = {
          limits = {
            cpu    = "200m"
            memory = "1000Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "500Mi"
          }
        }
      }
      
      updater = {
        enabled = var.cost_optimization.enable_rightsizing
        resources = {
          limits = {
            cpu    = "200m"
            memory = "1000Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "500Mi"
          }
        }
      }
      
      admissionController = {
        enabled = true
        resources = {
          limits = {
            cpu    = "200m"
            memory = "500Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "200Mi"
          }
        }
      }
    })
  ]
}

# Create priority classes for pod scheduling
resource "kubernetes_priority_class" "critical" {
  metadata {
    name = "livyflow-critical"
  }
  
  value       = 1000
  description = "Critical LivyFlow application components"
  global_default = false
}

resource "kubernetes_priority_class" "high" {
  metadata {
    name = "livyflow-high"
  }
  
  value       = 800
  description = "High priority LivyFlow components"
  global_default = false
}

resource "kubernetes_priority_class" "normal" {
  metadata {
    name = "livyflow-normal"
  }
  
  value       = 500
  description = "Normal priority LivyFlow components"
  global_default = false
}

# Outputs
output "nginx_ingress_ip" {
  description = "NGINX Ingress LoadBalancer IP"
  value       = helm_release.nginx_ingress.status
}

output "prometheus_endpoint" {
  description = "Prometheus endpoint"
  value       = "http://prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9090"
}

output "grafana_endpoint" {
  description = "Grafana endpoint"
  value       = "https://grafana.internal.${var.domain_name}"
}

output "namespaces_created" {
  description = "List of namespaces created"
  value = [
    kubernetes_namespace.livyflow.metadata[0].name,
    kubernetes_namespace.monitoring.metadata[0].name,
    kubernetes_namespace.security.metadata[0].name
  ]
}