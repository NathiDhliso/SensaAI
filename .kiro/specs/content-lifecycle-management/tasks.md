# Implementation Plan: Content Lifecycle Management System

## Overview

This implementation plan breaks down the CLM system into incremental coding tasks. The system consists of backend Lambda functions for audit execution, an Express API for curator interactions, and React frontend components for the curator dashboard. Each task builds on previous work, with property-based tests integrated throughout to validate correctness.

## Tasks

- [x] 1. Set up DynamoDB tables and data access layer
  - Create DynamoDB table schemas for `clm-audits`, `clm-versions`, and `clm-changelog`
  - Implement TypeScript interfaces matching the design document
  - Create data access layer with methods for CRUD operations
  - Add GSI definitions for access patterns (subject queries, status queries, concept history)
  - _Requirements: 17.1_
  - **COMPLETED**: Created types, DynamoDB client, and repositories for audits, versions, and changelog

- [ ]* 1.1 Write property tests for data access layer
  - **Property 54: DynamoDB Naming Convention Compliance**
  - **Validates: Requirements 17.1**

- [x] 2. Implement version control system
  - [x] 2.1 Create ContentVersionRecord storage and retrieval
    - Implement `createVersion()` to snapshot concepts before changes
    - Implement `getVersionHistory()` to retrieve all versions for a concept
    - Implement `getVersion()` to retrieve specific version by ID
    - Add TTL configuration for 30-day retention
    - _Requirements: 10.1, 10.3, 10.5_
    - **COMPLETED**: Created version-control service with snapshot, history, and retrieval functions

  - [ ]* 2.2 Write property tests for version control
    - **Property 29: Version Creation Before Modification**
    - **Validates: Requirements 10.1**
    - **Property 31: Version History Completeness**
    - **Validates: Requirements 10.3**
    - **Property 33: Version Retention Duration**
    - **Validates: Requirements 10.5**

  - [x] 2.3 Implement rollback functionality
    - Create `rollbackToVersion()` function to restore previous versions
    - Ensure rollback creates new version entry (for audit trail)
    - Log rollback action to change log
    - _Requirements: 10.4_
    - **COMPLETED**: Implemented rollbackConcept with changelog integration

  - [ ]* 2.4 Write property test for rollback accuracy
    - **Property 32: Rollback Restoration Accuracy**
    - **Validates: Requirements 10.4**

- [x] 3. Implement change log and audit trail
  - Create ChangeLogRecord storage with date-based partitioning
  - Implement `logChange()` to record all modifications
  - Implement query methods for change history (by date, concept, curator)
  - Add TTL configuration for 90-day retention
  - _Requirements: 10.2_
  - **COMPLETED**: Created audit-trail service with comprehensive logging and query functions

- [ ]* 3.1 Write property test for change log completeness
  - **Property 30: Change Log Completeness**
  - **Validates: Requirements 10.2**

- [x] 4. Implement Schema Auditor Lambda
  - [x] 4.1 Create Lambda function structure and handler
    - Set up Lambda handler with Python
    - Define input/output interfaces (SchemaAuditorEvent, SchemaAuditorResponse)
    - Add CloudWatch logging
    - _Requirements: 1.1, 17.3_
    - **COMPLETED**: Created schema auditor Lambda with full handler

  - [x] 4.2 Implement schema validation logic
    - Check required fields (tier, lifecyclePhase, dependencies, etc.)
    - Validate field types and enum values
    - Detect deprecated fields
    - Detect invalid TRACES connections
    - Create AuditFinding records for each issue
    - _Requirements: 1.2, 1.3, 1.4_
    - **COMPLETED**: Comprehensive validation with all checks

  - [ ]* 4.3 Write property tests for schema validation
    - **Property 1: Schema Issue Detection Completeness**
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - **Property 7: Validation Error Reporting**
    - **Validates: Requirements 3.4**

  - [x] 4.4 Implement compliance reporting
    - Calculate compliance percentage
    - Generate summary with total/compliant/issues counts
    - Store results in DynamoDB
    - _Requirements: 1.5_
    - **COMPLETED**: Summary generation with compliance metrics

  - [ ]* 4.5 Write property test for compliance calculation
    - **Property 2: Schema Compliance Percentage Accuracy**
    - **Validates: Requirements 1.5**

  - [x] 4.6 Integrate Claude Sonnet 4.5 API
    - Add Anthropic SDK dependency
    - Implement AI-powered schema analysis for complex cases
    - Add confidence score calculation
    - Implement caching for 24 hours
    - _Requirements: 20.1, 20.3_
    - **COMPLETED**: AI validation with Sonnet 4.5 and confidence scoring

  - [ ]* 4.7 Write property tests for AI integration
    - **Property 4: Confidence Score Presence**
    - **Validates: Requirements 2.5**
    - **Property 62: AI Model Selection by Audit Type**
    - **Validates: Requirements 20.1, 20.2**
    - **Property 63: Audit Result Caching**
    - **Validates: Requirements 20.3**

