# Comprehensive Button Audit Report

> **Generated:** Manual audit of every `<button>`, `<motion.button>`, `role="button"`, and interactive `onClick` element across `src/`.
>
> **Total Files Audited:** 45 `.tsx` files containing interactive elements
>
> **Total Buttons Found:** ~210+
>
> **Stubs / No-Ops / Empty Handlers:** **0**
>
> **TODOs in button handlers:** **0** (1 TODO exists in `LearningErrorBoundary.tsx` `componentDidCatch` for Sentry — not button-related)

---

## Executive Summary

**Every single button in this application has a working handler.** No empty `onClick={() => {}}`, no `console.log(...)` stubs, no TODO/placeholder handlers were found on any button element. The codebase is clean.

---

## Audit by File

### Pages

#### `src/pages/Home.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | ~178 | Clear cert badge (X) | `handleClearCert` → clears selected cert | **WORKING** |
| 2 | ~190 | Cert dropdown items | `handleSelectCert(cert)` → sets cert state | **WORKING** |
| 3 | ~210 | Suggestion items | `handleSelectSuggestion(s)` → sets subject | **WORKING** |
| 4 | ~225 | AI suggest option | `handleSuggestStructure` → calls AI | **WORKING** |
| 5 | ~280 | Objectives toggle | `setObjectivesOpen(!open)` | **WORKING** |
| 6 | ~290 | Preview toggle | `setShowPreview(!show)` | **WORKING** |
| 7 | ~300 | Trunks toggle | `setTrunksOpen(!open)` | **WORKING** |
| 8 | ~315 | Trunk remove (X) | `removeTrunk(index)` | **WORKING** |
| 9 | ~320 | Trunk add (+) | `addTrunk()` | **WORKING** |
| 10 | ~370 | "Generate" | `handleGenerate` → triggers generation pipeline | **WORKING** |
| 11 | ~420 | Recent tag pills | `setSubject(tag)` | **WORKING** |
| 12 | ~450 | "Go to Library" | `navigate('/library')` | **WORKING** |
| 13 | ~460 | "Sign In" | `navigate('/login')` | **WORKING** |
| 14 | ~465 | "Create Account" | `navigate('/signup')` | **WORKING** |
| 15 | ~470 | Settings gear | `openSettingsPanel()` | **WORKING** |

#### `src/pages/Login.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Learner role toggle | `setLoginRole('learner')` | **WORKING** |
| 2 | — | Curator role toggle | `setLoginRole('curator')` | **WORKING** |
| 3 | — | Password visibility | `setShowPassword(!show)` | **WORKING** |
| 4 | — | Submit "Log In" | `handleSubmit` → Cognito `signIn()` | **WORKING** |

#### `src/pages/Landing.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Curator Mode" | `navigate('/curator')` | **WORKING** |
| 2 | — | "Learner Mode" | `navigate('/library')` | **WORKING** |

#### `src/pages/MasteryDashboard.tsx` (page)

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Cleanup duplicates | `handleCleanupDuplicates` → deduplication logic | **WORKING** |
| 2 | — | Import file | `handleImportClick` → file picker | **WORKING** |
| 3 | — | "Generate Learning System" (empty) | `navigate('/')` | **WORKING** |
| 4 | — | "Clear Search" | `setSearchQuery('')` | **WORKING** |
| 5 | — | View result | `navigate('/launchpad/${id}')` | **WORKING** |
| 6 | — | Learn result | `navigate('/study/${id}?tab=learn')` | **WORKING** |
| 7 | — | Toggle public/private | `conceptsApi.togglePublic()` | **WORKING** |
| 8 | — | Delete | `handleDelete` → confirmation + API | **WORKING** |

