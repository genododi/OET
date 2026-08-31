import { useState, type ReactNode } from 'react';
import type { NavSection } from '../types';
import { Sidebar } from './Sidebar';
import { SettingsModal } from './SettingsModal';
import { SettingsContext } from '../lib/settingsContext';
import { AppIcon } from './AppIcon';

interface Props {
  active: NavSection;
  onNavigate: (section: NavSection, itemId?: string) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Layout({ active, onNavigate, title, subtitle, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SettingsContext.Provider value={{ openSettings: () => setSettingsOpen(true) }}>
      <div className="app-shell">
        <Sidebar
          active={active}
          onNavigate={onNavigate}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="main-area">
          <header className="topbar">
            <button
              type="button"
              className="menu-toggle"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <div className="topbar-titles">
              <span className="topbar-kicker">OET medicine workspace</span>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="topbar-actions">
              <button type="button" className="topbar-practice" onClick={() => onNavigate('practice')}>
                <AppIcon name="sparkles" />
                <span>Practice now</span>
              </button>
              <button
                type="button"
                className="settings-toggle"
                aria-label="Open settings"
                title="Settings — AI feedback API key"
                onClick={() => setSettingsOpen(true)}
              >
                <AppIcon name="settings" />
              </button>
            </div>
          </header>
          <main className="page-content">{children}</main>
        </div>
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </SettingsContext.Provider>
  );
}
