"""
Schema Auditor Lambda
Validates schema compliance for learning concepts using Claude Sonnet 4.5
"""

import json
import boto3
import os
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

# Environment variables
AUDITS_TABLE = os.environ.get('CLM_AUDITS_TABLE', 'clm-audits')
MODEL_ID = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

# Schema definition for validation
REQUIRED_FIELDS = {
    'id', 'name', 'stageId', 'order', 'tier', 'lifecyclePhase', 
    'dependencies', 'outdegree'
}

VALID_TIERS = {'trunk', 'branch', 'leaf'}
VALID_LIFECYCLE_PHASES = {'PREPARE', 'MODEL', 'DELIVER'}
VALID_COGNITIVE_LEVELS = {'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'}
VALID_CONNECTION_TYPES = {'requires', 'enables', 'is-part-of', 'is-type-of', 'causes', 'constrains'}

# Deprecated fields (from older schema versions)
DEPRECATED_FIELDS = {'oldField1', 'legacyProperty'}


def validate_concept_schema(concept: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Validate a single concept against the current schema.
    Returns list of issues found.
    """
    issues = []
    
    # Check required fields
    for field in REQUIRED_FIELDS:
        if field not in concept or concept[field] is None:
            issues.append({
                'issueType': 'missing-field',
                'severity': 'high' if field in {'id', 'name', 'tier'} else 'medium',
                'fieldPath': field,
                'currentValue': None,
                'proposedValue': get_default_value(field),
                'reasoning': f'Required field "{field}" is missing from concept schema'
            })
    
    # Check field types and values
    if 'tier' in concept:
        if concept['tier'] not in VALID_TIERS:
            issues.append({
                'issueType': 'invalid-field',
                'severity': 'high',
                'fieldPath': 'tier',
                'currentValue': concept['tier'],
                'proposedValue': 'branch',  # Default suggestion
                'reasoning': f'Invalid tier value "{concept["tier"]}". Must be one of: {VALID_TIERS}'
            })
    
    if 'lifecyclePhase' in concept:
        if concept['lifecyclePhase'] not in VALID_LIFECYCLE_PHASES:
            issues.append({
                'issueType': 'invalid-field',
                'severity': 'high',
                'fieldPath': 'lifecyclePhase',
                'currentValue': concept['lifecyclePhase'],
                'proposedValue': 'MODEL',  # Default suggestion
                'reasoning': f'Invalid lifecyclePhase "{concept["lifecyclePhase"]}". Must be one of: {VALID_LIFECYCLE_PHASES}'
            })
    
    if 'cognitiveLevel' in concept and concept['cognitiveLevel']:
        if concept['cognitiveLevel'] not in VALID_COGNITIVE_LEVELS:
            issues.append({
                'issueType': 'invalid-field',
                'severity': 'medium',
                'fieldPath': 'cognitiveLevel',
                'currentValue': concept['cognitiveLevel'],
                'proposedValue': 'understand',
                'reasoning': f'Invalid cognitiveLevel "{concept["cognitiveLevel"]}". Must be one of: {VALID_COGNITIVE_LEVELS}'
            })
    
    # Check dependencies is a list
    if 'dependencies' in concept:
        if not isinstance(concept['dependencies'], list):
            issues.append({
                'issueType': 'invalid-field',
                'severity': 'high',
                'fieldPath': 'dependencies',
                'currentValue': concept['dependencies'],
                'proposedValue': [],
                'reasoning': 'dependencies must be an array of concept IDs'
            })
    
    # Check connections validity
    if 'connections' in concept and concept['connections']:
        for idx, conn in enumerate(concept['connections']):
            if 'type' in conn and conn['type'] not in VALID_CONNECTION_TYPES:
                issues.append({
                    'issueType': 'invalid-field',
                    'severity': 'medium',
                    'fieldPath': f'connections[{idx}].type',
                    'currentValue': conn['type'],
                    'proposedValue': 'requires',
                    'reasoning': f'Invalid connection type "{conn["type"]}". Must be one of: {VALID_CONNECTION_TYPES}'
                })
            
            if 'target' not in conn or not conn['target']:
                issues.append({
                    'issueType': 'weak-connection',
                    'severity': 'medium',
                    'fieldPath': f'connections[{idx}].target',
                    'currentValue': conn.get('target'),
                    'proposedValue': None,
                    'reasoning': 'Connection missing target concept ID'
                })
    
    # Check for deprecated fields
    for field in DEPRECATED_FIELDS:
        if field in concept:
            issues.append({
                'issueType': 'deprecated-field',
                'severity': 'low',
                'fieldPath': field,
                'currentValue': concept[field],
                'proposedValue': None,
                'reasoning': f'Field "{field}" is deprecated and should be removed'
            })
    
    # Check for enrichment opportunities (new schema fields)
    if 'cognitiveLevel' not in concept or not concept['cognitiveLevel']:
        issues.append({
            'issueType': 'missing-field',
            'severity': 'low',
            'fieldPath': 'cognitiveLevel',
            'currentValue': None,
            'proposedValue': suggest_cognitive_level(concept),
            'reasoning': 'Concept missing cognitiveLevel (Bloom\'s taxonomy) - enrichment opportunity'
        })
    
    if 'commonPitfalls' not in concept or not concept['commonPitfalls']:
        issues.append({
            'issueType': 'missing-field',
            'severity': 'low',
            'fieldPath': 'commonPitfalls',
            'currentValue': None,
            'proposedValue': [],
            'reasoning': 'Concept missing commonPitfalls array - enrichment opportunity'
        })
    
    return issues


def get_default_value(field: str) -> Any:
    """Get default value for a missing field"""
    defaults = {
        'tier': 'branch',
        'lifecyclePhase': 'MODEL',
        'dependencies': [],
        'outdegree': 0,
        'order': 0,
    }
    return defaults.get(field, None)


def suggest_cognitive_level(concept: Dict[str, Any]) -> str:
    """Suggest cognitive level based on concept content"""
    name = concept.get('name', '').lower()
    
    # Simple heuristics
    if any(word in name for word in ['create', 'design', 'build', 'implement']):
        return 'create'
    elif any(word in name for word in ['analyze', 'compare', 'troubleshoot']):
        return 'analyze'
    elif any(word in name for word in ['configure', 'apply', 'use']):
        return 'apply'
    elif any(word in name for word in ['explain', 'describe', 'understand']):
        return 'understand'
    else:
        return 'remember'


def use_ai_for_complex_validation(concept: Dict[str, Any], issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Use Claude Sonnet 4.5 for complex schema validation that requires semantic understanding
    """
    if not issues:
        return issues
    
    # Prepare prompt for AI
    system_prompt = """You are a schema validation expert for educational content. 
Analyze the concept and the detected schema issues. For each issue, provide:
1. Confidence score (0-100) that the issue is real
2. Refined reasoning explaining why it's an issue
3. Better proposed value if applicable

Output valid JSON only."""
    
    user_prompt = f"""Concept:
{json.dumps(concept, indent=2)}

Detected Issues:
{json.dumps(issues, indent=2)}

For each issue, analyze and return JSON array with enhanced issues including confidenceScore (0-100) and refined reasoning."""
    
    try:
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}]
        }
        
        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(payload)
        )
        
        body = json.loads(response['body'].read())
        ai_response = body.get('content', [{}])[0].get('text', '')
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\[[\s\S]*\]', ai_response)
        if json_match:
            enhanced_issues = json.loads(json_match.group(0))
            return enhanced_issues
        
    except Exception as e:
        print(f"AI validation failed: {str(e)}")
        # Fall back to original issues with default confidence
        for issue in issues:
            issue['confidenceScore'] = 85  # Default confidence
    
    return issues


