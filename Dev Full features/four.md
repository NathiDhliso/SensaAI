## Product Vision & Market Position

### Core Value Proposition
SensaPBL is an AI-powered learning retention platform that helps professionals master complex technical subjects through active recall, spaced repetition, and structured learning phases. Unlike passive note-taking tools or basic flashcard apps, SensaPBL ensures knowledge transfer from recognition to real-world application.

### Target Market (Priority Order)
1. **Primary (Launch Focus):** Technical certification learners (AWS, Azure, GCP, Kubernetes) - 2M+ annual exam takers, willing to pay $15-20/mo
2. **Secondary:** Medical students (USMLE, licensing exams) - 500K+ students, proven Anki users seeking better UX
3. **Tertiary:** Graduate students (MBA, Law, Engineering) - 3M+ students
4. **Future:** Corporate training and compliance (B2B enterprise contracts)

### Business Model
**Free Tier:**
- 3 subjects maximum
- 3 AI generations/month
- Manual content entry unlimited
- Basic spaced repetition
- Text-only coach

**Pro Tier ($15-20/month):**
- Unlimited subjects
- 25 AI generations/month
- All coach personalities + voice
- Cloud sync across devices
- Advanced analytics
- Priority generation speed
- Export features (PDF, Anki, Markdown)

**Team/Enterprise ($50-100/user/month):**
- Custom knowledge bases
- Team progress tracking
- Admin dashboard
- SSO integration
- API access
- Compliance reporting

### Success Metrics
**Activation:** 60% of signups create first subject within 24 hours
**Engagement:** 40% WAU/MAU ratio, 15+ min average session
**Retention:** 40% D30 retention, 25% D90 retention
**Monetization:** 8% free→paid conversion, $18 ARPU, <5% monthly churn

---
Complete End-to-End Feature Specifications
1. AI Coach Feature (Complete Implementation)
Overview
The AI Coach provides personalized learning guidance with 5 distinct personalities, static voice lines, and mood-based adjustments.
Entry Points

Settings Page: Coach personality selector
Learning Session: Coach messages appear contextually during all phases
Progress Tracking: Coach celebrates milestones

Complete User Flow
A. Coach Selection (Settings)
User navigates to: /settings

UI Elements:
┌─────────────────────────────────────────────────────┐
│ Choose Your AI Coach                                 │
│                                                      │
│ [🔥 David Goggins]  [Selected ✓]                    │
│ "Stay hard! No excuses."                            │
│ Intensity: ████████ 5/5                             │
│ Warmth: ██ 2/5                                      │
│                                                      │
│ [🧘 Calm Sage]                                       │
│ "Wisdom through patience."                          │
│ Intensity: █ 1/5                                     │
│ Warmth: █████ 5/5                                   │
│                                                      │
│ [🎓 Socratic Guide]                                  │
│ "The answer is within you."                         │
│ Intensity: ██ 2/5                                    │
│ Directness: █ 1/5 (asks questions)                  │
│                                                      │
│ [🏆 Sports Coach]                                    │
│ "Let's go team!"                                    │
│ Intensity: ████ 4/5                                 │
│ Humor: ████ 4/5                                     │
│                                                      │
│ [🤖 Study Buddy]                                     │
│ "We're in this together!"                           │
│ Casual, friendly, relatable                         │
│                                                      │
│ [Preview Voice Sample 🔊]  [Save Selection]         │
└─────────────────────────────────────────────────────┘

Actions:
1. User clicks personality card → Card expands with full description
2. User clicks "Preview Voice Sample" → Plays sample audio from /public/audio/voice/
3. User clicks "Save Selection" → Stores in usePersonalizationStore
4. Success toast: "Coach updated to [Persona Name]"

Store Updates:
- usePersonalizationStore.selectedPersona = 'goggins' | 'sage' | 'socratic' | 'coach' | 'buddy'
- Persisted to localStorage via zustand persist middleware
B. Mood Selection (Pre-Session)
User navigates to: /study (Learning Session page)

Before starting any phase:

┌─────────────────────────────────────────────────────┐
│ How are you feeling today?                          │
│                                                      │
│ [ ] 🔥 Pumped - Ready to crush it!                  │
│ [ ] 😊 Good - Feeling focused                       │
│ [ ] 😐 Okay - Could use motivation                  │
│ [ ] 😓 Struggling - Need encouragement              │
│ [ ] 😴 Tired - Need gentle guidance                 │
│                                                      │
│ [Start Learning Session]                            │
└─────────────────────────────────────────────────────┘

Logic:
- User selects mood → useLearningStore.setMood(selectedMood)
- getMoodAdjustedIntro(selectedPersona, selectedMood) generates tailored intro
- Example: Goggins + Tired = "Tired? That's just your body lying to you. Let's start small."
- Example: Sage + Pumped = "Beautiful energy! Let's channel that wisely."

Coach Intro Appears:
┌─────────────────────────────────────────────────────┐
│ 🔥 David Goggins                          [🔊 Play] │
│                                                      │
│ "Tired? That's just your body lying to you.        │
│  Let's start small and build momentum."             │
│                                                      │
│ [Suggested Breathing: 4-7-8 Relaxation]            │
│ [Begin Session]                                      │
└─────────────────────────────────────────────────────┘

Actions:
1. User clicks [🔊 Play] → useVoice().play(coachMessage)
   - Checks STATIC_VOICE_LINES for pre-recorded audio
   - If found: Plays from /public/audio/voice/{filename}.mp3
   - If not found: Silent (no dynamic generation in production)
2. User clicks breathing suggestion → Modal with breathing exercise
3. User clicks "Begin Session" → Proceeds to Phase 1 (Prime)
C. Phase-Specific Coach Messages
Throughout learning session, coach provides contextual guidance:

PHASE 1 - PRIME (Set Intention)
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Time to work. No excuses. Write down WHY          │
│  you're here."                                      │
└─────────────────────────────────────────────────────┘

User writes intention → Submit

Coach responds based on situation:
- Intro: Initial greeting
- Encouragement: As user types
- Struggle: If user seems stuck (>2 min no input)
- Success: After submission
- Transition: Moving to next phase

PHASE 2 - SCOUT (Explore)
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Survey the battlefield. Know what you're          │
│  up against."                                       │
└─────────────────────────────────────────────────────┘

PHASE 1.5 - PREVIEW (Problem Preview)
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Look at these problems. These are your TARGETS.   │
│  Study them."                                       │
└─────────────────────────────────────────────────────┘

PHASE 2 - BUILD (Concept Map)
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Concept map time. Connect the dots. Find the      │
│  RELATIONSHIPS."                                    │
│                                                      │
│ [AI Suggestions: 3 connections found]              │
│ [Show Suggestions]                                  │
└─────────────────────────────────────────────────────┘

When user struggles (no connections added in 3 min):
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Can't find the connection? Dig deeper.            │
│  It's there."                                       │
│                                                      │
│ [Hint: Look for shared keywords]                   │
└─────────────────────────────────────────────────────┘

PHASE 2.5 - APPLY (Work Problems)
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Theory is nothing without practice.               │
│  Let's work problems."                              │
└─────────────────────────────────────────────────────┘

PHASE 3 - RETAIN (Blank Sheet Test)
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Blank sheet. No notes. Show me what you           │
│  ACTUALLY know."                                    │
└─────────────────────────────────────────────────────┘

After scoring (e.g., 75%):
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│                                                      │
│ Score: 75% - You pulled it from memory.            │
│ That's REAL knowledge.                              │
│                                                      │
│ Strength Areas:                                     │
│ ✓ Virtual Machines                                 │
│ ✓ Load Balancers                                   │
│ ✓ Storage Accounts                                 │
│                                                      │
│ Focus Areas:                                        │
│ ⚠ App Services (review needed)                     │
│ ⚠ Function Apps (review needed)                    │
│                                                      │
│ Next Review: Tomorrow at 2:00 PM                   │
│ [Schedule Review] [Continue Learning]              │
└─────────────────────────────────────────────────────┘

PHASE 4 - MASTER (Transfer Challenge)
┌─────────────────────────────────────────────────────┐
│ 🔥 Coach                                  [🔊 Play] │
│ "Final test. Can you APPLY this knowledge          │
│  anywhere? Prove it."                               │
└─────────────────────────────────────────────────────┘
### D. Voice Playback System (REDUCED SCOPE)

**Launch Version (Phase 1):**
- Text-only coach messages
- 2 coach personalities: "Motivator" (Goggins-style) and "Mentor" (Calm Sage)
- ~50 pre-written messages per personality (not 175)
- Add [🔊 Play] button but show "Voice coming soon" tooltip

**Phase 2 (After validation):**
- Add browser text-to-speech (free, instant)
- Voice options: Male/Female, Speed control
- No pre-recorded files needed

**Phase 3 (If users demand it):**
- Pre-recorded voice lines for key moments
- ~20 high-impact recordings per personality
- Use ElevenLabs or similar TTS API

**Implementation:**
```typescript
const { speak, isSpeaking } = useVoiceCoach();

// Phase 1: Text only
<CoachMessage 
  text={message}
  persona="motivator"
  onPlay={() => toast.info('Voice coming in next update!')}
/>

// Phase 2: Browser TTS
const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // Slightly slower
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
};

// Phase 3: Pre-recorded (later)
const audioUrl = VOICE_URLS[personaId]?.[messageKey];
if (audioUrl) {
  const audio = new Audio(audioUrl);
  audio.play();
}
```

**Coach Personality Reduction:**
- Launch with 2 personalities (not 5)
- "Motivator": Direct, intense, Goggins-style
- "Mentor": Calm, supportive, Socratic
- Add more based on user feedback

**Coach Settings (Simplified):**
┌─────────────────────────────────────────────────────┐
│ AI Coach Settings                                    │
│                                                      │
│ Active Persona:                                      │
│ (•) Motivator - "No excuses. Let's work."          │
│ ( ) Mentor - "Patience and wisdom."                │
│                                                      │
│ Message Frequency:                                   │
│ ( ) High - Every transition                         │
│ (•) Normal - Key moments only                       │
│ ( ) Low - Milestones only                           │
│ ( ) Off - No coach messages                         │
│                                                      │
│ [x] Show encouragement when struggling              │
│ [x] Celebrate milestones                            │
│                                                      │
│ 🔊 Voice: Coming soon                               │
└─────────────────────────────────────────────────────┘
E. Coach Settings
Full Settings Panel: /settings

┌─────────────────────────────────────────────────────┐
│ AI Coach Settings                                    │
│                                                      │
│ Active Persona:                                      │
│ [🔥 David Goggins ▼]                                │
│ "Stay hard! No excuses."                            │
│                                                      │
│ Voice Settings:                                      │
│ [x] Enable coach voice                              │
│ [ ] Auto-play voice messages                        │
│ Volume: ████████░░ 80%                              │
│                                                      │
│ Coaching Style:                                      │
│ Intensity: ████████ 5/5  [Adjust]                   │
│ Warmth: ██ 2/5  [Adjust]                            │
│ Humor: █ 1/5  [Adjust]                              │
│                                                      │
│ Message Frequency:                                   │
│ ( ) High - Message every phase transition           │
│ (•) Normal - Key moments only                       │
│ ( ) Low - Milestones only                           │
│                                                      │
│ [Test Current Settings] [Reset to Defaults]         │
└─────────────────────────────────────────────────────┘

Actions:
1. Change persona → Re-renders all coach UI elements
2. Toggle voice → Updates usePersonalizationStore.coachVoiceEnabled
3. Adjust sliders → Custom persona trait weights
4. Change frequency → Filters which messages display
5. Test → Plays sample message with current settings
6. Reset → Restores default persona configuration
Data Flow
typescript// 1. User selects persona
usePersonalizationStore.setSelectedPersona('goggins')

// 2. Coach message needed
const persona = getPersona('goggins') // from src/features/ai-coach/personas.ts
const message = getPersonaResponse('goggins', 'build', 'intro')
// Returns: "Concept map time. Connect the dots..."

// 3. Display with voice option
<CoachMessage 
  persona={persona}
  message={message}
  onPlayVoice={() => useVoice().play(message)}
/>

// 4. Voice playback
const filename = STATIC_VOICE_LINES[message]
// Returns: "goggins_build_intro.mp3"
const audio = new Audio(`/public/audio/voice/${filename}`)
audio.play()
```

### File Structure
```
src/features/ai-coach/
├── index.ts                    # Exports
├── personas.ts                 # 5 persona definitions + phase responses
├── voice/
│   ├── static-lines.ts        # 175 pre-recorded line mappings
│   └── useVoice.ts            # Audio playback hook
└── README.md                   # Feature documentation

public/audio/voice/
├── goggins_prime_intro.mp3
├── goggins_prime_encouragement.mp3
├── goggins_build_intro.mp3
├── sage_prime_intro.mp3
└── ... (175 total files)
```

### Edge Cases & Error Handling
1. **No persona selected**: Defaults to 'buddy' (friendly fallback)
2. **Missing audio file**: Silent graceful degradation, text still shows
3. **Audio blocked by browser**: Tooltip guides user to enable
4. **Custom persona traits**: Validated to prevent impossible combinations
5. **Long messages**: Truncated with "..." and [Read More] button
6. **Multiple voices playing**: Auto-stops previous before playing new

### Future Enhancements (Not Implemented Yet)
- Dynamic AI voice generation (requires API integration)
- Custom persona creator
- Voice speed/pitch controls
- Multi-language support
- Coach conversation history

---

## 2. Content Generation Feature (Complete Implementation)

### Overview
Generates structured learning content from user input using AWS Bedrock (Claude Sonnet 4) with a 4-pass validation system.

### Entry Points
- **Home Page**: "Generate New Content" button → `/generate`
- **Saved Results**: "Re-generate" button for existing subjects

### Complete User Flow

#### A. Generation Page - Initial State
```
User navigates to: /generate

┌─────────────────────────────────────────────────────┐
│ Generate Learning Content                            │
│                                                      │
│ What would you like to learn?                       │
│ ┌─────────────────────────────────────────────────┐│
│ │ Enter subject (e.g., "Azure Virtual Machines")  ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ [ ] I have study materials to upload                │
│                                                      │
│ [Continue]                                           │
└─────────────────────────────────────────────────────┘

Validation:
- Subject field: Min 3 characters, max 100 characters
- Shows character count: "12/100"
- [Continue] disabled until validation passes

