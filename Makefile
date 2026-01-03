.PHONY: help build test lint security deploy logs clean

ENVIRONMENT ?= dev
IMAGE_TAG ?= latest
REGISTRY ?= 311964231104.dkr.ecr.us-east-1.amazonaws.com
FRONTEND_IMAGE = sensapbl-pilot-frontend
BACKEND_IMAGE = sensapbl-pilot-backend
K8S_NAMESPACE = sensapbl

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)SensaPBL CI/CD Operations$(NC)"
	@echo "$(BLUE)=========================$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

## Development
dev: ## Start local development with docker-compose
	@echo "$(BLUE)Starting local development environment...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo "  Frontend: http://localhost"
	@echo "  Backend: http://localhost:3000"
	@echo "  Adminer: http://localhost:8080"

dev-logs: ## Stream logs from all services
	docker-compose logs -f

dev-stop: ## Stop local development environment
	@echo "$(BLUE)Stopping local development...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

dev-clean: ## Remove volumes and restart
	@echo "$(BLUE)Cleaning development environment...$(NC)"
	docker-compose down -v
	docker-compose up -d
	@echo "$(GREEN)✓ Environment reset$(NC)"

## Code Quality & Testing
lint: ## Run ESLint
	@echo "$(BLUE)Running ESLint...$(NC)"
	npm run lint

format: ## Format code with prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript compiler...$(NC)"
	npx tsc --noEmit

test: ## Run test suite
	@echo "$(BLUE)Running tests...$(NC)"
	npm run test -- --run

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test -- --run --coverage

security: ## Run security scanning
	@echo "$(BLUE)Running security scans...$(NC)"
	npm audit --audit-level=moderate || true
	@echo "$(BLUE)Running Snyk scan...$(NC)"
	npx snyk test --severity-threshold=high || true

## Build & Docker
build-frontend: ## Build frontend Docker image
	@echo "$(BLUE)Building frontend Docker image...$(NC)"
	docker build -t $(REGISTRY)/$(FRONTEND_IMAGE):$(IMAGE_TAG) .
	@echo "$(GREEN)✓ Frontend image built: $(REGISTRY)/$(FRONTEND_IMAGE):$(IMAGE_TAG)$(NC)"

build-backend: ## Build backend Docker image
	@echo "$(BLUE)Building backend Docker image...$(NC)"
	docker build -t $(REGISTRY)/$(BACKEND_IMAGE):$(IMAGE_TAG) -f backend/Dockerfile backend/
	@echo "$(GREEN)✓ Backend image built: $(REGISTRY)/$(BACKEND_IMAGE):$(IMAGE_TAG)$(NC)"

build: build-frontend build-backend ## Build both frontend and backend images

scan-images: ## Scan Docker images for vulnerabilities
	@echo "$(BLUE)Scanning frontend image...$(NC)"
	trivy image --severity HIGH,CRITICAL $(REGISTRY)/$(FRONTEND_IMAGE):$(IMAGE_TAG)
	@echo "$(BLUE)Scanning backend image...$(NC)"
	trivy image --severity HIGH,CRITICAL $(REGISTRY)/$(BACKEND_IMAGE):$(IMAGE_TAG)

## Docker Registry
push-frontend: ## Push frontend image to ECR
	@echo "$(BLUE)Pushing frontend image...$(NC)"
	aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(REGISTRY)
	docker push $(REGISTRY)/$(FRONTEND_IMAGE):$(IMAGE_TAG)
	@echo "$(GREEN)✓ Frontend image pushed$(NC)"

push-backend: ## Push backend image to ECR
	@echo "$(BLUE)Pushing backend image...$(NC)"
	aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(REGISTRY)
	docker push $(REGISTRY)/$(BACKEND_IMAGE):$(IMAGE_TAG)
	@echo "$(GREEN)✓ Backend image pushed$(NC)"

push: push-frontend push-backend ## Push both images to ECR

## Kubernetes Deployment
deploy-dev: ## Deploy to dev environment
	@echo "$(BLUE)Deploying to dev...$(NC)"
	ENVIRONMENT=dev IMAGE_TAG=$(IMAGE_TAG) sh -c 'envsubst < k8s/deployment.yaml | kubectl apply -f -'
	kubectl rollout status deployment/sensapbl-frontend -n $(K8S_NAMESPACE) --timeout=5m
	@echo "$(GREEN)✓ Dev deployment complete$(NC)"

deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(NC)"
	ENVIRONMENT=staging IMAGE_TAG=$(IMAGE_TAG) sh -c 'envsubst < k8s/deployment.yaml | kubectl apply -f -'
	kubectl rollout status deployment/sensapbl-frontend -n $(K8S_NAMESPACE) --timeout=5m
	@echo "$(GREEN)✓ Staging deployment complete$(NC)"

deploy-production: ## Deploy to production environment (requires confirmation)
	@echo "$(RED)WARNING: Deploying to PRODUCTION$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)Deploying to production...$(NC)"; \
		ENVIRONMENT=production IMAGE_TAG=$(IMAGE_TAG) sh -c 'envsubst < k8s/deployment.yaml | kubectl apply -f -'; \
		kubectl rollout status deployment/sensapbl-frontend -n $(K8S_NAMESPACE) --timeout=5m; \
		echo "$(GREEN)✓ Production deployment complete$(NC)"; \
	else \
		echo "$(RED)✗ Deployment cancelled$(NC)"; \
	fi

