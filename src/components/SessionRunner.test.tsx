import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionConfig } from '../types/session';
import { SessionRunner } from './SessionRunner';

const timedConfig: SessionConfig = {
  id: 'timed-expiry-regression',
  kind: 'practice',
  title: 'Timed expiry regression',
  subtitle: 'A one-second persistence check',
  durationMinutes: 1 / 60,
  subtests: ['reading'],
  tasks: [
    {
      id: 'timed-intro',
      subtest: 'intro',
      title: 'Introduction',
      instructions: 'Complete the timed item.',
    },
    {
      id: 'timed-read-1',
      subtest: 'reading',
      title: 'Part B — timed item',
      instructions: 'Choose the best answer.',
      prompt: 'Which action is required?',
      options: [
        { id: 'timed-a', label: 'Escalate now', correct: true, explanation: 'Supported.' },
        { id: 'timed-b', label: 'Wait', correct: false, explanation: 'Unsafe delay.' },
        { id: 'timed-c', label: 'Discharge', correct: false, explanation: 'Not supported.' },
      ],
    },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('timed session completion', () => {
  it('persists the attempt exactly once when time expires', async () => {
    vi.useFakeTimers();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');

    render(<SessionRunner config={timedConfig} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /start .*minute session/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByRole('heading', { name: 'Session complete' })).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('oet-study-partner-progress') ?? '{}');
    expect(saved.completed).toHaveLength(1);
    expect(saved.completed[0]).toMatchObject({
      id: 'timed-expiry-regression',
      review: { overallPercent: 0 },
    });
    expect(storageWrite).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(storageWrite).toHaveBeenCalledTimes(1);
  });
});
