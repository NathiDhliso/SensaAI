/**
 * Unit Tests for Content Validators
 * 
 * Tests validation functions for:
 * - Circular definition detection
 * - Compound word detection
 * - Dependency cycle detection
 * - Dependency reference validation
 * - Tier hierarchy validation
 */

import { describe, it, expect } from 'vitest';
import {
  hasCircularDefinition,
  isCompoundWord,
  hasCycle,
  validateDependencies,
  validateTierHierarchy
} from '../content-validators.js';

describe('hasCircularDefinition', () => {
  it('detects concept name in definition', () => {
    expect(hasCircularDefinition('API Gateway', 'API Gateway is a gateway for APIs')).toBe(true);
    expect(hasCircularDefinition('Load Balancer', 'Load Balancer distributes traffic')).toBe(true);
  });

  it('detects "X is X" pattern', () => {
    expect(hasCircularDefinition('Load Balancer', 'Load Balancer is a load balancer')).toBe(true);
    expect(hasCircularDefinition('Row-Level Security', 'Row-Level Security is row-level security')).toBe(true);
  });

  it('detects "X provides X" pattern', () => {
    expect(hasCircularDefinition('API Gateway', 'API Gateway provides API Gateway functionality')).toBe(true);
  });

  it('allows valid definition without concept name', () => {
    expect(hasCircularDefinition('Load Balancer', 'Distributes traffic across multiple servers')).toBe(false);
    expect(hasCircularDefinition('API Gateway', 'Routes requests to backend services')).toBe(false);
  });

  it('handles empty inputs', () => {
    expect(hasCircularDefinition('', 'Some text')).toBe(false);
    expect(hasCircularDefinition('Concept', '')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(hasCircularDefinition('API Gateway', 'api gateway is a service')).toBe(true);
    expect(hasCircularDefinition('load balancer', 'LOAD BALANCER distributes')).toBe(true);
  });

  it('ignores punctuation and spaces', () => {
    expect(hasCircularDefinition('API-Gateway', 'APIGateway is a service')).toBe(true);
    expect(hasCircularDefinition('Load Balancer', 'loadbalancer distributes')).toBe(true);
  });
});

describe('isCompoundWord', () => {
  it('detects "X X+" pattern', () => {
    expect(isCompoundWord('House House+')).toBe(true);
    expect(isCompoundWord('Castle Castle+')).toBe(true);
  });

  it('detects "X (X + Y)" pattern', () => {
    expect(isCompoundWord('Castle (Castle + Scroll)')).toBe(true);
    expect(isCompoundWord('Crown (Crown + Key)')).toBe(true);
  });

  it('detects "X X " pattern', () => {
    expect(isCompoundWord('Network Network ')).toBe(true);
    expect(isCompoundWord('Gateway Gateway ')).toBe(true);
  });

  it('detects "X (X)" pattern', () => {
    expect(isCompoundWord('Word (Word)')).toBe(true);
  });

  it('detects anchors with "+" symbol', () => {
    expect(isCompoundWord('Key+Person')).toBe(true);
    expect(isCompoundWord('Cloud+Cake')).toBe(true);
  });

  it('detects anchors starting with concept name', () => {
    expect(isCompoundWord('CloudCake', 'Cloud')).toBe(true);
    expect(isCompoundWord('FairyGodmother', 'Fairy')).toBe(true);
    expect(isCompoundWord('KeyRing', 'Key')).toBe(true);
  });

  it('allows valid anchors', () => {
    expect(isCompoundWord('Volcano 🌋')).toBe(false);
    expect(isCompoundWord('Security Guard 👮')).toBe(false);
    expect(isCompoundWord('Key 🔑')).toBe(false);
    expect(isCompoundWord('Fortress 🏰')).toBe(false);
    expect(isCompoundWord('Warehouse 🏭')).toBe(false);
  });

  it('handles empty input', () => {
    expect(isCompoundWord('')).toBe(false);
  });

  it('allows different words together', () => {
    expect(isCompoundWord('Fire Truck')).toBe(false);
    expect(isCompoundWord('Police Officer')).toBe(false);
    expect(isCompoundWord('Traffic Light')).toBe(false);
  });

  it('allows anchors that do not start with concept name', () => {
    expect(isCompoundWord('Warehouse 🏭', 'Storage')).toBe(false);
    expect(isCompoundWord('Guard 👮', 'Security')).toBe(false);
  });
});

describe('hasCycle', () => {
  it('detects simple cycle (A→B→C→A)', () => {
    const concepts = [
      { name: 'A', dependsOn: ['B'] },
      { name: 'B', dependsOn: ['C'] },
      { name: 'C', dependsOn: ['A'] },
    ];
    expect(hasCycle(concepts)).toBe(true);
  });

  it('detects two-node cycle (A→B→A)', () => {
    const concepts = [
      { name: 'A', dependsOn: ['B'] },
      { name: 'B', dependsOn: ['A'] },
    ];
    expect(hasCycle(concepts)).toBe(true);
  });

  it('detects self-loop (A→A)', () => {
    const concepts = [
      { name: 'A', dependsOn: ['A'] },
    ];
    expect(hasCycle(concepts)).toBe(true);
  });

  it('allows acyclic graph', () => {
    const concepts = [
      { name: 'A', dependsOn: [] },
      { name: 'B', dependsOn: ['A'] },
      { name: 'C', dependsOn: ['A', 'B'] },
    ];
    expect(hasCycle(concepts)).toBe(false);
  });

  it('allows disconnected acyclic components', () => {
    const concepts = [
      { name: 'A', dependsOn: [] },
      { name: 'B', dependsOn: ['A'] },
      { name: 'X', dependsOn: [] },
      { name: 'Y', dependsOn: ['X'] },
    ];
    expect(hasCycle(concepts)).toBe(false);
  });

  it('handles empty array', () => {
    expect(hasCycle([])).toBe(false);
  });

  it('handles concepts without dependencies', () => {
    const concepts = [
      { name: 'A' },
      { name: 'B' },
    ];
    expect(hasCycle(concepts)).toBe(false);
  });

  it('detects cycle in complex graph', () => {
    const concepts = [
      { name: 'A', dependsOn: ['B'] },
      { name: 'B', dependsOn: ['C'] },
      { name: 'C', dependsOn: ['D'] },
      { name: 'D', dependsOn: ['E'] },
      { name: 'E', dependsOn: ['B'] }, // Cycle: B→C→D→E→B
    ];
    expect(hasCycle(concepts)).toBe(true);
  });
});

describe('validateDependencies', () => {
  it('detects invalid dependency reference', () => {
    const concepts = [
      { name: 'A', dependsOn: ['B'] },
      { name: 'C', dependsOn: ['D'] }, // D doesn't exist
    ];
    const result = validateDependencies(concepts);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ concept: 'A', invalidDep: 'B' });
    expect(result).toContainEqual({ concept: 'C', invalidDep: 'D' });
  });

  it('allows valid dependencies', () => {
    const concepts = [
      { name: 'A', dependsOn: [] },
      { name: 'B', dependsOn: ['A'] },
      { name: 'C', dependsOn: ['A', 'B'] },
    ];
    const result = validateDependencies(concepts);
    expect(result).toHaveLength(0);
  });

  it('handles concepts without dependencies', () => {
    const concepts = [
      { name: 'A' },
      { name: 'B' },
    ];
    const result = validateDependencies(concepts);
    expect(result).toHaveLength(0);
  });

  it('handles empty array', () => {
    const result = validateDependencies([]);
    expect(result).toHaveLength(0);
  });
});

