import { useEffect, useState } from 'react';
import { isDesktop } from '../lib/desktop';
import { applyWebAppUpdate, checkWebAppUpdate, standaloneApp, webAppError, webAppRegistration } from '../lib/webApp';
import { missingOfflineAssets, removeStudyPack, savedStudyPacks } from '../lib/offlineStudy';
import { createWebProfile, importProfileBackup, profileBackup, selectWebProfile, webProfiles } from '../lib/webProfiles';
import './webApp.css';

function BrowserProfiles() {
  const [initial] = useState(() => { try { return { profiles: webProfiles(), message: '' }; } catch (error) { return { profiles: undefined, message: String(error) }; } });
  const [profiles, setProfiles] = useState(initial.profiles);
  const [name, setName] = useState('');
  const [message, setMessage] = useState(initial.message);
  const backup = () => {
    try {
      const data = profileBackup(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `OET-${data.profileName.replace(/[^\w-]+/g, '-')}-backup.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage('Backup prepared. Keep the downloaded file in Files. API keys and audio downloads are not included.');
    } catch (error) { setMessage(String(error)); }
  };
  return <section className="card webapp-step"><span className="hero-eyebrow">3 · YOUR OWN STUDY SPACE</span><h2>Local profiles & backups</h2><p>Each profile keeps separate answers, letters, notes and progress on this device. Your existing browser work is kept in “My study profile”. No sign-in is needed.</p>
    {profiles && <><div className="webapp-profiles">{profiles.profiles.map(profile => <button className="btn btn-secondary" type="button" key={profile.id} aria-pressed={profile.id === profiles.active} onClick={() => {
      if (profile.id === profiles.active || !window.confirm('Finish your work and download any voice recording before switching profiles. Switch now?')) return;
      try { selectWebProfile(profile.id); window.location.reload(); } catch (error) { setMessage(String(error)); }
    }}>{profile.name}{profile.id === profiles.active ? ' · Current' : ''}</button>)}</div><form className="webapp-profile-form" onSubmit={event => {
      event.preventDefault(); try { createWebProfile(name); setProfiles(webProfiles()); setName(''); setMessage('New profile created. Choose it above to start.'); } catch (error) { setMessage(String(error)); }
    }}><label htmlFor="web-profile-name">New profile name<input id="web-profile-name" value={name} onChange={event => setName(event.target.value)} maxLength={60} autoComplete="off" placeholder="Your name" /></label><button className="btn btn-primary" disabled={!name.trim()}>Create profile</button></form>
      <div className="webapp-actions"><button className="btn btn-secondary" onClick={backup}>Export this profile’s backup</button><label className="webapp-file">Import a backup<input type="file" accept="application/json,.json" onChange={event => {
        const file = event.target.files?.[0]; if (!file) return;
        if (file.size > 8000000) { setMessage('Choose a profile backup smaller than 8 MB.'); return; }
        void file.text().then(text => importProfileBackup(JSON.parse(text))).then(count => setMessage(`${count} missing entries imported. Existing answers were kept. Reopen this profile to refresh the study screens.`)).catch(error => setMessage(String(error)));
      }} /></label></div></>}
    {message && <p role="status">{message}</p>}<p className="meta">Profiles separate study data; they are not password-protected. iPhone, iPad and Mac keep their own data. Move study work with a backup. Voice recordings must be downloaded separately.</p>
  </section>;
}

export function WebAppPage() {
  const [installed, setInstalled] = useState(standaloneApp);
  const [controlled, setControlled] = useState(() => !!navigator.serviceWorker?.controller);
  const [waiting, setWaiting] = useState(false);
  const [coreError, setCoreError] = useState(webAppError);
  const [packs, setPacks] = useState(savedStudyPacks);
  const [missing, setMissing] = useState<Record<string, number>>({});
  const [storage, setStorage] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sync = () => { setInstalled(standaloneApp()); setControlled(!!navigator.serviceWorker?.controller); setWaiting(!!webAppRegistration()?.waiting); setCoreError(webAppError()); setPacks(savedStudyPacks()); };
  useEffect(() => {
    window.addEventListener('oet-webapp-change', sync); window.addEventListener('oet-offline-packs-change', sync);
    navigator.serviceWorker?.addEventListener('controllerchange', sync);
    void navigator.serviceWorker?.ready.then(sync);
    void navigator.storage?.estimate?.().then(value => { if (value.usage !== undefined && value.quota !== undefined) setStorage(`${Math.round(value.usage / 1000000)} MB used of about ${Math.round(value.quota / 1000000)} MB available to this app`); });
    return () => { window.removeEventListener('oet-webapp-change', sync); window.removeEventListener('oet-offline-packs-change', sync); navigator.serviceWorker?.removeEventListener('controllerchange', sync); };
  }, []);
  useEffect(() => { let alive = true; void Promise.all(packs.map(async pack => [pack.id, (await missingOfflineAssets(pack.assets)).filter(a => !a.optional).length] as const)).then(entries => { if (alive) setMissing(Object.fromEntries(entries)); }).catch(() => {}); return () => { alive = false; }; }, [packs]);
  if (isDesktop()) return <section className="card"><h2>Use OET Study on iPhone or iPad</h2><p>On your iPhone or iPad, open <a href="https://genododi.github.io/OET/#app" target="_blank" rel="noopener noreferrer">genododi.github.io/OET/#app</a> in Safari. Add it to your Home Screen using the Share menu. Your Mac profiles remain in this Mac app.</p></section>;
  return <div className="page-section webapp-page">
    <section className="card webapp-hero"><img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="OET Study stethoscope icon" width={80} height={80} /><div><span className="hero-eyebrow">OET STUDY · IPHONE & IPAD</span><h2>Your study app, without a developer account</h2><p>Install from Safari, choose the tests to keep offline, and study with your own local profile. No App Store, certificate or weekly signing is needed.</p><p className="webapp-status" role="status">{installed ? '✓ Opened as a Home Screen app' : 'Open this page in Safari on your iPhone or iPad to install'} · {controlled ? 'Core app saved for offline use' : coreError || 'Core app preparing — keep this page open while online'}</p></div></section>
    <section className="card webapp-step"><span className="hero-eyebrow">1 · INSTALL ONCE</span><h2>Add OET Study to your Home Screen</h2><ol className="webapp-install-steps"><li>Open <strong>genododi.github.io/OET</strong> in <strong>Safari</strong>.</li><li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. If Share is inside the page menu, open that menu first.</li><li>Keep <strong>Open as Web App</strong> enabled if shown. Tap <strong>Add</strong>.</li><li>Open the stethoscope icon. While online, save a test below its player or paper before using Airplane Mode.</li></ol><p className="meta">The initial install and each new download need internet. Saved tests and local drafts work offline. External websites and online services need a connection.</p></section>
    <section className="card webapp-step"><span className="hero-eyebrow">2 · KEEP THE TESTS YOU NEED</span><h2>Saved offline tests</h2><p>Open a test in Benchmark, Jahshan or My OET & AMR Files, then choose <strong>Save this test for offline study</strong>. Download one selection at a time with the app in the foreground.</p><div className="webapp-actions"><a className="btn btn-primary" href="#benchmark">Benchmark tests</a><a className="btn btn-secondary" href="#jahshan">Jahshan collection</a><a className="btn btn-secondary" href="#materials">My OET & AMR files</a></div>
      {packs.length ? <ul className="webapp-pack-list">{packs.map(pack => <li key={pack.id}><div><a href={pack.route}>{pack.title}</a><p className="meta">{missing[pack.id] === undefined ? 'Checking saved files…' : missing[pack.id] ? `${missing[pack.id]} required file(s) still needed — reopen and finish saving` : '✓ Required practice files saved on this device'}</p></div><button className="btn btn-ghost" onClick={() => { if (!window.confirm('Remove only this test’s downloaded files? Your answers, drafts and profiles will stay.')) return; void removeStudyPack(pack.id).then(sync).catch(error => setMessage(String(error))); }}>Remove download</button></li>)}</ul> : <p>No tests saved yet. The app and visited text may be cached, but only saved selections are checked here.</p>}
      {storage && <p className="meta">{storage}</p>}<button className="btn btn-secondary" onClick={() => { void navigator.storage?.persist?.().then(granted => setMessage(granted ? 'Persistent storage granted. Keep backups as well.' : 'This browser manages storage automatically. Keep profile backups and reopen the app regularly.')).catch(error => setMessage(String(error))); }}>Ask to keep offline storage</button><p className="meta">iOS can reclaim website data when storage is low. Keep a profile backup before clearing Safari data or removing the app. Large original recordings stay separate from the small core app.</p>
    </section>
    <BrowserProfiles />
    <section className="card webapp-step"><span className="hero-eyebrow">4 · UPDATE WHEN YOU ARE READY</span><h2>App updates</h2><p>Updates wait while you study. Finish your letter or download any voice recording before applying an update.</p><div className="webapp-actions"><button className="btn btn-secondary" disabled={busy} onClick={() => { setBusy(true); void checkWebAppUpdate().then(() => { sync(); setMessage(webAppRegistration()?.waiting ? 'An update is ready. Apply it after saving your work.' : 'Update check finished. If an update is downloading, keep the app open and check again shortly.'); }).catch(() => setMessage('Updates need an internet connection. Your saved work is unchanged.')).finally(() => setBusy(false)); }}>Check for app update</button>{waiting && <button className="btn btn-primary" onClick={() => { if (window.confirm('Apply the update and reload this app? Finish your work and download voice recordings first. Saved profile data will stay.')) applyWebAppUpdate(); }}>Apply update & reopen</button>}</div></section>
    <details className="card"><summary>Recording, feedback and moving between devices</summary><p>Keep the app open when recording a role-play. Download your recording before switching profiles or closing it.</p><p>Built-in review and guidance work without an API key. The Mac’s downloaded AI model runs on that Mac; it is not copied to your iPhone. Optional online services require internet.</p><p>Home Screen app data can be separate from your Safari tab. Import a profile backup into the installed app if you started studying in Safari. There is no automatic cross-device account sync.</p></details>
    {message && <p className="card" role="status">{message}</p>}
  </div>;
}
