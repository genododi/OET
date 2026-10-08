import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { JahshanListeningPlayer } from './JahshanListeningPlayer';
import collection from '../data/jahshanCollection.json';
const tracks = collection.files.filter(file => file.relativePath.startsWith('Audio/3- Sample Test 1/'));
const data = (track: typeof tracks[number], text: string) => ({ trackId: track.id, sourceSha256: track.sha256, kind: 'automatic-transcription', segments: [{ start: 0, end: 5, text }, { start: 5, end: 10, text: 'Second sentence.' }] });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('loads the matching transcript, highlights playback and seeks by timestamp', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data(tracks[0], 'First original sentence.') }));
  const view = render(<JahshanListeningPlayer track={tracks[0]} audioUrl="blob:original" />);
  await screen.findByText('First original sentence.');
  const audio = view.container.querySelector('audio')!;
  fireEvent.timeUpdate(audio, { target: { currentTime: 6 } });
  expect(screen.getByRole('button', { name: '0:05 Second sentence.' })).toHaveAttribute('aria-current', 'true');
  fireEvent.click(screen.getByRole('button', { name: '0:00 First original sentence.' }));
  expect(audio.currentTime).toBe(0);
  expect(screen.getByRole('link', { name: 'Download transcript' })).toHaveAttribute('download', expect.stringContaining('-transcript.txt'));
});
it('clears the old script immediately when the recording changes and rejects a mismatched transcript', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => data(tracks[0], 'Old track sentence.') }).mockResolvedValueOnce({ ok: true, json: async () => data(tracks[0], 'Wrong recording text.') });
  vi.stubGlobal('fetch', fetcher);
  const view = render(<JahshanListeningPlayer track={tracks[0]} />);
  await screen.findByText('Old track sentence.');
  view.rerender(<JahshanListeningPlayer track={tracks[1]} />);
  expect(screen.queryByText('Old track sentence.')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('unavailable'));
  expect(screen.queryByText('Wrong recording text.')).not.toBeInTheDocument();
});