Actions:
1. User types subject → Real-time character count
2. User checks upload checkbox → Expands file upload UI
3. User clicks [Continue] → Proceeds to context step
```

### B. AI Generation Options (SIMPLIFIED - Single Pass)

User selects "AI Generate" and clicks Continue:

┌─────────────────────────────────────────────────────┐
│ AI Generation Settings                               │
│                                                      │
│ Subject: AWS Solutions Architect                    │
│                                                      │
│ Depth: (•) Standard (30-45 concepts, ~60 min study) │
│        ( ) Quick (15-20 concepts, ~30 min study)    │
│        ( ) Deep (60+ concepts, ~120 min study)      │
│                                                      │
│ Focus Areas:                                         │
│ [x] Certification exam preparation                  │
│ [x] Practical real-world scenarios                  │
│ [x] Common mistakes & confusion pairs               │
│ [ ] Theoretical foundations                         │
│                                                      │
│ ⓘ Optional: Upload study materials to enhance      │
│   AI generation (PDF, DOCX, TXT - max 10MB)        │
│                                                      │
│ [Upload Materials] [Generate Content]               │
│                                                      │
│ Estimated time: 45-90 seconds                       │
│ Cost: ~$0.05-0.15 per generation                    │
│ Generation credits: 22 remaining this month         │
└─────────────────────────────────────────────────────┘

**SINGLE-PASS GENERATION:**
- One AI call instead of 4 passes (faster, cheaper)
- Combined prompt generates all content at once
- Post-processing validates and structures output
- 45-90 seconds total time (vs 3-5 minutes)
- Cost: $0.05-0.15 per generation (vs $0.30-3.00)

**Cost Optimization Strategies:**
1. Cache common subjects (AWS, Azure, K8s) - reuse for 30 days
2. Use Claude Haiku for validation steps (10x cheaper)
3. Rate limiting: 3 free gens/month, 25 for Pro tier
4. Pre-generate top 50 subjects and offer as templates

**Backend Implementation:**
```typescript
// Single comprehensive prompt instead of 4-pass system
const prompt = `
Generate learning content for: ${subject}

Create ${targetConceptCount} concepts with:
1. Tier classification (foundation/core/applied)
2. Dependencies between concepts
3. SHAPE framework for each concept
4. Practice questions
5. Confusion pair detection

Output format: JSON
Constraints: 
- Concepts must follow dependency order
- Include real-world examples
- Focus on ${focusAreas.join(', ')}
`;

const response = await bedrock.invoke({
  model: 'claude-sonnet-4',
  prompt,
  maxTokens: 16000 // ~40 concepts with full content
});

// Post-process: validate, score, structure
const validated = validateAndScore(response);
```
#### D. Generation Progress (Unstoppable)
```
Generation starts (BACKEND JOB - cannot be cancelled):

┌─────────────────────────────────────────────────────┐
│ Generating Content for "Azure Virtual Machines"     │
│                                                      │
│ Pass 1: Domain Analysis                             │
│ ████████████████████░░░░ 85%                        │
│ Analyzing subject domain and identifying concepts... │
│                                                      │
│ ⓘ Generation runs on the server. You can safely    │
│    close this page and return later.                │
│                                                      │
│ [View in Background]                                 │
└─────────────────────────────────────────────────────┘

After Pass 1 completes (Domain Analysis):
┌─────────────────────────────────────────────────────┐
│ Pass 1: Complete ✓                                  │
│ Found 47 core concepts across 3 tiers               │
│                                                      │
│ Pass 2: Dependency Mapping                          │
│ ████████████░░░░░░░░░░░░ 50%                        │
│ Mapping relationships between concepts...            │
└─────────────────────────────────────────────────────┘

After Pass 2 completes (Dependency Mapping):
┌─────────────────────────────────────────────────────┐
│ Pass 2: Complete ✓                                  │
│ Mapped 127 concept relationships                    │
│                                                      │
│ Pass 3: Content Generation                          │
│ ████████████████████████ 100%                       │
│ Generating detailed content for all concepts...     │
└─────────────────────────────────────────────────────┘

After Pass 3 completes (Content Generation):
┌─────────────────────────────────────────────────────┐
│ Pass 3: Complete ✓                                  │
│ Generated full content with SHAPE framework         │
│                                                      │
│ Pass 4: Quality Validation                          │
│ ████████████████████████ 100%                       │
│ Validating content quality...                       │
└─────────────────────────────────────────────────────┘

Progress Updates Via Polling:
Backend Implementation (src/features/content-generation/api/backend-client.ts):

1. POST /api/generate → Returns { jobId, sessionId }
2. Frontend polls: GET /api/jobs/{jobId}/status every 2 seconds
3. Response: { status: 'processing' | 'completed' | 'failed', progress: 65 }
4. On 'completed': Loads concepts from DynamoDB
5. On 'failed': Shows error with retry option

Error Handling:
- Network error → Retry with exponential backoff (2s, 4s, 8s)
- 429 Rate Limit → Increase poll interval to 10s
- Timeout (>15 min) → Show: "Taking longer than expected. Check back later?"
- 401 Auth Error → Redirect to login

User Can Navigate Away:
- Click [View in Background] → Returns to home
- Generation continues on server
- Badge on nav: "⚙ Generation in progress"
- Click badge → Returns to progress view
```

#### E. Use Community Content (Alternative to Generation)

Instead of generating new content, users can search and use existing content:

### Complete User Flow

#### A. Discover Existing Content (New User Experience)

User arrives at `/generate` and sees:

┌─────────────────────────────────────────────────────┐
│ What would you like to learn?                       │
│ ┌─────────────────────────────────────────────────┐│
│ │ Search: AWS Solutions Architect_____________    ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ 🔍 Found 12 existing learning paths:                │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ ⭐ AWS Solutions Architect Associate             ││
│ │ By: @sarah_cloud_guru • 2,847 learners          ││
│ │                                                   ││
│ │ 38 concepts • 6 stages • ~7 hours study         ││
│ │ ⭐⭐⭐⭐⭐ 4.8/5.0 (243 reviews)                  ││
│ │                                                   ││
│ │ "Best SAA prep I've found. Passed first try!"   ││
│ │ - @mike_devops                                   ││
│ │                                                   ││
│ │ Updated: 2 days ago • Version 3.2               ││
│ │ Tags: #certification #aws #2026-exam            ││
│ │                                                   ││
│ │ [Use This Content] [Preview] [Clone & Edit]     ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ AWS SAA-C03 (Official Study Guide)              ││
│ │ By: @aws_cert_official • 8,392 learners         ││
│ │                                                   ││
│ │ 52 concepts • 8 stages • ~12 hours study        ││
│ │ ⭐⭐⭐⭐⭐ 4.9/5.0 (891 reviews)                  ││
│ │ ✓ Expert Verified                                ││
│ │                                                   ││
│ │ [Use This Content] [Preview] [Clone & Edit]     ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ AWS SAA - Quick Review (20 concepts)            ││
│ │ By: @quick_learner • 421 learners               ││
│ │                                                   ││
│ │ 20 concepts • 4 stages • ~3 hours study         ││
│ │ ⭐⭐⭐⭐☆ 4.2/5.0 (87 reviews)                   ││
│ │                                                   ││
│ │ [Use This Content] [Preview] [Clone & Edit]     ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Not finding what you need?                          │
│ [Generate New Content with AI]                      │
└─────────────────────────────────────────────────────┘

#### F. Generation Complete
```
All 4 passes complete:

┌─────────────────────────────────────────────────────┐
│ 🎉 Generation Complete!                              │
│                                                      │
│ Subject: Azure Virtual Machines                     │
│ Generated: 47 concepts across 6 stages              │
│ Quality Score: 95/100                               │
│                                                      │
│ Breakdown:                                           │
│ • Foundation: 12 concepts (25%)                     │
│ • Keystone: 18 concepts (38%)                       │
│ • Utility: 17 concepts (37%)                        │
│                                                      │
│ • Diagnostic questions: 24 ready                    │
│ • Confusion pairs detected: 8                       │
│ • Spaced review schedule: Generated                 │
│                                                      │
│ [Start Learning] [View Library] [Download]          │
└─────────────────────────────────────────────────────┘

Store Updates:
1. useGenerationStore.setResult(generationResult)
2. useSubjectsStore.addSubject({
     id: sessionId,
     title: "Azure Virtual Machines",
     conceptCount: 47,
     generatedAt: new Date().toISOString(),
     stages: [...],
     concepts: [...]
   })
3. Save to cloud storage (DynamoDB + S3)
4. Cache in IndexedDB for offline access

Actions:
1. User clicks [Start Learning] → Navigate to `/study/${sessionId}`
2. User clicks [View Library] → Navigate to `/library`
3. User clicks [Download] → Dropdown menu:
   - Download JSON (raw data)
   - Download PDF (formatted document)
   - Download Markdown (study guide)
   - Export to Anki (flashcard deck)
```

#### G. Background Job Recovery
```
If user closed browser during generation:

User returns and navigates to /generate or /home:

Check for active jobs:
const activeJob = useGenerationStore.getState().activeJob

if (activeJob && activeJob.status === 'processing') {
  Show recovery modal:
  
  ┌─────────────────────────────────────────────────┐
  │ Resume Generation?                               │
  │                                                  │
  │ You have an unfinished generation:              │
  │ Subject: Azure Virtual Machines                 │
  │ Started: 15 minutes ago                         │
  │ Status: Processing (Pass 3 of 4)               │
  │                                                  │
  │ [Resume] [Cancel Job] [Check Status]           │
  └─────────────────────────────────────────────────┘
  
  Actions:
  1. [Resume] → Navigate to progress view, resume polling
  2. [Cancel Job] → Mark as abandoned (job continues server-side)
  3. [Check Status] → GET /api/jobs/{jobId}/status
     - If completed: Show "Generation finished! View results?"
     - If failed: Show error details + [Retry]
}

Server-Side Job Management:
- Jobs tracked in DynamoDB with TTL (24 hours)
- Completed jobs: concepts → DynamoDB, fullDocument → S3
- Failed jobs: error logged, user notified on next visit
- Abandoned jobs: Continue to completion, available for recovery
```

### Generation Architecture

#### Pass 1: Domain Analysis
```
Backend Lambda (generateWithBackend):

1. Receive request: { subject, userId, context }
2. Call AWS Bedrock with DOMAIN_ANALYSIS_PROMPT
3. Extract from Claude response:
   - Domain name
   - Professional role scope
   - Lifecycle phases (PREPARE → MODEL → DELIVER)
   - Core concepts list (47 names)
   - Numerical limits
   - Recent updates (if exam-based)
4. Store in DynamoDB: job_id → pass1_result
5. Return: { jobId, sessionId, status: 'pass1_complete' }

Example Response:
{
  domain: "Azure Virtual Machines",
  lifecycle: { phase1: "PREPARE", phase2: "MODEL", phase3: "DELIVER" },
  concepts: [
    "VM Sizes and Families",
    "Disk Configuration",
    "Network Interfaces",
    ...
  ],
  numericalLimits: [
    "Max 30,000 VMs per subscription",
    "Max 256 data disks per VM"
  ]
}
```

#### Pass 2: Dependency Mapping
```
2. Call Bedrock with DEPENDENCY_MAPPING_PROMPT + Pass1 data
3. For each concept, Claude identifies:
   - Prerequisites (dependsOn: string[])
   - Semantic connections (strictConnections: { target, type }[])
     Types: 'requires', 'extends', 'enables', 'contains', 'related-to'
   - Tier classification (foundation/keystone/utility)
4. Build dependency graph using buildSubjectGraph()
5. Store in DynamoDB: job_id → pass2_result

Example Response:
{
  concepts: [
    {
      name: "VM Sizes and Families",
      dependsOn: [],
      strictConnections: [
        { target: "Disk Configuration", type: "enables" }
      ],
      tier: "foundation"
    },
    {
      name: "Load Balancers",
      dependsOn: ["Network Interfaces", "Availability Sets"],
      strictConnections: [
        { target: "Network Interfaces", type: "requires" },
        { target: "Health Probes", type: "contains" }
      ],
      tier: "keystone"
    }
  ]
}
```

#### Pass 3: Content Generation (Parallel)
```
Lambda batches concepts into groups of 5-10:

Batch 1: Concepts 1-10
Batch 2: Concepts 11-20
Batch 3: Concepts 21-30
...

For each batch:
1. Call Bedrock with CONTENT_GENERATION_PROMPT + concept list
2. Claude generates for each concept:
   
   Phase 1 (PREPARE):
   - hookSentence: "Why this matters"
   - microMetaphor: Visual analogy
   - prerequisite: What you need first
   - selection: Key decision points
   - execution: How to begin
   
   Phase 2 (MODEL):
   - criticalDistinctions: Common confusions
   - designBoundaries: When NOT to use
   - examFocus: Key exam points
   
   Phase 3 (DELIVER):
   - tool: Verification method
   - metrics: Success indicators
   - thresholds: Pass/fail criteria
   
   SHAPE Framework:
   - simpleCore: One-sentence essence
   - highStakesExample: Real-world scenario
   - analogicalModel: Helpful metaphor
   - patternRecognition: Q&A for pattern matching
   - eliminationLogic: How to eliminate wrong answers
   
   Mnemonic (Memory Palace):
   - tier: foundation | keystone | utility
   - anchor: Visual symbol (e.g., "🏗 Foundation")
   - story: Memorable narrative linking concepts
   - parentName: Parent concept (for hierarchy)
   
3. Store each concept in DynamoDB: sessionId + conceptId
4. Parallel execution → All batches complete → Pass 3 done

Example Generated Concept:
{
  name: "VM Sizes and Families",
  order: 1,
  tier: "foundation",
  phase1: {
    hookSentence: "VM sizes determine cost, performance, and capability",
    microMetaphor: "Think of VM sizes like apartment tiers: studio, 1-bed, 2-bed, penthouse",
    prerequisite: "None - foundational concept",
    selection: [
      "Choose based on workload requirements",
      "Consider CPU, memory, storage, network needs"
    ],
    execution: "Start with general-purpose (D-series) for most workloads"
  },
  shape: {
    simpleCore: "VM sizes are pre-configured combinations of CPU, RAM, and storage",
    highStakesExample: "Production database chose D4s_v4 (4 vCPU, 16 GB RAM) - crashed under load. Should have used E-series (memory-optimized)",
    analogicalModel: "Car models: Economy (B-series), Sedan (D-series), SUV (E-series), Sports car (F-series)",
    patternRecognition: {
      question: "App needs 32 GB RAM, 8 vCPU. Which series?",
      answer: "E-series (memory-optimized). D-series (general-purpose) would waste money on unneeded CPU."
    },
    eliminationLogic: "If scenario mentions 'memory-intensive', eliminate B, D, F series. If 'compute-intensive', eliminate B, E series."
  },
  mnemonic: {
    tier: "foundation",
    anchor: "🏢 Building Foundation",
    story: "VM sizes are the foundation of your cloud building. Choose the wrong foundation, and the whole building collapses."
  }
}
```

#### Pass 4: Quality Validation
```
Final validation checks:

1. Content Completeness:
   - Every concept has all required fields
   - No placeholder text (e.g., "TBD", "TODO")
   - hookSentence ≠ concept name (circular)
   - All SHAPE sections present

2. Lifecycle Consistency:
   - All concepts follow PREPARE → MODEL → DELIVER
   - Phase 1 doesn't contain Phase 3 info
   - No negative framing ("Don't fail...")

3. Dependency Validity:
   - All dependsOn references exist in concept list
   - No circular dependencies
   - Tier hierarchy respected (Foundation → Keystone → Utility)

4. Tier Distribution:
   - Foundation: 20-30% of concepts
   - Keystone: 30-40% of concepts
   - Utility: 30-40% of concepts
   - If imbalanced: Flag for review

5. Confusion Pair Detection:
   - Identify similar concept names
   - Check for overlapping keywords
   - Generate distinction statements
   - Store in concept.confusionPairs

