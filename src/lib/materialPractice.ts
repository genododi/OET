import { isDesktop, studyAssetUrl } from './desktop';
import type { OetSubtest } from '../types';
export interface MaterialDocument { id: string; filename: string; sha256: string; assetPath: string; textPath: string; format: string; role: string; pages?: number[] }
export interface MaterialAnswer { text?: string; page: number; source: Partial<MaterialDocument> & { assetPath: string; filename: string; format: string } }
export interface MaterialQuestion { number: number; prompt: string; sourcePage: number; choices: string[]; answer?: MaterialAnswer; kind: string }
export interface MaterialTextRange { page: number; start: number; end: number }
export interface MaterialUnit { id: string; label: string; part?: 'A' | 'B' | 'C'; sourceSha256: string; pages: number[]; ranges?: MaterialTextRange[]; questions: MaterialQuestion[]; skills: OetSubtest[]; recordings: string[]; passages?: { sourceSha256: string; pages: number[] }[]; answerSources: MaterialDocument[] }
export interface MaterialSheet { version: number; sourceSha256: string; documents: MaterialDocument[]; units: MaterialUnit[] }
export const materialUrl = (value: string) => /^(?:https?:|oet:|blob:)/.test(value) ? value : `${import.meta.env.BASE_URL}${value}`;
export const materialOriginal = (file: Pick<MaterialDocument,'sha256'|'format'|'assetPath'>) => isDesktop() ? `${import.meta.env.BASE_URL}desktop/original/${file.sha256}?format=${file.format}` : studyAssetUrl(materialUrl(file.assetPath));
export function validMaterialSheet(data: MaterialSheet, sha: string) {
  return data?.version === 1 && data.sourceSha256 === sha && Array.isArray(data.documents) && Array.isArray(data.units)
    && data.documents.every(d => typeof d.sha256 === 'string' && typeof d.textPath === 'string' && typeof d.assetPath === 'string')
    && data.units.every(u => typeof u.id === 'string' && Array.isArray(u.questions) && Array.isArray(u.pages) && Array.isArray(u.skills) && Array.isArray(u.recordings) && data.documents.some(d => d.sha256 === u.sourceSha256));
}