def create_finding_record(
    audit_id: str,
    concept: Dict[str, Any],
    issue: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a DynamoDB finding record"""
    finding_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    # Determine operation type
    operation = 'UPDATE'
    if issue['issueType'] == 'missing-field':
        operation = 'ENRICH' if issue['severity'] == 'low' else 'UPDATE'
    elif issue['issueType'] == 'deprecated-field':
        operation = 'DELETE'
    elif issue['issueType'] == 'weak-connection':
        operation = 'RELINK'
    
    return {
        'pk': f"AUDIT#{audit_id}",
        'sk': f"FINDING#{finding_id}",
        'findingId': finding_id,
        'auditId': audit_id,
        'issueType': issue['issueType'],
        'severity': issue['severity'],
        'conceptId': concept['id'],
        'conceptName': concept['name'],
        'operation': operation,
        'currentValue': issue['currentValue'],
        'proposedValue': issue['proposedValue'],
        'fieldPath': issue.get('fieldPath'),
        'confidenceScore': issue.get('confidenceScore', 85),
        'reasoning': issue['reasoning'],
        'status': 'pending',
        'gsi2pk': 'STATUS#pending',
        'gsi2sk': f"{issue['severity']}#{now}",
        'createdAt': now,
        'updatedAt': now
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for schema auditing
    
    Event structure:
    {
        "auditId": "uuid",
        "subject": "AZ-104",
        "conceptIds": ["concept-1", "concept-2"],
        "schemaVersion": "2.0"
    }
    """
    try:
        audit_id = event['auditId']
        subject = event['subject']
        concept_ids = event['conceptIds']
        schema_version = event.get('schemaVersion', '2.0')
        
        print(f"Starting schema audit {audit_id} for subject {subject}")
        print(f"Auditing {len(concept_ids)} concepts")
        
        # Get concepts from DynamoDB (assuming they're stored in a concepts table)
        # For now, we'll assume concepts are passed in the event or fetched separately
        concepts = event.get('concepts', [])
        
        if not concepts:
            # Fetch concepts from DynamoDB
            # This would need to be implemented based on your concept storage
            print("Warning: No concepts provided in event")
            concepts = []
        
        all_findings = []
        compliant_count = 0
        
        # Validate each concept
        for concept in concepts:
            issues = validate_concept_schema(concept)
            
            if not issues:
                compliant_count += 1
                continue
            
            # Use AI for complex validation
            enhanced_issues = use_ai_for_complex_validation(concept, issues)
            
            # Create finding records
            for issue in enhanced_issues:
                finding = create_finding_record(audit_id, concept, issue)
                all_findings.append(finding)
        
        # Batch write findings to DynamoDB
        table = dynamodb.Table(AUDITS_TABLE)
        
        # DynamoDB batch write supports up to 25 items
        for i in range(0, len(all_findings), 25):
            batch = all_findings[i:i+25]
            with table.batch_writer() as writer:
                for finding in batch:
                    writer.put_item(Item=finding)
        
        # Update audit job with results
        total_concepts = len(concepts)
        issues_found = len(all_findings)
        
        table.update_item(
            Key={'pk': f"AUDIT#{audit_id}", 'sk': 'METADATA'},
            UpdateExpression='SET #status = :status, #findingCount = :count, #updatedAt = :now',
            ExpressionAttributeNames={
                '#status': 'status',
                '#findingCount': 'findingCount',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues={
                ':status': 'completed',
                ':count': issues_found,
                ':now': datetime.utcnow().isoformat()
            }
        )
        
        summary = {
            'totalConcepts': total_concepts,
            'compliantConcepts': compliant_count,
            'issuesFound': issues_found
        }
        
        print(f"Schema audit completed: {summary}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'auditId': audit_id,
                'summary': summary,
                'findingsCreated': len(all_findings)
            })
        }
        
    except Exception as e:
        print(f"Schema audit failed: {str(e)}")
        
        # Update audit status to failed
        if 'audit_id' in locals():
            try:
                table = dynamodb.Table(AUDITS_TABLE)
                table.update_item(
                    Key={'pk': f"AUDIT#{audit_id}", 'sk': 'METADATA'},
                    UpdateExpression='SET #status = :status, #updatedAt = :now',
                    ExpressionAttributeNames={
                        '#status': 'status',
                        '#updatedAt': 'updatedAt'
                    },
                    ExpressionAttributeValues={
                        ':status': 'failed',
                        ':now': datetime.utcnow().isoformat()
                    }
                )
            except:
                pass
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
