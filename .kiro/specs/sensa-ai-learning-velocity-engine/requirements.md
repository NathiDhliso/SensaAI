# Requirements Document

## Introduction

The SensaAI Learning Velocity Engine represents a revolutionary overhaul of the current learning system, implementing cognitive science research to create measurably faster and more effective learning. This system replaces passive content consumption with active recall-first learning, implementing spaced repetition, interleaving, and cognitive load optimization as core features.

## Glossary

- **Learning_Velocity_Engine**: The core system that optimizes learning speed through cognitive science principles
- **Diagnostic_First_Learning**: Starting with knowledge assessment before content presentation
- **Micro_Learning_Loop**: 2-minute test→learn→verify cycles that maximize retention
- **Blank_Sheet_Test**: Retrieval practice where learners write everything they know about a concept
- **Spacing_Engine**: Algorithm that schedules optimal review timing based on forgetting curves
- **Confusion_Prevention_System**: Proactive identification and drilling of commonly confused concepts
- **Velocity_Dashboard**: Real-time display of learning metrics and optimal next actions
- **Cognitive_Load_Optimizer**: System that manages intrinsic, eliminates extraneous, and maximizes germane cognitive load
- **SensaAI_Learning_Convention**: Branded naming pattern for all learning features

## Requirements

### Requirement 1: SensaAI Diagnostic-First Learning System

**User Story:** As a learner, I want to immediately test my existing knowledge so that I can focus on gaps rather than reviewing what I already know.

#### Acceptance Criteria

1. WHEN a user completes content generation, THE SensaAI_Learning_Velocity_Engine SHALL launch a diagnostic assessment instead of showing raw content
2. WHEN the diagnostic launches, THE System SHALL present 5-7 foundation concepts as quick knowledge checks
3. WHEN a user completes the diagnostic, THE System SHALL identify knowledge gaps and create a personalized learning sequence
4. THE diagnostic assessment SHALL complete within 3 minutes to minimize cognitive load
5. WHEN diagnostic results are processed, THE System SHALL immediately start the first micro-learning loop

### Requirement 2: SensaAI Micro-Learning Loop Implementation

**User Story:** As a learner, I want to learn in focused 2-minute bursts so that I can maintain high cognitive performance and retention.

#### Acceptance Criteria

1. WHEN a learning session begins, THE SensaAI_Learning_Velocity_Engine SHALL present concepts in test→learn→verify loops
2. WHEN a micro-loop starts, THE System SHALL begin with a blank sheet test for the target concept
3. IF the blank sheet test score exceeds 70%, THEN THE System SHALL mark the concept as mastered and advance
4. IF the blank sheet test score is below 70%, THEN THE System SHALL provide targeted learning content focusing on identified gaps
5. WHEN targeted learning completes, THE System SHALL conduct a verification test
6. THE micro-learning loop SHALL complete within 2 minutes to optimize cognitive load
7. WHEN a verification test passes, THE System SHALL schedule the concept for spaced repetition review

### Requirement 3: SensaAI Blank Sheet Test Component

**User Story:** As a learner, I want to demonstrate my knowledge through active recall so that I can identify what I truly understand versus what I think I know.

#### Acceptance Criteria

1. WHEN a blank sheet test begins, THE System SHALL present a text area with the prompt "Write everything you know about [concept]"
2. WHEN the user types, THE System SHALL track time spent and word count for velocity metrics
3. THE blank sheet test SHALL require minimum 50 characters before allowing submission
4. WHEN the test is submitted, THE System SHALL analyze the response against concept key points
5. THE System SHALL provide a score from 0-100 based on coverage of essential concept elements
6. WHEN scoring completes, THE System SHALL identify specific knowledge gaps for targeted learning
7. THE blank sheet interface SHALL eliminate extraneous cognitive load through clean, distraction-free design

### Requirement 4: SensaAI Spacing Engine for Optimal Review Timing

**User Story:** As a learner, I want my reviews scheduled at scientifically optimal intervals so that I maximize long-term retention with minimal time investment.

#### Acceptance Criteria

1. WHEN a concept is first mastered, THE SensaAI_Spacing_Engine SHALL schedule the first review for 1 day later
2. WHEN a review is completed successfully, THE System SHALL increase the interval using the sequence: 1, 3, 7, 14, 30 days
3. WHEN a review is failed, THE System SHALL reset the interval to 1 day
4. IF a concept has confusion pairs, THEN THE System SHALL apply a 0.7 multiplier to intervals to increase review frequency
5. WHEN calculating next review time, THE System SHALL consider cognitive load and confusion risk factors
6. THE Spacing_Engine SHALL prioritize due reviews over new concept learning
7. WHEN multiple reviews are due, THE System SHALL present them in order of urgency and interleave different concept types

### Requirement 5: SensaAI Confusion Prevention System

**User Story:** As a learner, I want to prevent concept confusion before it occurs so that I build clear, distinct mental models.

#### Acceptance Criteria

