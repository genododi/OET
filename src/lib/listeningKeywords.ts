const ignored = new Set(`about after again against also among another any around because before being between both could during each either enough even every from further have having here herself himself however into itself just like might more most much must neither never other our ours out over same should since some such than that the their theirs them themselves then there these they this those through under until upon very what when where which while whom whose will with would your yours patient patients speaker listening recording transcript`.split(/\s+/));

const usefulPhrases = [
  'blood pressure', 'blood test', 'blood tests', 'chest pain', 'side effect', 'side effects',
  'medical history', 'family history', 'heart rate', 'heart failure', 'shortness of breath',
  'follow up', 'follow-up', 'pain relief', 'weight loss', 'clinical trial', 'mental health',
  'physical activity', 'adverse reaction', 'long term', 'quality of life', 'risk factor',
  'risk factors', 'urine sample', 'bowel movement', 'health care', 'healthcare professional',
];

/** Picks transcript vocabulary for revision without rewriting or inventing speech content. */
export function extractListeningKeywords(text: string, limit = 8): string[] {
  const normalized = text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z\s-]/g, ' ');
  const counts = new Map<string, number>();
  for (const phrase of usefulPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = normalized.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    if (matches) counts.set(phrase, matches.length * 2);
  }
  for (const word of normalized.match(/[a-z]{4,}/g) ?? []) {
    if (ignored.has(word) || /^(very|really|quite|perhaps|probably|actually|basically|obviously)$/.test(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word.replace(/\b[a-z]/g, letter => letter.toUpperCase()));
}
