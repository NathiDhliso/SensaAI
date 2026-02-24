# WAF v2 WebACL for API protection
#
# NOTE: AWS WAF cannot be directly associated with HTTP APIs (API Gateway v2).
# This module creates a regional WAF WebACL. To protect the HTTP API:
#   Option A: Place a CloudFront distribution in front of the HTTP API and
#             associate WAF with CloudFront (set scope = "CLOUDFRONT")
#   Option B: Migrate to API Gateway REST API (v1) which supports WAF natively
#
# This module is configured for Option A (CLOUDFRONT scope) by default.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# ==============================================================================
# WAF v2 WEB ACL
# ==============================================================================

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-waf-${var.environment}"
  description = "WAF WebACL for sensaai API protection"
  scope       = var.scope

  default_action {
    allow {}
  }

  # --------------------------------------------------------------------------
  # Rule 1: Rate limiting — 2000 requests per 5 minutes per IP
  # --------------------------------------------------------------------------
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-rate-limit-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Rule 2: AWS Managed Rules — Common Rule Set (XSS, SQLi, etc.)
  # --------------------------------------------------------------------------
  rule {
    name     = "aws-common-rules"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that conflict with API payload patterns
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "GenericRFI_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-common-rules-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Rule 3: AWS Managed Rules — Known Bad Inputs
  # --------------------------------------------------------------------------
  rule {
    name     = "aws-known-bad-inputs"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-bad-inputs-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Rule 4: AWS Managed Rules — IP Reputation List
  # --------------------------------------------------------------------------
  rule {
    name     = "aws-ip-reputation"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-ip-reputation-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf-${var.environment}"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}

# ==============================================================================
# CLOUDWATCH LOGGING (optional)
# ==============================================================================

resource "aws_cloudwatch_log_group" "waf" {
  count = var.enable_logging ? 1 : 0

  # WAF log groups must start with "aws-waf-logs-"
  name              = "aws-waf-logs-${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count = var.enable_logging ? 1 : 0

  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]
  resource_arn            = aws_wafv2_web_acl.main.arn
}
