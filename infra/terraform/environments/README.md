# Terraform Environments - Secure Credentials Management

## ⚠️ IMPORTANT: Never Commit Credentials to Git!

AWS credentials should NEVER be stored in `.tfvars` files that are committed to Git.

## Secure Methods for Managing Credentials

### Method 1: Environment Variables (Recommended for Local Development)

```bash
# Set environment variables before running terraform
export TF_VAR_cross_account_role_arn="arn:aws:iam::BEDROCK_ACCOUNT_ID:role/YOUR_ROLE"

# Then run terraform
terraform apply -var-file="terraform.tfvars"
```

### Method 2: Separate Secrets File (Local Only)

1. Copy the example file:
   ```bash
   cp secrets.tfvars.example secrets.tfvars
   ```

2. Edit `secrets.tfvars` with your actual credentials

3. Run terraform with both files:
   ```bash
   terraform apply -var-file="terraform.tfvars" -var-file="secrets.tfvars"
   ```

**Note:** `secrets.tfvars` is in `.gitignore` and will never be committed.

### Method 3: AWS SSM Parameter Store (Recommended for Production)

Store credentials in AWS Systems Manager Parameter Store:

```bash
# Store credentials
aws ssm put-parameter \
  --name "/sensapbl/bedrock/access-key-id" \
  --value "your-access-key-id" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/sensapbl/bedrock/secret-access-key" \
  --value "your-secret-access-key" \
  --type "SecureString"
```

Then reference in Terraform:

```hcl
data "aws_ssm_parameter" "bedrock_access_key" {
  name = "/sensapbl/bedrock/access-key-id"
}

data "aws_ssm_parameter" "bedrock_secret_key" {
  name = "/sensapbl/bedrock/secret-access-key"
}
```

### Method 4: AWS Secrets Manager (Best for Production)

```bash
aws secretsmanager create-secret \
  --name sensapbl/bedrock-credentials \
  --secret-string '{"access_key_id":"your-key","secret_access_key":"your-secret"}'
```

## 🔒 Security Best Practices

1. **Rotate credentials regularly** (every 90 days minimum)
2. **Use IAM roles** instead of access keys when possible
3. **Apply least privilege** - only grant necessary permissions
4. **Enable MFA** for AWS accounts
5. **Monitor credential usage** with CloudTrail
6. **Never commit** credentials to version control

## 🚨 If Credentials Are Exposed

If you accidentally commit credentials:

1. **Immediately rotate the credentials** in AWS IAM
2. **Remove from Git history** using `git filter-repo` or BFG Repo Cleaner
3. **Force push** to remote repository
4. **Notify your team** about the incident
5. **Review CloudTrail logs** for unauthorized access

## Environment Files

- `dev/terraform.tfvars` - Development environment configuration
- `pilot/terraform.tfvars` - Pilot environment configuration  
- `prod/terraform.tfvars` - Production environment configuration
- `secrets.tfvars.example` - Template for local secrets file
- `secrets.tfvars` - **NEVER COMMIT** - Your local secrets (gitignored)
