# Domain-Agnostic Prompt Update

## Problem
The prompts were heavily biased toward tech examples (AWS, Azure, Lambda, etc.), which could confuse learners in other domains like:
- Biology/Medicine
- Accounting/Finance
- Welding/Trades
- Science/Research

## Solution
Updated all prompts to include diverse, domain-agnostic examples that work across all fields.

## Changes Made

### 1. Phase 1: Domain Analysis Prompt
**File:** `backend/src/shared/lib/prompts/phase1-domain-analysis.ts`

**Updated tier classification with multi-domain examples:**

| Tier | Tech | Biology | Accounting | Welding | Medicine |
|------|------|---------|------------|---------|----------|
| Foundation | VNet, IAM | Cell, DNA | Double-Entry | Base Metal | Anatomy |
| Keystone | VM, Lambda | Mitosis | Journal Entry | MIG Welding | Diagnosis |
| Utility | Tags, Tokens | Enzyme | Receipt | Helmet | Stethoscope |

### 2. Phase 2: Content Generation Prompt
**File:** `backend/src/shared/lib/prompts/phase2-content-generation.ts`

**Updated SHAPE examples:**

**Simple Core:**
- Tech: "A filter that automatically hides rows based on who's logged in"
- Biology: "The cell's outer layer that decides what gets in and out"
- Accounting: "Every transaction gets written twice to keep the books balanced"

**High-Stakes Examples:**
- Tech: "Capital One's 2019 breach exposed 100M records"
- Medical: "2020 hospital medication error killed 3 patients"
- Accounting: "Enron's 2001 collapse cost investors $74B"

**Analogical Models:**
- Tech: "Lambda like a restaurant kitchen"
- Biology: "Cell membrane like a nightclub bouncer"
- Welding: "MIG welding like a hot glue gun"

**Updated anchor examples:**

| Tier | Concept | Domain | Anchor | Why It Works |
|------|---------|--------|--------|--------------|
| foundation | Virtual Network | Tech | Volcano 🌋 | Massive with isolated chambers |
| foundation | Cell Membrane | Biology | Castle Wall 🏰 | Barrier with selective gates |
| foundation | Double-Entry | Accounting | Seesaw ⚖️ | Must stay balanced |
| keystone | Load Balancer | Tech | Traffic Cop 🚦 | Directs flow |
| keystone | Mitosis | Biology | Zipper 🤐 | Splits and duplicates |
| keystone | Journal Entry | Accounting | Diary 📔 | Records events |
| utility | Access Token | Tech | Key 🔑 | Unlocks access |
| utility | Enzyme | Biology | Catalyst 💊 | Speeds reactions |
| utility | Welding Helmet | Welding | Sunglasses 🕶️ | Protects eyes |

### 3. System Prompt
**File:** `backend/src/shared/lib/system-prompt.ts`

**Updated tier assignment with multi-domain examples:**

```
Foundation (Universal constants):
- Tech: VNet, Storage Account, IAM, DNS
- Biology: Cell, DNA, Protein, Membrane
- Accounting: Double-Entry, Chart of Accounts
- Welding: Base Metal, Heat, Filler Material
- Scale: MASSIVE/LANDSCAPE

Keystone (Major workers):
- Tech: VM, Load Balancer, API Gateway
- Biology: Mitosis, Photosynthesis, Respiration
- Accounting: Journal Entry, Trial Balance
- Welding: MIG Welding, TIG Welding, Arc Welding
- Scale: HUMAN/ROOM SIZE

Utility (Tools and accessories):
- Tech: Access Token, Tag, Lock, Metric
- Biology: Enzyme, Hormone, Vitamin, Antibody
- Accounting: Receipt, Invoice, Voucher
- Welding: Helmet, Wire Brush, Clamp
- Scale: HANDHELD/SMALL
```

**Updated story examples:**
- Biology: "A massive Castle Wall made of living bricks surrounds the kingdom..."
- Accounting: "A leather-bound Diary sits on a desk, its pages divided into two columns..."
- Welding: "Magical Sunglasses darken instantly when the blinding arc ignites..."

## Benefits

### 1. Universal Applicability
The AI now understands how to generate analogies for ANY domain, not just tech.

### 2. Better Learning Outcomes
Students see examples relevant to their field, making concepts more relatable and memorable.

### 3. Consistent Quality
The same high-quality analogy generation works whether you're learning:
- AWS Cloud Architecture
- Human Cell Biology
- Financial Accounting
- Metal Welding Techniques
- Medical Diagnosis

### 4. No Domain Confusion
The AI won't try to force tech metaphors onto non-tech concepts.

## Example Outputs

### Biology Student Learning "Cell Membrane"
- **Anchor:** Castle Wall 🏰
- **Simple Core:** "The cell's outer layer that decides what gets in and out"
- **Analogy:** "Like a nightclub bouncer: checks IDs (receptors), lets VIPs in (nutrients), kicks troublemakers out (toxins)"
- **High-Stakes:** "In 2020, a hospital's medication error killed 3 patients due to misread dosage units"

### Accounting Student Learning "Double-Entry"
- **Anchor:** Seesaw ⚖️
- **Simple Core:** "Every transaction gets written twice to keep the books balanced"
- **Analogy:** "Like a seesaw: when one side goes up (debit), the other must go down (credit) to stay balanced"
- **High-Stakes:** "In 2001, Enron's collapse cost investors $74B due to hidden off-balance-sheet debts"

### Welding Student Learning "MIG Welding"
- **Anchor:** Glue Gun 🔫
- **Simple Core:** "A welding process that continuously feeds wire while you pull the trigger"
- **Analogy:** "Like a hot glue gun: trigger feeds wire (filler), heat melts it (arc), gas protects the joint (shielding)"
- **High-Stakes:** "In 2018, a bridge collapse killed 43 people due to improper weld inspection"

## Testing

To verify the domain-agnostic improvements:

1. **Generate content for different domains:**
   - Try "Cell Biology"
   - Try "Financial Accounting"
   - Try "Welding Fundamentals"
   - Try "AWS Cloud Architecture"

2. **Check the analogies:**
   - Should be relevant to the domain
   - Should use appropriate metaphors
   - Should NOT force tech examples onto non-tech concepts

3. **Verify tier classification:**
   - Foundation concepts should be domain-appropriate
   - Keystone concepts should be major operations
   - Utility concepts should be tools/accessories

## Files Modified

1. `backend/src/shared/lib/prompts/phase1-domain-analysis.ts` - Multi-domain tier examples
2. `backend/src/shared/lib/prompts/phase2-content-generation.ts` - Multi-domain SHAPE examples
3. `backend/src/shared/lib/system-prompt.ts` - Multi-domain anchor examples
4. `ANALOGY_SYSTEM_FIX.md` - Updated with domain examples
5. `ANALOGY_FIX_SUMMARY.md` - Updated with domain examples

## Impact

**High** - Makes the platform truly universal for all learners, not just tech students.

---

**Status:** ✅ Complete
**Date:** January 30, 2026
**Benefit:** Universal learning platform for all domains
