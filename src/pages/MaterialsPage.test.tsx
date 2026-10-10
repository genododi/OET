import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MaterialsPage } from './MaterialsPage';
import catalog from '../data/desktopMaterials.generated.json';
const task = catalog.files.find(file => file.filename === 'Sample Writing Task 1.docx')!;
beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: 'Darren Walker — supplied case notes' }) })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('supplied source practice', () => {
  it('filters the complete AMR collection and searches original filenames', () => {
    render(<MaterialsPage onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Collection'), { target: { value: 'AMR' } });
    expect(screen.getByText(/35 files · Originals/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search your files'), { target: { value: 'Sample Writing Task 1' } });
    expect(screen.getByText(/1 files · Originals/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: task.filename })).toBeInTheDocument();
  });
  it('restores a writing draft after reload and isolates it from other skill responses', async () => {
    const first = render(<MaterialsPage itemId={task.id} onNavigate={vi.fn()} />);
    await screen.findByText('Darren Walker — supplied case notes');
    fireEvent.change(screen.getByLabelText('Your letter'), { target: { value: 'Dear Dr Booker, I am referring Mr Walker.' } });
    fireEvent.change(screen.getByLabelText('Page / task, corrections and next steps'), { target: { value: 'Task 1: improve the opening.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark as reviewed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reading' }));
    expect(screen.getByLabelText('Your numbered answers')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Your numbered answers'), { target: { value: '1. Evidence in paragraph 2' } });
    first.unmount();
    render(<MaterialsPage itemId={task.id} onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Your letter')).toHaveValue('Dear Dr Booker, I am referring Mr Walker.');
    expect(screen.getByLabelText('Page / task, corrections and next steps')).toHaveValue('Task 1: improve the opening.');
    expect(screen.getByRole('button', { name: 'Reviewed ✓ — reopen' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your letter'), { target: { value: 'Revised draft' } });
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeInTheDocument();
  });
  it('retains access to the original when text cannot be loaded', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    render(<MaterialsPage itemId={task.id} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Text could not be loaded'));
    expect(screen.getByRole('link', { name: /Download original/ })).toHaveAttribute('href', expect.stringContaining(task.assetPath));
  });
  it('labels supplied listening work honestly and links to real audio tests', async () => {
    const navigate = vi.fn();
    render(<MaterialsPage itemId={task.id} onNavigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Listening' }));
    expect(screen.getByText(/no audio recordings/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open real listening recordings' }));
    expect(navigate).toHaveBeenCalledWith('listening');
    await screen.findByText('Darren Walker — supplied case notes');
  });
});

it('opens PDF text first and remembers the original page without changing the draft', async () => {
  const pdf = catalog.files.find(file => file.collection === 'AMR' && file.format === 'pdf')!;
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ text: 'Complete source', pages: [
    { number: 1, text: 'First page case notes', extraction: 'text' },
    { number: 2, text: 'Scanned second page instructions', extraction: 'ocr' },
  ] }) } as Response);
  const view = render(<MaterialsPage itemId={pdf.id} onNavigate={vi.fn()} />);
  await screen.findByText('First page case notes');
  expect(view.container.querySelector('iframe')).toBeNull();
  fireEvent.change(screen.getByLabelText('Your letter'), { target: { value: 'Saved letter' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Scanned second page instructions')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open original · page 2 ↗' })).toHaveAttribute('href', expect.stringContaining('#page=2'));
  expect(screen.getByLabelText('Your letter')).toHaveValue('Saved letter');
  view.unmount();
  render(<MaterialsPage itemId={pdf.id} onNavigate={vi.fn()} />);
  await screen.findByText('Scanned second page instructions');
  expect(screen.getByLabelText('Source page')).toHaveValue('2');
  fireEvent.click(screen.getByLabelText('Show all pages'));
  expect(screen.getByText('First page case notes')).toBeVisible();
  expect(screen.getByText('Scanned second page instructions')).toBeVisible();
});

it('plays only the matching audio selected by the learner and releases it on leaving', async () => {
  const create = vi.fn().mockReturnValue('blob:local-matching-audio');
  const revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  const view = render(<MaterialsPage itemId={task.id} onNavigate={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Listening' }));
  expect(view.container.querySelector('audio')).toBeNull();
  fireEvent.change(screen.getByLabelText('Choose matching audio'), { target: { files: [new File(['original recording'], 'matching-test.mp3', { type: 'audio/mpeg' })] } });
  expect(view.container.querySelector('audio')).toHaveAttribute('src', 'blob:local-matching-audio');
  expect(view.container.querySelector('audio')).not.toHaveAttribute('controls');
  expect(screen.getByRole('button', { name: 'Play recording' })).toBeVisible();
  await screen.findByText('Darren Walker — supplied case notes');
  fireEvent.click(screen.getByRole('button', { name: 'Writing' }));
  expect(revoke).toHaveBeenCalledWith('blob:local-matching-audio');
  expect(view.container.querySelector('audio')).toBeNull();
});
