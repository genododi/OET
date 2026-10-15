import listening1 from '../../public/benchmark/questions/listening-1.json';
import listening2 from '../../public/benchmark/questions/listening-2.json';
import reading6 from '../../public/benchmark/questions/reading-6.json';
import { cleanup, within, fireEvent, render, screen } from '@testing-library/react';
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
  await screen.findByRole('textbox', { name: 'Question 1' });
  fireEvent.change(await screen.findByRole('textbox', { name: 'Question 1' }), { target: { value: 'my attempt' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show answer for Question 1' }));
  expect(screen.getByText('Printed answer:').parentElement).toHaveTextContent(catalog.entries[0].answers!['1']);
  expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('my attempt');
  view.rerender(<BenchmarkPage itemId="listening-2" onNavigate={vi.fn()} />);
  expect(await screen.findByRole('textbox', { name: 'Question 1' })).toHaveValue('');
  view.rerender(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  expect(await screen.findByRole('textbox', { name: 'Question 1' })).toHaveValue('my attempt');
  expect(screen.getByText('1 of 24 answered')).toBeVisible();
});

it('uses the original MP3 source with a Safari format hint and never substitutes missing recordings', async () => {
  const view = render(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
  await screen.findByRole('textbox', { name: 'Question 1' });
  expect(view.container.querySelector('audio source')).toHaveAttribute('type', 'audio/mpeg');
  expect(view.container.querySelector('audio source')).toHaveAttribute('src', expect.stringContaining('/test-01.mp3'));
  view.rerender(<BenchmarkPage itemId="listening-10" onNavigate={vi.fn()} />);
  expect(view.container.querySelector('audio')).toBeNull();
  expect(screen.getByText(/no recording for Test 10/)).toBeVisible();
  await screen.findByText(/The questions could not load/);
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
  const first = await screen.findByRole('group', { name: 'Part A · Question 1' });
  expect(within(first).getByRole('textbox')).toHaveAccessibleDescription('Onset of symptoms: ____');
  expect(screen.getByText(/Patient Jack Thatch/)).toBeVisible();
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

it('guides Benchmark Writing through reading, drafting and a separate review step', async () => {
  render(<BenchmarkPage itemId="writing-1" onNavigate={vi.fn()} />);
  expect(await screen.findByRole('heading', { name: 'Step 1 · Read the case notes and task' })).toBeVisible();
  expect(screen.getByRole('link', { name: /Open original · page/ })).toBeVisible();
  expect(screen.getByText(/Complete source paper/)).toBeVisible();
  expect(screen.queryByText('edubenchmark.com/oet-writing-correction')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Your letter' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start writing →' })).toBeDisabled();
});

it('gives Benchmark Speaking a timed preparation, live role-play and review sequence', () => {
  render(<BenchmarkPage itemId="speaking" onNavigate={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Step 1 · Prepare the role-play' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Step 2 · Role-play and record' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Step 3 · Review the conversation' })).toBeVisible();
  expect(screen.getByText('GP consultation · Unexpected pregnancy')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Record speaking response' })).toBeVisible();
  expect(screen.getByLabelText('Transcript or review notes')).toBeVisible();
  expect(screen.getByText('Listen to Benchmark’s human role-play examples')).toBeVisible();
});

it('rejects a question file belonging to another paper without overwriting saved work', async () => {
  localStorage.setItem('oet-benchmark-v1:listening-2', JSON.stringify({ 'A-1': 'saved' }));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/questions/') ? questions('listening-1.json') : { pages: [{ number: 1, text: 'Complete source paper' }] } })));
  render(<BenchmarkPage itemId="listening-2" onNavigate={vi.fn()} />);
  await screen.findByText(/The questions could not load/);
  expect(screen.queryByRole('textbox', { name: 'Question 1' })).toBeNull();
  expect(localStorage.getItem('oet-benchmark-v1:listening-2')).toContain('saved');
});

it('synchronises reading passages and questions and expands the paper without clearing answers', async () => {
  render(<BenchmarkPage itemId="reading-6" onNavigate={vi.fn()} />);
  await screen.findByRole('article', { name: 'Part A · Question 1' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Question 1' }), { target: { value: 'D' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Reading passage part' }), { target: { value: 'B' } });
  expect(screen.getByRole('button', { name: 'Part B' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Complete reading text · Part B')).toHaveTextContent('The shocking abuse in our nursing homes');
  expect(screen.getByRole('article', { name: 'Part B · Question 1' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Expand paper' }));
  expect(screen.getByRole('button', { name: 'Show paper beside answers' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Part A' }));
  expect(screen.getByRole('combobox', { name: 'Reading passage part' })).toHaveValue('A');
  expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('D');
});

it('moves to the next empty blank and keeps audio attached when changing worksheet parts', async () => {
  const scroll = vi.fn();
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    const view = render(<BenchmarkPage itemId="listening-1" onNavigate={vi.fn()} />);
    const first = await screen.findByRole('textbox', { name: 'Question 1' });
    const audio = view.container.querySelector('audio');
    fireEvent.change(first, { target: { value: 'test answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next unanswered ↓' }));
    expect(screen.getByRole('textbox', { name: 'Question 2' })).toHaveFocus();
    expect(scroll).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Show answer for Question 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Part B' }));
    expect(view.container.querySelector('audio')).toBe(audio);
    fireEvent.click(screen.getByRole('button', { name: 'Part A' }));
    expect(screen.queryByText('Printed answer:')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Question 1' })).toHaveValue('test answer');
  } finally { HTMLElement.prototype.scrollIntoView = original; }
});
