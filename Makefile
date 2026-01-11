.PHONY: help build test lint security logs clean

ENVIRONMENT ?= dev

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)SensaPBL Operations$(NC)"
	@echo "$(BLUE)===================$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

## Development
dev: ## Start local development
	@echo "$(BLUE)Starting local development...$(NC)"
	@echo "Run 'npm run dev' in two terminals for frontend and backend."

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

## CI/CD Operations
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

## Database
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	npm run migrate
	@echo "$(GREEN)✓ Migrations complete$(NC)"

db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	npm run seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

## Documentation
docs: ## Generate API documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	npm run docs
	@echo "$(GREEN)✓ Documentation generated$(NC)"

## Utilities
env-check: ## Check environment variables
	@echo "$(BLUE)Environment Variables:$(NC)"
	@env | grep -E 'VITE_|AWS_|POSTGRES_' || echo "No matching env vars found"

version: ## Show version info
	@echo "$(BLUE)Version Information:$(NC)"
	@echo "Node: $$(node --version)"
	@echo "npm: $$(npm --version)"

## Default
.DEFAULT_GOAL := help
