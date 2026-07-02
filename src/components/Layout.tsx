import { useState, type ReactNode } from 'react';
import type { NavSection } from '../types';
import { Sidebar } from './Sidebar';

interface Props {
  active: NavSection;
  onNavigate: (section: NavSection, itemId?: string) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Layout({ active, onNavigate, title, subtitle, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
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
            ☰
          </button>
          <div className="topbar-titles">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
