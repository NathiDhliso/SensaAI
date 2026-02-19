# Unified Progressive Flow - Integration Plan

## Current Status: 37.5% Complete (3/8 Phases)

### ✅ Completed
1. **Phase 1: Foundation** - Types, migration, store actions
2. **Phase 2: Phase Adapter System** - Routing logic, adapters
3. **Phase 3: ORIENT Components** - All 3 variants (tired, medium, high)

### 🔄 Remaining
4. Phase 4: STRUCTURE Components
5. Phase 5: ENCODE Components
6. Phase 6: VERIFY Components
7. Phase 7: COMPLETE & Integration
8. Phase 8: Polish & Cleanup

---

## Strategic Approach: Phased Integration

### Option A: Complete All Components First (Original Plan)
**Pros:**
- All components ready before integration
- Comprehensive testing possible

**Cons:**
- No validation until end
- Higher risk of integration issues
- Longer time to working prototype

### Option B: Integrate Now with Fallbacks (Recommended)
**Pros:**
- Early validation of architecture
- Can test with users sooner
- Reduced integration risk
- Iterative improvement

**Cons:**
- Need fallback components
- Some features incomplete initially

---

## Recommended: Minimal Viable Integration (MVI)

### Phase 3.5: Minimal Integration (This Week)

**Goal:** Get ORIENT phase working end-to-end in VelocityLearning

**Tasks:**
1. Create component loader utility
2. Update VelocityLearning to use unified flow
3. Add fallback for incomplete phases
4. Test ORIENT phase with all 3 moods
5. Verify phase completion and progression

**Deliverables:**
- Working ORIENT phase in production
- Fallback to old flow for other phases
- Feature flag for gradual rollout

### Benefits
- ✅ Validates architecture works
- ✅ Tests migration in real environment
- ✅ Users can experience new ORIENT phase
- ✅ Reduces risk for remaining phases
- ✅ Provides early feedback

---

## Integration Architecture

### Component Loader
```typescript
// src/features/unified-flow/utils/component-loader.ts
import { lazy } from 'react';

const componentMap = {
  // ORIENT (complete)
  'PriorKnowledgeActivation': lazy(() => import('../components/orient/PriorKnowledgeActivation')),
  'PredictionSkeleton': lazy(() => import('../components/orient/PredictionSkeleton')),
  'GenerativeOrienting': lazy(() => import('../components/orient/GenerativeOrienting')),
  
  // STRUCTURE (fallback to old)
  'AnnotatableMap': null, // TODO: Phase 4
  'GuidedMapBuilder': null, // TODO: Phase 4
  'ConceptMapBuilder': null, // Exists, needs verification
  
  // ENCODE (fallback to old)
  'TiredEncode': null, // TODO: Phase 5
  'StandardAcquisition': null, // TODO: Phase 5
  'InterleavedAcquisition': null, // TODO: Phase 5
  
  // VERIFY (fallback to old)
  'RecognitionTasks': null, // TODO: Phase 6
  'CuedRecall': null, // TODO: Phase 6
  'FreeRecallTransfer': null, // TODO: Phase 6
};

export function getComponent(name: string) {
  return componentMap[name] || null;
}
```

### VelocityLearning Integration
```typescript
// Pseudo-code for integration
const { unifiedPhase, currentPhase } = useLearningFlow();
const adapter = usePhaseAdapter(unifiedPhase, mood);

// Use unified flow if phase is complete, otherwise fallback
if (adapter && getComponent(adapter.componentName)) {
  // NEW: Use unified flow
  return renderUnifiedPhase(adapter);
} else {
  // FALLBACK: Use old flow
  return renderOldPhase(currentPhase);
}
```

---

## Feature Flag Strategy

### Environment Variable
```typescript
// .env
VITE_UNIFIED_FLOW_ENABLED=true
VITE_UNIFIED_FLOW_PHASES=ORIENT,STRUCTURE,ENCODE,VERIFY
```

### Runtime Toggle
```typescript
const UNIFIED_FLOW_CONFIG = {
  enabled: import.meta.env.VITE_UNIFIED_FLOW_ENABLED === 'true',
  phases: {
    ORIENT: true,    // Complete
    STRUCTURE: false, // TODO
    ENCODE: false,    // TODO
    VERIFY: false,    // TODO
  }
};
```

---

## Rollout Plan

### Week 3.5: Minimal Integration
- ✅ ORIENT phase working
- ⏸️ Other phases use old flow
- 🧪 Internal testing only

### Week 4: Add STRUCTURE
- ✅ ORIENT + STRUCTURE working
- ⏸️ ENCODE, VERIFY use old flow
- 🧪 Beta testing (10% users)

### Week 5: Add ENCODE
- ✅ ORIENT + STRUCTURE + ENCODE working
- ⏸️ VERIFY uses old flow
- 🧪 Expanded testing (25% users)

### Week 6: Add VERIFY
- ✅ All phases working
- 🚀 Full rollout (100% users)

### Week 7-8: Polish & Cleanup
- 🎨 Animations, transitions
- 🧹 Remove old code
- 📊 Analytics and optimization

---

## Risk Mitigation

### Risk: Integration Breaks Existing Flow
**Mitigation:**
- Feature flag allows instant rollback
- Fallback to old flow for incomplete phases
- Gradual rollout catches issues early

### Risk: User Confusion During Transition
**Mitigation:**
- Clear messaging about new experience
- Onboarding for new flow
- Support documentation

### Risk: Performance Issues
**Mitigation:**
- Lazy loading of components
- Performance monitoring
- Optimization before full rollout

---

## Success Metrics

### Technical Metrics
- ✅ Zero TypeScript errors
- ✅ All tests passing
- ✅ Performance within 10% of old flow
- ✅ No increase in error rate

### User Metrics
- 📊 ORIENT completion rate ≥90%
- 📊 Time to complete ORIENT phase
- 📊 User satisfaction ≥4/5
- 📊 Session resumption rate

### Business Metrics
- 📈 Overall completion rate
- 📈 Concept retention (7-day)
- 📈 User engagement
- 📈 Session frequency

---

## Next Immediate Actions

### 1. Create Component Loader (30 min)
```bash
src/features/unified-flow/utils/component-loader.ts
```

### 2. Update VelocityLearning (2 hours)
- Import unified flow utilities
- Add phase routing logic
- Implement fallback mechanism
- Test with all moods

### 3. Add Feature Flag (30 min)
- Environment variable
- Runtime configuration
- Toggle in settings

### 4. Test Integration (1 hour)
- Test ORIENT with tired mood
- Test ORIENT with medium mood
- Test ORIENT with high mood
- Test fallback to old flow

### 5. Document Integration (30 min)
- Update README
- Add integration guide
- Document feature flag

**Total Time: ~4.5 hours**

---

## Decision Point

**Recommendation:** Proceed with Minimal Viable Integration (Option B)

**Rationale:**
1. Validates architecture early
2. Reduces integration risk
3. Enables user testing sooner
4. Provides feedback for remaining phases
5. Demonstrates progress to stakeholders

**Alternative:** Continue with all components first (Option A)
- Choose this if: Need all features before any release
- Risk: Higher integration complexity later

---

## Conclusion

We have a solid foundation (37.5% complete). Integrating now with fallbacks allows us to:
- ✅ Validate the architecture works
- ✅ Test with real users
- ✅ Reduce risk
- ✅ Demonstrate progress
- ✅ Get feedback for remaining work

**Recommended Next Step:** Proceed with Minimal Viable Integration (Phase 3.5)
