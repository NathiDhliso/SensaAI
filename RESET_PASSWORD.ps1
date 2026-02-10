# Reset Cognito Password
Write-Host "=== Reset Cognito Password ===" -ForegroundColor Cyan
Write-Host ""

$email = "nkosinathi.dhliso@gmail.com"
$userPoolId = "us-east-1_nNdVox578"

Write-Host "Resetting password for: $email" -ForegroundColor Yellow
Write-Host ""

# Prompt for new password
$password = Read-Host "Enter new password (min 8 chars, uppercase, lowercase, number, special char)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Setting password..." -ForegroundColor Yellow

try {
    aws cognito-idp admin-set-user-password `
        --user-pool-id $userPoolId `
        --username $email `
        --password $passwordPlain `
        --permanent `
        --region us-east-1
    
    Write-Host ""
    Write-Host "✅ Password reset successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now log in with:" -ForegroundColor White
    Write-Host "  Email: $email" -ForegroundColor Gray
    Write-Host "  Password: (the one you just set)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Try logging in at:" -ForegroundColor White
    Write-Host "  https://main.dckqci84h8ffk.amplifyapp.com/login" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ Failed to reset password" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manually in AWS Console:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://console.aws.amazon.com/cognito/" -ForegroundColor Gray
    Write-Host "  2. Select User Pool: $userPoolId" -ForegroundColor Gray
    Write-Host "  3. Find user: $email" -ForegroundColor Gray
    Write-Host "  4. Actions → Reset password" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