- [x] 5. Implement Content Auditor Lambda
  - [x] 5.1 Create Lambda function structure
    - Set up Lambda handler with Python
    - Define input/output interfaces
    - Add CloudWatch logging
    - _Requirements: 2.1, 17.3_
    - **COMPLETED**: Created content auditor Lambda

  - [x] 5.2 Implement factual accuracy checking
    - Compare concept content against exam objectives
    - Detect outdated information
    - Detect contradictions
    - Create findings with high severity for contradictions
    - _Requirements: 2.2, 2.3_
    - **COMPLETED**: AI-powered factual accuracy validation

  - [x] 5.3 Implement quality analysis
    - Detect placeholder content (TODO, [INSERT], TBD patterns)
    - Detect weak TRACES connections
    - Assign quality scores
    - _Requirements: 3.2, 3.3, 3.5_
    - **COMPLETED**: Comprehensive quality checks with scoring

  - [ ]* 5.4 Write property tests for content auditing
    - **Property 5: Placeholder Content Detection**
    - **Validates: Requirements 3.2**
    - **Property 6: Broken Connection Detection**
    - **Validates: Requirements 3.3**
    - **Property 8: Quality Score Assignment**
    - **Validates: Requirements 3.5**

  - [x] 5.5 Integrate Claude Opus 4.5 API
    - Implement deep content analysis using Opus
    - Add confidence scoring
    - Implement request batching for efficiency
    - _Requirements: 20.2, 20.4_
    - **COMPLETED**: Opus 4.5 integration with confidence scores

  - [ ]* 5.6 Write property test for API batching
    - **Property 64: API Request Batching**
    - **Validates: Requirements 20.4**

- [x] 6. Implement Coverage Auditor Lambda
  - [x] 6.1 Create Lambda function structure
    - Set up Lambda handler with Python
    - Define input/output interfaces
    - Add CloudWatch logging
    - _Requirements: 4.1, 17.3_
    - **COMPLETED**: Created coverage auditor Lambda

  - [x] 6.2 Implement coverage mapping
    - Map existing concepts to exam objectives
    - Identify coverage gaps
    - Calculate coverage depth per objective
    - _Requirements: 4.1, 4.2_
    - **COMPLETED**: Keyword-based mapping with depth calculation

  - [ ]* 6.3 Write property tests for coverage analysis
    - **Property 3: Coverage Gap Identification**
    - **Validates: Requirements 2.4, 4.2**
    - **Property 9: Coverage Matrix Accuracy**
    - **Validates: Requirements 4.4**

  - [x] 6.4 Implement gap prioritization
    - Sort gaps by weight and difficulty
    - Generate coverage matrix with percentages
    - _Requirements: 4.4, 4.5_
    - **COMPLETED**: Priority scoring with weight × difficulty

  - [ ]* 6.5 Write property test for gap prioritization
    - **Property 10: Coverage Gap Prioritization**
    - **Validates: Requirements 4.5**

  - [x] 6.6 Integrate Claude Sonnet 4.5 API
    - Use Sonnet for coverage analysis
    - Add confidence scoring
    - _Requirements: 20.1_
    - **COMPLETED**: AI-powered gap analysis with Sonnet 4.5

