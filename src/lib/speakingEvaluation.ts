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
  /** True only when the score comes from a sufficiently long recorded response. */
  evidenceQualified: boolean;
  /** OET speaking rubric dimension scores (0–100) */
  dimensions: {
    communication: number;
    clinicalCommunication: number;
    language: number;
  };
  practicePass: boolean;
  examReady: boolean;
  perfectAnswerTips: string[];
  /** Raw transcript text, attached by the caller for optional AI-assisted review. */
  transcript?: string;
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

  const languageScore =
    wordCount < 30
      ? 25
      : wordsPerMinute > 180
        ? 50
        : wordsPerMinute < 60
          ? 55
          : layLanguage
            ? 85
            : 65;

  const weights = criteria.dimensionWeights ?? DEFAULT_WEIGHTS;
  const rawScore = Math.round(
    communicationScore * weights.communication +
      clinicalCommunicationScore * weights.clinicalCommunication +
      languageScore * weights.language,
  );
  const evidenceQualified = !usedFallback && durationSeconds >= 90 && wordCount >= 80;
  const score = evidenceQualified ? rawScore : Math.min(rawScore, 74);

  const baseSuggestion =
    wordCount < 30
      ? 'Your response was quite brief. OET speaking tasks typically need 2–3 minutes of interactive dialogue — expand with empathy, explanations, and safety-net advice.'
      : wordsPerMinute > 180
        ? 'You spoke quickly. Slow down slightly and pause to check the patient understands (teach-back).'
        : wordsPerMinute < 80
          ? 'Pace was slow — that can be fine for clarity, but ensure you cover all role-play points within the time limit.'
          : missingChecklist.length > 0
            ? `Try to address: ${missingChecklist.slice(0, 2).join('; ')}.`
            : missingKeywords.length > 0
              ? `Consider using terms like: ${missingKeywords.slice(0, 3).join(', ')}.`
              : 'Good coverage of key points. Practice again focusing on natural interaction and teach-back.';

  const suggestion = usedFallback
    ? `${baseSuggestion} Typed text can guide practice but cannot qualify as recorded Grade A evidence.`
    : durationSeconds < 90 || wordCount < 80
      ? `${baseSuggestion} Record at least 90 seconds and 80 words before this attempt can qualify as readiness evidence.`
      : baseSuggestion;

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
    evidenceQualified,
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
