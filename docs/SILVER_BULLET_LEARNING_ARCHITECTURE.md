# Sensa (Silver Bullet) Learning Architecture

## Overview
The Sensa Learning Flow is designed to mirror natural cognitive processes, using a "baking" analogy to make the stages intuitive. Instead of abstract "Phases", we use concrete **Steps** that guide the learner from intent to fluency.

## The Sensa Flow

### Step 1: The "Why" (Establish Intent)
**The Baking Analogy:**
Your Action: You ask yourself, "Is learning to bake this specific cake worth my time? Will it make me a better cook or bring joy to my family?"

**Technical Implementation:**
- **Match:** `SessionStartModal.tsx`
- **Purpose:** Guided Primer. You are setting your "cognitive intent." Without this, your brain doesn't know where to "file" the new information, making it harder to remember later.

### Step 2: The "What" (Surveying)
**The Baking Analogy:**
Your Action: You look at the recipe's title and the list of main ingredients (flour, eggs, sugar, cocoa). You aren't cooking yet; you’re just getting the lay of the land.

**Technical Implementation:**
- **Match:** `SessionScoutPreview.tsx` (Initial Scan)
- **Purpose:** Scout. You are identifying the "landmarks" so your brain isn't surprised by new terms or concepts halfway through the process.

### Step 3: The "Guess" (Priming)
**The Baking Analogy:**
Your Action: You look at the "baking powder" and guess, "I bet this is what makes the cake fluffy." You check your mental pantry to see what you already know about these ingredients.

**Technical Implementation:**
- **Match:** `SessionScoutPreview.tsx` (Prediction & Gaps)
- **Purpose:** Explore+. By making an educated guess, you create "mental hooks." Even if you guess wrong, the act of predicting makes the correct answer "stick" much more effectively when you finally learn it.

### Step 4: The "Map" (Connecting)
**The Baking Analogy:**
Your Action: Instead of just reading the steps, you draw a small diagram showing how they relate: Dry Ingredients + Wet Ingredients → Fold Together → Add Heat = Structure.

**Technical Implementation:**
- **Match:** `ConceptMapBuilder.tsx`
- **Purpose:** Note-taking. You aren't just transcribing; you are building a "mental map" of how one concept (an ingredient) affects another (the outcome).

### Step 5: The "Recall" (The Workout)
**The Baking Analogy:**
Your Action: You hide the recipe card and try to write down the steps and ingredients from memory to see what you actually retained.

**Technical Implementation:**
- **Match:** `MapReconstructionTest.tsx`
- **Purpose:** Active Recall. This is the hardest part because it forces your brain to "retrieve" data rather than just "recognizing" it. This is where the real learning happens.

### Step 6: The "Showdown" (Synthesis)
**The Baking Analogy:**
Your Action: You bake the entire cake from start to finish without looking at the instructions once. You are proving you can handle the "whole" rather than just the parts.

**Technical Implementation:**
- **Match:** `MasteryChallenge.tsx`
- **Purpose:** The Boss Battle. It’s a high-stakes test that requires you to synthesize everything you’ve learned into a single, successful output.

### Step 7: The "Flow" (Fluency)
**The Baking Analogy:**
Your Action: You can now bake this cake while talking on the phone, or even swap ingredients (like using oil instead of butter) because you fundamentally understand the science behind it.

**Technical Implementation:**
- **Match:** `VelocityLearning.tsx`
- **Purpose:** Apply. You have reached total fluency. The knowledge is no longer a "task" to remember; it is a skill you simply possess.

## Summary Table

| Step | Baking Equivalent | SENSA Phase | Technical Goal |
| :--- | :--- | :--- | :--- |
| **1** | Determining the value | **See** | Establish Intent |
| **2** | Skimming ingredients | **Explore** | Survey Landscape |
| **3** | Guessing the chemistry | **Explore+** | Prime the Brain |
| **4** | Mapping the process | **Note** | Connect Concepts |
| **5** | Recalling from memory | **Study** | Strengthen Memory |
| **6** | Baking without help | **Prove** | Demonstrate Mastery |
| **7** | Improvising/Expertise | **Apply** | Reach Fluency |
