import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DesktopWorkspace } from './DesktopWorkspace';
import type { StartupUpdateStatus } from '../lib/desktop';

afterEach(() => vi.unstubAllGlobals());
it('keeps offline study usable while a startup check is running and shows its later result', async () => {
  let listener: ((value: StartupUpdateStatus) => void) | undefined;
  const unsubscribe = vi.fn();
  const profile = { id: 'test', name: 'Learner', createdAt: '2026-10-23T00:00:00Z' };
  vi.stubGlobal('oetDesktop', {
    info: async () => ({ profile, profiles: [profile], offline: true, updates: { state: 'checking', checking: true, message: 'Checking for new study files and app updates…' } }),
    checkUpdates: vi.fn(),
    onUpdateStatus: (callback: (value: StartupUpdateStatus) => void) => { listener = callback; return unsubscribe; },
  });
  const view = render(<DesktopWorkspace><h2>Saved practice</h2></DesktopWorkspace>);
  await screen.findByText('Checking for new study files and app updates…');
  expect(screen.getByRole('heading', {name:'Saved practice'})).toBeVisible();
  expect(screen.getByRole('button', {name:'Profiles & backups'})).toBeEnabled();
  expect(screen.getByRole('button', {name:'Checking…'})).toBeDisabled();
  act(() => listener?.({state:'offline',checking:false,message:'Local files checked. Keep studying offline.'}));
  expect(screen.getByText('Local files checked. Keep studying offline.')).toBeVisible();
  expect(screen.getByRole('button', {name:'Check again'})).toBeEnabled();
  view.unmount(); expect(unsubscribe).toHaveBeenCalledOnce();
});