#### `src/pages/GymLaunchpad.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Back to Library" (error) | `navigate('/library')` | **WORKING** |
| 2 | — | "Back to Library" (header) | `navigate('/library')` | **WORKING** |
| 3 | — | Battery/equation indicator | `setShowEquationMonitor(true)` | **WORKING** |
| 4 | — | "Start Session" | `handleStartLearning` → starts learning session | **WORKING** |
| 5 | — | "Gym" tab | `setActiveTab('gym')` | **WORKING** |
| 6 | — | "Insights" tab | `setActiveTab('insights')` | **WORKING** |
| 7 | — | "Copy Concepts" | `handleCopyConcepts` → clipboard copy | **WORKING** |
| 8 | — | Review concept cards | `handleReviewConcept(id)` | **WORKING** |
| 9 | — | "Peer Review" activity | `handleGymActivity('peer-review')` | **WORKING** |
| 10 | — | "Pre-Mortem" activity | `handleGymActivity('pre-mortem')` | **WORKING** |
| 11 | — | Objectives cancel | `setObjectivesPanelOpen(false)` | **WORKING** |
| 12 | — | Objectives save | `handleSaveObjectives` | **WORKING** |
| 13 | — | Objectives clear | `handleClearObjectives` | **WORKING** |

#### `src/pages/UnifiedStudyRoom.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Help (?) | `setShowHelpModal(true)` | **WORKING** |
| 2 | — | "Refresh Page" (error) | `window.location.reload()` | **WORKING** |
| 3 | — | "Go to Dashboard" (error) | `navigate('/')` | **WORKING** |
| 4 | — | "Try Again" (error) | resets retry count | **WORKING** |

#### `src/pages/SignUp.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Submit "Create Account" | `handleSubmit` → Cognito `signUp()` | **WORKING** |

#### `src/pages/ResetPassword.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Password visibility | `setShowPassword(!show)` | **WORKING** |
| 2 | — | Submit "Reset Password" | `handleSubmit` → Cognito `confirmResetPassword()` | **WORKING** |

#### `src/pages/NotFound.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Go Home" | `navigate('/')` | **WORKING** |

#### `src/pages/ForgotPassword.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Enter Your Reset Code" | `navigate('/reset-password')` | **WORKING** |
| 2 | — | Submit "Send Reset Code" | `handleSubmit` → Cognito `resetPassword()` | **WORKING** |

#### `src/pages/DevSandbox.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Close forced activity | `setForcedActivity(null)` | **WORKING** |
| 2 | — | 3× activity launcher buttons | `setForcedActivity(type)` | **WORKING** |
| 3 | — | 5× core navigation buttons | `navigate(path)` | **WORKING** |
| 4 | — | 5× dynamic page buttons | `navigate(path)` with params | **WORKING** |

#### `src/pages/CuratorDashboard.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Switch to Learner Mode" | `navigate('/library')` | **WORKING** |

#### `src/pages/CommunityLibrary.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | 3× sort pill buttons | `setSortBy(value)` | **WORKING** |
| 2 | — | Result card "View" | `navigate('/launchpad/${id}')` with community state | **WORKING** |

#### `src/pages/ConfirmSignUp.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Go to Sign Up" (fallback) | `navigate('/signup')` | **WORKING** |
| 2 | — | Submit "Verify & Confirm" | `handleSubmit` → Cognito `confirmSignUp()` | **WORKING** |
| 3 | — | "Resend Code" | `handleResend` → Cognito `resendSignUpCode()` | **WORKING** |

#### `src/pages/AuthCallback.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Back to Login" | `navigate('/login')` | **WORKING** |

---

### Layout Components

#### `src/components/layout/GlobalNav.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Home | `navigate('/home')` | **WORKING** |
| 2 | — | Library | `navigate('/library')` | **WORKING** |
| 3 | — | Community | `navigate('/community')` | **WORKING** |
| 4 | — | Curator (admin only) | `navigate('/curator')` | **WORKING** |
| 5 | — | Settings | `openSettingsPanel()` | **WORKING** |

