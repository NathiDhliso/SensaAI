# SensaAI Frontend Overview

## What You'll See in the Screenshots

This document describes what should appear in each screenshot of your frontend application.

---

## 🎯 Core Learning Path

### 1. Study Page (ULC Practice Controller)
**File**: `01-study-page-ulc-controller.png`

**Expected Content**:
- Cognitive matrix grid showing Concepts × Verbs
- Three verb columns: PREPARE, MODEL, DELIVER
- Concept rows with interactive cells
- Header with cognitive gauge
- AI coach message (if active)
- Metaphor toggle button
- Session timer/progress

**Key Components**:
- `ULCPracticeController.tsx`
- Tap any cell → opens inline drawer with:
  - 📐 Creator's Blueprint
  - Perspective switcher (Portal/CLI/Terraform)
  - Shape lenses (Analogy/Core/Real Case/Pattern/Eliminate)
  - Execution checklist
  - "Explore Why" portal → Concept Map

---

### 2. VelocityLearning Page
**File**: `02-velocity-learning.png`

**Expected Content**:
- Streamlined learning interface
- Velocity-optimized content presentation
- Quick navigation controls
- Progress indicators

---

### 3. Micro Learning Loop
**File**: `04-micro-learning-loop.png`

**Expected Content**:
- **Phase 1: Worked Example**
  - Real problem + solution walkthrough
  - Or Faded Example for high-velocity learners
  
- **Phase 2: Encode**
  - Key points summary
  - Hook sentence
  - Technical details
  - High-stakes scenario
  - "Think Deeper" prompt
  
- **Phase 3: Verify**
  - Multiple choice question
  - Confidence rating slider (1-5)
  - Calibration feedback

**Component**: `MicroLearningLoopController.tsx`

---

### 4. Concept Map Builder
**File**: `05-concept-map-builder.png`

**Expected Content**:
- Interactive node-link diagram
- Draggable concept nodes
- Connection lines with typed labels:
  - requires
  - enables
  - is-part-of
  - causes
  - constrains
  - is-type-of
- AI connection suggestions
- Gap detection highlights
- Toolbar with:
  - Undo/Redo (Ctrl+Z/Y)
  - Zoom controls
  - Pan controls
  - Fullscreen toggle
- Relationship legend
- Inline label editor
- Focus mode (when accessed from ULC)

**Component**: `ConceptMapBuilder.tsx`

---

## 🏋️ Gym Activities

### 5. Gym Activity Launcher
**File**: `06-gym-activity-launcher.png`

**Expected Content**:
- Grid of activity cards:
  - Peer Review
  - Pre-Mortem
  - Blank Sheet Test
  - Creative Transfer
- Activity descriptions
- Launch buttons
- Progress indicators
- Recommended activities highlighted

**Component**: `GymActivityLauncher.tsx`

---

### 6. Peer Review Activity
**File**: `07-peer-review-activity.png`

**Expected Content**:
- Simulated peer avatar/persona
- Challenge question from "peer"
- Your response input area
- Peer's counter-argument
- Defense/explanation prompt
- Scoring/feedback section

**Component**: `PeerReviewActivity.tsx`

---

### 7. Pre-Mortem Activity
**File**: `08-pre-mortem-activity.png`

**Expected Content**:
- Selected concept display
- "What could go wrong?" prompt
- Failure mode input fields
- Mitigation strategy inputs
- Common pitfalls suggestions
- Submit/review button

**Component**: `PreMortemActivity.tsx`

---

### 8. Blank Sheet Test
**File**: `09-blank-sheet-test.png`

**Expected Content**:
- Large text area for free recall
- Timer (optional)
- Concept name at top
- "Write everything you know" prompt
- Word count indicator
- Submit button
- Scoring against keywords (after submission)

**Component**: `BlankSheetTest.tsx`

---

### 9. Creative Transfer Activity
**File**: `10-creative-transfer-activity.png`

**Expected Content**:
- Original concept context
- Novel/unexpected context prompt
- "How would you apply this?" question
- Response input area
- Examples of creative applications
- Evaluation criteria

**Component**: `CreativeTransferActivity.tsx`

---

## 📊 Dashboards & Feedback

### 10. Mastery Dashboard
**File**: `11-mastery-dashboard.png`

**Expected Content**:
- Session summary card
- Completed concepts list
- Time spent
- Streak counter
- Equation health metrics
- Review options:
  - Schedule next session
  - Review weak areas
  - Continue learning
- Visual progress charts

**Component**: `MasteryDashboard.tsx`

---

### 11. Blueprint Formula Dashboard (Equation Monitor)
**File**: `12-blueprint-formula-dashboard.png`

**Expected Content**:
- Live learning health metrics:
  - **Q_k**: Retention quality
  - **Q_r**: Recall quality
  - **Q_c**: Completion quality
  - **Q_f**: Focus quality
  - **Q_M**: Mental models quality
