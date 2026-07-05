import { useState } from 'react';
import { useApiKey } from '../lib/apiKeyStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const { apiKey, save, clear, hasKey } = useApiKey();
  const [draft, setDraft] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

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

        <section className="settings-section">
          <h4>AI examiner feedback (optional)</h4>
          <p className="meta">
            Paste your own Anthropic API key to get Claude-generated OET examiner feedback on
            Writing and Speaking tasks, on top of the built-in rubric scoring. This app has no
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
            <p className="meta">No API key saved — AI feedback buttons are hidden until you add one.</p>
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
        </section>
      </div>
    </div>
  );
}