#### `src/components/layout/StudyLayout.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Home | `navigate('/')` | **WORKING** |
| 2 | — | Tab buttons (Learn/Map) | `handleTabClick(tab)` | **WORKING** |
| 3 | — | Mobile tab dropdown trigger | `setIsTabMenuOpen(!open)` | **WORKING** |
| 4 | — | Mobile dropdown items | `handleTabClick(tab)` | **WORKING** |
| 5 | — | Settings | `openSettingsPanel()` | **WORKING** |

---

### UI Components

#### `src/components/ui/BackgroundJobToast.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Toast body (`role="button"`) | `handleGoToGenerate` → navigate | **WORKING** |
| 2 | — | "View Results" | `handleViewResults` → navigate | **WORKING** |
| 3 | — | Dismiss X | `handleDismiss` → clears toast | **WORKING** |

#### `src/components/ui/HelpModal.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Close X | `onClose` prop | **WORKING** |

---

### Settings

#### `src/components/settings/SettingsPanel.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Close X | `handleClose` | **WORKING** |
| 2 | — | "Log Out" | `logout()` → Cognito sign out | **WORKING** |
| 3 | — | "Save Profile" | `handleSaveProfile` → store update | **WORKING** |
| 4 | — | 3× theme buttons (Light/Dark/System) | `setTheme(value)` | **WORKING** |
| 5 | — | 2× visual theme (Modern/Scholarly) | `setVisualTheme(value)` | **WORKING** |
| 6 | — | Change persona toggle | `setShowPersonas(!show)` | **WORKING** |
| 7 | — | Persona selection buttons | `setSelectedPersona(id)` | **WORKING** |
| 8 | — | 3× practice mode buttons | `setPracticeMode(mode)` | **WORKING** |
| 9 | — | Stress-Free Mode toggle | `setStressFreeMode(!current)` | **WORKING** |

---

### Learning Components

#### `src/components/learning/ActiveLearningEngine.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Go to Library" (empty state) | `navigate('/')` | **WORKING** |
| 2 | — | Home button | `handleReturnToDashboard` | **WORKING** |
| 3 | — | Toggle Map/ULC | `setActiveTab` toggle | **WORKING** |
| 4 | — | "Deep Structure" | `setShowStructurePanel(true)` | **WORKING** |

#### `src/components/learning/MicroLearningLoopController.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "I have a solution in mind" (WorkedExample) | `handleReveal` → shows all steps | **WORKING** |
| 2 | — | Step reveal buttons (WorkedExample) | `handleStepReveal(index)` | **WORKING** |
| 3 | — | FadedExample step buttons | `handleStepReveal(index)` | **WORKING** |
| 4 | — | "I understand, let's verify" | `onComplete` callback | **WORKING** |
| 5 | — | Verify option buttons | `setSelectedAnswer(id)` | **WORKING** |
| 6 | — | "I'm ready to submit" | `setShowConfidencePrompt(true)` | **WORKING** |
| 7 | — | Confidence level buttons (3) | `setConfidence(level)` | **WORKING** |
| 8 | — | "Verify Answer" | `handleSubmit` → scoring logic | **WORKING** |
| 9 | — | "Skip this concept" | `onSkip` callback | **WORKING** |
| 10 | — | "Return to Map" | `onReturnToMap` or `onSkip` fallback | **WORKING** |

#### `src/components/learning/ULCPracticeController.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | L81 | Fullscreen toggle | `toggleFullscreen` → `requestFullscreen` / `exitFullscreen` | **WORKING** |

#### `src/components/learning/discovery/DeepStructureDiscovery.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Go to Generation Dashboard" (fallback) | `navigate('/')` | **WORKING** |
| 2 | — | "Skip to Concept Tree" | `onContinue` prop | **WORKING** |
| 3 | — | "Continue to Concept Tree" | `onContinue` prop | **WORKING** |

