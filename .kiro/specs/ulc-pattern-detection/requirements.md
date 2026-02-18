# Universal Life Cycle (ULC) Pattern Detection & Visualization - Requirements

## Feature Overview

The Universal Life Cycle (ULC) Pattern Detection feature automatically identifies when a subject follows a systematic learning pattern where a consistent set of verbs (actions) are applied across multiple objects/resources. This pattern is common in technical certifications, professional exams, and structured domains.

**Example:** Azure AZ-104 requires administrators to **Create, Configure, and Monitor** six core resources: Identity, Governance, Storage, Networking, Compute, and Monitoring.

The feature surfaces this pattern to learners through an interactive matrix visualization, helping them understand the systematic structure of their subject and adopt a "how before why" learning approach.

---

## User Stories

### US-1: Automatic Pattern Detection
**As a** learner loading content for a structured certification exam  
**I want** the system to automatically detect if my subject follows a ULC pattern  
**So that** I can understand the systematic structure without manually analyzing concept names

**Acceptance Criteria:**
- AC-1.1: System extracts verbs from concept names (e.g., "Create Azure Storage" → verb: "Create")
- AC-1.2: System extracts objects/resources from concept names (e.g., "Create Azure Storage" → object: "Storage")
- AC-1.3: System identifies when the same verbs repeat across multiple objects (minimum 2 occurrences per verb)
- AC-1.4: System calculates confidence score (0-100) based on verb frequency, object frequency, and matrix coverage
- AC-1.5: Pattern is only shown when confidence ≥ 70%
- AC-1.6: System handles subjects with 6+ verbs by taking top 5 and showing a warning about multiple phases

### US-2: Interactive Matrix Visualization
**As a** learner viewing the Content Launchpad  
**I want** to see a visual matrix showing verbs × objects with my progress  
**So that** I can track which specific skills I've mastered and which need practice

**Acceptance Criteria:**
- AC-2.1: Matrix displays with objects as rows and verbs as columns
- AC-2.2: Each cell shows status: · (not started), ○ (learning), ✓ (mastered), — (empty/no concept)
- AC-2.3: Cells are color-coded based on status (using CSS variables)
- AC-2.4: Empty cells (no matching concept) are visually distinct and non-interactive
- AC-2.5: Matrix appears in the Gym tab between subject stats and Daily Stack section
- AC-2.6: Matrix is responsive and works on mobile devices

### US-3: Procedural "How" Tooltips
**As a** learner hovering over a ULC matrix cell  
**I want** to see the procedural "how" steps for that verb-object combination  
**So that** I can quickly understand what the procedure involves without navigating away

**Acceptance Criteria:**
- AC-3.1: Hovering over a non-empty cell displays a tooltip
- AC-3.2: Tooltip shows: verb + object title, concept name, and procedural steps (from phase1.execution)
- AC-3.3: Tooltip displays "Click to learn the procedure" if no procedural steps are available
- AC-3.4: Tooltip uses glass morphism design consistent with app styling
- AC-3.5: Tooltip positioning adjusts to avoid viewport edges

### US-4: Progress Tracking
**As a** learner progressing through my subject  
**I want** my ULC matrix to update based on my actual learning progress  
**So that** I can see which verb-object combinations I've mastered

**Acceptance Criteria:**
- AC-4.1: Cell status updates based on concept retention: ≥80% = mastered, ≥40% = learning, <40% = not-started
- AC-4.2: Progress persists across sessions (derived from spacing engine data)
- AC-4.3: Statistics show: completion %, cells mastered, objects completed, verbs completed
- AC-4.4: "Objects completed" counts objects where ALL verbs are mastered
- AC-4.5: "Verbs completed" counts verbs mastered across ALL objects

### US-5: Educational Guidance
**As a** learner encountering a ULC pattern for the first time  
**I want** to understand what the pattern means and how to use it  
**So that** I can adopt the systematic "how before why" learning approach

**Acceptance Criteria:**
- AC-5.1: Pattern explanation displays above the matrix
- AC-5.2: Explanation states: number of verbs, number of objects, and the pattern structure
- AC-5.3: Pro tip emphasizes "how before why" principle
- AC-5.4: "Learn More" button expands to show detailed usage instructions
- AC-5.5: Expanded section includes: systematic approach, how-before-why rationale, progress tracking, cross-object practice
- AC-5.6: Expanded section can be collapsed to reduce visual clutter

### US-6: Cell Interaction
**As a** learner viewing the ULC matrix  
**I want** to click on any cell to jump directly to that concept  
**So that** I can practice specific verb-object combinations

**Acceptance Criteria:**
- AC-6.1: Clicking a non-empty cell navigates to the concept review page
- AC-6.2: Empty cells are disabled and non-clickable
- AC-6.3: Cell hover state provides visual feedback (cursor change, subtle highlight)
- AC-6.4: Navigation preserves community content context if applicable

### US-7: Multiple Phase Detection
**As a** learner with content combining multiple courses (e.g., AZ-104 + AZ-305)  
**I want** to be notified when the system detects 6+ verbs  
**So that** I understand the content may need to be split into separate phases