1. WHEN a concept is completed, THE SensaAI_Confusion_Prevention_System SHALL calculate confusion risk based on similar concepts
2. IF confusion risk exceeds 60%, THEN THE System SHALL trigger a confusion clarification drill
3. WHEN a confusion drill activates, THE System SHALL present side-by-side comparison of the confused concepts
4. THE confusion drill SHALL require the learner to identify key differences and provide examples
5. WHEN confusion drills are completed, THE System SHALL mark the concept as "confusion-resistant"
6. THE System SHALL track confusion prevention effectiveness and adjust risk thresholds accordingly
7. WHEN presenting confusion drills, THE System SHALL use positive framing focusing on distinctions rather than mistakes

### Requirement 6: SensaAI Learning Velocity Dashboard

**User Story:** As a learner, I want to see my learning velocity and optimal next actions so that I can maximize my learning efficiency.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE SensaAI_Velocity_Dashboard SHALL display current learning velocity in concepts per hour
2. THE dashboard SHALL show a trend indicator comparing current velocity to previous sessions
3. WHEN calculating next optimal action, THE System SHALL choose from: new concept, review due, confusion drill, or break needed
4. THE dashboard SHALL display retention rate as percentage of concepts still known after 24 hours
5. WHEN cognitive load is high, THE System SHALL recommend a break with specific duration
6. THE dashboard SHALL show spacing adherence as percentage of reviews completed on optimal schedule
7. THE velocity metrics SHALL update in real-time as learning activities are completed

### Requirement 7: SensaAI Cognitive Load Optimization

**User Story:** As a learner, I want the system to manage my cognitive load so that I can learn efficiently without mental fatigue.

#### Acceptance Criteria

1. THE SensaAI_Cognitive_Load_Optimizer SHALL eliminate all extraneous cognitive load factors from the interface
2. WHEN presenting content, THE System SHALL break complex concepts into maximum 7 elements simultaneously (Miller's Law)
3. THE System SHALL maintain consistent visual patterns and terminology throughout all interfaces
4. WHEN information is related, THE System SHALL present it together spatially and temporally
5. THE System SHALL remove all decorative elements, marketing language, and seductive details
6. WHEN users need to make choices, THE System SHALL limit options to maximum 4 to prevent choice overload
7. THE System SHALL use recognition over recall by providing prompts rather than requiring memory retrieval
8. WHEN presenting instructions, THE System SHALL use positive framing avoiding mental reversal requirements

### Requirement 8: SensaAI Interleaving Algorithm

**User Story:** As a learner, I want concepts presented in scientifically optimal order so that I build stronger discrimination and retention.

#### Acceptance Criteria

1. WHEN selecting the next concept, THE SensaAI_Interleaving_Algorithm SHALL avoid consecutive concepts from the same lifecycle phase
2. THE System SHALL balance concept selection across Foundation (40%), Keystone (35%), and Utility (25%) tiers
3. WHEN multiple concepts are ready, THE System SHALL prioritize based on prerequisite satisfaction (40%), interleaving benefit (30%), and tier balance (30%)
4. THE algorithm SHALL track the last concept type presented and actively select different types
5. WHEN a concept type has been avoided for too long, THE System SHALL override other factors to maintain balance
6. THE interleaving SHALL only activate after basic understanding is established to avoid confusion
7. WHEN interleaving is active, THE System SHALL provide brief context bridges between different concept types

### Requirement 9: SensaAI Learning Velocity Metrics Tracking

**User Story:** As a learner, I want detailed metrics about my learning performance so that I can identify areas for improvement and track progress.

#### Acceptance Criteria

1. THE SensaAI_Learning_Velocity_Engine SHALL track concepts mastered per hour as the primary velocity metric
2. THE System SHALL calculate retention rate by testing concepts 24 hours after initial mastery
3. WHEN blank sheet tests are completed, THE System SHALL record scores and time spent for velocity analysis
4. THE System SHALL track confusion rate as percentage of concepts that required confusion drills
5. WHEN reviews are due, THE System SHALL measure spacing adherence as percentage completed on optimal schedule
6. THE System SHALL calculate cognitive load optimization score based on session flow and break frequency
7. THE metrics SHALL be stored persistently and available for trend analysis across multiple sessions

### Requirement 10: SensaAI Session-Based Learning Architecture

**User Story:** As a learner, I want to commit to focused learning sessions so that I can achieve measurable progress in defined time blocks.

#### Acceptance Criteria

1. WHEN starting learning, THE SensaAI_Learning_Velocity_Engine SHALL require session goal selection from: master new concepts, review due items, confusion drilling, or exploration
2. THE System SHALL offer time commitment options: 15, 30, 45, 60 minutes, or custom duration
3. WHEN a session starts, THE System SHALL provide AI-generated recommendations based on current learning state
4. THE session SHALL track progress toward the stated goal and provide real-time completion percentage
5. WHEN session time expires, THE System SHALL complete the current micro-loop before ending
6. THE System SHALL provide session summary showing concepts completed, velocity achieved, and next recommended session
7. WHEN sessions are interrupted, THE System SHALL save progress and allow seamless resumption
