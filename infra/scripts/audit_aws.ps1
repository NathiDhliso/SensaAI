Write-Output "--- S3 Buckets ---"
aws s3 ls

Write-Output "`n--- DynamoDB Tables ---"
aws dynamodb list-tables

Write-Output "`n--- Cognito User Pools ---"
aws cognito-idp list-user-pools --max-results 10 --query "UserPools[].{Id:Id, Name:Name}"

Write-Output "`n--- Lambda Functions ---"
aws lambda list-functions --query "Functions[].FunctionName"

Write-Output "`n--- IAM Roles ---"
aws iam list-roles --query "Roles[?contains(RoleName, 'SensaAI')].RoleName"

Write-Output "`n--- API Gateways ---"
aws apigatewayv2 get-apis --query "Items[].{Id:ApiId, Name:Name}"

Write-Output "`n--- Terraform Resource Definitions ---"
Get-ChildItem "c:\Users\nathi\OneDrive\Documents\Projects\SensaAI\infra\terraform\modules" -Recurse -Filter "main.tf" | Select-String "resource" | Select-Object Path, LineNumber, Line | Format-List
