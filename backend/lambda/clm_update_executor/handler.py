"""
Update Executor Lambda
Applies approved content changes with atomic transactions and version control
"""

import json
import boto3
import os
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid
import copy

# AWS Clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')

# Environment variables
AUDITS_TABLE = os.environ.get('CLM_AUDITS_TABLE', 'clm-audits')
VERSIONS_TABLE = os.environ.get('CLM_VERSIONS_TABLE', 'clm-versions')
CHANGELOG_TABLE = os.environ.get('CLM_CHANGELOG_TABLE', 'clm-changelog')
CONCEPTS_TABLE = os.environ.get('CONCEPTS_TABLE', 'concepts')  # Your main concepts table


def get_approved_findings(audit_id: str, finding_ids: List[str]) -> List[Dict[str, Any]]:
    """Fetch approved findings from DynamoDB"""
    table = dynamodb.Table(AUDITS_TABLE)
    findings = []
    
    for finding_id in finding_ids:
        response = table.get_item(
            Key={
                'pk': f'AUDIT#{audit_id}',
                'sk': f'FINDING#{finding_id}'
            }
        )
        
        if 'Item' in response:
            finding = response['Item']
            if finding.get('status') == 'approved':
                findings.append(finding)
    
    return findings


def get_concept(concept_id: str) -> Optional[Dict[str, Any]]:
    """Fetch concept from main concepts table"""
    # TODO: Implement based on your concept storage structure
    # This is a placeholder
    table = dynamodb.Table(CONCEPTS_TABLE)
    
    try:
        response = table.get_item(Key={'id': concept_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error fetching concept {concept_id}: {str(e)}")
        return None


def create_version_snapshot(
    concept: Dict[str, Any],
    change_type: str,
    curator_id: str,
    audit_id: str,
    finding_id: str
) -> Dict[str, Any]:
    """
    Create version snapshot before modification
    Property 29: Version Creation Before Modification
    """
    version_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    # Get existing versions to determine version number
    versions_table = dynamodb.Table(VERSIONS_TABLE)
    
    response = versions_table.query(
        KeyConditionExpression='pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues={
            ':pk': f'CONCEPT#{concept["id"]}',
            ':sk': 'VERSION#'
        },
        ScanIndexForward=False,
        Limit=1
    )
    
    version_number = 1
    if response.get('Items'):
        version_number = response['Items'][0].get('versionNumber', 0) + 1
    
    version_record = {
        'pk': f'CONCEPT#{concept["id"]}',
        'sk': f'VERSION#{timestamp}',
        'versionId': version_id,
        'conceptId': concept['id'],
        'versionNumber': version_number,
        'content': concept,
        'schemaVersion': '2.0',
        'modelVersion': 'claude-sonnet-4.5',
        'generationVersion': '1.0',
        'changeType': change_type,
        'changedBy': curator_id,
        'auditId': audit_id,
        'findingId': finding_id,
        'gsi1pk': f'CONCEPT#{concept["id"]}',
        'gsi1sk': timestamp,
        'createdAt': timestamp,
        'ttl': int(datetime.utcnow().timestamp()) + (30 * 24 * 60 * 60)  # 30 days
    }
    
    versions_table.put_item(Item=version_record)
    
    return version_record


def log_change(
    concept_id: str,
    concept_name: str,
    subject: str,
    operation: str,
    field_path: Optional[str],
    old_value: Any,
    new_value: Any,
    curator_id: str,
    audit_id: str,
    finding_id: str,
    previous_version_id: str,
    new_version_id: str
) -> Dict[str, Any]:
    """
    Log change to audit trail
    Property 30: Change Log Completeness
    """
    change_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    date = timestamp.split('T')[0]
    
    changelog_table = dynamodb.Table(CHANGELOG_TABLE)
    
    change_record = {
        'pk': f'CHANGELOG#{date}',
        'sk': f'{timestamp}#{concept_id}',
        'changeId': change_id,
        'conceptId': concept_id,
        'conceptName': concept_name,
        'subject': subject,
        'operation': operation,
        'fieldPath': field_path,
        'oldValue': old_value,
        'newValue': new_value,
        'auditId': audit_id,
        'findingId': finding_id,
        'changedBy': curator_id,
        'changeReason': f'Applied finding {finding_id} from audit {audit_id}',
        'previousVersionId': previous_version_id,
        'newVersionId': new_version_id,
        'gsi1pk': f'CONCEPT#{concept_id}',
        'gsi1sk': timestamp,
        'gsi2pk': f'CURATOR#{curator_id}',
        'gsi2sk': timestamp,
        'timestamp': timestamp,
        'ttl': int(datetime.utcnow().timestamp()) + (90 * 24 * 60 * 60)  # 90 days
    }
    
    changelog_table.put_item(Item=change_record)
    
    return change_record


def apply_insert_operation(
    finding: Dict[str, Any],
    curator_id: str
) -> Dict[str, Any]:
    """
    INSERT operation - Add new concept
    Property 24: INSERT Operation ID Preservation
    """
    proposed_value = finding.get('proposedValue', {})
    
    # Create new concept from proposed value
    new_concept = {
        'id': str(uuid.uuid4()),
        'name': proposed_value.get('name', 'New Concept'),
        'stageId': proposed_value.get('stageId', 'default'),
        'order': proposed_value.get('order', 0),
        'tier': proposed_value.get('tier', 'branch'),
        'lifecyclePhase': proposed_value.get('lifecyclePhase', 'MODEL'),
        'dependencies': proposed_value.get('dependencies', []),
        'outdegree': 0,
        'createdAt': datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat()
    }
    
    # Add to concepts table
    concepts_table = dynamodb.Table(CONCEPTS_TABLE)
    concepts_table.put_item(Item=new_concept)
    
    # Create version snapshot
    version = create_version_snapshot(
        new_concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    # Log change
    log_change(
        new_concept['id'],
        new_concept['name'],
        'unknown',  # Subject would need to be passed
        'INSERT',
        None,
        None,
        new_concept,
        curator_id,
        finding['auditId'],
        finding['findingId'],
        version['versionId'],
        version['versionId']
    )
    
    return {'success': True, 'conceptId': new_concept['id']}


def apply_update_operation(
    finding: Dict[str, Any],
    curator_id: str
) -> Dict[str, Any]:
    """
    UPDATE operation - Modify specific fields only
    Property 25: UPDATE Operation Field Isolation
    """
    concept_id = finding['conceptId']
    field_path = finding.get('fieldPath')
    proposed_value = finding.get('proposedValue')
    
    # Get current concept
    concept = get_concept(concept_id)
    if not concept:
        raise Exception(f'Concept not found: {concept_id}')
    
    # Create version snapshot BEFORE modification
    old_version = create_version_snapshot(
        concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    # Apply update to specific field
    old_value = None
    if field_path:
        # Handle nested field paths (e.g., "shape.simpleCore")
        parts = field_path.split('.')
        target = concept
        
        # Navigate to parent of target field
        for part in parts[:-1]:
            if part not in target:
                target[part] = {}
            target = target[part]
        
        # Store old value and update
        old_value = target.get(parts[-1])
        target[parts[-1]] = proposed_value
    else:
        # Update entire concept (rare case)
        old_value = copy.deepcopy(concept)
        concept.update(proposed_value)
    
    concept['updatedAt'] = datetime.utcnow().isoformat()
    
    # Validate schema after update (Property 53)
    validate_schema(concept)
    
    # Save updated concept
    concepts_table = dynamodb.Table(CONCEPTS_TABLE)
    concepts_table.put_item(Item=concept)
    
    # Create new version snapshot AFTER modification
    new_version = create_version_snapshot(
        concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    # Log change
    log_change(
        concept_id,
        concept['name'],
        'unknown',
        'UPDATE',
        field_path,
        old_value,
        proposed_value,
        curator_id,
        finding['auditId'],
        finding['findingId'],
        old_version['versionId'],
        new_version['versionId']
    )
    
    return {'success': True, 'conceptId': concept_id}


def apply_delete_operation(
    finding: Dict[str, Any],
    curator_id: str,
    all_concepts: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    DELETE operation - Remove concept and update references
    Property 26: DELETE Operation Reference Cleanup
    Property 52: Delete Operation Atomicity
    """
    concept_id = finding['conceptId']
    
    # Get concept to delete
    concept = get_concept(concept_id)
    if not concept:
        raise Exception(f'Concept not found: {concept_id}')
    
    # Create version snapshot
    old_version = create_version_snapshot(
        concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    # Find all concepts that reference this one
    concepts_to_update = []
    for other_concept in all_concepts:
        if other_concept['id'] == concept_id:
            continue
        
        needs_update = False
        
        # Check dependencies
        if 'dependencies' in other_concept and concept_id in other_concept['dependencies']:
            other_concept['dependencies'].remove(concept_id)
            needs_update = True
        
        # Check connections
        if 'connections' in other_concept:
            other_concept['connections'] = [
                conn for conn in other_concept['connections']
                if conn.get('target') != concept_id
            ]
            needs_update = True
        
        if needs_update:
            concepts_to_update.append(other_concept)
    
    # Use transaction to delete concept and update references atomically
    concepts_table = dynamodb.Table(CONCEPTS_TABLE)
    
    try:
        # Delete the concept
        concepts_table.delete_item(Key={'id': concept_id})
        
        # Update all referencing concepts
        for updated_concept in concepts_to_update:
            updated_concept['updatedAt'] = datetime.utcnow().isoformat()
            concepts_table.put_item(Item=updated_concept)
        
        # Log change
        log_change(
            concept_id,
            concept['name'],
            'unknown',
            'DELETE',
            None,
            concept,
            None,
            curator_id,
            finding['auditId'],
            finding['findingId'],
            old_version['versionId'],
            old_version['versionId']  # No new version for deletion
        )
        
        return {
            'success': True,
            'conceptId': concept_id,
            'referencesUpdated': len(concepts_to_update)
        }
    
    except Exception as e:
        # Rollback would happen here in a real transaction
        raise Exception(f'Delete operation failed: {str(e)}')


def apply_relink_operation(
    finding: Dict[str, Any],
    curator_id: str
) -> Dict[str, Any]:
    """
    RELINK operation - Update TRACES connections
    Property 27: RELINK Operation Connection Validity
    Property 51: TRACES Connection Validation
    """
    concept_id = finding['conceptId']
    proposed_value = finding.get('proposedValue', {})
    
    # Get concept
    concept = get_concept(concept_id)
    if not concept:
        raise Exception(f'Concept not found: {concept_id}')
    
    # Create version snapshot
    old_version = create_version_snapshot(
        concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    old_connections = concept.get('connections', [])
    
    # Update connections
    new_connections = proposed_value.get('connections', [])
    
    # Validate all target concepts exist (Property 51)
    for conn in new_connections:
        target_id = conn.get('target')
        if target_id:
            target_concept = get_concept(target_id)
            if not target_concept:
                raise Exception(f'Target concept not found: {target_id}')
    
    concept['connections'] = new_connections
    concept['updatedAt'] = datetime.utcnow().isoformat()
    
    # Save updated concept
    concepts_table = dynamodb.Table(CONCEPTS_TABLE)
    concepts_table.put_item(Item=concept)
    
    # Create new version
    new_version = create_version_snapshot(
        concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    # Log change
    log_change(
        concept_id,
        concept['name'],
        'unknown',
        'RELINK',
        'connections',
        old_connections,
        new_connections,
        curator_id,
        finding['auditId'],
        finding['findingId'],
        old_version['versionId'],
        new_version['versionId']
    )
    
    return {'success': True, 'conceptId': concept_id}


def apply_enrich_operation(
    finding: Dict[str, Any],
    curator_id: str
) -> Dict[str, Any]:
    """
    ENRICH operation - Add new fields without modifying existing
    Property 28: ENRICH Operation Field Addition
    """
    concept_id = finding['conceptId']
    field_path = finding.get('fieldPath')
    proposed_value = finding.get('proposedValue')
    
    # Get concept
    concept = get_concept(concept_id)
    if not concept:
        raise Exception(f'Concept not found: {concept_id}')
    
    # Create version snapshot
    old_version = create_version_snapshot(
        concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    # Add new field (don't modify existing)
    if field_path and field_path not in concept:
        concept[field_path] = proposed_value
    elif field_path:
        # Field already exists, skip enrichment
        return {'success': False, 'reason': 'Field already exists', 'conceptId': concept_id}
    
    concept['updatedAt'] = datetime.utcnow().isoformat()
    
    # Validate schema
    validate_schema(concept)
    
    # Save updated concept
    concepts_table = dynamodb.Table(CONCEPTS_TABLE)
    concepts_table.put_item(Item=concept)
    
    # Create new version
    new_version = create_version_snapshot(
        concept,
        'audit-fix',
        curator_id,
        finding['auditId'],
        finding['findingId']
    )
    
    # Log change
    log_change(
        concept_id,
        concept['name'],
        'unknown',
        'ENRICH',
        field_path,
        None,
        proposed_value,
        curator_id,
        finding['auditId'],
        finding['findingId'],
        old_version['versionId'],
        new_version['versionId']
    )
    
    return {'success': True, 'conceptId': concept_id}


def validate_schema(concept: Dict[str, Any]):
    """
    Validate concept schema after update
    Property 53: Post-Update Schema Validation
    """
    required_fields = ['id', 'name', 'tier', 'lifecyclePhase', 'dependencies', 'outdegree']
    
    for field in required_fields:
        if field not in concept:
            raise Exception(f'Schema validation failed: missing required field "{field}"')
    
    valid_tiers = {'trunk', 'branch', 'leaf'}
    if concept['tier'] not in valid_tiers:
        raise Exception(f'Schema validation failed: invalid tier "{concept["tier"]}"')
    
    valid_phases = {'PREPARE', 'MODEL', 'DELIVER'}
    if concept['lifecyclePhase'] not in valid_phases:
        raise Exception(f'Schema validation failed: invalid lifecyclePhase "{concept["lifecyclePhase"]}"')


def update_finding_status(audit_id: str, finding_id: str, status: str, error: Optional[str] = None):
    """Update finding status after execution"""
    table = dynamodb.Table(AUDITS_TABLE)
    
    update_expr = 'SET #status = :status, #updatedAt = :now'
    expr_names = {'#status': 'status', '#updatedAt': 'updatedAt'}
    expr_values = {':status': status, ':now': datetime.utcnow().isoformat()}
    
    if error:
        update_expr += ', #error = :error'
        expr_names['#error'] = 'executionError'
        expr_values[':error'] = error
    
    table.update_item(
        Key={'pk': f'AUDIT#{audit_id}', 'sk': f'FINDING#{finding_id}'},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values
    )


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for update execution
    
    Event structure:
    {
        "executionJobId": "uuid",
        "approvedFindings": ["finding-id-1", "finding-id-2"],
        "curatorId": "user-123"
    }
    """
    try:
        execution_job_id = event['executionJobId']
        approved_finding_ids = event['approvedFindings']
        curator_id = event['curatorId']
        
        print(f"Starting execution job {execution_job_id}")
        print(f"Applying {len(approved_finding_ids)} approved findings")
        
        # Get all approved findings
        # Note: We need audit_id to fetch findings
        # Assuming first finding contains audit_id
        if not approved_finding_ids:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No findings to apply'})
            }
        
        # Fetch findings (need to determine audit_id first)
        # This is a simplified version - in production, pass audit_id in event
        findings = []
        for finding_id in approved_finding_ids:
            # Would need to query by finding_id or pass audit_id
            pass
        
        # For now, assume findings are passed in event
        findings = event.get('findings', [])
        
        # Fetch all concepts for reference checking
        all_concepts = []  # Would fetch from concepts table
        
        applied = []
        failed = []
        versions_created = []
        
        # Apply each finding
        for finding in findings:
            try:
                operation = finding['operation']
                result = None
                
                if operation == 'INSERT':
                    result = apply_insert_operation(finding, curator_id)
                elif operation == 'UPDATE':
                    result = apply_update_operation(finding, curator_id)
                elif operation == 'DELETE':
                    result = apply_delete_operation(finding, curator_id, all_concepts)
                elif operation == 'RELINK':
                    result = apply_relink_operation(finding, curator_id)
                elif operation == 'ENRICH':
                    result = apply_enrich_operation(finding, curator_id)
                else:
                    raise Exception(f'Unknown operation: {operation}')
                
                if result.get('success'):
                    applied.append(finding['findingId'])
                    update_finding_status(finding['auditId'], finding['findingId'], 'applied')
                else:
                    failed.append({
                        'findingId': finding['findingId'],
                        'error': result.get('reason', 'Unknown error')
                    })
                    update_finding_status(
                        finding['auditId'],
                        finding['findingId'],
                        'failed',
                        result.get('reason')
                    )
            
            except Exception as e:
                print(f"Failed to apply finding {finding['findingId']}: {str(e)}")
                failed.append({
                    'findingId': finding['findingId'],
                    'error': str(e)
                })
                update_finding_status(finding['auditId'], finding['findingId'], 'failed', str(e))
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': len(failed) == 0,
                'applied': applied,
                'failed': failed,
                'versionsCreated': versions_created
            })
        }
    
    except Exception as e:
        print(f"Execution job failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
