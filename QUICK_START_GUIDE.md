# Quick Start Guide - AI Coach & Storage Features

## 🚀 Using the AI Coach in Your Components

### Option 1: Using the `useCoachMessage` Hook (Recommended)

```tsx
import { useCoachMessage } from '@/hooks/useCoachMessage';
import { CoachMessage } from '@/components/learning/coach';

function MyLearningComponent() {
  const { currentMessage, showMessage } = useCoachMessage();

  const handlePhaseComplete = () => {
    // Show success message from coach
    showMessage('build', 'success', 5000); // Auto-dismiss after 5s
  };

  return (
    <div>
      {/* Your component content */}
      
      {/* Coach message display */}
      {currentMessage && (
        <CoachMessage message={currentMessage} showVoiceButton={true} />
      )}
    </div>
  );
}
```

### Option 2: Direct Component Usage

```tsx
import { CoachMessage } from '@/components/learning/coach';
import { getPersonaResponse } from '@/features/ai-coach';
import { usePersonalizationStore } from '@/store/personalization-store';

function MyComponent() {
  const { selectedPersona } = usePersonalizationStore();
  const message = getPersonaResponse(selectedPersona, 'prime', 'intro');

  return (
    <CoachMessage 
      message={message}
      showVoiceButton={true}
      compact={false}
    />
  );
}
```

---

## 🎭 Available Coach Messages

### Phases
- `'prime'` - Set intention phase
- `'scout'` - Explore/survey phase
- `'preview'` - Problem preview phase
- `'build'` - Concept building phase
- `'apply'` - Practice/application phase
- `'retain'` - Memory/recall phase
- `'master'` - Transfer/mastery phase

### Situations
- `'intro'` - Phase introduction
- `'encouragement'` - During progress
- `'struggle'` - When user is struggling
- `'success'` - After completion
- `'transition'` - Moving to next phase

### Example Usage

```tsx
// Show intro message for build phase
showMessage('build', 'intro');

// Show encouragement during apply phase
showMessage('apply', 'encouragement');

// Show struggle message (longer timeout)
showMessage('build', 'struggle', 10000);
```

---

## 😊 Mood Selection

### Adding Mood Selector to Your Page

```tsx
import { MoodSelector, type Mood } from '@/components/learning/coach';
import { useLearningStore } from '@/store/learning-store';

function MyPage() {
  const [showMoodSelector, setShowMoodSelector] = useState(true);
  const { setMood } = useLearningStore();

  const handleMoodSelect = (mood: Mood) => {
    setMood(mood);
    setShowMoodSelector(false);
    // Show mood-adjusted intro message
  };

  return (
    <>
      {/* Your page content */}
      
      <MoodSelector
        isOpen={showMoodSelector}
        onSelect={handleMoodSelect}
        onClose={() => setShowMoodSelector(false)}
      />
    </>
  );
}
```

### Mood Types
- `'pumped'` - High energy, ready to go
- `'good'` - Focused and ready
- `'okay'` - Neutral, could use motivation
- `'struggling'` - Having difficulty
- `'tired'` - Low energy, need gentle guidance

---

## 🔍 Struggle Detection

### Basic Usage

```tsx
import { useStruggleDetector } from '@/hooks/useStruggleDetector';

function MyLearningActivity() {
  const { state, recordCorrectAnswer, recordIncorrectAnswer } = useStruggleDetector({
    idleThresholdSeconds: 45,
    errorThreshold: 2,
    onStruggleChange: (state) => {
      if (state.isStruggling) {
        console.log('User is struggling:', state.strugglingReason);
        // Show encouragement message
      }
    },
  });

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      recordCorrectAnswer();
    } else {
      recordIncorrectAnswer();
    }
  };

  return (
    <div>
      {state.isStruggling && (
        <div>Struggling detected: {state.strugglingReason}</div>
      )}
      {/* Your activity UI */}
    </div>
  );
}
```

### Struggle Reasons
- `'idle'` - No interaction for >45 seconds
- `'error_rate'` - 2+ consecutive errors
- `'hesitation'` - High backspace rate (30+ per minute)

