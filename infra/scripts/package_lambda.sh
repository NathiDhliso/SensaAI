#!/bin/bash
# Package Lambda function and dependencies for deployment
# 
# Usage: ./package_lambda.sh
#
# Outputs:
#   - infra/terraform/modules/lambda/layer.zip (Python dependencies)
#   - infra/terraform/modules/lambda/lambda_code.zip (Function code)

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAMBDA_DIR="$PROJECT_ROOT/backend/lambda"
TF_LAMBDA_DIR="$PROJECT_ROOT/infra/terraform/modules/lambda"
BUILD_DIR="$PROJECT_ROOT/.build"

echo "=== SensaPBL Lambda Packaging ==="
echo "Lambda source: $LAMBDA_DIR"
echo "Output: $TF_LAMBDA_DIR"

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/layer/python"

# Install dependencies for layer
echo ""
echo "Installing Python dependencies..."
pip install -r "$LAMBDA_DIR/requirements.txt" -t "$BUILD_DIR/layer/python" --quiet

# Create layer zip
echo "Creating layer.zip..."
cd "$BUILD_DIR/layer"
zip -r "$TF_LAMBDA_DIR/layer.zip" python -x "*.pyc" -x "__pycache__/*"

# Report
echo ""
echo "=== Packaging Complete ==="
echo "Layer:  $TF_LAMBDA_DIR/layer.zip ($(du -h "$TF_LAMBDA_DIR/layer.zip" | cut -f1))"
echo ""
echo "Note: Lambda code is zipped automatically by Terraform during apply"
