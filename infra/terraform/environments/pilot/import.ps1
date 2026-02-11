# Terraform Import Script - Import existing AWS resources into state
# Safe defaults:
# - Stops on script-level errors
# - Captures terraform command failures and reports them at the end
# - Returns a non-zero exit code if any import fails

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-TerraformImport {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Address,
        [Parameter(Mandatory = $true)]
        [string]$ResourceId
    )

    $output = & terraform import $Address $ResourceId 2>&1
    $exitCode = $LASTEXITCODE
    $outputText = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine

    if ($exitCode -eq 0) {
        Write-Host "  [OK] $Address" -ForegroundColor Green
        return [pscustomobject]@{
            Status = "Success"
            Output = $outputText
            ExitCode = 0
        }
    }

    if ($outputText -match "Resource already managed by Terraform") {
        Write-Host "  [SKIP] $Address (already managed in state)" -ForegroundColor Yellow
        return [pscustomobject]@{
            Status = "Skipped"
            Output = $outputText
            ExitCode = $exitCode
        }
    }

    Write-Host "  [FAIL] $Address (exit code $exitCode)" -ForegroundColor Red
    if ($outputText) {
        $firstLine = ($outputText -split "(`r`n|`n|`r)")[0]
        Write-Host "         $firstLine" -ForegroundColor DarkRed
    }

    return [pscustomobject]@{
        Status = "Failed"
        Output = $outputText
        ExitCode = $exitCode
    }
}

$scriptDir = Split-Path -Parent $PSCommandPath
Push-Location $scriptDir

