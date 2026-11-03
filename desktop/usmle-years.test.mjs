import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceYear, mergeSourceYears } from './usmle-years.mjs';
test('keeps source-labelled editions and unknown dates separate from download years',()=>{
 assert.equal(sourceYear('My qbank 2026.apkg').productionYear,2026);
 assert.equal(sourceYear('Block 01.pdf').productionYear,null);
 assert.equal(sourceYear('20260103.pdf').productionYear,null);
 assert.equal(sourceYear('My qbank.apkg','production_year::2025').productionYear,2025);
 const result=mergeSourceYears(sourceYear('Older 2025.apkg'),sourceYear('Current 2026.apkg'));
 assert.deepEqual(result.productionYears,[2026,2025]);assert.equal(result.yearEvidence.length,2);
});
