"""
DynamoDB Service - Data persistence operations

This service encapsulates all DynamoDB interactions including:
- Job record creation and status updates
- Concept storage with batch writes
- Subject metadata management

@module services/dynamo_service
"""

import os
from typing import Any, Dict, List

import boto3

from shared.utils import (
    generate_id,
    get_ttl_timestamp,
    create_pk,
    create_sk,
    create_gsi1_pk,
    create_gsi1_sk,
    create_subject_sk,
)


class DynamoService:
    """
    Service for DynamoDB operations.
    
    Manages persistence of jobs, concepts, and subject metadata
    with optimized batch operations.
    """

    # TTL defaults (in hours)
    DEFAULT_JOB_TTL_HOURS = 24
    DEFAULT_CONCEPT_TTL_HOURS = 168  # 7 days

    def __init__(self):
        """Initialize DynamoDB service with table references."""
        self.dynamodb = boto3.resource("dynamodb")
        self.jobs_table_name = os.environ.get("JOBS_TABLE", "sensapbl-jobs-pilot")
        self.concepts_table_name = os.environ.get("CONCEPTS_TABLE", "sensapbl-concepts-pilot")
        self._jobs_table = None
        self._concepts_table = None

    @property
    def jobs_table(self):
        """Lazy-load jobs table reference."""
        if self._jobs_table is None:
            self._jobs_table = self.dynamodb.Table(self.jobs_table_name)
        return self._jobs_table

    @property
    def concepts_table(self):
        """Lazy-load concepts table reference."""
        if self._concepts_table is None:
            self._concepts_table = self.dynamodb.Table(self.concepts_table_name)
        return self._concepts_table

    # =========================================================================
    # JOB OPERATIONS
    # =========================================================================

    def create_job(
        self,
        job_id: str,
        user_id: str,
        session_id: str,
        subject: str,
    ) -> Dict[str, Any]:
        """
        Create a new job record in pending state.
        
        Args:
            job_id: Unique job identifier
            user_id: User who initiated the job
            session_id: Session identifier
            subject: Subject being generated
            
        Returns:
            Created job item
        """
        item = {
            "jobId": job_id,
            "userId": user_id,
            "sessionId": session_id,
            "subject": subject,
            "status": "in_progress",
            "createdAt": get_ttl_timestamp(0),
            "expiresAt": get_ttl_timestamp(self.DEFAULT_JOB_TTL_HOURS),
        }

        self.jobs_table.put_item(Item=item)
        print(f"[DynamoService] Created job {job_id} for user {user_id}")
        return item

    def update_job_status(
        self,
        job_id: str,
        user_id: str,
        status: str,
        concept_count: int = None,
        error: str = None,
    ) -> None:
        """
        Update job status and optional metadata.
        
        Args:
            job_id: Job identifier
            user_id: User identifier (part of key)
            status: New status ('completed', 'failed', 'in_progress')
            concept_count: Number of concepts generated (optional)
            error: Error message if failed (optional)
        """
        update_expression = "SET #status = :status"
        expression_names = {"#status": "status"}
        expression_values = {":status": status}

        if concept_count is not None:
            update_expression += ", conceptCount = :count"
            expression_values[":count"] = concept_count

        if error is not None:
            update_expression += ", #error = :error"
            expression_names["#error"] = "error"
            expression_values[":error"] = error

        self.jobs_table.update_item(
            Key={"jobId": job_id, "userId": user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values,
        )
        print(f"[DynamoService] Updated job {job_id} to status={status}")

    def mark_job_completed(
        self, job_id: str, user_id: str, concept_count: int
    ) -> None:
        """
        Mark job as successfully completed.
        
        Args:
            job_id: Job identifier
            user_id: User identifier
            concept_count: Number of concepts generated
        """
        self.update_job_status(job_id, user_id, "completed", concept_count=concept_count)

    def mark_job_failed(self, job_id: str, user_id: str, error: str) -> None:
        """
        Mark job as failed with error message.
        
        Args:
            job_id: Job identifier
            user_id: User identifier
            error: Error description
        """
        self.update_job_status(job_id, user_id, "failed", error=error)

    # =========================================================================
    # CONCEPT OPERATIONS
    # =========================================================================

    def store_concepts(
        self,
        user_id: str,
        session_id: str,
        concepts: List[Dict[str, Any]],
        subject_name: str,
    ) -> int:
        """
        Store concepts in DynamoDB using batch write for efficiency.
        
        Also stores a metadata item to allow listing subjects by user.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            concepts: List of concept dictionaries
            subject_name: Name of the subject
            
        Returns:
            Number of concepts stored
        """
        pk = create_pk(user_id, session_id)
        gsi1_pk = create_gsi1_pk(user_id, session_id)

        # Create metadata item for listing subjects
        user_pk = f"USER#{user_id}"
        subject_sk = create_subject_sk(session_id)

        metadata_item = {
            "PK": user_pk,
            "SK": subject_sk,
            "GSI1PK": user_pk,
            "GSI1SK": subject_sk,
            "userId": user_id,
            "sessionId": session_id,
            "subject": subject_name,
            "conceptCount": len(concepts),
            "createdAt": get_ttl_timestamp(0),
            "updatedAt": get_ttl_timestamp(0),
            "expiresAt": get_ttl_timestamp(self.DEFAULT_CONCEPT_TTL_HOURS),
            "type": "SUBJECT_METADATA",
        }

        # Batch write in chunks of 25 (DynamoDB limit)
        with self.concepts_table.batch_writer() as batch:
            # Write metadata item first
            batch.put_item(Item=metadata_item)

            # Write all concepts
            for concept in concepts:
                concept_id = concept.get("id", generate_id())
                tier = concept.get("tier", "foundation")

                batch.put_item(
                    Item=self._build_concept_item(
                        pk, gsi1_pk, tier, concept_id, concept
                    )
                )

        print(f"[DynamoService] Stored {len(concepts)} concepts for session {session_id}")
        return len(concepts)

    def _build_concept_item(
        self,
        pk: str,
        gsi1_pk: str,
        tier: str,
        concept_id: str,
        concept: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build a DynamoDB item for a concept.
        
        Args:
            pk: Partition key
            gsi1_pk: GSI1 partition key
            tier: Concept tier
            concept_id: Unique concept ID
            concept: Concept data dictionary
            
        Returns:
            DynamoDB item dictionary
        """
        return {
            "PK": pk,
            "SK": create_sk(tier, concept_id),
            "GSI1PK": gsi1_pk,
            "GSI1SK": create_gsi1_sk(tier, concept_id),
            "conceptId": concept_id,
            "tier": tier,
            "stageId": concept.get("stageId", "PREPARE"),
            "name": concept.get("name", "Unnamed Concept"),
            "description": concept.get("description", ""),
            "tierJustification": concept.get("tierJustification", ""),
            "whyYouNeed": concept.get("whyYouNeed", ""),
            "technicalDetails": concept.get("technicalDetails", ""),
            "workedExample": concept.get("workedExample", {}),
            "keyPoints": concept.get("keyPoints", []),
            "cognitiveLevel": concept.get("cognitiveLevel", "understand"),
            "commonPitfalls": concept.get("commonPitfalls", []),
            "prerequisiteWeight": str(concept.get("prerequisiteWeight", 0.5)),
            "displayProperties": concept.get("displayProperties", {}),
            # SENSA learning science data
            "mnemonic": concept.get("mnemonic", {}),
            "phase1": concept.get("phase1", {}),
            "phase2": concept.get("phase2", []),
            "phase3": concept.get("phase3", {}),
            "shape": concept.get("shape", {}),
            "criticalDistinctions": concept.get("criticalDistinctions", []),
            "designBoundaries": concept.get("designBoundaries", []),
            "examFocus": concept.get("examFocus", []),
            "dependencies": concept.get("dependencies", []),
            "connections": concept.get("connections", []),
            "outdegree": concept.get("outdegree", 0),
            "createdAt": get_ttl_timestamp(0),
            "expiresAt": get_ttl_timestamp(self.DEFAULT_CONCEPT_TTL_HOURS),
        }
