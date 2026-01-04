# Implementation Plan: SensaAI Learning Velocity Engine

## Overview

This implementation plan transforms the SensaAI learning system from passive content consumption to active recall-first learning through diagnostic assessments, micro-learning loops, spaced repetition, and cognitive load optimization. The implementation follows an incremental approach, building core components first, then integrating advanced features like confusion prevention and interleaving algorithms.

## Tasks

- [x] 0. **CRITICAL**: Enhance content generation for learning metadata
  - [x] 0.1 Extract structured learning data from generated content
    - Parse generated content to identify key points (3-7 per concept)
    - Extract prerequisite relationships between concepts
    - Identify tier level (Foundation/Keystone/Utility) automatically
    - _Requirements: 3.4, 3.5_

  - [x] 0.2 Generate assessment materials automatically
    - Create diagnostic questions from concept content
    - Generate expected key points for blank sheet scoring
    - Identify potential confusion pairs based on concept similarity
    - _Requirements: 1.2, 5.1_

  - [x] 0.3 Create SensaAILearningConcept metadata structure
    - Implement SensaAILearningConcept interface extensions
    - Store key points, diagnostic questions, confusion pairs
    - Validate metadata completeness before enabling velocity engine
    - _Requirements: 1.2, 3.4_

- [x] 1. Set up SensaAI Learning Velocity Engine foundation
  - Create core TypeScript interfaces and types for the learning velocity engine
  - Set up testing framework with property-based testing capabilities (Hypothesis or fast-check)
  - Create base store structure for session management and learning state
  - _Requirements: 1.1, 2.1, 10.1_

- [ ]* 1.1 Write property test for foundation setup
  - **Property 1: System initialization creates valid learning session structure**
  - **Validates: Requirements 1.1, 10.1**

- [ ] 1.2 **CRITICAL**: Technical spikes for high-risk areas
  - [ ] 1.2.1 SPIKE: Blank sheet scoring approach (2 days)
    - Evaluate options: keyword matching, OpenAI embeddings, spaCy NLP, hybrid
    - Test with 50 sample responses across 5 concepts
    - Measure accuracy vs manual scoring, latency, cost
    - Output: Decision document with chosen approach + rationale
    - _Requirements: 3.4, 3.5_

  - [ ] 1.2.2 SPIKE: Real-time metrics calculation strategy (1 day)
    - Decide: client-side vs server-side calculation
    - Determine update frequency and stale data handling
    - Test with simulated 100 concurrent users
    - Output: Architecture decision document
    - _Requirements: 6.7, 9.7_

- [x] 2. Implement SensaAI Diagnostic Launch System
  - [x] 2.1 Create DiagnosticLaunchSystem component
    - Replace Results page raw content display with diagnostic assessment launcher
    - Implement DiagnosticConceptSelector with ranking criteria (prerequisite weight, frequency weight, abstraction weight)
    - Create QuickKnowledgeCheck interface with multiple question types and confidence scoring
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement diagnostic session management
    - Create DiagnosticSession state management with 3-minute time limit
    - Implement knowledge gap analysis from diagnostic responses
    - Create automatic transition to first micro-learning loop
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]* 2.3 Write property test for diagnostic launch system
    - **Property 1: Diagnostic-First Learning Flow**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 3. Implement Micro-Learning Loop Controller
  - [x] 3.1 Create MicroLearningLoopController component
    - Implement test→learn→verify loop orchestration with adaptive timing (1-3 minutes based on concept complexity)
    - Create AdaptiveLoopTiming component considering concept complexity and user velocity history
    - Implement loop outcome determination (mastered/needs-learning/needs-review)
    - _Requirements: 2.1, 2.6_

  - [x] 3.2 Implement blank sheet test integration
    - Connect blank sheet test component to loop controller
    - Implement 70% mastery threshold logic
    - Create automatic advancement for high scores
    - _Requirements: 2.2, 2.3_

  - [x] 3.3 Implement targeted learning content delivery
    - Create gap-based content selection for scores below 70%
    - Implement verification test after targeted learning
    - Create spaced repetition scheduling for successful concepts
    - _Requirements: 2.4, 2.5, 2.7_

  - [ ]* 3.4 Write property test for micro-learning loops
    - **Property 2: Micro-Learning Loop Structure**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 4. Implement SensaAI Blank Sheet Test Component
  - [x] 4.1 Create BlankSheetTestComponent interface
    - Implement clean, distraction-free text area with specific prompt format
    - Create 50-character minimum validation before submission
    - Implement real-time typing metrics tracking (time, word count, velocity)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 Implement response analysis engine
    - Create concept key points analysis against user responses with confidence scoring
    - Implement 0-100 scoring algorithm with ambiguous element detection
    - Create specific knowledge gap identification with manual review flagging for uncertain cases
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ]* 4.3 Write property test for blank sheet tests
    - **Property 3: Blank Sheet Test Validation**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

