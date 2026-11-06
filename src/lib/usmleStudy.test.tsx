import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { computeUsmleScore } from './usmleScoring';
import { buildUsmleBlockSession } from './usmleSessionBuilder';
import { getUsmleDisciplineStats, getUsmleOverallStats, saveUsmleSession } from './usmleAnalytics';
import { privateQuestionTask, mergeUsmleLibraries, loadPublishedUsmleLibrary, privateUsmleUrl } from './usmleLibrary';
import { UsmleBlockSetup } from '../components/UsmleBlockSetup';
import { UsmlePrivateLibrary } from '../components/UsmlePrivateLibrary';
import type { SessionTask } from '../types/session';
import type { PrivateUsmleQuestion } from '../types/usmleLibrary';

const task: SessionTask = { id: 'synthetic', title: 'Synthetic practice', instructions: 'Choose one.', subtest: 'usmle', usmleStep: 'step1', usmleDiscipline: 'anatomy', options: [{ id: 'A', label: 'Synthetic option one', correct: true }, { id: 'B', label: 'Synthetic option two', correct: false }] };
const question: PrivateUsmleQuestion = { id: 'private-synthetic', identity: 'synthetic', prompt: 'A synthetic question for testing.', options: task.options!, key: 'A', explanation: 'Synthetic explanation, not medical advice.', step: null, subject: null, classification: 'Step not assigned', sourceNote: '', reviewOnly: false, sourceId: 'test', sourceName: 'My test deck', addedAt: '2026-11-02', questionImages: [], answerImages: [] };

describe('USMLE private study and honest scoring', () => {
  it('counts skipped and invalid selections in the denominator without inventing a USMLE score', () => {
    const result = computeUsmleScore([task, { ...task, id: 'skipped' }, { ...task, id: 'invalid' }], { synthetic: 'A', invalid: 'Z' });
    expect(result).toMatchObject({ correct: 1, total: 3, unanswered: 2, percentCorrect: 33 });
    expect(result).not.toHaveProperty('passed');
    expect(result).not.toHaveProperty('estimatedThreeDigitScore');
    expect(result.disciplineBreakdown[0]).toMatchObject({ total: 3, correct: 1 });
  });
  it('uses exact subject counts and weighted block accuracy, preserving legacy records', () => {
    localStorage.setItem('usmle-analytics', JSON.stringify([{ id: 'legacy', step: 'step2', total: 40, percentCorrect: 50, disciplineScores: [{ discipline: 'anatomy', percentCorrect: 50 }] }]));
    saveUsmleSession('step1', 100, 1, [{ discipline: 'anatomy', percentCorrect: 100, total: 1, correct: 1 }], 1);
    saveUsmleSession('step1', 0, 9, [{ discipline: 'anatomy', percentCorrect: 0, total: 9, correct: 0 }], 0);
    expect(getUsmleOverallStats('step1')).toMatchObject({ totalQuestions: 10, averagePercent: 10 });
    expect(getUsmleDisciplineStats()).toEqual([{ discipline: 'anatomy', totalQuestions: 10, correct: 1, percentCorrect: 10, sessions: 2 }]);
    expect(JSON.parse(localStorage.getItem('usmle-analytics')!)).toHaveLength(3);
  });
  it('keeps unassigned and incomplete imports out of scored blocks', () => {
    expect(privateQuestionTask(question)).toBeNull();
    expect(privateQuestionTask(question, { step: 'step2' })?.usmleStep).toBe('step2');
    expect(privateQuestionTask({ ...question, reviewOnly: true }, { step: 'step1' })).toBeNull();
    expect(() => buildUsmleBlockSession({ step: 'step1', questionCount: 20, timeMinutes: 30, pool: [] })).toThrow();
    expect(buildUsmleBlockSession({ step: 'step1', questionCount: 20, timeMinutes: 30, pool: [task] }).tasks.filter(item => item.options)).toHaveLength(1);
  });
  it('clamps filtered counts and prevents empty starts', () => {
    const start = vi.fn();
    render(<UsmleBlockSetup step="step1" pool={[task]} onStart={start} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: 'Start Block (1 questions, 30 min)' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Discipline filter (optional)'), { target: { value: 'cardiology' } });
    expect(screen.getByRole('button', { name: 'Start Block (0 questions, 30 min)' })).toBeDisabled();
    expect(start).not.toHaveBeenCalled();
  });
  it('shows source questions with answers hidden and never renders imported HTML', () => {
    const change = vi.fn();
    const library = { version: 1, importedAt: null, questions: [{ ...question, prompt: '<script>alert(1)</script> Synthetic text' }], resources: [], warnings: [] };
    const { rerender } = render(<UsmlePrivateLibrary library={library} progress={{}} onChange={change} />);
    expect(screen.queryByLabelText('Printed answer and explanation')).not.toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer and explanation' }));
    expect(change).toHaveBeenCalledWith(question.id, { revealed: true, reviewed: true });
    rerender(<UsmlePrivateLibrary library={library} progress={{ [question.id]: { revealed: true } }} onChange={change} />);
    expect(screen.getByText('Printed key: A')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Hide answer' }));
    expect(change).toHaveBeenLastCalledWith(question.id, { revealed: false, reviewed: true });
  });
  it('filters imported banks and identifies generated practice before revealing its source answer', () => {
    const open: PrivateUsmleQuestion = { ...question, id: 'open-test', identity: 'open-test', sourceId: 'open-bank', sourceName: 'Synthetic open bank', step: 'step1', sourceOrigin: 'generated', sourceLicense: 'CC-BY-4.0', sourceAttribution: 'Synthetic contributors', sourceUrl: 'https://example.com/source' };
    const library = { version: 1, importedAt: null, questions: [question, open], resources: [], warnings: [] };
    const { rerender } = render(<UsmlePrivateLibrary library={library} progress={{}} onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Question bank / source'), { target: { value: 'open-bank' } });
    expect(screen.getByText(/1 questions match/)).toBeVisible();
    expect(screen.getByText(/Generated practice from the source publisher/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Original source and licence ↗' })).toHaveAttribute('href', open.sourceUrl);
    expect(screen.queryByText('Source answer: A')).not.toBeInTheDocument();
    rerender(<UsmlePrivateLibrary library={library} progress={{ [open.id]: { revealed: true } }} onChange={() => {}} />);
    expect(screen.getByText('Source answer: A')).toBeVisible();
    expect(privateQuestionTask(open)?.usmleSource).toContain('Generated source practice');
    expect(privateQuestionTask(open)?.usmleSource).toContain('CC-BY-4.0');
  });
});

it('prioritises newer source-labelled USMLE editions and keeps an unknown year separate',()=>{
 const current={...question,id:'year-2026',identity:'year-2026',step:'step1' as const,productionYear:2026};
 const older={...question,id:'year-2025',identity:'year-2025',step:'step1' as const,productionYear:2025};
 const unknown={...question,id:'unknown-year',identity:'unknown-year',step:'step1' as const};
 const tasks=[older,unknown,current].map(q=>privateQuestionTask(q)!).filter(Boolean);
 expect(buildUsmleBlockSession({step:'step1',questionCount:1,timeMinutes:30,pool:tasks}).tasks[1].id).toBe('year-2026');
});

it('merges shared records without replacing richer local source images or changing question IDs', () => {
 const shared = {...question, publicSharing:true, questionImages:['usmle-library/pages/'+'a'.repeat(64)+'.webp']};
 const local = {...shared, questionImages:['media/'+'b'.repeat(64)+'.jpg']};
 const empty = {version:1,importedAt:null,resources:[],warnings:[]};
 const merged=mergeUsmleLibraries({...empty,questions:[shared]},{...empty,questions:[local]});
 expect(merged.questions).toEqual([local]);expect(shared.questionImages[0]).toContain('usmle-library/pages/');
});

it('loads the published bank in an ordinary browser and rejects an incomplete catalog', async () => {
 const bank={version:1,importedAt:null,questions:[question],resources:[],warnings:[]};
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>bank}));
 try {
  expect(await loadPublishedUsmleLibrary()).toEqual(bank);
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({version:1,questions:[]})}));
  await expect(loadPublishedUsmleLibrary()).rejects.toThrow('catalog is invalid');
 } finally {vi.unstubAllGlobals();}
});

