# Unified Progressive Flow - Testing Guide

Quick reference for testing the ORIENT phase integration.

---

## Setup

### 1. Enable Feature Flag

Add to `.env` or `.env.local`:
```bash
VITE_UNIFIED_FLOW_ENABLED=true
```

### 2. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Restart
npm run dev
```

---

## Testing Scenarios

### Scenario 1: Tired User (Low Energy)

**Expected Component**: PriorKnowledgeActivation

**Steps:**
1. Start a new learning session
2. Select mood: "Tired" or "Struggling"
3. Complete PRIME phase (intent setting)
4. Should see ORIENT phase with:
   - Title: "What Do You Already Know?"
   - Shows first 3 concepts only
   - Free text input for each concept
   - Minimal cognitive load design

**Completion:**
- Enter text for at least 1 concept
- Click "Continue to Structure"
- Should see toast: "Schema Priming complete!"
- Should transition to next phase

---

### Scenario 2: Medium Energy User

**Expected Component**: PredictionSkeleton

**Steps:**
1. Start a new learning session
2. Select mood: "Okay" or "Good"
3. Complete PRIME phase
4. Should see ORIENT phase with:
   - Title: "What Do You Expect to Learn?"
   - Shows ALL concepts
   - Dropdown predictions for each
   - Moderate cognitive load

**Completion:**
- Make predictions for at least 50% of concepts
- Click "Continue to Structure"
- Should see toast: "Schema Priming complete!"
- Should transition to next phase

---

### Scenario 3: High Energy User

**Expected Component**: GenerativeOrienting

**Steps:**
1. Start a new learning session
2. Select mood: "Pumped"
3. Complete PRIME phase
4. Should see ORIENT phase with:
   - Title: "Explore & Predict"
   - Three tabs: Scout, Predict, Question
   - Full generative interface
   - High cognitive engagement

**Completion:**
- Complete all three tabs:
  - Scout: Read all concepts
  - Predict: Make predictions
  - Question: Generate questions
- Click "Continue to Structure"
- Should see toast: "Schema Priming complete!"
- Should transition to next phase

---

## Verification Checklist

### Visual Checks
- [ ] Component renders without errors
- [ ] Styling looks correct (responsive, accessible)
- [ ] Icons display properly
- [ ] Animations are smooth
- [ ] Loading state shows during lazy load

### Functional Checks
- [ ] Can interact with all UI elements
- [ ] Completion button enables when requirements met
- [ ] Phase completion updates store
- [ ] Toast notification appears
- [ ] Transitions to next phase correctly

### Accessibility Checks
- [ ] Can navigate with keyboard (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader compatible

### Performance Checks
- [ ] Component lazy loads (check Network tab)
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth 60fps animations

---

## Debugging

### Component Not Showing

**Check:**
1. Feature flag enabled: `import.meta.env.VITE_UNIFIED_FLOW_ENABLED === 'true'`
2. Phase is ORIENT: Check `unifiedPhase` in React DevTools
3. Component available: Check `componentMap` in `component-loader.ts`
4. No console errors

**Fix:**
- Restart dev server after changing `.env`
- Clear browser cache
- Check browser console for errors

### Wrong Component Showing

**Check:**
1. Mood selection: Check `studySession.mood` in store
2. Adapter logic: Check `usePhaseAdapter` return value
3. Component map: Verify correct component for mood

**Fix:**
- Verify mood is set correctly in PRIME phase
- Check adapter logic in `usePhaseAdapter.ts`

### Phase Not Completing

**Check:**
1. Completion requirements met
2. `onComplete` handler called
3. Store updates applied
4. Phase progress flags updated

**Fix:**
- Check completion logic in component
- Verify `handleUnifiedPhaseComplete` in VelocityLearning
- Check store state in React DevTools

### Fallback to Legacy Flow

**Expected Behavior:**
- If feature flag disabled → legacy flow
- If component not available → legacy flow
- If phase not enabled in config → legacy flow

**This is correct!** The fallback ensures the app always works.

---

## Store State Inspection

### Using React DevTools

1. Open React DevTools
2. Find `VelocityLearning` component
3. Check hooks:
   - `useLearningFlow` → `unifiedPhase`
   - `usePhaseAdapter` → `phaseAdapter`
4. Check store state:
   - `studySession.phaseProgress`
   - `studySession.adaptations`
   - `studySession.mood`

### Expected State After ORIENT Completion

```typescript
studySession: {
  phaseProgress: {
    orientCompleted: true,  // ✅ Should be true
    structureCompleted: false,
    encodeStarted: false,
    verifyCompleted: false
  },
  adaptations: {
    orientMode: 'prior-knowledge' | 'prediction-skeleton' | 'generative',
    structureMode: undefined,
    encodeMode: undefined,
    verifyMode: undefined
  }
}
```

---

## Network Tab Inspection

### Lazy Loading Verification

1. Open DevTools → Network tab
2. Filter: JS
3. Start learning session
4. Watch for dynamic imports:
   - `PriorKnowledgeActivation-[hash].js`
   - `PredictionSkeleton-[hash].js`
   - `GenerativeOrienting-[hash].js`

**Expected:**
- Only ONE component loads (based on mood)
- Loads when ORIENT phase starts
- Cached for subsequent visits

---

## Common Issues

### Issue: "Component not found"

**Cause:** Component not in `componentMap`

**Fix:** Check `component-loader.ts` - ensure component is imported and mapped

### Issue: Infinite loading spinner

**Cause:** Lazy import failed or component has error

**Fix:** Check browser console for import errors

### Issue: Phase doesn't transition

**Cause:** Completion handler not updating store

**Fix:** Verify `handleUnifiedPhaseComplete` calls `updateSession`

### Issue: Wrong mood variant showing

**Cause:** Mood not set or adapter logic incorrect

**Fix:** Verify mood in PRIME phase, check adapter logic

---

## Success Criteria

### ✅ Integration Successful When:

1. All three mood variants render correctly
2. Phase completion updates store properly
3. Transitions to next phase smoothly
4. Toast notifications appear
5. No console errors
6. Lazy loading works
7. Fallback to legacy flow when flag disabled
8. Accessibility features work
9. Performance is smooth (60fps)
10. Store state is correct after completion

---

## Next Steps After Testing

### If Tests Pass ✅
- Document any issues found
- Proceed with Phase 4 (STRUCTURE components)
- Consider enabling for beta users

### If Tests Fail ❌
- Document specific failures
- Create bug report with:
  - Steps to reproduce
  - Expected vs actual behavior
  - Console errors
  - Store state
  - Screenshots/video
- Fix issues before proceeding

---

## Rollback Plan

### If Critical Issues Found

1. **Immediate:** Disable feature flag
   ```bash
   VITE_UNIFIED_FLOW_ENABLED=false
   ```

2. **Redeploy:** Push updated `.env` to production

3. **Investigate:** Debug in development environment

4. **Fix:** Address issues

5. **Re-test:** Complete testing checklist again

6. **Re-enable:** When confident in fix

---

## Performance Benchmarks

### Target Metrics

- **Initial Load:** < 100ms (lazy loaded)
- **Interaction Response:** < 16ms (60fps)
- **Phase Transition:** < 300ms
- **Memory Usage:** < 5MB increase
- **Bundle Size:** < 50KB per component

### Measuring

```javascript
// In browser console
performance.mark('orient-start');
// ... interact with component ...
performance.mark('orient-end');
performance.measure('orient-duration', 'orient-start', 'orient-end');
console.log(performance.getEntriesByName('orient-duration'));
```

---

## Feedback Collection

### User Testing Questions

1. Was the ORIENT phase helpful?
2. Did the mood-based variant feel appropriate?
3. Was the cognitive load comfortable?
4. Did you understand what to do?
5. Any confusion or frustration?
6. Suggestions for improvement?

### Analytics to Track

- Completion rate per mood variant
- Time spent in ORIENT phase
- Interaction patterns
- Drop-off points
- Error rates

---

## Conclusion

This guide provides everything needed to test the ORIENT phase integration. Follow the scenarios, verify the checklist, and document any issues. The integration is designed to be robust with proper fallbacks, so testing should be straightforward.

Happy testing! 🧪
