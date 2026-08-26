/**
 * Session task bank. The timing and task structures follow the published OET
 * blueprint; all learner-facing scenarios are original practice material.
 * They are unofficial and are designed to train transferable criteria, not to
 * predict live test content.
 */

import type { Difficulty, OetSubtest } from '../types';
import type {
  SessionTask,
  SpeakingCriteria,
  WritingCriteria,
  WritingRubricItem,
} from '../types/session';
import { hashString } from './generators/uniqueness';
import listeningTaskAudioDefinitions from './listeningTaskAudio.json';
import { getReadingPassage } from './readingPassages';
import { baseUrl } from '../lib/baseUrl';
import type { OetPart } from '../lib/oetExamTiming';

const subtestInstructions: Record<OetSubtest, string> = {
  listening:
    'Listen carefully (simulate with the prompt below). Spelling and grammar count in Part A — use correct drug names and verb forms.',
  reading:
    'Scan for keywords — do not read every word in Part A. Eliminate distractors that are only partially supported by the text.',
  writing:
    'Transform case notes into a formal letter (180–200 words). Identify letter type: referral, discharge, transfer, or advice.',
  speaking:
    'Use 3 minutes prep. Maintain your professional role, use lay language, and interact — do not monologue.',
};

type McqOptionInput = { label: string; correct: boolean; explanation?: string };

interface ListeningTaskAudioDefinition {
  question: string;
  correctAnswer: string;
  script: string;
  speechScript?: string;
  evidenceTerms: string[];
  voice: string;
}

const listeningTaskAudio = listeningTaskAudioDefinitions as Record<
  string,
  ListeningTaskAudioDefinition
>;

function resolveQuestionMatchedAudio(
  id: string,
  prompt: string,
  correctAnswer: string,
): Pick<
  SessionTask,
  'audioSrc' | 'audioLabel' | 'audioNote' | 'audioTranscript' | 'audioEvidenceTerms' | 'audioRevision'
> {
  const definition = listeningTaskAudio[id];
  if (!definition) throw new Error(`Missing question-matched audio definition for ${id}`);
  if (definition.question !== prompt || definition.correctAnswer !== correctAnswer) {
    throw new Error(`Listening audio definition no longer matches question ${id}`);
  }

  const audioRevision = hashString(JSON.stringify(definition)).toString(36);
  return {
    audioSrc: `${baseUrl}audio/question-matched/${id}.mp3?v=${audioRevision}`,
    audioLabel: 'Question-matched listening clip',
    audioNote: 'Original OET-style practice audio generated from this exact question scenario.',
    audioTranscript: definition.script,
    audioEvidenceTerms: definition.evidenceTerms,
    audioRevision,
  };
}

function buildMcqOptions(
  id: string,
  subtest: OetSubtest,
  prompt: string,
  options: McqOptionInput[],
) {
  const correctOpt = options.find((o) => o.correct);
  const correctLabel = correctOpt?.label ?? '';

  return options.map((o, i) => ({
    id: `${id}-opt-${i}`,
    label: o.label,
    correct: o.correct,
    explanation:
      o.explanation ??
      (o.correct
        ? subtest === 'listening'
          ? `"${o.label}" matches the recording — note exact spelling, tense, and wording for Part A.`
          : `"${o.label}" is fully supported by the passage for: ${prompt}`
        : `"${o.label}" is a distractor — not stated or only partially supported. Correct: "${correctLabel}".`),
  }));
}

function mcq(
  id: string,
  subtest: OetSubtest,
  title: string,
  prompt: string,
  options: McqOptionInput[],
): SessionTask {
  const builtOptions = buildMcqOptions(id, subtest, prompt, options);
  const correctOpt = builtOptions.find((o) => o.correct);
  const questionMatchedAudio =
    subtest === 'listening' && correctOpt
      ? resolveQuestionMatchedAudio(id, prompt, correctOpt.label)
      : {};

  return {
    id,
    subtest,
    title,
    instructions: subtestInstructions[subtest],
    prompt,
    options: builtOptions,
    explanation: correctOpt
      ? `Answer: "${correctOpt.label}". ${correctOpt.explanation ?? ''}`
      : undefined,
    perfectAnswerTips:
      subtest === 'listening'
        ? [
            'Part A: write exactly what you hear — spelling and grammar count.',
            'Part B: focus on gist and speaker attitude, not every word.',
            'Part C: distinguish opinion from fact and note hedging language.',
          ]
        : [
            'Eliminate options that are true in general but not in this text.',
            'Watch for synonyms — question wording rarely repeats the passage.',
            'Part A: match paragraph gist to headings, not isolated keywords.',
          ],
    ...questionMatchedAudio,
  };
}

const defaultWritingRubric = (letterType: string): WritingRubricItem[] => [
  {
    dimension: 'Purpose',
    criterion: 'State referral/discharge/transfer purpose in opening',
    modelPoint: `Open with "I am writing to ${letterType.toLowerCase().includes('refer') ? 'refer' : 'inform'}…" in the first sentence.`,
  },
  {
    dimension: 'Content',
    criterion: 'Include relevant case notes only; omit irrelevant data',
    modelPoint: 'Transform abbreviations; include diagnosis, key findings, and requested action.',
  },
  {
    dimension: 'Conciseness & Clarity',
    criterion: '180–200 words; one idea per sentence',
    modelPoint: 'Avoid copying notes verbatim — summarise clinically relevant details.',
  },
  {
    dimension: 'Genre',
    criterion: 'Formal letter: Dear [Title Name], … Yours sincerely/faithfully',
    modelPoint: 'Match letter type to recipient (consultant, community nurse, GP).',
  },
  {
    dimension: 'Organisation',
    criterion: 'Logical paragraphs: purpose → details → request/close',
    modelPoint: 'Group related clinical information; end with offer of further contact.',
  },
  {
    dimension: 'Language',
    criterion: 'Formal register; accurate medical terms; no contractions',
    modelPoint: 'Use past tense for admission events; present for ongoing care needs.',
  },
];

const writingCriteriaByTaskId: Record<string, WritingCriteria> = {
  'write-33': {
    requiredConceptGroups: [
      ['endocarditis'],
      ['culture-negative', 'no growth'],
      ['vegetation'],
      ['aortic regurgitation', 'valve dysfunction'],
      ['vancomycin', 'ceftriaxone'],
      ['transoesophageal', 'TOE', 'surgical opinion'],
    ],
    irrelevantTerms: ['tennis elbow', 'chess'],
  },
  'write-34': {
    requiredConceptGroups: [
      ['thrombotic thrombocytopenic purpura', 'TTP'],
      ['confusion', 'neurological'],
      ['platelets', 'thrombocytopenia'],
      ['schistocytes', 'haemolysis', 'hemolysis'],
      ['ADAMTS13'],
      ['plasma exchange'],
    ],
    irrelevantTerms: ['eczema', 'ankle sprain', 'hiking'],
  },
  'write-35': {
    requiredConceptGroups: [
      ['euglycaemic diabetic ketoacidosis', 'euglycemic diabetic ketoacidosis', 'DKA'],
      ['ketones', 'acidosis'],
      ['empagliflozin', 'SGLT2'],
      ['metformin'],
      ['sick-day', 'sick day'],
      ['48–72 hours', '48-72 hours', 'diabetes clinic'],
    ],
    irrelevantTerms: ['seasonal rhinitis', 'dental check'],
  },
  'write-36': {
    requiredConceptGroups: [
      ['lithium toxicity'],
      ['confusion', 'tremor', 'gait instability'],
      ['acute kidney injury', 'creatinine'],
      ['dehydration', 'volume depletion'],
      ['lithium has been withheld', 'lithium was withheld'],
      ['dialysis', 'renal measurements'],
    ],
    irrelevantTerms: ['eczema', 'cataract', 'library'],
  },
  'write-37': {
    requiredConceptGroups: [
      ['serotonin toxicity', 'serotonin syndrome'],
      ['sertraline'],
      ['tramadol', 'sumatriptan'],
      ['clonus', 'hyperreflexia'],
      ['medicines have been withheld', 'agents have been withheld', 'stopped'],
      ['diazepam', 'toxicology', 'cardiac monitoring'],
    ],
    irrelevantTerms: ['hay fever', 'football'],
  },
  'write-38': {
    requiredConceptGroups: [
      ['delirium'],
      ['urinary tract infection', 'UTI', 'urinary retention'],
      ['oxybutynin', 'diphenhydramine'],
      ['no previous dementia', 'no prior dementia', 'MoCA'],
      ['daughter', 'supervision', 'home safety'],
      ['72 hours', '4–6 weeks', '4-6 weeks', 'memory clinic'],
    ],
    irrelevantTerms: ['cataract', 'gardening'],
  },
  'write-39': {
    requiredConceptGroups: [
      ['exertional syncope', 'collapsed while running'],
      ['QTc', 'long QT', 'prolonged QT'],
      ['father', 'sudden death'],
      ['escitalopram', 'withheld'],
      ['electrolytes', 'echocardiogram', 'structurally normal'],
      ['inherited arrhythmia', 'driving', 'strenuous exercise'],
    ],
    irrelevantTerms: ['eczema', 'pottery'],
  },
  'write-40': {
    requiredConceptGroups: [
      ['intracerebral haemorrhage', 'intracerebral hemorrhage', 'basal-ganglia haemorrhage'],
      ['INR', '4.8', 'warfarin'],
      ['prothrombin complex concentrate', 'PCC', 'vitamin K'],
      ['repeat CT', 'no expansion', 'stable haematoma', 'stable hematoma'],
      ['mechanical mitral valve', 'valve thrombosis'],
      ['anticoagulation resumption', 'restart anticoagulation', 'neurovascular', 'cardiology'],
    ],
    irrelevantTerms: ['psoriasis', 'chess'],
  },
  'write-41': {
    requiredConceptGroups: [
      ['peripartum cardiomyopathy', 'postpartum cardiomyopathy'],
      ['ejection fraction', 'EF 25', '25%'],
      ['pulmonary oedema', 'pulmonary edema', 'orthopnoea'],
      ['apical thrombus', 'left-ventricular thrombus', 'LMWH'],
      ['furosemide', 'enalapril', 'heart-failure therapy'],
      ['maternal medicine', 'breastfeeding', 'anticoagulation', 'tertiary transfer'],
    ],
    irrelevantTerms: ['migraine', 'art teacher', 'watercolour'],
  },
  'write-42': {
    requiredConceptGroups: [
      ['pembrolizumab', 'immune-checkpoint', 'checkpoint inhibitor'],
      ['myocarditis', 'myositis', 'myasthenic'],
      ['heart block', 'PR prolongation', 'troponin'],
      ['ptosis', 'diplopia', 'dysphagia', 'proximal weakness'],
      ['methylprednisolone', 'pembrolizumab withheld'],
      ['pacing', 'respiratory monitoring', 'IVIG', 'plasma exchange', 'tertiary transfer'],
    ],
    irrelevantTerms: ['appendicectomy', 'birdwatching'],
  },
  'write-43': {
    requiredConceptGroups: [
      ['thrombotic thrombocytopenic purpura', 'TTP'],
      ['platelets', '12'],
      ['schistocytes', 'microangiopathic haemolysis', 'microangiopathic hemolysis', 'LDH'],
      ['confusion', 'neurological', 'GCS'],
      ['ADAMTS13', 'pending', 'must not await'],
      ['plasma exchange', 'caplacizumab', 'methylprednisolone', 'urgent transfer'],
    ],
    irrelevantTerms: ['asthma', 'baking'],
  },
  'write-44': {
    requiredConceptGroups: [
      ['staggered paracetamol ingestion', 'staggered overdose'],
      ['ALT', 'alanine aminotransferase', 'acute liver injury'],
      ['INR', 'coagulopathy'],
      ['lactate', 'acidosis', 'hypoglycaemia', 'hypoglycemia'],
      ['acetylcysteine', 'N-acetylcysteine', 'NAC'],
      ['transplant centre', 'transplant assessment', 'urgent transfer'],
    ],
    irrelevantTerms: ['eczema', 'accountant', 'gardening'],
  },
  'write-45': {
    requiredConceptGroups: [
      ['prosthetic-valve endocarditis', 'prosthetic valve endocarditis', 'endocarditis'],
      ['aortic-root abscess', 'aortic root abscess', 'root abscess'],
      ['Staphylococcus aureus', 'S. aureus', 'positive blood cultures'],
      ['embolic infarct', 'cerebral embolus', 'haemorrhagic transformation', 'hemorrhagic transformation'],
      ['flucloxacillin', 'gentamicin', 'antibiotics'],
      ['cardiac surgery', 'neurology', 'multidisciplinary', 'tertiary transfer'],
    ],
    irrelevantTerms: ['hay fever', 'architect', 'photography'],
  },
};

const AUTO_WRITING_STOP_WORDS = new Set([
  'advice', 'aged', 'after', 'arrange', 'current', 'daily', 'discharge', 'follow',
  'letter', 'normal', 'patient', 'referral', 'request', 'review', 'today',
  'transfer', 'urgent', 'write', 'years',
]);

function autoWritingConceptTerms(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter((word) => word.length >= 4 && !AUTO_WRITING_STOP_WORDS.has(word)),
    ),
  ].slice(0, 6);
}

function deriveWritingCriteria(title: string, caseNotes: string): WritingCriteria {
  const titleFocus = title.split('—').at(-1) ?? title;
  const noteGroups = caseNotes
    .split('\n')
    .filter((line) => !/^(pt:|pmh:|no known|write )/i.test(line.trim()))
    .map(autoWritingConceptTerms)
    .filter((group) => group.length > 0);
  const groups = [autoWritingConceptTerms(titleFocus), ...noteGroups]
    .filter((group) => group.length > 0)
    .slice(0, 6);

  return { requiredConceptGroups: groups };
}

function writing(
  id: string,
  title: string,
  caseNotes: string,
  sampleOpening: string,
  letterType: string,
): SessionTask {
  return {
    id,
    subtest: 'writing',
    title,
    instructions: `${subtestInstructions.writing}\n\nLetter type: ${letterType}`,
    prompt: `Case notes:\n\n${caseNotes}`,
    sampleAnswer: `Model opening:\n\n${sampleOpening}`,
    modelAnswer: sampleOpening,
    rubricChecklist: defaultWritingRubric(letterType),
    writingCriteria: writingCriteriaByTaskId[id] ?? deriveWritingCriteria(title, caseNotes),
    checklist: [
      'Correct recipient and salutation',
      'State purpose in opening sentence',
      'Include only relevant notes (180–200 words)',
      'Formal sign-off matching genre',
    ],
    perfectAnswerTips: [
      'Spend 5 minutes planning: recipient, purpose, and 3–4 priority notes.',
      'Never copy case-note abbreviations — expand and formalise.',
      'Close with a clear request or offer to provide further information.',
    ],
  };
}

function readingMcq(
  id: string,
  title: string,
  passageId: string,
  question: string,
  options: McqOptionInput[],
): SessionTask {
  const passage = getReadingPassage(passageId);
  const builtOptions = buildMcqOptions(id, 'reading', question, options);
  const correctOpt = builtOptions.find((o) => o.correct);

  return {
    id,
    subtest: 'reading',
    title,
    instructions: subtestInstructions.reading,
    readingPassage: passage?.text,
    readingPassageTitle: passage?.title,
    prompt: question,
    options: builtOptions,
    explanation: correctOpt
      ? `Answer: "${correctOpt.label}". ${correctOpt.explanation ?? ''}`
      : undefined,
    perfectAnswerTips: [
      'Scan for keywords and synonyms — avoid options only partially supported.',
      'Part B/C: distinguish writer opinion from stated facts.',
      'Strict timing on Part A — do not read every word of every paragraph.',
    ],
  };
}

function advancedReadingMcq(
  id: string,
  title: string,
  passageId: string,
  question: string,
  options: McqOptionInput[],
): SessionTask {
  return {
    ...readingMcq(id, title, passageId, question, options),
    difficulty: 'advanced',
  };
}

const speakingDimensionWeights = {
  communication: 0.35,
  clinicalCommunication: 0.4,
  language: 0.25,
};

function speaking(
  id: string,
  title: string,
  card: string,
  bullets: string[],
  criteria: SpeakingCriteria,
): SessionTask {
  return {
    id,
    subtest: 'speaking',
    title,
    instructions: subtestInstructions.speaking,
    prompt: `${card}\n\nAddress:\n${bullets.map((b) => `• ${b}`).join('\n')}`,
    checklist: criteria.checklist,
    speakingCriteria: {
      ...criteria,
      dimensionWeights: criteria.dimensionWeights ?? speakingDimensionWeights,
    },
    perfectAnswerTips: [
      'Begin with empathy — acknowledge the patient\'s feelings.',
      'Use lay language; explain medical terms simply.',
      'Check understanding with teach-back before closing.',
    ],
  };
}

