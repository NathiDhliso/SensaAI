# SensaAI — Feature Success Criteria

**Last Updated:** February 20, 2026

> What does "it's working" look like for each feature, in plain English?

---

## 1. AI Content Generation

- The learner types in a subject (e.g. "AZ-104") and the app produces a complete, organised study pack — no copy-pasting from textbooks.
- The study pack is structured like a tree: big topics at the top (trunks), sub-topics in the middle (branches), and bite-sized facts at the bottom (leaves).
- Every concept comes with a metaphor, a hook sentence, worked examples, common mistakes, and a Creator's Blueprint showing how practitioners actually approach the concept.
- If the AI misses important topics from the learner's exam syllabus, the system automatically detects the gaps and generates extra content to fill them.
- Low-quality or generic filler content is rejected before the learner ever sees it.
- `phase2` content arrives as plain strings — never as `{title, content}` objects.
- `perspectives[]` is present on every leaf concept with 2-4 labelled approaches.

---

## 2. Content Audit & Syllabus Alignment

- The learner can paste their official exam syllabus or learning objectives, and the app checks whether the generated content actually covers everything.
- Each concept is tagged as "aligned to objective," "supplementary," or "not in objectives."
- The tier distribution (trunk/branch/leaf ratios) is validated so the study pack isn't lopsided.
- Bloom's taxonomy spread is checked — the pack must include higher-order thinking (apply, analyze, evaluate, create) and not just memorisation.

---

## 3. Content Launchpad (Library Dashboard)

- The learner sees all their saved study packs in one place.
- Each study pack shows a health score: tier balance, Bloom's distribution, and objective coverage at a glance.
- One click launches the learner straight into a study session for any pack.

---

## 4. Mood-Based Session Curation (PRIME Step)

- Before studying, the learner picks how they're feeling: Energised, Neutral, Tired, or Stressed.
- The app automatically adjusts session length and difficulty based on that mood.
- When energised: longer, harder session. When tired: short, gentle review.
- A "Guided Primer" step helps the learner set an intention before every session.

---

## 5. Nomenclature Sprint (SCOUT Step)

- A 60-second speed round where the learner matches subject terms to their plain-English metaphors.
- Acts as a vocabulary warm-up before the real study begins.
- A 90% accuracy gate ensures the learner knows the language before diving deeper.
- The learner previews the topic structure and makes predictions about which concepts are most important.

---

## 6. Concept Map Builder (BUILD Step)

- The learner drags and connects concepts visually — like drawing a mind map.
- Each connection has a labelled relationship type (requires, enables, is-part-of, is-type-of, causes, constrains).
- Graph rules prevent nonsensical connections.
- **Draft recovery:** If the learner refreshes mid-build, their in-progress concept map is restored from a locally saved draft.

---

## 7. Micro-Learning Loop (STUDY Step — The Core Engine)

For every single concept, the learner goes through three phases:
- **Test First** — Answer a question *before* being taught, to expose what you don't know.
- **Learn** — Read a structured breakdown: metaphor, architecture, execution, system physics, pitfalls, high-stakes scenario, and a "think deeper" prompt.
- **Verify** — Answer a pattern-recognition question to confirm the concept stuck.

No fake questions are generated. If the AI didn't produce a quality diagnostic question, the test phase is skipped rather than faking it.

---

## 8. Creator's Blueprint (DrillDownCard — Perspectives Switcher)

- Inside the cognitive matrix drill-down, the learner sees pill buttons to flick between practitioner approaches.
- For Azure: Portal / CLI / Terraform / ARM/Bicep. For law: Plaintiff / Defendant / Court. For biology: Mechanistic / Isotope Tracing / Inhibitor Analysis.
- Each perspective shows: the creator's approach sentence (italic, subdued) + the actual atomic steps for that approach.
- If the LLM didn't generate `perspectives`, the UI falls back to synthesising from `lifecycle.phase1/2/3.steps`.
- Prerequisites shown at the bottom of the block.

---

## 9. Concept Selection Algorithm

- The app picks the *next* concept to study intelligently — not randomly and not in a fixed order.
- Prerequisite concepts are taught first (you learn "VNets" before "NSGs").
- The algorithm interleaves different tiers and cognitive levels for variety.
- High-outdegree concepts (many others depend on them) are prioritised.

---

## 10. Peer Review Activity (Gym)

- A simulated "peer" makes a plausible misconception about the concept.
- The learner must correct it using their own words.
- The peer pushes back with a follow-up challenge drawn from `shape.highStakesExample` or `commonPitfalls`.
- Scoring is based on keyword coverage of the correction.

---

## 11. Pre-Mortem Activity (Gym)

- The learner is shown a failure scenario and must identify what went wrong.
- Steps are drawn from `lifecycle.phase3.steps` and `howToUse`.
- The learner explains which step was skipped or done incorrectly.

---

## 12. Concept Map Builder (Gym — Free Mode)

- The learner builds a concept map from scratch without guided prompts.
- Connections are validated against the known relationship types.
- Completed maps can be reviewed against the AI-generated dependency graph.

---

## 13. Mastery Dashboard

- After completing all concepts in a session, the learner sees a summary: concepts mastered, time spent, score breakdown.
- Options to return home or review weak concepts.

---

## 14. Cognitive Gauge

- A real-time indicator of cognitive load shown during study sessions.
- When load is too high, a Neural Reset banner suggests a break.

---

## 15. AI Content Generation — Exam Catalog Integration

- The learner can search 41 certification exams (AWS, Microsoft, CompTIA, Google Cloud, Cisco, PMI, ISC2) by name, code, or provider.
- Selecting a cert pre-fills the domain trunks and exam objectives as context.
- The generation pipeline uses the official exam objectives to ensure coverage.
- Gap-fill automatically adds missing concepts when objectives aren't covered.

---

## 16. Settings Panel

- Accessible from any page via a slide-out panel (no `/settings` route).
- Controls: visual theme (playful/scholarly), dark mode, coach persona, practice mode, stress-free mode.
- All settings persist via Zustand stores.

---

## Feature Dependency Map

```
AI Content Generation
  └─► Content Audit & Syllabus Alignment
  └─► Content Launchpad
        └─► Mood-Based Session Curation (PRIME)
              └─► Nomenclature Sprint (SCOUT)
                    └─► Concept Map Builder (BUILD)
                          └─► Micro-Learning Loop (STUDY)
                                └─► Creator's Blueprint (DrillDownCard)
                                └─► Concept Selection Algorithm
                                      └─► Mastery Dashboard
  └─► Gym Activities
        └─► Peer Review
        └─► Pre-Mortem
        └─► Concept Map (Free Mode)
```
