import type { SessionOption } from './session';
import type { UsmleDiscipline, UsmleStep } from './usmle';

export interface PrivateUsmleQuestion {
  id: string;
  identity: string;
  prompt: string;
  options: SessionOption[];
  key: string | null;
  explanation: string;
  step: UsmleStep | null;
  subject: string | null;
  discipline?: UsmleDiscipline;
  classification: string;
  block?: number;
  number?: number;
  sourceNote: string;
  reviewOnly: boolean;
  sourceId: string;
  sourceName: string;
  addedAt: string;
  questionImages: string[];
  answerImages: string[];
}
export interface PrivateUsmleResource { id: string; sha256: string; name: string; kind: 'pdf' | 'deck'; asset?: string; addedAt: string; size: number; questions?: number }
export interface PrivateUsmleLibrary { version: number; importedAt: string | null; questions: PrivateUsmleQuestion[]; resources: PrivateUsmleResource[]; warnings: string[] }
export interface UsmleImportStatus { state: 'idle' | 'importing' | 'complete' | 'failed'; message: string; questions?: number; resources?: number; warnings?: string[] }