Example Validation Result:
{
  valid: true,
  conceptCount: { expected: 47, found: 47 },
  lifecycleConsistency: 95,
  positiveFraming: 98,
  formatConsistency: 97,
  completeness: 96,
  issues: [],
  violations: {
    outOfScope: [],
    negativeFraming: []
  }
}

If validation fails:
- Surgical repair: regenerateWithBackend(concept, issue)
- Re-validates specific concept
- Merges fix into main content
```

### Data Storage & Caching

#### Cloud Storage (Source of Truth)
```
DynamoDB Tables:

1. sensa-concepts (Primary)
   - PK: userId#sessionId
   - SK: conceptId
   - Attributes: All concept data
   - GSI1: tier (for tier-based queries)
   - TTL: 1 year (auto-cleanup)

2. sensa-sessions (Metadata)
   - PK: userId
   - SK: sessionId
   - Attributes: { subject, conceptCount, generatedAt, stages, s3Key }
   - GSI1: generatedAt (for recent sessions)

3. sensa-jobs (Background Jobs)
   - PK: jobId
   - Attributes: { status, progress, error, startedAt }
   - TTL: 24 hours

S3 Buckets:
- sensa-documents/
  - {userId}/{sessionId}/fullDocument.json (complete export)
  - {userId}/{sessionId}/metadata.json (lightweight reference)

Storage Flow:
1. Generation completes → Concepts stored in DynamoDB
2. Full document assembled → Stored in S3
3. Session metadata → Stored in both DynamoDB + S3
4. User downloads → Pre-signed S3 URL (1 hour expiry)
```

#### IndexedDB (Offline Cache)
```
Browser IndexedDB:

1. sensa-storage/saved-results
   - Stores: Complete SavedResult objects
   - Key: resultId
   - Indexes: subject, generatedAt

2. sensa-storage/cached-concepts
   - Stores: Individual concepts for lazy loading
   - Key: subjectId:conceptId
   - Indexes: subjectId, tier, subjectId_tier (compound)

Cache Strategy:
1. Load from cloud → Cache in IndexedDB
2. Next visit → Check IndexedDB first
3. If cached < 7 days old → Use cache
4. If cached > 7 days → Re-fetch from cloud, update cache
5. Offline mode → Use cache only, show staleness warning

Example:
const hasCache = await indexedDBStorage.hasConceptsCache(sessionId)
if (hasCache) {
  // Load foundation concepts immediately
  const foundationConcepts = await indexedDBStorage.loadConceptsByTier(sessionId, 'foundation')
  
  // Lazy load keystone/utility as user scrolls
  const keystoneConcepts = await indexedDBStorage.loadConceptsByTier(sessionId, 'keystone')
}
```

#### LocalStorage (UI Preferences Only)
```
localStorage Items:

sensa-saved-results: List of result IDs (lightweight)
[
  { id: "session-123", subject: "Azure VMs", generatedAt: "..." },
  ...
]

sensa-generation-draft: Unsaved generation input
{
  subject: "Azure Virtual Machines",
  contextFiles: [...],
  startedAt: "2026-01-29T10:30:00Z"
}

Usage:
- Quick subject list for library
- Draft recovery if user navigates away mid-input
- Recent searches autocomplete

NOT for:
- Complete concept data (too large)
- Generation results (use IndexedDB)
- User progress (use DynamoDB)
```

### Error Scenarios & Recovery

#### 1. Generation Fails (Pass 1-3)
```
Backend returns: { status: 'failed', error: 'API rate limit exceeded' }

Frontend displays:
┌─────────────────────────────────────────────────────┐
│ ❌ Generation Failed                                 │
│                                                      │
│ Error: API rate limit exceeded                      │
│ The AI service is temporarily unavailable.          │
│                                                      │
│ Your input has been saved. You can:                 │
│                                                      │
│ [Retry Now] [Try Later] [Use Cached Draft]         │
└─────────────────────────────────────────────────────┘

Actions:
- [Retry Now] → Immediate re-attempt with same input
- [Try Later] → Save draft to localStorage, user can resume later
- [Use Cached Draft] → Load previous generation attempt (if any)

Recovery:
- Draft saved: useGenerationStore.setDraft(input)
- User returns: Check for draft on /generate load
- Show: "Resume previous generation? Subject: Azure VMs"
```

#### 2. Partial Generation (Incomplete Concepts)
```
Pass 3 generates 40/47 concepts, then fails

System detects gap:
const expectedCount = pass1Data.concepts.length // 47
const actualCount = concepts.length // 40

if (actualCount < expectedCount * 0.9) {
  Show warning:
  
  ┌─────────────────────────────────────────────────┐
  │ ⚠ Partial Generation                            │
  │                                                  │
  │ Generated: 40/47 concepts (85%)                 │
  │                                                  │
  │ Missing concepts:                               │
  │ • Availability Zones                            │
  │ • Azure Backup                                  │
  │ • Disk Encryption                               │
  │ • ... (4 more)                                  │
  │                                                  │
  │ Options:                                         │
  │ [Continue with 40 concepts]                     │
  │ [Retry missing concepts]                        │
  │ [Start over]                                    │
  └─────────────────────────────────────────────────┘
  
  Actions:
  - [Continue] → Proceed with partial set, mark missing as "pending"
  - [Retry missing] → Re-run Pass 3 for only missing concepts
  - [Start over] → Clear and restart generation
}
```

#### 3. Network Interruption During Polling
```
Poll request fails: fetch() throws network error

Frontend logic:
1. Catch error
2. Exponential backoff: 2s → 4s → 8s → 16s
3. Show status: "Connection lost. Retrying..."
4. After 3 failures: Show offline banner:

┌─────────────────────────────────────────────────────┐
│ 📡 Connection Lost                                   │
│ Trying to reconnect... (Attempt 3/5)                │
│                                                      │
│ [Retry Now] [Continue Offline]                      │
└─────────────────────────────────────────────────────┘

If user closes browser:
- Generation continues on server
- Job status persisted in DynamoDB
- On next visit: Check for completed job
- If complete: Show "Your generation is ready!"
```

#### 4. Authentication Expires Mid-Generation
```
Poll returns: 401 Unauthorized (token expired)

Frontend detects auth error:
1. Stop polling
2. Clear active job from store
3. Redirect to /login with return URL
4. After re-auth: Resume polling with new token

User message:
┌─────────────────────────────────────────────────────┐
│ 🔒 Session Expired                                   │
│                                                      │
│ Your session has expired. Please log in again to   │
│ view your generation results.                       │
│                                                      │
│ Your generation is safe and will resume after login.│
│                                                      │
│ [Log In]                                             │
└─────────────────────────────────────────────────────┘
```

### Generation Settings & Advanced Options
```
Advanced Settings (Expandable Section):

┌─────────────────────────────────────────────────────┐
│ Advanced Options ▼                                   │
│                                                      │
│ Content Depth:                                       │
│ ( ) Quick Overview (20-30 concepts)                 │
│ (•) Standard Depth (40-60 concepts)                 │
│ ( ) Comprehensive (80+ concepts)                    │
│                                                      │
│ Focus Areas:                                         │
│ [x] Practical examples and scenarios                │
│ [x] Exam preparation hints                          │
│ [ ] Theoretical foundations                         │
│ [ ] Historical context                              │
│                                                      │
│ Learning Style:                                      │
│ [x] Visual metaphors (SHAPE framework)              │
│ [x] Memory palace mnemonics                         │
│ [ ] Mathematical formulas                           │
│ [ ] Code examples                                   │
│                                                      │
│ Quality vs Speed:                                    │
│ ◀────────●──────▶                                   │
│ Quality         Speed                                │
│ (Affects validation strictness)                     │
│                                                      │
│ [Reset Defaults] [Save Preferences]                 │
└─────────────────────────────────────────────────────┘

Settings stored in:
useGenerationStore.setPreferences({
  depth: 'standard',
  focusAreas: ['practical', 'exam'],
  learningStyle: ['visual', 'mnemonic'],
  qualitySlider: 0.7 // 0=speed, 1=quality
})

Affects generation:
- depth → Controls concept count in Pass 1
- focusAreas → Filters what Claude emphasizes
- learningStyle → Includes/excludes SHAPE sections
- qualitySlider → Adjusts validation thresholds in Pass 4

Complete End-to-End Feature Specifications 
## 2.5 Content Marketplace & Sharing

### Overview
Transform SensaPBL from a personal learning tool into a collaborative platform where users can discover, use, and improve content created by others. This creates network effects, reduces AI costs by 90%+, and enables viral growth.

### Business Impact
**Cost Reduction:** 95% fewer AI generations needed (most users use existing content)
**Growth Mechanism:** Shared content = free marketing (users share links)
**Retention:** Users return to update/improve their published content
**Monetization:** Premium content marketplace (users sell expert content)

---

### Complete User Flow

#### A. Discover Existing Content (New User Experience)

User arrives at `/generate` and sees:

[See Section 2.E for UI Details]

**Key Features:**

1. **Search & Discovery:**
   - Real-time search as user types
   - Shows most popular/highest rated first
   - Filter by: Rating, Learner count, Recent, Expert verified
   - Tags: #certification, #exam, #beginner, #advanced

2. **Social Proof:**
   - Learner count (how many people used this)
   - Star rating + review count
   - Recent reviews with actual quotes
   - "Expert Verified" badge (manual review by team/community experts)

3. **Version Tracking:**
   - Last updated timestamp
   - Version number
   - Change log available on preview

4. **Content Preview:**
```
┌─────────────────────────────────────────────────────┐
│ Preview: AWS Solutions Architect Associate          │
│ By: @sarah_cloud_guru                               │
│                                                      │
│ Stage 1: Foundation (12 concepts)                   │
│ • EC2 Instances                                     │
│ • VPCs and Subnets                                  │
│ • S3 Buckets                                        │
│ ... 9 more                                          │
│                                                      │
│ Stage 2: Core Services (15 concepts)                │
│ • Load Balancers                                    │
│ • Auto Scaling Groups                               │
│ • RDS Databases                                     │
│ ... 12 more                                         │
│                                                      │
│ Sample Concept: EC2 Instances                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ Simple Core: Virtual servers in the cloud          │
│                                                      │
│ Metaphor: Like renting an apartment - you get a    │
│ space with resources (CPU, RAM), but AWS owns the  │
│ building (physical hardware).                       │
│                                                      │
│ High-Stakes Example: Company chose t2.micro for    │
│ production database. Ran out of CPU credits during │
│ Black Friday. Site went down. Lost $50K in sales.  │
│ Lesson: Match instance type to workload.           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                      │
│ Sample Practice Question:                           │
│ Your app needs burst performance occasionally but   │
│ low baseline. Which instance type?                  │
│ A) t3 (Burstable) ✓                                │
│ B) m5 (General Purpose)                            │
│ C) c5 (Compute Optimized)                          │
│                                                      │
│ Quality Metrics:                                     │
│ • Completeness: 95/100 (all concepts have SHAPE)   │
│ • Accuracy: 4.8/5.0 (user-reported)                │
│ • Freshness: Updated 2 days ago                    │
│                                                      │
│ [Use This Content] [Close Preview]                 │
└─────────────────────────────────────────────────────┘
```

---

#### B. Use Existing Content (Instant Learning)

User clicks [Use This Content]:
```
┌─────────────────────────────────────────────────────┐
│ Add to Your Library                                  │
│                                                      │
│ Content: AWS Solutions Architect Associate          │
│ By: @sarah_cloud_guru                               │
│                                                      │
│ This content will be added to your library.         │
│ You can:                                             │
│ • Start learning immediately                        │
│ • Track your progress independently                 │
│ • Make personal notes (not shared)                  │
│ • Rate and review after studying                    │
│                                                      │
│ [Add to Library] [Cancel]                           │
└─────────────────────────────────────────────────────┘
```

**Backend Implementation:**
```typescript
// No duplication - just reference
await createContentReference({
  userId: currentUserId,
  contentId: 'sarah-aws-saa-v3.2',
  sourceUserId: '@sarah_cloud_guru',
  addedAt: Date.now()
})

// Track usage for creator
await incrementContentUsage({
  contentId: 'sarah-aws-saa-v3.2',
  metric: 'learners'
})
```

**Storage Efficiency:**
```
Without sharing: 
- Each user has full copy
- 1000 users × 2MB = 2GB storage

With sharing:
- Content stored once (2MB)
- 1000 users reference it
- 1000 × 100 bytes (reference) = 100KB
Total: 2MB + 100KB (99.5% reduction!)
```

---

#### C. Clone & Edit (Customization)

User clicks [Clone & Edit]:
```
┌─────────────────────────────────────────────────────┐
│ Clone Content for Editing                           │
│                                                      │
│ Original: AWS Solutions Architect Associate         │
│ By: @sarah_cloud_guru                               │
│                                                      │
│ You'll get a personal copy that you can modify.     │
│                                                      │
│ Your changes:                                        │
│ ( ) Private - Only visible to you                   │
│ (•) Public - Share your improvements                │
│                                                      │
│ Attribution:                                         │
│ [x] Credit original creator                         │
│ Your version will show:                             │
│ "Based on @sarah_cloud_guru's AWS SAA content"      │
│                                                      │
│ [Clone & Start Editing] [Cancel]                    │
└─────────────────────────────────────────────────────┘
```

**Use Cases:**
1. **Personalization:** Add your own notes, examples
2. **Updates:** Original is outdated, you update for 2026 exam
3. **Specialization:** Focus on specific area (e.g., "AWS SAA - Security Focus")
4. **Translation:** Same concepts, different language
5. **Remixing:** Combine multiple sources into custom curriculum

**Version Tree:**
```
Original: @sarah_cloud_guru/AWS-SAA v3.2 (2,847 learners)
  ├─ Fork: @john_doe/AWS-SAA-Updated v1.0 (143 learners)
  ├─ Fork: @maria/AWS-SAA-Security-Focus v2.1 (891 learners)
  └─ Fork: @alex/AWS-SAA-Simplified v1.3 (67 learners)
```

---

#### D. Publish Your Content (Creator Flow)

After user generates or creates content, show:
```
┌─────────────────────────────────────────────────────┐
│ 🎉 Content Created: Kubernetes Fundamentals         │
│                                                      │
│ 42 concepts • 5 stages • Generated by AI            │
│                                                      │
│ Share with the community?                           │
│                                                      │
│ Benefits of publishing:                             │
│ ✓ Help other learners (pay it forward)             │
│ ✓ Get feedback and improvements                     │
│ ✓ Build reputation (leaderboard ranking)           │
│ ✓ Earn credits for future AI generations           │
│                                                      │
│ Visibility:                                          │
│ ( ) Private - Only me                               │
│ ( ) Unlisted - Anyone with link                     │
│ (•) Public - Searchable by everyone                 │
│                                                      │
│ Licensing:                                           │
│ (•) Free - Anyone can use                           │
│ ( ) Premium - $5-20 one-time purchase (coming soon) │
│                                                      │
│ [Publish] [Keep Private] [Decide Later]            │
└─────────────────────────────────────────────────────┘
```

