# Full Migration Script: src/lib/ → src/features/ and src/shared/
# This script completes the folder reorganization

Write-Host "Starting full migration of src/lib/ folder..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Move AI Coach files
Write-Host "Step 1: Migrating AI Coach..." -ForegroundColor Yellow

# Read the old coach index.ts content
$oldCoachContent = Get-Content "src/lib/ai/coach/index.ts" -Raw

# Merge it into the new ai-coach index.ts
$newCoachPath = "src/features/ai-coach/index.ts"
$newCoachContent = @"
/**
 * AI Coach Feature
 * AI coach personalities, voice, and mood-based adjustments
 */

export * from './personas';
export * from './voice/static-lines';
export * from './voice/useVoice';

// Mood types and utilities
export type Mood = 'energized' | 'neutral' | 'tired' | 'stressed';

export interface MoodOption {
    id: Mood;
    emoji: string;
    label: string;
    description: string;
    sessionAdjustment: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
    {
        id: 'energized',
        emoji: '😊',
        label: 'Energized',
        description: 'Focused and ready to tackle challenges',
        sessionAdjustment: 'Full intensity, challenging concepts first'
    },
    {
        id: 'neutral',
        emoji: '😐',
        label: 'Neutral',
        description: "Let's see how it goes",
        sessionAdjustment: 'Standard pacing, balanced approach'
    },
    {
        id: 'tired',
        emoji: '😴',
        label: 'Tired',
        description: 'Low energy but showing up',
        sessionAdjustment: 'Shorter bursts, more encouragement, easier concepts first'
    },
    {
        id: 'stressed',
        emoji: '😤',
        label: 'Stressed',
        description: 'Need to clear my head',
        sessionAdjustment: 'Extended calming intro, easy wins first'
    }
];

/**
 * Get mood-adjusted intro from persona
 */
export function getMoodAdjustedIntro(personaId: string, mood: Mood): string {
    const persona = getPersona(personaId);
    const baseIntro = getPersonaResponse(personaId, 'prime', 'intro');

    // Adjust intro based on mood and persona personality
    switch (mood) {
        case 'tired':
            if (persona.traits.warmth >= 4) {
                return ``I see you're tired today. That's okay—showing up is what matters. ``${baseIntro}``;
            } else if (persona.traits.intensity >= 4) {
                return ``Tired? That's when champions separate themselves. ``${baseIntro}``;
            }
            return baseIntro;

        case 'stressed':
            if (persona.traits.warmth >= 4) {
                return ``Take a moment. Breathe. Learning will help clear your mind. ``${baseIntro}``;
            } else if (personaId === 'socratic') {
                return ``What's causing the stress? Perhaps focused learning can provide clarity. ``${baseIntro}``;
            }
            return baseIntro;

        case 'energized':
            if (persona.traits.intensity >= 4) {
                return ``I like that energy! Let's channel it. ``${baseIntro}``;
            }
            return ``Great energy today! ``${baseIntro}``;

        default:
            return baseIntro;
    }
}

/**
 * Calculate session intensity based on mood
 */
export function getSessionIntensity(mood: Mood): number {
    switch (mood) {
        case 'energized': return 1.0;
        case 'neutral': return 0.8;
        case 'tired': return 0.6;
        case 'stressed': return 0.5;
        default: return 0.8;
    }
}

/**
 * Get breathing exercise recommendation based on mood
 */
export type BreathingPattern = '478' | 'box' | 'quick' | 'none';

export interface BreathingExercise {
    id: BreathingPattern;
    name: string;
    description: string;
    duration: number; // seconds
    pattern: string;
}

export const BREATHING_EXERCISES: Record<BreathingPattern, BreathingExercise> = {
    '478': {
        id: '478',
        name: '4-7-8 Relaxation',
        description: 'Deep relaxation for stress relief',
        duration: 19,
        pattern: 'Inhale 4s → Hold 7s → Exhale 8s'
    },
    box: {
        id: 'box',
        name: 'Box Breathing',
        description: 'Equal rhythm for focus',
        duration: 16,
        pattern: 'Inhale 4s → Hold 4s → Exhale 4s → Hold 4s'
    },
    quick: {
        id: 'quick',
        name: 'Quick Energizer',
        description: 'Three deep breaths to reset',
        duration: 15,
        pattern: '3 deep breaths, in through nose, out through mouth'
    },
    none: {
        id: 'none',
        name: 'Skip Breathing',
        description: 'Go straight to priming',
        duration: 0,
        pattern: ''
    }
};

export function getRecommendedBreathing(mood: Mood): BreathingPattern {
    switch (mood) {
        case 'stressed': return '478';
        case 'tired': return 'quick';
        case 'energized': return 'box';
        case 'neutral': return 'quick';
        default: return 'quick';
    }
}

/**
 * AI Coach singleton for global access
 */
class AICoachService {
    private static instance: AICoachService;
    private currentPhase: string = 'prime';
    private sessionMood: Mood = 'neutral';

    private constructor() { }

    static getInstance(): AICoachService {
        if (!AICoachService.instance) {
            AICoachService.instance = new AICoachService();
        }
        return AICoachService.instance;
    }

    setCurrentPhase(phase: string) {
        this.currentPhase = phase;
    }