export const listeningTasks: SessionTask[] = [
  mcq('lis-1', 'listening', 'Part B — Ward handover', 'Complete: Concern about delayed ___ administration.', [
    { label: 'antibiotic', correct: true },
    { label: 'antibiontic', correct: false },
    { label: 'antibyotic', correct: false },
  ]),
  mcq('lis-2', 'listening', 'Part A — Spelling trap', 'Complete: Patient was ___ to ED after a fall.', [
    { label: 'referred', correct: true },
    { label: 'refer', correct: false },
    { label: 'refering', correct: false },
  ]),
  mcq('lis-3', 'listening', 'Part C — Mandatory training', 'Complete: Staff need ___ time for training.', [
    { label: 'protected', correct: true },
    { label: 'protectid', correct: false },
    { label: 'protekted', correct: false },
  ]),
  mcq('lis-4', 'listening', 'Part B — Fall risk warning', 'Complete: Patient at high risk of ___ if unattended.', [
    { label: 'falling', correct: true },
    { label: 'faling', correct: false },
    { label: 'fauling', correct: false },
  ]),
  mcq('lis-5', 'listening', 'Part A — Drug name spelling', 'Complete: Medication increased: ___.', [
    { label: 'metformin', correct: true },
    { label: 'metformine', correct: false },
    { label: 'metfornin', correct: false },
  ]),
  mcq('lis-6', 'listening', 'Part B — Care home briefing', 'Complete: Patient may need ___ if breathless.', [
    { label: 'oxygen', correct: true },
    { label: 'oxigen', correct: false },
    { label: 'oxygin', correct: false },
  ]),
  mcq('lis-7', 'listening', 'Part C — Telehealth (original scenario)', 'Complete: Telehealth works best with periodic ___ review.', [
    { label: 'in-person', correct: true },
    { label: 'inpeson', correct: false },
    { label: 'imperson', correct: false },
  ]),
  mcq('lis-8', 'listening', 'Part C — Antibiotic stewardship', 'Complete: Reduce unnecessary ___ prescribing.', [
    { label: 'broad-spectrum', correct: true },
    { label: 'broadspecrum', correct: false },
    { label: 'brod-spectrum', correct: false },
  ]),
  mcq('lis-9', 'listening', 'Part A — Physio consult', 'Complete: Recurrence after ___ months clear.', [
    { label: 'six', correct: true },
    { label: 'sux', correct: false },
    { label: 'sicks', correct: false },
  ]),
  mcq('lis-10', 'listening', 'Part B — Pharmacy insulin storage', 'Complete: Store unopened insulin in ___.', [
    { label: 'refrigerator', correct: true },
    { label: 'refridgerator', correct: false },
    { label: 'refrigerater', correct: false },
  ]),
  mcq('lis-11', 'listening', 'Part B — Post-op breathlessness', 'Complete: Check ___ saturation and notify doctor.', [
    { label: 'oxygen', correct: true },
    { label: 'oxigen', correct: false },
    { label: 'oxygene', correct: false },
  ]),
  mcq('lis-12', 'listening', 'Part C — Weight management', 'Complete: Programme targets ___ brain injury.', [
    { label: 'acquired', correct: true },
    { label: 'aquired', correct: false },
    { label: 'acqired', correct: false },
  ]),
  mcq('lis-13', 'listening', 'Part A — Rheumatology', 'Complete: Treatment mentioned: ___ therapy.', [
    { label: 'shockwave', correct: true },
    { label: 'shokwave', correct: false },
    { label: 'shockwaive', correct: false },
  ]),
  mcq('lis-14', 'listening', 'Part B — No-show policy', 'Complete: New policy reduces ___ appointments.', [
    { label: 'missed', correct: true },
    { label: 'mist', correct: false },
    { label: 'missid', correct: false },
  ]),
  mcq('lis-15', 'listening', 'Part A — Tense accuracy', 'Complete: Patient ___ chest pain since morning.', [
    { label: 'has had', correct: true },
    { label: 'have', correct: false },
    { label: 'having', correct: false },
  ]),
  mcq('lis-16', 'listening', 'Part B — Discharge planning', 'Complete: Social worker recommends ___ visit.', [
    { label: 'home', correct: true },
    { label: 'hom', correct: false },
    { label: 'hoam', correct: false },
  ]),
  mcq('lis-17', 'listening', 'Part A — Pluralisation trap', 'Complete: Patient reports ___ in both knees.', [
    { label: 'aches', correct: true },
    { label: 'ache', correct: false },
    { label: 'aching', correct: false },
  ]),
  mcq('lis-18', 'listening', 'Part C — Sepsis bundle', 'Complete: Give antibiotics within ___ of recognition.', [
    { label: 'one hour', correct: true },
    { label: '1 hour', correct: false },
    { label: 'on hour', correct: false },
  ]),
  mcq('lis-19', 'listening', 'Part B — Radiology request', 'Complete: Doctor asked to clarify whether ___ is required.', [
      { label: 'contrast', correct: true },
      { label: 'contract', correct: false },
      { label: 'contrarst', correct: false },
    ]),
  mcq('lis-20', 'listening', 'Part A — DOB spelling', 'Complete: Date of birth: 14 ___ 1968.', [
    { label: 'March', correct: true },
    { label: 'Marsh', correct: false },
    { label: 'Mars', correct: false },
  ]),
  mcq('lis-21', 'listening', 'Part B — Medication reconciliation', 'Complete: Chart shows duplicate ___.', [
    { label: 'antihypertensive', correct: true },
    { label: 'antihypertinsive', correct: false },
    { label: 'antihypertensiv', correct: false },
  ]),
  mcq('lis-22', 'listening', 'Part C — Falls prevention', 'Complete: Biggest modifiable risk is ___.', [
    { label: 'polypharmacy', correct: true },
    { label: 'polypharmocy', correct: false },
    { label: 'polyfarmacy', correct: false },
  ]),
  mcq('lis-23', 'listening', 'Part A — Dosage notation', 'Complete: Prescribed dose: ___ mg twice daily.', [
    { label: '500', correct: true },
    { label: '50', correct: false },
    { label: '5000', correct: false },
  ]),
  mcq('lis-24', 'listening', 'Part B — MDT meeting', 'Complete: Consultant ___ to suggestion.', [
    { label: 'agrees', correct: true },
    { label: 'agrease', correct: false },
    { label: 'agreez', correct: false },
  ]),
  mcq('lis-25', 'listening', 'Part C — Diabetes foot screening', 'Complete: Programme prioritises ___ neuropathy.', [
    { label: 'peripheral', correct: true },
    { label: 'periferal', correct: false },
    { label: 'peripheril', correct: false },
  ]),
  // ── Advanced listening tasks (lis-26 onward) ──────────────────────
  {
    ...mcq('lis-26', 'listening', 'Part C — Cardiologist impression', 'Complete: Chest pain suggests ___ cause.', [
      { label: 'non-cardiac', correct: true },
      { label: 'noncardiac', correct: false },
      { label: 'noncadiac', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-27', 'listening', 'Part A — Stress test prep', 'Complete: Patient advised to avoid ___ before the stress test.', [
      { label: 'caffeine', correct: true },
      { label: 'caffine', correct: false },
      { label: 'cafein', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-28', 'listening', 'Part B — Pharmacy interaction alert', 'Complete: Clarithromycin may elevate ___ levels.', [
      { label: 'warfarin', correct: true },
      { label: 'warfrin', correct: false },
      { label: 'warferin', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-29', 'listening', 'Part C — Speaker attitude', 'Complete: Speaker is ___ supportive of new protocol.', [
      { label: 'cautiously', correct: true },
      { label: 'cautiosly', correct: false },
      { label: 'cautuous', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-30', 'listening', 'Part A — Complex spelling', 'Complete: Patient diagnosed with ___.', [
      { label: 'cholecystitis', correct: true },
      { label: 'cholecystitus', correct: false },
      { label: 'colecystitis', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-31', 'listening', 'Part B — Medication reconciliation', 'Complete: Nurse concerned about ___ and amiodarone.', [
      { label: 'apixaban', correct: true },
      { label: 'apexaban', correct: false },
      { label: 'apixiban', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-32', 'listening', 'Part C — Contrast safety', 'Complete: Highest nephropathy risk with eGFR below ___.', [
      { label: '30', correct: true },
      { label: '20', correct: false },
      { label: '40', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-33', 'listening', 'Part A — Topical dose', 'Complete: Apply ___ cream twice daily.', [
      { label: 'hydrocortisone', correct: true },
      { label: 'hydroxychloroquine', correct: false },
      { label: 'hydrochlorothiazide', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-34', 'listening', 'Part B — Discharge quality', 'Complete: Discharge summary needs clear ___ plan.', [
      { label: 'follow-up', correct: true },
      { label: 'followup', correct: false },
      { label: 'folow-up', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-35', 'listening', 'Part C — Student evaluation', 'Complete: Student misses ___ presentation.', [
      { label: 'atypical', correct: true },
      { label: 'atipical', correct: false },
      { label: 'atypicle', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-36', 'listening', 'Part A — Abbreviation', 'Complete: Patient to receive ___ via PEG tube.', [
      { label: 'NGT', correct: true },
      { label: 'NG', correct: false },
      { label: 'NJT', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-37', 'listening', 'Part C — Opioid stewardship', 'Complete: Non-___ therapy should precede opioids.', [
      { label: 'pharmacological', correct: true },
      { label: 'pharmocological', correct: false },
      { label: 'pharmacologicle', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-38', 'listening', 'Part B — NEWS escalation', 'Complete: Escalate if NEWS score above ___.', [
      { label: '5', correct: true },
      { label: '3', correct: false },
      { label: '7', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-39', 'listening', 'Part A — Allergy spelling', 'Complete: Patient allergic to ___.', [
      { label: 'penicillamine', correct: true },
      { label: 'penicillin', correct: false },
      { label: 'penicilamine', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-40', 'listening', 'Part C — Study design', 'Complete: Study lacks ___ introducing bias.', [
      { label: 'blinding', correct: true },
      { label: 'blending', correct: false },
      { label: 'blindness', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-41', 'listening', 'Part A — CT head result', 'Complete: CT head showed no acute ___.', [
      { label: 'intracranial haemorrhage', correct: true },
      { label: 'intracranial hemorrage', correct: false },
      { label: 'intracranial hemorhage', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-42', 'listening', 'Part B — Nausea management', 'Complete: Switch antiemetic to ___.', [
      { label: 'cyclizine', correct: true },
      { label: 'cyclizene', correct: false },
      { label: 'siklizine', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-43', 'listening', 'Part A — Microbiology result', 'Complete: Blood culture grew ___.', [
      { label: 'Staphylococcus aureus', correct: true },
      { label: 'Staphylococcus epidermis', correct: false },
      { label: 'Streptococcus pneumoniae', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-44', 'listening', 'Part C — Physio advice', 'Complete: Mobilise within ___ hours of surgery.', [
      { label: '24', correct: true },
      { label: '48', correct: false },
      { label: '12', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-45', 'listening', 'Part A — Insulin dose', 'Complete: Discharge includes ___ units of insulin.', [
      { label: '34', correct: true },
      { label: '43', correct: false },
      { label: '24', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-46', 'listening', 'Part B — Speech pathology', 'Complete: Speech pathologist recommends ___ diet.', [
      { label: 'soft', correct: true },
      { label: 'softt', correct: false },
      { label: 'sorft', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-47', 'listening', 'Part C — Ophthalmology', 'Complete: Suspected ___ arteritis.', [
      { label: 'giant cell', correct: true },
      { label: 'jaint cell', correct: false },
      { label: 'giant sel', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-48', 'listening', 'Part A — Biopsy result', 'Complete: Biopsy shows ___ carcinoma.', [
      { label: 'ductal', correct: true },
      { label: 'ductile', correct: false },
      { label: 'ductual', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-49', 'listening', 'Part B — Psychiatry', 'Complete: Start ___ at low dose with gradual titration.', [
      { label: 'sertraline', correct: true },
      { label: 'sertralene', correct: false },
      { label: 'sertralin', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-50', 'listening', 'Part A — Oral thrush treatment', 'Complete: Apply ___ oral suspension four times daily.', [
      { label: 'nystatin', correct: true },
      { label: 'nistatin', correct: false },
      { label: 'nicstatin', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-51', 'listening', 'Part C — Obstetric plan', 'Complete: Recommend induction at ___ weeks.', [
      { label: '38', correct: true },
      { label: '36', correct: false },
      { label: '40', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-52', 'listening', 'Part A — IV access', 'Complete: IV access via ___ line.', [
      { label: 'peripheral', correct: true },
      { label: 'periferal', correct: false },
      { label: 'peripherial', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-53', 'listening', 'Part C — Dermatology', 'Complete: Rash likely due to ___ reaction.', [
      { label: 'allergic', correct: true },
      { label: 'alergic', correct: false },
      { label: 'allergik', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-54', 'listening', 'Part A — MRI result', 'Complete: MRI shows ___ at L4-L5.', [
      { label: 'disc prolapse', correct: true },
      { label: 'disc prolaps', correct: false },
      { label: 'disk prolapse', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-55', 'listening', 'Part B — Anaesthetic assessment', 'Complete: Anaesthetist concerned about difficult ___.', [
      { label: 'airway', correct: true },
      { label: 'airweigh', correct: false },
      { label: 'aireway', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-56', 'listening', 'Part A — Antibiotic change', 'Complete: Antibiotic changed to ___.', [
      { label: 'doxycycline', correct: true },
      { label: 'doxicicline', correct: false },
      { label: 'doxicycline', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-57', 'listening', 'Part C — Paediatric assessment', 'Complete: Fever likely due to ___ illness.', [
      { label: 'viral', correct: true },
      { label: 'virral', correct: false },
      { label: 'virel', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-58', 'listening', 'Part A — Fracture type', 'Complete: Fracture type: ___ of distal radius.', [
      { label: 'Colles', correct: true },
      { label: 'Collis', correct: false },
      { label: 'Coles', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-59', 'listening', 'Part B — Dietitian advice', 'Complete: Reduce ___ intake to below 2 grams daily.', [
      { label: 'sodium', correct: true },
      { label: 'sodeum', correct: false },
      { label: 'sodum', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-60', 'listening', 'Part A — ECG result', 'Complete: ECG shows ___ fibrillation.', [
      { label: 'atrial', correct: true },
      { label: 'atreal', correct: false },
      { label: 'atrium', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-61', 'listening', 'Part C — Neurology', 'Complete: Patient had transient ___ attack.', [
      { label: 'ischaemic', correct: true },
      { label: 'ischemic', correct: false },
      { label: 'iscemic', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-62', 'listening', 'Part A — Palliative care', 'Complete: Palliative plan prioritises ___ control.', [
      { label: 'symptom', correct: true },
      { label: 'symtom', correct: false },
      { label: 'symptome', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-63', 'listening', 'Part B — Rheumatology', 'Complete: Start ___ and refer for physiotherapy.', [
      { label: 'methotrexate', correct: true },
      { label: 'methatrexate', correct: false },
      { label: 'methetrexate', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-64', 'listening', 'Part A — Fluid resuscitation', 'Complete: Fluid challenge of ___ mils given.', [
      { label: '500', correct: true },
      { label: '250', correct: false },
      { label: '1000', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-65', 'listening', 'Part C — Oncology', 'Complete: Recommended approach is ___ chemotherapy.', [
      { label: 'neoadjuvant', correct: true },
      { label: 'neoadjuvent', correct: false },
      { label: 'knee-adjuvant', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-66', 'listening', 'Part A — Hyperkalaemia treatment', 'Complete: Started on ___ for hyperkalaemia.', [
      { label: 'calcium gluconate', correct: true },
      { label: 'calcitonin', correct: false },
      { label: 'calcium glusonate', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-67', 'listening', 'Part B — Discharge planning', 'Complete: Main challenge is ___ home placement.', [
      { label: 'nursing', correct: true },
      { label: 'nurshing', correct: false },
      { label: 'nurcing', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-68', 'listening', 'Part A — Urine dip result', 'Complete: Urine dip shows ___ and blood.', [
      { label: 'protein', correct: true },
      { label: 'proteen', correct: false },
      { label: 'protin', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-69', 'listening', 'Part C — Endocrinology', 'Complete: Suspected primary ___.', [
      { label: 'hyperaldosteronism', correct: true },
      { label: 'hyperaldosteronysm', correct: false },
      { label: 'hyperaldostironism', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-70', 'listening', 'Part A — Patient transfer', 'Complete: Patient transferred to ___ for further management.', [
      { label: 'ICU', correct: true },
      { label: 'HDU', correct: false },
      { label: 'CCU', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-71', 'listening', 'Part A — TB specimen handling', 'Complete: Sputum sample must be sent for ___ staining.', [
      { label: 'acid-fast', correct: true },
      { label: 'acid fast', correct: false },
      { label: 'acid-farce', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-72', 'listening', 'Part B — MRI contrast risk', 'Complete: eGFR is borderline for ___ administration.', [
      { label: 'gadolinium', correct: true },
      { label: 'gadolinuim', correct: false },
      { label: 'iodinated', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-73', 'listening', 'Part B — Infection control escalation', 'Complete: Patient needs ___ precautions after varicella exposure.', [
      { label: 'airborne', correct: true },
      { label: 'droplet', correct: false },
      { label: 'airborn', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-74', 'listening', 'Part C — Acute dyspnoea differential', 'Complete: Consultant suspects ___ embolism.', [
      { label: 'pulmonary', correct: true },
      { label: 'pulmanary', correct: false },
      { label: 'coronary', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-75', 'listening', 'Part A — ACS pathway timing', 'Complete: Repeat troponin at ___ hours.', [
      { label: 'three', correct: true },
      { label: 'tree', correct: false },
      { label: 'thirteen', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-76', 'listening', 'Part B — Contrast medication safety', 'Complete: Withhold ___ before contrast scan.', [
      { label: 'metformin', correct: true },
      { label: 'metoprolol', correct: false },
      { label: 'metformine', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-77', 'listening', 'Part A — Adrenal crisis', 'Complete: Start ___ for suspected adrenal crisis.', [
      { label: 'hydrocortisone', correct: true },
      { label: 'hydrochlorothiazide', correct: false },
      { label: 'hydroxychloroquine', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-78', 'listening', 'Part C — Audiology report', 'Complete: Audiology notes ___ hearing loss.', [
      { label: 'sensorineural', correct: true },
      { label: 'sensory-neural', correct: false },
      { label: 'conductive', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-79', 'listening', 'Part A — Haematology film', 'Complete: Blood film shows ___ cells.', [
      { label: 'schistocytes', correct: true },
      { label: 'schistocites', correct: false },
      { label: 'spherocytes', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-80', 'listening', 'Part B — Ascites procedure', 'Complete: Administer ___ before paracentesis.', [
      { label: 'albumin', correct: true },
      { label: 'albuterol', correct: false },
      { label: 'albumen', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-81', 'listening', 'Part B — Paediatric wound closure', 'Complete: Use ___ suture for facial laceration.', [
      { label: 'absorbable', correct: true },
      { label: 'non-absorbable', correct: false },
      { label: 'absorble', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-82', 'listening', 'Part C — Endocrine trial exclusion', 'Complete: Trial excluded patients with ___ insufficiency.', [
      { label: 'adrenal', correct: true },
      { label: 'renal', correct: false },
      { label: 'adrenial', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-83', 'listening', 'Part B — SSRI interaction', 'Complete: Monitor for ___ syndrome after SSRI change.', [
      { label: 'serotonin', correct: true },
      { label: 'sertraline', correct: false },
      { label: 'serotinin', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-84', 'listening', 'Part A — Needle-stick protocol', 'Complete: Patient needs ___ prophylaxis after needle-stick.', [
      { label: 'post-exposure', correct: true },
      { label: 'post exposure', correct: false },
      { label: 'pre-exposure', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-85', 'listening', 'Part A — Early pregnancy scan', 'Complete: Ultrasound confirms ___ pregnancy.', [
      { label: 'ectopic', correct: true },
      { label: 'atopic', correct: false },
      { label: 'eutopic', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-86', 'listening', 'Part B — Dysphagia assessment', 'Complete: Swallow assessment showed silent ___.', [
      { label: 'aspiration', correct: true },
      { label: 'respiration', correct: false },
      { label: 'aspiratione', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-87', 'listening', 'Part C — Ototoxicity review', 'Complete: Drug causing ototoxicity: ___.', [
      { label: 'gentamicin', correct: true },
      { label: 'gentamycin', correct: false },
      { label: 'vancomycin', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-88', 'listening', 'Part A — COPD oxygen prescription', 'Complete: Target oxygen saturation is ___ percent.', [
      { label: '88-92', correct: true },
      { label: '94-98', correct: false },
      { label: '88 to 92', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-89', 'listening', 'Part B — Surgical emergency', 'Complete: Treat suspected ___ fasciitis urgently.', [
      { label: 'necrotising', correct: true },
      { label: 'necrotizing', correct: false },
      { label: 'necrotysing', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-90', 'listening', 'Part C — Transplant pharmacology', 'Complete: Reduce tacrolimus because of ___.', [
      { label: 'nephrotoxicity', correct: true },
      { label: 'neurotoxicity', correct: false },
      { label: 'nephrotoxisity', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-91', 'listening', 'Part A — Pleural infection plan', 'Complete: Plan ___ drainage for empyema.', [
      { label: 'intercostal', correct: true },
      { label: 'intracostal', correct: false },
      { label: 'intercoastal', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-92', 'listening', 'Part C — Dizziness assessment', 'Complete: Symptoms suggest ___ vertigo.', [
      { label: 'positional', correct: true },
      { label: 'postural', correct: false },
      { label: 'positionel', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-93', 'listening', 'Part B — Thyroidectomy discharge', 'Complete: Start ___ replacement after thyroidectomy.', [
      { label: 'levothyroxine', correct: true },
      { label: 'liothyronine', correct: false },
      { label: 'levothiroxine', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-94', 'listening', 'Part C — Anaemia interpretation', 'Complete: Consultant mentions ___ anaemia.', [
      { label: 'haemolytic', correct: true },
      { label: 'hemolytic', correct: false },
      { label: 'megaloblastic', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-95', 'listening', 'Part A — Postmenopausal bleeding', 'Complete: Refer for ___ ultrasound.', [
      { label: 'transvaginal', correct: true },
      { label: 'trans-abdominal', correct: false },
      { label: 'transvaginel', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-96', 'listening', 'Part B — C. difficile isolation', 'Complete: Use ___ precautions for C. difficile.', [
      { label: 'contact', correct: true },
      { label: 'droplet', correct: false },
      { label: 'kontact', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-97', 'listening', 'Part A — Cancer genetics', 'Complete: Genetic test shows ___ mutation.', [
      { label: 'BRCA1', correct: true },
      { label: 'BRCA2', correct: false },
      { label: 'BCRA1', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-98', 'listening', 'Part B — Melanoma staging', 'Complete: Patient is awaiting ___ biopsy.', [
      { label: 'sentinel node', correct: true },
      { label: 'central node', correct: false },
      { label: 'sentinal node', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-99', 'listening', 'Part C — RCT methodology critique', 'Complete: Lecture criticizes lack of ___ concealment.', [
      { label: 'allocation', correct: true },
      { label: 'allocated', correct: false },
      { label: 'blinding', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-100', 'listening', 'Part A — Vestibular rehabilitation', 'Complete: Clinic advises ___ exercises for vestibular rehab.', [
      { label: 'gaze-stabilisation', correct: true },
      { label: 'gaze stabilization', correct: false },
      { label: 'gate-stabilisation', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-101', 'listening', 'Part A — Anticoagulation clinic', 'Complete: INR today is ___, so warfarin is withheld.', [
      { label: '4.8', correct: true },
      { label: '1.8', correct: false },
      { label: '48', correct: false },
    ]),
    difficulty: 'intermediate',
  },
  {
    ...mcq('lis-102', 'listening', 'Part B — Pressure injury handover', 'Complete: Reposition this patient at least every ___ hours.', [
      { label: 'two', correct: true },
      { label: 'four', correct: false },
      { label: 'twelve', correct: false },
    ]),
    difficulty: 'intermediate',
  },
  {
    ...mcq('lis-103', 'listening', 'Part C — Vaccination programme lecture', 'Complete: The speaker emphasises vaccine ___, not coercion.', [
      { label: 'confidence', correct: true },
      { label: 'compliance', correct: false },
      { label: 'convenience', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-104', 'listening', 'Part A — Renal medicine review', 'Complete: Potassium was repeated because the first sample was ___ .', [
      { label: 'haemolysed', correct: true },
      { label: 'fasting', correct: false },
      { label: 'diluted', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq('lis-105', 'listening', 'Part B — Paediatric discharge call', 'Complete: Parent should seek help if there are fewer than ___ wet nappies.', [
      { label: 'three', correct: true },
      { label: 'six', correct: false },
      { label: 'eight', correct: false },
    ]),
    difficulty: 'intermediate',
  },
  {
    ...mcq('lis-106', 'listening', 'Part C — Diagnostic safety lecture', 'Complete: The lecturer recommends a diagnostic ___ before discharge.', [
      { label: 'time-out', correct: true },
      { label: 'handover', correct: false },
      { label: 'referral', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-107',
      'listening',
      'Part C — Diagnostic AI grand round',
      'What does the speaker identify as essential before the model is introduced more widely?',
      [
        {
          label: 'External validation in hospitals with a different case mix',
          correct: true,
          explanation:
            'The speaker distinguishes local recalibration from the external validation needed to establish transportability.',
        },
        {
          label: 'Further recalibration using the same hospital data',
          correct: false,
          explanation:
            'The model has already been recalibrated locally; repeating this does not show that it transfers safely to other settings.',
        },
        {
          label: 'Replacing consultant review with automated decisions',
          correct: false,
          explanation:
            'The speaker explicitly retains consultant review and presents the model as decision support.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-108',
      'listening',
      'Part C — Deprescribing grand round',
      'Why does the speaker avoid attributing the reduction in falls to deprescribing alone?',
      [
        {
          label: 'Several interventions began together, so the medication component was not isolated',
          correct: true,
          explanation:
            'The speaker notes that medication review, strength training and closer follow-up were introduced as one bundle.',
        },
        {
          label: 'The fall rate had already fallen before medication reviews began',
          correct: false,
          explanation:
            'The recording does not describe a pre-existing fall in the outcome before the programme.',
        },
        {
          label: 'Patients refused to discuss reducing medicines during the programme',
          correct: false,
          explanation:
            'The speaker supports shared decisions but does not say that patients refused medication review.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-109',
      'listening',
      'Part B — Corrected critical result',
      'What action does the speaker want after the laboratory corrects the patient identification?',
      [
        {
          label: 'Cancel hyperkalaemia treatment and document the corrected result',
          correct: true,
          explanation:
            'The 6.8 result belonged to another patient; the correct potassium is 4.8 and the planned treatment should be cancelled.',
        },
        {
          label: 'Continue treatment because the first result was above the critical threshold',
          correct: false,
          explanation:
            'The first result was assigned to the wrong patient and must not drive treatment.',
        },
        {
          label: 'Repeat potassium immediately despite the stable clinical picture',
          correct: false,
          explanation:
            'The speaker asks for repetition only if the clinical picture changes, not automatically.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-110',
      'listening',
      'Part C — Journal-club inference',
      'What is the speaker’s main reservation about calling the treatments equivalent?',
      [
        {
          label: 'The superiority study was not designed to exclude clinically important differences',
          correct: true,
          explanation:
            'The speaker says the confidence interval still permits meaningful benefit or harm, so a null superiority result cannot establish equivalence.',
        },
        {
          label: 'The treatments produced exactly the same result in every participant',
          correct: false,
          explanation:
            'The speaker rejects an equivalence claim and does not describe identical individual outcomes.',
        },
        {
          label: 'A non-inferiority margin was prespecified too conservatively',
          correct: false,
          explanation:
            'No non-inferiority design or prespecified margin was used; that absence is part of the criticism.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-111',
      'listening',
      'Part C — Time-dependent bias seminar',
      'What is the speaker’s main concern about the reported survival benefit?',
      [
        {
          label: 'Patients had to survive long enough to enter the specialist-review group',
          correct: true,
          explanation:
            'The exposure was assigned from admission even though review happened later, so early deaths could only accumulate in the comparison group.',
        },
        {
          label: 'The study adjusted for too many baseline measures of illness severity',
          correct: false,
          explanation:
            'The speaker says baseline adjustment cannot correct the time-classification error; excessive adjustment is not the concern.',
        },
        {
          label: 'Specialist review was offered to every patient immediately on admission',
          correct: false,
          explanation:
            'Review occurred during a seven-day window, which is precisely why survival before exposure matters.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-112',
      'listening',
      'Part A — Neuropathic symptom history',
      'Complete: The symptom mainly disrupting the patient’s sleep was ___.',
      [
        {
          label: 'burning pain in both feet',
          correct: true,
          explanation:
            'The patient distinguishes brief daytime dizziness and one episode of palpitations from the bilateral burning pain that repeatedly prevented sleep.',
        },
        {
          label: 'dizziness on standing',
          correct: false,
          explanation:
            'The dizziness was brief, occurred on standing and settled within seconds; it was not the nocturnal problem.',
        },
        {
          label: 'night-time palpitations',
          correct: false,
          explanation:
            'The patient noticed palpitations only once and explicitly says they were not what caused waking.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-113',
      'listening',
      'Part B — Maternity observation briefing',
      'What is the main reason for introducing the new observation chart?',
      [
        {
          label: 'Generic thresholds can conceal deterioration during pregnancy',
          correct: true,
          explanation:
            'The speaker explains that physiological changes can make a generic chart appear reassuring, so pregnancy-specific triggers are needed.',
        },
        {
          label: 'Staff have repeatedly failed to record routine observations',
          correct: false,
          explanation:
            'The speaker explicitly says the change is not a response to missing observations or staff failure.',
        },
        {
          label: 'Every abnormal observation will now require immediate intensive care',
          correct: false,
          explanation:
            'The chart prompts appropriate escalation; it does not send every abnormal value directly to intensive care.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-114',
      'listening',
      'Part C — Diagnostic-safety review',
      'What is the speaker’s main recommendation for reviewing possible missed diagnoses?',
      [
        {
          label: 'Assess how uncertainty and follow-up were managed, not simply count tests or later diagnoses',
          correct: true,
          explanation:
            'The speaker rejects hindsight and test-volume metrics, recommending review of explained uncertainty, explicit follow-up triggers and ownership of outstanding results.',
        },
        {
          label: 'Treat every later serious diagnosis as proof that the first clinician made an error',
          correct: false,
          explanation:
            'The speaker says this hindsight-based classification is too crude because symptoms can evolve after a reasonable initial assessment.',
        },
        {
          label: 'Reward departments that order the largest number of investigations at the first visit',
          correct: false,
          explanation:
            'Indiscriminate testing can create false positives and does not guarantee safe follow-up.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-115',
      'listening',
      'Part C — Case-mix reversal in an outcomes audit',
      'What conclusion does the speaker draw from the mortality figures?',
      [
        {
          label: 'The lower overall rate may reflect a shift towards lower-risk cases rather than better outcomes within comparable groups',
          correct: true,
          explanation:
            'The speaker notes that mortality was unchanged within each baseline-risk band and fell overall only after the service admitted proportionally more low-risk patients.',
        },
        {
          label: 'The programme has proved that rapid assessment reduces mortality in every risk group',
          correct: false,
          explanation:
            'Within-band mortality did not improve, so the aggregate decline cannot support this universal causal claim.',
        },
        {
          label: 'Risk stratification should be abandoned because subgroup analysis is always misleading',
          correct: false,
          explanation:
            'The speaker recommends prespecified case-mix standardisation, not abandoning clinically meaningful subgroup analysis.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-116',
      'listening',
      'Part C — Reconsidering an alert-speed metric',
      'What limitation does the speaker identify in the alert audit?',
      [
        {
          label: 'It equates faster treatment with better care without distinguishing appropriate reassessment from missed escalation',
          correct: true,
          explanation:
            'The speaker explains that some delay reflected justified diagnostic review, while some rapid treatment was unnecessary; speed alone did not measure correctness.',
        },
        {
          label: 'It excludes every patient who received antibiotics before an electronic alert',
          correct: false,
          explanation:
            'No such exclusion is described; the criticism concerns what alert-to-treatment time means, not missing pre-alert prescriptions.',
        },
        {
          label: 'It proves that electronic alerts should be withdrawn from all non-infectious cases',
          correct: false,
          explanation:
            'The speaker explicitly retains time as a safety signal and recommends richer evaluation rather than abandoning alerts.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-117',
      'listening',
      'Part C — Falls-coaching evaluation',
      'Why is the speaker cautious about the reported 24% reduction in falls?',
      [
        {
          label: 'Wards selected for an extreme recent rate may improve partly through regression towards the mean',
          correct: true,
          explanation:
            'The speaker notes that chance contributed to the extreme baseline used for selection, so some subsequent decline was expected without coaching.',
        },
        {
          label: 'Falls cannot be compared between wards unless every ward has exactly the same number of beds',
          correct: false,
          explanation:
            'The concern is extreme-value selection and trend, not a requirement for identical ward size.',
        },
        {
          label: 'Accurate incident reporting proves that the entire reduction was caused by coaching',
          correct: false,
          explanation:
            'Accurate measurement does not remove regression to the mean or other before-and-after biases.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-118',
      'listening',
      'Part C — Informative missingness in follow-up',
      'Why does the speaker reject the complete-case conclusion that symptoms improved?',
      [
        {
          label: 'People who stopped treatment or became too unwell were excluded, so the remaining reports may overstate benefit',
          correct: true,
          explanation:
            'The speaker links missing final reports to adverse effects and deterioration, making the observed completers a selected, more treatment-tolerant group.',
        },
        {
          label: 'Every participant with a missing questionnaire must have experienced exactly the same deterioration',
          correct: false,
          explanation:
            'The speaker recommends sensitivity analyses because individual missing outcomes are uncertain; they are not assumed identical.',
        },
        {
          label: 'Baseline adjustment proves that later missing outcomes cannot bias the treatment estimate',
          correct: false,
          explanation:
            'The speaker explicitly says baseline information cannot repair outcome-dependent exclusion from the complete-case analysis.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...mcq(
      'lis-119',
      'listening',
      'Part C — Treatment switching and kidney outcomes',
      'Why does the speaker reject the claim that continued exposure proved the new medicine protected kidney function?',
      [
        {
          label: 'Early deterioration prompted patients to switch treatment, moving their later risk into the comparator group and selecting healthier continuers',
          correct: true,
          explanation:
            'The speaker links switching to early prognostic changes, so the as-treated groups are selected after randomisation and no longer provide the original fair comparison.',
        },
        {
          label: 'The intention-to-treat analysis excluded every participant who received rescue treatment',
          correct: false,
          explanation:
            'The treatment-policy analysis retains participants according to assignment; exclusion is not the criticism described.',
        },
        {
          label: 'Any treatment switch makes a randomised trial incapable of answering a clinically useful question',
          correct: false,
          explanation:
            'The speaker supports several estimands, provided the question and assumptions are defined before selecting the analysis.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
];

export const readingTasks: SessionTask[] = [
  readingMcq('read-1', 'Part B — Infection control email', 'passage-infection-control', 'Main purpose of the email?', [
    { label: 'Remind staff of updated infection control procedures', correct: true },
    { label: 'Announce ward closure', correct: false },
    { label: 'Request annual leave', correct: false },
  ]),
  readingMcq('read-2', 'Part C — Trial abstract limitation', 'passage-trial-abstract', 'Authors acknowledge…', [
    { label: 'Small sample size', correct: true },
    { label: 'No clinical relevance', correct: false },
    { label: 'Study was never peer-reviewed', correct: false },
  ]),
  readingMcq('read-3', 'Part A — Falls prevention heading', 'passage-falls-audit', 'Best heading for audit compliance text?', [
    { label: 'Monitoring compliance with safety protocols', correct: true },
    { label: 'Staff canteen hygiene', correct: false },
    { label: 'Holiday roster planning', correct: false },
  ]),
  readingMcq('read-4', 'Part B — Memo audience', 'passage-ward-memo', 'Who is the intended audience?', [
    { label: 'Ward nursing staff', correct: true },
    { label: 'Hospital visitors', correct: false },
    { label: 'Medical students only', correct: false },
  ]),
  readingMcq('read-5', 'Part A — Medication storage', 'passage-pharmacy-sop', 'Which text covers fridge storage SOP?', [
    { label: 'Text C — Pharmacy SOP excerpt', correct: true },
    { label: 'Text A — Staff roster', correct: false },
    { label: 'Text D — Menu', correct: false },
  ]),
  readingMcq('read-6', 'Part C — Inference question', 'passage-staffing-policy', 'Writer implies staffing shortages…', [
    { label: 'May affect continuity of patient care', correct: true },
    { label: 'Are entirely fictional', correct: false },
    { label: 'Only affect administration', correct: false },
  ]),
  readingMcq('read-7', 'Part A — Vaccination schedules', 'passage-vaccination-schedule', 'Synonym match: "immunisation timetable" ≈', [
    { label: 'vaccination schedule', correct: true },
    { label: 'infection outbreak', correct: false },
    { label: 'medication chart', correct: false },
  ]),
  readingMcq('read-8', 'Part B — Consent form gist', 'passage-consent-form', 'Document primarily explains…', [
    { label: 'Rights and process for informed consent', correct: true },
    { label: 'Staff parking allocation', correct: false },
    { label: 'Canteen opening hours', correct: false },
  ]),
  readingMcq('read-9', 'Part C — Writer opinion vs fact', 'passage-clinical-commentary', 'Which is stated as opinion?', [
    { label: 'Policy should be revised within two years', correct: true },
    { label: 'Study included 200 participants', correct: false },
    { label: 'Trial ran for 12 months', correct: false },
  ]),
  readingMcq('read-10', 'Part A — Catheter care bundle', 'passage-catheter-bundle', 'Match: "aseptic technique checklist" belongs in…', [
    { label: 'Catheter insertion protocol text', correct: true },
    { label: 'Fire evacuation plan', correct: false },
    { label: 'Payroll policy', correct: false },
  ]),
  readingMcq('read-11', 'Part B — Stroke pathway', 'passage-stroke-pathway', 'Purpose of the pathway document?', [
    { label: 'Standardise time-critical stroke management', correct: true },
    { label: 'Market a private clinic', correct: false },
    { label: 'Replace all GP referrals', correct: false },
  ]),
  readingMcq('read-12', 'Part C — Mental health policy', 'passage-mental-health-policy', 'Writer\'s main concern?', [
    { label: 'Early intervention reduces crisis admissions', correct: true },
    { label: 'Eliminating all community services', correct: false },
    { label: 'Increasing bed occupancy only', correct: false },
  ]),
  readingMcq('read-13', 'Part A — Sepsis Six matching', 'passage-sepsis-bundle', 'Which text lists fluid resuscitation targets?', [
    { label: 'Text B — Acute care bundle', correct: true },
    { label: 'Text A — Staff parking policy', correct: false },
    { label: 'Text D — Catering menu', correct: false },
  ]),
  readingMcq('read-14', 'Part B — ALARA radiation policy', 'passage-alara-radiation', 'Primary purpose of the document?', [
    { label: 'Minimise radiation exposure as low as reasonably achievable', correct: true },
    { label: 'Increase imaging volume for revenue', correct: false },
    { label: 'Replace radiographer training', correct: false },
  ]),
  readingMcq('read-15', 'Part A — Diabetes foot pathway', 'passage-diabetes-foot', 'Match: "monofilament testing" appears in…', [
    { label: 'Annual screening protocol text', correct: true },
    { label: 'Fire drill instructions', correct: false },
    { label: 'Payroll timesheet guide', correct: false },
  ]),
  readingMcq('read-16', 'Part B — Appointment no-show email', 'passage-no-show-email', 'Manager proposes to…', [
    { label: 'Charge a fee for repeated missed appointments', correct: true },
    { label: 'Close the outpatient clinic', correct: false },
    { label: 'Stop sending reminders', correct: false },
  ]),
  readingMcq('read-17', 'Part C — Nurse staffing abstract', 'passage-nurse-staffing-abstract', 'Authors conclude higher ratios may…', [
    { label: 'Improve patient safety outcomes', correct: true },
    { label: 'Have no measurable effect', correct: false },
    { label: 'Only reduce hospital revenue', correct: false },
  ]),
  readingMcq('read-18', 'Part A — Anticoagulation protocol', 'passage-anticoagulation-sop', 'Which text covers DOAC renal dose adjustment?', [
    { label: 'Text C — Anticoagulation clinic SOP', correct: true },
    { label: 'Text A — Visitor parking', correct: false },
    { label: 'Text B — Menu planning', correct: false },
  ]),
  readingMcq('read-19', 'Part B — Mental Health Act summary', 'passage-mental-health-act', 'Section primarily explains…', [
    { label: 'Criteria for detention and patient rights', correct: true },
    { label: 'How to order hospital meals', correct: false },
    { label: 'Staff uniform requirements', correct: false },
  ]),
  readingMcq('read-20', 'Part C — Clinical trial methods', 'passage-clinical-trial-methods', 'Randomisation was used to…', [
    { label: 'Reduce selection bias between groups', correct: true },
    { label: 'Eliminate the need for ethics approval', correct: false },
    { label: 'Guarantee all patients improve', correct: false },
  ]),
  readingMcq('read-21', 'Part B — Antimicrobial stewardship memo', 'passage-antibiotic-stewardship-memo', 'Before prescribing a restricted antibiotic, a clinician must…', [
    { label: 'Get sign-off from the on-call microbiology registrar', correct: true },
    { label: 'Wait for pharmacy to dispense a narrow-spectrum agent first', correct: false },
    { label: 'Complete an online training module', correct: false },
  ]),
  readingMcq('read-22', 'Part B — Antimicrobial stewardship memo', 'passage-antibiotic-stewardship-memo', 'For life-threatening sepsis, empirical restricted therapy…', [
    { label: 'May start immediately but must be reviewed within 24 hours', correct: true },
    { label: 'Is never permitted without prior approval', correct: false },
    { label: 'Requires two registrars to co-sign', correct: false },
  ]),
  readingMcq('read-23', 'Part B — Telehealth consent notice', 'passage-telehealth-consent-notice', 'Telehealth consultations are NOT appropriate for…', [
    { label: 'New presentations of chest pain or breathing difficulty', correct: true },
    { label: 'Stable chronic disease review appointments', correct: false },
    { label: 'Discussing results with a patient', correct: false },
  ]),
  readingMcq('read-24', 'Part B — Telehealth consent notice', 'passage-telehealth-consent-notice', 'Before clinical discussion begins, clinicians must confirm identity using…', [
    { label: 'Full name and date of birth', correct: true },
    { label: 'Photo identification only', correct: false },
    { label: 'A signed consent form emailed in advance', correct: false },
  ]),
  readingMcq('read-25', 'Part C — Sepsis alert tool abstract', 'passage-sepsis-recognition-abstract', 'After implementation, time to first antibiotic dose…', [
    { label: 'Fell from 118 to 61 minutes', correct: true },
    { label: 'Stayed the same but mortality improved', correct: false },
    { label: 'Increased slightly due to alert fatigue', correct: false },
  ]),
  readingMcq('read-26', 'Part C — Sepsis alert tool abstract', 'passage-sepsis-recognition-abstract', 'The authors recommend managing alert fatigue by…', [
    { label: 'Reviewing alert thresholds regularly rather than once', correct: true },
    { label: 'Removing nursing staff from the escalation pathway', correct: false },
    { label: 'Disabling alerts during the first two weeks', correct: false },
  ]),
  {
    ...readingMcq('read-27', 'Part B — Contrast safety policy', 'passage-aki-contrast-policy', 'For suspected massive pulmonary embolism, the policy says contrast CT should…', [
      { label: 'Proceed when senior risk-benefit documentation is made', correct: true },
      { label: 'Be cancelled whenever creatinine is above range', correct: false },
      { label: 'Wait until creatinine has been rechecked after 72 hours', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-28', 'Part B — Metformin and contrast', 'passage-aki-contrast-policy', 'Metformin should be withheld after contrast when…', [
      { label: 'There is AKI, eGFR below 30, or intra-arterial contrast', correct: true },
      { label: 'Any patient receives any iodinated contrast scan', correct: false },
      { label: 'The scan is for suspected pulmonary embolism only', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-29', 'Part C — Fluctuating capacity', 'passage-capacity-fluctuation', 'The guidance warns clinicians not to…', [
      { label: 'Treat one deferred decision as global incapacity', correct: true },
      { label: 'Use interpreters or hearing aids during assessment', correct: false },
      { label: 'Respect a capacitous refusal of treatment', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-30', 'Part C — Family role in consent', 'passage-capacity-fluctuation', 'According to the passage, family members…', [
      { label: 'Inform best-interests decisions but do not automatically decide', correct: true },
      { label: 'Can always override a confused patient immediately', correct: false },
      { label: 'Must be excluded unless the patient has capacity', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-31', 'Part B — Necrotising infection escalation', 'passage-nec-fasc-triage', 'If necrotising infection is suspected, MRI should…', [
      { label: 'Not delay surgical escalation and treatment', correct: true },
      { label: 'Be completed before any antibiotics are given', correct: false },
      { label: 'Replace surgical consultant review', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-32', 'Part C — LRINEC score interpretation', 'passage-nec-fasc-triage', 'The writer views laboratory scores as…', [
      { label: 'Supportive but unsafe for ruling out disease alone', correct: true },
      { label: 'More reliable than clinical red flags', correct: false },
      { label: 'Useful only after blistering has developed', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-33', 'Part C — Non-inferiority result', 'passage-noninferiority-statins', 'Why was non-inferiority met in the statin trial?', [
      { label: 'The upper confidence limit stayed below the prespecified margin', correct: true },
      { label: 'The combination group proved lower mortality', correct: false },
      { label: 'The trial was double-blind for symptoms and treatment', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-34', 'Part C — Trial limitation', 'passage-noninferiority-statins', 'The study cannot prove cardiovascular-event superiority because…', [
      { label: 'It was powered for LDL change rather than infarction or mortality', correct: true },
      { label: 'Allocation concealment was absent', correct: false },
      { label: 'No laboratory staff were blinded', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-35', 'Part B — Pharmacovigilance signal', 'passage-pharmacovigilance-signal', 'The bulletin defines a safety signal as…', [
      { label: 'A reason for further assessment, not proof of causation', correct: true },
      { label: 'Definitive evidence that the medicine must be withdrawn', correct: false },
      { label: 'A finding that only applies to patients with pancreatitis', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-36', 'Part B — GLP-1 illness advice', 'passage-pharmacovigilance-signal', 'During significant dehydration or acute illness, clinicians should consider…', [
      { label: 'Temporarily withholding the GLP-1 medicine', correct: true },
      { label: 'Continuing the previous dose automatically', correct: false },
      { label: 'Stopping GLP-1 therapy permanently in every patient', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-37', 'Part B — Infection-control update', 'passage-infection-control', 'When hands are visibly soiled, staff should use…', [
      { label: 'Soap and water', correct: true },
      { label: 'Gloves without hand hygiene', correct: false },
      { label: 'Alcohol rub only', correct: false },
    ]),
    difficulty: 'intermediate',
  },
  {
    ...readingMcq('read-38', 'Part C — Early discharge programme', 'passage-trial-abstract', 'Why should the results be interpreted cautiously?', [
      { label: 'The single-centre cohort may not generalise and selection bias is possible', correct: true },
      { label: 'No patients received the discharge checklist', correct: false },
      { label: 'Readmission was significantly higher in the intervention group', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-39', 'Part A — Stroke pathway target', 'passage-stroke-pathway', 'The CT brain target after arrival is within…', [
      { label: '20 minutes', correct: true },
      { label: '60 minutes', correct: false },
      { label: '4 hours', correct: false },
    ]),
    difficulty: 'intermediate',
  },
  {
    ...readingMcq('read-40', 'Part B — Surgical consent', 'passage-consent-form', 'For a major non-urgent procedure, the information sheet recommends…', [
      { label: 'A cooling-off period of at least 24 hours', correct: true },
      { label: 'Signing consent after sedation', correct: false },
      { label: 'A relative signing in place of the patient', correct: false },
    ]),
    difficulty: 'intermediate',
  },
  {
    ...readingMcq('read-41', 'Part C — Nurse staffing evidence', 'passage-nurse-staffing-abstract', 'Which outcome did not reach statistical significance after adjustment?', [
      { label: 'Mortality differences', correct: true },
      { label: 'Falls', correct: false },
      { label: 'Medication errors', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq('read-42', 'Part A — Anticoagulation clinic SOP', 'passage-anticoagulation-sop', 'Which medicine is contraindicated when eGFR is below 30 ml/min?', [
      { label: 'Dabigatran', correct: true },
      { label: 'Warfarin', correct: false },
      { label: 'Apixaban', correct: false },
    ]),
    difficulty: 'advanced',
  },
  {
    ...readingMcq(
      'read-43',
      'Part C — Silent model drift',
      'passage-model-drift-study',
      'What concern most strongly shapes the authors\' recommendation?',
      [
        {
          label: 'Apparently stable headline accuracy can conceal unsafe performance changes in important subgroups',
          correct: true,
          explanation:
            'The authors stress that unchanged aggregate discrimination concealed poorer sensitivity after the case mix and workflow changed.',
        },
        {
          label: 'Clinicians will inevitably ignore every alert once a system has been in use for a year',
          correct: false,
          explanation:
            'Alert acknowledgement declined, but the authors do not claim that all clinicians ignored every alert.',
        },
        {
          label: 'A locally developed model can never be recalibrated successfully',
          correct: false,
          explanation:
            'Recalibration improved calibration; the concern is that it did not prove transportability or restore every subgroup equally.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  {
    ...readingMcq(
      'read-44',
      'Part C — Composite endpoint interpretation',
      'passage-composite-endpoint-commentary',
      'How does the writer interpret the trial\'s positive primary result?',
      [
        {
          label: 'It is statistically valid but mainly driven by a softer outcome that may not justify the broadest claim',
          correct: true,
          explanation:
            'The composite met its statistical threshold, but unscheduled contacts dominated while admission and mortality were unchanged.',
        },
        {
          label: 'It proves that remote monitoring reduces mortality despite an underpowered sample',
          correct: false,
          explanation:
            'Mortality was unchanged, and the writer explicitly rejects that interpretation.',
        },
        {
          label: 'It should be disregarded because composite endpoints are always misleading',
          correct: false,
          explanation:
            'The writer accepts that composites can be useful when components are clinically coherent and reported transparently.',
        },
      ],
    ),
    difficulty: 'advanced',
  },
  advancedReadingMcq('read-45', 'Part B — Antibiotic review decision', 'passage-antibiotic-timeout-analysis', 'At the 48-hour review, negative cultures should lead the clinician to…', [
    { label: 'Reassess the clinical evidence and document why treatment is stopped, changed or continued', correct: true },
    { label: 'Complete the original broad-spectrum course automatically', correct: false },
    { label: 'Stop every antibiotic regardless of the patient’s condition', correct: false },
  ]),
  advancedReadingMcq('read-46', 'Part C — Response does not prove diagnosis', 'passage-antibiotic-timeout-analysis', 'Why does improvement after treatment not confirm the original bacterial diagnosis?', [
    { label: 'Other treatment and the passage of time may also explain the improvement', correct: true },
    { label: 'Antibiotics never affect symptoms within 48 hours', correct: false },
    { label: 'Culture results are always more important than clinical response', correct: false },
  ]),
  advancedReadingMcq('read-47', 'Part C — Stewardship audit design', 'passage-antibiotic-timeout-analysis', 'Which audit approach best reflects the writer’s recommendation?', [
    { label: 'Combine documented decisions, exposure, clinical outcomes and route changes', correct: true },
    { label: 'Reward the service with the highest antibiotic stop rate', correct: false },
    { label: 'Count only prescriptions with a positive culture', correct: false },
  ]),
  advancedReadingMcq('read-48', 'Part C — Spectrum effect', 'passage-screening-spectrum-bias', 'What principally explains the lower sensitivity in community clinics?', [
    { label: 'The tested population included milder and overlapping presentations', correct: true },
    { label: 'The laboratory secretly changed the assay threshold', correct: false },
    { label: 'Community clinicians used endoscopy more often', correct: false },
  ]),
  advancedReadingMcq('read-49', 'Part C — Verification bias', 'passage-screening-spectrum-bias', 'How could the community evaluation overestimate sensitivity?', [
    { label: 'Disease in test-negative patients may remain undiscovered when they do not receive the reference test', correct: true },
    { label: 'Every patient with a positive test received endoscopy', correct: false },
    { label: 'The referral cohort contained patients with severe disease', correct: false },
  ]),
  advancedReadingMcq('read-50', 'Part C — Threshold trade-off', 'passage-screening-spectrum-bias', 'What is the likely consequence of lowering the positivity threshold?', [
    { label: 'Higher sensitivity accompanied by more false-positive referrals', correct: true },
    { label: 'Higher specificity with fewer missed cases', correct: false },
    { label: 'Removal of spectrum and verification bias', correct: false },
  ]),
  advancedReadingMcq('read-51', 'Part B — Oxygen in critical illness', 'passage-oxygen-target-audit', 'If hypercapnic risk is unknown and the patient is critically ill, the policy advises clinicians to…', [
    { label: 'Give necessary high-concentration oxygen while immediate assessment proceeds', correct: true },
    { label: 'Withhold oxygen until an old blood gas is located', correct: false },
    { label: 'Use the 88–92% target for every patient with breathlessness', correct: false },
  ]),
  advancedReadingMcq('read-52', 'Part C — Reassuring saturation trap', 'passage-oxygen-target-audit', 'Why can a normal saturation on increasing oxygen be misleading?', [
    { label: 'Ventilation and carbon dioxide retention may worsen despite the displayed saturation', correct: true },
    { label: 'Pulse oximeters cannot measure oxygen after treatment starts', correct: false },
    { label: 'A normal saturation always means oxygen should be removed abruptly', correct: false },
  ]),
  advancedReadingMcq('read-53', 'Part C — Audit interpretation', 'passage-oxygen-target-audit', 'What did the apparently acceptable saturation result conceal?', [
    { label: 'Poor documentation of targets and inadequate repeat blood-gas monitoring', correct: true },
    { label: 'Excessive use of ventilatory support in all patients', correct: false },
    { label: 'A policy requiring one target range for every adult', correct: false },
  ]),
  advancedReadingMcq('read-54', 'Part A — Absolute treatment benefit', 'passage-shared-decision-risk', 'A fall in events from 2 in 100 to 1 in 100 represents an absolute reduction of…', [
    { label: '1 percentage point', correct: true },
    { label: '50 percentage points', correct: false },
    { label: '2 percentage points', correct: false },
  ]),
  advancedReadingMcq('read-55', 'Part C — Purpose of teach-back', 'passage-shared-decision-risk', 'How does the guidance frame teach-back?', [
    { label: 'A way to discover and correct weaknesses in the explanation', correct: true },
    { label: 'A test the patient must pass before choosing treatment', correct: false },
    { label: 'A replacement for discussing uncertainty', correct: false },
  ]),
  advancedReadingMcq('read-56', 'Part C — Shared decision standard', 'passage-shared-decision-risk', 'According to the writer, shared decision-making is achieved when…', [
    { label: 'An informed patient preference materially shapes the plan', correct: true },
    { label: 'The clinician records that risks were mentioned', correct: false },
    { label: 'Every patient selects the option with the greatest relative benefit', correct: false },
  ]),
  advancedReadingMcq('read-57', 'Part B — Near-miss reporting', 'passage-incident-learning-policy', 'Why should an event be reported when no harm occurred?', [
    { label: 'It can reveal a hazard before a patient is injured', correct: true },
    { label: 'It proves that the existing safety barriers worked as designed', correct: false },
    { label: 'It automatically requires disciplinary action', correct: false },
  ]),
  advancedReadingMcq('read-58', 'Part C — Fair accountability', 'passage-incident-learning-policy', 'What should primarily distinguish an ordinary error from conduct requiring a different response?', [
    { label: 'The behaviour and context rather than chance outcome severity', correct: true },
    { label: 'Whether the event generated a formal complaint', correct: false },
    { label: 'Whether the patient happened to be harmed', correct: false },
  ]),
  advancedReadingMcq('read-59', 'Part C — Strength of corrective action', 'passage-incident-learning-policy', 'When is a reminder to “take more care” most defensible?', [
    { label: 'When the investigation identifies a genuine knowledge gap', correct: true },
    { label: 'Whenever the review cannot redesign equipment immediately', correct: false },
    { label: 'When the organisation wants to close the report quickly', correct: false },
  ]),
  advancedReadingMcq('read-60', 'Part C — Null result versus equivalence', 'passage-noninferiority-interpretation', 'Why can a non-significant result from a superiority test not establish equivalence?', [
    { label: 'Its confidence interval may still include clinically important benefit and harm', correct: true },
    { label: 'Superiority trials cannot calculate confidence intervals', correct: false },
    { label: 'Equivalent treatments must produce identical outcomes in every patient', correct: false },
  ]),
  advancedReadingMcq('read-61', 'Part C — Competing analysis biases', 'passage-noninferiority-interpretation', 'Why does the writer favour agreement between intention-to-treat and per-protocol analyses?', [
    { label: 'Protocol dilution and loss of randomisation can bias the two analyses differently', correct: true },
    { label: 'Agreement allows investigators to choose a wider margin after seeing the data', correct: false },
    { label: 'Both analyses automatically remove bias caused by rescue treatment', correct: false },
  ]),
  advancedReadingMcq('read-62', 'Part C — Outcome-definition mismatch', 'passage-noninferiority-interpretation', 'What most weakens the claim that five days of treatment alone was sufficient?', [
    { label: 'Rescue antibiotics could be given while the initial course was still counted as successful', correct: true },
    { label: 'The participants were randomised only after they became clinically stable', correct: false },
    { label: 'The shorter course reduced treatment burden', correct: false },
  ]),
  advancedReadingMcq('read-63', 'Part C — Immortal-time mechanism', 'passage-immortal-time-bias', 'Why is the period before specialist review described as “immortal” for the exposed group?', [
    { label: 'A patient who died before review could never be classified into that group', correct: true },
    { label: 'Specialist review prevented every death during the first seven days', correct: false },
    { label: 'The investigators excluded all follow-up after consultation', correct: false },
  ]),
  advancedReadingMcq('read-64', 'Part C — Time-varying correction', 'passage-immortal-time-bias', 'What is the principal advantage of modelling review as a time-varying exposure?', [
    { label: 'Person-time is classified according to whether review had actually occurred', correct: true },
    { label: 'It guarantees removal of confounding by clinical deterioration', correct: false },
    { label: 'It permits length of stay to be treated as a baseline characteristic', correct: false },
  ]),
  advancedReadingMcq('read-65', 'Part C — Landmark analysis restraint', 'passage-immortal-time-bias', 'Why does the reviewer not regard the seven-day survivor analysis as causal confirmation?', [
    { label: 'It changes the population and leaves selection and unmeasured confounding unresolved', correct: true },
    { label: 'The direction of the association reversed completely', correct: false },
    { label: 'A landmark analysis must include patients who died before the landmark', correct: false },
  ]),
  advancedReadingMcq('read-66', 'Part A — Easily missed presentation', 'passage-delirium-part-a-set', 'Which text explains why a quiet, sleepy patient may still have delirium?', [
    { label: 'Text A', correct: true }, { label: 'Text B', correct: false }, { label: 'Text C', correct: false }, { label: 'Text D', correct: false },
  ]),
  advancedReadingMcq('read-67', 'Part A — Multiple precipitants', 'passage-delirium-part-a-set', 'Which text warns against accepting one convenient cause?', [
    { label: 'Text B', correct: true }, { label: 'Text A', correct: false }, { label: 'Text C', correct: false }, { label: 'Text D', correct: false },
  ]),
  advancedReadingMcq('read-68', 'Part A — Medicine is not routine', 'passage-delirium-part-a-set', 'Which text restricts medicine use to severe distress or immediate risk?', [
    { label: 'Text C', correct: true }, { label: 'Text A', correct: false }, { label: 'Text B', correct: false }, { label: 'Text D', correct: false },
  ]),
  advancedReadingMcq('read-69', 'Part A — Post-acute cognition', 'passage-delirium-part-a-set', 'Which text recommends delaying formal cognitive assessment until the acute episode settles?', [
    { label: 'Text D', correct: true }, { label: 'Text A', correct: false }, { label: 'Text B', correct: false }, { label: 'Text C', correct: false },
  ]),
  advancedReadingMcq('read-70', 'Part A short answer — Establishing baseline', 'passage-delirium-part-a-set', 'Information about the patient’s usual cognition should be obtained from…', [
    { label: 'someone who knows the patient', correct: true }, { label: 'a single screening score', correct: false }, { label: 'discharge documentation alone', correct: false },
  ]),
  advancedReadingMcq('read-71', 'Part A short answer — Examination beyond history', 'passage-delirium-part-a-set', 'Which two contributors should be examined for rather than excluded from history alone?', [
    { label: 'urinary retention and constipation', correct: true }, { label: 'hearing and vision loss', correct: false }, { label: 'head injury and meningism', correct: false },
  ]),
  advancedReadingMcq('read-72', 'Part A short answer — Familiar reassurance', 'passage-delirium-part-a-set', 'Relatives or carers may help by providing…', [
    { label: 'reassurance', correct: true }, { label: 'physical restraint', correct: false }, { label: 'routine sedatives', correct: false },
  ]),
  advancedReadingMcq('read-73', 'Part A short answer — Discharge record', 'passage-delirium-part-a-set', 'The discharge document should identify who will decide whether withheld medicines are…', [
    { label: 'restarted', correct: true }, { label: 'destroyed', correct: false }, { label: 'relabelled', correct: false },
  ]),
  advancedReadingMcq('read-74', 'Part A short answer — Rapid screening tool', 'passage-delirium-part-a-set', 'Which tool is named as supporting rapid delirium screening?', [
    { label: '4AT', correct: true }, { label: 'MoCA', correct: false }, { label: 'GCS', correct: false },
  ]),
  advancedReadingMcq('read-75', 'Part A short answer — Medicine review scope', 'passage-delirium-part-a-set', 'The medicine review should include prescribed drugs, recently stopped drugs and…', [
    { label: 'over-the-counter medicines', correct: true }, { label: 'only antimicrobial medicines', correct: false }, { label: 'future repeat prescriptions', correct: false },
  ]),
  advancedReadingMcq('read-76', 'Part A short answer — Potentially harmful intervention', 'passage-delirium-part-a-set', 'Which intervention may intensify distress and harm?', [
    { label: 'physical restraint', correct: true }, { label: 'familiar objects', correct: false }, { label: 'daylight exposure', correct: false },
  ]),
  advancedReadingMcq('read-77', 'Part A short answer — Diagnostic restraint', 'passage-delirium-part-a-set', 'Why should a low cognitive score during acute illness be interpreted cautiously?', [
    { label: 'It cannot by itself establish dementia', correct: true }, { label: 'It rules out hypoactive delirium', correct: false }, { label: 'It measures only functional status', correct: false },
  ]),
  advancedReadingMcq('read-78', 'Part A short answer — Immediate targeted assessment', 'passage-delirium-part-a-set', 'Which finding specifically requires immediate targeted assessment?', [
    { label: 'new focal neurology', correct: true }, { label: 'a familiar object at the bedside', correct: false }, { label: 'improving cognition at discharge', correct: false },
  ]),
  advancedReadingMcq('read-79', 'Part A short answer — Protecting sleep', 'passage-delirium-part-a-set', 'Sleep is listed with hydration, nutrition, mobility and…', [
    { label: 'orientation', correct: true }, { label: 'indiscriminate testing', correct: false }, { label: 'routine drug treatment', correct: false },
  ]),
  advancedReadingMcq('read-80', 'Part A short answer — Incomplete recovery', 'passage-delirium-part-a-set', 'When recovery remains incomplete, the guidance recommends…', [
    { label: 'early clinical review', correct: true }, { label: 'automatic dementia diagnosis', correct: false }, { label: 'restarting every withheld medicine', correct: false },
  ]),
  advancedReadingMcq('read-81', 'Part A short answer — Medicine effects', 'passage-delirium-part-a-set', 'Complete: Medicines with ___ or sedative effects require particular review.', [
    { label: 'anticholinergic', correct: true }, { label: 'antimicrobial', correct: false }, { label: 'anticoagulant', correct: false },
  ]),
  advancedReadingMcq('read-82', 'Part A short answer — Physiological emergency', 'passage-delirium-part-a-set', 'Which metabolic finding is named as requiring immediate targeted assessment?', [
    { label: 'hypoglycaemia', correct: true }, { label: 'hyperlipidaemia', correct: false }, { label: 'hyperuricaemia', correct: false },
  ]),
  advancedReadingMcq('read-83', 'Part A short answer — Sensory support', 'passage-delirium-part-a-set', 'Which two senses should supportive management protect?', [
    { label: 'hearing and vision', correct: true }, { label: 'taste and smell', correct: false }, { label: 'touch and balance', correct: false },
  ]),
  advancedReadingMcq('read-84', 'Part A short answer — First-line response', 'passage-delirium-part-a-set', 'What should come before medicine when a patient is distressed?', [
    { label: 'de-escalation and environmental measures', correct: true }, { label: 'physical restraint', correct: false }, { label: 'routine sedation', correct: false },
  ]),
  advancedReadingMcq('read-85', 'Part A short answer — Outstanding work', 'passage-delirium-part-a-set', 'Complete: Discharge documentation should state any unresolved ___.', [
    { label: 'investigation', correct: true }, { label: 'appointment', correct: false }, { label: 'prescription', correct: false },
  ]),
  advancedReadingMcq(
    'read-86',
    'Part C — Follow-up selection and detection',
    'passage-diagnostic-follow-up-selection',
    'What is the writer’s main reason for rejecting the claim that the calls caused fewer diagnostic errors?',
    [
      {
        label: 'Enrolment and diagnosis capture differed with clinical concern, access and intensity of follow-up',
        correct: true,
        explanation:
          'The commentary combines non-random enrolment with unequal opportunities to detect outcomes, so the observed difference cannot be attributed to the calls alone.',
      },
      {
        label: 'Telephone review cannot accelerate imaging or recover unresolved test results',
        correct: false,
        explanation:
          'The writer explicitly accepts that the service can accelerate reassessment and recover unresolved results.',
      },
      {
        label: 'Only a blinded trial can provide any useful evidence about a follow-up service',
        correct: false,
        explanation:
          'The evaluation is described as useful process and feasibility evidence despite not proving the causal claim.',
      },
    ],
  ),
  advancedReadingMcq(
    'read-87',
    'Part C — Aggregate improvement and subgroup reversal',
    'passage-aggregate-subgroup-reversal',
    'Why does the writer resist describing the pathway as preventing one admission for every 25 patients?',
    [
      {
        label: 'The combined rate largely changed with the proportion of low-risk referrals, while comparable risk groups showed little improvement',
        correct: true,
        explanation:
          'The crude calculation uses populations with different baseline-risk distributions and therefore cannot be interpreted directly as a pathway effect.',
      },
      {
        label: 'The arithmetic is wrong because a four-percentage-point fall can never equal one event in 25',
        correct: false,
        explanation:
          'The writer explicitly accepts the arithmetic but rejects the causal interpretation of incomparable denominators.',
      },
      {
        label: 'Any analysis containing more than one risk stratum is too unstable to inform service evaluation',
        correct: false,
        explanation:
          'The passage supports prespecified, clinically meaningful strata while warning against unstable or selectively chosen subdivisions.',
      },
    ],
  ),
  advancedReadingMcq(
    'read-88',
    'Part C — Death as a competing dialysis risk',
    'passage-competing-risk-dialysis',
    'Why does the writer object to treating death before dialysis as ordinary censoring?',
    [
      {
        label: 'Death prevents future dialysis and may differ by treatment group, so fewer dialysis events need not represent preserved kidney function alone',
        correct: true,
        explanation:
          'The passage treats death as a competing event that changes the probability of observing dialysis and may contribute to the apparent treatment difference.',
      },
      {
        label: 'A participant who dies should automatically be counted as having started dialysis on that date',
        correct: false,
        explanation:
          'The writer recommends analysing death as a competing outcome, not relabelling it as dialysis.',
      },
      {
        label: 'Conventional survival analysis is invalid whenever any participant leaves a study early',
        correct: false,
        explanation:
          'The passage accepts censoring when loss to follow-up is compatible with its assumptions; death is different because dialysis becomes impossible.',
      },
    ],
  ),
  advancedReadingMcq(
    'read-89',
    'Part C — Extreme baseline and apparent improvement',
    'passage-regression-to-mean-audit',
    'What principally weakens the claim that coaching caused the 24% reduction in falls?',
    [
      {
        label: 'The wards were chosen at an unusually high measurement that was likely to fall partly through chance fluctuation',
        correct: true,
        explanation:
          'Selection on an extreme recent value makes a less extreme follow-up likely even without an intervention, so the simple before-and-after contrast overstates causal evidence.',
      },
      {
        label: 'The fall records were too inaccurate to establish whether the outcome changed at all',
        correct: false,
        explanation:
          'The passage says regression to the mean remains even when all falls were recorded accurately.',
      },
      {
        label: 'Coaching could only be evaluated by comparing the highest-rate wards with the lowest-rate wards',
        correct: false,
        explanation:
          'The writer explicitly says comparing high and low outliers would exaggerate the problem.',
      },
    ],
  ),
  advancedReadingMcq(
    'read-90',
    'Part C — Informative missingness after treatment withdrawal',
    'passage-informative-missingness',
    'Why does the writer say the complete-case improvement may not apply to everyone who began treatment?',
    [
      {
        label: 'Withdrawal was often related to adverse effects or lack of benefit, selecting more tolerant and engaged participants for the final comparison',
        correct: true,
        explanation:
          'Outcome-related withdrawal means the completers can differ systematically from those whose final fatigue score is missing.',
      },
      {
        label: 'Any missing questionnaire makes all observed measurements unusable regardless of the reason for absence',
        correct: false,
        explanation:
          'The writer says missing data are not automatically bias and that the reason and relationship to the unobserved value matter.',
      },
      {
        label: 'Carrying the last recorded fatigue score forward is guaranteed to underestimate treatment benefit',
        correct: false,
        explanation:
          'The passage says this method is not automatically conservative because symptoms can improve, worsen or fluctuate.',
      },
    ],
  ),
  advancedReadingMcq(
    'read-91',
    'Part C — Treatment switching and the target estimand',
    'passage-treatment-switching-estimand',
    'Why does the writer say the as-treated association cannot establish that the new medicine was protective?',
    [
      {
        label: 'Prognostic changes influenced switching, so later risk was redistributed and those who continued became a selected group',
        correct: true,
        explanation:
          'Early renal deterioration influenced both treatment switching and later outcomes, breaking the randomised comparison in the as-treated groups.',
      },
      {
        label: 'An intention-to-treat estimate is always the biological effect of uninterrupted treatment',
        correct: false,
        explanation:
          'The passage distinguishes a treatment-policy effect from the effect of sustained exposure and says extensive crossover can dilute the latter.',
      },
      {
        label: 'Rescue treatment should have been withheld so that the trial could preserve statistical purity',
        correct: false,
        explanation:
          'The writer treats rescue as potentially necessary clinical care and argues for analyses matched to explicit questions, not withholding it.',
      },
    ],
  ),
];

export const writingTasks: SessionTask[] = [
  writing(
    'write-1',
    'Referral — Diabetes (hypoglycemia)',
    'Pt: Mrs Emily Watson, 62y\nT2DM, recurrent hypoglycemia episodes\nHbA1c 8.9%, on gliclazide\nLives alone\nRefer endocrinology review',
    'Dear Dr Smith,\n\nI am writing to refer Mrs Emily Watson, aged 62, for specialist review of poorly controlled type 2 diabetes mellitus with recurrent hypoglycemic episodes...',
    'Referral',
  ),
  writing(
    'write-2',
    'Discharge — COPD / pneumonia',
    'Pt: Mrs Linda Thompson, 72y\nAdmitted: community-acquired pneumonia\nHx: COPD, salbutamol PRN\nRx: amoxicillin, O2 therapy\nDischarge to community nursing',
    'Dear Community Nurse,\n\nMrs Linda Thompson, aged 72, was admitted for community-acquired pneumonia and is now ready for discharge into your care...',
    'Discharge',
  ),
  writing(
    'write-3',
    'Transfer — Mr Dunbar (official pattern)',
    'Pt: Mr Peter Dunbar, 86y\nT2DM, neuropathy, AF on warfarin\nNon-compliant diet/meds, ETOH excess\nMoving to daughter in Centreville\nRefer community nurse monitoring',
    'Dear Community Health Nurse,\n\nThank you for accepting Mr Peter Dunbar into your care for ongoing monitoring of his diabetes and support with medication compliance...',
    'Transfer / referral to community',
  ),
  writing(
    'write-4',
    'Urgent referral — Pericarditis',
    'Pt: Ms Georgine Ponsford, 45y\nHx pericarditis, relapse suspected\nChest pain, friction rub\nRefer ED consultant urgent assessment',
    'Dear Emergency Department Consultant,\n\nI am writing to refer Ms Georgine Ponsford for urgent assessment due to suspected relapse of pericarditis...',
    'Urgent referral',
  ),
  writing(
    'write-5',
    'Discharge — Retirement home (pneumonia)',
    'Pt: Mr Lionel Ramamurthy\nAdmitted 04/02 pneumonia\nImproving, ambulating\nDischarge to retirement home nurse Ms Ponsford',
    'Dear Ms Ponsford,\n\nI am writing regarding Mr Lionel Ramamurthy, who was admitted for pneumonia and is being discharged back into your care tomorrow...',
    'Discharge',
  ),
  writing(
    'write-6',
    'Referral — Fractured wrist (community)',
    'Pt: Mrs Helen Brown, 68y\nFractured wrist post-fall\nPlaster applied, analgesia\nRefer community care for monitoring',
    'Dear Community Care Coordinator,\n\nI am writing to refer Mrs Helen Brown following her recent admission for management of a fractured wrist...',
    'Referral',
  ),
  writing(
    'write-7',
    'Pharmacy — Warfarin + antibiotic',
    'Pt: Mrs L Chen on warfarin\nPrescribed clarithromycin\nRisk elevated INR / bleeding\nNotify GP',
    'Dear Dr Ahmed,\n\nI am writing regarding Mrs Linda Chen, who collected a prescription for clarithromycin today while taking warfarin...',
    'Pharmacy GP notification',
  ),
  writing(
    'write-8',
    'Referral — Cardiology chest pain',
    'Pt: Mr James Cole, 55y\nCentral chest pain, ECG changes\nRisk factors: HTN, smoking\nUrgent cardiology referral',
    'Dear Dr Patel,\n\nI am writing to refer Mr James Cole, aged 55, for urgent cardiology assessment following presentation with chest pain and abnormal ECG findings...',
    'Urgent referral',
  ),
  writing(
    'write-9',
    'Transfer — Aged care (mobility/cognition)',
    'Pt: Mrs A Singh, 84y\nIncreased confusion, falls\nNeeds residential care\nMedication list attached',
    'Dear Residential Aged Care Manager,\n\nI am writing to arrange transfer of Mrs Amrit Singh, aged 84, who requires residential care due to cognitive decline and recurrent falls...',
    'Transfer',
  ),
  writing(
    'write-10',
    'Referral — Gastroenterology',
    'Pt: Mr Ali Khan, 47y\nChronic abdominal pain, weight loss\nNormal ultrasound, persistent symptoms\nGP referral for GI review',
    'Dear Dr Lewis,\n\nI am writing to refer Mr Ali Khan, aged 47, for specialist assessment of chronic abdominal pain associated with unintentional weight loss...',
    'Referral',
  ),
  writing(
    'write-11',
    'Discharge — CHF exacerbation',
    'Pt: Michael O pattern — CHF admission\nDiuresis response, weight down\nMed changes: increase ramipril\nCommunity HF nurse follow-up',
    'Dear Dr Williams,\n\nMr Michael O\'Brien was admitted with acute decompensated heart failure and is now stable for discharge...',
    'Discharge',
  ),
  writing(
    'write-12',
    'Discharge — Mental health community',
    'Pt: Young adult anxiety/depression\nRisk plan in place\nFollow-up community mental health\nMeds: SSRI started',
    'Dear Community Mental Health Team,\n\nI am discharging Ms Sarah Nguyen into your care following inpatient stabilisation of acute anxiety and depressive symptoms...',
    'Discharge',
  ),
  writing(
    'write-13',
    'Urgent referral — Suspected malignancy (2-week wait)',
    'Pt: Mr David Foster, 58y\nPersistent rectal bleeding 6wk, weight loss 5kg\nFHx bowel cancer (father)\nRefer colorectal — 2-week-wait pathway',
    'Dear Colorectal Surgeon,\n\nI am writing to refer Mr David Foster, aged 58, under the two-week-wait pathway for suspected colorectal malignancy...',
    'Urgent referral',
  ),
  writing(
    'write-14',
    'Discharge — Post-MI cardiac rehabilitation',
    'Pt: Mr Andreas Papadopoulos, 61y\nAdmitted STEMI, PCI to LAD\nStarted dual antiplatelet, statin, bisoprolol\nRefer cardiac rehab programme',
    'Dear Cardiac Rehabilitation Coordinator,\n\nMr Andreas Papadopoulos was admitted with an acute ST-elevation myocardial infarction, treated with primary percutaneous coronary intervention, and is now ready for discharge...',
    'Discharge',
  ),
  writing(
    'write-15',
    'Transfer — Renal dialysis coordination',
    'Pt: Mrs Fatima Al-Sayed, 70y\nESRD, haemodialysis 3x/week\nRelocating to daughter in new city\nTransfer dialysis unit care',
    'Dear Renal Unit Consultant,\n\nI am writing to arrange transfer of ongoing haemodialysis care for Mrs Fatima Al-Sayed, aged 70, who is relocating to be closer to family...',
    'Transfer',
  ),
  writing(
    'write-16',
    'Urgent referral — Suspected sepsis, GP to ED',
    'Pt: Mr Tomasz Nowak, 74y\nFever 39.2, confusion, hypotensive 88/54\nUTI symptoms 2 days\nUrgent ED referral, query sepsis',
    'Dear Emergency Department Team,\n\nI am writing to refer Mr Tomasz Nowak, aged 74, for urgent assessment of suspected sepsis secondary to a probable urinary tract infection...',
    'Urgent referral',
  ),
  writing(
    'write-17',
    'Advice — Travel vaccination and malaria prophylaxis',
    'Pt: Ms Beatrice Adeyemi, 34y\nTravelling to rural Uganda 4 weeks\nNo prior travel vaccines\nAdvise yellow fever, typhoid, malaria prophylaxis',
    'Dear Ms Adeyemi,\n\nThank you for attending your travel health consultation. This letter summarises the vaccinations and malaria prevention we discussed ahead of your trip to Uganda...',
    'Advice',
  ),
  writing(
    'write-18',
    'Discharge — Post-operative wound infection',
    'Pt: Mrs Carla Espinoza, 55y\nDay 6 post-cholecystectomy, wound cellulitis\nStarted oral flucloxacillin, daily dressing\nDischarge to community nurse for wound review',
    'Dear Community Nurse,\n\nMrs Carla Espinoza was admitted six days ago for laparoscopic cholecystectomy and developed a superficial wound infection, now improving on oral antibiotics...',
    'Discharge',
  ),
  writing(
    'write-19',
    'Referral — Postnatal depression to psychiatry',
    'Pt: Ms Olivia Bennett, 29y\n6wk postpartum, low mood, poor bonding, no self-harm\nEPDS score 19\nRefer perinatal mental health team',
    'Dear Perinatal Mental Health Team,\n\nI am writing to refer Ms Olivia Bennett, aged 29, who is six weeks postpartum and presenting with symptoms consistent with postnatal depression...',
    'Referral',
  ),
  writing(
    'write-20',
    'Referral — Palliative/hospice care',
    'Pt: Mr Harold Jennings, 79y\nMetastatic pancreatic cancer, no further active treatment\nPain managed on opioid titration\nRefer hospice for end-of-life care coordination',
    'Dear Hospice Medical Director,\n\nI am writing to refer Mr Harold Jennings, aged 79, who has metastatic pancreatic cancer and has elected to focus on comfort-oriented, end-of-life care...',
    'Referral',
  ),
  writing(
    'write-21',
    'Referral — Paediatric asthma exacerbation',
    'Pt: Master Liam Carter, 8y\nThird ED presentation this year, poor inhaler technique\nOn salbutamol + low-dose ICS\nRefer paediatric respiratory specialist',
    'Dear Paediatric Respiratory Specialist,\n\nI am writing to refer Liam Carter, aged 8, who has had recurrent asthma exacerbations despite current inhaled therapy...',
    'Referral',
  ),
  writing(
    'write-22',
    'Advice — Medication non-adherence, elderly polypharmacy',
    'Pt: Mrs Doris Whitfield, 81y\nOn 9 medications, admits skipping doses\nConfused by multiple dosing times\nAdvise GP of need for medication review',
    'Dear Dr Coleman,\n\nI am writing to advise you of ongoing medication non-adherence in Mrs Doris Whitfield, aged 81, who is currently prescribed nine regular medications...',
    'Advice / GP notification',
  ),
  {
    ...writing(
      'write-23',
      'Urgent referral — Suspected necrotising fasciitis',
      'Pt: Mr Hadi Mansour, 49y\nSevere calf pain out of proportion, rapidly spreading erythema\nTemp 39.4, HR 128, BP 92/58\nDiabetes, minor shin cut 2 days ago\nBlood cultures taken, IV piperacillin-tazobactam started\nUrgent surgical review required; do not delay for imaging',
      'Dear Surgical Registrar,\n\nI am writing to refer Mr Hadi Mansour urgently with suspected necrotising fasciitis requiring immediate surgical assessment...',
      'Emergency surgical referral',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-24',
      'Discharge — AKI after contrast CT',
      'Pt: Mrs Judith Parker, 76y\nAdmitted: PE ruled out by CTPA\nDeveloped contrast-associated AKI, creatinine now improving\nMetformin withheld, restart after GP renal function check\nAvoid NSAIDs; repeat U&E in 48h\nDischarge to GP follow-up',
      'Dear Dr Verma,\n\nMrs Judith Parker is being discharged following investigation for suspected pulmonary embolism complicated by acute kidney injury after contrast imaging...',
      'Discharge to GP',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-25',
      'Referral — Postmenopausal bleeding pathway',
      'Pt: Mrs Elena Rossi, 64y\n2 episodes postmenopausal bleeding, no HRT\nBMI 34, T2DM, nulliparous\nPelvic exam normal, Hb stable\nRequest urgent gynaecology assessment and transvaginal ultrasound',
      'Dear Gynaecology Team,\n\nI am writing to refer Mrs Elena Rossi under the urgent postmenopausal bleeding pathway for further assessment...',
      'Urgent gynaecology referral',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-26',
      'Transfer — Stroke dysphagia to rehab unit',
      'Pt: Mr Samuel Grant, 69y\nLeft MCA stroke, improving right-sided weakness\nVideo swallow: silent aspiration thin fluids\nCurrent plan: pureed diet, thickened fluids, supervised meals\nTransfer to inpatient rehabilitation; speech pathology follow-up essential',
      'Dear Rehabilitation Nurse Coordinator,\n\nI am writing to transfer Mr Samuel Grant to your rehabilitation unit following a left middle cerebral artery stroke complicated by dysphagia...',
      'Transfer to rehabilitation',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-27',
      'Referral — BRCA1 counselling and cascade testing',
      'Pt: Ms Amara Blake, 38y\nMother ovarian cancer age 47; sister breast cancer age 41\nGenetic result: pathogenic BRCA1 variant\nAnxious about prophylactic surgery and child testing\nRefer genetics clinic for counselling and family cascade testing',
      'Dear Clinical Genetics Consultant,\n\nI am writing to refer Ms Amara Blake after identification of a pathogenic BRCA1 variant requiring specialist counselling...',
      'Genetics referral',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-28',
      'GP update — Tacrolimus nephrotoxicity',
      'Pt: Mr Victor Chen, 54y renal transplant recipient\nTacrolimus trough high, creatinine doubled\nDose reduced by transplant team; repeat level/U&E in 48h\nAvoid macrolides/NSAIDs; report reduced urine output urgently',
      'Dear Dr Hassan,\n\nI am writing to update you regarding Mr Victor Chen, a renal transplant recipient whose tacrolimus dose has been reduced due to suspected nephrotoxicity...',
      'Specialist update to GP',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-29',
      'Advice — GLP-1 adverse symptoms safety net',
      'Pt: Mrs Priya Nair, 52y T2DM/obesity\nStarted semaglutide 6 weeks ago, dose increased last week\nPersistent vomiting, poor oral intake, mild dehydration\nMedication withheld; check ketones/renal function\nWrite patient advice letter with red flags and follow-up',
      'Dear Mrs Nair,\n\nThank you for attending today regarding persistent vomiting after your recent semaglutide dose increase...',
      'Patient advice letter',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-30',
      'Referral — Silent aspiration after pneumonia',
      'Pt: Ms Nora Ellis, 82y\nRecurrent aspiration pneumonia, wet voice after fluids\nWeight loss 4kg, frail, lives alone\nRequest community speech pathology and dietitian review\nInterim: thickened fluids, supervised meals, medication crushing review',
      'Dear Community Speech Pathology Team,\n\nI am referring Ms Nora Ellis for urgent swallowing assessment following recurrent aspiration pneumonia and suspected ongoing dysphagia...',
      'Community allied-health referral',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-31',
      'Emergency referral — Ectopic pregnancy',
      'Pt: Ms Chloe Martin, 31y\n6 weeks pregnant by dates, severe right iliac fossa pain\nPositive pregnancy test, shoulder-tip pain, BP 94/60\nUltrasound: right tubal ectopic with free pelvic fluid\nIV access secured; urgent gynaecology transfer',
      'Dear Gynaecology Registrar,\n\nI am writing to refer Ms Chloe Martin urgently with a confirmed right tubal ectopic pregnancy and signs of haemodynamic compromise...',
      'Emergency gynaecology referral',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-32',
      'Referral — Suspected giant cell arteritis',
      'Pt: Mr Bernard Wu, 73y\nNew temporal headache, jaw claudication, blurred vision\nESR 88, tender temporal artery\nPrednisolone 60 mg started today\nUrgent ophthalmology/rheumatology review requested',
      'Dear Ophthalmology Registrar,\n\nI am writing to refer Mr Bernard Wu urgently with suspected giant cell arteritis and visual symptoms requiring same-day specialist assessment...',
      'Urgent specialist referral',
    ),
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-33',
      'Urgent referral — Probable culture-negative endocarditis',
      '21 Aug 2026 — Pt: Mr Elias Haddad, 57y, accountant\n3 weeks intermittent fever, fatigue, 4-kg weight loss\nNew early diastolic murmur; splinter haemorrhages\nCRP 126 mg/L; Hb 104 g/L; renal function normal\nThree blood-culture sets taken before IV therapy: no growth to date\nCompleted amoxicillin for presumed sinusitis last week\nTTE today: 11-mm aortic-valve vegetation, new moderate aortic regurgitation\nHaemodynamically stable; no focal neurology\nMicrobiology advised IV vancomycin + ceftriaxone — commenced today\nDental extraction 6 weeks ago\nPMH: hypertension controlled with ramipril; tennis elbow in 2024\nNo known drug allergies; non-smoker; plays chess weekly\nRequest same-day cardiology review, TOE, antimicrobial plan and early surgical opinion',
      'Dear Dr Patel,\n\nI am writing to request urgent cardiology review for Mr Elias Haddad, aged 57, who has probable culture-negative infective endocarditis with new moderate aortic regurgitation.',
      'Urgent cardiology referral',
    ),
    modelAnswer: `Dear Dr Patel,

I am writing to request urgent cardiology review for Mr Elias Haddad, aged 57, who has probable culture-negative infective endocarditis with new moderate aortic regurgitation.

He presented on 21 August after three weeks of intermittent fever, fatigue and a 4-kg weight loss. Examination revealed a new early diastolic murmur and splinter haemorrhages. His CRP was 126 mg/L and haemoglobin 104 g/L. Three blood-culture sets obtained before intravenous treatment show no growth to date; however, he completed five days of amoxicillin for presumed sinusitis last week. Transthoracic echocardiography today demonstrated an 11-mm aortic-valve vegetation with moderate regurgitation. He remains haemodynamically stable without focal neurological signs.

Following microbiology advice, intravenous vancomycin and ceftriaxone were commenced today. Renal function is normal. His history includes well-controlled hypertension treated with ramipril, and he has no known drug allergies. A dental extraction six weeks ago may be relevant.

Please assess him today for transoesophageal echocardiography, ongoing antimicrobial management and early surgical opinion, particularly given the vegetation size and valve dysfunction. Mr Haddad and his wife understand the concern and need for inpatient investigation. Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-34',
      'Emergency transfer — Suspected thrombotic thrombocytopenic purpura',
      '23 Aug 2026 — Pt: Ms Linh Tran, 42y, teacher\n2 days headache, fatigue, bruising; transient confusion this morning\nTemp 38.1°C, HR 104, BP 146/88; petechiae, no focal neurology now\nHb 78 g/L, platelets 18 × 10^9/L, reticulocytes raised\nBlood film: schistocytes; LDH 1,240 U/L; bilirubin raised; haptoglobin low\nCreatinine 156 µmol/L (baseline 72); coagulation screen normal\nPregnancy test negative; blood cultures pending\nRecent diarrhoeal illness; no new prescribed medicines\nPMH: mild eczema; ankle sprain 2023\nNo known drug allergies; weekend hiking planned\nDiscussed with haematology: urgent transfer for ADAMTS13 sample and plasma exchange; do not await result',
      'Dear Haematology Registrar,\n\nI am writing to arrange immediate transfer of Ms Linh Tran, aged 42, with suspected thrombotic thrombocytopenic purpura requiring urgent specialist treatment.',
      'Emergency haematology transfer',
    ),
    modelAnswer: `Dear Haematology Registrar,

I am writing to arrange immediate transfer of Ms Linh Tran, aged 42, with suspected thrombotic thrombocytopenic purpura requiring urgent specialist treatment.

She presented today following two days of headache, fatigue and spontaneous bruising, with transient confusion this morning. Her temperature is 38.1°C, pulse 104 and blood pressure 146/88 mmHg. Petechiae are present, although she currently has no focal neurological deficit.

Investigations demonstrate haemoglobin 78 g/L, platelets 18 × 10^9/L, reticulocytosis, schistocytes, LDH 1,240 U/L, raised bilirubin and low haptoglobin. Creatinine is 156 µmol/L compared with a baseline of 72; the coagulation screen is normal. Her pregnancy test is negative and blood cultures are pending. She reports a recent diarrhoeal illness but no new prescribed medicines.

Following our discussion, an ADAMTS13 sample will be obtained before transfer without delaying treatment. Please assess her immediately for plasma exchange, corticosteroid therapy and further management. She is being closely observed for recurrent neurological symptoms, bleeding and clinical deterioration. Ms Tran has been informed that this is a serious suspected blood disorder requiring emergency inpatient care.

Please contact me if you require any further information.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-35',
      'Discharge — Euglycaemic ketoacidosis after SGLT2 inhibitor',
      '23 Aug 2026 — Pt: Mr Daniel Mensah, 51y\nAdmitted with nausea, abdominal pain, tachypnoea after 2 days poor intake\nT2DM; taking empagliflozin and metformin\nGlucose 9.8 mmol/L, ketones 5.6 mmol/L, pH 7.18, bicarbonate 12\nDiagnosed euglycaemic DKA; treated with IV insulin, dextrose and fluids\nTrigger: viral gastroenteritis; cultures negative\nNow eating, ketones 0.3, pH normal, renal function recovered\nEmpagliflozin stopped pending diabetes review; metformin restarted\nEducated on sick-day rules, ketone testing and urgent red flags\nFollow-up: GP in 48–72h; diabetes clinic in 2 weeks\nPMH: seasonal rhinitis; dental check due next month\nWrite discharge letter requesting medication review and reinforcement of sick-day plan',
      'Dear Dr Okoro,\n\nMr Daniel Mensah is being discharged after successful treatment of euglycaemic diabetic ketoacidosis associated with empagliflozin during an acute gastrointestinal illness.',
      'Discharge to GP',
    ),
    modelAnswer: `Dear Dr Okoro,

Mr Daniel Mensah is being discharged after successful treatment of euglycaemic diabetic ketoacidosis associated with empagliflozin during an acute gastrointestinal illness.

He presented with two days of poor intake, nausea, abdominal pain and tachypnoea. Although his glucose was only 9.8 mmol/L, ketones were 5.6 mmol/L, pH 7.18 and bicarbonate 12 mmol/L. He was treated with intravenous insulin, dextrose and fluids. Viral gastroenteritis was considered the precipitant, and cultures remained negative.

Mr Mensah is now eating normally. Ketones have fallen to 0.3 mmol/L, acidosis has resolved and renal function has recovered. Empagliflozin has been discontinued pending specialist review, while metformin has been restarted. He has received written sick-day guidance, including maintaining fluids and carbohydrate intake, checking ketones during illness and withholding relevant medicines as instructed.

Please review him within 48–72 hours, reassess his glucose-lowering regimen and reinforce the sick-day plan. Diabetes clinic follow-up is arranged in two weeks. He should seek urgent care for recurrent vomiting, abdominal pain, rapid breathing, drowsiness or raised ketones, even if his glucose is not markedly elevated.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-36',
      'Emergency transfer — Lithium toxicity with acute kidney injury',
      '23 Aug 2026 — Pt: Mrs Helen Ward, 63y\nBipolar disorder stable 8 years on lithium carbonate 800 mg nocte\n4 days diarrhoea/vomiting after family gastroenteritis; poor intake\nToday: increasing confusion, coarse tremor, unsteady gait\nTemp 36.7°C, HR 96, BP 102/64, dry mucosa; GCS 14; no focal deficit\nLithium 2.1 mmol/L; creatinine 196 µmol/L (baseline 78); Na 149 mmol/L; K 4.2\nECG sinus rhythm, QTc 472 ms\nLithium withheld; IV 0.9% saline commenced; cardiac monitoring\nStarted ibuprofen for back pain 10 days ago; takes ramipril for hypertension\nDiscussed with renal/toxicology teams: urgent transfer for serial levels and dialysis assessment\nPMH: eczema; cataract surgery 2022\nNo known drug allergies; volunteers at library\nWrite an emergency transfer letter prioritising toxicity, contributors, treatment and requested action',
      'Dear Renal Registrar,\n\nI am arranging emergency transfer of Mrs Helen Ward, aged 63, with symptomatic lithium toxicity and acute kidney injury requiring urgent assessment for extracorporeal treatment.',
      'Emergency renal transfer',
    ),
    modelAnswer: `Dear Renal Registrar,

I am arranging emergency transfer of Mrs Helen Ward, aged 63, with symptomatic lithium toxicity and acute kidney injury requiring urgent assessment for extracorporeal treatment.

Mrs Ward has taken lithium carbonate 800 mg nightly for bipolar disorder, which has been stable for eight years. After four days of diarrhoea, vomiting and poor intake, she developed confusion, coarse tremor and gait instability. She is dehydrated, with a pulse of 96, blood pressure 102/64 mmHg and GCS 14, without focal deficits.

Her lithium concentration is 2.1 mmol/L and creatinine 196 µmol/L, compared with a baseline of 78. Sodium is 149 mmol/L and potassium 4.2 mmol/L. ECG shows sinus rhythm with a QTc of 472 ms. Recent ibuprofen use and regular ramipril may have contributed to lithium accumulation during volume depletion.

Lithium has been withheld, intravenous 0.9% saline commenced and cardiac monitoring established. Following discussion with your team and toxicology, please assess her immediately for serial lithium and renal measurements, neurological monitoring and the need for dialysis. She requires careful fluid management and review of interacting medicines. Her family has been informed of the urgent transfer.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-37',
      'Emergency transfer — Suspected serotonin toxicity',
      '23 Aug 2026 — Pt: Mr Adam Cole, 38y\nDepression: sertraline increased to 200 mg daily 3 weeks ago\nMigraine: used sumatriptan this morning\nTramadol commenced 3 days ago after dental extraction\nSince last night: agitation, sweating, diarrhoea, tremor\nTemp 38.7°C, HR 124, BP 168/94, RR 24, SpO2 98% RA\nGCS 14; inducible ankle clonus, lower-limb hyperreflexia; no lead-pipe rigidity\nCK 612 U/L; creatinine 105 µmol/L; glucose normal\nECG sinus tachycardia, QTc 458 ms\nAll serotonergic medicines withheld; IV crystalloid and diazepam given\nContinuous temperature/cardiac monitoring commenced\nToxicology recommends urgent acute-medical transfer and serial CK/renal tests\nPMH: hay fever; plays football weekly\nNo known drug allergies\nWrite an emergency transfer letter prioritising the suspected syndrome, interacting medicines, examination, immediate treatment and requested care',
      'Dear Acute Medical Registrar,\n\nI am arranging immediate transfer of Mr Adam Cole, aged 38, with suspected serotonin toxicity following exposure to multiple serotonergic medicines.',
      'Emergency acute-medical transfer',
    ),
    modelAnswer: `Dear Acute Medical Registrar,

I am arranging immediate transfer of Mr Adam Cole, aged 38, with suspected serotonin toxicity following exposure to multiple serotonergic medicines.

His sertraline was increased to 200 mg daily three weeks ago. Tramadol was commenced after dental extraction three days ago, and he used sumatriptan this morning. Since last night, he has developed agitation, diaphoresis, diarrhoea and tremor.

Currently, his temperature is 38.7°C, pulse 124, blood pressure 168/94 mmHg and respiratory rate 24. He is mildly confused, with GCS 14, inducible ankle clonus and lower-limb hyperreflexia. There is no lead-pipe rigidity. Creatine kinase is 612 U/L and creatinine 105 µmol/L. ECG demonstrates sinus tachycardia with a QTc of 458 ms.

All serotonergic agents have been withheld. Intravenous crystalloid and diazepam have been administered, and continuous cardiac and temperature monitoring has commenced. Following toxicology advice, please assess him urgently for ongoing supportive care, serial neurological observations, temperature control and repeat creatine kinase and renal measurements. Please also review his longer-term antidepressant, analgesic and migraine therapy before discharge.

Mr Cole’s family has been informed of the transfer. Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-38',
      'Discharge — Delirium recovery with cognitive follow-up',
      '23 Aug 2026 — Pt: Mrs Leila Rahman, 75y\nAdmitted 5 days ago: acute confusion, visual hallucinations, inattention\nContributors: E. coli UTI plus urinary retention\nTreated with antibiotics; retention resolved after temporary catheter\nOxybutynin and over-the-counter diphenhydramine stopped\nNow afebrile, eating, independently mobile; attention improved but not usual baseline\nNo previous dementia diagnosis\nDaughter reports mild forgetfulness for 3 months before admission; normally independent with medicines/finances\nMoCA deferred until delirium resolved\nDischarge: daughter staying for first week; medicines organised; falls advice given\nGP review within 72h; repeat cognition in 4–6 weeks; consider memory clinic if deficits persist\nReturn urgently for recurrent marked confusion, fever, inability to pass urine or reduced intake\nPMH: cataract surgery 2021; enjoys gardening\nWrite a GP discharge letter distinguishing current recovery from unresolved longer-term cognition and requesting follow-up',
      'Dear Dr Malik,\n\nI am writing to update you regarding Mrs Leila Rahman, aged 75, who is being discharged following treatment of delirium precipitated by a urinary tract infection and urinary retention.',
      'Discharge to GP',
    ),
    modelAnswer: `Dear Dr Malik,

I am writing to update you regarding Mrs Leila Rahman, aged 75, who is being discharged following treatment of delirium precipitated by an E. coli urinary tract infection and urinary retention.

She presented five days ago with acute confusion, visual hallucinations and inattention. The infection was treated with antibiotics, and retention resolved after temporary catheterisation. Oxybutynin and over-the-counter diphenhydramine were stopped because of their potential contribution.

Mrs Rahman is now afebrile, eating and independently mobile. Her attention has improved, although cognition has not returned fully to her usual baseline. She has no previous dementia diagnosis. Her daughter reports mild forgetfulness during the three months before admission, but Mrs Rahman had remained independent with medicines and finances. Cognitive screening was therefore deferred until the delirium has resolved.

Please review her within 72 hours, including hydration, urinary symptoms and the revised medication list. Reassess cognition in four to six weeks and consider memory-clinic referral if deficits persist. Her daughter will stay for the first week and supervise medicines. The family should seek urgent care for marked recurrent confusion, fever, inability to pass urine or reduced intake.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-39',
      'Urgent referral — Exertional syncope with inherited arrhythmia risk',
      '23 Aug 2026 — Pt: Ms Nadia Farouk, 29y\nCollapsed while running this morning; brief loss of consciousness, rapid recovery\nNo prodrome; reports intermittent exertional palpitations for 2 months\nNo tongue biting, incontinence or post-ictal confusion\nFather died suddenly aged 35; paternal aunt has an implanted defibrillator\nECG: sinus rhythm, QTc 526 ms; no acute ischaemic change\nElectrolytes including Mg/Ca normal; troponin negative\nEchocardiogram: structurally normal heart, preserved function\nEscitalopram started 4 weeks ago for anxiety — withheld today because of QT prolongation\nDiscussed with cardiology: urgent inherited-arrhythmia assessment\nNeeds ambulatory monitoring, exercise testing and consideration of genetic evaluation\nAdvised not to drive or undertake strenuous exercise pending specialist review\nReturn urgently for recurrent syncope, sustained palpitations or chest pain\nPMH: mild eczema; attends pottery class\nNo known drug allergies\nWrite an urgent cardiology referral prioritising risk, findings, medicine action and requested assessment',
      'Dear Cardiology Registrar,\n\nI am referring Ms Nadia Farouk, aged 29, urgently following exertional syncope with marked QT prolongation and a concerning family history of sudden cardiac death.',
      'Urgent cardiology referral',
    ),
    modelAnswer: `Dear Cardiology Registrar,

I am writing to refer Ms Nadia Farouk, aged 29, urgently following exertional syncope with marked QT prolongation and a concerning family history of sudden cardiac death.

She collapsed while running this morning, with brief loss of consciousness and rapid recovery. There was no prodrome, tongue biting, incontinence or post-ictal confusion. She also reports two months of intermittent exertional palpitations. Her father died suddenly aged 35, and a paternal aunt has an implanted defibrillator.

ECG shows sinus rhythm with a QTc of 526 ms and no acute ischaemic change. Electrolytes, including magnesium and calcium, are normal, troponin is negative and echocardiography demonstrates a structurally normal heart with preserved function. Escitalopram, commenced four weeks ago, has been withheld because of its potential contribution to QT prolongation.

Following discussion with your team, please assess her urgently for an inherited arrhythmia, ambulatory monitoring, exercise testing and genetic evaluation. She has been advised not to drive or undertake strenuous exercise pending review. She should seek immediate help for recurrent syncope, sustained palpitations or chest pain.

Ms Farouk understands the concern and the need for prompt assessment. Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-40',
      'Urgent transfer — Intracerebral haemorrhage with mechanical-valve anticoagulation conflict',
      '23 Aug 2026 — Pt: Mr Kareem Nassar, 58y\nMechanical mitral valve inserted 2019 for rheumatic disease; usual warfarin target INR 2.5–3.5\nPresented today: sudden left weakness, dysarthria, severe headache\nCT brain: 22 ml right basal-ganglia intracerebral haemorrhage; no intraventricular extension/hydrocephalus\nINR 4.8; warfarin withheld\nGiven four-factor prothrombin complex concentrate plus IV vitamin K\nRepeat CT at 6h: no haematoma expansion\nNow alert, haemodynamically stable; persistent left arm weakness\nNeurosurgery recommends conservative treatment and strict blood-pressure control\nPlatelets/renal function normal; no previous stroke\nAnticoagulation remains withheld — competing rebleeding and mechanical-valve thrombosis risks\nLocal hospital cannot provide continuous joint neurovascular/cardiology review\nRequest urgent tertiary transfer to decide timing/method of anticoagulation resumption and whether interim heparin is appropriate\nFamily informed of uncertainty and transfer rationale\nPMH: mild psoriasis; plays chess weekly\nNo known drug allergies\nWrite an urgent tertiary transfer letter prioritising the haemorrhage, reversal, current stability, valve-related risk and requested joint decision',
      'Dear Professor Chen,\n\nI am writing to request the urgent transfer of Mr Kareem Nassar, aged 58, for joint neurovascular and cardiology management following a warfarin-associated intracerebral haemorrhage in the context of a mechanical mitral valve.',
      'Urgent tertiary transfer',
    ),
    modelAnswer: `Dear Professor Chen,

I am writing to request urgent transfer of Mr Kareem Nassar, aged 58, for joint neurovascular and cardiology management following a warfarin-associated intracerebral haemorrhage in the context of a mechanical mitral valve.

He presented today with sudden left-sided weakness, dysarthria and headache. CT showed a 22-ml right basal-ganglia haemorrhage without intraventricular extension or hydrocephalus. His INR was 4.8. Warfarin was withheld and reversed with four-factor prothrombin complex concentrate and intravenous vitamin K. Repeat CT at six hours shows no expansion.

Mr Nassar is alert and haemodynamically stable, with persistent left-arm weakness. Neurosurgery advises conservative treatment and strict blood-pressure control. Platelets and renal function are normal. He has no previous stroke; his valve was inserted in 2019 for rheumatic disease, with a usual INR target of 2.5–3.5.

Anticoagulation remains withheld, creating competing risks of recurrent haemorrhage and valve thrombosis. As continuous joint specialist review is unavailable locally, please accept him urgently to determine the timing and method of anticoagulation resumption, including whether interim heparin is appropriate. His family understands the uncertainty and transfer rationale.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-41',
      'Urgent transfer — Peripartum cardiomyopathy with ventricular thrombus',
      '23 Aug 2026 — Pt: Ms Salma Youssef, 32y; 10 days postpartum after uncomplicated vaginal delivery\nPresented yesterday: progressive breathlessness, orthopnoea, bilateral leg oedema\nSpO2 88% room air; chest X-ray pulmonary oedema\nEcho: global LV impairment, EF 25%, 1.4 cm apical thrombus; valves normal\nTroponin mildly elevated; renal function/electrolytes normal\nCT pulmonary angiography: no pulmonary embolism\nTreatment: IV furosemide; now enalapril commenced\nTherapeutic LMWH started for apical thrombus\nCurrent: comfortable on 2 L oxygen, SpO2 96%, BP 108/68, alert\nBreastfeeding; anxious about medicine exposure and separation from newborn\nInfant well, currently cared for by partner\nNeeds tertiary joint heart-failure/maternal-medicine management\nRequests: optimise therapy; decide anticoagulation duration/transition; breastfeeding-compatible counselling; rhythm monitoring and repeat echo plan\nBriefly advised future pregnancy may carry significant risk; detailed contraception/preconception discussion after stabilisation\nPMH: occasional migraine; works as art teacher and enjoys watercolour\nNo known drug allergies\nWrite an urgent tertiary transfer letter selecting the cardiac, thrombotic, postpartum and requested-management priorities',
      'Dear Dr Patel,\n\nI am writing to request the urgent transfer of Ms Salma Youssef, aged 32 and 10 days postpartum, for specialist management of severe peripartum cardiomyopathy complicated by a left-ventricular apical thrombus.',
      'Urgent tertiary transfer',
    ),
    modelAnswer: `Dear Dr Patel,

I am writing to request urgent transfer of Ms Salma Youssef, aged 32 and 10 days postpartum, for specialist management of severe peripartum cardiomyopathy complicated by a left-ventricular apical thrombus.

She presented yesterday with progressive breathlessness, orthopnoea and bilateral leg oedema. Oxygen saturation was 88% on air, and chest X-ray showed pulmonary oedema. Echocardiography demonstrated global left-ventricular impairment, an ejection fraction of 25% and a 1.4-cm apical thrombus, with normal valves. Troponin was mildly elevated; renal function and electrolytes were normal. CT pulmonary angiography excluded pulmonary embolism.

Following intravenous furosemide, she is comfortable on two litres of oxygen with 96% saturation and blood pressure of 108/68 mmHg. Enalapril has been commenced, and she is receiving therapeutic low-molecular-weight heparin. She is breastfeeding and is anxious about medicine exposure and separation from her newborn, who is currently well and cared for by her partner.

Please accept her for joint heart-failure and maternal-medicine care, including treatment optimisation, rhythm monitoring, a repeat-imaging plan, and decisions about anticoagulation duration and transition. She also requires counselling on breastfeeding-compatible therapy. Future-pregnancy risk and contraception should be discussed fully after stabilisation.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-42',
      'Urgent transfer — Immune-checkpoint myocarditis with neuromuscular overlap',
      '23 Aug 2026 — Pt: Ms Lina Saad, 54y\nMetastatic melanoma; third pembrolizumab dose 8 days ago\nThree-day progression: ptosis, diplopia, proximal weakness, dysphagia\nToday: chest tightness; no previous cardiac disease\nECG: new PR prolongation with intermittent complete heart block\nTroponin 2,200 ng/L; CK 6,800 U/L\nEcho: new global LV impairment, EF 45% (baseline 65%)\nForced vital capacity declined to 1.4 L\nWorking diagnosis: immune-checkpoint myocarditis with myositis/myasthenic overlap\nPembrolizumab withheld\nAfter oncology discussion: IV methylprednisolone 1 g given\nCurrent ICU: pacing pads applied; alert; BP 112/70; SpO2 95% on 2 L oxygen\nSwallowing and respiratory muscle weakness progressing\nElectrolytes/renal function normal\nNeeds immediate tertiary cardio-oncology/neurology transfer\nRequests: continuous rhythm/respiratory monitoring, temporary pacing capability, cardiac MRI, decisions on further immunosuppression and IVIG/plasma exchange\nDaughter informed of suspected immune toxicity and urgency\nPMH: appendicectomy 1998; enjoys birdwatching\nNo known drug allergies\nWrite an urgent transfer letter prioritising the linked cardiac and neuromuscular emergency, treatment already given and requested capabilities',
      'Dear Dr Evans,\n\nI am writing to request the urgent transfer of Ms Lina Saad, aged 54, for tertiary cardio-oncology and neurological management of suspected pembrolizumab-related myocarditis with myositis and myasthenic overlap.',
      'Urgent tertiary transfer',
    ),
    modelAnswer: `Dear Dr Evans,

I am writing to request urgent transfer of Ms Lina Saad, 54, for cardio-oncology and neurological management of suspected pembrolizumab-related myocarditis with myositis and myasthenic overlap.

She received her third pembrolizumab dose for metastatic melanoma eight days ago. Over three days, she developed ptosis, diplopia, proximal weakness and dysphagia, followed today by chest tightness. ECG shows PR prolongation with intermittent complete heart block. Troponin is 2,200 ng/L and creatine kinase 6,800 U/L. Echocardiography demonstrates global impairment with an ejection fraction of 45%, compared with 65% previously. Her forced vital capacity has fallen to 1.4 L.

Pembrolizumab has been withheld. Following oncology discussion, she received intravenous methylprednisolone 1 g and is monitored in intensive care with pacing pads applied. She is alert, with blood pressure 112/70 mmHg and oxygen saturation 95% on two litres; however, swallowing and respiratory muscle weakness are progressing. Electrolytes and renal function are normal.

Please accept her immediately for continuous rhythm and respiratory monitoring, temporary pacing capability, cardiac MRI, and joint decisions regarding further immunosuppression and intravenous immunoglobulin or plasma exchange. Her daughter understands the suspected immune toxicity and urgency.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-43',
      'Immediate transfer — Suspected thrombotic thrombocytopenic purpura',
      '23 Aug 2026 — Pt: Ms Rania Adel, 37y\nPresented today: fluctuating confusion, petechiae, severe fatigue\nHb 78 g/L; platelets 12 × 10⁹/L\nBlood film: numerous schistocytes\nLDH 1,800 U/L; haptoglobin undetectable; bilirubin 42 µmol/L\nCreatinine 155 µmol/L (baseline 70)\nPT/aPTT and fibrinogen normal; no fever or sepsis focus\nCT head: no acute abnormality\nWorking diagnosis: thrombotic thrombocytopenic purpura; high PLASMIC score\nADAMTS13 sample collected before treatment; result pending\nDiscussed with haematology: treatment/transfer must not await ADAMTS13 result\nIV methylprednisolone commenced\nCurrent: fluctuating GCS 14; BP 126/74; no active major bleeding; urine output preserved\nDo not give platelets unless life-threatening bleeding after specialist discussion\nNeeds immediate tertiary transfer for plasma exchange, caplacizumab consideration and neurological/cardiac/renal monitoring\nFamily informed of suspected diagnosis and urgency\nPMH: mild childhood asthma; enjoys baking\nNo regular medicines; no known drug allergies\nWrite an immediate haematology transfer letter prioritising the diagnostic pattern, neurological risk, action already taken and treatment that must not be delayed',
      'Dear Haematology Registrar,\n\nI am writing to request the immediate transfer of Ms Rania Adel, aged 37, with suspected thrombotic thrombocytopenic purpura requiring urgent plasma exchange.',
      'Immediate haematology transfer',
    ),
    modelAnswer: `Dear Haematology Registrar,

I am writing to request immediate transfer of Ms Rania Adel, aged 37, with suspected thrombotic thrombocytopenic purpura requiring urgent plasma exchange.

She presented today with fluctuating confusion, petechiae and severe fatigue. Haemoglobin is 78 g/L and platelets 12 × 10⁹/L. Blood film shows numerous schistocytes, with LDH 1,800 U/L, undetectable haptoglobin and bilirubin 42 µmol/L, confirming microangiopathic haemolysis. Creatinine is 155 µmol/L from a baseline of 70. PT, aPTT and fibrinogen are normal, with no fever or sepsis focus. CT head shows no acute abnormality.

Her PLASMIC score is high. An ADAMTS13 sample was collected before treatment, but the result remains pending and must not delay management. Following discussion with your team, intravenous methylprednisolone has commenced. She has fluctuating GCS 14 but remains haemodynamically stable, without major bleeding and with preserved urine output. Platelets should be avoided unless life-threatening bleeding occurs after specialist discussion.

Please accept her immediately for plasma exchange, consideration of caplacizumab, and neurological, cardiac and renal monitoring. Her family understands the suspected diagnosis and urgency of transfer.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-44',
      'Urgent transfer — Staggered paracetamol ingestion with acute liver failure',
      '23 Aug 2026 — Pt: Mr Omar Nabil, 46y\nThree days of repeated supratherapeutic paracetamol for dental pain; exact total uncertain\nLast dose approximately 10 hours ago; paracetamol level 8 mg/L\nNow vomiting, right-upper-quadrant pain, drowsy but oriented\nALT 7,850 U/L; bilirubin 64 µmol/L; INR 3.4\nGlucose 3.1 mmol/L corrected with IV dextrose; lactate 4.8 mmol/L after fluids\nCreatinine 188 µmol/L (baseline 82); pH 7.29\nNo alcohol dependence; viral hepatitis screen pending\nN-acetylcysteine commenced immediately; toxicology and liver teams consulted\nCurrent: GCS 14, BP 106/66, HR 104, SpO2 97% room air; urine output falling\nNeeds immediate transfer to transplant centre for acute liver failure assessment, continued acetylcysteine, serial glucose/gases/INR, renal support and encephalopathy monitoring\nLow paracetamol level does not exclude toxicity after staggered ingestion\nPMH: eczema; accountant; enjoys gardening\nNo regular medicines; no known drug allergies\nWrite an urgent transfer letter prioritising the ingestion pattern, liver failure, treatment and requested transplant-centre care',
      'Dear Liver Transplant Registrar,\n\nI am writing to request the immediate transfer of Mr Omar Nabil, aged 46, for transplant-centre assessment of acute liver failure following a staggered paracetamol ingestion.',
      'Immediate tertiary transfer',
    ),
    modelAnswer: `Dear Liver Transplant Registrar,

I am writing to request immediate transfer of Mr Omar Nabil, 46, for transplant-centre assessment of acute liver failure after staggered paracetamol ingestion.

Over three days, he repeatedly exceeded the recommended dose for dental pain; the total is uncertain and his last dose was approximately ten hours ago. Although his paracetamol level is only 8 mg/L, this does not exclude toxicity after staggered ingestion. He now has vomiting, right-upper-quadrant pain and mild drowsiness. ALT is 7,850 U/L, bilirubin 64 µmol/L and INR 3.4. He is acidotic (pH 7.29), with lactate 4.8 mmol/L despite fluids. Creatinine has risen from 82 to 188 µmol/L and urine output is falling. Glucose of 3.1 mmol/L was corrected intravenously.

N-acetylcysteine was commenced immediately following toxicology and liver-team discussion. He is currently oriented with GCS 14, blood pressure 106/66 mmHg, heart rate 104 and oxygen saturation 97% on air. Viral hepatitis screening is pending.

Please accept him immediately for continued acetylcysteine, transplant assessment, serial glucose, blood-gas and INR monitoring, renal support, and close observation for encephalopathy.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
  {
    ...writing(
      'write-45',
      'Urgent transfer — Prosthetic-valve endocarditis with cerebral emboli',
      '26 Aug 2026 — Pt: Ms Nadia Farouk, 65y\nBioprosthetic aortic-valve replacement 2024\nSeven days fever, malaise; today transient confusion and left-arm weakness\nThree blood-culture sets: methicillin-sensitive Staphylococcus aureus\nTransoesophageal echo: 14-mm mobile prosthetic-valve vegetation, moderate aortic regurgitation, probable aortic-root abscess\nMRI brain: multiple embolic infarcts; 6-mm haemorrhagic transformation in right parietal lesion, no mass effect\nPersistent fever and positive cultures after 48 hours of treatment\nCurrent: alert, mild left pronator drift; temp 38.3°C, HR 104, BP 108/66, SpO2 97% room air\nIV flucloxacillin 2 g four-hourly plus synergistic gentamicin commenced after microbiology review\nAspirin withheld after intracranial bleeding; renal function currently normal\nLocal cardiology, microbiology and neurology agree immediate tertiary transfer\nNeeds cardiac-surgery assessment for uncontrolled infection/root abscess and specialist neurological input on operative timing given haemorrhagic transformation\nContinuous rhythm/neuro monitoring; repeat cultures taken\nDaughter informed of urgency and competing risks\nPMH: seasonal hay fever; architect; enjoys photography\nNo known drug allergies\nWrite an urgent tertiary transfer letter prioritising the uncontrolled prosthetic infection, neurological complication, treatment and multidisciplinary decision required',
      'Dear Cardiac Surgery Registrar,\n\nI am writing to request the urgent transfer of Ms Nadia Farouk, aged 65, with uncontrolled prosthetic aortic-valve endocarditis complicated by cerebral emboli and a small haemorrhagic transformation.',
      'Urgent tertiary transfer',
    ),
    modelAnswer: `Dear Cardiac Surgery Registrar,

I am writing to request urgent transfer of Ms Nadia Farouk, 65, with uncontrolled prosthetic aortic-valve endocarditis complicated by cerebral emboli and haemorrhagic transformation.

Ms Farouk had a bioprosthetic aortic-valve replacement in 2024. After seven days of fever and malaise, she developed transient confusion and left-arm weakness today. Three blood-culture sets grew methicillin-sensitive Staphylococcus aureus. Transoesophageal echocardiography shows a 14-mm mobile vegetation, moderate aortic regurgitation and a probable aortic-root abscess. Despite 48 hours of treatment, fever and positive cultures persist.

MRI demonstrates multiple embolic infarcts, including a 6-mm haemorrhagic transformation in the right parietal lesion without mass effect. She is currently alert with mild left pronator drift; temperature is 38.3°C, pulse 104 and blood pressure 108/66 mmHg.

Following microbiology advice, intravenous flucloxacillin 2 g four-hourly and synergistic gentamicin have commenced. Aspirin is withheld, repeat cultures are pending, and rhythm and neurological monitoring continue. Renal function is normal.

Please assess her immediately for surgery to control the root infection, with neurology and neurosurgical input regarding timing given the intracranial bleeding. Her daughter understands the urgency and competing risks.

Please contact me if further information is required.

Yours sincerely,

Dr Maya Hassan`,
    difficulty: 'advanced',
  },
];

export const speakingTasks: SessionTask[] = [
  speaking(
    'speak-1',
    'Medication side effects (dizziness)',
    'You are a nurse. Patient started new antihypertensive and feels dizzy.',
    ['Acknowledge symptoms', 'Explain likely side effect', 'Advise when to seek urgent help'],
    {
      expectedKeywords: ['dizzy', 'dizziness', 'blood pressure', 'side effect', 'lie down', 'hydrated', 'urgent', 'fall'],
      checklist: ['Acknowledge symptoms', 'Explain likely side effect', 'Advise when to seek urgent help'],
      samplePhrases: [
        'I understand feeling dizzy can be unsettling.',
        'This medication can lower your blood pressure, which may cause dizziness at first.',
        'Please sit or lie down if you feel faint, and call us if it worsens or you nearly fall.',
      ],
    },
  ),
  speaking(
    'speak-2',
    'Gout dietary advice',
    'You are a GP. Patient newly diagnosed with gout wants food guidance.',
    ['Explain triggers in plain language', 'Suggest realistic swaps', 'Confirm understanding'],
    {
      expectedKeywords: ['purine', 'red meat', 'seafood', 'alcohol', 'water', 'flare', 'vegetables'],
      checklist: ['Explain triggers in plain language', 'Suggest realistic swaps', 'Confirm understanding'],
      samplePhrases: [
        'Gout flares can be triggered by certain foods and drinks high in purines.',
        'Try limiting red meat and beer, and drink plenty of water daily.',
        'Can you tell me one change you might try this week?',
      ],
    },
  ),
  speaking(
    'speak-3',
    'Wound dressing at home',
    'You are a community nurse teaching dressing change.',
    ['Step-by-step instructions', 'Infection warning signs', 'Check patient confidence'],
    {
      expectedKeywords: ['clean', 'dressing', 'redness', 'swelling', 'pus', 'fever', 'hands', 'dry'],
      checklist: ['Step-by-step instructions', 'Infection warning signs', 'Check patient confidence'],
      samplePhrases: [
        'First wash your hands, then gently remove the old dressing.',
        'Contact us if you notice increasing redness, warmth, or foul discharge.',
        'Would you feel comfortable trying this once while I watch?',
      ],
    },
  ),
  speaking(
    'speak-4',
    'Vaccine hesitancy (parent)',
    'You are a GP. Parent hesitant about child\'s vaccination.',
    ['Validate concerns', 'Explain benefits/risks clearly', 'Offer reputable resources'],
    {
      expectedKeywords: ['understand', 'concern', 'benefit', 'risk', 'immune', 'side effect', 'information'],
      checklist: ['Validate concerns', 'Explain benefits/risks clearly', 'Offer reputable resources'],
      samplePhrases: [
        'It\'s understandable you want to make the safest choice for your child.',
        'Vaccination protects against serious illness; most side effects are mild.',
        'I can give you a leaflet from the health department if that helps.',
      ],
    },
  ),
  speaking(
    'speak-5',
    'Warfarin diet counselling',
    'You are a nurse. Patient on warfarin asks about green vegetables.',
    ['Explain vitamin K interaction simply', 'Advise consistency not elimination', 'Teach-back question'],
    {
      expectedKeywords: ['warfarin', 'vitamin K', 'green vegetables', 'consistent', 'INR', 'leafy'],
      checklist: ['Explain vitamin K interaction simply', 'Advise consistency not elimination', 'Teach-back question'],
      samplePhrases: [
        'Green vegetables contain vitamin K, which affects how warfarin works.',
        'You don\'t need to stop them — keep your intake roughly the same each week.',
        'Can you explain back to me how you\'ll manage your serves of greens?',
      ],
    },
  ),
  speaking(
    'speak-6',
    'Fall risk at home (elderly)',
    'You are a nurse. Patient\'s daughter worries about falls after discharge.',
    ['Address daughter\'s concern', 'Home safety tips', 'When to call for help'],
    {
      expectedKeywords: ['fall', 'rails', 'lighting', 'rug', 'footwear', 'call', 'emergency'],
      checklist: ['Address daughter\'s concern', 'Home safety tips', 'When to call for help'],
      samplePhrases: [
        'Your concern about falls is very valid after a hospital stay.',
        'Remove loose rugs, improve night lighting, and use non-slip footwear indoors.',
        'Call an ambulance if she hits her head or cannot get up after a fall.',
      ],
    },
  ),
  speaking(
    'speak-7',
    'Breaking abnormal scan news',
    'You are a doctor. Patient anxious about abnormal imaging result.',
    ['Empathy first', 'Explain result without jargon', 'Outline next steps'],
    {
      expectedKeywords: ['understand', 'anxious', 'scan', 'follow-up', 'specialist', 'further tests'],
      checklist: ['Empathy first', 'Explain result without jargon', 'Outline next steps'],
      samplePhrases: [
        'I can see this news is worrying — that\'s a normal reaction.',
        'The scan shows an area we need to investigate further; it is not a final diagnosis.',
        'We will arrange a specialist review and explain each step before anything happens.',
      ],
    },
  ),
  speaking(
    'speak-8',
    'Colonoscopy bowel prep',
    'You are a nurse explaining bowel preparation.',
    ['Clear timing instructions', 'Manage side effects expectations', 'Teach-back'],
    {
      expectedKeywords: ['clear fluids', 'bowel prep', 'diarrhoea', 'fasting', 'medication', 'understand'],
      checklist: ['Clear timing instructions', 'Manage side effects expectations', 'Teach-back'],
      samplePhrases: [
        'The day before, switch to clear fluids only from midday as directed.',
        'The prep will cause frequent loose bowel motions — stay near a toilet and drink water.',
        'Can you repeat when you should stop solid food?',
      ],
    },
  ),
  speaking(
    'speak-9',
    'MRI claustrophobia',
    'You are a radiographer. Patient fears enclosed MRI scanner.',
    ['Acknowledge fear', 'Explain procedure stepwise', 'Offer coping strategies'],
    {
      expectedKeywords: ['understand', 'afraid', 'noise', 'headphones', 'panic button', 'breathing'],
      checklist: ['Acknowledge fear', 'Explain procedure stepwise', 'Offer coping strategies'],
      samplePhrases: [
        'Many people feel anxious in the scanner — your fear is understandable.',
        'You will hear loud knocking; we give ear protection and you can squeeze the buzzer anytime.',
        'Try slow breathing and focus on a count to ten if you feel closed in.',
      ],
    },
  ),
  speaking(
    'speak-10',
    'Inhaler technique check',
    'You are a pharmacist. Patient uses inhaler incorrectly.',
    ['Demonstrate technique', 'Ask patient to show return demo', 'Storage advice'],
    {
      expectedKeywords: ['shake', 'breathe out', 'spacer', 'rinse', 'mouth', 'demonstrate'],
      checklist: ['Demonstrate technique', 'Ask patient to show return demo', 'Storage advice'],
      samplePhrases: [
        'Shake the inhaler, breathe out fully, then seal lips around the mouthpiece.',
        'Can you show me how you would take your next dose?',
        'Rinse your mouth after steroid inhalers and store at room temperature.',
      ],
    },
  ),
  speaking(
    'speak-11',
    'Post-TKR rehab expectations',
    'You are a physio. Patient expects full recovery in one week.',
    ['Manage expectations kindly', 'Explain realistic timeline', 'Home exercises'],
    {
      expectedKeywords: ['recovery', 'weeks', 'exercises', 'swelling', 'gradual', 'physiotherapy'],
      checklist: ['Manage expectations kindly', 'Explain realistic timeline', 'Home exercises'],
      samplePhrases: [
        'It\'s great you\'re motivated — full recovery usually takes several weeks to months.',
        'Swelling and stiffness are normal early on; daily exercises help restore movement.',
        'We will give you a home program to do little and often.',
      ],
    },
  ),
  speaking(
    'speak-12',
    'Palliative care discussion',
    'You are a nurse. Family asks about end-of-life comfort care.',
    ['Sensitive empathy', 'Explain comfort-focused plan', 'Invite questions'],
    {
      expectedKeywords: ['comfort', 'pain', 'family', 'dignity', 'questions', 'support'],
      checklist: ['Sensitive empathy', 'Explain comfort-focused plan', 'Invite questions'],
      samplePhrases: [
        'This is a difficult time for your family, and we are here to support you.',
        'Our focus is keeping your loved one comfortable and free of distress.',
        'What questions do you have about what happens next?',
      ],
    },
  ),
  speaking(
    'speak-13',
    'Pain score & escalation',
    'You are a nurse on post-op ward. Patient pain not controlled.',
    ['Assess pain score', 'Explain need to notify doctor', 'Reassure patient'],
    {
      expectedKeywords: ['pain score', 'zero to ten', 'medication', 'doctor', 'review', 'reassure'],
      checklist: ['Assess pain score', 'Explain need to notify doctor', 'Reassure patient'],
      samplePhrases: [
        'On a scale of zero to ten, how would you rate your pain right now?',
        'I will notify the doctor so we can review your analgesia.',
        'We will stay with you until the new dose takes effect.',
      ],
    },
  ),
  speaking(
    'speak-14',
    'Smoking cessation post-COPD',
    'You are a nurse. COPD patient wants to quit smoking.',
    ['Praise motivation', 'Nicotine replacement options', 'Follow-up support'],
    {
      expectedKeywords: ['quit', 'nicotine', 'patch', 'support', 'COPD', 'lung'],
      checklist: ['Praise motivation', 'Nicotine replacement options', 'Follow-up support'],
      samplePhrases: [
        'Wanting to quit is one of the best steps for your lung health.',
        'Nicotine patches or gum can reduce cravings while you stop cigarettes.',
        'We can refer you to a cessation coach for follow-up next week.',
      ],
    },
  ),
  speaking(
    'speak-15',
    'Interlocutor interruption practice',
    'You are a GP counselling chest pain. Patient asks: "Could this be a heart attack?"',
    ['Answer directly without panic', 'Explain what you know so far', 'Next diagnostic steps'],
    {
      expectedKeywords: ['chest pain', 'heart attack', 'ECG', 'blood test', 'hospital', 'symptoms'],
      checklist: ['Answer directly without panic', 'Explain what you know so far', 'Next diagnostic steps'],
      samplePhrases: [
        'That\'s an important question — chest pain can have several causes including the heart.',
        'From what we know so far, we need tests before we can be sure.',
        'We will arrange an ECG and blood tests, and send you to hospital if red flags appear.',
      ],
    },
  ),
  speaking(
    'speak-16',
    'Diabetic foot care education',
    'You are a nurse. Patient with diabetes has numb toes.',
    ['Daily foot check routine', 'When to seek podiatry', 'Footwear advice'],
    {
      expectedKeywords: ['inspect', 'feet', 'daily', 'shoes', 'podiatrist', 'numb', 'wound'],
      checklist: ['Daily foot check routine', 'When to seek podiatry', 'Footwear advice'],
      samplePhrases: [
        'Check your feet each day for cuts, blisters, or colour changes.',
        'See a podiatrist promptly if you notice a break in the skin or loss of sensation worsens.',
        'Wear well-fitting closed shoes and avoid walking barefoot.',
      ],
    },
  ),
  speaking(
    'speak-17',
    'Ethical dilemma — confidentiality',
    'You are a doctor. Patient refuses you to tell family diagnosis.',
    ['Respect confidentiality', 'Explore patient\'s reasons', 'Offer support options'],
    {
      expectedKeywords: ['confidential', 'privacy', 'family', 'support', 'choice', 'counselling'],
      checklist: ['Respect confidentiality', 'Explore patient\'s reasons', 'Offer support options'],
      samplePhrases: [
        'Unless you consent, I cannot share your diagnosis with your family.',
        'Can you tell me more about why you prefer they not know?',
        'We can arrange counselling or a family meeting only if you agree.',
      ],
    },
  ),
  speaking(
    'speak-18',
    'OT home modification advice',
    'You are an OT. Patient needs bathroom grab rails after stroke.',
    ['Explain safety rationale', 'Referral to services', 'Check understanding'],
    {
      expectedKeywords: ['grab rails', 'bathroom', 'fall', 'occupational therapist', 'safe', 'transfer'],
      checklist: ['Explain safety rationale', 'Referral to services', 'Check understanding'],
      samplePhrases: [
        'Grab rails reduce your risk of slipping when getting on and off the toilet.',
        'I will refer you to community services for installation assessment.',
        'Can you show me how you would stand up using the rail?',
      ],
    },
  ),
  speaking(
    'speak-19',
    'Informed consent for biopsy',
    'You are a doctor. Patient needs consent for a skin lesion biopsy and is nervous about results.',
    ['Explain the procedure in plain language', 'Discuss risks and what results mean', 'Confirm voluntary consent'],
    {
      expectedKeywords: ['biopsy', 'sample', 'local anaesthetic', 'results', 'risk', 'consent', 'questions'],
      checklist: ['Explain the procedure in plain language', 'Discuss risks and what results mean', 'Confirm voluntary consent'],
      samplePhrases: [
        'We take a small sample of the skin under local anaesthetic to examine it closely.',
        'Most results are reassuring, but I\'ll explain what happens either way once we know.',
        'Do you have any questions before you sign the consent form?',
      ],
    },
  ),
  speaking(
    'speak-20',
    'Explaining a new type 2 diabetes diagnosis',
    'You are a doctor. Patient just diagnosed with type 2 diabetes, worried about insulin injections.',
    ['Explain diagnosis without alarming', 'Clarify treatment usually starts with tablets/lifestyle', 'Check understanding'],
    {
      expectedKeywords: ['diabetes', 'blood sugar', 'tablets', 'lifestyle', 'insulin', 'diet', 'monitor'],
      checklist: ['Explain diagnosis without alarming', 'Clarify treatment usually starts with tablets/lifestyle', 'Check understanding'],
      samplePhrases: [
        'Your blood sugar levels are higher than they should be — this is type 2 diabetes.',
        'Most people start with lifestyle changes and tablets; insulin isn\'t usually the first step.',
        'What questions do you have about what this means day to day?',
      ],
    },
  ),
  speaking(
    'speak-21',
    'Discussing anticoagulation risk (starting a DOAC)',
    'You are a doctor. Patient with new atrial fibrillation is anxious about bleeding risk on anticoagulants.',
    ['Explain stroke vs bleeding risk balance', 'Practical safety advice', 'Check understanding'],
    {
      expectedKeywords: ['stroke', 'bleeding', 'anticoagulant', 'risk', 'bruising', 'dentist', 'balance'],
      checklist: ['Explain stroke vs bleeding risk balance', 'Practical safety advice', 'Check understanding'],
      samplePhrases: [
        'This medication lowers your stroke risk, but it does raise the chance of bruising or bleeding.',
        'Mention it before any dental work or surgery, and seek help for unusual bleeding.',
        'Can you tell me what you\'d do if you noticed blood in your stool?',
      ],
    },
  ),
  speaking(
    'speak-22',
    'Sharing an abnormal biopsy result',
    'You are a doctor. Patient\'s biopsy shows early-stage cancer; they came in alone.',
    ['Give a warning shot before the result', 'Deliver news clearly and compassionately', 'Outline immediate next steps'],
    {
      expectedKeywords: ['sorry', 'cancer', 'understand', 'specialist', 'treatment', 'support', 'time'],
      checklist: ['Give a warning shot before the result', 'Deliver news clearly and compassionately', 'Outline immediate next steps'],
      samplePhrases: [
        'I\'m afraid the biopsy result is more serious than we were hoping for.',
        'It shows an early-stage cancer, and I know that\'s a lot to take in right now.',
        'We\'ll arrange a specialist appointment quickly and go through every option together.',
      ],
    },
  ),
  speaking(
    'speak-23',
    'Medication non-adherence conversation',
    'You are a doctor. Patient with hypertension admits skipping tablets due to side effects.',
    ['Non-judgmental exploration of reasons', 'Problem-solve alternatives', 'Agree a realistic plan'],
    {
      expectedKeywords: ['understand', 'side effect', 'alternative', 'dose', 'together', 'plan', 'follow-up'],
      checklist: ['Non-judgmental exploration of reasons', 'Problem-solve alternatives', 'Agree a realistic plan'],
      samplePhrases: [
        'Thank you for telling me — it\'s really helpful to know why the tablets weren\'t working for you.',
        'There are other options with fewer side effects that we could try instead.',
        'Shall we agree on a plan and check in again in two weeks?',
      ],
    },
  ),
  speaking(
    'speak-24',
    'Discussing goals of care with family',
    'You are a doctor. Elderly patient with advanced dementia; family asks about escalating treatment.',
    ['Explore family understanding and wishes', 'Explain benefits/burdens of escalation honestly', 'Reach a shared, compassionate plan'],
    {
      expectedKeywords: ['understand', 'comfort', 'quality of life', 'wishes', 'together', 'burden', 'support'],
      checklist: ['Explore family understanding and wishes', 'Explain benefits/burdens of escalation honestly', 'Reach a shared, compassionate plan'],
      samplePhrases: [
        'Can you tell me what your mother would have wanted in a situation like this?',
        'Further treatment may cause more discomfort without changing the overall outcome.',
        'Let\'s agree together on a plan that focuses on her comfort and dignity.',
      ],
    },
  ),
  {
    ...speaking(
      'speak-25',
      'Possible pulmonary embolism — urgent transfer refusal',
      'You are a GP. Patient with pleuritic chest pain refuses ambulance transfer because they need to collect a child from school.',
      ['Acknowledge practical worry', 'Explain PE risk and urgency without panic', 'Negotiate safe transfer and support options'],
      {
        expectedKeywords: ['pulmonary embolism', 'chest pain', 'urgent', 'ambulance', 'risk', 'child', 'support'],
        checklist: ['Acknowledge practical worry', 'Explain PE risk and urgency without panic', 'Negotiate safe transfer and support options'],
        samplePhrases: [
          'I can see you are worried about your child, and we need to solve that safely.',
          'Your symptoms could indicate a clot in the lung, which can become dangerous quickly.',
          'Let us call someone you trust for school pickup while I arrange urgent transfer.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-26',
      'Capacity assessment — confused refusal',
      'You are a doctor. A delirious patient refuses antibiotics for sepsis and says staff are trying to poison them.',
      ['Assess understanding gently', 'Explain why treatment is needed', 'Discuss best-interests action and reassurance'],
      {
        expectedKeywords: ['infection', 'sepsis', 'confused', 'capacity', 'antibiotics', 'best interests', 'safe'],
        checklist: ['Assess understanding gently', 'Explain why treatment is needed', 'Discuss best-interests action and reassurance'],
        samplePhrases: [
          'I can hear that this feels frightening, and I want to check what you understand.',
          'The infection is making you confused, and antibiotics are needed to keep you safe.',
          'If you cannot weigh the information right now, we may treat in your best interests and keep explaining.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-27',
      'GLP-1 severe nausea safety-net',
      'You are a pharmacist. Patient on semaglutide has persistent vomiting but wants to continue for weight loss.',
      ['Validate motivation', 'Explain dehydration and red flags', 'Advise temporary withholding and medical review'],
      {
        expectedKeywords: ['semaglutide', 'vomiting', 'dehydration', 'withhold', 'review', 'abdominal pain', 'fluids'],
        checklist: ['Validate motivation', 'Explain dehydration and red flags', 'Advise temporary withholding and medical review'],
        samplePhrases: [
          'I understand the weight loss feels important, but persistent vomiting is not a mild side effect.',
          'You could become dehydrated or develop a more serious abdominal problem.',
          'Please pause the medicine and arrange same-day review, especially if pain or ketones occur.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-28',
      'Breaking genetic-risk news',
      'You are a doctor. Patient has a BRCA1 mutation and fears this means they definitely have cancer.',
      ['Correct misunderstanding compassionately', 'Explain risk and surveillance options', 'Offer genetics counselling and family support'],
      {
        expectedKeywords: ['BRCA1', 'risk', 'cancer', 'screening', 'genetics', 'family', 'counselling'],
        checklist: ['Correct misunderstanding compassionately', 'Explain risk and surveillance options', 'Offer genetics counselling and family support'],
        samplePhrases: [
          'This result does not mean you have cancer today; it means your lifetime risk is higher.',
          'There are screening and risk-reducing options, and you do not need to decide today.',
          'A genetics counsellor can help you and discuss what relatives may need to know.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-29',
      'Dysphagia diet conflict',
      'You are a speech pathologist. Stroke patient is angry about thickened fluids and says they will drink normal water.',
      ['Acknowledge frustration', 'Explain silent aspiration simply', 'Agree a realistic safe-swallow plan'],
      {
        expectedKeywords: ['thickened fluids', 'aspiration', 'stroke', 'pneumonia', 'safe', 'swallow', 'plan'],
        checklist: ['Acknowledge frustration', 'Explain silent aspiration simply', 'Agree a realistic safe-swallow plan'],
        samplePhrases: [
          'I can understand why thickened drinks feel unpleasant and restrictive.',
          'The test showed fluid can go toward your lungs without making you cough.',
          'Let us choose options you can tolerate while we work on exercises to reassess your swallow.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-30',
      'Needle-stick exposure counselling',
      'You are an occupational health nurse. Staff member is panicking after a needle-stick injury from an unknown source.',
      ['Contain anxiety', 'Explain immediate tests and prophylaxis', 'Give follow-up and confidentiality reassurance'],
      {
        expectedKeywords: ['needle-stick', 'blood tests', 'post-exposure prophylaxis', 'HIV', 'hepatitis', 'follow-up', 'confidential'],
        checklist: ['Contain anxiety', 'Explain immediate tests and prophylaxis', 'Give follow-up and confidentiality reassurance'],
        samplePhrases: [
          'This is frightening, but you did the right thing by reporting it immediately.',
          'We will take baseline bloods and assess whether post-exposure prophylaxis is recommended.',
          'Your results and follow-up will be handled confidentially.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-31',
      'Adrenal crisis sick-day rules',
      'You are a nurse. Patient with Addison disease is unsure when to use emergency hydrocortisone.',
      ['Explain sick-day dosing', 'Demonstrate emergency injection plan', 'Check teach-back and medical-alert use'],
      {
        expectedKeywords: ['Addison', 'hydrocortisone', 'vomiting', 'injection', 'ambulance', 'sick day', 'medical alert'],
        checklist: ['Explain sick-day dosing', 'Demonstrate emergency injection plan', 'Check teach-back and medical-alert use'],
        samplePhrases: [
          'If you are vomiting and cannot keep tablets down, that is when the emergency injection matters.',
          'Use the hydrocortisone injection, then call an ambulance rather than waiting to see.',
          'Can you show me where you keep the kit and when you would use it?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-32',
      'Transplant drug interaction warning',
      'You are a pharmacist. Renal transplant patient wants to take leftover clarithromycin for a cough.',
      ['Explain interaction risk', 'Advise not to self-start antibiotics', 'Arrange safe clinical review'],
      {
        expectedKeywords: ['tacrolimus', 'clarithromycin', 'interaction', 'kidney', 'levels', 'review', 'antibiotic'],
        checklist: ['Explain interaction risk', 'Advise not to self-start antibiotics', 'Arrange safe clinical review'],
        samplePhrases: [
          'Clarithromycin can raise tacrolimus levels and harm your kidney transplant.',
          'Please do not start leftover antibiotics without the transplant team checking.',
          'Let us arrange a review today so your cough is treated safely.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-33',
      'Incidental pulmonary nodule — uncertainty and shared planning',
      'You are a doctor in a respiratory clinic. A 46-year-old patient has an 8-mm pulmonary nodule found incidentally after a minor car accident. They are convinced it is cancer and demand immediate surgery; their calculated risk is intermediate and interval imaging is one reasonable option.',
      [
        'Elicit the patient\'s fears and what they understand from the scan report',
        'Explain uncertainty, risk stratification and management options in plain language',
        'Negotiate a safe shared plan, address safety-netting and check understanding',
      ],
      {
        expectedKeywords: [
          'nodule',
          'cancer',
          'uncertain',
          'risk',
          'scan',
          'biopsy',
          'surgery',
          'follow-up',
          'choice',
          'understand',
        ],
        checklist: [
          'Explore the meaning the patient has attached to the scan result before giving information',
          'Chunk information, avoid false reassurance and compare surveillance with invasive investigation',
          'Reach a shared plan with explicit follow-up, red flags and teach-back',
        ],
        samplePhrases: [
          'Seeing the word nodule in a report can be frightening; what is worrying you most about it?',
          'A nodule is a small shadow, and this scan alone cannot tell us that it is cancer.',
          'Surgery gives tissue diagnosis but also carries harm, while interval scanning can show whether the nodule changes.',
          'Could you tell me how you understand the options, so we can choose the safest plan together?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-34',
      'Functional neurological symptoms — repairing trust',
      'You are a doctor reviewing a patient with episodic leg weakness. Examination showed positive features of a functional neurological disorder and MRI excluded structural disease. The patient feels accused of imagining the symptoms and refuses further review.',
      [
        'Acknowledge the patient\'s hurt and explore what they understood from the diagnosis',
        'Explain a positive functional diagnosis without suggesting the symptoms are fabricated',
        'Negotiate multidisciplinary treatment, safety-net new symptoms and check understanding',
      ],
      {
        expectedKeywords: [
          'real',
          'symptoms',
          'functional',
          'nervous system',
          'MRI',
          'treatment',
          'recovery',
          'choice',
          'follow-up',
          'understand',
        ],
        checklist: [
          'Name and validate the rupture in trust before re-explaining the diagnosis',
          'Use positive examination findings and a software-not-damage analogy carefully',
          'Offer a collaborative treatment plan without withdrawing medical follow-up',
          'Safety-net genuinely new persistent neurological features and use teach-back',
        ],
        samplePhrases: [
          'I am sorry our explanation left you feeling disbelieved; your weakness is real and not something you are choosing.',
          'The scan shows no structural damage, while the examination shows a problem with how movement signals are functioning.',
          'This diagnosis can improve, and treatment retrains those movement patterns while we continue to review you medically.',
          'Before we decide the next step, could you tell me what this explanation means to you?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-35',
      'Anticoagulation decision — preserving patient autonomy',
      'You are a doctor discussing anticoagulation with a patient who has atrial fibrillation and limited English. Their adult child answers every question and insists treatment must start today, while the patient appears hesitant. A professional interpreter is available by video.',
      [
        'Address the patient directly, offer the interpreter and establish their preferred level of family involvement',
        'Explain stroke reduction and bleeding risk using balanced absolute language',
        'Elicit the patient’s priorities, confirm capacity and agree a safe decision or follow-up plan',
      ],
      {
        expectedKeywords: [
          'interpreter',
          'choice',
          'stroke',
          'bleeding',
          'risk',
          'benefit',
          'understand',
          'family',
          'decision',
          'follow-up',
        ],
        checklist: [
          'Ask the patient how they want language support and family involvement handled',
          'Present benefit and harm with matching denominators and without coercion',
          'Explore hesitation and values before recommending or deferring treatment',
          'Use teach-back and document a safe follow-up plan if more time is needed',
        ],
        samplePhrases: [
          'I would like to hear from you directly, and we can use the interpreter so the decision is fully yours.',
          'This medicine lowers the chance of a stroke, but it also increases the chance of bleeding; let us compare both using the same numbers.',
          'What matters most to you as you weigh those two risks?',
          'It is reasonable to take time if you understand the options; can you tell me how you see them before we agree the next step?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-36',
      'Demand for whole-body imaging after bereavement',
      'You are a GP seeing a patient whose sibling recently died from metastatic cancer. The patient has no focal symptoms, is frightened that routine blood tests have missed cancer, and insists on an immediate whole-body CT scan. They interpret reluctance as cost-cutting and threaten to complain.',
      [
        'Acknowledge the bereavement, fear and loss of trust before discussing investigation',
        'Explain why indiscriminate imaging may create harm and distinguish screening from symptom-led testing',
        'Elicit personal and family risk, agree appropriate screening and follow-up, and safety-net specific changes',
      ],
      {
        expectedKeywords: [
          'sorry',
          'fear',
          'cancer',
          'scan',
          'radiation',
          'incidental',
          'screening',
          'risk',
          'symptoms',
          'follow-up',
          'choice',
          'understand',
        ],
        checklist: [
          'Explore the sibling’s diagnosis and the patient’s feared meaning before correcting assumptions',
          'Explain false positives, incidental findings and radiation in neutral language without dismissing concern',
          'Take a focused risk and symptom history, then offer guideline-appropriate screening or targeted investigation',
          'Provide explicit red flags, a review interval and teach-back while preserving the right to complain or seek another opinion',
        ],
        samplePhrases: [
          'I am very sorry about your sibling; after a loss like that, it makes sense that a normal blood test may not feel reassuring.',
          'A whole-body scan can find harmless abnormalities that lead to more procedures, and it also exposes you to radiation, so it is not a reliable general screening test.',
          'I am not trying to save money at the expense of your health; I want us to choose tests that are more likely to help than harm you.',
          'Let us review your symptoms, family history and the screening you are due, then agree exactly what should trigger further investigation.',
          'Could you tell me what you understand our plan to be and what would bring you back sooner?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-37',
      'Possible pulmonary embolism — informed refusal of transfer',
      'You are a GP seeing a patient with sudden pleuritic chest pain, breathlessness and unilateral calf swelling after a long flight. Their observations are currently stable, but pulmonary embolism requires urgent hospital assessment. The patient refuses because they are the sole carer for a disabled spouse and say they understand the risk.',
      [
        'Acknowledge the caregiving conflict and explore the patient’s understanding and reasons for refusal',
        'Explain the suspected diagnosis, uncertainty and potentially serious consequences without coercion',
        'Assess decision-making capacity, mobilise practical support and negotiate urgent transfer',
        'If refusal persists, document informed refusal and agree the safest possible contingency plan',
      ],
      {
        expectedKeywords: [
          'breathlessness',
          'chest pain',
          'calf swelling',
          'blood clot',
          'pulmonary embolism',
          'risk',
          'hospital',
          'capacity',
          'choice',
          'spouse',
          'support',
          'ambulance',
          'understand',
          'worse',
        ],
        checklist: [
          'Validate the caregiving responsibility and ask what makes transfer feel impossible',
          'Explain the working diagnosis and material risk in plain, balanced language',
          'Check the patient can understand, retain, weigh and communicate the decision',
          'Offer immediate help for the spouse and recommend ambulance transfer without threats',
          'Use teach-back, document informed refusal and safety-net if the patient still declines',
        ],
        samplePhrases: [
          'I can see that leaving your spouse alone feels impossible, and I want us to solve that problem while keeping you safe.',
          'Your symptoms could be caused by a blood clot in the lung; I cannot confirm that here, and it can become life-threatening even when observations are initially stable.',
          'Could you explain what you believe may happen if you go home rather than to hospital?',
          'With your permission, we can contact someone to support your spouse while an ambulance takes you for urgent tests.',
          'If you still decide not to go, I will respect a capacitated decision, document our discussion and make the safest contingency plan we can.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-38',
      'Delirium recovery — family demands permanent placement',
      'You are the hospital doctor speaking with the daughter of a 75-year-old patient recovering from delirium. The patient is improving, has decision-making capacity today and wants to return home with short-term support. The daughter believes delirium proves dementia and insists on permanent residential placement immediately.',
      [
        'Acknowledge the daughter’s fear and clarify what changes she observed before and during the illness',
        'Explain delirium, fluctuation and why dementia cannot be diagnosed from the acute episode alone',
        'Keep the capacitated patient central while addressing foreseeable home risks',
        'Negotiate temporary support, early review and later cognitive reassessment with explicit safety-netting',
      ],
      {
        expectedKeywords: [
          'delirium',
          'acute',
          'fluctuating',
          'infection',
          'dementia',
          'capacity',
          'choice',
          'home',
          'support',
          'medicines',
          'review',
          'reassess',
          'safety',
          'understand',
        ],
        checklist: [
          'Validate the daughter’s concern without agreeing that delirium establishes dementia',
          'Contrast acute fluctuating delirium with persistent cognitive impairment in plain language',
          'Explain that a capacitated patient’s informed preference guides the discharge decision',
          'Offer time-limited supervision, medication support and an early clinical review',
          'Arrange later cognitive reassessment and identify changes requiring urgent help',
        ],
        samplePhrases: [
          'I can see why the sudden hallucinations and confusion made home feel unsafe to you.',
          'Delirium is an acute, fluctuating change during illness; it can take time to settle and does not by itself prove dementia.',
          'Your mother can understand and weigh the plan today, so her wish to return home must remain central.',
          'Let us make this a supported, reviewed transition rather than an all-or-nothing decision about permanent care.',
          'Could you tell me which changes would make you call us urgently and when her cognition will be reassessed?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-39',
      'Inherited long-QT result — confidentiality and family risk',
      'You are a cardiology doctor discussing a pathogenic long-QT result with a patient who has adult siblings at possible risk. The patient refuses to tell them because of longstanding family conflict and asks you to promise that nobody else will be contacted.',
      [
        'Acknowledge the family conflict and explore the patient’s fears about sharing the result',
        'Explain variable expression, possible cardiac risk and the value of relatives seeking assessment in plain language',
        'Discuss confidentiality and its limits neutrally without threats or promises you cannot keep',
        'Offer genetics-supported disclosure options, follow-up and a clear check of understanding',
      ],
      {
        expectedKeywords: [
          'long QT',
          'genetic',
          'heart rhythm',
          'fainting',
          'sudden death',
          'siblings',
          'risk',
          'confidential',
          'choice',
          'letter',
          'genetics',
          'support',
          'follow-up',
          'understand',
        ],
        checklist: [
          'Explore the family conflict and what the patient fears would happen after disclosure',
          'Explain actionable inherited risk without saying every relative will definitely be affected',
          'Describe confidentiality limits calmly and offer senior or ethics review if the impasse persists',
          'Offer a genetics-supported family letter or another disclosure route controlled by the patient',
          'Use teach-back and arrange follow-up rather than forcing an immediate decision',
        ],
        samplePhrases: [
          'I hear that contact with your family has been painful, and I would like to understand what you fear might happen if this information is shared.',
          'The variant can affect the heart rhythm, but its effects vary; assessment could help your siblings understand and reduce their own risk.',
          'Confidentiality is very important. I cannot make an absolute promise before we have considered the risk carefully, and I would involve senior and genetics colleagues before any exceptional disclosure.',
          'A family letter can explain the health information without sharing unnecessary details about you, and the genetics team can help you decide how it is passed on.',
          'Could you tell me what you understand about the risk and which option you might be willing to reconsider at our follow-up?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-40',
      'Adolescent sexual health — confidentiality with possible coercion',
      'You are a GP seeing a mature 16-year-old whose chlamydia test is positive. They want treatment but refuse to involve a parent and ask for an absolute promise of secrecy. During the consultation, they mention that their older partner controls their phone and transport but insist the relationship is consensual.',
      [
        'Respond without judgement, clarify the young person’s concerns and assess understanding of the diagnosis and treatment',
        'Explain confidentiality and its limits in clear, proportionate language without making an absolute promise',
        'Explore immediate safety, coercion and support privately while preserving the young person’s voice',
        'Agree treatment, partner notification, safer-sex advice and a supported follow-up plan',
      ],
      {
        expectedKeywords: [
          'chlamydia',
          'infection',
          'antibiotic',
          'confidential',
          'privacy',
          'safety',
          'pressure',
          'control',
          'partner',
          'contact',
          'condom',
          'support',
          'choice',
          'follow-up',
          'understand',
        ],
        checklist: [
          'Use a calm, non-judgemental opening and check the young person can understand and weigh the plan',
          'Explain confidentiality and possible safety-related limits before seeking further sensitive detail',
          'Ask privately about pressure, age or power imbalance, immediate danger and safe ways to make contact',
          'Explain treatment, abstinence or barrier protection and supported partner notification in accessible language',
          'Offer a trusted support option, check understanding and arrange a contact method that will not increase risk',
        ],
        samplePhrases: [
          'You have done the right thing by coming in, and I will not judge you or contact your family simply because you need sexual-health care.',
          'What you tell me is private. If I became seriously worried that you or someone else was at risk of significant harm, I might need help from a safeguarding colleague, but I would explain that and involve you wherever it was safe to do so.',
          'When you say your partner controls your phone and transport, can I ask whether you ever feel frightened, pressured or unable to say no?',
          'We can treat the infection and help notify partners without using your name; let us choose a method of contact and follow-up that is safe for you.',
          'Could you tell me in your own words what the treatment involves and what you would do if your safety or symptoms worsened?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-41',
      'Cancer disclosure — family request for collusion',
      'You are the hospital doctor speaking with the adult son of a competent 63-year-old patient whose pancreatic biopsy confirms cancer. The son asks you to call it “inflammation” because he fears the truth will remove hope. The patient previously told the team that she wants direct information and has asked today, “Is this cancer?”',
      [
        'Acknowledge the son’s protective intention and explore what he fears the patient will experience',
        'Explain why the patient’s stated information preference and trust cannot be replaced by family preference',
        'Offer to ask the patient how much detail she wants now and whether she wants her son present',
        'Negotiate an honest, compassionate disclosure plan with emotional and practical support',
      ],
      {
        expectedKeywords: [
          'cancer',
          'biopsy',
          'information',
          'choice',
          'preference',
          'honest',
          'trust',
          'hope',
          'family',
          'present',
          'support',
          'questions',
          'pace',
          'understand',
          'next steps',
        ],
        checklist: [
          'Validate the son’s wish to protect the patient without agreeing to deceptive language',
          'Explore fears, cultural expectations and what the patient has previously said about receiving information',
          'Explain that a competent patient can choose how much to know and who should be present',
          'Offer paced, plain-language disclosure that preserves realistic hope and includes immediate support',
          'Agree how the son can help, anticipate questions and check the disclosure plan is understood',
        ],
        samplePhrases: [
          'I can hear that you are trying to protect your mother, and I would like to understand what you fear will happen if she hears the diagnosis directly.',
          'She has told us that she wants clear information and is asking whether this is cancer, so calling it inflammation could damage her trust and take away her choice.',
          'I can first ask how much detail she wants today and whether she would like you beside her; she can also ask us to pause at any point.',
          'Being honest does not mean removing hope. We can explain the result gently, allow silence, answer questions and focus on the treatment and support available next.',
          'Could you tell me how you might support her during the conversation and what you understand our plan to be?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-42',
      'Severe COPD — resuscitation discussion without loss of hope',
      'You are a respiratory doctor speaking with a 68-year-old patient after their second intensive-care admission for severe COPD. The patient believes a do-not-attempt-resuscitation decision means staff will stop oxygen, antibiotics and symptom treatment. They request CPR because they hope to attend a grandchild’s wedding; their daughter avoids any discussion of deterioration.',
      [
        'Acknowledge the patient’s fear and clarify what they believe a resuscitation decision would change',
        'Explain CPR, likely outcomes and uncertainty in plain, individualised language without coercion',
        'Separate a CPR decision from all other active treatment, comfort and escalation decisions',
        'Explore the patient’s goals, invite chosen family support and agree a reviewed plan using teach-back',
      ],
      {
        expectedKeywords: [
          'COPD',
          'breathing',
          'CPR',
          'heart',
          'restart',
          'intensive care',
          'chance',
          'harm',
          'oxygen',
          'antibiotics',
          'treatment',
          'comfort',
          'wedding',
          'goals',
          'choice',
          'review',
          'understand',
        ],
        checklist: [
          'Explore the fear of abandonment and the meaning of the grandchild’s wedding before giving recommendations',
          'Describe CPR and likely benefit or burden for this patient without false precision or euphemism',
          'State clearly that a CPR decision does not stop appropriate oxygen, antibiotics, symptom relief or other agreed treatment',
          'Distinguish CPR from broader escalation planning and invite the patient to choose who joins the discussion',
          'Use teach-back, document the patient’s preference and arrange review as circumstances or goals change',
        ],
        samplePhrases: [
          'I can hear that you are worried we might stop caring for you, and that being at your grandchild’s wedding matters deeply.',
          'CPR means pressing on the chest and sometimes using shocks and a breathing tube if the heart stops; with lungs as fragile as yours, the chance of recovering well is low and the treatment can cause injury.',
          'A decision not to attempt CPR would apply only if your heart or breathing stopped. It would not mean stopping oxygen, antibiotics, relief of breathlessness or other treatment we agree could help.',
          'We can also discuss intensive care separately, because CPR and every other treatment are not one all-or-nothing decision.',
          'Could you tell me what you understand would continue, what matters most to you, and whom you would like involved when we review the plan?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-43',
      'High-chance prenatal screen — probability without direction',
      'You are a doctor speaking with a 35-year-old patient at 13 weeks of pregnancy. Cell-free DNA screening reports a 1-in-8 chance of trisomy 21. The patient believes this confirms the condition; their partner is pressing for immediate termination, while the patient is unsure and asks what you would choose.',
      [
        'Acknowledge the shock and establish what the patient understands and wants from the discussion',
        'Explain screening probability versus diagnosis using a clear natural-frequency comparison',
        'Describe diagnostic testing and the option of no further testing, including uncertainty and timing',
        'Remain non-directive, explore values and offer genetics, emotional and follow-up support',
      ],
      {
        expectedKeywords: [
          'screening',
          'chance',
          'one in eight',
          'not a diagnosis',
          'trisomy 21',
          'chromosome',
          'CVS',
          'amniocentesis',
          'diagnostic',
          'miscarriage',
          'no further testing',
          'choice',
          'values',
          'partner',
          'genetics',
          'support',
          'understand',
        ],
        checklist: [
          'Validate the emotional impact and ask what the patient currently believes the result means',
          'Translate one in eight into both affected and unaffected natural frequencies without false reassurance',
          'Explain that CVS or later amniocentesis can diagnose, including procedure uncertainty and the option to decline',
          'Resist choosing for the patient or allowing partner pressure to replace the patient’s informed preference',
          'Offer genetics support, time for questions, teach-back and a prompt follow-up plan',
        ],
        samplePhrases: [
          'I can see this result has been frightening, and before we discuss options I would like to hear what you think it tells us.',
          'This is a screening result, not a diagnosis: among eight pregnancies with this result, about one may have trisomy 21 and about seven may not.',
          'A placental test called CVS can give diagnostic information now, and amniocentesis is another option later; both have a small procedure-related uncertainty that we can discuss carefully.',
          'You may also choose no diagnostic test. I will not decide about the pregnancy for you, and your partner’s view should not replace your own values and choice.',
          'Could you tell me the difference between the screening result and a diagnosis, and which questions you want the genetics team to address?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-44',
      'Surgical consent — professional interpretation and chosen family support',
      'You are the surgeon discussing urgent but not immediate bowel surgery with a patient who has limited English. Their adult child keeps answering, asks you to use them as interpreter, and says the family has already agreed. A professional video interpreter is available. The patient appears uncertain and asks quietly whether there are alternatives.',
      [
        'Address the patient directly, arrange professional interpretation and ask how they want family involved',
        'Explain the proposed operation, material benefits, risks, alternatives and consequences of delay in plain language',
        'Explore the patient’s own concerns and check that family pressure is not replacing their decision',
        'Use interpreter-mediated teach-back and agree a safe decision and review plan',
      ],
      {
        expectedKeywords: [
          'interpreter',
          'your decision',
          'operation',
          'benefit',
          'risk',
          'alternative',
          'delay',
          'questions',
          'family',
          'choice',
          'pressure',
          'understand',
          'teach-back',
          'consent',
          'review',
        ],
        checklist: [
          'Speak to the patient rather than the relative and offer a qualified interpreter',
          'Ask the patient privately how they want family involved and whether they feel free to decide',
          'Explain the operation, material risks, expected benefit, alternatives and implications of delay without jargon',
          'Allow questions and avoid treating family agreement or a signed form as the patient’s consent',
          'Use interpreter-mediated teach-back and document the patient’s own decision or need for further review',
        ],
        samplePhrases: [
          'I would like to hear from you directly, and the professional interpreter will help me make sure my explanation is accurate.',
          'Your family can support you if you wish, but this is your decision; would you like part of the conversation to be private?',
          'The operation aims to treat the blockage, but we should discuss bleeding, infection, recovery, the alternatives and what delaying treatment could mean for you.',
          'Please ask anything that is unclear. Family agreement and a signature do not replace your own informed choice.',
          'Using the interpreter, could you explain in your own words the options and tell me which matters most to you before we agree the next step?',
        ],
      },
    ),
    difficulty: 'advanced',
  },
  {
    ...speaking(
      'speak-45',
      'Emergency dialysis — supported decision with fluctuating capacity',
      'You are the acute physician speaking with a 72-year-old patient who has severe acute kidney injury, potassium 6.8 mmol/L and worsening pulmonary oedema. They repeatedly say “no dialysis” but cannot hear the explanation because their hearing-aid battery is flat and they drift in and out of attention. Their daughter says they once feared permanent dialysis. Emergency treatment has stabilised the heart rhythm briefly, but renal replacement therapy may soon be needed.',
      [
        'Address distress, restore communication support and establish what the patient believes is being proposed',
        'Explain the immediate danger, temporary emergency dialysis and alternatives or consequences in plain language',
        'Assess decision-specific capacity after reversible barriers are treated without assuming refusal equals incapacity',
        'Elicit prior values and family knowledge, then agree and safety-net the least restrictive urgent plan',
      ],
      {
        expectedKeywords: [
          'hearing',
          'battery',
          'kidney',
          'potassium',
          'fluid',
          'heart',
          'breathing',
          'dialysis',
          'temporary',
          'choice',
          'understand',
          'capacity',
          'values',
          'daughter',
          'urgent',
          'review',
        ],
        checklist: [
          'Acknowledge fear and correct the hearing barrier before treating the first refusal as an informed decision',
          'Explain hyperkalaemia, fluid overload, the proposed temporary treatment and consequences of delay without jargon',
          'Assess whether the patient can understand, retain, weigh and communicate this specific decision after reversible causes are addressed',
          'Respect a capacitous refusal while using prior values and family knowledge—not family authority—if an urgent best-interests decision is required',
          'Use teach-back, document the reasoning and arrange repeated review because attention and capacity may fluctuate',
        ],
        samplePhrases: [
          'I can see this is frightening. Before we decide anything, let us replace the hearing-aid battery and make sure you can hear and follow the explanation.',
          'Your kidneys are not clearing potassium or fluid; that can affect your heart and breathing. The dialysis we are discussing is emergency support and does not automatically mean permanent dialysis.',
          'I will ask you to explain the options in your own words so I can check my explanation. Saying no does not by itself mean you cannot decide.',
          'If you can understand and weigh the immediate risks, your decision is yours. If you cannot do that despite support and delay would be dangerous, we must use what we know about your values to choose the least restrictive safe treatment.',
          'We will involve your daughter for what she knows about your wishes, document the decision and reassess you as your attention changes.',
        ],
      },
    ),
    difficulty: 'advanced',
  },
];

const ADVANCED_CHALLENGE: Record<OetSubtest, string> = {
  listening:
    'Advanced standard: discriminate exact evidence from plausible detail; attend to qualification, negation, tense, and the speaker’s stance.',
  reading:
    'Advanced standard: answer only what the text supports; distinguish inference from fact and reject clinically plausible but unsupported distractors.',
  writing:
    'Advanced standard: prioritise information for the reader, synthesise competing details, and maintain precise, concise professional register throughout.',
  speaking:
    'Advanced standard: respond to emotion and uncertainty, adapt language to the listener, and negotiate a safe plan with natural signposting.',
};

/**
 * Grade A mode deliberately removes the beginner/intermediate route. Every
 * task is presented with an expert challenge brief and counted as advanced.
 * This keeps adaptive practice, named modules, and timed mocks on one strict
 * difficulty policy across all four OET sub-tests.
 */
function asAdvancedTask(task: SessionTask): SessionTask {
  const subtest = task.subtest as OetSubtest;
  return {
    ...task,
    difficulty: 'advanced',
    instructions: `${task.instructions}\n\n${ADVANCED_CHALLENGE[subtest]}`,
  };
}

/**
 * The live task bank is scoped to physician work.  Keep source material for
 * maintenance, but never draw a scenario that assigns the candidate a
 * non-physician role or centres another OET profession.
 */
const NON_PHYSICIAN_SCENARIO =
  /\b(?:nurse|nurses|nursing|pharmacist|pharmacists|pharmacy|physiotherapist|physiotherapy|dentist|dentistry|radiographer|radiography|occupational therapist|dietetics|dietitian|podiatrist|speech pathologist)\b/i;

function isPhysicianTask(task: SessionTask): boolean {
  const content = [
    task.title,
    task.instructions,
    task.prompt,
    task.readingPassage,
    task.readingPassageTitle,
    task.sampleAnswer,
    task.modelAnswer,
    task.audioTranscript,
    ...(task.options?.map((option) => option.label) ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  return !NON_PHYSICIAN_SCENARIO.test(content);
}

export const bankBySubtest: Record<OetSubtest, SessionTask[]> = {
  listening: listeningTasks.filter(isPhysicianTask).map(asAdvancedTask),
  reading: readingTasks.filter(isPhysicianTask).map(asAdvancedTask),
  writing: writingTasks.filter(isPhysicianTask).map(asAdvancedTask),
  speaking: speakingTasks.filter(isPhysicianTask).map(asAdvancedTask),
};

export function seedOffset(id: string, size: number): number {
  if (size === 0) return 0;
  return hashString(id) % size;
}

function createSeededRng(seed: string): () => number {
  let state = hashString(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items];
  const rand = createSeededRng(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function pickTasks(
  subtest: OetSubtest,
  count: number,
  prefix: string,
  seed: string,
  difficultyFilter?: Difficulty,
): SessionTask[] {
  const bank = bankBySubtest[subtest];
  if (bank.length === 0 || count <= 0) return [];

  let pool = bank;
  if (difficultyFilter) {
    if (difficultyFilter === 'advanced') {
      pool = bank.filter((t) => t.difficulty === 'advanced');
    } else {
      pool = bank.filter((t) => !t.difficulty || t.difficulty === difficultyFilter);
    }
    if (pool.length < 3) pool = bank;
  }

  const effectiveCount = Math.min(count, pool.length);
  const shuffleSeed = `${prefix}|${seed}|${subtest}|${pool.length}|${difficultyFilter ?? ''}`;
  const shuffled = seededShuffle(pool, shuffleSeed);

  return shuffled.slice(0, effectiveCount).map((task) => ({
    ...task,
    id: `${prefix}-${task.id}`,
  }));
}

export function oetTaskPart(task: SessionTask): OetPart | null {
  const match = task.title.match(/\bPart ([ABC])\b/i);
  return (match?.[1]?.toUpperCase() as OetPart | undefined) ?? null;
}

export function isReadingPartAShortAnswer(task: SessionTask): boolean {
  return task.subtest === 'reading' && /\bPart A short answer\b/i.test(task.title);
}

/** Select an exact exam-part quota; fail loudly instead of silently shortening a mock. */
export function pickTasksByPart(
  subtest: Extract<OetSubtest, 'listening' | 'reading'>,
  part: OetPart,
  count: number,
  prefix: string,
  seed: string,
  difficultyFilter?: Difficulty,
): SessionTask[] {
  let pool = bankBySubtest[subtest].filter((task) => oetTaskPart(task) === part);
  if (difficultyFilter === 'advanced') {
    pool = pool.filter((task) => task.difficulty === 'advanced');
  } else if (difficultyFilter) {
    pool = pool.filter((task) => !task.difficulty || task.difficulty === difficultyFilter);
  }

  if (pool.length < count) {
    throw new Error(
      `${subtest} Part ${part} needs ${count} task(s), but the live ${difficultyFilter ?? 'mixed'} bank has ${pool.length}`,
    );
  }

  const shuffleSeed = `${prefix}|${seed}|${subtest}|Part ${part}|${pool.length}|${difficultyFilter ?? ''}`;
  return seededShuffle(pool, shuffleSeed).slice(0, count).map((task) => ({
    ...task,
    id: `${prefix}-${task.id}`,
  }));
}

/** Reading Part A questions 1–7 match texts; questions 8–20 produce short answers. */
export function pickReadingPartATasks(
  prefix: string,
  seed: string,
  difficultyFilter?: Difficulty,
): SessionTask[] {
  let pool = bankBySubtest.reading.filter((task) => oetTaskPart(task) === 'A');
  if (difficultyFilter === 'advanced') {
    pool = pool.filter((task) => task.difficulty === 'advanced');
  } else if (difficultyFilter) {
    pool = pool.filter((task) => !task.difficulty || task.difficulty === difficultyFilter);
  }

  const matchingPool = pool.filter((task) => !isReadingPartAShortAnswer(task));
  const shortAnswerPool = pool.filter(isReadingPartAShortAnswer);
  const matchingCount = 7;
  const shortAnswerCount = 13;
  if (matchingPool.length < matchingCount || shortAnswerPool.length < shortAnswerCount) {
    throw new Error(
      `Reading Part A needs ${matchingCount} matching and ${shortAnswerCount} short-answer tasks; live bank has ${matchingPool.length} and ${shortAnswerPool.length}`,
    );
  }

  const selected = [
    ...seededShuffle(matchingPool, `${prefix}|${seed}|reading|Part A|matching`).slice(0, matchingCount),
    ...seededShuffle(shortAnswerPool, `${prefix}|${seed}|reading|Part A|short`).slice(0, shortAnswerCount),
  ];
  return selected.map((task) => ({ ...task, id: `${prefix}-${task.id}` }));
}
