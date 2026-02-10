#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Guide for updating AWS resources from SensaAI to SensaAI.

.DESCRIPTION
    This script provides commands and guidance for renaming AWS resources.
    Note: Most AWS resources cannot be renamed directly and require recreation.

.NOTES
    Author: Auto-generated
    Date: February 10, 2026
#>

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         AWS Resources Update Guide: SensaAI → SensaAI        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  IMPORTANT: Most AWS resources cannot be renamed directly!" -ForegroundColor Yellow
Write-Host "   You'll need to create new resources and migrate data." -ForegroundColor Yellow
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 Current Resources (based on codebase scan):" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. S3 Buckets:" -ForegroundColor Yellow
Write-Host "   • SensaAI-pilot-content-311964231104" -ForegroundColor White
Write-Host "   → sensaai-pilot-content-311964231104" -ForegroundColor Green
Write-Host ""

Write-Host "2. DynamoDB Tables:" -ForegroundColor Yellow
Write-Host "   • SensaAI-pilot-results" -ForegroundColor White
Write-Host "   → sensaai-pilot-results" -ForegroundColor Green
Write-Host ""

Write-Host "3. Lambda Functions:" -ForegroundColor Yellow
Write-Host "   • SensaAI-generate-concepts-pilot" -ForegroundColor White
Write-Host "   → sensaai-generate-concepts-pilot" -ForegroundColor Green
Write-Host "   • SensaAI-query-concepts-pilot" -ForegroundColor White
Write-Host "   → sensaai-query-concepts-pilot" -ForegroundColor Green
Write-Host "   • SensaAI-gym-ai-pilot" -ForegroundColor White
Write-Host "   → sensaai-gym-ai-pilot" -ForegroundColor Green
Write-Host ""

Write-Host "4. Elastic Beanstalk:" -ForegroundColor Yellow
Write-Host "   • SensaAI-backend" -ForegroundColor White
Write-Host "   → sensaai-backend" -ForegroundColor Green
Write-Host "   • SensaAI-backend-prod" -ForegroundColor White
Write-Host "   → sensaai-backend-prod" -ForegroundColor Green
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔧 Recommended Migration Steps:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "OPTION 1: Use Terraform (Recommended)" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host "1. Update infra/terraform/variables.tf with new names" -ForegroundColor White
Write-Host "2. Run: cd infra/terraform" -ForegroundColor White
Write-Host "3. Run: terraform plan" -ForegroundColor White
Write-Host "4. Review changes carefully" -ForegroundColor White
Write-Host "5. Run: terraform apply" -ForegroundColor White
Write-Host "6. Migrate data from old resources to new ones" -ForegroundColor White
Write-Host "7. Update .env files with new resource names" -ForegroundColor White
Write-Host "8. Delete old resources after verification" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 2: Manual AWS Console" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host ""

Write-Host "S3 Bucket Migration:" -ForegroundColor Cyan
Write-Host "  1. Create new bucket: sensaai-pilot-content-311964231104" -ForegroundColor White
Write-Host "  2. Copy objects:" -ForegroundColor White
Write-Host "     aws s3 sync s3://SensaAI-pilot-content-311964231104 s3://sensaai-pilot-content-311964231104" -ForegroundColor Gray
Write-Host "  3. Update bucket policies and CORS" -ForegroundColor White
Write-Host "  4. Update .env files" -ForegroundColor White
Write-Host "  5. Test thoroughly" -ForegroundColor White
Write-Host "  6. Delete old bucket" -ForegroundColor White
Write-Host ""

Write-Host "DynamoDB Table Migration:" -ForegroundColor Cyan
Write-Host "  1. Create new table: sensaai-pilot-results" -ForegroundColor White
Write-Host "  2. Export data from old table:" -ForegroundColor White
Write-Host "     aws dynamodb scan --table-name SensaAI-pilot-results > backup.json" -ForegroundColor Gray
Write-Host "  3. Import to new table (use AWS Data Pipeline or custom script)" -ForegroundColor White
Write-Host "  4. Update .env files" -ForegroundColor White
Write-Host "  5. Test thoroughly" -ForegroundColor White
Write-Host "  6. Delete old table" -ForegroundColor White
Write-Host ""

Write-Host "Lambda Functions:" -ForegroundColor Cyan
Write-Host "  1. Update function names in infra/terraform/modules/lambda/main.tf" -ForegroundColor White
Write-Host "  2. Deploy with Terraform or manually create new functions" -ForegroundColor White
Write-Host "  3. Update API Gateway integrations" -ForegroundColor White
Write-Host "  4. Update environment variables" -ForegroundColor White
Write-Host "  5. Test endpoints" -ForegroundColor White
Write-Host "  6. Delete old functions" -ForegroundColor White
Write-Host ""

Write-Host "Elastic Beanstalk:" -ForegroundColor Cyan
Write-Host "  1. Create new application: sensaai-backend" -ForegroundColor White
Write-Host "  2. Create new environment: sensaai-backend-prod" -ForegroundColor White
Write-Host "  3. Deploy application code" -ForegroundColor White
Write-Host "  4. Update DNS/domain settings" -ForegroundColor White
Write-Host "  5. Update .env files with new URL" -ForegroundColor White
Write-Host "  6. Test thoroughly" -ForegroundColor White
Write-Host "  7. Terminate old environment" -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📝 Files to Update After AWS Changes:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "• .env (root)" -ForegroundColor White
Write-Host "• backend/.env" -ForegroundColor White
Write-Host "• infra/SensaAI-storage-policy.json → infra/sensaai-storage-policy.json" -ForegroundColor White
Write-Host "• infra/terraform/variables.tf" -ForegroundColor White
Write-Host "• backend/.elasticbeanstalk/config.yml" -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Checklist:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "[ ] Run RENAME_TO_SENSAAI.ps1 to update codebase" -ForegroundColor White
Write-Host "[ ] Update Terraform configuration" -ForegroundColor White
Write-Host "[ ] Create new AWS resources" -ForegroundColor White
Write-Host "[ ] Migrate data from old to new resources" -ForegroundColor White
Write-Host "[ ] Update all .env files" -ForegroundColor White
Write-Host "[ ] Test application end-to-end" -ForegroundColor White
Write-Host "[ ] Update DNS/domain if applicable" -ForegroundColor White
Write-Host "[ ] Delete old AWS resources" -ForegroundColor White
Write-Host "[ ] Update documentation" -ForegroundColor White
Write-Host "[ ] Commit and push changes" -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💡 Pro Tips:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "• Keep old resources running until new ones are fully tested" -ForegroundColor Yellow
Write-Host "• Use AWS CloudFormation or Terraform for infrastructure as code" -ForegroundColor Yellow
Write-Host "• Take snapshots/backups before making changes" -ForegroundColor Yellow
Write-Host "• Update one service at a time and test" -ForegroundColor Yellow
Write-Host "• Document all changes for team members" -ForegroundColor Yellow
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
