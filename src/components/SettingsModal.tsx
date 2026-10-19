import { useEffect, useState } from 'react';
import { useApiKey } from '../lib/apiKeyStore';
import { isDesktop, type LocalAiStatus } from '../lib/desktop';
import { StudyDataTransfer } from './StudyDataTransfer';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const { apiKey, save, clear, hasKey } = useApiKey();
  const [draft, setDraft] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [localStatus, setLocalStatus] = useState<LocalAiStatus | null>(null);
  useEffect(() => { if (open && isDesktop()) void window.oetDesktop!.aiStatus().then(setLocalStatus); }, [open]);

  if (!open) return null;

  const handleSave = () => {
    save(draft);
    setDraft('');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div className="settings-modal-overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-modal card">
        <div className="card-header-row">
          <h3>Settings</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        {isDesktop() ? <section className="settings-section"><h4>Offline AI mentor & response feedback</h4><p>Live mentoring and response review run entirely on this Mac. No API key, account, subscription or internet connection is required.</p><p><strong>{localStatus?.model ?? 'Local AI model'}</strong></p><p role="status">{localStatus?.message ?? 'Checking your local model…'}</p><p className="meta">The model loads when first used. Close heavy apps if replies are slow. The local mentor offers study feedback; its band estimates are practice guidance.</p></section> : <section className="settings-section">
          <h4>Live AI mentor & response feedback</h4>
          <p className="meta">
            Paste your own Anthropic API key for live conversational mentoring across Listening,
            Reading, Writing and Speaking, including patient role-play and response feedback. API usage
            is billed by Anthropic to your account. This app has no
            server — your key is stored only in this browser's local storage and requests go
            directly from your browser to Anthropic's API. Get a key at{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
              console.anthropic.com
            </a>
            .
          </p>

          {hasKey ? (
            <div className="settings-key-row">
              <span className="settings-key-masked">
                Key saved: •••• {apiKey?.slice(-4)}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
                Remove key
              </button>
            </div>
          ) : (
            <p className="meta">No API key saved. Built-in guided lessons work now; add a key to enable Live AI conversation.</p>
          )}

          <div className="settings-key-input-row">
            <input
              type="password"
              placeholder="sk-ant-..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Anthropic API key"
            />
            <button type="button" className="btn btn-primary btn-sm" disabled={!draft.trim()} onClick={handleSave}>
              Save
            </button>
          </div>
          {savedFlash && <p className="settings-saved-flash">Saved.</p>}
        </section>}
        {!isDesktop() && <StudyDataTransfer />}
      </div>
    </div>
  );
}
