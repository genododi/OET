import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { computeUsmleScore } from './usmleScoring';
import { buildUsmleBlockSession } from './usmleSessionBuilder';
import { getUsmleDisciplineStats, getUsmleOverallStats, saveUsmleSession } from './usmleAnalytics';
import { privateQuestionTask } from './usmleLibrary';
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
});

it('prioritises newer source-labelled USMLE editions and keeps an unknown year separate',()=>{
 const current={...question,id:'year-2026',identity:'year-2026',step:'step1' as const,productionYear:2026};
 const older={...question,id:'year-2025',identity:'year-2025',step:'step1' as const,productionYear:2025};
 const unknown={...question,id:'unknown-year',identity:'unknown-year',step:'step1' as const};
 const tasks=[older,unknown,current].map(q=>privateQuestionTask(q)!).filter(Boolean);
 expect(buildUsmleBlockSession({step:'step1',questionCount:1,timeMinutes:30,pool:tasks}).tasks[1].id).toBe('year-2026');
});
