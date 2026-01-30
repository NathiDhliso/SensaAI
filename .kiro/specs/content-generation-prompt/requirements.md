# Requirements Document

## Introduction

The content generation system uses AI (Claude Sonnet 4) to generate structured learning content from user input. The current system prompt (4000+ lines) produces garbage output including nonsensical compound words ("House House+", "Castle Castle+"), circular definitions, and hallucinated content. This spec defines requirements for a rebuilt multi-phase prompt architecture that generates clean, accurate, minimal content aligned with actual feature needs.

## Glossary

- **System_Prompt**: The instructions sent to Claude AI to generate learning content
- **LearningConcept**: A single unit of knowledge with name, tier, dependencies, and educational content
- **SHAPE_Framework**: Structured educational content (Simple core, High-stakes example, Analogical model, Pattern recognition, Elimination logic)
- **Tier**: Classification of concept importance (foundation, keystone, utility)
- **Dependency**: Relationship between concepts where one concept requires understanding of another
- **Mnemonic_Anchor**: Visual metaphor for memory palace technique (e.g., "Volcano 🌋" for Virtual Network)
- **Phase**: A step in the multi-phase generation process
- **Hallucination**: AI generating false or nonsensical content not grounded in reality

## Requirements

### Requirement 1: Multi-Phase Generation Architecture

**User Story:** As a developer, I want the generation system to use multiple focused prompts instead of one massive prompt, so that each phase produces clean output without hallucination.

#### Acceptance Criteria

1. THE System_Prompt SHALL be split into exactly 3 phases (Domain Analysis, Content Generation, Validation)
2. WHEN Phase 1 completes, THE System SHALL pass Phase 1 output as context to Phase 2
3. WHEN Phase 2 completes, THE System SHALL pass Phase 2 output as context to Phase 3
4. THE System SHALL NOT proceed to next phase until current phase output is validated
5. WHEN any phase fails validation, THE System SHALL regenerate that phase only

### Requirement 2: Domain Analysis Phase (Phase 1)

**User Story:** As a content generator, I want to analyze the subject domain first, so that I understand the scope before generating detailed content.

#### Acceptance Criteria

1. WHEN Phase 1 executes, THE System SHALL generate a list of 20-50 concept names only
2. THE System SHALL classify each concept into exactly one tier (foundation, keystone, utility)
3. THE System SHALL identify dependencies between concepts using concept names
4. THE System SHALL NOT generate detailed content in Phase 1
5. THE System SHALL output valid JSON matching the DomainAnalysis schema

### Requirement 3: Content Generation Phase (Phase 2)

**User Story:** As a content generator, I want to generate detailed educational content for each concept, so that learners have structured material to study.

#### Acceptance Criteria

1. WHEN Phase 2 executes, THE System SHALL receive Phase 1 concept list as input
2. THE System SHALL generate SHAPE framework content for each concept
3. THE System SHALL generate lifecycle phases (PREPARE, MODEL, DELIVER) for each concept
4. THE System SHALL generate mnemonic anchors that are VISUAL METAPHORS not compound words
5. THE System SHALL NOT generate circular definitions where concept name appears in definition
6. THE System SHALL output valid JSON matching the ContentGeneration schema

### Requirement 4: Mnemonic Anchor Quality

**User Story:** As a learner, I want mnemonic anchors to be real visual metaphors, so that I can visualize them in a memory palace.

#### Acceptance Criteria

1. WHEN generating mnemonic anchor, THE System SHALL select a concrete physical object
2. THE System SHALL NOT create compound words (e.g., "House House+", "Castle Castle+")
3. THE System SHALL NOT use the concept name as the anchor (e.g., "API Gateway" → "Gateway")
4. THE System SHALL include an appropriate emoji representing the anchor
5. THE System SHALL write a vivid story connecting the anchor to the concept's function

### Requirement 5: Circular Definition Prevention

**User Story:** As a learner, I want concept definitions to explain the concept clearly, so that I understand what it means without confusion.

#### Acceptance Criteria