try {
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        throw "Terraform CLI is not installed or not available in PATH."
    }

    if (-not (Test-Path ".\main.tf")) {
        throw "main.tf not found in '$scriptDir'. Run this script from infra/terraform/environments/pilot/."
    }

    $importsBySection = @(
        @{
            Name = "Cognito"
            Items = @(
                @{ Address = "module.sensapbl.module.cognito.aws_cognito_user_pool.main"; Id = "us-east-1_nNdVox578" },
                @{ Address = "module.sensapbl.module.cognito.aws_cognito_user_pool_client.main"; Id = "1f2i3813o3f1jdet7j6ifo1eea/us-east-1_nNdVox578" },
                @{ Address = "module.sensapbl.module.cognito.aws_cognito_user_pool_domain.main"; Id = "sensapbl-pilot" },
                @{ Address = "module.sensapbl.module.cognito.aws_cognito_identity_pool.main"; Id = "us-east-1:96adc9f1-c9b8-42b2-9ff6-12af81a1895a" },
                @{ Address = "module.sensapbl.module.cognito.aws_iam_role.authenticated"; Id = "sensapbl-pilot-cognito-authenticated" },
                @{ Address = "module.sensapbl.module.cognito.aws_iam_role.unauthenticated"; Id = "sensapbl-pilot-cognito-unauthenticated" },
                @{ Address = "module.sensapbl.module.cognito.aws_iam_role_policy.authenticated_policy"; Id = "sensapbl-pilot-cognito-authenticated:sensapbl-pilot-authenticated-policy" },
                @{ Address = "module.sensapbl.module.cognito.aws_iam_role_policy.unauthenticated_policy"; Id = "sensapbl-pilot-cognito-unauthenticated:sensapbl-pilot-unauthenticated-policy" },
                @{ Address = "module.sensapbl.module.cognito.aws_cognito_identity_pool_roles_attachment.main"; Id = "us-east-1:96adc9f1-c9b8-42b2-9ff6-12af81a1895a" }
            )
        },
        @{
            Name = "Lambda"
            Items = @(
                @{ Address = "module.sensapbl.module.lambda.aws_iam_role.lambda_execution"; Id = "sensapbl-lambda-pilot" },
                @{ Address = "module.sensapbl.module.lambda.aws_iam_role_policy.lambda_policy"; Id = "sensapbl-lambda-pilot:sensapbl-lambda-policy-pilot" },
                @{ Address = "module.sensapbl.module.lambda.aws_lambda_function.generate_concepts"; Id = "sensapbl-generate-concepts-pilot" },
                @{ Address = "module.sensapbl.module.lambda.aws_lambda_function.query_concepts"; Id = "sensapbl-query-concepts-pilot" },
                @{ Address = "module.sensapbl.module.lambda.aws_lambda_function.gym_ai"; Id = "sensapbl-gym-ai-pilot" },
                @{ Address = "module.sensapbl.module.lambda.aws_lambda_layer_version.python_deps[0]"; Id = "arn:aws:lambda:us-east-1:311964231104:layer:sensapbl-python-deps-pilot:1" },
                @{ Address = "module.sensapbl.module.lambda.aws_cloudwatch_log_group.generate_concepts"; Id = "/aws/lambda/sensapbl-generate-concepts-pilot" },
                @{ Address = "module.sensapbl.module.lambda.aws_cloudwatch_log_group.query_concepts"; Id = "/aws/lambda/sensapbl-query-concepts-pilot" },
                @{ Address = "module.sensapbl.module.lambda.aws_cloudwatch_log_group.gym_ai"; Id = "/aws/lambda/sensapbl-gym-ai-pilot" }
            )
        },
        @{
            Name = "API Gateway"
            Items = @(
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_api.main"; Id = "c4kxjdukwj" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_stage.default"; Id = "c4kxjdukwj/`$default" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_cloudwatch_log_group.api_logs"; Id = "/aws/apigateway/sensapbl-api-pilot" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_integration.generate_concepts"; Id = "c4kxjdukwj/kslpqk3" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_integration.query_concepts"; Id = "c4kxjdukwj/bfihphm" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_integration.gym_ai"; Id = "c4kxjdukwj/oxtu2kn" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.generate_concepts"; Id = "c4kxjdukwj/3an14le" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.query_concepts"; Id = "c4kxjdukwj/7ec59s4" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.query_concepts_by_params"; Id = "c4kxjdukwj/dend9si" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.query_concepts_by_tier"; Id = "c4kxjdukwj/1y4x4bo" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.job_status"; Id = "c4kxjdukwj/8xl3hs6" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.gym_ai"; Id = "c4kxjdukwj/0oytxac" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_lambda_permission.generate_concepts"; Id = "sensapbl-generate-concepts-pilot/sensapbl-api-pilot-generate" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_lambda_permission.query_concepts"; Id = "sensapbl-query-concepts-pilot/sensapbl-api-pilot-query" },
                @{ Address = "module.sensapbl.module.api_gateway.aws_lambda_permission.gym_ai"; Id = "sensapbl-gym-ai-pilot/sensapbl-api-pilot-gym-ai" }
            )
        },
        @{
            Name = "S3"
            Items = @(
                @{ Address = "module.sensapbl.module.s3.aws_s3_bucket.content"; Id = "sensapbl-pilot-content-311964231104" },
                @{ Address = "module.sensapbl.module.s3.aws_s3_bucket_versioning.content"; Id = "sensapbl-pilot-content-311964231104" },
                @{ Address = "module.sensapbl.module.s3.aws_s3_bucket_server_side_encryption_configuration.content"; Id = "sensapbl-pilot-content-311964231104" },
                @{ Address = "module.sensapbl.module.s3.aws_s3_bucket_public_access_block.content"; Id = "sensapbl-pilot-content-311964231104" },
                @{ Address = "module.sensapbl.module.s3.aws_s3_bucket_cors_configuration.content"; Id = "sensapbl-pilot-content-311964231104" }
            )
        }
    )

    $successCount = 0
    $skippedImports = @()
    $failedImports = @()

    foreach ($section in $importsBySection) {
        Write-Host "=== Importing $($section.Name) ===" -ForegroundColor Cyan
        foreach ($item in $section.Items) {
            $result = Invoke-TerraformImport -Address $item.Address -ResourceId $item.Id
            switch ($result.Status) {
                "Success" {
                    $successCount++
                }
                "Skipped" {
                    $skippedImports += [pscustomobject]@{
                        Section = $section.Name
                        Address = $item.Address
                    }
                }
                "Failed" {
                    $failedImports += [pscustomobject]@{
                        Section = $section.Name
                        Address = $item.Address
                        ExitCode = $result.ExitCode
                        Output = $result.Output
                    }
                }
            }
        }
        Write-Host ""
    }

    $totalAttempts = $successCount + $skippedImports.Count + $failedImports.Count
    Write-Host "=== Import Summary ===" -ForegroundColor Cyan
    Write-Host "Total attempted: $totalAttempts"
    Write-Host "Successful: $successCount" -ForegroundColor Green
    Write-Host "Skipped (already in state): $($skippedImports.Count)" -ForegroundColor Yellow
    Write-Host "Failed: $($failedImports.Count)" -ForegroundColor Red

    if ($skippedImports.Count -gt 0) {
        Write-Host "`nSkipped resources:" -ForegroundColor Yellow
        foreach ($skipped in $skippedImports) {
            Write-Host "  - [$($skipped.Section)] $($skipped.Address)" -ForegroundColor Yellow
        }
    }

    if ($failedImports.Count -gt 0) {
        Write-Host "`nFailed resources:" -ForegroundColor Red
        foreach ($failed in $failedImports) {
            Write-Host "  - [$($failed.Section)] $($failed.Address) (exit code $($failed.ExitCode))" -ForegroundColor Red
            if ($failed.Output) {
                $firstLine = ($failed.Output -split "(`r`n|`n|`r)")[0]
                Write-Host "    $firstLine" -ForegroundColor DarkRed
            }
        }
        Write-Host "`nFix failed imports and run this script again." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "`n=== Import Complete ===" -ForegroundColor Green
    Write-Host "Run 'terraform plan' to check for drift" -ForegroundColor Yellow
}
catch {
    Write-Host "`nImport script failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
