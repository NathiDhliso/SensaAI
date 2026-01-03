#!/bin/bash
# SensaPBL Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Example: ./deploy.sh pilot apply

set -e

ENV="${1:-pilot}"
ACTION="${2:-apply}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"
ANSIBLE_DIR="$SCRIPT_DIR/../ansible"

echo "🚀 SensaPBL Deployment - Environment: $ENV"
echo "============================================"

# Step 1: Terraform
echo ""
echo "📦 Step 1: Running Terraform $ACTION..."
cd "$TERRAFORM_DIR"
terraform init

if [ "$ACTION" == "apply" ]; then
    terraform plan -out=tfplan
    terraform apply tfplan
elif [ "$ACTION" == "destroy" ]; then
    terraform destroy -auto-approve
else
    echo "Unknown action: $ACTION"
    exit 1
fi

# Step 2: Ansible (only on apply)
if [ "$ACTION" == "apply" ]; then
    echo ""
    echo "🔧 Step 2: Running Ansible playbooks..."
    cd "$ANSIBLE_DIR"
    
    # Install Ansible Galaxy collections if needed
    ansible-galaxy collection install kubernetes.core -f
    
    # Run the playbook
    ansible-playbook playbooks/site.yml -e "env=$ENV"
fi

echo ""
echo "✅ Deployment complete!"
echo ""

# Show outputs
if [ "$ACTION" == "apply" ]; then
    cd "$TERRAFORM_DIR"
    echo "📋 Terraform Outputs:"
    terraform output
fi
