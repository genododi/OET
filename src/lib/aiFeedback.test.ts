import { describe, expect, it } from 'vitest';
import { parseAiFeedback } from './aiFeedback';

describe('AI feedback validation', () => {
  it('accepts the required structured response and trims unbounded fields', () => {
    const result = parseAiFeedback(JSON.stringify({
      estimatedGrade: 'A',
      summary: 'Purpose is immediately clear.',
      strengths: ['Clear purpose'],
      improvements: ['Tighten the final paragraph'],
    }));
    expect(result?.estimatedGrade).toBe('A');
    expect(result?.strengths).toEqual(['Clear purpose']);
  });

  it('rejects malformed provider output', () => {
    expect(parseAiFeedback('{"summary":"missing fields"}')).toBeNull();
    expect(parseAiFeedback('not json')).toBeNull();
  });
});
