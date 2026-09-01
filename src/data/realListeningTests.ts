import audioManifest from './realListeningAudio.generated.json';

export type RealListeningPart = 'A' | 'B' | 'C';

export interface RealListeningAnswer {
  number: number;
  part: RealListeningPart;
  accepted: string[];
}

export interface RealListeningTest {
  id: string;
  mockId: string;
  title: string;
  questionPdf: string;
  audioPath: string;
  durationMinutes: number;
  sourceUrl: string;
  sourceLabel: string;
  sourceParts: Array<{ part: string; sha256: string; durationSeconds: number }>;
  answers: RealListeningAnswer[];
}

const partA = (values: string[][]): RealListeningAnswer[] =>
  values.map((accepted, index) => ({ number: index + 1, part: 'A', accepted }));
const partMcq = (start: number, values: string, part: 'B' | 'C'): RealListeningAnswer[] =>
  [...values].map((answer, index) => ({ number: start + index, part, accepted: [answer] }));

const sampleOneAnswers: RealListeningAnswer[] = [
  ...partA([
    ['heavy suitcase', 'suitcase', 'heavy case', 'case'],
    ['right leg', 'his right leg'],
    ['intense', 'really intense'],
    ['turn over in bed', 'get comfortable'],
    ['tingling'],
    ['events organiser', 'event organiser', 'events organizer', 'event organizer'],
    ['compression packs'],
    ['osteopath', 'an osteopath'],
    ['ultrasound'],
    ['acupuncture'],
    ['combination of treatments'],
    ['slipped disc', 'herniated disc'],
    ['palm'],
    ['itching', 'itchiness', 'pruritus'],
    ['little blisters', 'blisters'],
    ['chaotic'],
    ['chest'],
    ['frequent'],
    ['diet', 'anything in his daily life', 'anything in daily life'],
    ['removal of melanoma', 'malignant melanoma', 'melanoma removal', 'melanoma'],
    ['cold sores', 'herpes simplex', 'herpes labialis'],
    ['antiviral cream', 'anti-viral cream', 'an antiviral cream'],
    ['broken'],
    ['biopsy', 'a biopsy'],
  ]),
  ...partMcq(25, 'BAACAA', 'B'),
  ...partMcq(31, 'ABACAB', 'C'),
  ...partMcq(37, 'BCA CAB'.replaceAll(' ', ''), 'C'),
];

const sampleTwoAnswers: RealListeningAnswer[] = [
  ...partA([
    ['heartburn', 'heartburn after meals'],
    ['bloating'],
    ['constipation'],
    ['unpredictable', 'so unpredictable'],
    ['migraines', 'migraine'],
    ['accountant'],
    ['anxious'],
    ['energy'],
    ['fibre', 'fiber'],
    ['dairy', 'dairy products'],
    ['food allergy tests', 'extensive food allergy tests'],
    ['antidepressants', 'antidepressant', 'anti-depressants', 'anti-depressant'],
    ['stiff'],
    ['heat pad', 'heatpad', 'a heat pad'],
    ['physio', 'physiotherapy'],
    ['untreatable'],
    ['chiropractic treatment'],
    ['baclofen'],
    ['orthopaedic chair', 'orthopedic chair', 'chair'],
    ['botulinum toxin', 'botox', 'btx'],
    ['swallowing'],
    ['oral medications', 'oral medication', 'oral meds'],
    ['memory loss', 'loss of memory', 'amnesia'],
    ['pump', 'a pump'],
  ]),
  ...partMcq(25, 'ABCCBB', 'B'),
  ...partMcq(31, 'CBBACA', 'C'),
  ...partMcq(37, 'BBC CAC'.replaceAll(' ', ''), 'C'),
];

const manifestById = new Map(audioManifest.tests.map((test) => [test.id, test]));

function createTest(
  id: string,
  mockId: string,
  title: string,
  answers: RealListeningAnswer[],
): RealListeningTest {
  const media = manifestById.get(id);
  if (!media) throw new Error(`Missing imported real listening media: ${id}`);
  return {
    id,
    mockId,
    title,
    questionPdf: media.questionPdf,
    audioPath: media.audioPath,
    durationMinutes: 45,
    sourceUrl: media.sourceUrl,
    sourceLabel: 'Official OET sample test, imported from the GENODODI source folder',
    sourceParts: media.parts,
    answers,
  };
}

export const realListeningTests: RealListeningTest[] = [
  createTest('source-sample-test-1', 'mock-official-listening-1', 'Real Audio Listening Test 1', sampleOneAnswers),
  createTest('source-sample-test-2', 'mock-official-listening-2', 'Real Audio Listening Test 2', sampleTwoAnswers),
];

export function getRealListeningTestForMock(mockId: string): RealListeningTest | undefined {
  return realListeningTests.find((test) => test.mockId === mockId);
}

function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isRealListeningAnswerCorrect(question: RealListeningAnswer, value: string): boolean {
  const normalized = normalizeAnswer(value);
  return question.accepted.some((answer) => normalizeAnswer(answer) === normalized);
}
