import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DesktopWorkspace } from './DesktopWorkspace';
import type { DesktopInfo, StartupUpdateStatus } from '../lib/desktop';

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

it('keeps a completed check when an older initial workspace reply arrives later', async () => {
  let listener: ((value: StartupUpdateStatus) => void) | undefined;
  let resolveInfo!: (value: DesktopInfo) => void;
  vi.stubGlobal('oetDesktop', {
    info: () => new Promise<DesktopInfo>(resolve => { resolveInfo = resolve; }),
    checkUpdates: vi.fn(),
    onUpdateStatus: (callback: (value: StartupUpdateStatus) => void) => { listener = callback; return () => {}; },
  });
  const view = render(<DesktopWorkspace><h2>Practice</h2></DesktopWorkspace>);
  act(() => listener?.({state:'current',checking:false,message:'Startup check complete.'}));
  await act(async () => resolveInfo({ profile: null, profiles: [], offline: true,
    updates: {state:'checking',checking:true,message:'Checking for updates…'},
  }));
  expect(screen.getByText('Startup check complete.')).toBeVisible();
  expect(screen.getByRole('button', {name:'Check again'})).toBeEnabled();
  expect(screen.queryByText('Checking for updates…')).toBeNull();
  view.unmount();
});