- [ ] 7. Checkpoint - Ensure all auditor lambdas work independently
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Audit Orchestrator Lambda
  - [x] 8.1 Create orchestrator function structure
    - Set up Lambda handler with Python
    - Define orchestration interfaces
    - Add CloudWatch logging and metrics
    - _Requirements: 13.1, 17.3, 17.5_
    - **COMPLETED**: Created orchestrator with full coordination logic

  - [x] 8.2 Implement audit job creation
    - Create AuditJobRecord in DynamoDB
    - Validate no overlapping audits for same subject
    - Set up job metadata and status tracking
    - _Requirements: 13.5_
    - **COMPLETED**: Job creation with overlap prevention

  - [ ]* 8.3 Write property test for overlap prevention
    - **Property 41: Audit Overlap Prevention**
    - **Validates: Requirements 13.5**

  - [x] 8.4 Implement auditor invocation
    - Invoke appropriate auditor lambdas based on audit type
    - Handle parallel execution for multiple audit types
    - Track progress and update job status
    - _Requirements: 13.1_
    - **COMPLETED**: Sequential invocation with result aggregation

  - [x] 8.5 Implement notification system
    - Send notifications on audit completion
    - Include finding summaries in notifications
    - _Requirements: 13.2_
    - **COMPLETED**: SNS-based notifications

  - [ ]* 8.6 Write property test for completion notifications
    - **Property 38: Audit Completion Notification**
    - **Validates: Requirements 13.2**

  - [x] 8.6 Implement retry logic with exponential backoff
    - Add retry mechanism for failed audits
    - Implement exponential backoff delays
    - Log retry attempts
    - _Requirements: 13.3, 19.1_
    - **COMPLETED**: Exponential backoff with max 3 retries

  - [ ]* 8.7 Write property test for retry backoff
    - **Property 39: Audit Retry with Exponential Backoff**
    - **Validates: Requirements 13.3, 19.1**

  - [x] 8.8 Implement scheduled audit support
    - Add EventBridge integration for scheduled triggers
    - Support configurable schedules per subject
    - _Requirements: 13.4_
    - **COMPLETED**: Schedule action support (EventBridge config needed)

  - [ ]* 8.9 Write property test for schedule enforcement
    - **Property 40: Audit Schedule Enforcement**
    - **Validates: Requirements 13.4**

- [x] 9. Implement Update Executor Lambda
  - [x] 9.1 Create executor function structure
    - Set up Lambda handler with Python
    - Define execution interfaces
    - Add CloudWatch logging
    - _Requirements: 9.1, 17.3_
    - **COMPLETED**: Created update executor Lambda

  - [x] 9.2 Implement atomic transaction handling
    - Create transaction wrapper for DynamoDB
    - Implement rollback on any failure
    - _Requirements: 16.1, 16.2_
    - **COMPLETED**: Transaction handling with error recovery

  - [ ]* 9.3 Write property tests for atomicity
    - **Property 21: Batch Operation Atomicity**
    - **Validates: Requirements 8.2, 16.2**
    - **Property 50: Multi-Change Atomicity**
    - **Validates: Requirements 16.1**

  - [x] 9.4 Implement INSERT operation
    - Add new concepts without modifying existing IDs
    - Validate schema compliance before commit
    - Create version snapshot
    - _Requirements: 9.1, 16.5_
    - **COMPLETED**: INSERT with ID preservation

  - [ ]* 9.5 Write property test for INSERT operation
    - **Property 24: INSERT Operation ID Preservation**
    - **Validates: Requirements 9.1**

  - [x] 9.6 Implement UPDATE operation
    - Modify only specified fields
    - Preserve all other fields
    - Validate schema compliance before commit
    - Create version snapshot
    - _Requirements: 9.2, 16.5_
    - **COMPLETED**: UPDATE with field isolation

  - [ ]* 9.7 Write property test for UPDATE operation
    - **Property 25: UPDATE Operation Field Isolation**
    - **Validates: Requirements 9.2**

  - [x] 9.8 Implement DELETE operation
    - Remove concept
    - Update all TRACES connections referencing it
    - Execute in single transaction
    - Create version snapshot
    - _Requirements: 9.3, 16.4_
    - **COMPLETED**: DELETE with reference cleanup

  - [ ]* 9.9 Write property tests for DELETE operation
    - **Property 26: DELETE Operation Reference Cleanup**
    - **Validates: Requirements 9.3**
    - **Property 52: Delete Operation Atomicity**
    - **Validates: Requirements 16.4**

  - [x] 9.10 Implement RELINK operation
    - Update TRACES connections
    - Validate both source and target exist
    - Maintain connection integrity
    - Create version snapshot
    - _Requirements: 9.4, 16.3_
    - **COMPLETED**: RELINK with validation

  - [ ]* 9.11 Write property tests for RELINK operation
    - **Property 27: RELINK Operation Connection Validity**
    - **Validates: Requirements 9.4**
    - **Property 51: TRACES Connection Validation**
    - **Validates: Requirements 16.3**

  - [x] 9.12 Implement ENRICH operation
    - Add new schema fields
    - Preserve existing field values
    - Validate schema compliance before commit
    - Create version snapshot
    - _Requirements: 9.5, 16.5_
    - **COMPLETED**: ENRICH with field preservation

  - [ ]* 9.13 Write property tests for ENRICH operation
    - **Property 28: ENRICH Operation Field Addition**
    - **Validates: Requirements 9.5**
    - **Property 53: Post-Update Schema Validation**
    - **Validates: Requirements 16.5**

  - [x] 9.14 Implement error handling and recovery
    - Rollback on failure
    - Log errors
    - Create findings for malformed content
    - _Requirements: 19.2, 19.3_
    - **COMPLETED**: Error handling with status updates

  - [ ]* 9.15 Write property tests for error handling
    - **Property 59: Failure Rollback and Logging**
    - **Validates: Requirements 19.2**
    - **Property 60: Malformed Content Handling**
    - **Validates: Requirements 19.3**