    getCurrentPhase(): string {
        return this.currentPhase;
    }

    setSessionMood(mood: Mood) {
        this.sessionMood = mood;
    }

    getSessionMood(): Mood {
        return this.sessionMood;
    }

    getResponse(personaId: string, situation: string, phase?: string): string {
        const targetPhase = phase || this.currentPhase;
        return getPersonaResponse(personaId, targetPhase, situation);
    }

    getIntro(personaId: string, mood?: Mood): string {
        return getMoodAdjustedIntro(personaId, mood || this.sessionMood);
    }
}

export const aiCoach = AICoachService.getInstance();

// Import from personas for the functions used above
import { getPersona, getPersonaResponse } from './personas';
"@

Set-Content -Path $newCoachPath -Value $newCoachContent
Write-Host "✓ Merged AI Coach files" -ForegroundColor Green

# Step 2: Move Storage files
Write-Host ""
Write-Host "Step 2: Migrating Storage files..." -ForegroundColor Yellow

# Create storage manager in content-storage
$storageManagerPath = "src/features/content-storage/manager.ts"
Copy-Item "src/lib/storage/index.ts" $storageManagerPath -Force
Write-Host "✓ Moved storage manager" -ForegroundColor Green

# Move sync-engine to shared/storage
New-Item -ItemType Directory -Path "src/shared/storage" -Force | Out-Null
Copy-Item "src/lib/storage/sync-engine.ts" "src/shared/storage/sync-engine.ts" -Force
Write-Host "✓ Moved sync-engine to shared" -ForegroundColor Green

# Step 3: Move Learning Scoring
Write-Host ""
Write-Host "Step 3: Migrating Learning Scoring..." -ForegroundColor Yellow

New-Item -ItemType Directory -Path "src/features/learning-session/scoring" -Force | Out-Null
Copy-Item "src/lib/learning/scoring/blank-sheet-scorer.ts" "src/features/learning-session/scoring/blank-sheet-scorer.ts" -Force
Write-Host "✓ Moved blank-sheet-scorer" -ForegroundColor Green

# Step 4: Update imports
Write-Host ""
Write-Host "Step 4: Updating imports..." -ForegroundColor Yellow

# Update ai-coach index.ts (already done above)

# Update content-storage index.ts
$contentStorageIndex = Get-Content "src/features/content-storage/index.ts" -Raw
$contentStorageIndex = $contentStorageIndex -replace "export \{ storageManager \} from '@/lib/storage';", "export { storageManager } from './manager';"
Set-Content -Path "src/features/content-storage/index.ts" -Value $contentStorageIndex
Write-Host "✓ Updated content-storage index" -ForegroundColor Green

# Update s3-dynamodb.ts
$s3Content = Get-Content "src/features/content-storage/cloud/s3-dynamodb.ts" -Raw
$s3Content = $s3Content -replace "import \{ SyncEngine \} from '@/lib/storage/sync-engine';", "import { SyncEngine } from '@/shared/storage/sync-engine';"
$s3Content = $s3Content -replace "import type \{ UserProgress, QuizScores \} from '@/lib/storage/sync-engine';", "import type { UserProgress, QuizScores } from '@/shared/storage/sync-engine';"
Set-Content -Path "src/features/content-storage/cloud/s3-dynamodb.ts" -Value $s3Content
Write-Host "✓ Updated s3-dynamodb imports" -ForegroundColor Green

# Update BlankSheetTest.tsx
$blankSheetContent = Get-Content "src/components/learning/activities/BlankSheetTest.tsx" -Raw
$blankSheetContent = $blankSheetContent -replace "import \{ calculateRecallScore \} from '@/lib/learning/scoring/blank-sheet-scorer';", "import { calculateRecallScore } from '@/features/learning-session/scoring/blank-sheet-scorer';"
Set-Content -Path "src/components/learning/activities/BlankSheetTest.tsx" -Value $blankSheetContent
Write-Host "✓ Updated BlankSheetTest imports" -ForegroundColor Green

# Step 5: Delete old src/lib folder
Write-Host ""
Write-Host "Step 5: Deleting old src/lib/ folder..." -ForegroundColor Yellow
Remove-Item -Path "src/lib" -Recurse -Force
Write-Host "✓ Deleted src/lib/" -ForegroundColor Green

# Step 6: Delete old src/hooks and src/constants if they exist
Write-Host ""
Write-Host "Step 6: Cleaning up other deprecated folders..." -ForegroundColor Yellow

if (Test-Path "src/hooks") {
    Remove-Item -Path "src/hooks" -Recurse -Force
    Write-Host "✓ Deleted src/hooks/" -ForegroundColor Green
}

if (Test-Path "src/constants") {
    Remove-Item -Path "src/constants" -Recurse -Force
    Write-Host "✓ Deleted src/constants/" -ForegroundColor Green
}

if (Test-Path "src/services") {
    Remove-Item -Path "src/services" -Recurse -Force
    Write-Host "✓ Deleted src/services/" -ForegroundColor Green
}

Write-Host ""
Write-Host "Migration complete! ✨" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run build" -ForegroundColor White
Write-Host "2. Fix any TypeScript errors" -ForegroundColor White
Write-Host "3. Test the application" -ForegroundColor White
Write-Host "4. Commit the changes" -ForegroundColor White
