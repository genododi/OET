import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionTask } from '../types/session';
import ListeningSection from './ListeningSection';

const tasks: SessionTask[] = [1, 2].map((number) => ({
  id: `strict-lis-${number}`,
  subtest: 'listening',
  title: `Part C — item ${number}`,
  instructions: 'Listen once.',
  prompt: `Question ${number}`,
  audioSrc: `/audio/question-matched/lis-${number}.mp3`,
  options: [
    { id: `answer-${number}`, label: 'Supported answer', correct: true },
    { id: `distractor-${number}`, label: 'Distractor', correct: false },
  ],
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('continuous Listening playback', () => {
  it('cannot be stopped or restarted once a strict set begins', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const onPlaybackStart = vi.fn();

    render(
      <ListeningSection
        tasks={tasks}
        answers={{}}
        onAnswer={vi.fn()}
        revealed={{}}
        onReveal={vi.fn()}
        examMode
        onPlaybackStart={onPlaybackStart}
      />,
    );

    const button = screen.getByRole('button', { name: '▶ Play all audio once' });
    fireEvent.click(button);

    expect(onPlaybackStart).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Audio sequence playing…');
    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