- [ ] 10. Checkpoint - Ensure all backend lambdas work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement Express API endpoints for audit management
  - [ ] 11.1 Create audit management routes
    - Implement GET /api/curator/audits (list with filters)
    - Implement GET /api/curator/audits/:auditId (detail view)
    - Implement POST /api/curator/audits/trigger (on-demand)
    - Add authentication middleware (Cognito)
    - Add authorization checks (curator role)
    - _Requirements: 14.1, 15.1, 15.2_

  - [ ]* 11.2 Write property tests for audit API
    - **Property 11: Audit Queue Filtering**
    - **Validates: Requirements 5.2**
    - **Property 12: Audit Queue Sorting**
    - **Validates: Requirements 5.3**
    - **Property 13: Audit Metadata Completeness**
    - **Validates: Requirements 5.4**

  - [ ] 11.3 Implement on-demand audit features
    - Support priority handling (on-demand > scheduled)
    - Support scope filtering (concepts, objectives)
    - Track requests for analytics
    - Send immediate notifications on completion
    - _Requirements: 14.2, 14.3, 14.4, 14.5_

  - [ ]* 11.4 Write property tests for on-demand audits
    - **Property 42: On-Demand Audit Priority**
    - **Validates: Requirements 14.2**
    - **Property 43: On-Demand Audit Notification**
    - **Validates: Requirements 14.3**
    - **Property 44: On-Demand Audit Scope Filtering**
    - **Validates: Requirements 14.4**
    - **Property 45: On-Demand Audit Tracking**
    - **Validates: Requirements 14.5**

- [ ] 12. Implement Express API endpoints for finding management
  - [ ] 12.1 Create finding management routes
    - Implement POST /api/curator/findings/approve
    - Implement POST /api/curator/findings/reject
    - Implement PUT /api/curator/findings/:findingId (edit)
    - Add authorization checks
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 12.2 Write property tests for finding approval
    - **Property 19: Approval Status Update**
    - **Validates: Requirements 7.2, 7.3**
    - **Property 20: Audit Completion Detection**
    - **Validates: Requirements 7.5**

  - [ ] 12.3 Implement auto-approval workflow
    - Check confidence score and severity thresholds
    - Route to appropriate approval level (auto/curator/expert)
    - Log auto-approvals with reasoning
    - Support configurable thresholds
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 12.4 Write property tests for auto-approval
    - **Property 34: Auto-Approval Routing**
    - **Validates: Requirements 11.1, 11.2, 11.3**
    - **Property 35: Auto-Approval Logging**
    - **Validates: Requirements 11.4**
    - **Property 36: Auto-Approval Configuration Persistence**
    - **Validates: Requirements 11.5**

  - [ ] 12.5 Implement batch operations
    - Support batch approve/reject
    - Implement batch filtering
    - Require confirmation for high-severity batches
    - Generate summary reports
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 12.6 Write property tests for batch operations
    - **Property 22: Batch Filtering Accuracy**
    - **Validates: Requirements 8.4**
    - **Property 23: Batch Operation Summary Generation**
    - **Validates: Requirements 8.5**

- [ ] 13. Implement Express API endpoints for analytics
  - [ ] 13.1 Create analytics routes
    - Implement GET /api/curator/analytics (metrics)
    - Implement GET /api/curator/analytics/history (change log)
    - Calculate health scores, coverage, cost savings
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 13.2 Write property test for analytics calculations
    - **Property 37: Analytics Metric Calculation Accuracy**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

  - [ ] 13.3 Implement cost tracking
    - Track API costs per audit
    - Calculate cost savings vs full regeneration
    - Store cost data in analytics
    - _Requirements: 20.5_

  - [ ]* 13.4 Write property test for cost tracking
    - **Property 65: Cost Tracking Accuracy**
    - **Validates: Requirements 20.5**

