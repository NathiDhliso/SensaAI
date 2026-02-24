"""
Coverage Auditor Lambda
Analyzes exam objective coverage and identifies gaps using Claude Sonnet 4.5
"""

import json
import boto3
import os
import re
from typing import Any, Dict, List, Optional, Set
from datetime import datetime
import uuid

from shared.bedrock_client import get_bedrock_client

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# GUARDRAIL: All AI calls must go through the approved Bedrock account (693582801685)
bedrock = get_bedrock_client()

# Environment variables
AUDITS_TABLE = os.environ.get('CLM_AUDITS_TABLE', 'clm-audits')
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")  # Sonnet 4.6 for coverage analysis


def map_concepts_to_objectives(
    concepts: List[Dict[str, Any]],
    objectives: List[Dict[str, Any]]
) -> Dict[str, List[str]]:
    """
    Map concepts to exam objectives based on keywords and content
    Returns: {objective_id: [concept_ids]}
    """
    mapping = {obj['id']: [] for obj in objectives}
    
    for concept in concepts:
        concept_text = f"{concept.get('name', '')} {' '.join(concept.get('keyPoints', []))}".lower()
        
        for objective in objectives:
            # Check if objective keywords appear in concept
            obj_keywords = [kw.lower() for kw in objective.get('keywords', [])]
            
            # Simple keyword matching
            matches = sum(1 for kw in obj_keywords if kw in concept_text)
            
            # If significant overlap, map this concept to objective
            if matches >= 2 or (matches >= 1 and len(obj_keywords) <= 2):
                mapping[objective['id']].append(concept['id'])
    
    return mapping


def calculate_coverage_depth(
    objective: Dict[str, Any],
    mapped_concepts: List[Dict[str, Any]]
) -> str:
    """
    Calculate coverage depth: none, shallow, adequate, comprehensive
    """
    if not mapped_concepts:
        return 'none'
    
    concept_count = len(mapped_concepts)
    total_content_length = sum(
        len(str(c.get('technicalDetails', ''))) + 
        len(str(c.get('howToUse', []))) +
        len(str(c.get('commonPitfalls', [])))
        for c in mapped_concepts
    )
    
    # Heuristics based on objective weight and difficulty
    weight = objective.get('weight', 5)
    difficulty = objective.get('difficulty', 'intermediate')
    
    # Expected concept count based on weight
    expected_concepts = max(1, int(weight / 5))
    
    if concept_count == 0:
        return 'none'
    elif concept_count < expected_concepts or total_content_length < 500:
        return 'shallow'
    elif concept_count >= expected_concepts and total_content_length >= 500:
        if difficulty == 'advanced' and concept_count < expected_concepts * 1.5:
            return 'adequate'
        return 'comprehensive'
    else:
        return 'adequate'


def use_ai_for_coverage_analysis(
    objective: Dict[str, Any],
    mapped_concepts: List[Dict[str, Any]],
    coverage_depth: str
) -> Optional[Dict[str, Any]]:
    """
    Use Claude Sonnet 4.5 to analyze coverage gaps and suggest improvements
    """
    if coverage_depth == 'comprehensive':
        return None  # No gap to analyze
    
    # Prepare prompt
    system_prompt = """You are an expert curriculum designer for certification exam preparation.
Analyze whether the provided concepts adequately cover the exam objective.
Identify specific gaps and suggest what additional concepts or content are needed.

Output valid JSON only."""
    
    concepts_summary = "\n".join([
        f"- {c.get('name')} (Tier: {c.get('tier')}, Phase: {c.get('lifecyclePhase')})"
        for c in mapped_concepts[:10]
    ])
    
    user_prompt = f"""Exam Objective:
Code: {objective['code']}
Title: {objective['title']}
Description: {objective['description']}
Weight: {objective['weight']}%
Difficulty: {objective['difficulty']}
Keywords: {', '.join(objective.get('keywords', []))}

Current Coverage ({coverage_depth}):
{concepts_summary if concepts_summary else "No concepts mapped"}

Analyze the coverage and return JSON:
{{
  "hasGap": true/false,
  "gapDescription": "What's missing",
  "suggestedConcepts": ["concept name 1", "concept name 2"],
  "priority": "low" | "medium" | "high",
  "reasoning": "Why this gap matters",
  "confidenceScore": 0-100
}}

If coverage is adequate, set hasGap to false."""
    
    try:
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
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
        
        # Extract JSON
        json_match = re.search(r'\{[\s\S]*\}', ai_response)
        if json_match:
            analysis = json.loads(json_match.group(0))
            return analysis if analysis.get('hasGap') else None
        
    except Exception as e:
        print(f"AI coverage analysis failed: {str(e)}")
    
    return None


