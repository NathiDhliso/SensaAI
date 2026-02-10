# Add Missing API Gateway Routes
# This script adds the /concepts/jobs route that the frontend needs

Write-Host "=== Adding Missing API Gateway Routes ===" -ForegroundColor Cyan
Write-Host ""

$API_ID = "c4kxjdukwj"
$REGION = "us-east-1"
$INTEGRATION_ID = "bfihphm"  # Same integration as other concepts routes

Write-Host "Adding GET /concepts/jobs route..." -ForegroundColor Yellow

try {
    $result = aws apigatewayv2 create-route `
        --api-id $API_ID `
        --region $REGION `
        --route-key "GET /concepts/jobs" `
        --target "integrations/$INTEGRATION_ID" `
        --authorization-type NONE `
        2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Route created successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create route" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verifying routes..." -ForegroundColor Yellow
aws apigatewayv2 get-routes --api-id $API_ID --region $REGION --query "Items[?contains(RouteKey, 'concepts')].RouteKey" --output table

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