- [ ] 14. Implement authentication and authorization
  - [ ] 14.1 Create auth middleware
    - Integrate with existing Cognito user pool
    - Verify JWT tokens
    - Extract user roles
    - Log auth events
    - _Requirements: 15.1, 15.4_

  - [ ]* 14.2 Write property tests for auth
    - **Property 46: Role-Based Access Control**
    - **Validates: Requirements 15.2**
    - **Property 47: Expert Action Authorization**
    - **Validates: Requirements 15.3**
    - **Property 48: Authentication Event Logging**
    - **Validates: Requirements 15.4**

  - [ ] 14.3 Implement session management
    - Support 8-hour session timeout
    - Require re-authentication after timeout
    - _Requirements: 15.5_

  - [ ]* 14.4 Write property test for session timeout
    - **Property 49: Session Timeout Enforcement**
    - **Validates: Requirements 15.5**

- [ ] 15. Implement monitoring and alerting
  - [ ] 15.1 Set up CloudWatch integration
    - Configure structured logging
    - Publish metrics (duration, finding count, success/failure)
    - Set up log groups per Lambda
    - _Requirements: 17.3, 17.5_

  - [ ]* 15.2 Write property tests for monitoring
    - **Property 56: CloudWatch Log Structure**
    - **Validates: Requirements 17.3**
    - **Property 57: CloudWatch Metrics Publication**
    - **Validates: Requirements 17.5**

  - [ ] 15.3 Implement error rate alerting
    - Track error rates per operation
    - Send alerts when error rate exceeds 5%
    - _Requirements: 19.5_

  - [ ]* 15.4 Write property test for error alerting
    - **Property 61: Error Rate Alerting**
    - **Validates: Requirements 19.5**

- [ ] 16. Checkpoint - Ensure all backend APIs work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement React Curator Dashboard route
  - [ ] 17.1 Create protected /curator route
    - Set up route with authentication guard
    - Redirect non-curators to home
    - Create main dashboard layout
    - _Requirements: 15.2_

  - [ ] 17.2 Create dashboard navigation
    - Add tabs for Queue, Analytics, History
    - Implement active view state management
    - _Requirements: 5.1_

- [ ] 18. Implement Audit Queue View component
  - [ ] 18.1 Create AuditQueueView component
    - Fetch audits from API with TanStack Query
    - Display audit list with metadata
    - Implement loading and error states
    - _Requirements: 5.1, 5.4_

  - [ ]* 18.2 Write property test for queue display
    - **Property 13: Audit Metadata Completeness**
    - **Validates: Requirements 5.4**

  - [ ] 18.3 Implement filtering controls
    - Add filter UI for subject, type, severity, status
    - Update query params on filter change
    - _Requirements: 5.2_

  - [ ]* 18.4 Write property test for filtering
    - **Property 11: Audit Queue Filtering**
    - **Validates: Requirements 5.2**

  - [ ] 18.5 Implement sorting controls
    - Add sort UI for date, priority, finding count
    - Update query params on sort change
    - _Requirements: 5.3_

  - [ ]* 18.6 Write property test for sorting
    - **Property 12: Audit Queue Sorting**
    - **Validates: Requirements 5.3**

  - [ ] 18.7 Implement pagination
    - Add pagination controls for large result sets
    - Support page tokens from API
    - _Requirements: 18.5_

  - [ ]* 18.8 Write property test for pagination
    - **Property 58: Pagination Implementation**
    - **Validates: Requirements 18.5**

