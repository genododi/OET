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
import { baseUrl } from '../lib/baseUrl';

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

export const bankBySubtest: Record<OetSubtest, SessionTask[]> = {
  listening: listeningTasks.map(asAdvancedTask),
  reading: readingTasks.map(asAdvancedTask),
  writing: writingTasks.map(asAdvancedTask),
  speaking: speakingTasks.map(asAdvancedTask),
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
