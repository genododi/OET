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