- [ ] 19. Implement Audit Detail View component
  - [ ] 19.1 Create AuditDetailView component
    - Fetch audit and findings from API
    - Display audit metadata and summary
    - List all findings with expandable details
    - _Requirements: 6.1_

  - [ ]* 19.2 Write property test for detail display
    - **Property 14: Diff Visualization Completeness**
    - **Validates: Requirements 6.1**

  - [ ] 19.3 Implement DiffViewer component
    - Use react-diff-viewer-continued library
    - Show side-by-side comparison
    - Highlight additions (green) and deletions (red)
    - Support JSON and text modes
    - _Requirements: 6.2, 6.3_

  - [ ]* 19.4 Write property tests for diff viewer
    - **Property 15: Diff Color Coding**
    - **Validates: Requirements 6.2**
    - **Property 16: Field-Level Diff Display**
    - **Validates: Requirements 6.3**

  - [ ] 19.5 Display finding context
    - Show reason for change
    - Show confidence score
    - Show severity badge
    - _Requirements: 6.5_

  - [ ]* 19.6 Write property test for context display
    - **Property 17: Finding Context Completeness**
    - **Validates: Requirements 6.5**

  - [ ] 19.7 Implement approval controls
    - Add approve, reject, edit buttons per finding
    - Show confirmation dialogs
    - Handle API calls with loading states
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 19.8 Write property test for action availability
    - **Property 18: Approval Action Availability**
    - **Validates: Requirements 7.1**

- [ ] 20. Implement Batch Review Interface component
  - [ ] 20.1 Create BatchReviewInterface component
    - Add multi-select checkboxes for findings
    - Show selection summary (count, severity distribution)
    - Enable batch approve/reject buttons
    - _Requirements: 8.1_

  - [ ]* 20.2 Write property test for batch selection
    - **Property 18: Approval Action Availability**
    - **Validates: Requirements 7.1**

  - [ ] 20.3 Implement batch filtering
    - Add filter controls for type, severity, confidence
    - Update selection based on filters
    - _Requirements: 8.4_

  - [ ] 20.4 Implement batch confirmation
    - Show confirmation dialog for high-severity batches
    - Display impact summary
    - _Requirements: 8.3_

  - [ ] 20.5 Handle batch operations
    - Call batch approve/reject API
    - Show progress indicator
    - Display summary report on completion
    - _Requirements: 8.5_

- [ ] 21. Implement Analytics Dashboard component
  - [ ] 21.1 Create AnalyticsDashboard component
    - Fetch analytics data from API
    - Display content health scores by subject
    - Show audit coverage percentage
    - Display cost savings metrics
    - _Requirements: 12.1, 12.2, 12.5_

  - [ ] 21.2 Implement trend charts
    - Use Recharts library
    - Show update history trends over time
    - Show issue type distribution
    - _Requirements: 12.3, 12.4_

  - [ ] 21.3 Add time range selector
    - Support week, month, quarter, year views
    - Update charts on range change
    - _Requirements: 12.1_

- [ ] 22. Implement S3 integration for reports
  - [ ] 22.1 Set up S3 buckets
    - Create sensa-clm-reports bucket
    - Create sensa-clm-snapshots bucket
    - Configure encryption and bucket policies
    - _Requirements: 17.2_

  - [ ]* 22.2 Write property test for S3 encryption
    - **Property 55: S3 Encryption Enforcement**
    - **Validates: Requirements 17.2**

  - [ ] 22.3 Implement report storage
    - Store full audit reports in S3
    - Store diffs in S3
    - Generate pre-signed URLs for downloads
    - _Requirements: 17.2_

- [ ] 23. Implement infrastructure as code
  - [ ] 23.1 Create Lambda deployment configurations
    - Define Lambda functions in CDK/Terraform
    - Configure IAM roles and permissions
    - Set up environment variables
    - _Requirements: 17.1, 17.2, 17.4_

  - [ ] 23.2 Create EventBridge rules for scheduled audits
    - Define schedule expressions
    - Configure Lambda targets
    - _Requirements: 13.4_

  - [ ] 23.3 Create DynamoDB table definitions
    - Define tables with GSIs
    - Configure TTL settings
    - Set up backup policies
    - _Requirements: 17.1_

- [ ] 24. Final checkpoint - End-to-end integration testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Wire everything together
  - [ ] 25.1 Connect frontend to backend APIs
    - Configure API base URL
    - Set up TanStack Query client
    - Add error boundary components
    - _Requirements: 19.4_

  - [ ] 25.2 Test complete workflows
    - Test scheduled audit → review → approval → execution
    - Test on-demand audit → batch approval
    - Test rollback workflow
    - Test analytics and reporting
    - _Requirements: All_

  - [ ] 25.3 Add user documentation
    - Document curator workflows
    - Document API endpoints
    - Document deployment process
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: data layer → lambdas → API → frontend
- All Lambda functions use TypeScript with Node.js 20.x runtime
- Frontend uses React 18+ with TypeScript
- Authentication leverages existing Cognito infrastructure
