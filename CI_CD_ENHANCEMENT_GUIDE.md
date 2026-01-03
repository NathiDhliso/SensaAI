# CI/CD Pipeline Enhancement Guide

## Overview

This document outlines the enhanced CI/CD pipeline for SensaPBL, including both Jenkins and GitHub Actions implementations, with comprehensive security scanning, multi-environment deployment, and production-ready practices.

## Key Enhancements

### 1. **Parallel Builds**
- Frontend and backend compile simultaneously to reduce total build time
- Independent Docker image builds for each service
- Cache optimization with Docker BuildKit

### 2. **Security Scanning**
- **SAST (Static Application Security Testing)**
  - npm audit for dependency vulnerabilities
  - Snyk integration for continuous monitoring
  - TypeScript type checking for type safety

- **Container Security**
  - Trivy image scanning for CVEs
  - Checks for HIGH and CRITICAL severity issues
  - SARIF upload for GitHub Security dashboard

### 3. **Code Quality Checks**
- ESLint for code consistency
- TypeScript compiler for type safety
- Test coverage reporting with Codecov
- Pre-deployment linting

### 4. **Environment Management**
- **Three Environments:**
  - `dev` - Development environment for feature branches
  - `staging` - Pre-production testing environment
  - `production` - Live production environment

- **Dynamic Secret Management:**
  - AWS Secrets Manager integration
  - Environment-specific configurations
  - Automatic secret rotation support

### 5. **Artifact Versioning**
- Build versioning: `{BUILD_NUMBER}-{GIT_SHORT_SHA}`
- Multiple image tags (version + latest)
- Build artifacts archive for rollback capability

### 6. **Health Checks & Smoke Tests**
- Kubernetes rollout status verification
- Health endpoint testing post-deployment
- Service availability validation

## Pipeline Stages

### Jenkins Pipeline (Jenkinsfile)

```
├── Checkout
├── Setup & Lint
│   ├── npm ci
│   ├── ESLint
│   └── TypeScript Compiler
├── Test
│   └── Jest with Coverage
├── SAST Security Scan
│   ├── npm audit
│   └── Snyk analysis
├── Build & Push Images (Parallel)
│   ├── Frontend Build
│   │   └── Docker build → ECR push
│   └── Backend Build
│       └── Docker build → ECR push
├── Container Security Scan
│   └── Trivy image scan
├── Deploy to Kubernetes
│   ├── Update manifests
│   ├── Apply configs
│   └── Wait for rollout
├── Smoke Tests
└── Archive Artifacts
```

### GitHub Actions Workflow

```
Setup
├── Lint (Node.js setup, ESLint, TypeScript)
├── Test (Jest, Coverage)
├── Security Scan (npm audit, Snyk)
├── Build & Push (Parallel for frontend/backend)
│   ├── AWS credentials
│   ├── Fetch secrets
│   ├── Docker build & push
│   └── Trivy scan
├── Deploy (EKS → Kubernetes)
│   ├── Update kubeconfig
│   ├── Apply manifests
│   ├── Wait for rollout
│   └── Smoke tests
└── Notify (Slack, GitHub Deployment)
```

## Configuration Requirements

### AWS Setup

1. **ECR Repositories**
```bash
aws ecr create-repository --repository-name sensapbl-pilot-frontend
aws ecr create-repository --repository-name sensapbl-pilot-backend
```

2. **Secrets Manager**
```bash
# Dev environment
aws secretsmanager create-secret \
  --name sensapbl/dev/config \
  --secret-string '{
    "VITE_COGNITO_IDENTITY_POOL_ID": "...",
    "VITE_COGNITO_USER_POOL_ID": "...",
    "VITE_AWS_S3_BUCKET_NAME": "...",
    "VITE_AWS_DYNAMODB_TABLE_NAME": "...",
    "VITE_API_URL": "http://localhost:3000/api"
  }'

# Staging/Production
aws secretsmanager create-secret \
  --name sensapbl/staging/config \
  --secret-string '{...}'

aws secretsmanager create-secret \
  --name sensapbl/production/config \
  --secret-string '{...}'
```