- [x] 5. Checkpoint - Ensure core learning loop functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5.5 **CRITICAL**: User testing after core loop validation
  - [x] 5.5.1 Recruit 5-10 beta testers for core loop validation
    - Test with real users: Do they actually complete blank sheet tests?
    - Measure engagement: Do they find the test→learn→verify cycle valuable?
    - Collect feedback: What feels confusing or frustrating?
    - Output: User testing report with engagement metrics and feedback themes
    - _Requirements: Core loop validation_

  - [x] 5.5.2 Iterate based on user feedback
    - Address major usability issues identified in testing
    - Refine blank sheet test prompts and interface based on user behavior
    - Adjust adaptive timing based on real user completion patterns
    - Output: Updated core loop implementation with user-validated improvements
    - _Requirements: User-centered design validation_

- [x] 6. Implement SensaAI Spacing Engine
  - [x] 6.1 Create SensaAISpacingEngine component
    - Implement initial 1-day review scheduling for mastered concepts
    - Create interval sequence progression [1, 3, 7, 14, 30] days for successful reviews
    - Implement reset to 1-day interval for failed reviews
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Implement advanced spacing features
    - Create 0.7 multiplier application for concepts with confusion pairs
    - Implement cognitive load and confusion risk factor consideration
    - Create due review prioritization over new concept learning
    - _Requirements: 4.4, 4.5, 4.6_

  - [x] 6.3 Implement review scheduling and interleaving
    - Create urgency-based ordering for multiple due reviews
    - Implement different concept type interleaving in review sessions
    - Create ScheduledReview data model with persistence
    - _Requirements: 4.7_

  - [ ]* 6.4 Write property test for spacing engine
    - **Property 4: Spacing Algorithm Consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

- [x] 7. Implement SensaAI Velocity Dashboard
  - [x] 7.1 Create SensaAIVelocityDashboard component
    - Implement quality-adjusted velocity display (concepts per hour with retention weighting)
    - Create trend indicator comparing current to previous sessions
    - Implement optimal action recommendation with AI-default and user override capability
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Implement retention and adherence metrics
    - Create 24-hour retention rate calculation and display
    - Implement break recommendation system based on cognitive load
    - Create spacing adherence percentage tracking and display
    - _Requirements: 6.4, 6.5, 6.6_

  - [x] 7.3 Implement real-time metric updates
    - Create automatic metric updates as learning activities complete
    - Implement VelocityMetrics, RetentionMetrics, and AdherenceMetrics interfaces
    - Create OptimalAction recommendation engine
    - _Requirements: 6.7_

  - [ ]* 7.4 Write property test for velocity dashboard
    - **Property 6: Real-time Dashboard Metrics**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

- [x] 8. Implement Cognitive Load Optimizer
  - [x] 8.1 Create CognitiveLoadOptimizer component
    - Implement Miller's Law enforcement (maximum 7 elements simultaneously)
    - Create choice limitation system (maximum 4 options for user decisions)
    - Implement ContentChunk interface for cognitive load management
    - _Requirements: 7.2, 7.6_

  - [ ]* 8.2 Write property test for cognitive load optimization
    - **Property 7: Cognitive Load Limitation**
    - **Validates: Requirements 7.2, 7.6**