rollback: ## Rollback to previous deployment
	@echo "$(RED)Rolling back deployments...$(NC)"
	kubectl rollout undo deployment/sensapbl-frontend -n $(K8S_NAMESPACE)
	kubectl rollout undo deployment/sensapbl-backend -n $(K8S_NAMESPACE)
	@echo "$(GREEN)✓ Rollback complete$(NC)"

## Kubernetes Monitoring
logs-frontend: ## Stream frontend pod logs
	kubectl logs -f -l app=sensapbl-frontend -n $(K8S_NAMESPACE) --tail=100

logs-backend: ## Stream backend pod logs
	kubectl logs -f -l app=sensapbl-backend -n $(K8S_NAMESPACE) --tail=100

status: ## Check deployment status
	@echo "$(BLUE)Frontend Deployment Status:$(NC)"
	kubectl rollout status deployment/sensapbl-frontend -n $(K8S_NAMESPACE)
	@echo "$(BLUE)Backend Deployment Status:$(NC)"
	kubectl rollout status deployment/sensapbl-backend -n $(K8S_NAMESPACE)
	@echo ""
	@echo "$(BLUE)Pod Status:$(NC)"
	kubectl get pods -n $(K8S_NAMESPACE) -o wide

describe-pods: ## Show detailed pod information
	kubectl describe pods -n $(K8S_NAMESPACE)

events: ## Show recent Kubernetes events
	kubectl get events -n $(K8S_NAMESPACE) --sort-by='.lastTimestamp'

## CI/CD Operations
validate-pipeline: ## Validate Jenkins pipeline syntax
	@echo "$(BLUE)Validating Jenkinsfile...$(NC)"
	groovy -c Jenkinsfile
	@echo "$(GREEN)✓ Jenkinsfile is valid$(NC)"

validate-k8s: ## Validate Kubernetes manifests
	@echo "$(BLUE)Validating Kubernetes manifests...$(NC)"
	kubectl apply -f k8s/ --dry-run=client
	@echo "$(GREEN)✓ Kubernetes manifests are valid$(NC)"

validate-github-workflow: ## Validate GitHub Actions workflow
	@echo "$(BLUE)Validating GitHub Actions workflow...$(NC)"
	@if command -v actionlint &> /dev/null; then \
		actionlint .github/workflows/*.yml; \
	else \
		echo "$(RED)actionlint not installed. Install with: brew install actionlint$(NC)"; \
	fi

## Full CI/CD Workflow
ci: lint type-check test security ## Run all CI checks
	@echo "$(GREEN)✓ All CI checks passed$(NC)"

ci-build: ci build scan-images ## Run CI and build images
	@echo "$(GREEN)✓ CI and build complete$(NC)"

cd: ci-build push deploy-staging ## Run full CI/CD to staging
	@echo "$(GREEN)✓ Full CI/CD pipeline complete$(NC)"

## Cleanup
clean-docker: ## Remove all SensaPBL Docker images
	@echo "$(BLUE)Cleaning Docker images...$(NC)"
	docker rmi -f $$(docker images | grep sensapbl | awk '{print $$3}') || true
	@echo "$(GREEN)✓ Docker images cleaned$(NC)"

clean-volumes: ## Remove Docker volumes
	@echo "$(BLUE)Cleaning Docker volumes...$(NC)"
	docker volume rm $$(docker volume ls | grep sensapbl | awk '{print $$2}') || true
	@echo "$(GREEN)✓ Volumes cleaned$(NC)"

clean: clean-docker dev-clean ## Clean Docker and restart dev environment
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

## Database
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	npm run migrate
	@echo "$(GREEN)✓ Migrations complete$(NC)"

db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	npm run seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "$(RED)WARNING: This will delete all database data$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose up -d; \
		sleep 5; \
		$(MAKE) db-migrate; \
		$(MAKE) db-seed; \
		echo "$(GREEN)✓ Database reset complete$(NC)"; \
	fi

## Documentation
docs: ## Generate API documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	npm run docs
	@echo "$(GREEN)✓ Documentation generated$(NC)"

## Utilities
shell-frontend: ## Open shell in running frontend container
	docker-compose exec frontend sh

shell-backend: ## Open shell in running backend container
	docker-compose exec backend sh

shell-postgres: ## Open psql in running postgres container
	docker-compose exec postgres psql -U sensapbl -d sensapbl

env-check: ## Check environment variables
	@echo "$(BLUE)Environment Variables:$(NC)"
	@env | grep -E 'VITE_|AWS_|POSTGRES_' || echo "No matching env vars found"

version: ## Show version info
	@echo "$(BLUE)Version Information:$(NC)"
	@echo "Node: $$(node --version)"
	@echo "npm: $$(npm --version)"
	@echo "Docker: $$(docker --version)"
	@echo "kubectl: $$(kubectl version --short 2>/dev/null || echo 'not installed')"

## Default
.DEFAULT_GOAL := help
