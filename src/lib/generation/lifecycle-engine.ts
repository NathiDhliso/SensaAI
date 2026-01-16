/**
 * Lifecycle Engine
 * 
 * Provides template-based generation for self-healing repair strategies.
 * This is used when a field is missing or invalid but doesn't require
 * expensive AI regeneration.
 */

import type { ParsedConcept } from '@/lib/content-adapter/types';

export class SelfHealingEngine {

  /**
   * Apply a self-healing template to a specific field
   * @param concept The concept object to repair (will be mutated or cloned)
   * @param field The dot-notation path to the field (e.g., 'phase3.tool')
   * @returns The repaired concept
   */
  public repairField(concept: ParsedConcept, field: string): ParsedConcept {
    const repaired = JSON.parse(JSON.stringify(concept)); // Deep clone
    const value = this.getTemplateValue(field, concept.name);

    this.setNestedValue(repaired, field, value);
    return repaired;
  }

  /**
   * Get the template value for a given field
   */
  private getTemplateValue(field: string, conceptName: string): string | string[] {
    switch (field) {
      case 'phase1.prerequisite':
        return 'None';

      case 'phase3.tool':
        return 'Check Official Documentation';

      case 'phase3.thresholds':
        return 'Verify in standard documentation';

      case 'technicalDetails':
        return `Specific technical implementation details for ${conceptName} should be verified in the official vendor documentation.`;

      case 'phase3.metrics':
        return ['Implementation Success', 'Operational Status'];

      // Grounding fields
      case 'blueprintMapping':
        return `Verify ${conceptName} mapping against official exam objectives`;

      case 'officialSource':
        // This should ideally be handled by SURGICAL_AI, but as a fallback:
        return ''; // Empty so validation continues to flag this for AI repair

      default:
        return 'Content to be verified';
    }
  }

  /**
   * Set value at nested object path
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }
}