**Incentive System:**
```typescript
interface CreatorRewards {
  // Immediate rewards
  generationCredits: number // 1 credit per 100 learners
  
  // Reputation
  contributorBadge: boolean // Unlocked at 5 published subjects
  expertBadge: boolean // Unlocked at 1000+ learners
  
  // Future: Monetary
  earnings: number // From premium content sales
}

// Example: Sarah's AWS SAA content
{
  learners: 2847,
  generationCredits: 28, // 2847 / 100
  contributorBadge: true,
  expertBadge: true,
  averageRating: 4.8,
  leaderboardRank: 12
}
```

---

#### E. Community Quality Control

**Rating & Reviews:**
```
┌─────────────────────────────────────────────────────┐
│ Rate This Content                                    │
│                                                      │
│ AWS Solutions Architect Associate                   │
│ By: @sarah_cloud_guru                               │
│                                                      │
│ Overall Quality: ⭐⭐⭐⭐⭐                           │
│                                                      │
│ Accuracy: ⭐⭐⭐⭐⭐                                   │
│ How accurate is the content?                        │
│                                                      │
│ Completeness: ⭐⭐⭐⭐☆                               │
│ Does it cover everything needed?                    │
│                                                      │
│ Clarity: ⭐⭐⭐⭐⭐                                    │
│ Is it easy to understand?                           │
│                                                      │
│ Up-to-date: ⭐⭐⭐⭐⭐                                 │
│ Is information current?                             │
│                                                      │
│ Comments (optional):                                 │
│ ┌────────────────────────────────────────────────┐ │
│ │ This is the best AWS SAA prep I've found.      │ │
│ │ Passed my exam first try! The high-stakes      │ │
│ │ examples really helped me remember key points. │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [Submit Review] [Skip]                              │
└─────────────────────────────────────────────────────┘
```

**Report Issues:**
```
┌─────────────────────────────────────────────────────┐
│ Report Issue                                         │
│                                                      │
│ Concept: EC2 Instance Types                        │
│                                                      │
│ Issue Type:                                          │
│ (•) Inaccurate information                          │
│ ( ) Outdated (exam changed)                         │
│ ( ) Confusing explanation                           │
│ ( ) Missing critical info                           │
│ ( ) Inappropriate content                           │
│                                                      │
│ Details:                                             │
│ ┌────────────────────────────────────────────────┐ │
│ │ The content says t2.micro has 2 GB RAM, but    │ │
│ │ it actually has 1 GB. This is a critical error │ │
│ │ for exam prep.                                  │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [Submit Report] [Cancel]                            │
└─────────────────────────────────────────────────────┘
```

**Creator Response:**
```
Creator gets notification:
"Your content 'AWS SAA' has a new issue report"

Creator can:
1. Fix the issue (update content)
2. Respond to clarify
3. Mark as invalid

If ignored for 7 days:
- Issue becomes visible to all users
- Rating may be affected
- "Unresolved issues" badge shows
```

**Expert Verification:**
```
For high-value content:
1. Community nominates for verification
2. SensaPBL team or verified experts review
3. If accurate: Add "✓ Expert Verified" badge
4. Content gets boosted in search rankings

Criteria for expert review:
- 500+ learners
- 4.5+ average rating
- Active creator (responds to issues)
- High-stakes domain (certifications, medical)
```

---

#### F. Content Discovery Features

**Browse by Category:**
```
┌─────────────────────────────────────────────────────┐
│ Browse Learning Content                             │
│                                                      │
│ 🏆 Most Popular                                     │
│ • AWS Solutions Architect (2,847 learners)          │
│ • Kubernetes CKA (1,923 learners)                   │
│ • Azure Administrator (1,654 learners)              │
│                                                      │
│ 🔥 Trending This Week                               │
│ • ChatGPT Prompt Engineering (+891 learners)        │
│ • Python Data Science (+673 learners)               │
│                                                      │
│ ⭐ Highest Rated                                     │
│ • AWS SAA Official (4.9/5.0, 891 reviews)           │
│ • Docker Deep Dive (4.8/5.0, 432 reviews)           │
│                                                      │
│ 🆕 Recently Added                                    │
│ • GitHub Actions CI/CD (2 days ago)                 │
│ • Terraform Certification (5 days ago)              │
│                                                      │
│ 📚 Categories:                                       │
│ [Cloud Computing] [Kubernetes] [Security]           │
│ [Databases] [DevOps] [Programming]                  │
│ [Medical] [Business] [Languages]                    │
└─────────────────────────────────────────────────────┘
```

**Personalized Recommendations:**
```
┌─────────────────────────────────────────────────────┐
│ Recommended for You                                  │
│                                                      │
│ Based on your learning:                             │
│ • AWS Solutions Architect                           │
│ • Docker Fundamentals                               │
│                                                      │
│ You might like:                                      │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Kubernetes CKA Certification                     ││
│ │ Natural next step after Docker                   ││
│ │ ⭐ 4.7/5.0 • 1,923 learners                      ││
│ │ [Add to Library]                                 ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ AWS EKS Deep Dive                                ││
│ │ Combines AWS + Kubernetes knowledge              ││
│ │ ⭐ 4.6/5.0 • 542 learners                        ││
│ │ [Add to Library]                                 ││
│ └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

### Technical Implementation

**Data Models:**
```typescript
interface SharedContent {
  id: string
  title: string
  description: string
  creatorId: string
  creatorUsername: string
  
  // Content
  concepts: Concept[]
  stages: Stage[]
  practiceQuestions: Question[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  version: string
  
  // Visibility
  visibility: 'private' | 'unlisted' | 'public'
  license: 'free' | 'premium'
  price?: number // For premium content
  
  // Social
  learnerCount: number // How many people using this
  rating: number // Average rating
  reviewCount: number
  forkCount: number // How many clones
  
  // Attribution
  forkedFrom?: string // Original content ID
  
  // Quality
  expertVerified: boolean
  issueCount: number
  lastQualityReview?: string
  
  // Search
  tags: string[] // ['aws', 'certification', '2026']
  category: string // 'Cloud Computing'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface ContentReference {
  userId: string
  contentId: string
  addedAt: string
  
  // Personal data (not shared)
  progress: {
    completed: number
    total: number
    lastStudied: string
  }
  personalNotes: string
  rated: boolean
}

interface ContentReview {
  id: string
  contentId: string
  userId: string
  username: string
  
  ratings: {
    overall: number // 1-5
    accuracy: number
    completeness: number
    clarity: number
    upToDate: number
  }
  
  comment: string
  createdAt: string
  
  // Moderation
  helpful: number // Upvotes
  reported: boolean
}

interface ContentIssue {
  id: string
  contentId: string
  conceptId?: string // Specific concept if applicable
  reporterId: string
  
  type: 'inaccurate' | 'outdated' | 'confusing' | 'missing' | 'inappropriate'
  description: string
  
  status: 'open' | 'acknowledged' | 'resolved' | 'invalid'
  creatorResponse?: string
  resolvedAt?: string
  