- [x] 9. Implement SensaAI Confusion Prevention System
  - [x] 9.1 Create ConfusionPreventionSystem component
    - Implement confusion risk calculation after concept completion
    - Create 60% threshold triggering for confusion clarification drills
    - Implement side-by-side concept comparison presentation
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 9.2 Implement confusion drill interactions
    - Create drill requirements for identifying key differences and providing examples
    - Implement "confusion-resistant" marking after successful drill completion
    - Create AdaptiveConfusionThreshold system adjusting based on domain, learner history, and effectiveness metrics
    - _Requirements: 5.4, 5.5, 5.6_

  - [ ]* 9.3 Write property test for confusion prevention
    - **Property 5: Confusion Prevention Activation**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6**

- [x] 10. Implement SensaAI Interleaving Algorithm
  - [x] 10.1 Create SensaAIInterleavingAlgorithm component
    - Implement consecutive lifecycle phase avoidance in concept selection
    - Create tier balance management (Foundation 40%, Keystone 35%, Utility 25%)
    - Implement weighted prioritization (prerequisite 40%, interleaving 30%, tier balance 30%)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 10.2 Implement advanced interleaving features
    - Create concept type tracking and active different type selection
    - Implement override system when concept types avoided too long
    - Create context bridge provision between different concept types
    - _Requirements: 8.4, 8.5, 8.7_

  - [x] 10.3 Implement interleaving activation control
    - Create conditional activation only after basic understanding established
    - Implement ContextBridge interface for smooth transitions
    - Create TierBalance and PriorityWeights management
    - _Requirements: 8.6_

  - [ ]* 10.4 Write property test for interleaving algorithm
    - **Property 8: Interleaving Balance Maintenance**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**

- [x] 11. Implement Learning Velocity Metrics Tracking
  - [x] 11.1 Create comprehensive metrics tracking system
    - Implement concepts mastered per hour as primary velocity metric
    - Create 24-hour retention rate calculation through concept retesting
    - Implement blank sheet test score and timing data recording
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 11.2 Implement advanced metrics calculation
    - Create confusion rate tracking (percentage of concepts requiring drills)
    - Implement spacing adherence measurement (percentage completed on optimal schedule)
    - Create cognitive load optimization score based on session flow and break frequency
    - _Requirements: 9.4, 9.5, 9.6_

  - [x] 11.3 Implement persistent metrics storage
    - Create persistent storage for all learning velocity metrics
    - Implement trend analysis capabilities across multiple sessions
    - Create LearningVelocityMetrics interface with comprehensive tracking
    - _Requirements: 9.7_

  - [ ]* 11.4 Write property test for metrics tracking
    - **Property 9: Learning Velocity Metrics Tracking**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**

- [x] 12. Implement Session-Based Learning Architecture
  - [x] 12.1 Create session goal selection system
    - Implement AI-recommended goal selection with 5-second auto-start countdown and user override option
    - Create time commitment options [15, 30, 45, 60, custom] minutes
    - Implement AI-generated recommendations based on current learning state with clear reasoning
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 12.2 Implement session progress tracking
    - Create real-time progress tracking toward stated goals with completion percentages
    - Implement graceful session ending (complete current micro-loop before ending when time expires)
    - Create session summary with concepts completed, velocity achieved, and next recommendations
    - _Requirements: 10.4, 10.5, 10.6_

  - [x] 12.3 Implement session interruption handling
    - Create progress saving for interrupted sessions
    - Implement seamless session resumption capabilities
    - Create SensaAILearningSession interface with comprehensive state management
    - _Requirements: 10.7_

  - [ ]* 12.4 Write property test for session architecture
    - **Property 10: Session-Based Learning Architecture**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**

- [x] 13. Integration and system wiring
  - [x] 13.1 Integrate all components into unified SensaAI Learning Velocity Engine
    - Connect diagnostic launch system to existing Results page
    - Wire micro-learning loops to spacing engine and confusion prevention
    - Integrate velocity dashboard with all metric tracking systems
    - _Requirements: All requirements integration_

  - [x] 13.2 Implement error handling and recovery systems
    - Create timeout handling for diagnostic assessments and micro-learning loops
    - Implement graceful degradation for component failures
    - Create offline capability for core learning functions
    - _Requirements: System reliability_

  - [ ]* 13.3 Write integration tests for complete learning flows
    - Test complete diagnostic → micro-learning → spaced repetition cycles
    - Test multi-session learning journeys with interruptions and resumptions
    - Test cross-component data consistency and state management
    - _Requirements: End-to-end system validation_

