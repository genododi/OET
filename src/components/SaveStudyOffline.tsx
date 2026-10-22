import { useEffect, useState } from 'react';
import { isDesktop } from '../lib/desktop';
import { deviceOfflineSupported, importOfflineAsset, missingOfflineAssets, offlineAssets, savedStudyPacks, saveStudyPack, type OfflineAsset, type OfflineProgress } from '../lib/offlineStudy';
import '../pages/webApp.css';
type Props = { id: string; title: string; assets: OfflineAsset[] };
export function SaveStudyOffline(props: Props) {
  return isDesktop() || !deviceOfflineSupported() ? null : <OfflineSelection {...props} />;
}
function OfflineSelection({ id, title, assets }: Props) {
  const [busy, setBusy] = useState(false);
  const [checkedIdentity, setCheckedIdentity] = useState('');
  const [missing, setMissing] = useState<OfflineAsset[]>([]);
  const [message, setMessage] = useState('');
  const [registered, setRegistered] = useState(() => savedStudyPacks().some(pack => pack.id === id));
  const [progress, setProgress] = useState<OfflineProgress>();
  const identity = JSON.stringify(offlineAssets(assets));
  useEffect(() => {
    let alive = true;
    void missingOfflineAssets(JSON.parse(identity)).then(value => { if (alive) { setMissing(value); setCheckedIdentity(identity); } }).catch(() => {});
    return () => { alive = false; };
  }, [identity]);
  const ready = registered && checkedIdentity === identity && !missing.some(asset => !asset.optional);
  const download = async () => {
    setBusy(true); setMessage('');
    try {
      const remaining = await saveStudyPack({ id, title, assets, route: window.location.hash || '#home', savedAt: '' }, setProgress, ready);
      setMissing(remaining); setCheckedIdentity(identity); setRegistered(true);
      setMessage(remaining.some(a => !a.optional) ? 'Some files could not be saved. Retry, or add the exact original below.' : 'Saved for offline practice on this device. Keep this app installed and reopen it once before travelling.');
      void navigator.storage?.persist?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The test could not be saved.'); }
    finally { setBusy(false); }
  };
  return <details className="offline-save" aria-label={`Offline study · ${title}`}><summary>{ready ? '✓ Saved for offline study' : 'Save this test for offline study'}</summary>
    <p>Save this selection’s text, questions and available recording on this device. Your answers stay in your own profile. <a href="#app">Install & offline help</a></p>
    <button className="btn btn-secondary" disabled={busy} onClick={() => void download()}>{busy ? 'Saving… keep this app open' : ready ? 'Refresh saved copy' : 'Save for offline'}</button>
    {busy && progress && <p role="status">{progress.done} of {progress.total} files · {progress.label}</p>}
    {message && <p role="status">{message}</p>}
    {!busy && message && missing.length > 0 && <ul className="offline-missing">{missing.map(asset => <li key={asset.url}><strong>{asset.label}</strong>{asset.optional ? ' · optional, not saved' : ' · needed for complete offline practice'}{asset.sha256 && <><p>If the download host blocks browser saving, open the original, save it to Files, then choose it here. The app checks that it is the exact matching file.</p><a href={asset.url} target="_blank" rel="noopener noreferrer">Open original ↗</a><label>Choose downloaded original<input type="file" accept={asset.mimeType || undefined} onChange={event => { const file = event.target.files?.[0]; if (!file) return; setBusy(true); void importOfflineAsset(file, asset).then(() => missingOfflineAssets(assets)).then(left => { setMissing(left); setCheckedIdentity(identity); setMessage('Matching original saved on this device.'); }).catch(error => setMessage(String(error.message || error))).finally(() => setBusy(false)); }} /></label></>}</li>)}</ul>}
  </details>;
}