#### `src/components/learning/session/SessionSummary.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Close X | `dismissSessionSummary` | **WORKING** |
| 2 | — | "Take Break" | `handleTakeBreak` → dismiss + `startBreak()` | **WORKING** |
| 3 | — | "Continue Focus" | `handleContinueFocus` → dismiss + `startFocusSession()` | **WORKING** |

#### `src/components/learning/gym/GymActivityLauncher.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Back to Gym" header | `handleBackToGym` | **WORKING** |
| 2 | — | Concept picker trigger | `setShowConceptPicker(true)` | **WORKING** |
| 3 | — | Concept picker close X | `setShowConceptPicker(false)` | **WORKING** |
| 4 | — | Concept picker items | `setSelectedConceptId(id)` | **WORKING** |
| 5 | — | "Try Again" (result) | `handleRetry` | **WORKING** |
| 6 | — | "Next Concept" / "Back to Gym" (result) | advance or `handleBackToGym` | **WORKING** |
| 7 | — | "Back to Gym" tertiary (result) | `handleBackToGym` | **WORKING** |

#### `src/components/learning/launchpad/KnowledgeHealthPanel.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Launch Targeted Review" | `onLaunchTargetedReview(ids)` prop | **WORKING** |

---

### Cognitive Matrix

#### `src/components/learning/cognitive-matrix/CognitiveMatrixGrid.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Search clear X | `setSearchQuery('')` | **WORKING** |
| 2 | — | "Start Suggested" | `handleStartSuggested` → expands + scrolls to cell | **WORKING** |
| 3 | — | Expand/Collapse All | `expandAll` / `collapseAll` | **WORKING** |
| 4 | — | "Heatmap" toggle | `setHeatmap(h => !h)` | **WORKING** |
| 5 | — | ⌘K command palette | `setCmdOpen(true)` | **WORKING** |
| 6 | — | Focus close X "Exit Focus" | `setFocusedTrunkId(null)` | **WORKING** |
| 7 | — | Command palette items | `jumpToLeaf(entry)` → expand + scroll | **WORKING** |

#### `src/components/learning/cognitive-matrix/CognitiveMatrixGridParts.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | GridCell `<motion.button>` × N | `onCellTap(cell)` → opens drawer | **WORKING** |
| 2 | — | "Explore Why" | `onExploreWhy(leaf.conceptName)` | **WORKING** |
| 3 | — | "Dismiss" (drawer close) | `onCloseDrawer` | **WORKING** |
| 4 | — | Focus button (per trunk) | `onFocus` | **WORKING** |
| 5 | — | Branch label (`role="button"`) | `onToggle` → expand/collapse | **WORKING** |
| 6 | — | Trunk label (`role="button"`) | `onToggleTrunk` → expand/collapse | **WORKING** |

---

### Activities

