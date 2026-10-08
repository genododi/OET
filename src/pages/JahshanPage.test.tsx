import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { JahshanPage } from './JahshanPage';
import * as gateway from '../lib/localSourceGateway';
import collection from '../data/jahshanCollection.json';
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No transcript fixture'))); });
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
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
  fireEvent.click(screen.getByText('Connect through the local app'));
  fireEvent.click(screen.getByRole('button', { name: 'Connect GENODODI' }));
  await waitFor(() => expect(screen.getByText('GENODODI collection is connected.')).toBeInTheDocument());
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

it('uses selected files on the hosted page without contacting the HTTP gateway', () => {
  vi.spyOn(gateway, 'canConnectLocalSource').mockReturnValue(false);
  const fetchSpy = vi.fn().mockRejectedValue(new Error('No transcript fixture'));
  vi.stubGlobal('fetch', fetchSpy);
  const createUrl = vi.fn().mockReturnValue('blob:https://genododi.github.io/local-track');
  vi.stubGlobal('URL', { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
  const view = render(<JahshanPage />);
  expect(screen.queryByRole('button', { name: 'Connect GENODODI' })).not.toBeInTheDocument();
  const track = collection.files.find(file => file.relativePath === 'Audio/3- Sample Test 1/3-Part A.mp3')!;
  const file = new File(['test fixture'], track.name, { type: 'audio/mpeg' });
  Object.defineProperties(file, { size: { value: track.bytes }, webkitRelativePath: { value: `Jahshan/OET Listening/${track.relativePath}` } });
  fireEvent.change(screen.getByLabelText('Choose Jahshan folder'), { target: { files: [file] } });
  expect(view.container.querySelector('audio')).toHaveAttribute('src', 'blob:https://genododi.github.io/local-track');
  expect(screen.getByText(/1 matching files connected/)).toBeInTheDocument();
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy.mock.calls[0][0]).toMatch(/jahshan-transcripts\/[^/]+\.json$/);
  expect(fetchSpy.mock.calls.some(call => String(call[0]).includes('127.0.0.1:4318'))).toBe(false);
});
