import listening1 from '../../public/benchmark/questions/listening-1.json';
import listening2 from '../../public/benchmark/questions/listening-2.json';
import reading6 from '../../public/benchmark/questions/reading-6.json';
import { cleanup, within, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BenchmarkPage } from './BenchmarkPage';
import catalog from '../data/benchmarkCollection.json';

function questions(url: string) { return url.endsWith('listening-2.json') ? listening2 : url.endsWith('reading-6.json') ? reading6 : listening1; }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/questions/') ? questions(url) : { pages: [{ number: 1, text: 'Complete source paper' }] } })));
});
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

it('preserves a learner response when revealing the correct printed key and keeps tests separate', async () => {
  const view = render(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  await screen.findByText('Complete source paper');
  fireEvent.change(await screen.findByRole('textbox', { name: 'Question 1' }), { target: { value: 'my attempt' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show answer for Question 1' }));
  expect(screen.getByText('Printed answer:').parentElement).toHaveTextContent(catalog.entries[0].answers!['1']);
  expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('my attempt');
  view.rerender(<BenchmarkPage itemId="listening-2" onNavigate={vi.fn()} />);
  expect(await screen.findByRole('textbox', { name: 'Question 1' })).toHaveValue('');
  view.rerender(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  expect(await screen.findByRole('textbox', { name: 'Question 1' })).toHaveValue('my attempt');
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
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/questions/') ? questions(url) : url.includes('/transcripts/') ? {
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

it('keeps the actual question, answer control and key in one row across all parts', async () => {
  render(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  const first = await screen.findByRole('article', { name: 'Part A · Question 1' });
  expect(within(first).getByText(/Onset of symptoms/)).toBeVisible();
  fireEvent.change(within(first).getByRole('textbox'), { target: { value: 'my answer' } });
  fireEvent.click(within(first).getByRole('button', { name: 'Show answer for Question 1' }));
  expect(within(first).getByText('Printed answer:').parentElement).toHaveTextContent(catalog.entries[0].answers!['1']);
  fireEvent.click(screen.getByRole('button', { name: 'Part B' }));
  const b = screen.getByRole('article', { name: 'Part B · Question 25' });
  expect(within(b).getByText(/What does the GP ask the patient to confirm/)).toHaveTextContent('St Petersburgh');
  fireEvent.change(within(b).getByRole('combobox'), { target: { value: 'C' } });
  fireEvent.click(screen.getByRole('button', { name: 'Part C' }));
  expect(screen.getByRole('article', { name: 'Part C · Question 31' })).toHaveTextContent('foot conditions');
  fireEvent.click(screen.getByRole('button', { name: 'Part A' }));
  expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('my answer');
  expect(JSON.parse(localStorage.getItem('oet-benchmark-v1:listening-1')!)).toMatchObject({ 'A-1': 'my answer', 'B-25': 'C' });
});

it('matches reading questions by part and explains the source’s repeated numbering', async () => {
  render(<BenchmarkPage itemId="reading-6" onNavigate={vi.fn()} />);
  await screen.findByRole('article', { name: 'Part A · Question 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Part B' }));
  const row = screen.getByRole('article', { name: 'Part B · Question 2' });
  expect(row).toHaveTextContent('What two ideas are there about education');
  expect(row).toHaveTextContent('Paper label: 1. Saved as question 2 for Text 2.');
  expect(within(row).getByRole('combobox', { name: 'Question 2' })).toBeVisible();
  expect(within(row).getByRole('link')).toHaveAttribute('href', expect.stringContaining('#page=110'));
  expect(within(row).queryByRole('button', { name: /Show answer/ })).toBeNull();
});

it('rejects a question file belonging to another paper without overwriting saved work', async () => {
  localStorage.setItem('oet-benchmark-v1:listening-2', JSON.stringify({ 'A-1': 'saved' }));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/questions/') ? questions('listening-1.json') : { pages: [{ number: 1, text: 'Complete source paper' }] } })));
  render(<BenchmarkPage itemId="listening-2" onNavigate={vi.fn()} />);
  await screen.findByText(/The questions could not load/);
  expect(screen.queryByRole('textbox', { name: 'Question 1' })).toBeNull();
  expect(localStorage.getItem('oet-benchmark-v1:listening-2')).toContain('saved');
});