def prioritize_gaps(
    gaps: List[Dict[str, Any]],
    objectives: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Prioritize coverage gaps by weight × difficulty multiplier
    Property 10: Coverage Gap Prioritization
    """
    difficulty_multipliers = {
        'beginner': 1.0,
        'intermediate': 1.5,
        'advanced': 2.0
    }
    
    for gap in gaps:
        # Find corresponding objective
        obj = next((o for o in objectives if o['id'] == gap['objectiveId']), None)
        if obj:
            weight = obj.get('weight', 5)
            difficulty = obj.get('difficulty', 'intermediate')
            multiplier = difficulty_multipliers.get(difficulty, 1.5)
            gap['priorityScore'] = weight * multiplier
        else:
            gap['priorityScore'] = 0
    
    # Sort by priority score descending
    gaps.sort(key=lambda x: x['priorityScore'], reverse=True)
    
    return gaps


def create_finding_record(
    audit_id: str,
    objective: Dict[str, Any],
    gap_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a DynamoDB finding record for coverage gap"""
    finding_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    # Map AI priority to severity
    priority_to_severity = {
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
    }
    severity = priority_to_severity.get(gap_analysis.get('priority', 'medium'), 'medium')
    
    return {
        'pk': f"AUDIT#{audit_id}",
        'sk': f"FINDING#{finding_id}",
        'findingId': finding_id,
        'auditId': audit_id,
        'issueType': 'coverage-gap',
        'severity': severity,
        'conceptId': objective['id'],  # Using objective ID as reference
        'conceptName': objective['title'],
        'operation': 'INSERT',  # Need to insert new concepts
        'currentValue': None,
        'proposedValue': {
            'suggestedConcepts': gap_analysis.get('suggestedConcepts', []),
            'objectiveCode': objective['code'],
            'objectiveTitle': objective['title']
        },
        'fieldPath': 'coverage',
        'confidenceScore': gap_analysis.get('confidenceScore', 85),
        'reasoning': gap_analysis.get('reasoning', gap_analysis.get('gapDescription', '')),
        'status': 'pending',
        'gsi2pk': 'STATUS#pending',
        'gsi2sk': f"{severity}#{now}",
        'createdAt': now,
        'updatedAt': now,
        'objectiveId': objective['id'],  # Additional field for coverage gaps
        'priorityScore': 0  # Will be set by prioritization
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for coverage auditing
    
    Event structure:
    {
        "auditId": "uuid",
        "subject": "AZ-104",
        "examObjectives": [...],
        "existingConcepts": [...]
    }
    """
    try:
        audit_id = event['auditId']
        subject = event['subject']
        exam_objectives = event.get('examObjectives', [])
        concepts = event.get('existingConcepts', [])
        
        print(f"Starting coverage audit {audit_id} for subject {subject}")
        print(f"Analyzing {len(concepts)} concepts against {len(exam_objectives)} objectives")
        
        # Step 1: Map concepts to objectives
        objective_mapping = map_concepts_to_objectives(concepts, exam_objectives)
        
        # Step 2: Build coverage matrix
        coverage_matrix = []
        all_gaps = []
        covered_count = 0
        
        for objective in exam_objectives:
            obj_id = objective['id']
            mapped_concept_ids = objective_mapping.get(obj_id, [])
            mapped_concepts = [c for c in concepts if c['id'] in mapped_concept_ids]
            
            # Calculate coverage depth
            depth = calculate_coverage_depth(objective, mapped_concepts)
            
            coverage_matrix.append({
                'id': obj_id,
                'name': objective['title'],
                'weight': objective['weight'],
                'coveredBy': mapped_concept_ids,
                'coverageDepth': depth
            })
            
            if depth in ['adequate', 'comprehensive']:
                covered_count += 1
            
            # Step 3: Use AI to analyze gaps
            if depth in ['none', 'shallow']:
                gap_analysis = use_ai_for_coverage_analysis(objective, mapped_concepts, depth)
                
                if gap_analysis:
                    gap_info = {
                        'objectiveId': obj_id,
                        'objective': objective,
                        'analysis': gap_analysis
                    }
                    all_gaps.append(gap_info)
        
        # Step 4: Prioritize gaps
        prioritized_gaps = prioritize_gaps(all_gaps, exam_objectives)
        
        # Step 5: Create findings for gaps
        all_findings = []
        for gap in prioritized_gaps:
            finding = create_finding_record(
                audit_id,
                gap['objective'],
                gap['analysis']
            )
            finding['priorityScore'] = gap['priorityScore']
            all_findings.append(finding)
        
        # Batch write findings to DynamoDB
        table = dynamodb.Table(AUDITS_TABLE)
        
        for i in range(0, len(all_findings), 25):
            batch = all_findings[i:i+25]
            with table.batch_writer() as writer:
                for finding in batch:
                    writer.put_item(Item=finding)
        
        # Calculate coverage percentage
        total_objectives = len(exam_objectives)
        coverage_percentage = (covered_count / total_objectives * 100) if total_objectives > 0 else 0
        
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
            'totalObjectives': total_objectives,
            'coveredObjectives': covered_count,
            'coveragePercentage': round(coverage_percentage, 2),
            'gapsIdentified': len(all_findings)
        }
        
        print(f"Coverage audit completed: {summary}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'auditId': audit_id,
                'summary': summary,
                'coverageMatrix': coverage_matrix,
                'findingsCreated': len(all_findings)
            })
        }
        
    except Exception as e:
        print(f"Coverage audit failed: {str(e)}")
        
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
