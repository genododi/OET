const ignored = new Set(`about above after again against also among another any around because become before being below between both could did does doing down during each either enough even every few for from further get getting give given got had has have having here herself himself hers him however into itself just less like made make many may might more most much must need neither never often other our ours out over own same should since some such than that the their theirs them themselves then there these they this those through too under until upon very was were what when where which while who whom whose why will with would you your yours patient patients speaker listening recording transcript`.split(/\s+/));

const fillers = new Set(`actually basically clearly definitely probably really simply sort thing things`.split(/\s+/));

const clinicalTerms = new Set(`abdomen abdominal allergy allergic antibiotic antibiotics anxiety asthma assessment blood bowel cancer cardiac cardiology chest chronic clinical condition constipation cough diabetes diagnosis diabetic diet discharge dose dosage emergency examination fatigue fever fracture headache health hypertension infection injury medication medicine mental nausea pain patient pharmacy physical pregnancy pressure prescribe prescription symptom symptoms therapy treatment urine vaccination wound`.split(/\s+/));

const knownPhrases = [
  'blood pressure', 'blood test', 'blood tests', 'chest pain', 'side effect', 'side effects',
  'medical history', 'family history', 'heart rate', 'heart failure', 'shortness of breath',
  'follow up', 'follow-up', 'pain relief', 'weight loss', 'clinical trial', 'mental health',
  'physical activity', 'adverse reaction', 'long term', 'quality of life', 'risk factor',
  'risk factors', 'urine sample', 'bowel movement', 'health care', 'healthcare professional',
  'medical condition', 'past medical history', 'chronic pain', 'heart disease', 'blood sugar',
  'take medication', 'prescribed medication', 'treatment plan', 'care plan', 'medical records',
  'emergency department', 'general practitioner', 'primary care', 'clinical examination',
];

const phraseStopwords = new Set(`a an and as at by for from in of on or the to with`.split(/\s+/));

function cleanPhrase(phrase: string) {
  return phrase.trim().replace(/\s+/g, ' ').replace(/-/g, ' ');
}

/** Picks useful clinical vocabulary and recurring topic phrases from a listening transcript. */
export function extractListeningKeywords(text: string, limit = 8): string[] {
  const normalized = text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized || limit <= 0) return [];

  const words = normalized.match(/[a-z]+(?:-[a-z]+)*/g) ?? [];
  const counts = new Map<string, number>();
  const clinical = new Set<string>();

  const add = (term: string, amount: number) => {
    counts.set(term, (counts.get(term) ?? 0) + amount);
  };

  for (const phrase of knownPhrases) {
    const canonical = cleanPhrase(phrase);
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[-\\s]?');
    const matches = normalized.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    if (matches) {
      // Clinical phrases are useful even when mentioned only once.
      add(canonical, 4 + Math.min(matches.length - 1, 3));
      clinical.add(canonical);
    }
  }

  for (const word of words) {
    if (ignored.has(word) || fillers.has(word) || word.length < 4) continue;
    const stem = word.replace(/(ies|s|es)$/, ending => ending === 'ies' ? 'y' : '');
    const isClinical = clinicalTerms.has(word) || clinicalTerms.has(stem);
    if (isClinical) {
      clinical.add(word);
      add(word, 2.5);
    } else {
      add(word, 1);
    }
  }

  // Add transcript-specific bigrams. They reveal the topic more clearly than isolated words.
  for (let index = 0; index < words.length - 1; index += 1) {
    const first = words[index]!;
    const second = words[index + 1]!;
    if (phraseStopwords.has(first) || phraseStopwords.has(second) || first.length < 3 || second.length < 3) continue;
    if (ignored.has(first) || ignored.has(second) || fillers.has(first) || fillers.has(second)) continue;
    const phrase = `${first} ${second}`;
    const phraseIsClinical = clinical.has(first) || clinical.has(second);
    const phraseIsSpecific = first.length > 4 && second.length > 4;
    if (phraseIsClinical || phraseIsSpecific) add(phrase, phraseIsClinical ? 1.5 : 0.75);
  }

  const ranked = [...counts.entries()]
    .filter(([term, score]) => score >= 2 && (term.includes(' ') || clinical.has(term) || (words.filter(word => word === term).length > 1)))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const selected: string[] = [];
  const selectedTokens = new Set<string>();
  for (const [term] of ranked) {
    const tokens = term.split(' ');
    // Keep a useful phrase instead of also listing its component keywords.
    if (tokens.length === 1 && selectedTokens.has(term)) continue;
    if (tokens.length > 1 && selected.some(item => item.split(' ').every(token => tokens.includes(token)))) continue;
    selected.push(term);
    tokens.forEach(token => selectedTokens.add(token));
    if (selected.length >= limit) break;
  }

  return selected.map(term => term.replace(/\b[a-z]/g, letter => letter.toUpperCase()));
}

/** Finds spoken OET section announcements and returns the best seek point for each part. */
export function detectListeningPartStarts(segments: Array<{ start: number; text: string }>, trackName = ''): Partial<Record<'A' | 'B' | 'C', number>> {
  const starts: Partial<Record<'A' | 'B' | 'C', number>> = {};
  const standalone = /(?:^|[\s_-])part[\s_-]*([abc])(?:[\s_.-]|$)/i.exec(trackName)?.[1]?.toUpperCase() as 'A' | 'B' | 'C' | undefined;
  if (standalone) return { [standalone]: 0 };
  for (const part of ['A', 'B', 'C'] as const) {
    const letter = part.toLowerCase();
    if (starts[part] !== undefined) continue;
    for (let index = 0; index < segments.length; index += 1) {
      // Speech recognition often splits an announcement such as “Part C. In this
      // part of the test…” across multiple timestamped segments. Check nearby lines
      // together, but seek to the first line where the part is announced.
      const current = segments[index]!.text.toLowerCase().replace(/[’']/g, '');
      const next = segments[index + 1];
      const adjacent = next && next.start - segments[index]!.start <= 12 ? next.text.toLowerCase().replace(/[’']/g, '') : '';
      const announcement = `${current} ${adjacent}`;
      const context = announcement;
      const namedPart = new RegExp(`\\bpart\\s+${letter}\\b`).test(announcement);
      const sectionIntro = /\b(?:in this part|questions?\s+\d+\s*(?:to|[-–])\s*\d+|for questions?\s+\d+|now\s*,?\s*(?:look|turn|move)\s+(?:over and )?(?:at|to)\s+part)\b/.test(context);
      const numberedPart = part === 'B' ? /\bquestions?\s+25\s*(?:to|[-–])\s*30\b/.test(context)
        : part === 'C' ? /\bquestions?\s+31\s*(?:to|[-–])\s*42\b/.test(context) : /\bquestions?\s+1\s*(?:to|[-–])\s*24\b/.test(context);
      const transition = new RegExp(`\\b(?:now\\s*,?\\s*)?(?:look|turn|move)\\s+(?:over and )?(?:at|to)\\s+part\\s+${letter}\\b`).test(current);
      const isPartEnding = /\bend of (?:the )?part [abc]\b/.test(announcement);
      const directTitle = new RegExp(`\\b(?:listening\\s+)?part\\s+${letter}\\s*[.:,]`).test(announcement);
      const explicit = namedPart && !isPartEnding && (sectionIntro || numberedPart || directTitle);
      if (explicit || transition) {
        starts[part] = segments[index]!.start;
        break;
      }
    }
  }
  // A single-part recording starts at the beginning when the track itself names it.
  if (segments.length && starts.A === undefined && !standalone) starts.A = 0;
  return starts;
}
