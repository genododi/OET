import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayer } from './AudioPlayer';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('single-use Listening playback', () => {
  it('consumes the play after one successful start and remains locked after remount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const onExamPlay = vi.fn();

    const { unmount } = render(
      <AudioPlayer
        src="/audio/real-listening/source-sample-test-1.mp3"
        label="Original OET sample"
        examMode
        onExamPlay={onExamPlay}
      />,
    );

    const firstPlay = await screen.findByRole('button', {
      name: 'Play Original OET sample once',
    });
    fireEvent.click(firstPlay);

    await waitFor(() => expect(onExamPlay).toHaveBeenCalledTimes(1));
    expect(play).toHaveBeenCalledTimes(1);
    expect(firstPlay).toBeDisabled();
    expect(firstPlay).toHaveTextContent('Audio playing…');

    unmount();
    render(
      <AudioPlayer
        src="/audio/real-listening/source-sample-test-1.mp3"
        label="Original OET sample"
        examMode
        examPlayed
        onExamPlay={onExamPlay}
      />,
    );

    const consumedPlay = await screen.findByRole('button', {
      name: 'Play Original OET sample once',
    });
    expect(consumedPlay).toBeDisabled();
    expect(consumedPlay).toHaveTextContent('Playback used');
    fireEvent.click(consumedPlay);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
