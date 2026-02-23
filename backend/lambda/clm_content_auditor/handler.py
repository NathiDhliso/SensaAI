"""
Content Auditor Lambda
Validates factual accuracy and content quality using Claude Opus 4.5
"""

import json
import boto3
import os
import re
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# Bedrock client — authenticate to Bedrock account (693582801685)
_bedrock_access_key = os.environ.get('BEDROCK_ACCESS_KEY_ID')
_bedrock_secret_key = os.environ.get('BEDROCK_SECRET_ACCESS_KEY')
if _bedrock_access_key and _bedrock_secret_key:
    bedrock = boto3.client(
        'bedrock-runtime', region_name='us-east-1',
        aws_access_key_id=_bedrock_access_key,
        aws_secret_access_key=_bedrock_secret_key,
    )
else:
    bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

# Environment variables
AUDITS_TABLE = os.environ.get('CLM_AUDITS_TABLE', 'clm-audits')
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-opus-4-6-v1")

# Placeholder patterns
PLACEHOLDER_PATTERNS = [
    r'\[INSERT\]',
    r'\[TODO\]',
    r'\[TBD\]',
    r'\[PLACEHOLDER\]',
    r'TODO:',
    r'FIXME:',
    r'XXX',
    r'<insert.*?>',
    r'example\.com',
    r'foo|bar|baz(?!\w)',  # Common placeholder words
]


