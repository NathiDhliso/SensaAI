# Unified Progressive Flow - Quick Start Guide

**Status**: ORIENT Phase Integrated ✅  
**Ready for**: Testing & Phase 4 Development

---

## 🚀 Quick Start (2 minutes)

### 1. Enable Feature Flag

```bash
# Add to .env or .env.local
VITE_UNIFIED_FLOW_ENABLED=true
```

### 2. Restart Server

```bash
npm run dev
```

### 3. Test It

1. Start a learning session
2. Select any mood (tired/okay/pumped)
3. Complete PRIME phase
4. Watch ORIENT phase load with mood-appropriate variant
5. Complete ORIENT phase
6. See toast: "Schema Priming complete!"

**Done!** ✅

---

## 📁 Key Files

### Integration
- `src/pages/VelocityLearning.tsx` - Main integration point

### Components
- `src/features/unified-flow/components/orient/PriorKnowledgeActivation.tsx` (tired)
- `src/features/unified-flow/components/orient/PredictionSkeleton.tsx` (medium)
- `src/features/unified-flow/components/orient/GenerativeOrienting.tsx` (high)

### System
- `src/shared/hooks/useLearningFlow.ts` - Phase detection
- `src/shared/hooks/usePhaseAdapter.ts` - Adapter logic
- `src/features/unified-flow/utils/component-loader.ts` - Dynamic loading

---

## 🧪 Quick Test

```bash
# 1. Enable
echo "VITE_UNIFIED_FLOW_ENABLED=true" >> .env

# 2. Restart
npm run dev

# 3. Open browser
# 4. Start learning session
# 5. Select mood
# 6. Complete PRIME
# 7. See ORIENT phase!
```

---

## 🎯 What Works Now

- ✅ ORIENT phase with 3 mood variants
- ✅ Dynamic component loading
- ✅ Phase completion handling
- ✅ Store updates
- ✅ Toast notifications
- ✅ Smooth transitions
- ✅ Backward compatibility

---

## 🔧 What's Next

### Phase 4: STRUCTURE Components

Create 3 variants:
1. `AnnotatableMap.tsx` (tired)
2. `GuidedMapBuilder.tsx` (medium)
3. Verify `ConceptMapBuilder.tsx` (high)

Then integrate like ORIENT!

---

## 📚 Full Documentation

- **Integration Details**: `UNIFIED_FLOW_PHASE3_INTEGRATION_COMPLETE.md`
- **Testing Guide**: `UNIFIED_FLOW_TESTING_GUIDE.md`
- **Progress Tracking**: `UNIFIED_FLOW_PROGRESS.md`
- **Complete Summary**: `CONTEXT_TRANSFER_COMPLETE.md`

---

## 🐛 Troubleshooting

### Component Not Showing?

```bash
# 1. Check feature flag
echo $VITE_UNIFIED_FLOW_ENABLED

# 2. Restart server
npm run dev

# 3. Clear browser cache
# 4. Check console for errors
```

### Wrong Component?

Check mood selection in PRIME phase.

### Phase Not Completing?

Check completion requirements in component.

---

## 💡 Pro Tips

1. **Use React DevTools** to inspect `unifiedPhase` and `phaseAdapter`
2. **Check Network tab** to see lazy loading in action
3. **Test all 3 moods** to see different variants
4. **Disable flag** to verify fallback works

---

## ✅ Success Checklist

- [ ] Feature flag enabled
- [ ] Server restarted
- [ ] Can start learning session
- [ ] ORIENT phase shows correct variant
- [ ] Can complete ORIENT phase
- [ ] Toast notification appears
- [ ] Transitions to next phase
- [ ] No console errors

---

## 🎉 You're Ready!

The ORIENT phase is integrated and working. Test it, then proceed with Phase 4!

**Questions?** Check the full documentation files listed above.

**Issues?** Disable feature flag: `VITE_UNIFIED_FLOW_ENABLED=false`

**Ready for more?** Start Phase 4 (STRUCTURE Components)!
