# Frontend Screenshot Capture Guide

This guide explains how to capture screenshots of all major user-facing pages in the SensaAI application.

## Quick Start

1. Start the development server:
   ```powershell
   npm run dev
   ```

2. (Optional) Start the backend server:
   ```powershell
   .\RESTART_BACKEND.ps1
   ```

3. Run the screenshot capture script:
   ```powershell
   .\CAPTURE_SCREENSHOTS.ps1
   ```

## What Gets Captured

### Core Learning Path (Study Page → VelocityLearning)

1. **Study Page (ULC Practice Controller)** - `01-study-page-ulc-controller.png`
   - The main study interface with the cognitive matrix grid
   - Concepts × verbs (PREPARE/MODEL/DELIVER)

2. **VelocityLearning Page** - `02-velocity-learning.png`
   - The velocity learning interface

3. **ULC Matrix Grid View** - `03-ulc-matrix-grid.png`
   - Close-up of the ULC matrix with concept cells

4. **Micro Learning Loop** - `04-micro-learning-loop.png`
   - 3-phase loop: Worked Example → Encode → Verify

5. **Concept Map Builder** - `05-concept-map-builder.png`
   - Interactive node-link diagram with drag/drop

### Gym Activities (Launchpad → GymActivityLauncher)

6. **Gym Activity Launcher** - `06-gym-activity-launcher.png`
   - Main launchpad with all gym activities

7. **Peer Review Activity** - `07-peer-review-activity.png`
   - Simulated peer challenge interface

8. **Pre-Mortem Activity** - `08-pre-mortem-activity.png`
   - Failure mode identification interface

9. **Blank Sheet Test** - `09-blank-sheet-test.png`
   - Free-recall test interface

10. **Creative Transfer Activity** - `10-creative-transfer-activity.png`
    - Novel context application interface

### Dashboards & Feedback

11. **Mastery Dashboard** - `11-mastery-dashboard.png`
    - End-of-session summary with metrics

12. **Blueprint Formula Dashboard** - `12-blueprint-formula-dashboard.png`
    - Equation Monitor with Q_k, Q_r, Q_c, Q_f, Q_M metrics

13. **Cognitive Gauge** - `13-cognitive-gauge.png`
    - Header widget showing cognitive load

14. **Celebration Modal** - `14-celebration-modal-state.png`
    - Milestone celebration (if triggered)

15. **Neural Reset Banner** - `15-neural-reset-banner.png`
    - Break suggestion on struggle detection

### AI & Personalization Layer

16. **AI Coach Message** - `16-ai-coach-message.png`
    - Mood-adjusted coach messages

17. **Metaphor Toggle** - `17-metaphor-toggle.png`
    - Scholarly vs metaphor-rich language switcher

18. **Session Configuration** - `18-session-configuration.png`
    - Goal selection (learn-new/review/explore) + duration

### Content Launchpad

19. **Content Launchpad Overview** - `19-content-launchpad-overview.png`
    - Subject hub with all components

20. **Launchpad Score Card** - `20-launchpad-score-card.png`
    - Score card component

### Additional Pages

21. **Home Page** - `21-home-page.png`
    - Landing page

22. **Login Page** - `22-login-page.png`
    - Authentication page

23. **Signup Page** - `23-signup-page.png`
    - Registration page

### Dark Mode

24. **Study Page (Dark Mode)** - `24-study-page-dark-mode.png`
25. **Launchpad (Dark Mode)** - `25-launchpad-dark-mode.png`

## Manual Screenshot Capture

If you prefer to capture screenshots manually:

```powershell
# Run specific test
npx playwright test tests/capture-screenshots.spec.ts --grep "Study Page"

# Run with UI mode to see what's happening
npx playwright test tests/capture-screenshots.spec.ts --ui

# Run in headed mode (see browser)
npx playwright test tests/capture-screenshots.spec.ts --headed
```

## Troubleshooting

### "Development server is not running"
Start the dev server: `npm run dev`

### "Backend server may not be running"
Some features require the backend. Start it with: `.\RESTART_BACKEND.ps1`

### Screenshots are blank or missing content
- Ensure you're logged in (auth state in `playwright/.auth/learner.json`)
- Check that the page routes exist
- Increase wait times in the test if content loads slowly

### Component not found
Some components only appear under specific conditions:
- **Celebration Modal**: Appears on concept mastery
- **Neural Reset Banner**: Appears on struggle detection
- **AI Coach**: Has 30s cooldown between messages

## Viewing Results

After capture, screenshots are saved to `./screenshots/`

View the full test report:
```powershell
npm run test:e2e:report
```

## Feature Summary

| Layer | Features |
|-------|----------|
| Core learning loop | 3 (ULC Matrix, Micro-Loop, Concept Map) |
| Gym activities | 4 (Peer Review, Pre-Mortem, Blank Sheet, Creative Transfer) |
| Dashboards/feedback | 5 (Mastery, Blueprint Formula, Cognitive Gauge, Celebration, Neural Reset) |
| AI/personalization | 4 (Coach, Struggle Detector, Metaphor Toggle, Session Config) |
| Launchpad | 1 |
| **Total** | **17 core features** |
