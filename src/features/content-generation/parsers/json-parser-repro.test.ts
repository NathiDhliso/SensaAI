
import { expect, test, describe } from 'vitest';
import { parseContent } from './json-parser';

describe('JSON Parser Tier Logic', () => {
    test('should handle "tier": "trunk" (lowercase)', () => {
        const json = JSON.stringify({
            fullDocument: JSON.stringify({
                concepts: [{ name: "Test1", tier: "trunk" }]
            })
        });
        const result = parseContent(json);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.concepts[0].tier).toBe('trunk');
        }
    });

    test('should handle "tier": "Trunk" (capitalized value)', () => {
        const json = JSON.stringify({
            fullDocument: JSON.stringify({
                concepts: [{ name: "Test2", tier: "Trunk" }]
            })
        });
        const result = parseContent(json);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.concepts[0].tier).toBe('trunk');
        }
    });

    test('should handle "Tier": "trunk" (capitalized key)', () => {
        const json = JSON.stringify({
            fullDocument: JSON.stringify({
                concepts: [{ name: "Test3", Tier: "trunk" }]
            })
        });
        const result = parseContent(json);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.concepts[0].tier).toBe('trunk');
        }
    });
});