- [x] 13.4 **CRITICAL**: User onboarding experience
  - [x] 13.4.1 Create first-time user onboarding flow
    - Design guided introduction to blank sheet testing concept
    - Create practice session with low-stakes concept to build confidence
    - Implement progressive disclosure of advanced features (spacing, confusion prevention)
    - Output: Onboarding flow that gets users successfully through first complete learning loop
    - _Requirements: User adoption and retention_

  - [x] 13.4.2 Create contextual help and guidance system
    - Add tooltips and help text for unfamiliar learning concepts
    - Implement just-in-time explanations for learning science principles
    - Create fallback explanations when users struggle with blank sheet tests
    - Output: Help system that reduces confusion and abandonment
    - _Requirements: User experience optimization_

- [x] 14. **CRITICAL**: Performance optimization
  - [x] 14.1 Optimize blank sheet test analysis performance
    - Implement caching for concept key points and analysis patterns
    - Optimize response analysis algorithms for sub-second response times
    - Add loading states and progressive enhancement for slower connections
    - Output: Analysis completes within 2 seconds for 95% of responses
    - _Requirements: User experience and system performance_

  - [x] 14.2 Optimize real-time metrics calculation
    - Implement efficient incremental metric updates instead of full recalculation
    - Add client-side caching for frequently accessed metrics
    - Optimize database queries for metrics aggregation
    - Output: Dashboard updates within 500ms of learning activity completion
    - _Requirements: Real-time user experience_

- [x] 15. Add experimentation and analytics infrastructure (Phase 2 Enhancement)
  - [x] 15.1 Create ExperimentationEngine for A/B testing
    - Implement cohort assignment for testing spacing intervals, confusion thresholds, and loop durations
    - Create experiment tracking and results analysis capabilities
    - Enable data-driven optimization of learning parameters
    - _Requirements: System optimization and validation_

  - [x] 15.2 Create LearningAnalytics pipeline
    - Implement struggle pattern identification and optimal learning time detection
    - Create personalized insight generation from learning data
    - Implement retention prediction and effectiveness technique identification
    - _Requirements: Personalized learning optimization_

  - [x]* 15.3 Add motivational layer and emotional support
    - Create celebration system for milestones and achievements
    - Implement contextual encouragement during struggle periods
    - Create streak tracking and progress sharing capabilities
    - _Requirements: User engagement and retention_

## Implementation Guidelines

**CRITICAL: Before starting any task, always:**
1. **Examine existing files** to see what we can reuse and avoid creating unnecessary test files
2. **Check for existing implementations** that can be extended rather than replaced
3. **Verify file structure** and avoid duplicating functionality
4. **Skip test file creation** unless explicitly required for the task
5. **Reuse existing patterns** and interfaces where possible

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of core functionality
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation prioritizes core learning velocity features first, then advanced cognitive optimization features

- [x] 15. Add experimentation and analytics infrastructure (Phase 2 Enhancement)
  - [x] 15.1 Create ExperimentationEngine for A/B testing
    - Implement cohort assignment for testing spacing intervals, confusion thresholds, and loop durations
    - Create experiment tracking and results analysis capabilities
    - Enable data-driven optimization of learning parameters
    - _Requirements: System optimization and validation_

  - [x] 15.2 Create LearningAnalytics pipeline
    - Implement struggle pattern identification and optimal learning time detection
    - Create personalized insight generation from learning data
    - Implement retention prediction and effectiveness technique identification
    - _Requirements: Personalized learning optimization_

  - [x]* 15.3 Add motivational layer and emotional support
    - Create celebration system for milestones and achievements
    - Implement contextual encouragement during struggle periods
    - Create streak tracking and progress sharing capabilities
    - _Requirements: User engagement and retention_

