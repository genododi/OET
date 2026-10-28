import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecentMaterialsPage } from './RecentMaterialsPage';
import { readRecentMaterials } from '../lib/recentMaterials';
const local = { id: 'local-file', sha256: 'a'.repeat(64), filename: 'Local writing task.pdf', format: 'pdf', bytes: 200, collection: 'AMR', skills: ['writing'], addedAt: '2026-10-20T00:00:00Z', sources: [{ kind: 'local', label: 'Local resources' }] };
const telegram = { ...local, id: 'telegram-file', sha256: 'b'.repeat(64), filename: 'New listening recording.mp3', format: 'mp3', skills: ['listening'], addedAt: '2026-10-28T00:00:00Z', sources: [{ kind: 'telegram', label: 'Telegram · Study group' }] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows newest first, filters across sources and opens the right source workspace', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, files: [local, telegram] }) }));
  const navigate = vi.fn(); render(<RecentMaterialsPage onNavigate={navigate} />);
  await screen.findByText(telegram.filename);
  expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual([telegram.filename, local.filename]);
  fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'telegram' } });
  expect(screen.queryByText(local.filename)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: `Open ${telegram.filename}` }));
  expect(navigate).toHaveBeenCalledWith('materials', 'telegram-file');
  fireEvent.change(screen.getByLabelText('Skill'), { target: { value: 'reading' } });
  expect(screen.getByText('No matching files')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  fireEvent.change(screen.getByLabelText('Search files'), { target: { value: 'AMR' } });
  fireEvent.change(screen.getByLabelText('File type'), { target: { value: 'pdf' } });
  expect(screen.getByText(local.filename)).toBeVisible();
  expect(screen.queryByText(telegram.filename)).toBeNull();
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
