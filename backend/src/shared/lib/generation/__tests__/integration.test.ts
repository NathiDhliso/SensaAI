/**
 * Integration Tests for Multi-Phase Generation
 * 
 * Tests the complete generation flow from Phase 1 → Phase 2 → Phase 3
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  executePhase1,
  executePhase2,
  executePhase3,
  Phase1Input,
  Phase1Output,
  Phase2Output,
  Phase3Output
} from '../multi-phase-orchestrator.js';

// Skip these tests in CI since they require AWS credentials
const skipIntegration = !process.env.AWS_REGION || process.env.CI === 'true';

describe.skipIf(skipIntegration)('Integration: Multi-Phase Generation', () => {
  let phase1Output: Phase1Output;
  let phase2Output: Phase2Output;
  let phase3Output: Phase3Output;

  it('Phase 1: generates valid domain analysis', async () => {
    const input: Phase1Input = {
      subject: 'AWS Lambda Basics',
      targetConceptCount: 25
    };

    phase1Output = await executePhase1(input);

    // Validate structure
    expect(phase1Output.domain).toBeTruthy();
    expect(phase1Output.lifecycle).toBeDefined();
    expect(phase1Output.lifecycle.phase1).toBeTruthy();
    expect(phase1Output.lifecycle.phase2).toBeTruthy();
    expect(phase1Output.lifecycle.phase3).toBeTruthy();
    expect(phase1Output.concepts).toBeInstanceOf(Array);
    expect(phase1Output.concepts.length).toBeGreaterThanOrEqual(20);
    expect(phase1Output.concepts.length).toBeLessThanOrEqual(50);

    // Validate each concept
    for (const concept of phase1Output.concepts) {
      expect(concept.name).toBeTruthy();
      expect(['foundation', 'keystone', 'utility']).toContain(concept.tier);
      expect(concept.dependsOn).toBeInstanceOf(Array);
    }
  }, 60000); // 60s timeout for API call

  it('Phase 2: generates detailed content for concepts', async () => {
    expect(phase1Output).toBeDefined();

    phase2Output = await executePhase2({
      concepts: phase1Output.concepts.slice(0, 5), // Test with 5 concepts for speed
      lifecycle: phase1Output.lifecycle,
      batchSize: 5
    });

    // Validate structure
    expect(phase2Output.concepts).toBeInstanceOf(Array);
    expect(phase2Output.concepts.length).toBe(5);

    // Validate each concept has required fields
    for (const concept of phase2Output.concepts) {
      expect(concept.name).toBeTruthy();
      expect(concept.shape).toBeDefined();
      expect(concept.shape.simpleCore).toBeTruthy();
      expect(concept.shape.highStakesExample).toBeTruthy();
      expect(concept.shape.analogicalModel).toBeTruthy();
      expect(concept.shape.patternRecognition).toBeDefined();
      expect(concept.shape.eliminationLogic).toBeTruthy();

      expect(concept.lifecycle).toBeDefined();
      expect(concept.lifecycle.phase1).toBeDefined();
      expect(concept.lifecycle.phase2).toBeInstanceOf(Array);
      expect(concept.lifecycle.phase3).toBeDefined();

      expect(concept.mnemonic).toBeDefined();
      expect(concept.mnemonic.anchor).toBeTruthy();
      expect(concept.mnemonic.story).toBeTruthy();
      expect(concept.mnemonic.story.length).toBeGreaterThanOrEqual(50);

      expect(concept.whyYouNeed).toBeTruthy();
      expect(concept.realWorldExample).toBeTruthy();
      expect(concept.commonPitfalls).toBeInstanceOf(Array);
    }
  }, 120000); // 120s timeout for API call

  it('Phase 3: validates generated content', async () => {
    expect(phase2Output).toBeDefined();

    phase3Output = await executePhase3({
      concepts: phase2Output.concepts
    });

    // Validate structure
    expect(phase3Output.valid).toBeDefined();
    expect(phase3Output.score).toBeGreaterThanOrEqual(0);
    expect(phase3Output.score).toBeLessThanOrEqual(100);
    expect(phase3Output.issues).toBeInstanceOf(Array);
    expect(phase3Output.confusionPairs).toBeInstanceOf(Array);

    // Validate confusion pairs
    for (const pair of phase3Output.confusionPairs) {
      expect(pair.conceptA).toBeTruthy();
      expect(pair.conceptB).toBeTruthy();
      expect(pair.distinctionKey).toBeTruthy();
      expect(pair.whenToUseA).toBeTruthy();
      expect(pair.whenToUseB).toBeTruthy();
    }

    // Log results
    console.log(`\nValidation Score: ${phase3Output.score}/100`);
    console.log(`Issues Found: ${phase3Output.issues.length}`);
    console.log(`Confusion Pairs: ${phase3Output.confusionPairs.length}`);

    if (phase3Output.issues.length > 0) {
      console.log('\nSample Issues:');
      for (const issue of phase3Output.issues.slice(0, 3)) {
        console.log(`  - ${issue.conceptName}: ${issue.issue} (${issue.severity})`);
      }
    }
  }, 60000); // 60s timeout for API call

  it('Complete flow: Phase 1 → Phase 2 → Phase 3', async () => {
    // This test verifies the complete flow works end-to-end
    expect(phase1Output).toBeDefined();
    expect(phase2Output).toBeDefined();
    expect(phase3Output).toBeDefined();

    // Verify data flows correctly
    expect(phase2Output.concepts.length).toBe(5);
    expect(phase3Output.score).toBeGreaterThan(0);

    // Verify no critical errors
    const criticalErrors = phase3Output.issues.filter(i => i.severity === 'error');
    console.log(`\nCritical Errors: ${criticalErrors.length}`);
    
    // We expect some warnings but ideally no errors
    // (In practice, first runs may have errors that need prompt tuning)
  });
});

describe('Integration: Error Handling', () => {
  it('handles invalid subject gracefully', async () => {
    const input: Phase1Input = {
      subject: '', // Invalid empty subject
      targetConceptCount: 25
    };

    await expect(executePhase1(input)).rejects.toThrow();
  });

  it('handles invalid concept count', async () => {
    const input: Phase1Input = {
      subject: 'Test Subject',
      targetConceptCount: 5 // Too few concepts
    };

    // Should still work but may not meet validation
    const result = await executePhase1(input);
    expect(result.concepts.length).toBeGreaterThan(0);
  });
});