#### `src/components/learning/activities/ConceptMapBuilder.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | 1177 | Save label ✓ | `saveLabel` → updates connection label | **WORKING** |
| 2 | 1180 | Cancel label edit ✕ | `setEditingConnectionId(null)` | **WORKING** |
| 3 | 1189 | Label preset chips (×4) | `setLabelInput(preset)` | **WORKING** |
| 4 | 1203 | Delete connection ✕ | `removeConnection(conn.id)` | **WORKING** |
| 5 | 1228 | Close AI panel × | `setShowAiPanel(false)` | **WORKING** |
| 6 | 1309 | "Rebuild Map" | `handleRebuild` → resets to build phase | **WORKING** |
| 7 | 1312 | "Continue Study" | `handleCompleteWithValidation` → calls `onComplete` | **WORKING** |
| 8 | 1370 | Close onboarding X | `setShowOnboarding(false)` | **WORKING** |
| 9 | 1396 | "Got it, let's start!" | `setShowOnboarding(false)` | **WORKING** |
| 10 | 1419 | Sidebar collapse toggle | `setSidebarCollapsed(!collapsed)` | **WORKING** |
| 11 | 1431 | "Add All & Layout" | `handleAddAll` → adds remaining + auto-layouts | **WORKING** |
| 12 | 1630 | Node delete X (per node) | `removeNode(node.id)` | **WORKING** |
| 13 | 1654 | Node info close | `setInspectedNodeId(null)` | **WORKING** |
| 14 | 1703 | Back / Exit | `onBack` prop | **WORKING** |
| 15 | 1712 | Return to ULC | `onReturnToULC` prop | **WORKING** |
| 16 | 1722 | Move tool | `setActiveTool('select')` | **WORKING** |
| 17 | 1729 | Group drag toggle | `setGroupDrag(g => !g)` | **WORKING** |
| 18 | 1736 | Connect tool | `setActiveTool('connect')` | **WORKING** |
| 19 | 1744 | Undo | `undo` → history stack | **WORKING** |
| 20 | 1752 | Redo | `redo` → history stack | **WORKING** |
| 21 | 1761 | Auto-layout | `autoLayout` → positions nodes | **WORKING** |
| 22 | 1769 | Fullscreen toggle | `requestFullscreen` / `exitFullscreen` | **WORKING** |
| 23 | 1785 | Mode toggle (Guided/Free) | `setMapMode` toggle | **WORKING** |
| 24 | 1826 | Zoom In | `handleZoomIn` | **WORKING** |
| 25 | 1832 | Zoom Out | `handleZoomOut` | **WORKING** |
| 26 | 1836 | Fit to View | `handleFitToView` | **WORKING** |
| 27 | 1867 | "Finished Map" / "Check Predictions" | `handleFinishMap` → validate/complete | **WORKING** |
| 28 | 1894 | Shortcuts panel close X | `setShowShortcuts(false)` | **WORKING** |
| 29 | 1924 | Shortcuts hint "?" | `setShowShortcuts(true)` | **WORKING** |

#### `src/components/learning/activities/PeerReviewActivity.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Reply" send button | `handleSubmit` → `handleDiagnosisSubmit` or `handleDefenseSubmit` with AI scoring | **WORKING** |

#### `src/components/learning/activities/PreMortemActivity.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Step card buttons (×N dynamic) | `handleSelect(index)` → checks answer | **WORKING** |

---

### Feedback / Modals

#### `src/components/learning/feedback/CelebrationModal.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Take a break" / "Rest in shade" | `onTakeBreak` prop | **WORKING** |
| 2 | — | "Continue" / "View Certificate" | `onContinue` prop | **WORKING** |
| 3 | — | "Share achievement" | `handleShare` → `navigator.share` / clipboard | **WORKING** |

#### `src/components/learning/feedback/ConnectionTypeModal.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Close X | `onCancel` prop | **WORKING** |
| 2 | — | 4× connection type cards | `handleSelect(type)` → `onConfirm` | **WORKING** |

#### `src/components/learning/feedback/NeuralResetModal.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Dismiss X | `dismissNeuralReset` from store | **WORKING** |

---

### Error Boundaries

#### `src/components/error/LearningErrorBoundary.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Recover Session" | `handleRecover` → retries render | **WORKING** |
| 2 | — | "Return to Dashboard" | `handleAbandon` → `window.location.href = '/'` | **WORKING** |

#### `src/components/error/AppErrorBoundary.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Refresh Page" | `window.location.reload()` | **WORKING** |
| 2 | — | "Go Home" | `window.location.href = '/'` | **WORKING** |

---

### Dashboard Components

#### `src/components/dashboard/MasteryDashboard.tsx` (component)

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Download certificate | `handleDownload` → canvas-to-PNG | **WORKING** |
| 2 | — | Print certificate | `handlePrint` → `window.print()` | **WORKING** |
| 3 | — | "Return to Dashboard" | `onReturnHome` prop | **WORKING** |
| 4 | — | "Review Concepts" | `onReviewConcepts` prop | **WORKING** |

#### `src/components/dashboard/BlueprintFormulaDashboard.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | L96 | Close X (conditional) | `onClose` prop | **WORKING** |

