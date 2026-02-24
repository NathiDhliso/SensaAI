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

from shared.bedrock_client import get_bedrock_client

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# GUARDRAIL: All AI calls must go through the approved Bedrock account (693582801685)
bedrock = get_bedrock_client()

# Environment variables
AUDITS_TABLE = os.environ.get('CLM_AUDITS_TABLE', 'clm-audits')
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")

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
    Use Claude Opus 4.5 for deep factual accuracy analysis.
    Delegates to the batched implementation for a single concept.
    """
    results = use_ai_for_factual_accuracy_batch([concept], exam_objectives)
    return results.get(concept.get('name', ''), [])


# Batch size for AI factual accuracy checks — reduces Bedrock calls by ~5x
AI_BATCH_SIZE = 5


def use_ai_for_factual_accuracy_batch(
    concepts: List[Dict[str, Any]],
    exam_objectives: List[Dict[str, Any]]
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Batch-process multiple concepts in a single Bedrock call for factual accuracy.
    Returns: {concept_name: [issues]}
    """
    issues_by_concept: Dict[str, List[Dict[str, Any]]] = {
        c.get('name', ''): [] for c in concepts
    }

    if not concepts:
        return issues_by_concept

    # Build combined concept text
    concept_blocks = []
    for idx, concept in enumerate(concepts):
        concept_name = concept.get('name', f'Concept {idx}')

        # Find relevant exam objectives for this concept
        relevant_objectives = []
        name_lower = concept_name.lower()
        for obj in exam_objectives:
            obj_keywords = [kw.lower() for kw in obj.get('keywords', [])]
            if any(kw in name_lower for kw in obj_keywords):
                relevant_objectives.append(obj)

        objectives_text = "\n".join([
            f"  - {obj.get('code', '')}: {obj.get('title', '')} (Weight: {obj.get('weight', '')}%)"
            for obj in relevant_objectives[:3]
        ]) if relevant_objectives else "  (no directly matching objectives)"

        concept_blocks.append(
            f"### CONCEPT {idx + 1}: {concept_name}\n"
            f"Tier: {concept.get('tier', 'N/A')}\n"
            f"Technical Details: {str(concept.get('technicalDetails', 'N/A'))[:400]}\n"
            f"How To Use: {json.dumps(concept.get('howToUse', [])[:2])}\n"
            f"Common Pitfalls: {json.dumps(concept.get('commonPitfalls', [])[:2])}\n"
            f"Relevant Objectives:\n{objectives_text}"
        )

    concepts_combined = "\n\n".join(concept_blocks)

    system_prompt = """You are an expert technical content auditor for certification exam preparation materials.
Your job is to verify factual accuracy against official exam objectives and detect:
1. Outdated information (deprecated services, old best practices)
2. Factual errors or contradictions
3. Hallucinations (made-up features, incorrect specifications)
4. Missing critical information required by exam objectives

Be strict but fair. Output valid JSON only."""

    user_prompt = f"""Analyze the following {len(concepts)} concepts for factual accuracy.

{concepts_combined}

For EACH concept that has issues, return entries in the JSON array below.
Include the concept name in each issue so we can map them back.
If a concept has no issues, omit it.

Return JSON array of issues:
[
  {{
    "conceptName": "Name of the concept",
    "issueType": "outdated-content" | "hallucination" | "validation-error",
    "severity": "low" | "medium" | "high" | "critical",
    "fieldPath": "field name",
    "currentValue": "problematic content",
    "proposedValue": "corrected content or null",
    "reasoning": "detailed explanation",
    "confidenceScore": 0-100
  }}
]

If no issues found across all concepts, return empty array []."""

    try:
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
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
            for issue in ai_issues:
                concept_name = issue.pop('conceptName', '')
                if concept_name in issues_by_concept:
                    issues_by_concept[concept_name].append(issue)
                else:
                    # Fuzzy match: find closest concept name
                    for key in issues_by_concept:
                        if concept_name.lower() in key.lower() or key.lower() in concept_name.lower():
                            issues_by_concept[key].append(issue)
                            break

    except Exception as e:
        print(f"AI factual accuracy batch check failed: {str(e)}")

    return issues_by_concept


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
        
        # ── Phase 1: Deterministic checks (no AI) ──────────────────────
        concept_issues_map: Dict[str, List[Dict[str, Any]]] = {}
        for concept in concepts:
            concept_issues = []
            
            # 1. Detect placeholder content
            placeholder_issues = detect_placeholder_content(concept)
            concept_issues.extend(placeholder_issues)
            
            # 2. Detect weak connections
            connection_issues = detect_weak_connections(concept, all_concept_ids)
            concept_issues.extend(connection_issues)
            
            concept_issues_map[concept.get('name', concept.get('id', ''))] = concept_issues
        
        # ── Phase 2: AI factual accuracy in batches ─────────────────────
        for batch_start in range(0, len(concepts), AI_BATCH_SIZE):
            batch = concepts[batch_start:batch_start + AI_BATCH_SIZE]
            print(f"AI batch {batch_start // AI_BATCH_SIZE + 1}: "
                  f"checking {len(batch)} concepts")
            
            batch_results = use_ai_for_factual_accuracy_batch(batch, exam_objectives)
            
            for concept_name, factual_issues in batch_results.items():
                if concept_name in concept_issues_map:
                    concept_issues_map[concept_name].extend(factual_issues)
                
                for issue in factual_issues:
                    if issue.get('issueType') == 'hallucination':
                        hallucination_count += 1
                    elif issue.get('issueType') == 'outdated-content':
                        outdated_count += 1
        
        # ── Phase 3: Score and create findings ──────────────────────────
        for concept in concepts:
            concept_name = concept.get('name', concept.get('id', ''))
            concept_issues = concept_issues_map.get(concept_name, [])
            
            # Calculate quality score
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