---

## 💾 Cloud Storage Sync

### Syncing User Progress

```tsx
import { cloudStorage } from '@/features/content-storage';

async function syncProgress() {
  const userId = 'user-123';
  const subjectId = 'subject-456';
  
  // Get local progress from IndexedDB
  const localProgress = await getLocalProgress(userId, subjectId);
  
  // Sync with cloud (merges automatically)
  const mergedProgress = await cloudStorage.syncUserProgress(
    userId,
    subjectId,
    localProgress
  );
  
  // Save merged progress back to local
  await saveLocalProgress(mergedProgress);
}
```

### Checking Storage Quota

```tsx
import { indexedDBStorage } from '@/features/content-storage';

async function checkStorage() {
  const quota = await indexedDBStorage.checkStorageQuota();
  
  if (quota?.isNearLimit) {
    console.warn(`Storage at ${quota.usagePercent}%`);
    
    // Run cleanup if needed
    await indexedDBStorage.runEvictionPolicy();
  }
}
```

---

## 🎨 Styling Coach Messages

### Custom Styling

```tsx
<CoachMessage 
  message="Your message here"
  className="my-custom-class"
  compact={true}  // Smaller version
/>
```

### CSS Variables Available

```css
/* In your component CSS */
.myComponent {
  --color-primary: #your-color;
  --color-surface-secondary: #your-bg;
  --color-text-primary: #your-text;
}
```

---

## 🧪 Testing Your Integration

### 1. Test Mood Selector
- [ ] Modal appears on page load
- [ ] All 5 moods are selectable
- [ ] Coach persona displays correctly
- [ ] Skip button works
- [ ] Continue button is disabled until mood selected

### 2. Test Coach Messages
- [ ] Messages display with correct persona
- [ ] Voice button appears (if enabled)
- [ ] Messages auto-dismiss after timeout
- [ ] Compact mode works
- [ ] Mood adjustment affects message content

### 3. Test Struggle Detection
- [ ] Idle detection triggers after 45s
- [ ] Error detection triggers after 2 errors
- [ ] Callback fires when struggling
- [ ] recordCorrectAnswer resets error count
- [ ] recordInteraction resets idle timer

### 4. Test Storage Sync
- [ ] syncUserProgress merges data correctly
- [ ] Conflicts are logged
- [ ] Fallback to local on sync failure
- [ ] Quota check returns valid data
- [ ] Eviction policy runs at 80% usage

---

## 🐛 Common Issues & Solutions

### Issue: Coach message not showing
**Solution**: Check that `currentMessage` is not null and CoachMessage component is rendered

### Issue: Mood not affecting messages
**Solution**: Ensure `useMoodAdjustment: true` in useCoachMessage options

### Issue: Struggle detection not triggering
**Solution**: Verify thresholds are set correctly and callback is defined

### Issue: Sync failing silently
**Solution**: Check browser console for errors, verify cloud storage is configured

### Issue: Storage quota always null
**Solution**: Check if `navigator.storage.estimate()` is supported in browser

---

## 📚 Additional Resources

- **Full Implementation Details**: See `IMPLEMENTATION_COMPLETE.md`
- **Persona Definitions**: `src/features/ai-coach/personas.ts`
- **Hook Documentation**: `src/hooks/useCoachMessage.ts`
- **Storage API**: `src/features/content-storage/`

---

## 💡 Pro Tips

1. **Use `useCoachMessage` hook** instead of managing state manually
2. **Set longer timeouts for struggle messages** (10s vs 5s)
3. **Check quota on app startup** to prevent storage issues
4. **Log sync conflicts** during development for debugging
5. **Test with different personas** to ensure messages work for all

---

## 🎯 Next Steps

1. Test the mood selector in your learning flow
2. Add coach messages to key learning phases
3. Integrate struggle detection in practice activities
4. Set up automatic progress syncing
5. Monitor storage usage in production

**Happy Coding! 🚀**