describe('validateTierHierarchy', () => {
  it('detects foundation concept with too many dependencies', () => {
    const concepts = [
      { name: 'A', tier: 'foundation', dependsOn: ['B', 'C', 'D'] }, // 3 deps, max 2
    ];
    const result = validateTierHierarchy(concepts);
    expect(result).toHaveLength(1);
    expect(result[0].concept).toBe('A');
    expect(result[0].issue).toContain('3 dependencies');
  });

  it('allows foundation concept with 0-2 dependencies', () => {
    const concepts = [
      { name: 'A', tier: 'foundation', dependsOn: [] },
      { name: 'B', tier: 'foundation', dependsOn: ['A'] },
      { name: 'C', tier: 'foundation', dependsOn: ['A', 'B'] },
    ];
    const result = validateTierHierarchy(concepts);
    expect(result).toHaveLength(0);
  });

  it('detects keystone depending on non-foundation', () => {
    const concepts = [
      { name: 'A', tier: 'foundation', dependsOn: [] },
      { name: 'B', tier: 'keystone', dependsOn: [] },
      { name: 'C', tier: 'keystone', dependsOn: ['B'] }, // Keystone depending on keystone
    ];
    const result = validateTierHierarchy(concepts);
    expect(result).toHaveLength(1);
    expect(result[0].concept).toBe('C');
    expect(result[0].issue).toContain('keystone concept');
  });

  it('allows keystone depending on foundation', () => {
    const concepts = [
      { name: 'A', tier: 'foundation', dependsOn: [] },
      { name: 'B', tier: 'keystone', dependsOn: ['A'] },
    ];
    const result = validateTierHierarchy(concepts);
    expect(result).toHaveLength(0);
  });

  it('detects utility depending on utility', () => {
    const concepts = [
      { name: 'A', tier: 'utility', dependsOn: [] },
      { name: 'B', tier: 'utility', dependsOn: ['A'] }, // Utility depending on utility
    ];
    const result = validateTierHierarchy(concepts);
    expect(result).toHaveLength(1);
    expect(result[0].concept).toBe('B');
    expect(result[0].issue).toContain('utility concept');
  });

  it('allows utility depending on keystone or foundation', () => {
    const concepts = [
      { name: 'A', tier: 'foundation', dependsOn: [] },
      { name: 'B', tier: 'keystone', dependsOn: ['A'] },
      { name: 'C', tier: 'utility', dependsOn: ['A'] },
      { name: 'D', tier: 'utility', dependsOn: ['B'] },
    ];
    const result = validateTierHierarchy(concepts);
    expect(result).toHaveLength(0);
  });

  it('handles concepts without tier or dependencies', () => {
    const concepts = [
      { name: 'A' },
      { name: 'B', tier: 'foundation' },
    ];
    const result = validateTierHierarchy(concepts);
    expect(result).toHaveLength(0);
  });

  it('handles empty array', () => {
    const result = validateTierHierarchy([]);
    expect(result).toHaveLength(0);
  });
});
