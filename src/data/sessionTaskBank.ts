/**
 * Session task bank — scenarios synthesised from:
 * - Official OET sample materials (oet.com CDN)
 * - Public exam debriefs (Reddit r/OET, USMLE Privateers journal, prep sites)
 * - Common Telegram study-group recall themes (@officialoet, @oetexams_materias,
 *   @OETNursesUK, @OETDoctorsHub, @OETPharmacyPrep, @OETAlliedHealth)
 *
 * Prompts change every session — use for pattern practice, not prediction.
 */

import type { Difficulty, OetSubtest } from '../types';
import type { SessionTask, SpeakingCriteria, WritingRubricItem } from '../types/session';
import { hashString } from './generators/uniqueness';
import listeningTaskAudioDefinitions from './listeningTaskAudio.json';
import { getReadingPassage } from './readingPassages';

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
    audioSrc: `/audio/question-matched/${id}.mp3?v=${audioRevision}`,
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
  mcq('lis-7', 'listening', 'Part C — Telehealth (recall theme)', 'Complete: Telehealth works best with periodic ___ review.', [
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
];

export const bankBySubtest: Record<OetSubtest, SessionTask[]> = {
  listening: listeningTasks,
  reading: readingTasks,
  writing: writingTasks,
  speaking: speakingTasks,
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