---

### Personalization

#### `src/features/personalization/components/MetaphorToggle.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | Quick toggle (compact) | `handleQuickToggle` → toggles metaphors + analytics | **WORKING** |
| 2 | — | Settings gear (compact) | `setShowPanel(!showPanel)` | **WORKING** |
| 3 | — | Master toggle (full) | `handleQuickToggle` | **WORKING** |

---

### CLM Feature Components

#### `src/features/clm/components/AuditDetailView.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Back to Queue" | `navigate('/curator/audits')` | **WORKING** |
| 2 | — | "Approve Selected" | `handleBatchApprove` → mutation | **WORKING** |
| 3 | — | "Reject Selected" | `handleBatchReject` → mutation | **WORKING** |
| 4 | — | "Execute N Approved Findings" | `handleExecute` → mutation | **WORKING** |
| 5 | — | "Select All Pending" / "Deselect All" | `handleSelectAll` | **WORKING** |

#### `src/features/clm/components/AuditQueueView.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Trigger Audit" | `setShowTriggerPanel(!show)` | **WORKING** |
| 2 | — | "Cancel" (trigger panel) | `setShowTriggerPanel(false)` | **WORKING** |
| 3 | — | "Run N Audits" | `handleTriggerSubmit(false)` → mutation | **WORKING** |
| 4 | — | "Force Re-run" | `handleTriggerSubmit(true)` → mutation | **WORKING** |
| 5 | — | "Previous" page | `setPage(page - 1)` | **WORKING** |
| 6 | — | "Next" page | `setPage(page + 1)` | **WORKING** |

#### `src/features/clm/components/LearnerFeedbackPanel.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Heatmap" view toggle | `setViewMode('heatmap')` | **WORKING** |
| 2 | — | "Problem Concepts" view toggle | `setViewMode('table')` | **WORKING** |
| 3 | — | "Clarifications" view toggle | `setViewMode('clarifications')` | **WORKING** |
| 4 | — | "Generate Clarifications" | `handleGenerateClarifications` → mutation | **WORKING** |

#### `src/features/clm/components/FindingCard.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Show / Hide Diff" | `setExpanded(!expanded)` | **WORKING** |
| 2 | — | "Approve" | `handleApprove` → mutation | **WORKING** |
| 3 | — | "Reject" | `handleReject` → `prompt()` + mutation | **WORKING** |

#### `src/features/clm/components/DependencyImpactAnalyzer.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Auto-Fix Available" (per connection) | `onAutoFix` prop | **WORKING** |
| 2 | — | "Apply Fix" (per suggestion) | `autoFix.mutate(id)` → mutation | **WORKING** |

#### `src/features/clm/components/SmartRegenerationRecommender.tsx`

| # | Line | Label / Description | Handler | Status |
|---|------|---------------------|---------|--------|
| 1 | — | "Execute [strategy]" (per card) | `handleExecute(strategy)` → mutation | **WORKING** |

---

## Summary

| Metric | Count |
|--------|-------|
| Files with buttons | 45 |
| Total `<button>` elements | ~185 |
| Total `<motion.button>` elements | ~10 |
| Total `role="button"` elements | 3 |
| Interactive divs with `onClick` | ~15 |
| **WORKING** handlers | **ALL** |
| **STUB** handlers | **0** |
| **NO-OP** handlers | **0** |
| **MISSING** handlers | **0** |
| Empty `onClick={() => {}}` | **0** |
| `console.log()` stubs | **0** |
| TODO/FIXME in handlers | **0** |

### Non-button-related TODOs found

| File | Location | Note |
|------|----------|------|
| `LearningErrorBoundary.tsx` | `componentDidCatch` | `// TODO: Send to error tracking service (e.g., Sentry)` — not a button handler |

---

**Conclusion:** The application has zero dead buttons. Every interactive element has a fully implemented handler that performs a meaningful action (navigation, state mutation, API call, or UI toggle).
