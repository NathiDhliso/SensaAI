"""
Audit Orchestrator Lambda
Coordinates audit execution, manages lifecycle, and handles notifications
"""

import json
import boto3
import os
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid
import time

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
lambda_client = boto3.client('lambda', region_name='us-east-1')
sns = boto3.client('sns', region_name='us-east-1')

# Environment variables
AUDITS_TABLE = os.environ.get('CLM_AUDITS_TABLE', 'clm-audits')
CONCEPTS_TABLE = os.environ.get('CONCEPTS_TABLE', 'sensaai-concepts-dev')
JOBS_TABLE = os.environ.get('JOBS_TABLE', 'sensaai-jobs-dev')
SCHEMA_AUDITOR_FUNCTION = os.environ.get('SCHEMA_AUDITOR_FUNCTION', 'clm-schema-auditor')
CONTENT_AUDITOR_FUNCTION = os.environ.get('CONTENT_AUDITOR_FUNCTION', 'clm-content-auditor')
COVERAGE_AUDITOR_FUNCTION = os.environ.get('COVERAGE_AUDITOR_FUNCTION', 'clm-coverage-auditor')
CURATOR_NOTIFICATION_TOPIC = os.environ.get('CURATOR_NOTIFICATION_TOPIC', '')

# Retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 2


def check_overlapping_audit(subject: str) -> bool:
    """
    Check if there's already a running audit for this subject
    Property 41: Audit Overlap Prevention
    """
    table = dynamodb.Table(AUDITS_TABLE)
    
    try:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='gsi1pk = :pk',
            FilterExpression='#status = :status',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':pk': f'SUBJECT#{subject}',
                ':status': 'running'
            },
            Limit=1
        )
        
        return len(response.get('Items', [])) > 0
    except Exception as e:
        print(f"Error checking overlapping audit: {str(e)}")
        return False


def create_audit_job(config: Dict[str, Any]) -> str:
    """Create a new audit job in DynamoDB"""
    audit_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    table = dynamodb.Table(AUDITS_TABLE)
    
    record = {
        'pk': f'AUDIT#{audit_id}',
        'sk': 'METADATA',
        'auditId': audit_id,
        'subject': config['subject'],
        'auditType': ','.join(config['auditTypes']),  # Store as comma-separated
        'status': 'queued',
        'priority': config.get('priority', 'medium'),
        'triggeredBy': config.get('triggeredBy', 'system'),
        'curatorId': config.get('curatorId'),
        'conceptIds': config.get('scope', {}).get('conceptIds'),
        'examObjectives': config.get('scope', {}).get('examObjectives'),
        'startedAt': now,
        'findingCount': 0,
        'highSeverityCount': 0,
        'gsi1pk': f'SUBJECT#{config["subject"]}',
        'gsi1sk': now,
        'createdAt': now,
        'updatedAt': now,
        'ttl': int(time.time()) + (90 * 24 * 60 * 60)  # 90 days
    }
    
    table.put_item(Item=record)
    
    return audit_id


def update_audit_status(audit_id: str, status: str, additional_fields: Optional[Dict] = None):
    """Update audit job status"""
    table = dynamodb.Table(AUDITS_TABLE)
    
    update_expr = 'SET #status = :status, #updatedAt = :now'
    expr_names = {'#status': 'status', '#updatedAt': 'updatedAt'}
    expr_values = {':status': status, ':now': datetime.utcnow().isoformat()}
    
    if status == 'completed':
        update_expr += ', #completedAt = :completedAt'
        expr_names['#completedAt'] = 'completedAt'
        expr_values[':completedAt'] = datetime.utcnow().isoformat()
    
    if additional_fields:
        for key, value in additional_fields.items():
            update_expr += f', #{key} = :{key}'
            expr_names[f'#{key}'] = key
            expr_values[f':{key}'] = value
    
    table.update_item(
        Key={'pk': f'AUDIT#{audit_id}', 'sk': 'METADATA'},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values
    )


def invoke_auditor_lambda(
    function_name: str,
    payload: Dict[str, Any],
    retry_count: int = 0
) -> Dict[str, Any]:
    """
    Invoke an auditor Lambda with exponential backoff retry
    Property 39: Audit Retry with Exponential Backoff
    """
    try:
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        result = json.loads(response['Payload'].read())
        
        if result.get('statusCode') == 200:
            return json.loads(result.get('body', '{}'))
        else:
            raise Exception(f"Lambda returned error: {result.get('body')}")
    
    except Exception as e:
        print(f"Lambda invocation failed (attempt {retry_count + 1}): {str(e)}")
        
        if retry_count < MAX_RETRIES:
            # Exponential backoff: 2^retry_count * INITIAL_BACKOFF_SECONDS
            backoff = (2 ** retry_count) * INITIAL_BACKOFF_SECONDS
            print(f"Retrying in {backoff} seconds...")
            time.sleep(backoff)
            
            return invoke_auditor_lambda(function_name, payload, retry_count + 1)
        else:
            raise Exception(f"Lambda invocation failed after {MAX_RETRIES} retries: {str(e)}")