- Visual gauges/charts for each metric
- Overall learning health score
- Trend indicators (↑↓)
- Recommendations based on metrics

**Component**: `BlueprintFormulaDashboard.tsx`

---

### 12. Cognitive Gauge
**File**: `13-cognitive-gauge.png`

**Expected Content**:
- Compact header widget
- Current cognitive load indicator
- Bandwidth visualization
- Color-coded status (green/yellow/red)
- Optional: Break suggestion

**Component**: `CognitiveGauge.tsx`

---

### 13. Celebration Modal
**File**: `14-celebration-modal-state.png`

**Expected Content** (if triggered):
- Animated celebration graphics
- "Concept Mastered!" message
- Concept name
- Achievement badge/icon
- Stats (time, accuracy, etc.)
- Continue button

**Component**: `CelebrationModal.tsx`

---

### 14. Neural Reset Banner
**File**: `15-neural-reset-banner.png`

**Expected Content** (if triggered):
- Banner at top of page
- "Time for a break?" message
- Struggle indicators:
  - Idle time >90s
  - Error rate >3
  - High backspace rate
- Break suggestions:
  - 5-minute walk
  - Stretch
  - Water break
- Dismiss/Take Break buttons

**Components**: `NeuralResetModal.tsx`, `NeuralResetBanner.tsx`

---

## 🤖 AI & Personalization

### 15. AI Coach Message
**File**: `16-ai-coach-message.png`

**Expected Content**:
- Coach avatar/icon
- Mood-adjusted message
- Context-aware content:
  - Session start encouragement
  - Struggle support
  - Milestone celebration
- Personality based on selected mood
- 30s cooldown indicator (optional)

**Component**: `CoachMessage.tsx`

---

### 16. Metaphor Toggle
**File**: `17-metaphor-toggle.png`

**Expected Content**:
- Toggle switch or button
- Two modes:
  - 📚 Scholarly (technical language)
  - 🎨 Metaphor-rich (analogies)
- Current mode indicator
- Example text showing difference

**Component**: `MetaphorToggle.tsx`

---

### 17. Session Configuration
**File**: `18-session-configuration.png`

**Expected Content**:
- Goal selection:
  - 🎯 Learn New (ZPD-based)
  - 🔄 Review (interleaving)
  - 🔍 Explore (free navigation)
- Duration slider/selector
- Difficulty preference
- Start session button
- Previous session stats

---

## 🚀 Content Launchpad

### 18. Content Launchpad Overview
**File**: `19-content-launchpad-overview.png`

**Expected Content**:
- Subject hub header
- Score card (overall progress)
- Tier distribution chart
- Knowledge health panel
- Gym activity cards grid
- Equation monitor widget
- Quick navigation to:
  - Study page
  - Concept map
  - Settings

**Component**: `ContentLaunchpad.tsx`

---

### 19. Launchpad Score Card
**File**: `20-launchpad-score-card.png`

**Expected Content**:
- Overall mastery score
- Concepts mastered count
- Time invested
- Streak information
- Level/tier indicator
- Progress bar

---

## 🌐 Additional Pages

### 20. Home Page
**File**: `21-home-page.png`

**Expected Content**:
- Hero section
- Search bar: "Search certifications or enter any subject..."
- "Generate Learning System" button
- Feature highlights
- Navigation menu

---

### 21. Login Page
**File**: `22-login-page.png`

**Expected Content**:
- Email input
- Password input
- "Sign In" button
- "Forgot password?" link
- "Sign up" link
- Social login options (if any)

---

### 22. Signup Page
**File**: `23-signup-page.png`

**Expected Content**:
- Name input
- Email input
- Password input
- Confirm password input
- "Create Account" button
- Terms acceptance checkbox
- "Already have an account?" link

---

## 🌙 Dark Mode

### 23-24. Dark Mode Views
**Files**: `24-study-page-dark-mode.png`, `25-launchpad-dark-mode.png`

**Expected Content**:
- Same layouts as light mode
- Dark background colors
- Light text
- Adjusted contrast
- Themed components

---

## Feature Summary

| Layer | Count | Features |
|-------|-------|----------|
| Core learning loop | 3 | ULC Matrix, Micro-Loop, Concept Map |
| Gym activities | 4 | Peer Review, Pre-Mortem, Blank Sheet, Creative Transfer |
| Dashboards/feedback | 5 | Mastery, Blueprint Formula, Cognitive Gauge, Celebration, Neural Reset |
| AI/personalization | 4 | Coach, Struggle Detector, Metaphor Toggle, Session Config |
| Launchpad | 1 | Content hub |
| **Total** | **17** | **Core features** |

---

## How to Capture

Run the capture script:

```powershell
# PowerShell
.\CAPTURE_SCREENSHOTS.ps1

# Or using npm
npm run capture-panoramas
```

See `SCREENSHOT_GUIDE.md` for detailed instructions.
