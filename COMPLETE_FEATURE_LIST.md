# Complete SensaAI Feature List

## What We Captured (10 screenshots)
✅ Library Page
✅ Content Launchpad  
✅ Study Overview Tab
✅ Learn Tab (Before Session)
✅ Session Configuration Modal
✅ Active ULC Matrix
✅ Blueprint Drawer (concept cell clicked)
✅ Concept Map
✅ Home Page
✅ Login Page

## What We MISSED (Many More Features!)

### 🎯 Core Learning Features

1. **VelocityLearning Engine** (Inside Learn Tab)
   - Micro-learning loop (Worked Example → Encode → Verify)
   - Faded examples for high-velocity learners
   - MCQ with confidence rating (1-5)
   - Calibration feedback
   - "Think Deeper" prompts

2. **ULC Practice Controller** (The Matrix)
   - Concepts × Verbs grid (PREPARE/MODEL/DELIVER)
   - Creator's Blueprint drawer
   - Perspective switcher (Portal/CLI/Terraform/etc.)
   - Shape lenses (Analogy/Core/Real Case/Pattern/Eliminate)
   - Execution checklist
   - "Explore Why" portal animation

3. **Concept Map Builder** (We got this!)
   - Interactive node-link diagram
   - Drag nodes, draw connections
   - Typed labels (requires/enables/is-part-of/causes/constrains/is-type-of)
   - AI connection suggestions
   - Gap detection
   - Undo/Redo (Ctrl+Z/Y)
   - Zoom, pan, fullscreen
   - Focus mode
   - Relationship legend
   - Inline label editor

### 🏋️ Gym Activities (Only 3 exist in code!)

4. **Peer Review Activity**
   - Simulated peer challenges
   - Defend your understanding
   - Counter-arguments
   - Scoring/feedback

5. **Pre-Mortem Activity**
   - Identify failure modes
   - Mitigation strategies
   - Common pitfalls

6. **Concept Map** (Also a gym activity)
   - Same as #3 above

**NOTE**: Blank Sheet Test and Creative Transfer Activity mentioned in your original list DON'T EXIST in the codebase!

### 📊 Dashboards & Feedback

7. **Mastery Dashboard** (SessionSummary component)
   - End-of-session summary
   - Completed concepts
   - Time spent
   - Streak counter
   - Equation health metrics
   - Review options

8. **Blueprint Formula Dashboard** (Equation Monitor)
   - Q_k (retention quality)
   - Q_r (recall quality)
   - Q_c (completion quality)
   - Q_f (focus quality)
   - Q_M (mental models quality)
   - Visual gauges/charts
   - Trend indicators
   - Recommendations

9. **Cognitive Gauge** (We captured this!)
   - Header widget
   - Cognitive load indicator
   - Bandwidth visualization
   - Color-coded status

10. **Celebration Modal** (We captured this!)
    - Animated celebration
    - "Concept Mastered!" message
    - Achievement badge
    - Stats display

11. **Neural Reset Banner**
    - Break suggestion on struggle
    - Idle time >90s detection
    - Error rate >3 detection
    - High backspace rate detection
    - Break suggestions (5-min walk, stretch, water)

### 🤖 AI & Personalization

12. **AI Coach** (CoachMessage component)
    - Mood-adjusted messages
    - Session start encouragement
    - Struggle support
    - Milestone celebration
    - 30s cooldown between messages
    - Multiple personas

13. **Struggle Detector** (useStruggleDetector hook)
    - Monitors idle time (>90s)
    - Tracks error rate (>3)
    - Monitors backspace rate (>40)
    - Triggers coach messages
    - Confidence scoring

14. **Metaphor Toggle** (We captured this!)
    - Scholarly vs metaphor-rich language
    - Switches UI language mode
    - Affects all content

15. **Session Configuration** (We captured this!)
    - Goal selection (learn-new/review/explore)
    - Duration slider
    - Difficulty preference
    - Practice mode (blocked/mixed/progressive)

16. **Mood Selector** (MoodSelector component)
    - Multiple mood options
    - Affects coach personality
    - Influences content tone

17. **Visual Theme System**
    - Scholarly mode
    - Metaphor-rich mode
    - Affects icons, language, presentation

### 📚 Content & Navigation

18. **Content Launchpad** (We captured this!)
    - Subject hub
    - Score card
    - Tier distribution chart
    - Knowledge health panel
    - Gym activity cards
    - Equation monitor widget

19. **Library/Saved Results** (We captured this!)
    - All saved learning systems
    - Search and filter
    - Sort by date/subject/quality
    - View/Learn/Delete actions
    - Cloud sync indicator
    - Public/private toggle
    - Cleanup duplicates

20. **Community Library**
    - Browse public content
    - Import others' learning systems

21. **Generation Flow**
    - Subject input
    - AI generation progress
    - Validation metrics
    - Save to library

### 🎨 UI Components

22. **Help Modal** (HelpModal component)
    - Keyboard shortcuts
    - Feature explanations
    - Quick tips

23. **Settings Panel** (SettingsPanel component)
    - Theme selection (Light/Dark/System)
    - Personalization options
    - Account settings

24. **Background Job Toast**
    - Generation progress
    - Job status updates

### 🔐 Authentication

25. **Login Page** (We captured this!)
26. **Signup Page**
27. **Confirm Signup**
28. **Forgot Password**
29. **Reset Password**
30. **Auth Callback**

## Summary

**Total Features in Codebase**: ~30+
**Features We Captured**: 10
**Missing from Screenshots**: ~20

### Key Missing Screenshots:
- Micro-learning loop phases (Worked Example, Encode, Verify)
- MCQ with confidence rating
- Peer Review activity in action
- Pre-Mortem activity in action
- Session Summary/Mastery Dashboard
- Blueprint Formula Dashboard with metrics
- Neural Reset Banner (when triggered)
- AI Coach messages (different moods/contexts)
- Mood Selector
- Settings Panel
- Help Modal
- Community Library
- Generation Flow
- Signup/Forgot Password pages

### Features That Don't Exist:
- ❌ Blank Sheet Test (mentioned in original list)
- ❌ Creative Transfer Activity (mentioned in original list)

These were in your original feature list but don't exist in the codebase!
