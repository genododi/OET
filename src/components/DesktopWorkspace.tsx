import { useEffect, useState, type ReactNode } from 'react';
import { isDesktop, type DesktopInfo, type StartupUpdateStatus } from '../lib/desktop';
import './desktopWorkspace.css';

export function DesktopWorkspace({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<DesktopInfo | null>(null);
  const [manage, setManage] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [updates, setUpdates] = useState<StartupUpdateStatus>();
  useEffect(() => {
    if (!isDesktop()) return;
    const api = window.oetDesktop!;
    const unsubscribe = api.onUpdateStatus?.(setUpdates);
    void api.info().then(value => { setInfo(value); setUpdates(value.updates); }).catch(error => setError(String(error)));
    return unsubscribe;
  }, []);
  if (!isDesktop()) return children;
  const api = window.oetDesktop!;
  const action = async (run: () => Promise<unknown>) => {
    if (busy) return; setBusy(true); setError('');
    try { await run(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(false); }
  };
  const picker = !info?.profile || manage;
  const updateNotice = updates && <div className={`desktop-update-notice desktop-update-${updates.state}`} role="status"><span>{updates.message}</span>{api.checkUpdates && <button type="button" disabled={updates.checking} onClick={() => { void api.checkUpdates!().then(setUpdates).catch(() => setUpdates({state:'unverified',checking:false,message:'The update check could not finish. You can keep studying offline.'})); }}>{updates.checking ? 'Checking…' : 'Check again'}</button>}</div>;
  return <>
    {info?.profile && <><div className="desktop-profile-bar"><div><span><strong>Offline on this Mac</strong> · {info.profile.name}</span>{!picker && updateNotice}</div><button type="button" onClick={() => { setManage(true); setNotice(''); }}>Profiles & backups</button></div>{children}</>}
    {picker && <div className="desktop-profile-overlay" role="dialog" aria-modal="true" aria-label="Offline study profiles"><section className="desktop-profile-card card">
      <span className="hero-eyebrow">OET STUDY · MAC APP</span><h1>{info?.profile ? 'Your study profiles' : 'Who is studying today?'}</h1>
      <p>Each profile keeps its own answers, letters, notes, conversations and progress on this Mac. No account or internet is needed.</p>
      {info?.build && <p className="meta" title={info.build.gitCommit}>App source: {info.build.gitCommit.slice(0, 7)} · Built {new Date(info.build.builtAt).toLocaleDateString()}</p>}
      {updateNotice}
      {info && <div className="desktop-profile-list">{info.profiles.map(profile => <button type="button" disabled={busy} key={profile.id} onClick={() => void action(async () => { if (profile.id === info.profile?.id) setManage(false); else await api.switchProfile(profile.id); })}><strong>{profile.name}</strong><span>{profile.id === info.profile?.id ? 'Continue studying →' : 'Open profile →'}</span></button>)}</div>}
      {!info && !error && <p role="status">Opening your offline workspace…</p>}
      {info && <form onSubmit={event => { event.preventDefault(); void action(async () => { const profile = await api.createProfile(name); await api.switchProfile(profile.id); }); }}><label htmlFor="desktop-profile-name">Create a new profile</label><div className="desktop-profile-create"><input id="desktop-profile-name" maxLength={60} value={name} placeholder="Your name" onChange={event => setName(event.target.value)} /><button className="btn btn-primary" disabled={busy || !name.trim()}>Create & start</button></div></form>}
      {info?.profile && <><div className="desktop-profile-tools"><button className="btn btn-secondary" disabled={busy || !name.trim()} onClick={() => void action(async () => { await api.renameProfile(name); setInfo(await api.info()); setName(''); setNotice('Profile renamed.'); })}>Rename current profile using name above</button><button className="btn btn-secondary" disabled={busy} onClick={() => void action(async () => { const data = Object.fromEntries(Object.keys(localStorage).filter(key => !key.includes('anthropic-key')).map(key => [key, localStorage.getItem(key)!])); if (await api.backup(data)) setNotice('Answers, drafts, settings and study history backed up.'); })}>Back up this profile</button><button className="btn btn-secondary" disabled={busy} onClick={() => void action(async () => { const data = await api.restore(); if (!data) return; for (const [key, value] of Object.entries(data)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value); setNotice('Backup imported. Existing saved entries were kept. Reopen this profile to refresh your study history.'); })}>Import a profile backup</button></div><p className="meta">Profiles separate saved study data; they are not password-protected accounts. Download voice recordings before leaving their recording screen.</p><button className="btn btn-primary" onClick={() => setManage(false)}>Back to studying</button></>}
      {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    </section></div>}
  </>;
}
