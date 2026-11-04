import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecentMaterialsPage } from './RecentMaterialsPage';
import { readRecentMaterials } from '../lib/recentMaterials';
const local = { id: 'local-file', sha256: 'a'.repeat(64), filename: 'Local writing task.pdf', format: 'pdf', bytes: 200, collection: 'AMR', skills: ['writing'], addedAt: '2026-10-20T00:00:00Z', sources: [{ kind: 'local', label: 'Local resources' }] };
const telegram = { ...local, id: 'telegram-file', sha256: 'b'.repeat(64), filename: 'New listening recording.mp3', format: 'mp3', skills: ['listening'], addedAt: '2026-10-28T00:00:00Z', sources: [{ kind: 'telegram', label: 'Telegram · Study group' }] };
beforeEach(() => {sessionStorage.clear();localStorage.clear();});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows newest first, filters across sources and opens the right source workspace', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, files: [local, telegram] }) }));
  const navigate = vi.fn(); render(<RecentMaterialsPage onNavigate={navigate} />);
  await screen.findByText(telegram.filename);
  expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual([telegram.filename, local.filename]);
  fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'telegram' } });
  expect(screen.queryByText(local.filename)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: `Open ${telegram.filename}` }));
  expect(navigate).toHaveBeenCalledWith('materials', 'telegram-file', 'recent');
  fireEvent.click(screen.getByLabelText('Reading'));
  expect(screen.getByText('No matching files')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'AMR' } });
  fireEvent.change(screen.getByLabelText('File type'), { target: { value: 'pdf' } });
  expect(screen.getByText(local.filename)).toBeVisible();
  expect(screen.queryByText(telegram.filename)).toBeNull();
});
it('restores the filtered, expanded list and scroll position after opening a file', async () => {
  const files = Array.from({ length: 45 }, (_, i) => ({ ...telegram, id: `file-${i}`, sha256: i.toString(16).padStart(64, '0'), filename: `Listening ${i}.mp3` }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, files }) }));
  const scroll = vi.fn(); vi.stubGlobal('scrollTo', scroll);
  const first = render(<RecentMaterialsPage onNavigate={vi.fn()} />);
  await screen.findByText('Listening 0.mp3');
  fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'telegram' } });
  fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'Listening' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show 30 more files' }));
  vi.stubGlobal('scrollY', 1200);
  fireEvent.click(screen.getByRole('button', { name: 'Open Listening 40.mp3' }));
  first.unmount(); scroll.mockClear();
  render(<RecentMaterialsPage onNavigate={vi.fn()} />);
  await screen.findByText('Listening 40.mp3');
  expect(screen.getByLabelText('Source')).toHaveValue('telegram');
  expect(screen.getByLabelText('Search files')).toHaveValue('Listening');
  await waitFor(() => expect(scroll).toHaveBeenCalledWith({ top: 1200, behavior: 'instant' }));
});
it('keeps the main library accessible after an offline list failure and can retry', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(Error('Offline')).mockResolvedValueOnce({ ok: true, json: async () => ({ version: 1, files: [local] }) });
  vi.stubGlobal('fetch', fetcher); const navigate = vi.fn(); render(<RecentMaterialsPage onNavigate={navigate} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Open all study files' })); expect(navigate).toHaveBeenCalledWith('materials');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByText(local.filename);
});
it('rejects malformed or duplicate manifest entries instead of mislabelling arrivals', () => {
  expect(() => readRecentMaterials({ version: 1, files: [local, local] })).toThrow();
  expect(() => readRecentMaterials({ version: 1, files: [{ ...local, addedAt: 'yesterday' }] })).toThrow();
});

it('combines four skill checkboxes with completion filters and retains both on return',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({version:1,files:[local,telegram]})}));
 const view=render(<RecentMaterialsPage onNavigate={vi.fn()}/>);await screen.findByText(local.filename);
 fireEvent.click(screen.getByLabelText('Writing'));expect(screen.queryByText(telegram.filename)).toBeNull();
 fireEvent.click(screen.getByLabelText('Listening'));expect(screen.getByText(telegram.filename)).toBeVisible();
 fireEvent.click(screen.getByLabelText(`Done: ${local.filename}`));
 fireEvent.change(screen.getByLabelText('Filter by completion'),{target:{value:'undone'}});expect(screen.queryByText(local.filename)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:`Open ${telegram.filename}`}));view.unmount();
 render(<RecentMaterialsPage onNavigate={vi.fn()}/>);await screen.findByText(telegram.filename);
 expect(screen.getByLabelText('Writing')).toBeChecked();expect(screen.getByLabelText('Listening')).toBeChecked();expect(screen.getByLabelText('Filter by completion')).toHaveValue('undone');
});