def detect_placeholder_content(concept: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Detect template or placeholder content in concept"""
    issues = []
    
    # Fields to check for placeholders
    text_fields = [
        'name', 'hookSentence', 'whyYouNeed', 'technicalDetails',
        'metaphor', 'realWorldExample'
    ]
    
    for field in text_fields:
        if field in concept and concept[field]:
            text = str(concept[field])
            
            for pattern in PLACEHOLDER_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    issues.append({
                        'issueType': 'template-content',
                        'severity': 'high',
                        'fieldPath': field,
                        'currentValue': text[:200],  # Truncate for storage
                        'proposedValue': None,  # AI will suggest
                        'reasoning': f'Placeholder pattern "{pattern}" detected in {field}'
                    })
                    break  # One issue per field
    
    # Check for very short or generic content
    if 'technicalDetails' in concept:
        details = concept['technicalDetails']
        if details and len(details.strip()) < 50:
            issues.append({
                'issueType': 'template-content',
                'severity': 'medium',
                'fieldPath': 'technicalDetails',
                'currentValue': details,
                'proposedValue': None,
                'reasoning': 'Technical details are too brief (< 50 characters)'
            })
    
    return issues


def detect_weak_connections(concept: Dict[str, Any], all_concept_ids: set) -> List[Dict[str, Any]]:
    """Detect broken or weak TRACES connections"""
    issues = []
    
    # Check dependencies reference valid concepts
    if 'dependencies' in concept and concept['dependencies']:
        for dep_id in concept['dependencies']:
            if dep_id not in all_concept_ids:
                issues.append({
                    'issueType': 'weak-connection',
                    'severity': 'high',
                    'fieldPath': 'dependencies',
                    'currentValue': dep_id,
                    'proposedValue': None,  # Needs manual review
                    'reasoning': f'Dependency references non-existent concept: {dep_id}'
                })
    
    # Check connections array
    if 'connections' in concept and concept['connections']:
        for idx, conn in enumerate(concept['connections']):
            target = conn.get('target')
            if target and target not in all_concept_ids:
                issues.append({
                    'issueType': 'weak-connection',
                    'severity': 'high',
                    'fieldPath': f'connections[{idx}]',
                    'currentValue': target,
                    'proposedValue': None,
                    'reasoning': f'Connection references non-existent concept: {target}'
                })
    
    return issues


def use_ai_for_factual_accuracy(
    concept: Dict[str, Any],
    exam_objectives: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Use Claude Opus 4.5 for deep factual accuracy analysis
    """
    issues = []
    
    # Find relevant exam objectives
    relevant_objectives = []
    concept_name = concept.get('name', '').lower()
    
    for obj in exam_objectives:
        obj_keywords = [kw.lower() for kw in obj.get('keywords', [])]
        if any(kw in concept_name for kw in obj_keywords):
            relevant_objectives.append(obj)
    
    if not relevant_objectives:
        # No objectives to validate against
        return issues
    
    # Prepare prompt for AI
    system_prompt = """You are an expert technical content auditor for certification exam preparation materials.
Your job is to verify factual accuracy against official exam objectives and detect:
1. Outdated information (deprecated services, old best practices)
2. Factual errors or contradictions
3. Hallucinations (made-up features, incorrect specifications)
4. Missing critical information required by exam objectives

Be strict but fair. Output valid JSON only."""
    
    objectives_text = "\n".join([
        f"- {obj['code']}: {obj['title']} (Weight: {obj['weight']}%)"
        for obj in relevant_objectives[:5]
    ])
    
    concept_text = f"""Name: {concept.get('name')}
Tier: {concept.get('tier')}
Technical Details: {concept.get('technicalDetails', 'N/A')[:500]}
How To Use: {json.dumps(concept.get('howToUse', [])[:3])}
Common Pitfalls: {json.dumps(concept.get('commonPitfalls', [])[:3])}"""
    
    user_prompt = f"""Exam Objectives:
{objectives_text}

Concept Content:
{concept_text}

Analyze this concept for:
1. Factual accuracy against exam objectives
2. Outdated information
3. Contradictions or errors
4. Missing critical information

Return JSON array of issues:
[
  {{
    "issueType": "outdated-content" | "hallucination" | "validation-error",
    "severity": "low" | "medium" | "high" | "critical",
    "fieldPath": "field name",
    "currentValue": "problematic content",
    "proposedValue": "corrected content or null",
    "reasoning": "detailed explanation",
    "confidenceScore": 0-100
  }}
]

If no issues found, return empty array []."""
    
    try:
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 3000,
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
        json_match = re.search(r'\[[\s\S]*\]', ai_response)
        if json_match:
            ai_issues = json.loads(json_match.group(0))
            issues.extend(ai_issues)
        
    except Exception as e:
        print(f"AI factual accuracy check failed: {str(e)}")
    
    return issues


def calculate_quality_score(concept: Dict[str, Any], issues: List[Dict[str, Any]]) -> float:
    """
    Calculate quality score (0-100) based on concept completeness and issues
    """
    score = 100.0
    
    # Deduct points for issues
    severity_penalties = {
        'critical': 25,
        'high': 15,
        'medium': 8,
        'low': 3
    }
    
    for issue in issues:
        penalty = severity_penalties.get(issue.get('severity', 'low'), 3)
        score -= penalty
    
    # Deduct points for missing optional but important fields
    important_fields = [
        'technicalDetails', 'commonPitfalls', 'howToUse',
        'realWorldExample', 'metaphor'
    ]
    
    for field in important_fields:
        if field not in concept or not concept[field]:
            score -= 5
    
    # Bonus for rich content
    if concept.get('commonPitfalls') and len(concept['commonPitfalls']) >= 3:
        score += 5
    
    if concept.get('howToUse') and len(concept['howToUse']) >= 3:
        score += 5
    
    return max(0.0, min(100.0, score))


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
    if issue['issueType'] == 'weak-connection':
        operation = 'RELINK'
    elif issue['issueType'] == 'template-content' and not issue.get('proposedValue'):
        operation = 'DELETE'
    
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
        'proposedValue': issue.get('proposedValue'),
        'fieldPath': issue.get('fieldPath'),
        'confidenceScore': issue.get('confidenceScore', 90),
        'reasoning': issue['reasoning'],
        'status': 'pending',
        'gsi2pk': 'STATUS#pending',
        'gsi2sk': f"{issue['severity']}#{now}",
        'createdAt': now,
        'updatedAt': now
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for content auditing
    
    Event structure:
    {
        "auditId": "uuid",
        "subject": "AZ-104",
        "conceptIds": ["concept-1", "concept-2"],
        "examObjectives": [...]
    }
    """
    try:
        audit_id = event['auditId']
        subject = event['subject']
        concept_ids = event['conceptIds']
        exam_objectives = event.get('examObjectives', [])
        
        print(f"Starting content audit {audit_id} for subject {subject}")
        print(f"Auditing {len(concept_ids)} concepts against {len(exam_objectives)} objectives")
        
        # Get concepts
        concepts = event.get('concepts', [])
        
        if not concepts:
            print("Warning: No concepts provided in event")
            concepts = []
        
        all_concept_ids = set(c['id'] for c in concepts)
        all_findings = []
        hallucination_count = 0
        outdated_count = 0
        quality_scores = []
        
        # Audit each concept
        for concept in concepts:
            concept_issues = []
            
            # 1. Detect placeholder content
            placeholder_issues = detect_placeholder_content(concept)
            concept_issues.extend(placeholder_issues)
            
            # 2. Detect weak connections
            connection_issues = detect_weak_connections(concept, all_concept_ids)
            concept_issues.extend(connection_issues)
            
            # 3. AI-powered factual accuracy check
            factual_issues = use_ai_for_factual_accuracy(concept, exam_objectives)
            concept_issues.extend(factual_issues)
            
            # Count specific issue types
            for issue in factual_issues:
                if issue['issueType'] == 'hallucination':
                    hallucination_count += 1
                elif issue['issueType'] == 'outdated-content':
                    outdated_count += 1
            
            # 4. Calculate quality score
            quality_score = calculate_quality_score(concept, concept_issues)
            quality_scores.append(quality_score)
            
            # Create finding records
            for issue in concept_issues:
                finding = create_finding_record(audit_id, concept, issue)
                all_findings.append(finding)
        
        # Batch write findings to DynamoDB
        table = dynamodb.Table(AUDITS_TABLE)
        
        for i in range(0, len(all_findings), 25):
            batch = all_findings[i:i+25]
            with table.batch_writer() as writer:
                for finding in batch:
                    writer.put_item(Item=finding)
        
        # Calculate average quality score
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        
        # Update audit job with results
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
                ':count': len(all_findings),
                ':now': datetime.utcnow().isoformat()
            }
        )
        
        summary = {
            'totalConcepts': len(concepts),
            'hallucinationsDetected': hallucination_count,
            'outdatedContent': outdated_count,
            'qualityScore': round(avg_quality, 2)
        }
        
        print(f"Content audit completed: {summary}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'auditId': audit_id,
                'summary': summary,
                'findingsCreated': len(all_findings)
            })
        }
        
    except Exception as e:
        print(f"Content audit failed: {str(e)}")
        
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
