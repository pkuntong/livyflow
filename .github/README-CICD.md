# CI/CD Documentation for LivyFlow

## Overview
This document outlines the comprehensive CI/CD automation implemented for LivyFlow, a personal finance management application built with React (frontend) and FastAPI (backend).

## Architecture

### Workflow Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Development   │───▶│    Staging       │───▶│   Production    │
│   Environment   │    │   Environment    │    │   Environment   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Pull Request   │    │   Auto Deploy    │    │  Manual/Auto    │
│     Tests       │    │  from develop    │    │ Deploy from main│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Workflows

### 1. Main CI/CD Pipeline (`test.yml`)
**Triggers:** Push to main/develop, Pull Requests
**Purpose:** Comprehensive testing and validation

#### Jobs:
- **Unit & Integration Tests**
  - Caches dependencies (npm, pip, Vite)
  - Runs linting, unit tests, integration tests
  - Generates coverage reports
  - Uploads to Codecov
  - Backend health checks

- **E2E Tests**
  - Matrix testing (Chrome, Firefox)
  - Full application testing
  - Screenshot/video artifacts on failure

- **Security Tests**
  - npm audit
  - Super Linter SAST analysis
  - Dependency vulnerability scanning

- **Performance Tests**
  - Bundle size analysis
  - Lighthouse CI performance testing

- **Accessibility Tests**
  - Axe-core accessibility scanning
  - WCAG compliance verification

### 2. Staging Deployment (`deploy-staging.yml`)
**Triggers:** Push to develop branch, Manual dispatch
**Purpose:** Automated staging deployment

#### Features:
- Pre-deployment validation
- Vercel frontend deployment
- Backend deployment simulation
- Staging-specific environment variables
- Smoke tests against staging environment
- Health checks and rollback capabilities

### 3. Production Deployment (`deploy-production.yml`)
**Triggers:** Push to main, Release published, Manual dispatch
**Purpose:** Production deployment with safety checks

#### Features:
- Multiple deployment strategies (rolling, blue-green, canary)
- Security scanning before deployment
- Production build optimization
- Health checks with retry logic
- Performance baseline testing
- Automatic rollback on failure
- Post-deployment monitoring setup

### 4. Security Scanning (`security.yml`)
**Triggers:** Push to main/develop, Pull Requests, Daily schedule
**Purpose:** Comprehensive security analysis

#### Security Scans:
- **Dependency Security:** npm audit, Safety, Bandit
- **Secret Scanning:** TruffleHog, GitLeaks
- **Static Analysis:** CodeQL, ESLint Security, Semgrep
- **Container Security:** Trivy vulnerability scanning
- **License Compliance:** License compatibility checking
- **Infrastructure Security:** Checkov IaC analysis
- **Security Scorecard:** OSSF scorecard

### 5. Code Quality Analysis (`code-quality.yml`)
**Triggers:** Push to main/develop, Pull Requests, Weekly schedule
**Purpose:** Code quality assessment and technical debt tracking

#### Analysis Types:
- **Static Analysis:** ESLint, Pylint, Flake8, Black, isort
- **Technical Debt:** Code duplication, complexity analysis
- **Performance:** Bundle analysis, Lighthouse CI
- **Accessibility:** Axe-core testing
- **Quality Gates:** Coverage, duplication, accessibility thresholds

### 6. Release Management (`release.yml`)
**Triggers:** Manual dispatch
**Purpose:** Automated versioning and release creation

#### Features:
- Semantic versioning (major, minor, patch, prerelease)
- Automated changelog generation
- Release artifact creation
- GitHub release publishing
- Production deployment triggering
- Team notifications

### 7. Pull Request Tests (`pr-tests.yml`)
**Triggers:** Pull Requests
**Purpose:** Fast feedback for PRs

#### Optimizations:
- Change detection (frontend/backend/tests)
- Quick tests for changed files only
- Component testing
- Visual regression testing
- Code quality checks
- Coverage reporting with PR comments

### 8. Notifications (`notifications.yml`)
**Triggers:** Workflow completion
**Purpose:** Team communication and monitoring

#### Features:
- Build status notifications
- Critical failure alerts
- Weekly build summaries
- Deployment health checks
- GitHub Issues creation for critical failures
- Commit status updates

## Configuration Files

### Dependencies
- **Dependabot** (`.github/dependabot.yml`): Automated dependency updates
- **Audit CI** (`.audit-ci.json`): Security audit configuration

