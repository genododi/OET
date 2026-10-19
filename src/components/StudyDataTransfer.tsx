import { useState } from 'react';
export function StudyDataTransfer() {
  const [message, setMessage] = useState('');
  const exportData = () => {
    const data = Object.fromEntries(Object.keys(localStorage).filter(key => !key.includes('anthropic-key')).map(key => [key, localStorage.getItem(key)!]));
    const blob = new Blob([JSON.stringify({ format: 'oet-profile-backup', version: 1, name: 'Browser study data', savedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'OET-study-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Backup downloaded. Import it from Profiles & backups in the Mac app. API keys are excluded.');
  };
  return <section className="settings-section"><h4>Back up or move your study data</h4><p className="meta">Export your answers, drafts, notes and progress to import into an offline Mac profile. The file stays on your device.</p><button className="btn btn-secondary" onClick={exportData}>Export my saved study data</button><label>Import a study backup<input type="file" accept=".json,application/json" onChange={event => {
    const file = event.target.files?.[0]; if (!file) return;
    void (async () => { try {
      if (file.size > 20_000_000) throw Error('This backup is too large.');
      const backup = JSON.parse(await file.text());
      if (backup.format !== 'oet-profile-backup' || backup.version !== 1 || !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data) || Object.values(backup.data).some(value => typeof value !== 'string')) throw Error('Choose a valid OET study backup.');
      for (const [key, value] of Object.entries(backup.data)) if (!key.includes('anthropic-key') && localStorage.getItem(key) === null) localStorage.setItem(key, value as string);
      setMessage('Backup imported. Existing saved entries were kept. Reload to refresh your study history.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The backup could not be imported.'); } })();
  }} /></label>{message && <p role="status">{message}</p>}</section>;
}