def get_concepts_for_audit(subject: str, concept_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Fetch concepts from DynamoDB for auditing.
    Looks up the latest completed job for the subject, then queries concepts.
    DynamoDB key schema: PK=USER#<userId>#SESSION#<sessionId>, SK=TIER#<tier>#<conceptId>
    """
    jobs_table = dynamodb.Table(JOBS_TABLE)
    concepts_table = dynamodb.Table(CONCEPTS_TABLE)

    # Find the latest completed job for this subject by scanning jobs table
    try:
        scan_result = jobs_table.scan(
            FilterExpression='subject = :subj AND #s = :status',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':subj': subject, ':status': 'completed'},
        )
        jobs = sorted(scan_result.get('Items', []), key=lambda j: j.get('createdAt', 0), reverse=True)
    except Exception as e:
        print(f"Error scanning jobs for subject '{subject}': {e}")
        return []

    if not jobs:
        print(f"No completed jobs found for subject: {subject}")
        return []

    job = jobs[0]
    user_id = job.get('userId', '')
    session_id = job.get('sessionId', '')
    pk = f"USER#{user_id}#SESSION#{session_id}"

    # Query all concepts for this session
    try:
        all_concepts: List[Dict[str, Any]] = []
        last_key = None
        while True:
            query_params: Dict[str, Any] = {
                'KeyConditionExpression': 'PK = :pk AND begins_with(SK, :skPrefix)',
                'ExpressionAttributeValues': {':pk': pk, ':skPrefix': 'TIER#'},
            }
            if last_key:
                query_params['ExclusiveStartKey'] = last_key
            result = concepts_table.query(**query_params)
            all_concepts.extend(result.get('Items', []))
            last_key = result.get('LastEvaluatedKey')
            if not last_key:
                break

        # Filter by concept_ids if provided
        if concept_ids:
            id_set = set(concept_ids)
            all_concepts = [c for c in all_concepts if c.get('conceptId') in id_set]

        print(f"Fetched {len(all_concepts)} concepts for subject '{subject}' (session={session_id})")
        return all_concepts

    except Exception as e:
        print(f"Error querying concepts for PK '{pk}': {e}")
        return []


def get_exam_objectives(subject: str) -> List[Dict[str, Any]]:
    """
    Fetch exam objectives for the subject from the jobs table classification data.
    Objectives are derived from the macro workflow / classification stored when
    content was generated (e.g. AZ-104 exam domains with weights and tasks).
    """
    jobs_table = dynamodb.Table(JOBS_TABLE)

    try:
        scan_result = jobs_table.scan(
            FilterExpression='subject = :subj AND #s = :status',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':subj': subject, ':status': 'completed'},
        )
        jobs = sorted(scan_result.get('Items', []), key=lambda j: j.get('createdAt', 0), reverse=True)
    except Exception as e:
        print(f"Error scanning jobs for objectives: {e}")
        return []

    if not jobs:
        print(f"No completed jobs found for exam objectives: {subject}")
        return []

    classification = jobs[0].get('classification', {})
    if not classification:
        print(f"No classification data for subject: {subject}")
        return []

    # Extract domains/objectives from macro structure
    macro = classification.get('macroStructure', {})
    domains = macro.get('domains', [])

    objectives: List[Dict[str, Any]] = []
    for domain in domains:
        objectives.append({
            'name': domain.get('name', ''),
            'weight': domain.get('weight', 0),
            'tasks': domain.get('tasks', []),
            'source': 'classification',
        })

    print(f"Extracted {len(objectives)} exam objectives for subject: {subject}")
    return objectives


def send_completion_notification(audit_id: str, summary: Dict[str, Any]):
    """
    Send notification to curators when audit completes
    Property 38: Audit Completion Notification
    """
    if not CURATOR_NOTIFICATION_TOPIC:
        print("No notification topic configured, skipping notification")
        return
    
    try:
        message = {
            'auditId': audit_id,
            'subject': summary.get('subject'),
            'status': 'completed',
            'findingCount': summary.get('totalFindings', 0),
            'highSeverityCount': summary.get('highSeverityFindings', 0),
            'completedAt': datetime.utcnow().isoformat()
        }
        
        sns.publish(
            TopicArn=CURATOR_NOTIFICATION_TOPIC,
            Subject=f"CLM Audit Completed: {summary.get('subject')}",
            Message=json.dumps(message, indent=2)
        )
        
        print(f"Notification sent for audit {audit_id}")
    except Exception as e:
        print(f"Failed to send notification: {str(e)}")


def execute_audit(audit_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the audit by invoking appropriate auditor lambdas"""
    
    subject = config['subject']
    audit_types = config['auditTypes']
    scope = config.get('scope', {})
    
    # Fetch concepts and objectives
    concept_ids = scope.get('conceptIds')
    concepts = get_concepts_for_audit(subject, concept_ids)
    exam_objectives = get_exam_objectives(subject)
    
    if not concepts:
        raise Exception(f"No concepts found for subject {subject}")
    
    # Update status to running
    update_audit_status(audit_id, 'running')
    
    results = {}
    total_findings = 0
    
    # Execute each audit type
    for audit_type in audit_types:
        print(f"Executing {audit_type} audit...")
        
        try:
            if audit_type == 'schema':
                payload = {
                    'auditId': audit_id,
                    'subject': subject,
                    'conceptIds': [c['id'] for c in concepts],
                    'concepts': concepts,
                    'schemaVersion': '2.0'
                }
                result = invoke_auditor_lambda(SCHEMA_AUDITOR_FUNCTION, payload)
                results['schema'] = result
                total_findings += result.get('findingsCreated', 0)
            
            elif audit_type == 'content':
                payload = {
                    'auditId': audit_id,
                    'subject': subject,
                    'conceptIds': [c['id'] for c in concepts],
                    'concepts': concepts,
                    'examObjectives': exam_objectives
                }
                result = invoke_auditor_lambda(CONTENT_AUDITOR_FUNCTION, payload)
                results['content'] = result
                total_findings += result.get('findingsCreated', 0)
            
            elif audit_type == 'coverage':
                payload = {
                    'auditId': audit_id,
                    'subject': subject,
                    'examObjectives': exam_objectives,
                    'existingConcepts': concepts
                }
                result = invoke_auditor_lambda(COVERAGE_AUDITOR_FUNCTION, payload)
                results['coverage'] = result
                total_findings += result.get('findingsCreated', 0)
            
            elif audit_type == 'quality':
                # Quality is handled by content auditor
                print("Quality audit is part of content audit")
        
        except Exception as e:
            print(f"Failed to execute {audit_type} audit: {str(e)}")
            results[audit_type] = {'error': str(e)}
    
    return {
        'auditId': audit_id,
        'subject': subject,
        'results': results,
        'totalFindings': total_findings
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for audit orchestration
    
    Event structure:
    {
        "action": "trigger" | "schedule" | "status",
        "auditId": "uuid" (for status action),
        "config": {
            "subject": "AZ-104",
            "auditTypes": ["schema", "content", "coverage"],
            "scope": {
                "conceptIds": [...],
                "examObjectives": [...]
            },
            "priority": "high",
            "triggeredBy": "curator",
            "curatorId": "user-123"
        }
    }
    """
    try:
        action = event.get('action', 'trigger')
        
        if action == 'status':
            # Return status of existing audit
            audit_id = event['auditId']
            table = dynamodb.Table(AUDITS_TABLE)
            
            response = table.get_item(
                Key={'pk': f'AUDIT#{audit_id}', 'sk': 'METADATA'}
            )
            
            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'error': 'Audit not found'})
                }
            
            audit = response['Item']
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'auditId': audit_id,
                    'status': audit['status'],
                    'findingCount': audit.get('findingCount', 0)
                })
            }
        
        elif action in ['trigger', 'schedule']:
            config = event['config']
            subject = config['subject']
            
            # Check for overlapping audits
            if check_overlapping_audit(subject):
                return {
                    'statusCode': 409,
                    'body': json.dumps({
                        'error': f'An audit is already running for subject {subject}'
                    })
                }
            
            # Create audit job
            audit_id = create_audit_job(config)
            print(f"Created audit job {audit_id} for subject {subject}")
            
            # Execute audit
            try:
                result = execute_audit(audit_id, config)
                
                # Update status to completed
                update_audit_status(audit_id, 'completed', {
                    'findingCount': result['totalFindings']
                })
                
                # Send notification
                send_completion_notification(audit_id, {
                    'subject': subject,
                    'totalFindings': result['totalFindings']
                })
                
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'auditId': audit_id,
                        'status': 'completed',
                        'results': result
                    })
                }
            
            except Exception as e:
                print(f"Audit execution failed: {str(e)}")
                update_audit_status(audit_id, 'failed')
                
                return {
                    'statusCode': 500,
                    'body': json.dumps({
                        'auditId': audit_id,
                        'error': str(e)
                    })
                }
        
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid action: {action}'})
            }
    
    except Exception as e:
        print(f"Orchestrator failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