1. WHEN generating hookSentence, THE System SHALL NOT repeat the concept name in the definition
2. WHEN generating shape.simpleCore, THE System SHALL use zero jargon and explain in plain language
3. THE System SHALL NOT generate definitions like "X is X" or "X provides X functionality"
4. WHEN validation detects circular definition, THE System SHALL regenerate that field
5. THE System SHALL use concrete examples instead of abstract repetition

### Requirement 6: Validation Phase (Phase 3)

**User Story:** As a system administrator, I want generated content to be validated before storage, so that garbage content never reaches users.

#### Acceptance Criteria

1. WHEN Phase 3 executes, THE System SHALL validate all required fields exist
2. THE System SHALL check for circular definitions in hookSentence and simpleCore
3. THE System SHALL verify mnemonic anchors are not compound words
4. THE System SHALL validate dependencies reference existing concepts
5. WHEN validation fails, THE System SHALL return specific error messages for regeneration

### Requirement 7: Minimal Content Generation

**User Story:** As a cost-conscious developer, I want to generate only the content actually used by features, so that we minimize API costs and generation time.

#### Acceptance Criteria

1. THE System SHALL generate only fields consumed by the 4 main features
2. THE System SHALL NOT generate theoretical content not used in the UI
3. THE System SHALL prioritize foundation tier concepts (used in all learning phases)
4. THE System SHALL generate practice questions only for concepts with cognitiveLevel "apply" or higher
5. THE System SHALL skip optional fields when not explicitly requested

### Requirement 8: Dependency Graph Validation

**User Story:** As a learning session controller, I want concept dependencies to form a valid directed acyclic graph, so that learners progress in logical order.

#### Acceptance Criteria

1. WHEN validating dependencies, THE System SHALL detect circular dependencies
2. THE System SHALL ensure foundation concepts have zero or minimal dependencies
3. THE System SHALL ensure keystone concepts depend on foundation concepts
4. THE System SHALL ensure utility concepts depend on keystone or foundation concepts
5. WHEN circular dependency detected, THE System SHALL break the cycle by removing lowest-confidence edge

### Requirement 9: Confusion Pair Detection

**User Story:** As a learner, I want the system to identify commonly confused concepts, so that I can practice distinguishing them.

#### Acceptance Criteria

1. WHEN Phase 3 executes, THE System SHALL identify 3-5 concept pairs with similar names or functions
2. THE System SHALL generate a distinction key for each confusion pair
3. THE System SHALL provide "when to use A" and "when to use B" guidance
4. THE System SHALL NOT create confusion pairs for unrelated concepts
5. THE System SHALL output confusion pairs in valid JSON format

### Requirement 10: Practice Question Generation

**User Story:** As a learner, I want practice questions for each concept, so that I can test my understanding.

#### Acceptance Criteria

1. WHEN generating practice questions, THE System SHALL create 2-4 questions per concept
2. THE System SHALL include exactly 4 answer choices (A, B, C, D)
3. THE System SHALL mark exactly one answer as correct
4. THE System SHALL provide explanation for why correct answer is right
5. THE System SHALL provide explanation for why wrong answers are wrong

### Requirement 11: Cost Optimization

**User Story:** As a system administrator, I want to minimize AI API costs, so that the service remains affordable.

#### Acceptance Criteria

1. THE System SHALL use Claude Haiku for validation steps (10x cheaper than Sonnet)
2. THE System SHALL cache common subjects (AWS, Azure, Kubernetes) for 30 days
3. THE System SHALL batch concept generation (10 concepts per API call)
4. THE System SHALL skip regeneration when validation score > 90%
5. THE System SHALL provide cost estimate before generation starts

### Requirement 12: Error Recovery

**User Story:** As a user, I want generation to recover from partial failures, so that I don't lose all progress when one concept fails.

#### Acceptance Criteria

1. WHEN Phase 2 generates 40/47 concepts then fails, THE System SHALL save the 40 completed concepts
2. THE System SHALL allow retry of only the 7 missing concepts
3. WHEN retry succeeds, THE System SHALL merge new concepts with existing concepts
4. WHEN retry fails after 3 attempts, THE System SHALL mark concepts as "pending" and continue
5. THE System SHALL provide option to "Continue with partial content" or "Retry all"