- [x] 16. Final checkpoint - Ensure all tests pass and system integration works
  - Ensure all tests pass, ask the user if questions arise.

## Implementation Phases

Based on user feedback and friend's critical feedback, the implementation follows this phased approach:

**Phase 1: Core Loop (MVP)**
- Tasks 0, 1-5.5: Foundation, Content Generation Enhancement, Technical Spikes, Diagnostic Launch, Micro-Learning Loops, Blank Sheet Tests, User Testing
- Validates: Does the core mechanic work? Will users actually do blank sheet tests? Can we generate the required learning metadata?

**Phase 2: Intelligence Layer**  
- Tasks 6-9: Spacing Engine, Velocity Dashboard, Cognitive Load Optimizer, Confusion Prevention
- Validates: Can we accurately assess knowledge and provide adaptive learning?

**Phase 3: Optimization Layer**
- Tasks 10-14: Interleaving Algorithm, Metrics Tracking, Session Architecture, Integration, User Onboarding, Performance Optimization
- Validates: Do the optimizations measurably improve outcomes? Can users successfully adopt the system?

**Phase 4: Scale & Polish**
- Task 15: Experimentation infrastructure, analytics, motivational layer
- Validates: Can this work at scale with diverse users and content?

## Critical Task Prioritization (Based on Friend's Feedback)

**MUST DO FIRST (Blocking Tasks):**
1. **Task 0**: Content Generation Enhancement - Without learning metadata, nothing else works
2. **Task 1.2**: Technical Spikes - De-risk the highest uncertainty areas (blank sheet scoring, real-time metrics)
3. **Task 5.5**: User Testing - Validate core assumptions before building advanced features
4. **Task 13.4**: User Onboarding - Essential for user adoption and retention
5. **Task 14**: Performance Optimization - Critical for user experience

**EXECUTION ORDER DEPENDENCIES:**
- Task 0 must complete before any learning components (Tasks 2-12)
- Task 1.2 should complete before Tasks 4 (Blank Sheet) and 7 (Dashboard)
- Task 5.5 should complete before Phase 2 (Intelligence Layer)
- Task 13.4 should complete before any user-facing deployment
- Task 14 should complete before Phase 4 (Scale & Polish)

## Key Improvements Based on User Feedback

1. **Adaptive Timing**: Replaced rigid 2-minute loops with 1-3 minute adaptive timing based on concept complexity
2. **Confidence Scoring**: Added confidence scoring and manual review flagging for uncertain blank sheet analyses
3. **Smart Concept Selection**: Enhanced diagnostic system with explicit ranking criteria for foundation concept selection
4. **Adaptive Thresholds**: Made confusion prevention thresholds adaptive based on domain, learner, and effectiveness data
5. **Quality-Adjusted Metrics**: Enhanced velocity dashboard to show retention-weighted velocity, not just raw speed
6. **AI-Default Goals**: Flipped session goal selection to AI-recommended with user override, reducing cognitive load
7. **Experimentation Infrastructure**: Added A/B testing capabilities to validate learning science assumptions
8. **Analytics Pipeline**: Added learning analytics to surface personalized insights and optimize techniques
9. **Motivational Layer**: Added optional emotional support and celebration systems for user engagement

## Critical Improvements Based on Friend's Feedback

1. **Content Generation Enhancement (Task 0)**: Added critical foundation task to extract learning metadata from generated content - without this, the velocity engine cannot function
2. **Technical Risk Mitigation (Task 1.2)**: Added technical spikes for highest-risk areas (blank sheet scoring approach, real-time metrics strategy) to de-risk implementation
3. **User Validation (Task 5.5)**: Added user testing after core loop to validate fundamental assumptions before building advanced features
4. **User Onboarding (Task 13.4)**: Added comprehensive onboarding experience to ensure user adoption and reduce abandonment
5. **Performance Optimization (Task 14)**: Added performance optimization tasks to ensure system meets user experience requirements
6. **Execution Dependencies**: Restructured task order to ensure blocking tasks complete first and critical path is clear