**Acceptance Criteria:**
- AC-7.1: When 6+ verbs are detected, system takes top 5 most frequent
- AC-7.2: Warning message displays: "Note: X verbs detected. Showing top 5. Consider splitting into separate phases."
- AC-7.3: Warning appears in the explanation section above the matrix
- AC-7.4: Matrix still functions normally with the top 5 verbs

### US-8: Strict Detection (No Fallback)
**As a** learner with poorly structured content  
**I want** the ULC pattern to NOT appear if concepts lack clear verb-object structure  
**So that** I understand the content quality issue rather than seeing a forced pattern

**Acceptance Criteria:**
- AC-8.1: System does NOT infer verbs or objects when they're not explicitly present in concept names
- AC-8.2: System does NOT show ULC pattern if confidence < 70%
- AC-8.3: No fallback logic attempts to "guess" missing structure
- AC-8.4: Absence of ULC pattern indicates content needs better structuring

### US-9: Generation Prompt Enhancement (Backend)
**As a** content generator  
**I want** the generation prompts to encourage ULC-aware concept naming  
**So that** newly generated content automatically produces detectable ULC patterns

**Acceptance Criteria:**
- AC-9.1: TREE_GENERATION_PROMPT includes guidance on verb-object naming for procedural subjects
- AC-9.2: Prompt explains: "For procedural/technical subjects, name concepts as [Verb] [Object]"
- AC-9.3: Prompt provides examples: "Create Azure Storage Accounts", "Configure Virtual Networks", "Monitor Identity Services"
- AC-9.4: Prompt emphasizes consistency: use the same verbs across different objects when applicable
- AC-9.5: Guidance is conditional - only applies to procedural/technical subject types
- AC-9.6: Prompt does NOT force ULC structure on conceptual subjects (law, philosophy, etc.)
- AC-9.7: Generated content from enhanced prompts achieves ≥80% ULC detection rate for Azure/AWS certification content

---

## Non-Functional Requirements

### NFR-1: Performance
- Pattern detection completes within 100ms for subjects with up to 100 concepts
- Matrix rendering does not block UI thread
- Tooltip display has <50ms latency on hover

### NFR-2: Accessibility
- Matrix cells are keyboard navigable (tab order: left-to-right, top-to-bottom)
- Tooltips are accessible via keyboard focus
- Status indicators have text alternatives for screen readers
- Color is not the only indicator of status (symbols: ·, ○, ✓, — are used)

### NFR-3: Design Consistency
- All colors use CSS variables (no hardcoded hex values)
- Glass morphism effects match existing app patterns
- Spacing and typography follow design system
- Responsive breakpoints align with app standards

### NFR-4: Maintainability
- Detection logic is isolated in `ulc-detector.ts`
- Verb list is configurable (not scattered across codebase)
- Matrix component is self-contained and reusable
- Progress calculation is derived from existing spacing engine (no duplicate state)

---

## Technical Constraints

### TC-1: Data Sources
- Concept names are the ONLY source for verb/object extraction
- Progress data is derived from spacing engine retention scores
- No external APIs or manual configuration required

### TC-2: Browser Compatibility
- Must work in Chrome, Firefox, Safari, Edge (last 2 versions)
- Tooltip positioning must handle viewport constraints
- CSS Grid is acceptable (supported in all target browsers)

### TC-3: State Management
- ULC pattern state is local to ContentLaunchpad component
- Progress updates are reactive to spacing engine changes
- No global state pollution

---

## Implementation Phases

### Phase 1: Core Detection & Visualization (COMPLETED)
- ✅ US-1: Automatic Pattern Detection
- ✅ US-2: Interactive Matrix Visualization
- ✅ US-3: Procedural "How" Tooltips
- ✅ US-4: Progress Tracking
- ✅ US-5: Educational Guidance
- ✅ US-6: Cell Interaction
- ✅ US-7: Multiple Phase Detection
- ✅ US-8: Strict Detection

### Phase 2: Generation Enhancement (NEXT)
- 🔄 US-9: Generation Prompt Enhancement
  - Update `backend/lambda/shared/system_prompt.py`
  - Add ULC naming guidance to TREE_GENERATION_PROMPT
  - Test with Azure AZ-104 and AWS SAA content
  - Validate ≥80% detection rate

### Phase 3: Future Enhancements (BACKLOG)
1. **AI Coach ULC Guidance** - Context-aware reminders during learning sessions
2. **Gym Activity Filtering** - Filter practice activities by ULC cell
3. **Next Cell Recommendation** - Suggest optimal next cell based on completion strategy
4. **Manual ULC Override** - Allow users to manually define verbs/objects
5. **ULC Mode Toggle** - Strict mode that enforces systematic progression
6. **Cross-Subject ULC Comparison** - Compare ULC patterns across multiple subjects
7. **ULC Export** - Export matrix as image or PDF

---

## Out of Scope (Explicitly Excluded)

The following will NOT be implemented:

