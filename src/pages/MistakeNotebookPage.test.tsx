import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompletedSession } from '../types/session';
import { MistakeNotebookPage } from './MistakeNotebookPage';
import { readMistakeReflections } from '../lib/mistakeNotebook';

const state = vi.hoisted(() => ({ completed: [] as CompletedSession[] }));
vi.mock('../hooks/useProgress', () => ({ useProgress: () => ({ completed: state.completed, markComplete: vi.fn() }) }));

function seed(): CompletedSession {
  return { id: 'practice', title: 'Practice', kind: 'practice', completedAt: '2026-01-01T10:00:00Z', durationMinutes: 20,
    review: { overallPercent: 0, overallPracticePass: false, overallExamReady: false, subtestScores: [], weakAreas: [],
      taskReviews: [{ taskId: 'seed-read-7', subtest: 'reading', scorePercent: 0, passed: false, summary: 'Missed evidence', response: 'Original answer', expectedResponse: 'Correct answer' }] } };
}

describe('mistake notebook learner flow', () => {
  beforeEach(() => { state.completed = []; });
  it('offers a useful starting point before any mistakes exist', () => {
    const navigate = vi.fn();
    render(<MistakeNotebookPage onNavigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find a practice session' }));
    expect(navigate).toHaveBeenCalledWith('practice');
  });
  it('saves reflections across remounts, filters mistakes, and launches the selected retry', () => {
    state.completed = [seed()];
    const view = render(<MistakeNotebookPage onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Why did I miss it?'), { target: { value: 'Distractor trap' } });
    fireEvent.change(screen.getByLabelText('My rule for next time'), { target: { value: 'Verify every qualifier.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    expect(screen.getByText('Reflection saved on this device.')).toBeVisible();
    expect(readMistakeReflections()['read-7'].rule).toBe('Verify every qualifier.');
    view.unmount();
    render(<MistakeNotebookPage onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('My rule for next time')).toHaveValue('Verify every qualifier.');
    fireEvent.change(screen.getByLabelText('Skill'), { target: { value: 'listening' } });
    expect(screen.getByText('No mistakes match these filters')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Review due selection (0)' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry this task' }));
    expect(screen.getByRole('heading', { name: 'Mistake Review' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start 10-minute session' })).toBeVisible();
  });
  it('reports a storage failure without claiming the reflection was saved', () => {
    state.completed = [seed()];
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<MistakeNotebookPage onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    expect(screen.getByText(/Could not save/)).toBeVisible();
    spy.mockRestore();
  });
});
