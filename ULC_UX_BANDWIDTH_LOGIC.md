# ULC Pattern - Cognitive Bandwidth Logic

## Decision: Hide ULC for Low Energy Users

### Rationale

The ULC (Universal Life Cycle) pattern visualization is **procedural, interactive, and systematic** content that requires:
- Active engagement (clicking cells)
- Procedural thinking (understanding "how" steps)
- Systematic progression (working through verb × object combinations)

This type of content is **NOT appropriate for low energy users** who need:
- Read-only overview maps
- Passive consumption
- Light review only

### Implementation

**Condition:** `bandwidth !== 'low'`

```typescript
{ulcPattern && ulcPattern.detected && bandwidth !== 'low' && (
  <section className={styles.ulcPattern}>
    {/* ULC Matrix */}
  </section>
)}
```

### Bandwidth Mapping

| Mood | Bandwidth | ULC Shown? | Reasoning |
|------|-----------|------------|-----------|
| **Energized** | High | ✅ YES | Full toolkit, complex challenges - perfect for systematic ULC practice |
| **Neutral** | Medium | ✅ YES | Balanced learning - ULC provides structure without overwhelming |
| **Tired** | Low | ❌ NO | Light review only - ULC requires active procedural thinking |
| **Stressed** | Low | ❌ NO | Fluency drills, familiar concepts - ULC is too demanding |

### What Low Energy Users See Instead

When `bandwidth === 'low'`, users skip the ULC section and go directly to:

1. **Subject Context Stats** (passive, read-only)
   - Concept counts (trunk/branch/leaf)
   - Due reviews count
   - Knowledge health percentage

2. **The Daily Stack** (familiar, low-friction)
   - Due reviews (already learned concepts)
   - Fluency drills on familiar material
   - No new procedural learning

3. **Build Lab & Proving Grounds** (optional, user-initiated)
   - Available but not pushed
   - User can choose if they have energy

### UX Philosophy Alignment

From `docs/GYM_UX_PHILOSOPHY.md`:

> **Low Energy (Tired/Stressed):**
> - Light review only
> - Fluency drills, familiar concepts
> - Read-only overview maps
> - No new procedural learning

The ULC matrix is:
- ❌ NOT light review (requires active engagement)
- ❌ NOT fluency drills (introduces systematic structure)
- ❌ NOT read-only (interactive clickable cells)
- ❌ NOT familiar (shows new procedural patterns)

Therefore, hiding ULC for low energy users is **correct and intentional**.

### User Flow Examples

#### High Energy User (Energized)
1. Opens Content Launchpad
2. Sees battery indicator: "High Focus" 🔋
3. Sees subject stats
4. **Sees ULC Pattern Matrix** ← Shown
5. Can click cells to practice specific verb-object combinations
6. Sees Daily Stack
7. Sees Build Lab & Proving Grounds

#### Low Energy User (Tired)
1. Opens Content Launchpad
2. Sees battery indicator: "Low Energy" 🪫
3. Sees subject stats
4. **ULC Pattern Matrix hidden** ← Hidden
5. Sees Daily Stack (familiar reviews)
6. Sees Build Lab & Proving Grounds (optional)
7. Can still access concepts, but no systematic ULC push

### Testing Checklist

- [ ] High energy (energized) → ULC visible
- [ ] Medium energy (neutral) → ULC visible
- [ ] Low energy (tired) → ULC hidden
- [ ] Low energy (stressed) → ULC hidden
- [ ] Battery indicator shows correct energy level
- [ ] ULC section smoothly appears/disappears based on mood
- [ ] No layout shift when ULC is hidden

### Future Enhancements

**Potential:** Show a simplified, read-only ULC overview for low energy users?

```typescript
{ulcPattern && ulcPattern.detected && bandwidth === 'low' && (
  <div className={styles.ulcOverview}>
    <p>This subject follows a {ulcPattern.verbs.length}-verb pattern. 
    Come back when you have more energy to explore it systematically.</p>
  </div>
)}
```

**Decision:** Not implemented yet. Current approach is cleaner - hide entirely for low energy.

---

## Code Location

**File:** `src/components/learning/launchpad/ContentLaunchpad.tsx`  
**Line:** ~553  
**Condition:** `{ulcPattern && ulcPattern.detected && bandwidth !== 'low' && (`

---

## Related Documentation

- `docs/GYM_UX_PHILOSOPHY.md` - Mood-based session adjustments
- `src/features/ai-coach/index.ts` - Mood to bandwidth mapping
- `.kiro/specs/ulc-pattern-detection/requirements.md` - ULC feature requirements
