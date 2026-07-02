import type { SpeakingCriteria } from '../types/session';
import { OET_THRESHOLDS } from './oetThresholds';

export interface SpeakingEvaluationResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedChecklist: string[];
  missingChecklist: string[];
  wordsPerMinute: number;
  durationSeconds: number;
  wordCount: number;
  suggestion: string;
  usedFallback: boolean;
  /** OET speaking rubric dimension scores (0–100) */
  dimensions: {
    communication: number;
    clinicalCommunication: number;
    language: number;
  };
  practicePass: boolean;
  examReady: boolean;
  perfectAnswerTips: string[];
}

export type OetSpeakingEvaluation = SpeakingEvaluationResult;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  const n = normalize(text);
  if (!n) return 0;
  return n.split(' ').filter(Boolean).length;
}

/** Match keyword if it or a close stem appears in transcript. */
function keywordMatches(transcript: string, keyword: string): boolean {
  const t = normalize(transcript);
  const k = normalize(keyword);
  if (!k) return false;
  if (t.includes(k)) return true;
  const stem = k.length > 5 ? k.slice(0, Math.max(4, k.length - 2)) : k;
  return t.includes(stem);
}

/** Checklist items may contain hint keywords after " — " or use full phrase matching. */
function checklistMatches(transcript: string, item: string): boolean {
  const hintPart = item.split('—')[0]?.split('-')[0]?.trim() ?? item;
  const words = normalize(hintPart).split(' ').filter((w) => w.length > 3);
  if (words.length === 0) return keywordMatches(transcript, item);
  const matched = words.filter((w) => keywordMatches(transcript, w));
  return matched.length >= Math.ceil(words.length * 0.4);
}

const DEFAULT_WEIGHTS = {
  communication: 0.35,
  clinicalCommunication: 0.4,
  language: 0.25,
};

export function evaluateSpeakingResponse(
  transcript: string,
  durationSeconds: number,
  criteria: SpeakingCriteria,
  usedFallback = false,
): SpeakingEvaluationResult {
  const matchedKeywords = criteria.expectedKeywords.filter((k) => keywordMatches(transcript, k));
  const missingKeywords = criteria.expectedKeywords.filter((k) => !keywordMatches(transcript, k));

  const matchedChecklist = criteria.checklist.filter((c) => checklistMatches(transcript, c));
  const missingChecklist = criteria.checklist.filter((c) => !checklistMatches(transcript, c));

  const keywordScore =
    criteria.expectedKeywords.length > 0
      ? matchedKeywords.length / criteria.expectedKeywords.length
      : 0;
  const checklistScore =
    criteria.checklist.length > 0 ? matchedChecklist.length / criteria.checklist.length : 0;

  const wordCount = countWords(transcript);
  const minutes = Math.max(durationSeconds / 60, 0.25);
  const wordsPerMinute = Math.round(wordCount / minutes);

  const empathyPhrases = ['understand', 'concern', 'worried', 'anxious', 'sorry', 'help'];
  const teachBackPhrases = ['tell me', 'explain back', 'can you repeat', 'does that make sense', 'any questions'];
  const layLanguage =
    wordCount > 0 && !/\b(malignancy|pathology|contraindication)\b/.test(normalize(transcript));

  const communicationScore = Math.round(
    (checklistScore * 0.5 +
      (empathyPhrases.some((p) => keywordMatches(transcript, p)) ? 0.25 : 0) +
      (teachBackPhrases.some((p) => keywordMatches(transcript, p)) ? 0.25 : 0)) *
      100,
  );

  const clinicalCommunicationScore = Math.round(
    (keywordScore * 0.55 + checklistScore * 0.45) * 100,
  );

  let languageScore = 70;
  if (wordCount < 30) languageScore = 25;
  else if (wordsPerMinute > 180) languageScore = 50;
  else if (wordsPerMinute < 60) languageScore = 55;
  else if (layLanguage) languageScore = 85;
  else languageScore = 65;

  const weights = criteria.dimensionWeights ?? DEFAULT_WEIGHTS;
  const score = Math.round(
    communicationScore * weights.communication +
      clinicalCommunicationScore * weights.clinicalCommunication +
      languageScore * weights.language,
  );

  let suggestion = '';
  if (wordCount < 30) {
    suggestion =
      'Your response was quite brief. OET speaking tasks typically need 2–3 minutes of interactive dialogue — expand with empathy, explanations, and safety-net advice.';
  } else if (wordsPerMinute > 180) {
    suggestion =
      'You spoke quickly. Slow down slightly and pause to check the patient understands (teach-back).';
  } else if (wordsPerMinute < 80) {
    suggestion =
      'Pace was slow — that can be fine for clarity, but ensure you cover all role-play points within the time limit.';
  } else if (missingChecklist.length > 0) {
    suggestion = `Try to address: ${missingChecklist.slice(0, 2).join('; ')}.`;
  } else if (missingKeywords.length > 0) {
    suggestion = `Consider using terms like: ${missingKeywords.slice(0, 3).join(', ')}.`;
  } else {
    suggestion = 'Good coverage of key points. Practice again focusing on natural interaction and teach-back.';
  }

  if (usedFallback) {
    suggestion = `${suggestion} (Evaluated from typed text — re-record when microphone access is available for fluency scoring.)`;
  }

  const thresholds = OET_THRESHOLDS.speaking;

  const perfectAnswerTips = [
    'Open with empathy — acknowledge the patient\'s concern before explaining.',
    'Use plain language; avoid jargon unless you explain it.',
    'End with teach-back or invite questions: "Does that make sense?"',
    ...(criteria.samplePhrases.length > 0
      ? [`Model phrase: "${criteria.samplePhrases[0]}"`]
      : []),
  ];

  return {
    score,
    matchedKeywords,
    missingKeywords,
    matchedChecklist,
    missingChecklist,
    wordsPerMinute,
    durationSeconds,
    wordCount,
    suggestion,
    usedFallback,
    dimensions: {
      communication: communicationScore,
      clinicalCommunication: clinicalCommunicationScore,
      language: languageScore,
    },
    practicePass: score >= thresholds.practicePass,
    examReady: score >= thresholds.examReady,
    perfectAnswerTips,
  };
}

export function speakingPassClass(result: SpeakingEvaluationResult): string {
  if (result.examReady) return 'speaking-score-good';
  if (result.practicePass) return 'speaking-score-mid';
  return 'speaking-score-low';
}
