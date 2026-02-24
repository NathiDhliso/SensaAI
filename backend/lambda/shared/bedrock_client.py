"""
Bedrock Client Factory — SINGLE SOURCE OF TRUTH for all Bedrock/AI access.

GUARDRAIL: All AI/LLM calls MUST go through this module.

Architecture: Single-account (693582801685). Lambda execution role has
bedrock:InvokeModel / bedrock:InvokeModelWithResponseStream on Resource=*.
No cross-account credentials needed.
"""
import boto3
from botocore.config import Config


def get_bedrock_client(
    *,
    region: str = "us-east-1",
    service: str = "bedrock-runtime",
    read_timeout: int = 900,
    max_retries: int = 3,
):
    """
    Create a boto3 Bedrock client using the Lambda execution role.

    Returns:
        boto3 bedrock-runtime client
    """
    print("[BedrockClient] Using Lambda IAM role credentials (account 693582801685)")

    return boto3.client(
        service,
        region_name=region,
        config=Config(
            retries={"max_attempts": max_retries, "mode": "adaptive"},
            read_timeout=read_timeout,
        ),
    )
