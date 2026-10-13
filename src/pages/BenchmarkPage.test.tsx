import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BenchmarkPage } from './BenchmarkPage';
import catalog from '../data/benchmarkCollection.json';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pages: [{ number: 1, text: 'Complete source paper' }] }) }));
});
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

it('preserves a learner response when revealing the correct printed key and keeps tests separate', async () => {
  const view = render(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  await screen.findByText('Complete source paper');
  fireEvent.change(screen.getByRole('textbox', { name: 'Question 1' }), { target: { value: 'my attempt' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show answer for Question 1' }));
  expect(screen.getByText('Printed answer:').parentElement).toHaveTextContent(catalog.entries[0].answers!['1']);
  expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('my attempt');
  view.rerender(<BenchmarkPage itemId="listening-2" onNavigate={vi.fn()} />);
  expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('');
  view.rerender(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('my attempt');
  await waitFor(() => expect(screen.getByText('Complete source paper')).toBeVisible());
});

it('uses the original MP3 source with a Safari format hint and never substitutes missing recordings', async () => {
  const view = render(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  await screen.findByText('Complete source paper');
  expect(view.container.querySelector('audio source')).toHaveAttribute('type', 'audio/mpeg');
  expect(view.container.querySelector('audio source')).toHaveAttribute('src', expect.stringContaining('/test-01.mp3'));
  view.rerender(<BenchmarkPage itemId="listening-10" onNavigate={vi.fn()} />);
  expect(view.container.querySelector('audio')).toBeNull();
  expect(screen.getByText(/no recording for Test 10/)).toBeVisible();
  await screen.findByText('Complete source paper');
});

it('shows the selected recording transcript, seeks by timestamp and rejects a different test script', async () => {
  const first = catalog.entries.find(entry => entry.id === 'listening-1')!;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/transcripts/') ? {
    trackId: first.id, sourceSha256: first.audio!.sha256, kind: 'automatic-transcription',
    segments: [{ start: 0, end: 5, text: 'Opening of Test 1.' }, { start: 65, end: 70, text: 'The consultation begins.' }],
  } : { pages: [{ number: 1, text: 'Complete source paper' }] } })));
  const view = render(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  await screen.findByText('Opening of Test 1.');
  expect(screen.getByRole('heading', { name: 'Recording transcript' })).toBeVisible();
  const audio = view.container.querySelector('audio')!;
  Object.defineProperty(audio, 'duration', { configurable: true, value: 300 });
  fireEvent.loadedMetadata(audio);
  fireEvent.click(screen.getByRole('button', { name: '1:05 The consultation begins.' }));
  expect(audio.currentTime).toBe(65);
  expect(screen.getByRole('button', { name: '1:05 The consultation begins.' })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('link', { name: 'Download transcript' })).toHaveAttribute('download', 'Listening Test 1-transcript.txt');
  view.rerender(<BenchmarkPage itemId="listening-2" onNavigate={vi.fn()} />);
  expect(screen.queryByText('Opening of Test 1.')).not.toBeInTheDocument();
  await screen.findByText(/The transcript for this recording is unavailable/);
  expect(screen.queryByText('The consultation begins.')).not.toBeInTheDocument();
});