it('keeps original download links public on web and source-page images on the same origin', () => {
 const original='https://github.com/genododi/OET/releases/download/usmle-test/'+'a'.repeat(64)+'.pdf';
 const sharedImage='https://raw.githubusercontent.com/genododi/OET/main/shared-usmle-media/'+'c'.repeat(64)+'.webp';
 expect(privateUsmleUrl(original)).toBe(original);
 expect(privateUsmleUrl(sharedImage)).toBe(sharedImage);
 expect(privateUsmleUrl('usmle-library/pages/'+'b'.repeat(64)+'.webp')).toContain('/usmle-library/pages/');
 vi.stubGlobal('oetDesktop',{});
 try {expect(privateUsmleUrl(original)).toContain('/desktop/usmle/originals/'+'a'.repeat(64)+'.pdf');expect(privateUsmleUrl(sharedImage)).toContain('/usmle-library/pages/'+'c'.repeat(64)+'.webp');} finally {vi.unstubAllGlobals();}
});

it('lets learners attempt review-only material without inventing a correct or incorrect grade', () => {
 const item={...question,key:null,reviewOnly:true};const change=vi.fn();
 const library={version:1,importedAt:null,questions:[item],resources:[],warnings:[]};
 const view=render(<UsmlePrivateLibrary library={library} progress={{}} onChange={change}/>);
 fireEvent.click(screen.getByRole('radio',{name:/A\. Synthetic option one/}));
 expect(change).toHaveBeenCalledWith(item.id,{answer:'A'});
 view.rerender(<UsmlePrivateLibrary library={library} progress={{[item.id]:{answer:'A',revealed:true}}} onChange={change}/>);
 expect(screen.getByText(/No confirmed letter key is supplied/)).toBeVisible();
 expect(screen.queryByText('Your answer is correct.')).toBeNull();expect(privateQuestionTask(item,{step:'step1'})).toBeNull();
});
