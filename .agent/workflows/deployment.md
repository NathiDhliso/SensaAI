---
description: Critical infrastructure and deployment instructions for SensaPBL
---

# 🚀 Infrastructure & Deployment Guide

> [!IMPORTANT]
> **DO NOT USE AWS SAM.** This project uses **Terraform** for infrastructure and **Bash scripts** for deployment.

## 🏗️ Architecture Overview

- **Local Development**: Uses a local Express server (`backend/src/index.ts`) running on port 3000. It does **NOT** use Lambda locally.
- **Production/Pilot**: Uses AWS Lambda functions (`generate_concepts`, `query_concepts`) provisioned via Terraform.

## 🛠️ How to Deploy

**NEVER** run `sam deploy`. Instead, use the provided deployment script:

```bash
# Deploy to PILOT environment (default)
./infra/scripts/deploy.sh pilot apply

# Deploy to PROD environment
./infra/scripts/deploy.sh prod apply
```

### What the script does:
1.  **Terraform**: Provisions/updates infrastructure (VPC, EKS, RDS, DynamoDB, Lambda).
2.  **Ansible**: Configures Kubernetes resources (if applicable).

## 📂 Key Locations

- **Infrastructure Code**: `infra/terraform/`
- **Lambda Source**: `backend/lambda/` (Python)
- **Local Backend**: `backend/src/` (TypeScript)
- **Deployment Script**: `infra/scripts/deploy.sh`

## 🔄 Syncing Logic

When you make changes to:
1.  **Prompts**:
    *   **Local**: Update `backend/src/lib/system-prompt.ts` (TypeScript).
    *   **Cloud**: Update `backend/lambda/shared/system_prompt.py` (Python) AND redeploy.
2.  **Content Pipeline**:
    *   **Local**: Update `json-content-parser.ts` & `transformer.ts`.
    *   **Cloud**: Update `backend/lambda/generate_concepts/handler.py` AND redeploy.

> [!WARNING]
> If you only update the TypeScript backend, the **Cloud/Lambda** environment will NOT see those changes until you deploy the Python code.