1. **Legacy Content Migration** - Old content without ULC structure will not be retrofitted
2. **Manual Verb/Object Tagging** - No UI for manually tagging concepts with verbs/objects
3. **ULC Pattern Editor** - No admin interface to edit detected patterns
4. **Multi-Language ULC** - Detection only works for English concept names

---

## Success Metrics

### Engagement Metrics
- **Pattern Recognition Rate**: % of subjects where ULC is detected (target: 40% for certification content)
- **Expansion Rate**: % of users who click "Learn More" (target: 60% on first view)
- **Cell Interaction Rate**: % of users who click matrix cells (target: 70%)

### Learning Outcome Metrics
- **Systematic Progression**: % of users who complete verbs for one object before moving to next (target: 50%)
- **Retention Improvement**: Compare retention scores for ULC subjects vs non-ULC subjects (target: +10%)
- **Completion Rate**: % of ULC matrix cells mastered (target: 75% within 30 days)

### Quality Metrics
- **Detection Accuracy**: Manual review of 50 subjects confirms correct pattern detection (target: 90% accuracy)
- **False Positive Rate**: % of subjects where ULC is shown but shouldn't be (target: <5%)
- **User Satisfaction**: Survey rating for ULC feature usefulness (target: 4.2/5)

---

## Dependencies

### Internal Dependencies
- `src/features/content-generation/parsers/types.ts` - ParsedConcept type
- `src/features/learning-session/algorithms/spacing-engine.ts` - Retention data
- `src/components/learning/launchpad/ContentLaunchpad.tsx` - Integration point
- `src/components/learning/launchpad/ContentLaunchpad.module.css` - Styling
- `backend/lambda/shared/system_prompt.py` - Generation prompts (Phase 2)

### External Dependencies
- `lucide-react` - Target icon
- `framer-motion` - AnimatePresence for expand/collapse
- React Router - Navigation on cell click

---

## Files to Modify

### Phase 1 (COMPLETED)
- ✅ `src/features/content-generation/parsers/ulc-detector.ts` - Detection logic
- ✅ `src/components/learning/launchpad/ContentLaunchpad.tsx` - Matrix visualization
- ✅ `src/components/learning/launchpad/ContentLaunchpad.module.css` - Matrix styling
- ✅ `docs/LEARN_HOW_TO_LEARN.md` - ULC documentation
- ✅ `docs/ULC_INTEGRATION_SPEC.md` - Integration specification

### Phase 2 (NEXT)
- 🔄 `backend/lambda/shared/system_prompt.py` - Add ULC naming guidance
- 🔄 Test generation with Azure AZ-104 content
- 🔄 Validate detection rate ≥80%

---

## Risk Assessment

### Risk 1: Over-Detection (False Positives)
**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:** Strict 70% confidence threshold, no fallback inference logic

### Risk 2: Under-Detection (False Negatives)
**Likelihood:** Medium  
**Impact:** Low  
**Mitigation:** Acceptable - absence of ULC indicates content quality issue, not a bug

### Risk 3: Performance with Large Subjects
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:** Detection runs once on load, matrix rendering is optimized with CSS Grid

### Risk 4: User Confusion
**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:** Clear explanation text, expandable details, tooltips with examples

---

## Glossary

- **ULC (Universal Life Cycle)**: A learning pattern where consistent verbs are applied across multiple objects
- **Verb**: An action word extracted from concept names (e.g., Create, Configure, Monitor)
- **Object**: A resource or entity extracted from concept names (e.g., Identity, Storage, Networking)
- **Cell**: A single verb-object combination in the ULC matrix
- **Confidence**: A 0-100 score indicating how strongly the subject follows a ULC pattern
- **How**: Procedural knowledge - the steps to execute (stable across contexts)
- **Why**: Contextual knowledge - the rationale for execution (varies by scenario)
- **Matrix Coverage**: Percentage of expected cells that have matching concepts

---

## Appendix: Example Subjects

### Example 1: Azure AZ-104 (High Confidence)
**Verbs:** Create, Configure, Monitor  
**Objects:** Identity, Governance, Storage, Networking, Compute, Monitoring  
**Confidence:** 95%  
**Matrix:** 3 verbs × 6 objects = 18 cells

### Example 2: AWS Solutions Architect (High Confidence)
**Verbs:** Design, Deploy, Optimize  
**Objects:** Compute, Storage, Database, Networking, Security  
**Confidence:** 88%  
**Matrix:** 3 verbs × 5 objects = 15 cells

### Example 3: Constitutional Law (Medium Confidence)
**Verbs:** Analyze, Argue, Distinguish  
**Objects:** Separation of Powers, Due Process, Equal Protection, Federalism  
**Confidence:** 72%  
**Matrix:** 3 verbs × 4 objects = 12 cells

### Example 4: General Programming (No Pattern)
**Verbs:** Various (no repetition)  
**Objects:** Various (no clear structure)  
**Confidence:** 35%  
**Result:** ULC not shown (below 70% threshold)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-18 | Kiro | Initial requirements document |
| 1.1 | 2026-02-18 | Kiro | Added US-9 (Generation Prompt Enhancement), implementation phases, legacy content exclusion |
