import { afterEach, expect, it } from 'vitest';
import { buildHash, parseRoute } from './routing';
afterEach(() => window.history.replaceState(null, '', '/'));
it('preserves the recent-file return destination across reloads and history navigation', () => {
  const hash = buildHash('materials', 'offline-file', 'recent');
  expect(hash).toBe('#materials/offline-file?from=recent');
  window.history.replaceState(null, '', hash);
  expect(parseRoute()).toEqual({ section: 'materials', itemId: 'offline-file', returnTo: 'recent' });
  window.history.replaceState(null, '', buildHash('materials', 'offline-file'));
  expect(parseRoute()).toEqual({ section: 'materials', itemId: 'offline-file' });
  window.history.replaceState(null, '', '#benchmark/reading?from=recent');
  expect(parseRoute()).toEqual({ section: 'benchmark', itemId: 'reading' });
});