  createdAt: string
}
```

**DynamoDB Schema:**
```typescript
// Table: sensa-shared-content
PK: contentId
SK: 'METADATA'
Attributes: SharedContent

// GSI1: Search by creator
GSI1-PK: creatorId
GSI1-SK: createdAt

// GSI2: Search by category
GSI2-PK: category
GSI2-SK: learnerCount (for sorting by popularity)

// GSI3: Search by tags
GSI3-PK: tag
GSI3-SK: rating (for sorting by quality)

// Table: sensa-content-references
PK: userId
SK: contentId
Attributes: ContentReference

// Table: sensa-content-reviews
PK: contentId
SK: reviewId
Attributes: ContentReview

// Table: sensa-content-issues
PK: contentId
SK: issueId
Attributes: ContentIssue
```

**Search Implementation:**
```typescript
// Algolia or ElasticSearch for fast full-text search
async function searchContent(query: string, filters?: Filters) {
  const results = await algolia.search('shared_content', {
    query,
    filters: [
      filters.category && `category:${filters.category}`,
      filters.minRating && `rating>=${filters.minRating}`,
      filters.verified && `expertVerified:true`
    ].filter(Boolean).join(' AND '),
    
    // Ranking
    customRanking: [
      'desc(learnerCount)', // Most popular first
      'desc(rating)',       // Highest rated
      'desc(updatedAt)'     // Most recent
    ]
  })
  
  return results.hits
}

// On content publish/update
async function indexContent(content: SharedContent) {
  await algolia.saveObject('shared_content', {
    objectID: content.id,
    title: content.title,
    description: content.description,
    creator: content.creatorUsername,
    category: content.category,
    tags: content.tags,
    learnerCount: content.learnerCount,
    rating: content.rating,
    expertVerified: content.expertVerified,
    updatedAt: content.updatedAt
  })
}
```

---

### Monetization Opportunities

**1. Freemium Model (Enhanced):**
```
Free:
- Use any free community content (unlimited)
- Create 3 subjects (AI or manual)
- Share unlimited content

Pro ($15-20/mo):
- Generate 25 subjects with AI
- Access premium community content
- Sell your own premium content (SensaPBL takes 30%)
- Priority support for your published content
- Analytics on who's using your content
```

**2. Creator Marketplace (Future):**
```
Creators can sell premium content:
- Expert-created certification prep: $20-50
- Specialized medical content: $50-200
- Corporate training modules: $100-500

Revenue split:
- Creator: 70%
- SensaPBL: 30%

Quality bar:
- Must be expert verified
- Minimum 4.8 rating
- Active maintenance commitment
```

**3. Enterprise Features:**
```
Company Knowledge Base:
- Company publishes internal training content
- Only visible to company employees
- Track team-wide completion rates
- Custom branding

Pricing: $50-100/user/month
```

---

### Growth Loops

**Loop 1: Content Sharing**
```
1. User generates great content with AI
2. User publishes to help others
3. 100 people use it (notification to user)
4. Those 100 tell their friends
5. Traffic to SensaPBL increases
6. Some of those 100 publish their own content
7. Repeat
```

**Loop 2: Search Engine Traffic**
```
1. User publishes "AWS SAA Study Guide"
2. Content page is public & SEO-optimized
3. Google indexes it
4. Someone searches "AWS SAA study guide"
5. Finds SensaPBL result
6. Signs up to use it
7. Creates their own content
8. More indexed pages → more SEO traffic
```

**Loop 3: Social Proof**
```
1. Content gets 1000+ learners
2. Shows up in "Most Popular"
3. New users see social proof
4. More likely to trust and use platform
5. More users = more content
6. More content = more users
```

---

### Moderation & Safety

**Automated Checks:**
```typescript
// On content publish
async function moderateContent(content: SharedContent) {
  // Check for spam/inappropriate content
  const toxicityScore = await perspectiveAPI.analyze(content.description)
  if (toxicityScore > 0.8) {
    return { approved: false, reason: 'inappropriate' }
  }
  
  // Check for plagiarism (against known sources)
  const similarity = await checkPlagiarism(content)
  if (similarity > 0.9) {
    return { approved: false, reason: 'duplicate' }
  }
  
  // Check quality
  const qualityScore = calculateQualityScore(content)
  if (qualityScore < 50) {
    return { approved: false, reason: 'low_quality' }
  }
  
  return { approved: true }
}
```

**Community Moderation:**
```
1. Users can report issues
2. Content with 10+ reports gets auto-hidden
3. Creator has 7 days to respond
4. SensaPBL team does final review
5. Repeated violations → Creator ban
```

**Quality Standards:**
```
Minimum to publish:
- At least 10 concepts
- All concepts have SHAPE framework
- At least 5 practice questions
- Pass plagiarism check
- Pass toxicity check
```

---

3. Content Storage Feature 
Overview
Multi-tier storage system with cloud source of truth (DynamoDB + S3), browser cache (IndexedDB), and UI preferences (localStorage).
Entry Points

Automatic: After generation completes
Manual Save: "Save to Cloud" button on generation results
Library Page: /library - View all saved content
Import/Export: /settings - Import files or export content

Complete User Flow
A. Automatic Save After Generation
Generation completes → Automatic save sequence:

1. Show save indicator:
┌─────────────────────────────────────────────────────┐
│ 💾 Saving to cloud...                                │
│ ████████████████░░░░ 80%                            │
└─────────────────────────────────────────────────────┘

2. Save to DynamoDB (Concepts):
   - Batch write all 47 concepts
   - PK: userId#sessionId, SK: conceptId
   - Each concept ~5-10 KB
   - Total: ~235-470 KB

3. Save to S3 (Full Document):
   - Assemble complete JSON export
   - Upload to: s3://sensa-documents/{userId}/{sessionId}/fullDocument.json
   - Size: ~500 KB - 2 MB
   - Set metadata: { subject, conceptCount, generatedAt }

4. Cache to IndexedDB (Offline):
   - Store in local browser database
   - Enables offline access
   - Auto-syncs on next online session

5. Update localStorage (Quick Reference):
   - Add to recent subjects list
   - Store: { id, subject, generatedAt, conceptCount }
   - Used for library quick load

Success state:
┌─────────────────────────────────────────────────────┐
│ ✓ Saved Successfully                                 │
│                                                      │
│ • Cloud: DynamoDB + S3                              │
│ • Local: IndexedDB (offline access)                │
│ • Available on all your devices                     │
│                                                      │
│ [View in Library]                                    │
└─────────────────────────────────────────────────────┘

Store Updates:
useSubjectsStore.addSubject({
  id: sessionId,
  title: subject,
  savedToCloud: true,
  savedLocally: true,
  cloudUrl: s3Url,
  lastSyncedAt: new Date().toISOString()
})
B. Manual Save (Editing Existing Content)
User modifies generated content, then clicks [Save]:

┌─────────────────────────────────────────────────────┐
│ Save Changes?                                        │
│                                                      │
│ You've modified:                                     │
│ • Edited 3 concept descriptions                     │
│ • Added 2 custom connections                        │
│ • Updated mnemonic for "VM Sizes"                  │
│                                                      │
│ Save to:                                             │
│ [x] Cloud (all devices)                             │
│ [x] Local (this device only)                        │
│                                                      │
│ [ ] Create new version (keep original)             │
│                                                      │
│ [Save Changes] [Discard] [Review Changes]          │
└─────────────────────────────────────────────────────┘

Actions:
1. User clicks [Review Changes] → Shows diff view:
   
   ┌───────────────────────────────────────────────────┐
   │ Changes Summary                                    │
   │                                                    │
   │ Concept: "VM Sizes and Families"                  │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
   │ - hookSentence: "VM sizes determine cost..."      │
   │ + hookSentence: "Choose the right VM size to..."  │
   │                                                    │
   │ + Added connection: VM Sizes → Disk Config        │
   │   Type: enables                                    │
   │                                                    │
   │ [Keep Changes] [Revert This] [Revert All]        │
   └───────────────────────────────────────────────────┘

2. User clicks [Save Changes]:
   - If "Create new version" checked:
     * Creates: sessionId-v2
     * Preserves original: sessionId-v1
     * Adds version metadata
   - If unchecked:
     * Overwrites existing in DynamoDB
     * Updates S3 document
     * Invalidates IndexedDB cache
     * Stores new modifiedAt timestamp

3. Version history maintained:
   DynamoDB item:
   {
     ...concept,
     version: 2,
     previousVersions: ['v1-timestamp'],
     modifiedBy: userId,
     modifiedAt: "2026-01-29T15:45:00Z"
   }
C. Library Page - View Saved Content
User navigates to: /library

┌─────────────────────────────────────────────────────┐
│ Your Learning Library                         [⚙]   │
│                                                      │
│ 📚 12 subjects • 547 concepts • 23 hours studied    │
│                                                      │
│ Filter: [All ▼] [Foundation] [Keystone] [Utility]  │
│ Sort: [Recent ▼] [A-Z] [Progress] [Warmth]         │
│ Search: [___________________________] 🔍            │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Azure Virtual Machines              🔥 Hot       ││
│ │ 47 concepts • 6 stages • Generated 2 days ago   ││
│ │                                                  ││
│ │ Progress: ████████████░░░░░░ 60% (28/47)        ││
│ │ Mastered: 15 • In Progress: 13 • Not Started: 19││
│ │                                                  ││
│ │ Next Review: 3 concepts due today               ││
│ │                                                  ││
│ │ [Continue Learning] [Review] [Export] [•••]     ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Kubernetes Fundamentals             🌡️ Warm      ││
│ │ 62 concepts • 7 stages • Generated 5 days ago   ││
│ │                                                  ││
│ │ Progress: ████████████████████ 100% (62/62)     ││
│ │ Mastered: 62 • All concepts completed!          ││
│ │                                                  ││
│ │ Next Review: Tomorrow at 10:00 AM               ││
│ │                                                  ││
│ │ [Start Review] [Re-test] [Export] [•••]         ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ AWS Solutions Architect              ❄️ Cool     ││
│ │ 89 concepts • 9 stages • Generated 12 days ago  ││
│ │                                                  ││
│ │ Progress: ████░░░░░░░░░░░░░ 20% (18/89)         ││
│ │ Mastered: 8 • In Progress: 10 • Not Started: 71 ││
│ │                                                  ││
│ │ Next Review: 5 concepts overdue!                ││
│ │                                                  ││
│ │ [Resume] [Review Overdue] [Export] [•••]        ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ [+ Generate New Content]                            │
└─────────────────────────────────────────────────────┘

Data Loading Strategy:
1. Initial Load (Fast):
   - Load from localStorage: Subject list with metadata only
   - Display immediately (instant UI)
   - Shows: Title, concept count, last studied date

2. Background Sync:
   - Check cloud for updates: GET /api/sessions?userId={userId}
   - Compare lastSyncedAt timestamps
   - If cloud newer: Update cache + localStorage
   - Show sync status: "Synced 2 minutes ago"

3. On-Demand Full Load:
   - User clicks subject card → Load full data
   - Check IndexedDB cache first (offline)
   - If not cached or stale: Fetch from DynamoDB
   - Progress bar while loading: "Loading 47 concepts..."

Knowledge Warmth Indicators:
🔥 Hot: < 24 hours since last review
🌡️ Warm: 1-3 days since last review
❄️ Cool: 3-7 days since last review
🧊 Cold: > 7 days since last review

Calculated by:
const warmth = getMetricsTracker().getKnowledgeWarmth(conceptId)
Based on: lastRecallTimestamp in concept metrics
D. Filter & Sort Controls
User clicks [Filter: All ▼]:

┌─────────────────────────────────────────────────────┐
│ Filter By:                                           │
│ ○ All Subjects                                       │
│ ○ Foundation Concepts Only                          │
│ ○ Keystone Concepts Only                            │
│ ○ Utility Concepts Only                             │
│ ─────────────────────────────────                   │
│ ○ Has Overdue Reviews                               │
│ ○ Has Reviews Due Today                             │
│ ○ Recently Generated (< 7 days)                     │
│ ○ Not Started                                       │
│ ○ In Progress                                       │
│ ○ Completed (100%)                                  │
│ ─────────────────────────────────                   │
│ ○ Hot/Warm Only (active learning)                  │
│ ○ Cool/Cold Only (needs review)                    │
│                                                      │
│ [Apply Filter] [Clear]                              │
└─────────────────────────────────────────────────────┘

User clicks [Sort: Recent ▼]:

┌─────────────────────────────────────────────────────┐
│ Sort By:                                             │
│ ○ Most Recent                                       │
│ ○ Oldest First                                      │
│ ○ Alphabetical (A-Z)                                │
│ ○ Alphabetical (Z-A)                                │
│ ○ Progress (High to Low)                            │
│ ○ Progress (Low to High)                            │
│ ○ Warmth (Hot to Cold)                              │
│ ○ Warmth (Cold to Hot)                              │
│ ○ Concept Count (High to Low)                       │
│ ○ Due Reviews (Overdue First)                       │
│                                                      │
│ [Apply] [Cancel]                                     │
└─────────────────────────────────────────────────────┘

Implementation:
const filteredSubjects = subjects
  .filter(s => {
    if (filter === 'overdue') {
      const metrics = getMetricsTracker().getMetrics()
      return metrics.conceptMetrics.get(s.id)?.someOverdue
    }
    if (filter === 'hot-warm') {
      const warmth = getMetricsTracker().getKnowledgeWarmth(s.id)
      return warmth === 'hot' || warmth === 'warm'
    }
    // ... other filters
  })
  .sort((a, b) => {
    if (sort === 'warmth-hot-cold') {
      const warmthOrder = { hot: 0, warm: 1, cool: 2, cold: 3 }
      return warmthOrder[getWarmth(a.id)] - warmthOrder[getWarmth(b.id)]
    }
    // ... other sorts
  })
E. Subject Card Actions Menu
User clicks [•••] on subject card:

┌─────────────────────────────────────────────────────┐
│ Azure Virtual Machines                               │
│                                                      │
│ 📊 View Progress Details                            │
│ 📈 View Learning Analytics                          │
│ 🗺️ View Concept Map                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 📥 Export                                            │
│   → Download JSON                                   │
│   → Download PDF                                    │
│   → Download Markdown                               │
│   → Export to Anki                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 🔄 Sync Options                                     │
│   → Force Sync from Cloud                           │
│   → Upload Local Changes                            │
│   → Resolve Conflicts                               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ⚙️ Subject Settings                                 │
│   → Edit Subject Name                               │
│   → Add Tags                                        │
│   → Set Custom Schedule                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 🔴 Delete Subject                                   │
│                                                      │
│ [Close]                                              │
└─────────────────────────────────────────────────────┘

Actions:

1. View Progress Details:
   ┌───────────────────────────────────────────────────┐
   │ Progress Details: Azure Virtual Machines          │
   │                                                    │
   │ Foundation Concepts: 12 total                     │
   │ • Mastered: 8 (67%)  ████████░░░░                │
   │ • In Progress: 3 (25%)  ██████░░░░░░             │
   │ • Not Started: 1 (8%)  ██░░░░░░░░░░              │
   │                                                    │
   │ Keystone Concepts: 18 total                       │
   │ • Mastered: 5 (28%)  ███████░░░░░░               │
   │ • In Progress: 8 (44%)  ████████████░░           │
   │ • Not Started: 5 (28%)  ███████░░░░░░            │
   │                                                    │
   │ Utility Concepts: 17 total                        │
   │ • Mastered: 2 (12%)  ████░░░░░░░░                │
   │ • In Progress: 2 (12%)  ████░░░░░░░░             │
   │ • Not Started: 13 (76%)  ████████████████░       │
   │                                                    │
   │ Time Invested: 4h 32m                             │
   │ Average Session: 38 minutes                       │
   │ Learning Velocity: 2.3 concepts/hour              │
   │                                                    │
   │ [Export Report] [Close]                           │
   └───────────────────────────────────────────────────┘

2. Export to Anki:
   ┌───────────────────────────────────────────────────┐
   │ Export to Anki Flashcards                          │
   │                                                    │
   │ Format: [Cloze Deletion ▼]                        │
   │ Include:                                           │
   │ [x] Hook sentences                                │
   │ [x] Micro-metaphors                               │
   │ [x] SHAPE framework                               │
   │ [x] Critical distinctions                         │
   │ [ ] Full phase content                            │
   │                                                    │
   │ Card Count Preview: ~235 cards                    │
   │                                                    │
   │ [Generate .apkg file] [Cancel]                    │
   └───────────────────────────────────────────────────┘
   
   Generates: azure-vms-{timestamp}.apkg
   User imports into Anki desktop/mobile app

3. Force Sync from Cloud:
   ┌───────────────────────────────────────────────────┐
   │ Syncing from Cloud...                              │
   │                                                    │
   │ Fetching latest data from DynamoDB...             │
   │ ████████████████████░░░░ 85%                      │
   │                                                    │
   │ Found changes:                                     │
   │ • 3 concepts updated on another device            │
   │ • 1 new concept added                             │
   │ • Progress synced from mobile app                 │
   │                                                    │
   │ [Downloading...]                                   │
   └───────────────────────────────────────────────────┘
   
   After sync:
   ┌───────────────────────────────────────────────────┐
   │ ✓ Sync Complete                                    │
   │                                                    │
   │ Your library is up to date with cloud storage.   │
   │ Last synced: Just now                             │
   │                                                    │
   │ [Close]                                            │
   └───────────────────────────────────────────────────┘

4. Delete Subject:
   ┌───────────────────────────────────────────────────┐
   │ ⚠️ Delete "Azure Virtual Machines"?               │
   │                                                    │
   │ This will permanently delete:                     │
   │ • 47 concepts                                     │
   │ • All progress data (4h 32m invested)            │
   │ • Scheduled reviews                               │
   │ • Custom notes and modifications                  │
   │                                                    │
   │ This action cannot be undone.                     │
   │                                                    │
   │ Delete from:                                       │
   │ [x] Cloud (all devices)                           │
   │ [x] This device (local cache)                     │
   │                                                    │
   │ Type subject name to confirm:                     │
   │ [_________________________________]               │
   │                                                    │
   │ [Delete Forever] [Cancel]                         │
   └───────────────────────────────────────────────────┘
   
   On confirm:
   - DELETE /api/concepts?sessionId={sessionId}
   - DELETE S3 object: fullDocument.json
   - Remove from IndexedDB: indexedDBStorage.clearConceptsForSubject()
   - Remove from localStorage: localStorage.removeItem(STORAGE_KEY)
   - Update UI: Remove card with fade-out animation
F. Import Content from File
User navigates to: /settings → Import/Export tab

┌─────────────────────────────────────────────────────┐
│ Import Content                                       │
│                                                      │
│ Import previously exported learning content or      │
│ content shared by others.                           │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │  📄 Drop JSON file here or click to browse      │ │
│ │                                                  │ │
│ │  Supported: .json (SensaPBL format)             │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [Browse Files]                                       │
└─────────────────────────────────────────────────────┘

User drops file: azure-vms-20260129.json

Validation:
1. Check file type: Must be .json
2. Parse JSON: Must be valid
3. Validate structure:
   {
     id: string,
     subject: string,
     fullDocument: string,
     concepts: [...],
     stages: [...],
     metadata: {...}
   }
4. Check for duplicates: Match by subject + generatedAt

If valid:
┌─────────────────────────────────────────────────────┐
│ Import Preview                                       │
│                                                      │
│ File: azure-vms-20260129.json                       │
│ Subject: Azure Virtual Machines                     │
│ Concepts: 47                                         │
│ Generated: Jan 27, 2026                             │
│                                                      │
│ ⚠️ A subject with this name already exists.         │
│                                                      │
│ Import as:                                           │
│ ( ) Replace existing (lose current progress)        │
│ (•) Import as new version                           │
│ ( ) Merge with existing (advanced)                  │
│                                                      │
│ New name: [Azure Virtual Machines (Imported)]      │
│                                                      │
│ [Import] [Cancel]                                    │
└─────────────────────────────────────────────────────┘

On [Import]:
1. Create new sessionId
2. Save to DynamoDB (all concepts)
3. Save to S3 (full document)
4. Cache in IndexedDB
5. Add to subjects store
6. Navigate to library
7. Show success: "Imported Azure Virtual Machines (47 concepts)"

Error Handling:
If invalid format:
┌─────────────────────────────────────────────────────┐
│ ❌ Import Failed                                     │
│                                                      │
│ This file is not a valid SensaPBL export.          │
│                                                      │
│ Expected format:                                     │
│ • JSON file                                         │
│ • Contains subject, concepts, stages fields         │
│                                                      │
│ Try:                                                 │
│ • Re-export from SensaPBL                          │
│ • Check file wasn't corrupted during transfer      │
│                                                      │
│ [Try Another File] [Close]                          │
└─────────────────────────────────────────────────────┘
G. Export Content to File
User clicks [Export] on subject card:

┌─────────────────────────────────────────────────────┐
│ Export: Azure Virtual Machines                      │
│                                                      │
│ Choose format:                                       │
│                                                      │
│ 📄 JSON (SensaPBL Format)                          │
│ ├─ Complete data export                            │
│ ├─ Can re-import later                             │
│ └─ File size: ~800 KB                              │
│ [Download JSON]                                     │
│                                                      │
│ 📕 PDF (Study Guide)                               │
│ ├─ Formatted document                              │
│ ├─ Includes all concepts and phases                │
│ └─ File size: ~2.5 MB                              │
│ [Generate PDF]                                      │
│                                                      │
│ 📝 Markdown (Text Format)                          │
│ ├─ Plain text with formatting                      │
│ ├─ Compatible with note apps                       │
│ └─ File size: ~150 KB                              │
│ [Download Markdown]                                 │
│                                                      │
│ 🗂️ Anki Flashcards                                 │
│ ├─ Spaced repetition flashcards                    │
│ ├─ Import into Anki app                            │
│ └─ File size: ~300 KB (.apkg)                      │
│ [Generate Anki Deck]                                │
│                                                      │
│ [Close]                                              │
└─────────────────────────────────────────────────────┘

Export Implementations:

1. Download JSON:
   const result = await cloudStorage.loadResult(sessionId)
   const dataStr = JSON.stringify(result, null, 2)
   const blob = new Blob([dataStr], { type: 'application/json' })
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = `${subject}-${timestamp}.json`
   a.click()
   
   Downloads: azure-virtual-machines-20260129.json

2. Generate PDF:
   ┌───────────────────────────────────────────────────┐
   │ Generating PDF...                                  │
   │                                                    │
   │ Building document structure...                     │
   │ ████████████████████████ 100%                     │
   │                                                    │
   │ Rendering:                                         │
   │ • Cover page with subject                         │
   │ • Table of contents                               │
   │ • Stage overviews (6 stages)                      │
   │ • Concept details (47 concepts)                   │
   │ • Dependency graph visualization                   │
   │ • Memory palace mnemonics                         │
   │                                                    │
   │ Page count: 142 pages                             │
   │ [Downloading...]                                   │
   └───────────────────────────────────────────────────┘
   
   Uses: jsPDF or server-side PDF generation
   Downloads: azure-virtual-machines-study-guide.pdf
   
   PDF Structure:
   Page 1: Cover (subject, generation date, concept count)
   Page 2-3: Table of contents
   Page 4-10: Stage 1 concepts with full SHAPE content
   Page 11-25: Stage 2 concepts
   ...
   Page 135-142: Dependency graph, appendices

3. Download Markdown:
   Generates structured markdown:
```markdown
   # Azure Virtual Machines
   
   Generated: January 29, 2026
   Concepts: 47 | Stages: 6
   
   ## Table of Contents
   
