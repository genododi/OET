import { describe, expect, it } from 'vitest';
import { filterStudyResources, studyResources } from './studyResources';

describe('curated resource filtering', () => {
  it('returns only publication-eligible official speaking resources', () => {
    const results = filterStudyResources(studyResources, {
      subtest: 'speaking',
      source: 'official',
    });
    expect(results).toHaveLength(1);
    expect(results[0].sourceUrl).toContain('youtube.com');
  });

  it('searches metadata and keeps community collections link-only', () => {
    const results = filterStudyResources(studyResources, { query: 'letter type' });
    expect(results).toHaveLength(1);
    expect(results[0].redistributionStatus).toBe('link-only');
    expect(results[0]).not.toHaveProperty('localPath');
  });
});
