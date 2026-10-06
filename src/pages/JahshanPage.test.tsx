import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { JahshanPage } from './JahshanPage';
import collection from '../data/jahshanCollection.json';
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });
it('pairs the selected set with its indexed questions and never substitutes missing audio', () => {
  render(<JahshanPage />);
  expect(screen.getByText('Question page 39 · Answer page 49 in the Listening collection.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Listening set'), { target: { value: collection.groups.find(group => group.number === 8)!.id } });
  expect(screen.getByRole('alert')).toHaveTextContent('missing-audio notice');
  expect(screen.queryByLabelText('Recording')).not.toBeInTheDocument();
});
it('connects the actual local paper and plays only the selected original track', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ available: true }) }));
  const view = render(<JahshanPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect GENODODI' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('collection is connected'));
  expect(view.container.querySelector('audio')?.getAttribute('src')).toContain('3-Part%20A.mp3');
  expect(screen.getByTitle('Jahshan listening collection')).toHaveAttribute('src', expect.stringContaining('#page=39'));
  fireEvent.click(screen.getByRole('button', { name: 'Reading collection' }));
  expect(view.container.querySelector('audio')).toBeNull();
  expect(screen.getByTitle('Jahshan reading collection')).toHaveAttribute('src', expect.stringContaining('Reading%20Jahshan'));
});
it('keeps notes separate between listening sets', () => {
  render(<JahshanPage />);
  fireEvent.change(screen.getByLabelText('My numbered answers, evidence and corrections'), { target: { value: '1. heavy suitcase' } });
  fireEvent.change(screen.getByLabelText('Listening set'), { target: { value: collection.groups[3].id } });
  expect(screen.getByLabelText('My numbered answers, evidence and corrections')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Listening set'), { target: { value: collection.groups[2].id } });
  expect(screen.getByLabelText('My numbered answers, evidence and corrections')).toHaveValue('1. heavy suitcase');
});
