import catalog from './authenticListening.json';
import { baseUrl } from '../lib/baseUrl';

export const officialComputerSource = 'https://oet.com/ready/sample-tests/oet-test-on-computer/medicine';
export const officialComputerSamples = [1, 2, 3, 4].map(number => ({
  number,
  title: `Official Medicine computer sample ${number}`,
  url: `https://training.prod.prometric.mindgrb.io/CBLA-Tutorial/OETNew_SampleTest${number}_Med/launch_html_delivery.html`,
}));
export const paperSamples = [1, 2].map(number => ({
  number,
  title: `Official Medicine paper sample ${number}`,
  questionsUrl: catalog.tests[number - 1].questionsUrl,
  answersUrl: catalog.tests[number - 1].answersUrl,
}));
export function officialPaperAsset(sample: number, section: string) {
  return `${baseUrl}official-exam-papers/sample-${sample}-${section}.pdf`;
}
export type PaperSkill = 'reading' | 'writing' | 'speaking';
export interface PaperStage { id: string; title: string; seconds: number; asset: string; sample: number; response: 'reading-a' | 'reading-bc' | 'locked' | 'writing' | 'conversation' }
export function paperStages(skill: PaperSkill, sample: number): PaperStage[] {
  if (skill === 'reading') return [
    { id: 'reading-a', title: 'Reading Part A · Questions 1–20', seconds: 900, asset: 'reading-a', sample, response: 'reading-a' },
    { id: 'reading-bc', title: 'Reading Parts B & C · Questions 1–22', seconds: 2700, asset: 'reading-bc', sample, response: 'reading-bc' },
  ];
  if (skill === 'writing') return [
    { id: 'writing-read', title: 'Writing · Read the case notes', seconds: 300, asset: 'writing', sample, response: 'locked' },
    { id: 'writing-write', title: 'Writing · Write your letter', seconds: 2400, asset: 'writing', sample, response: 'writing' },
  ];
  return [1, 2].flatMap(card => [
    { id: `prepare-${card}`, title: `Speaking · Card ${card} preparation`, seconds: 180, asset: 'speaking-candidate', sample: card, response: 'locked' as const },
    { id: `roleplay-${card}`, title: `Speaking · Role-play ${card}`, seconds: 300, asset: 'speaking-candidate', sample: card, response: 'conversation' as const },
  ]);
}
/** Derive all phases from a wall-clock deadline, including after tab suspension or reload. */
export function paperPosition(stages: PaperStage[], startedAt: number, now: number) {
  let elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  for (let index = 0; index < stages.length; index++) {
    if (elapsed < stages[index].seconds) return { index, secondsLeft: stages[index].seconds - elapsed, done: false };
    elapsed -= stages[index].seconds;
  }
  return { index: stages.length - 1, secondsLeft: 0, done: true };
}
