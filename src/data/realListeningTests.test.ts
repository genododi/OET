import { describe, expect, it } from 'vitest';
import { isRealListeningAnswerCorrect, realListeningTests } from './realListeningTests';

describe('real source listening tests', () => {
  it('provides a complete, unique 42-question blueprint for every imported recording', () => {
    expect(realListeningTests).toHaveLength(2);
    for (const test of realListeningTests) {
      expect(test.answers).toHaveLength(42);
      expect(new Set(test.answers.map((answer) => answer.number)).size).toBe(42);
      expect(test.answers.filter((answer) => answer.part === 'A')).toHaveLength(24);
      expect(test.answers.filter((answer) => answer.part === 'B')).toHaveLength(6);
      expect(test.answers.filter((answer) => answer.part === 'C')).toHaveLength(12);
      expect(test.sourceParts.map((part) => part.part)).toEqual(['A', 'B', 'C']);
    }
  });

  it('accepts documented Part A alternatives without weakening MCQ scoring', () => {
    const first = realListeningTests[0]!;
    expect(isRealListeningAnswerCorrect(first.answers[0]!, 'Heavy suitcase')).toBe(true);
    expect(isRealListeningAnswerCorrect(first.answers[0]!, 'case')).toBe(true);
    expect(isRealListeningAnswerCorrect(first.answers[0]!, 'backpack')).toBe(false);
    expect(isRealListeningAnswerCorrect(first.answers[24]!, 'B')).toBe(true);
    expect(isRealListeningAnswerCorrect(first.answers[24]!, 'A')).toBe(false);
  });
});