3. **IAM Role for GitHub Actions**
```bash
# Create OIDC provider
aws iam create-openid-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com

# Create role with ECR and Secrets Manager permissions
```

### Jenkins Setup

1. **Plugins Required**
   - Pipeline
   - Docker
   - AWS Credentials
   - Blue Ocean (optional, for UI)

2. **Credentials Configuration**
   - AWS ECR credentials
   - Kubernetes config for deployment
   - Optional: Slack/email for notifications

3. **Agent Requirements**
   - Docker daemon installed
   - kubectl configured
   - jq for JSON parsing
   - AWS CLI v2

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Clean up volumes
docker-compose down -v
```

### Environment Variables

Create `.env` file:
```env
VITE_COGNITO_IDENTITY_POOL_ID=<your-pool-id>
VITE_COGNITO_USER_POOL_ID=<your-pool-id>
VITE_AWS_S3_BUCKET_NAME=<your-bucket>
VITE_AWS_DYNAMODB_TABLE_NAME=<your-table>

POSTGRES_USER=sensapbl
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=sensapbl

JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://sensapbl:secure_password@postgres:5432/sensapbl
REDIS_URL=redis://redis:6379
```

## Deployment Strategies

### Automatic Deployments
- **Main branch** → Production (automatic on merge)
- **Develop branch** → Staging (automatic on push)
- **Feature branches** → Dev (manual trigger available)

### Manual Trigger
```bash
# GitHub Actions
gh workflow run ci-cd.yml -f environment=staging
```

### Rollback
```bash
# Kubernetes rollback
kubectl rollout undo deployment/sensapbl-frontend -n sensapbl
kubectl rollout undo deployment/sensapbl-backend -n sensapbl

# Verify rollback
kubectl rollout status deployment/sensapbl-frontend -n sensapbl
```

## Monitoring & Alerts

### Real-time Logs
```bash
# Follow deployment logs
kubectl logs -f deployment/sensapbl-backend -n sensapbl

# Check pod status
kubectl get pods -n sensapbl -o wide

# Describe pod for events
kubectl describe pod <pod-name> -n sensapbl
```

### Slack Notifications
- ✓ Successful deployments
- ✗ Failed deployments
- ⚠️ Test failures
- 🔒 Security warnings

## Best Practices

### Code Quality
✅ Always run linting and tests locally before pushing
✅ Use conventional commits for versioning
✅ Review security scan results before merging
✅ Keep dependencies updated

### Deployment
✅ Test in staging before production deployments
✅ Review manifest changes before applying
✅ Monitor metrics post-deployment
✅ Keep rollback procedures documented

### Security
✅ Never commit secrets (use Secrets Manager)
✅ Regularly update Docker base images
✅ Scan for vulnerabilities in CI/CD
✅ Use AWS IAM roles instead of access keys
✅ Enable audit logging for all changes

## Troubleshooting

### Build Failures
1. Check logs in Jenkins/GitHub Actions
2. Verify Docker build arguments
3. Ensure all required secrets are configured
4. Check npm/node version compatibility

### Deployment Failures
1. Verify Kubernetes cluster connectivity
2. Check resource availability (CPU/memory)
3. Review manifest syntax
4. Check image availability in ECR

### Health Check Failures
1. Verify service endpoints are accessible
2. Check service logs for errors
3. Verify network policies allow traffic
4. Check resource constraints

## Future Enhancements

- [ ] Implement Blue-Green deployments
- [ ] Add canary releases (5% → 25% → 100%)
- [ ] Implement GitOps with ArgoCD
- [ ] Add performance benchmarking
- [ ] Implement chaos engineering tests
- [ ] Add multi-region deployments
- [ ] Implement cost optimization monitoring
- [ ] Add advanced monitoring (Prometheus/Grafana)

## References

- [Jenkinsfile Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECR Best Practices](https://docs.aws.amazon.com/AmazonECR/latest/userguide/best-practices.html)
- [Kubernetes Deployment Guide](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