   1. [Stage 1: Foundation Concepts](#stage-1)
   2. [Stage 2: Building Blocks](#stage-2)
   ...
   
   ## Stage 1: Foundation Concepts
   
   ### 1. VM Sizes and Families
   
   **Why You Need It:**
   VM sizes determine cost, performance, and capability
   
   **Metaphor:**
   Think of VM sizes like apartment tiers: studio, 1-bed, 2-bed, penthouse
   
   **Simple Core:**
   VM sizes are pre-configured combinations of CPU, RAM, and storage
   
   **High-Stakes Example:**
   Production database chose D4s_v4 (4 vCPU, 16 GB RAM) - crashed under load...
   
   ...
```
   
   Downloads: azure-virtual-machines.md

4. Generate Anki Deck:
   Creates .apkg file with:
   
   Front of card:
   "What is the primary purpose of VM Sizes in Azure?"
   
   Back of card:
   "VM sizes determine cost, performance, and capability.
   
   Memory Aid: Think of apartment tiers - studio, 1-bed, penthouse.
   
   Key Point: Choose based on workload (general-purpose D-series, memory-optimized E-series, compute F-series)"
   
   Generates ~3-5 cards per concept (235 total cards for 47 concepts)
   Downloads: azure-vms-anki-deck.apkg
H. Sync Conflict Resolution
Scenario: User edited content on Device A, then Device B made different edits

On next sync, system detects conflict:

┌─────────────────────────────────────────────────────┐
│ ⚠️ Sync Conflict Detected                           │
│                                                      │
│ Subject: Azure Virtual Machines                     │
│ Conflict: Concept "VM Sizes and Families"          │
│                                                      │
│ Last synced: 2 hours ago                            │
│ Modified on this device: 1 hour ago                 │
│ Modified on cloud: 30 minutes ago                   │
│                                                      │
│ Choose version:                                      │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ This Device (Laptop)                             ││
│ │ Modified: 1 hour ago                             ││
│ │ Changes: Edited hookSentence, updated metaphor   ││
│ │                                                   ││
│ │ hookSentence: "Choose the right VM size to..."  ││
│ │ metaphor: "Car models: Economy, Sedan, SUV..."  ││
│ │                                                   ││
│ │ [Keep This Version]                              ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Cloud (from Mobile)                              ││
│ │ Modified: 30 minutes ago                         ││
│ │ Changes: Added practice question, updated SHAPE  ││
│ │                                                   ││
│ │ practiceQuestion: "When to use E-series VMs?"   ││
│ │ shape.elimination: "If scenario mentions..."     ││
│ │                                                   ││
│ │ [Keep This Version]                              ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ [Merge Both (Advanced)] [View Full Diff]           │
└─────────────────────────────────────────────────────┘

Actions:

1. User clicks [Keep This Version] (Device):
   - Overwrites cloud version
   - Uploads to DynamoDB
   - Marks as resolved
   - Shows: "Conflict resolved. Cloud updated."

2. User clicks [Keep This Version] (Cloud):
   - Discards local changes
   - Downloads cloud version
   - Updates IndexedDB
   - Shows: "Conflict resolved. Local updated."

3. User clicks [Merge Both]:
   ┌───────────────────────────────────────────────────┐
   │ Manual Merge                                       │
   │                                                    │
   │ Field: hookSentence                               │
   │ ● Device: "Choose the right VM size to..."       │
   │ ○ Cloud:  "VM sizes determine cost..."           │
   │                                                    │
   │ Field: metaphor                                   │
   │ ● Device: "Car models: Economy, Sedan, SUV..."   │
   │ ○ Cloud:  "Apartment tiers: studio, 1-bed..."    │
   │                                                    │
   │ Field: practiceQuestion (New)                     │
   │ ☑ Keep: "When to use E-series VMs?"              │
   │                                                    │
   │ Field: shape.elimination (New)                    │
   │ ☑ Keep: "If scenario mentions..."                │
   │                                                    │
   │ [Apply Merge] [Cancel]                            │
   └───────────────────────────────────────────────────┘
   
   On [Apply Merge]:
   - Combines selected fields
   - Creates merged version
   - Uploads to cloud
   - Resolves conflict

4. User clicks [View Full Diff]:
   Shows side-by-side comparison with syntax highlighting
I. Offline Mode
User loses internet connection while browsing library:

┌─────────────────────────────────────────────────────┐
│ 📡 Offline Mode                                      │
│                                                      │
│ You're currently offline. Your library is available │
│ from local cache.                                    │
│                                                      │
│ Available:                                           │
│ • View saved subjects                               │
│ • Continue learning sessions                        │
│ • Take notes and make edits                         │
│                                                      │
│ Unavailable:                                         │
│ • Generate new content                              │
│ • Sync with cloud                                   │
│ • Download exports                                  │
│                                                      │
│ Your changes will sync when you reconnect.          │
│                                                      │
│ [Dismiss]                                            │
└─────────────────────────────────────────────────────┘

Offline banner shows at top of all pages:
┌─────────────────────────────────────────────────────┐
│ 📡 Offline • Changes saved locally  [Dismiss ✕]    │
└─────────────────────────────────────────────────────┘

User makes edits offline:
- Edits saved to IndexedDB with pendingSync: true
- Changes queued in syncQueue: [{ action, data, timestamp }]
- Shows indicator: "💾 Saved locally (will sync)"

User reconnects:
┌─────────────────────────────────────────────────────┐
│ 🌐 Back Online                                       │
│                                                      │
│ Syncing your changes...                             │
│ ████████████████████░░░░ 80%                        │
│                                                      │
│ Uploading:                                           │
│ • 3 concept edits                                   │
│ • 1 new connection                                  │
│ • Updated progress data                             │
│                                                      │
│ [Syncing...]                                         │
└─────────────────────────────────────────────────────┘

After sync:
┌─────────────────────────────────────────────────────┐
│ ✓ Sync Complete                                      │
│ All changes uploaded successfully.                   │
└─────────────────────────────────────────────────────┘

If sync fails (e.g., conflict):
Shows conflict resolution dialog (see section H)
### Storage Architecture (Simplified for Launch)

**Phase 1 (MVP): Client-Side Only**
```typescript
// localStorage: Subject metadata (lightweight)
{
  "subjects": [
    {
      "id": "session-123",
      "subject": "AWS SAA",
      "conceptCount": 35,
      "createdAt": "2026-01-29T10:00:00Z"
    }
  ]
}

// IndexedDB: Full content (offline access)
// Database: sensa-storage
// ObjectStore: subjects
{
  id: "session-123",
  subject: "AWS SAA",
  concepts: [...], // Full concept objects
  progress: {
    completedConcepts: [1, 3, 5],
    currentPhase: "connect",
    lastSession: "2026-01-29T15:00:00Z"
  }
}
```

**Phase 2 (Cloud Sync): Add DynamoDB + S3**
```typescript
// DynamoDB: sensa-subjects
PK: userId
SK: sessionId
Attributes: {
  subject,
  conceptCount,
  createdAt,
  s3Key // Points to full content in S3
}

// DynamoDB: sensa-progress
PK: userId#sessionId
SK: conceptId
Attributes: {
  status: 'learning' | 'mastered',
  lastReviewed,
  nextReview,
  reviewCount
}

// S3: sensa-content/
{userId}/{sessionId}/content.json // Full subject content
```

**Sync Strategy:**
1. Always write to local storage first (instant)
2. Queue cloud sync in background
3. On app start: Check cloud for updates
4. If conflict: Last-write-wins (simple, good enough for MVP)

**Storage Limits:**
- Free tier: 3 subjects (local only)
- Pro tier: Unlimited subjects (cloud sync)
- IndexedDB: ~50MB per subject (browser limit: 500MB-1GB)

---
### F. Shared Content Storage

Content references instead of duplication:

**Storage Efficiency:**
```
Without sharing: 
- Each user has full copy
- 1000 users × 2MB = 2GB storage

With sharing:
- Content stored once (2MB)
- 1000 users reference it
- 1000 × 100 bytes (reference) = 100KB
Total: 2MB + 100KB (99.5% reduction!)
```

4. Learning Session Feature (Complete Implementation)
Overview
Comprehensive learning experience with 7 phases, spaced repetition, confusion drills, and progress tracking.
Entry Points

Library Page: Click [Continue Learning] on subject card
Direct URL: /study/{sessionId}
Home Page: "Start Learning" after generation

Complete User Flow
### A. Session Start (SIMPLIFIED - 4 Phases, Not 7)

**Phase Structure:**
1. **Learn** (Scout + Preview combined) - Browse concepts, see practice questions
2. **Connect** (Build) - Create concept map
3. **Recall** (Retain) - Blank sheet test
4. **Apply** (Master) - Practice questions + scenarios

User clicks [Continue Learning] on "AWS Virtual Machines":

Navigation: /study/session-abc123

┌─────────────────────────────────────────────────────┐
│ Phase 1: Learn                            [1/4] █░░░│
│                                                      │
│ 💪 Coach: "Let's see what you're up against."      │
│                                                      │
│ Foundation Concepts (12 total)                      │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ 1. 🏗 VM Sizes and Families                      ││
│ │    Foundation • Critical infrastructure          ││
│ │                                                   ││
│ │    Why it matters:                               ││
│ │    Wrong VM size = wasted money or crashes       ││
│ │                                                   ││
│ │    Quick take: Pre-configured CPU/RAM bundles.   ││
│ │    Like apartment tiers: studio, 1-bed, 2-bed.   ││
│ │                                                   ││
│ │    [Mark Reviewed] [Practice Question]           ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Progress: 1/12 reviewed                             │
│ [Continue to Connect Phase]                         │
└─────────────────────────────────────────────────────┘

**No more Prime phase (intention setting) - just start learning**
**Preview integrated into Learn phase - see questions inline**
**Apply phase includes practice questions + scenarios (not separate)**
D. Build Phase - Concept Map
Phase 2: Build the Web (Concept Map)

┌─────────────────────────────────────────────────────┐
│ Phase 2: Build the Web                    [4/7] ███░│
│                                                      │
│ 🔥 Coach                                  [🔊 Play] │
│ "Concept map time. Connect the dots. Find the      │
│  RELATIONSHIPS."                                    │
│                                                      │
│ Build your understanding by connecting concepts.    │
│ Drag concepts onto the canvas and draw connections.│
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │                 CANVAS                          │ │
│ │                                                 │ │
│ │   [VM Sizes] ──enables──▶ [Disk Config]       │ │
│ │       │                                         │ │
│ │       │ enables                                 │ │
│ │       ▼                                         │ │
│ │   [Network Interfaces]                          │ │
│ │       │                                         │ │
│ │       │ requires                                │ │
│ │       ▼                                         │ │
│ │   [Load Balancers]                              │ │
│ │                                                 │ │
│ │                                                 │ │
│ │                                                 │ │
│ │ [+ Add Concept]                                 │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ Concepts: 4/47 added                                │
│ Connections: 3                                      │
│                                                      │
│ AI Suggestions: 5 available [Show]                  │
│ Gaps Detected: 1 [Review]                           │
│                                                      │
│ [Save Progress] [Continue to Apply]                 │
└─────────────────────────────────────────────────────┘

Canvas Interactions:

1. [+ Add Concept]:
   ┌───────────────────────────────────────────────────┐
   │ Add Concept                                        │
   │                                                    │
   │ Search: [___________________________] 🔍          │
   │                                                    │
   │ Foundation (12):                                   │
   │ □ VM Sizes and Families                           │
   │ □ Disk Configuration                              │
   │ ✓ Network Interfaces (already added)              │
   │ □ Storage Accounts                                │
   │                                                    │
   │ Keystone (18):                                     │
   │ ✓ Load Balancers (already added)                  │
   │ □ Application Gateway                             │
   │ □ Availability Sets                               │
   │                                                    │
   │ [Add Selected] [Cancel]                           │
   └───────────────────────────────────────────────────┘
   
   User selects concepts → Click [Add Selected]
   → Concepts appear on canvas at random position
   → User drags to arrange

2. Create Connection:
   - User drags from concept to concept
   - Line appears during drag
   - On drop: Connection modal opens:
   
   ┌───────────────────────────────────────────────────┐
   │ Define Connection                                  │
   │                                                    │
   │ From: VM Sizes                                    │
   │ To: Disk Configuration                            │
   │                                                    │
   │ Relationship type:                                │
   │ [enables ▼]                                       │
   │ • enables - makes possible                        │
   │ • requires - depends on                           │
   │ • contains - includes                             │
   │ • extends - builds upon                           │
   │ • related-to - general connection                 │
   │                                                    │
   │ Label (optional):                                 │
   │ [determines storage options___________]          │
   │                                                    │
   │ [Create Connection] [Cancel]                      │
   └───────────────────────────────────────────────────┘
   
   Connection saved:
   {
     fromId: 'concept-1',
     toId: 'concept-2',
     type: 'enables',
     label: 'determines storage options',
     createdAt: timestamp
   }
   
   Stored in: useProgressStore.conceptMap.connections

3. AI Suggestions:
   User clicks [Show] on "AI Suggestions":
   
   ┌───────────────────────────────────────────────────┐
   │ AI Connection Suggestions                          │
   │                                                    │
   │ Based on AI-generated relationships:               │
   │                                                    │
   │ ✓ VM Sizes → Disk Configuration                   │
   │   Type: enables                                   │
   │   Confidence: 95%                                 │
   │   [Already connected]                             │
   │                                                    │
   │ ○ VM Sizes → Availability Sets                    │
   │   Type: requires                                  │
   │   Confidence: 90%                                 │
   │   [Add This Connection]                           │
   │                                                    │
   │ ○ Network Interfaces → Load Balancers            │
   │   Type: enables                                   │
   │   Confidence: 88%                                 │
   │   [Add This Connection]                           │
   │                                                    │
   │ ○ Disk Configuration → Storage Accounts          │
   │   Type: requires                                  │
   │   Confidence: 85%                                 │
   │   [Add This Connection]                           │
   │                                                    │
   │ ○ VM Sizes → Scale Sets                           │
   │   Type: enables                                   │
   │   Confidence: 82%                                 │
   │   [Add This Connection]                           │
   │                                                    │
   │ [Close]                                            │
   └───────────────────────────────────────────────────┘
   
   Generated by: suggestConnections(concepts, existingConnections)
   From: src/features/learning-session/phases/build-ai.ts
   
   Priority:
   1. AI-generated strictConnections (highest confidence)
   2. Keyword-based semantic matching (medium confidence)
   
   User clicks [Add This Connection]:
   - Adds to canvas immediately
   - Auto-positions near related concepts
   - Shows success animation
   - Updates AI suggestions (removes added one)

4. Gap Detection:
   User clicks [Review] on "Gaps Detected":
   
   ┌───────────────────────────────────────────────────┐
   │ Potential Gaps                                     │
   │                                                    │
   │ ⚠ "Load Balancers" has no connections            │
   │   Message: How does it relate to other concepts? │
   │                                                    │
   │   Suggested connections:                          │
   │   • Network Interfaces                            │
   │   • Availability Sets                             │
   │   • Health Probes                                 │
   │                                                    │
   │   [Add Suggestions] [Dismiss]                     │
   └───────────────────────────────────────────────────┘
   
   Gap detection runs automatically:
   - After every concept add
   - Every 30 seconds
   - On save
   
   Triggered by: detectGaps(concepts, nodesOnMap, connections)
   Flags:
   - Isolated concepts (0 connections)
   - Orphaned concepts (1 connection)
   - Disconnected clusters

5. Map Scoring (Auto-calculated):
   Real-time score in bottom-right corner:
   
   ┌─────────────────┐
   │ Map Score       │
   │ 73/100 B        │
   │                 │
   │ [View Details]  │
   └─────────────────┘
   
   Click [View Details]:
   ┌───────────────────────────────────────────────────┐
   │ Concept Map Score: 73/100 (B)                     │
   │                                                    │
   │ Completeness: 75/100                              │
   │ • 4 of 12 foundation concepts included            │
   │ • 0 of 18 keystone concepts included              │
   │ • 0 of 17 utility concepts included               │
   │ ⚠ Add more concepts for better coverage           │
   │                                                    │
   │ Connection Accuracy: 85/100                       │
   │ • 3 connections match AI relationships            │
   │ • 0 potentially incorrect connections             │
   │ ✓ Strong relationship understanding               │
   │                                                    │
   │ Structural Quality: 80/100                        │
   │ • Good tier flow (Foundation → Keystone)          │
   │ ✓ Hierarchy respected                             │
   │                                                    │
   │ Tier Balance: 50/100                              │
   │ • Only Foundation tier represented                │
   │ ⚠ Add Keystone and Utility concepts              │
   │                                                    │
   │ Coach Feedback:                                   │
   │ "Solid start! You've got the foundation.         │
   │  Now add some keystones to show the structure."  │
   │                                                    │
   │ [Close]                                            │
   └───────────────────────────────────────────────────┘
   
   Generated by: scoreConceptMap(mapData, aiConcepts, personaId)
   From: src/features/learning-session/phases/score-map.ts

Save Progress:
- Auto-saves every 30 seconds
- Manual save on [Save Progress]
- Saves to: saveSessionProgress(sessionData)
- Stored in: localStorage + IndexedDB

On [Continue to Apply]:
- Requires minimum completeness:
  * At least 5 concepts added
  * At least 3 connections made
  * At least score C (70/100)
- If not met: Show warning:
  "Your map needs more connections. Add at least 2 more."
- If met: Navigate to Apply phase
E. Apply Phase - Work Problems
Phase 2.5: Apply (Work Practice Problems)

┌─────────────────────────────────────────────────────┐
│ Phase 2.5: Apply Knowledge               [5/7] ████░│
│                                                      │
│ 🔥 Coach                                  [🔊 Play] │
│ "Theory is nothing without practice. Let's work    │
│  problems."                                         │
│                                                      │
│ Now solve the problems you previewed earlier.      │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Question 1 of 12                        [Easy]   ││
│ │                                                   ││
│ │ Your application requires 32 GB of memory and   ││
│ │ 8 vCPUs. Which VM series should you choose?     ││
│ │                                                   ││
│ │ ( ) A) B-series (Burstable)                      ││
│ │ ( ) B) D-series (General Purpose)                ││
│ │ (•) C) E-series (Memory Optimized)               ││
│ │ ( ) D) F-series (Compute Optimized)              ││
│ │                                                   ││
│ │ [Check Answer]                                   ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Timer: 00:42                                        │
│ Score: 0/12 • Streak: 0                             │
│                                                      │
│ [Skip Question] [Hint]                              │
└─────────────────────────────────────────────────────┘

User selects answer → Click [Check Answer]:

If CORRECT:
┌─────────────────────────────────────────────────────┐
│ ✓ Correct!                                          │
│                                                      │
│ E-series VMs are memory-optimized, perfect for     │
│ applications requiring high memory-to-CPU ratios.   │
│                                                      │
│ Key Insight:                                        │
│ 32 GB RAM with 8 vCPU = 4:1 ratio → Memory-optimized│
│ D-series would work but waste money on unused CPU.  │
│                                                      │
│ Time: 42 seconds                                    │
│ Your answer time vs average: -8 seconds (faster!)   │
│                                                      │
│ [Next Question]                                     │
└─────────────────────────────────────────────────────┘

Score updated: 1/12 • Streak: 1 🔥

If INCORRECT:
┌─────────────────────────────────────────────────────┐
│ ✗ Incorrect                                         │
│                                                      │
│ You selected: D-series (General Purpose)            │
│ Correct answer: C) E-series (Memory Optimized)     │
│                                                      │
│ Why E-series?                                       │
│ The 32 GB RAM requirement is the key. E-series     │
│ optimize for memory-intensive workloads.            │
│                                                      │
│ Why not D-series?                                   │
│ D-series is general purpose - works for most things│
│ but not optimized for memory. You'd pay more for   │
│ capabilities you don't need.                        │
│                                                      │
│ Pattern to remember:                                │
│ High memory/CPU ratio → E-series                   │
│ High CPU/memory ratio → F-series                   │
│ Balanced → D-series                                │
│                                                      │
│ [Review Concept: VM Sizes] [Next Question]         │
└─────────────────────────────────────────────────────┘

Streak broken: 0
Flag for review: conceptId → needs remediation

User clicks [Review Concept]:
Opens mini-modal with concept SHAPE content:

┌─────────────────────────────────────────────────────┐
│ Quick Review: VM Sizes and Families                │
│                                                      │
│ Simple Core:                                         │
│ Pre-configured bundles optimized for workload types │
│                                                      │
│ Series Breakdown:                                    │
│ • B-series: Burstable (dev/test)                   │
│ • D-series: General purpose (most apps)            │
│ • E-series: Memory optimized (databases)           │
│ • F-series: Compute optimized (batch processing)   │
│                                                      │
│ Decision Pattern:                                   │
│ 1. Identify bottleneck (CPU, RAM, disk, network)   │
│ 2. Choose series optimized for that resource       │
│ 3. Select size within series for capacity          │
│                                                      │
│ [Close] [Open Full Concept]                         │
└─────────────────────────────────────────────────────┘

Continue through all 12 questions:

After question 12:
┌─────────────────────────────────────────────────────┐
│ Apply Phase Complete!                               │
│                                                      │
│ Final Score: 9/12 (75%)                             │
│ Time: 8 minutes 23 seconds                          │
│ Average per question: 42 seconds                    │
│                                                      │
│ Performance Breakdown:                              │
│ • Easy (4): 4/4 ✓ (100%)                           │
│ • Medium (5): 4/5 ⚠ (80%)                          │
│ • Hard (3): 1/3 ✗ (33%)                            │
│                                                      │
│ Concepts to Review:                                 │
│ 🔴 Disk Encryption (0/2 questions)                 │
│ 🟡 Load Balancers (1/2 questions)                  │
│ 🟡 Availability Sets (1/2 questions)               │
│                                                      │
│ 🔥 Coach: "You worked through it. That's how       │
│            champions train."                        │
│                                                      │
│ [Review Mistakes] [Continue to Retain Phase]       │
└─────────────────────────────────────────────────────┘

Metrics stored:
- Per-question: { questionId, correct, timeSpent, attemptCount }
- Per-concept: { conceptId, questionCount, correctCount, avgTime }
- Overall: { score, totalTime, easyCorrect, mediumCorrect, hardCorrect }

Remediation flagged:
- Concepts with <50% correct → High priority review
- Concepts with 50-79% correct → Medium priority review
- Concepts with ≥80% correct → Low priority (maintenance only)

On [Continue to Retain Phase]:
Saves apply phase metrics
Navigates to Retain phase (Blank Sheet Test)
F. Retain Phase - Blank Sheet Test
Phase 3: Retain (Blank Sheet Test - Active Recall)

┌─────────────────────────────────────────────────────┐
│ Phase 3: Blank Sheet Test                [6/7] █████│
│                                                      │
│ 🔥 Coach                                  [🔊 Play] │
│ "Blank sheet. No notes. Show me what you           │
│  ACTUALLY know."                                    │
│                                                      │
│ From memory, recreate your concept map.            │
│ No peeking! This is how you lock in learning.      │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │                                                 │ │
│ │                                                 │ │
│ │                                                 │ │
│ │   Write or draw what you remember...           │ │
│ │                                                 │ │
│ │                                                 │ │
│ │                                                 │ │
│ │                                                 │ │
│ │                                                 │ │
│ │                                                 │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ Tips:                                               │
│ • Start with concepts you remember best            │
│ • Draw connections you recall                      │
│ • Write keywords, not full sentences               │
│ • Don't worry about perfection                     │
│                                                      │
│ Time elapsed: 00:00                                 │
│ [I'm Done - Score My Work]                          │
└─────────────────────────────────────────────────────┘

User writes/draws for 5-10 minutes...

Timer shows: 07:23

User clicks [I'm Done - Score My Work]:

Scoring algorithm:
const score = scoreBlankSheet(
  userText,
  originalConcepts,
  originalConnections
)

From: src/features/learning-session/phases/retain-ai.ts

Analyzes:
1. Concepts recalled (text matching)
2. Connections mentioned
3. Relationship types (requires, enables, etc.)
4. Tier coverage (foundation vs keystone vs utility)

Results shown:
┌─────────────────────────────────────────────────────┐
│ Blank Sheet Score: 78/100 🎯                        │
│                                                      │
│ ⭐⭐⭐⭐☆ B+ (Very Good Recall)                      │
│                                                      │
│ Concepts Recalled: 6/12 foundation (50%)            │
│ ████████████░░░░░░░░░░░░                           │
│                                                      │
│ Connections Recalled: 4/8 (50%)                     │
│ ████████████░░░░░░░░░░░░                           │
│                                                      │
│ Relationship Accuracy: 3/4 (75%)                    │
│ ████████████████████░░░░                           │
│                                                      │
│ What You Remembered Well:                           │
│ ✓ VM Sizes and Families (fully recalled)           │
│ ✓ Disk Configuration (core details)                │
│ ✓ Network Interfaces (relationships clear)         │
│                                                      │
│ What Needs Review:                                  │
│ ⚠ Load Balancers (partially recalled)              │
│ ⚠ Availability Sets (not mentioned)                │
│ ⚠ Storage Accounts (confused with Disk Config)     │
│                                                      │
│ 🔥 Coach: "You pulled it from memory. That's       │
│            REAL knowledge. Now strengthen           │
│            those weak spots."                       │
│                                                      │
│ Spacing Recommendation:                             │
│ Next review: Tomorrow at 2:00 PM (1 day interval)  │
│ [Schedule Review] [Review Weak Spots Now]          │
│                                                      │
│ [Continue to Master Phase]                          │
└─────────────────────────────────────────────────────┘

Score interpretation:
90-100: A (Excellent) → 7-day interval
80-89: B (Very Good) → 3-day interval
70-79: C (Good) → 1-day interval
60-69: D (Fair) → Re-review today
<60: F (Poor) → Remediation required

Metrics stored:
sessionTracker.recordConceptMastery(conceptId, blankSheetScore)

On [Schedule Review]:
const spacingEngine = getSpacingEngine()
const review = spacingEngine.scheduleInitialReview(
  conceptId,
  conceptName,
  hasConfusionPairs
)

Review scheduled in DynamoDB + local calendar
Shows confirmation:
┌─────────────────────────────────────────────────────┐
│ ✓ Review Scheduled                                  │
│                                                      │
│ You'll be reminded to review these concepts:        │
│ • Tomorrow at 2:00 PM (push notification)          │
│ • Email reminder 1 hour before                     │
│                                                      │
│ [Add to Calendar] [OK]                              │
└─────────────────────────────────────────────────────┘

On [Review Weak Spots Now]:
Filters to concepts with <50% recall
Shows mini-concept cards for quick review
Then loops back to blank sheet for re-test
G. Master Phase - Transfer Challenge
Phase 4: Master (Transfer - Apply to New Scenarios)

┌─────────────────────────────────────────────────────┐
│ Phase 4: Master Transfer                 [7/7] ██████│
│                                                      │
│ 🔥 Coach                                  [🔊 Play] │
│ "Final test. Can you APPLY this knowledge          │
│  anywhere? Prove it."                               │
│                                                      │
│ Transfer challenges test if you can apply concepts │
│ to brand new scenarios you haven't seen before.    │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Scenario 1 of 5                                  ││
│ │                                                   ││
│ │ You're migrating a legacy on-premises database  ││
│ │ to Azure. The database:                          ││
│ │ • Requires 64 GB RAM minimum                     ││
│ │ • Has 500 GB of data                             ││
│ │ • Needs 99.99% uptime                            ││
│ │ • Must be accessible from multiple regions      ││
│ │                                                   ││
│ │ Design your Azure VM solution. Include:         ││
│ │ 1. VM size/series selection                      ││
│ │ 2. Disk configuration                            ││
│ │ 3. High availability strategy                    ││
│ │ 4. Network design                                ││
│ │                                                   ││
│ │ ┌────────────────────────────────────────────┐  ││
│ │ │ Write your solution:                        │  ││
│ │ │                                              │  ││
│ │ │                                              │  ││
│ │ │                                              │  ││
│ │ └────────────────────────────────────────────┘  ││
│ │                                                   ││
│ │ [Submit Solution]                                ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ [Skip] [Hint]                                       │
└─────────────────────────────────────────────────────┘

These are open-ended scenarios that require:
1. Synthesizing multiple concepts
2. Making trade-off decisions
3. Justifying choices
4. Recognizing constraints

User types solution and clicks [Submit]:

AI scoring (basic keyword matching + concept identification):
const keywords = extractKeywords(userSolution)
const conceptsUsed = identifyConceptsUsed(keywords, allConcepts)
const completeness = calculateCompleteness(conceptsUsed, requiredConcepts)

┌─────────────────────────────────────────────────────┐
│ Solution Review                                      │
│                                                      │
│ Your approach: ⭐⭐⭐⭐☆ (Good)                      │
│                                                      │
│ Concepts Applied Correctly:                         │
│ ✓ E-series for memory optimization (perfect!)      │
│ ✓ Premium SSD for performance (good choice)        │
│ ✓ Availability Sets for uptime (essential)         │
│ ✓ VNet peering for multi-region (solid)            │
│                                                      │
│ Missing Considerations:                              │
│ ⚠ Didn't mention backup strategy                   │
│ ⚠ Could optimize cost with Reserved Instances      │
│                                                      │
│ Model Solution (Expert Approach):                   │
│ [Expand to compare]                                 │
│                                                      │
│ [Next Scenario]                                     │
└─────────────────────────────────────────────────────┘

After 5 scenarios:
┌─────────────────────────────────────────────────────┐
│ 🎉 Mastery Achieved!                                │
│                                                      │
│ Transfer Score: 4.2/5.0 (84%)                       │
│ Time: 22 minutes                                    │
│                                                      │
│ You successfully:                                    │
│ ✓ Applied concepts to new scenarios                │
│ ✓ Made appropriate trade-off decisions             │
│ ✓ Justified your architectural choices              │
│ ✓ Recognized real-world constraints                │
│                                                      │
│ Concept Mastery Breakdown:                          │
│ • VM Sizes: Mastered ⭐                             │
│ • Disk Config: Mastered ⭐                          │
│ • Network: Mastered ⭐                              │
│ • Load Balancers: Proficient ⭐                     │
│ • Availability: Proficient ⭐                       │
│                                                      │
│ 🔥 Coach: "You can transfer knowledge. You EARNED  │
│            this mastery. Stay hard."                │
│                                                      │
│ Overall Session Stats:                              │
│ • Time invested: 42 minutes                         │
│ • Concepts mastered: 5/47 (11%)                    │
│ • Next session progress: 11%                        │
│                                                      │
│ [View Full Progress] [Schedule Next Session]       │
│ [Return to Library]                                 │
└─────────────────────────────────────────────────────┘

Session completion metrics:
sessionTracker.endSession()

Stores:
- sessionId, duration, conceptsMastered
- phaseCompletions: [prime, scout, preview, build, apply, retain, master]
- scores: { preview: N/A, apply: 75%, retain: 78%, master: 84% }
- weakConcepts: [...conceptIds with <70% scores]

Progress persisted:
useProgressStore.updateProgress({
  completedConcepts: [...existing, ...newlyMastered],
  sessionHistory: [...sessions, currentSession],
  nextRecommendedConcepts: [...calculated by algorithm]
})

Cloud sync:
POST /api/progress
Body: { userId, sessionId, progress, metrics }
H. Confusion Drills (Triggered as Needed)
Confusion drills trigger when:
1. User selects wrong answer in Apply phase
2. Similar concept names detected (e.g., "Disk" vs "Storage Account")
3. Blank sheet test shows confusion between concepts

Trigger example:
User confused Load Balancers with Application Gateway in question

System detects similarity:
const pairs = findConfusionPairs(concept, allConcepts, threshold=0.7)
// Returns: [{ concept1: LoadBalancer, concept2: AppGateway, score: 0.82 }]

if (pairs.length > 0) {
  Show confusion drill:
  
  ┌─────────────────────────────────────────────────┐
  │ ⚠ Confusion Drill                                │
  │                                                  │
  │ You seem to be mixing up these concepts:        │
  │ • Load Balancers                                │
  │ • Application Gateway                           │
  │                                                  │
  │ Let's clarify the difference.                   │
  │                                                  │
  │ [Start Drill] [Skip for Now]                    │
  └─────────────────────────────────────────────────┘
  
  User clicks [Start Drill]:
  
  ┌─────────────────────────────────────────────────┐
  │ Confusion Drill: Load Balancers vs App Gateway  │
  │                                           [1/3]  │
  │                                                  │
  │ Scenario:                                        │
  │ You need to distribute traffic across multiple  │
  │ VMs and terminate SSL connections at the edge.  │
  │                                                  │
  │ Which should you use?                           │
  │                                                  │
  │ A) Load Balancer                                │
  │ B) Application Gateway                          │
  │                                                  │
  │ [Select Answer]                                 │
  └─────────────────────────────────────────────────┘
  
  Correct answer: B (Application Gateway)
  
  Explanation:
  ┌─────────────────────────────────────────────────┐
  │ ✓ Correct!                                       │
  │                                                  │
  │ Key Difference:                                  │
  │ • Load Balancer: Layer 4 (transport layer)     │
  │   → Cannot terminate SSL                        │
  │   → Faster, simpler                             │
  │                                                  │
  │ • Application Gateway: Layer 7 (application)    │
  │   → CAN terminate SSL                           │
  │   → More features (URL routing, WAF)           │
  │                                                  │
  │ Memory Aid:                                     │
  │ Load Balancer = "Dumb pipe" (fast, simple)     │
  │ App Gateway = "Smart router" (SSL, routing)    │
  │                                                  │
  │ [Next Question 2/3]                             │
  └─────────────────────────────────────────────────┘
  
  After 3 questions (80%+ correct):
  ┌─────────────────────────────────────────────────┐
  │ ✓ Confusion Cleared!                             │
  │                                                  │
  │ Score: 2/3 (67%)                                │
  │ You now understand the key differences.         │
  │                                                  │
  │ Quick Reference:                                 │
  │ Use Load Balancer when:                         │
  │ • Simple traffic distribution                   │
  │ • Layer 4 routing is sufficient                 │
  │ • Cost optimization priority                    │
  │                                                  │
  │ Use Application Gateway when:                   │
  │ • SSL termination needed                        │
  │ • URL-based routing required                    │
  │ • Web Application Firewall (WAF) needed        │
  │                                                  │
  │ [Continue Learning] [Review Again Later]       │
  └─────────────────────────────────────────────────┘
  
  Metrics stored:
  sessionTracker.recordConfusionDrill(conceptId, passed: true)
}
I. Spaced Review System
After completing Master phase, spaced reviews are scheduled:

Spacing intervals: [1, 3, 7, 14, 30] days

For each mastered concept:
spacingEngine.scheduleInitialReview(conceptId, conceptName, hasConfusionPairs)

If concept has confusion pairs:
interval = interval * confusionPairMultiplier (0.7)
// Example: 3 days → 2.1 days (rounded to 2)

Review notification (next day):
┌─────────────────────────────────────────────────────┐
│ 🔔 Review Due                                        │
│                                                      │
│ Azure Virtual Machines                              │
│ 5 concepts due for review:                          │
│ • VM Sizes and Families                             │
│ • Disk Configuration                                │
│ • Network Interfaces                                │
│ • Load Balancers                                    │
│ • Availability Sets                                 │
│                                                      │
│ Estimated time: 8 minutes                           │
│                                                      │
│ [Start Review] [Snooze 1 Hour] [Skip Today]        │
└─────────────────────────────────────────────────────┘

User clicks [Start Review]:

Review format = Mini blank sheet test
┌─────────────────────────────────────────────────────┐
│ Quick Review: VM Sizes and Families          [1/5]  │
│                                                      │
│ From memory, answer:                                │
│                                                      │
│ 1. What are the main VM series? (List 3-4)        │
│ ┌────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ 2. When would you use E-series VMs?                │
│ ┌────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [Check My Answers]                                  │
└─────────────────────────────────────────────────────┘

Scoring:
const score = scoreReview(userAnswers, expectedAnswers)

If score ≥ 80%:
┌─────────────────────────────────────────────────────┐
│ ✓ Review Passed!                                    │
│                                                      │
│ Score: 85%                                          │
│ Your memory is strong.                              │
│                                                      │
│ Next review: 3 days from now                        │
│ [OK]                                                 │
└─────────────────────────────────────────────────────┘

Progression:
spacingEngine.recordReviewResult(conceptId, success: true)
// Moves to next interval: 1 → 3 → 7 → 14 → 30 days

If score < 80%:
┌─────────────────────────────────────────────────────┐
│ ⚠ Review Needs Work                                 │
│                                                      │
│ Score: 65%                                          │
│ Let's strengthen this memory.                       │
│                                                      │
│ What you missed:                                    │
│ • F-series VMs (you said "D-series")               │
│ • E-series use case (incomplete)                    │
│                                                      │
│ [Review Concept Again] [Quick Quiz]                │
└─────────────────────────────────────────────────────┘

Regression:
spacingEngine.recordReviewResult(conceptId, success: false)
// Resets to first interval: back to 1 day

All review activity tracked:
sessionTracker.recordScheduledReview(conceptId, reviewDate, onTime: true)

Metrics dashboard shows:
- Retention rate: 85% (reviews passed / total reviews)
- Spacing adherence: 92% (reviews on time / total reviews)
- Concepts at each interval: 1-day (5), 3-day (8), 7-day (12), etc.
Learning Session Navigation & Progress Persistence
Navigation Bar
Session header (persistent across all phases):

┌─────────────────────────────────────────────────────┐
│ [← Back] Azure Virtual Machines              [⋮]   │
│                                                      │
│ Phase Progress:                                     │
│ ●●●●○○○ 4/7                                        │
│ Prime • Scout • Preview • Build • Apply • Retain • Master
│                         ▲ You are here              │
│                                                      │
│ Session: 23:45 elapsed • 28/47 concepts (60%)      │
│                                                      │
│ [Save & Exit] [Settings]                            │
└─────────────────────────────────────────────────────┘

Click [← Back]:
Shows confirmation if unsaved changes:
┌─────────────────────────────────────────────────────┐
│ Save Progress?                                       │
│                                                      │
│ You have unsaved work in the Build phase.          │
│                                                      │
│ [Save & Exit] [Exit Without Saving] [Cancel]       │
└─────────────────────────────────────────────────────┘

Click [⋮] menu:
┌─────────────────────────────────────────────────────┐
│ Session Options                                      │
│                                                      │
│ 📊 View Progress Details                            │
│ ⚙️ Session Settings                                 │
│ 🎓 Coach Settings                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 🔄 Restart Current Phase                            │
│ ⏭ Skip to Next Phase (if allowed)                  │
│ 💾 Force Save Progress                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 🏠 Return to Library                                │
│ 🚪 Exit Session                                     │
└─────────────────────────────────────────────────────┘
Progress Persistence (Critical Feature)
Auto-save every 30 seconds:
saveSessionProgress({
  sessionId,
  subjectId,
  progress: {
    currentPhase: 'build',
    currentConcept: 'load-balancers',
    completedPhases: ['prime', 'scout', 'preview'],
    conceptMap: { nodes, connections },
    applyResults: { questions, answers },
    blankSheetText: "...",
    masterScenarios: [...]
  },
  timestamp: Date.now()
})

Saved to: localStorage (fast, immediate)
Also queued for: DynamoDB sync (background, when online)

On page refresh / tab close / navigate away:
Browser beforeunload event triggers final save:
window.addEventListener('beforeunload', (e) => {
  const hasUnsavedChanges = checkUnsavedChanges()
  if (hasUnsavedChanges) {
    saveSessionProgress(currentProgress)
    e.preventDefault()
    e.returnValue = '' // Show browser confirmation
  }
})

On return (any time within 24 hours):
const saved = loadSessionProgress(sessionId)
if (saved) {
  Show recovery banner:
  ┌─────────────────────────────────────────────────┐
  │ 📌 Resume from where you left off?              │
  │ Last active: 2 hours ago in Build phase        │
  │ [Resume] [Start Fresh]                          │
  └─────────────────────────────────────────────────┘
}

Cleanup:
After 24 hours, stale progress is deleted:
cleanupExpiredProgress() // Runs on app init

---

## 5. Development Roadmap & Phasing

### Phase 1: MVP (Months 1-3)
**Goal:** Validate core value proposition with 100-500 users

**Features:**
- Single-pass AI content generation (Standard depth only)
- Manual content entry (fallback option)
- 4-phase learning session (Learn → Connect → Recall → Apply)
- Text-only coach (2 personalities)
- Basic spaced repetition (fixed intervals: 1, 3, 7, 14, 30 days)
- localStorage + IndexedDB only (no cloud yet)
- Web app only (no mobile apps)

**Metrics to validate:**
- Do users complete at least 1 full learning session? (Target: 40%)
- Do users return for reviews? (Target: 30% D7 retention)
- Would users pay? (Survey: 50%+ say "definitely yes")

### Phase 2: Cloud & Polish (Months 4-5)
**Goal:** Make it production-ready for paid launch

**Features:**
- User authentication (Clerk or Supabase Auth)
- Cloud storage (DynamoDB + S3)
- Cross-device sync
- Improved UI/UX based on feedback
- Basic analytics dashboard
- Stripe payment integration
- Email notifications for reviews

### Phase 3: Premium Features (Months 6-7)
**Goal:** Justify $15-20/month pricing

**Features:**
- Browser TTS voice coach
- Advanced analytics (retention curves, concept mastery)
- Export features (PDF, Anki, Markdown)
- Team features (share subjects, track team progress)
- Mobile PWA (not native apps yet)
- 3rd coach personality based on user requests

### Phase 4: Scale & Optimize (Months 8-12)
**Goal:** Get to 1,000+ paying users

**Features:**
- Pre-recorded coach voice (20 key messages)
- Native mobile apps (iOS, Android)
- Content marketplace (users share/sell subjects)
- API for integrations
- Advanced concept mapping (auto-suggestions)
- White-label option for B2B

### Not Building (At Least Year 1):
- ❌ Multi-language support
- ❌ Video content integration
- ❌ Live tutoring/coaching
- ❌ Social features (forums, chat)
- ❌ Custom AI model training

---

## 5. Development Roadmap & Phasing

### Phase 1: MVP Launch (Month 1-3)
**Goal:** Prove the "Learn faster with SHAPE" value proposition
**Features:**
- AI Generation (AWS Bedrock) - Single user
- AI Coach (Text-only)
- Learning Sessions (4 phases)
- Basic spaced repetition cards

### Phase 2: Cloud & Polish (Months 4-5)
**Goal:** Make it production-ready for paid launch
**Features:**
- User authentication
- Cloud storage (DynamoDB + S3)
- Cross-device sync
- Stripe payment integration

### Phase 2.5: Community Platform (Months 6-7)
**Goal:** Transform into collaborative platform

**Features:**
- Content sharing & discovery
- Search & browse published content
- Rating & review system
- Creator profiles & reputation
- Content forking & remixing
- Basic moderation tools

### Phase 3: Premium Features (Months 8-9)
**Goal:** Justify higher pricing tiers
**Features:**
- Browser TTS voice coach
- Advanced analytics
- Team features
- Mobile PWA

### Phase 4: Marketplace (Year 2)
**Goal:** Scale with Creator Economy
**Features:**
- Premium content sales
- Creator monetization
- Expert verification program
- Advanced analytics for creators
- Native mobile apps

---

## 6. Technical & Business Risks

### Risk 1: AI Costs Spiral
**Mitigation:**
- Aggressive caching (30-day TTL for common subjects)
- Pre-generate top 50 certification subjects
- Use cheaper models (Haiku) for validation
- Rate limiting per tier (Free: 3/mo, Pro: 25/mo)
- Monitor cost per generation, alert if >$0.20

**Budget:** $500-2000/month for 1000-5000 generations

### Risk 2: Low Engagement (Users Don't Return)
**Mitigation:**
- Email reminders for reviews (not too spammy)
- Push notifications (with user permission)
- Streak tracking (gamification)
- Make reviews quick (5-10 min sessions)
- Flexible scheduling (not militant like Anki)

**Target:** 30% D7 retention, 20% D30 retention

### Risk 3: Content Quality Issues
**Mitigation:**
- Validation scoring in generation pipeline
- User reporting ("This seems wrong")
- Human QA for top 50 subjects
- Community voting on accuracy
- "AI-generated" badge + disclaimer

**Process:** Review flagged content weekly, fix within 48 hours

### Risk 4: Users Won't Pay
**Mitigation:**
- Start with generous free tier (validate value first)
- Clear upgrade prompts when limits hit
- 7-day free trial of Pro features
- Target users who already pay (cert exam prep)
- Show ROI: "This costs less than 1 practice exam"

**Pricing research:** Survey 100 beta users before launch

### Risk 5: Technical Complexity
**Mitigation:**
- Use proven tech stack (Next.js, Tailwind, AWS)
- Simplify Phase 1 scope ruthlessly
- Buy vs build (Auth: Clerk, Payments: Stripe, Email: Resend)
- Hire contractor for complex pieces (if needed)
- Budget 20% extra time for unknowns

**Complexity score:** Medium (AI integration is hardest part)