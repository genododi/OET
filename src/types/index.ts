export type OetSubtest = 'listening' | 'reading' | 'writing' | 'speaking';

export type SubtestType = OetSubtest | 'intro' | 'break' | 'usmle';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface MockExam {
  id: string;
  title: string;
  profession: string;
  subtests: OetSubtest[];
  durationMinutes: number;
  difficulty: Difficulty;
  description: string;
  questionsCount: number;
  /** Search/filter tags (medicine, telegram-recall, marathon, …) */
  tags?: string[];
  /** Where content style was inspired (official sample, Telegram recall, …) */
  sourceHint?: string;
}

export interface PracticeModule {
  id: string;
  subtest: OetSubtest;
  title: string;
  topic: string;
  durationMinutes: number;
  difficulty: Difficulty;
  description: string;
  tasksCount: number;
  /** Defaults to All professions when omitted */
  profession?: string;
  tags?: string[];
  sourceHint?: string;
}

export interface GuideSection {
  id: string;
  title: string;
  category: 'overview' | 'subtest' | 'scoring' | 'registration';
  content: string[];
}

/** Curated advice attributed to Dr. Ashgan from a verified public Telegram post. */
export interface AshganGuideEntry {
  id: string;
  subtest: OetSubtest | 'general';
  title: string;
  body: string;
  /** Permalink to the original Telegram message (t.me/…). */
  sourceUrl: string;
  sourceLabel: string;
  publishedAt?: string;
}

export type AshganAssetKind = 'note' | 'pdf' | 'audio' | 'image' | 'video' | 'link';

/** Scraped or exported Telegram asset (notes, PDFs, audio, images). */
export interface AshganLibraryItem {
  id: string;
  kind: AshganAssetKind;
  title: string;
  body: string;
  subtest: OetSubtest | 'general';
  sourceUrl: string;
  sourceHandle: string;
  sourceLabel: string;
  publishedAt?: string;
  /** Local path under /ashgan/ after import. */
  mediaPath?: string;
  /** Original Telegram CDN URL when download failed or skipped. */
  externalUrl?: string;
  /** True only when sender/post is verified Dr. Ashgan (export or explicit match). */
  attributedToAshgan: boolean;
}

export interface AshganTelegramLink {
  handle: string;
  label: string;
  url: string;
  note: string;
  /** public = t.me/s/ preview scrapeable; private = join via Telegram app only */
  visibility: 'public' | 'private' | 'unknown';
}

export interface Tip {
  id: string;
  subtest: OetSubtest | 'general';
  title: string;
  tip: string;
  category: string;
}

export interface PearlPitfall {
  id: string;
  type: 'pearl' | 'pitfall';
  subtest: OetSubtest | 'general';
  title: string;
  description: string;
}

export interface ExamExperience {
  id: string;
  author: string;
  profession: string;
  examDate: string;
  score: string;
  source: string;
  telegramGroup?: string;
  summary: string;
  highlights: string[];
  subtests: Partial<Record<OetSubtest, string>>;
}

export interface BookPdf {
  id: string;
  title: string;
  author: string;
  profession: string;
  pages: number;
  description: string;
  pdfPath: string;
  tags: string[];
}

export interface ExperiencePdf {
  id: string;
  title: string;
  author: string;
  examDate: string;
  profession: string;
  description: string;
  pdfPath: string;
  source: string;
}

export type NavSection =
  | 'home'
  | 'mock'
  | 'practice'
  | 'guide'
  | 'tips'
  | 'pearls'
  | 'experiences'
  | 'books'
  | 'experience-pdfs'
  | 'usmle';