### Code Quality
- **SonarCloud** (`sonar-project.properties`): Code quality and security analysis
- **ESLint**: JavaScript/React linting
- **Pylint/Flake8**: Python code analysis

### Testing
- **Vitest**: Unit testing framework
- **Cypress**: E2E testing
- **Jest DOM**: DOM testing utilities

## Environment Variables

### Required Secrets
```bash
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID_STAGING
VERCEL_PROJECT_ID_PRODUCTION

# Firebase (Staging)
STAGING_FIREBASE_API_KEY
STAGING_FIREBASE_AUTH_DOMAIN
STAGING_FIREBASE_PROJECT_ID

# Firebase (Production)
PRODUCTION_FIREBASE_API_KEY
PRODUCTION_FIREBASE_AUTH_DOMAIN
PRODUCTION_FIREBASE_PROJECT_ID

# URLs
STAGING_DOMAIN
STAGING_API_URL
PRODUCTION_DOMAIN
PRODUCTION_API_URL

# External Services
CODECOV_TOKEN
CYPRESS_RECORD_KEY
SONAR_TOKEN
SEMGREP_APP_TOKEN
PAT_TOKEN # For release management
```

### Environment-Specific Variables
- **Development**: Local development with hot reload
- **Staging**: Testing environment with staging APIs
- **Production**: Optimized builds with production APIs

## Quality Gates

### Coverage Requirements
- **Minimum Coverage:** 80%
- **Coverage Types:** Lines, Branches, Functions, Statements

### Security Requirements
- **Vulnerability Levels:** Critical and High vulnerabilities block deployment
- **Secret Scanning:** No secrets in code
- **License Compliance:** Only approved licenses

### Performance Requirements
- **Bundle Size:** < 500KB warning threshold
- **Lighthouse Score:** Minimum 80 performance score
- **Accessibility:** Maximum 5 violations allowed

### Code Quality Requirements
- **Code Duplication:** < 15% threshold
- **Complexity:** Functions with complexity > 10 flagged
- **Linting:** Zero linting errors

## Deployment Strategies

### Rolling Deployment (Default)
- Gradual replacement of instances
- Zero downtime
- Easy rollback

### Blue-Green Deployment
- Complete environment swap
- Instant rollback capability
- Higher resource usage

### Canary Deployment
- Gradual traffic shift
- Risk mitigation
- Performance monitoring

## Monitoring and Alerting

### Health Checks
- **Frontend:** HTTP status and content verification
- **Backend:** API health endpoint monitoring
- **Database:** Connection and query testing

### Notifications
- **Critical Failures:** Immediate GitHub Issues + team notification
- **Deployments:** Status updates with links
- **Weekly Reports:** Build statistics and trends

### Metrics Collection
- **Build Success Rate:** Weekly trending
- **Deployment Frequency:** Continuous monitoring  
- **Lead Time:** From commit to production
- **Mean Time to Recovery:** Failure resolution time

## Best Practices

### Branch Strategy
- **main:** Production-ready code
- **develop:** Integration branch for features
- **feature/*:** Individual feature development

### Commit Messages
- Use conventional commits for changelog generation
- Include scope and breaking change indicators
- Reference issues when applicable

### Security
- Regular dependency updates via Dependabot
- Security scanning on every commit
- Secret management through GitHub Secrets

### Testing Strategy
- Unit tests for business logic
- Integration tests for API interactions
- E2E tests for critical user journeys
- Performance tests for optimization

## Troubleshooting

### Common Issues
1. **Build Failures:** Check dependency conflicts and environment variables
2. **Test Failures:** Review test logs and update snapshots if needed
3. **Deployment Issues:** Verify secrets and environment configurations
4. **Security Violations:** Review and update vulnerable dependencies

### Debugging Steps
1. Check workflow logs in GitHub Actions
2. Review artifact uploads for detailed reports
3. Use manual workflow dispatch for testing
4. Verify environment variable configuration

## Maintenance

### Regular Tasks
- **Weekly:** Review dependency updates from Dependabot
- **Monthly:** Update GitHub Actions to latest versions
- **Quarterly:** Review and update quality gates thresholds

### Monitoring
- Track build performance and optimization opportunities
- Monitor security alerts and vulnerabilities
- Review deployment success rates and failure patterns

---

*This CI/CD pipeline ensures reliable, secure, and efficient delivery of the LivyFlow application with comprehensive testing, security scanning, and deployment automation.*