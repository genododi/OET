import { coursologyPortalUrl } from '../data/usmleCourses';
import type { NavSection } from '../types';

interface NavItem {
  id: NavSection;
  label: string;
  icon: string;
  group?: string;
  description?: string;
}

interface ExternalNavItem {
  label: string;
  icon: string;
  href: string;
  description: string;
  group: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: '🏠' },
  { id: 'planner', label: 'Grade A Plan', icon: '🧭', group: 'Plan' },
  { id: 'mock', label: 'Mock Exams', icon: '📝', group: 'Practice' },
  { id: 'practice', label: 'Practice Modules', icon: '🎯', group: 'Practice' },
  { id: 'guide', label: 'Study Guide', icon: '📖', group: 'Learn' },
  { id: 'tips', label: 'Tips & Tricks', icon: '💡', group: 'Learn' },
  { id: 'pearls', label: 'Pearls & Pitfalls', icon: '⚕️', group: 'Learn' },
  { id: 'resources', label: 'Curated Resources', icon: '🗂️', group: 'Resources' },
  { id: 'books', label: 'Book PDFs', icon: '📚', group: 'Resources' },
  {
    id: 'usmle',
    label: 'USMLE Q-Banks',
    icon: '🇺🇸',
    group: 'Related exams',
    description: 'Catalog of Coursology Q-Banks for USMLE prep',
  },
];

const externalNavItems: ExternalNavItem[] = [
  {
    label: 'USMLE (Coursology Q-Bank)',
    icon: '🇺🇸',
    href: coursologyPortalUrl,
    description: 'Sign in to UWorld, AMBOSS, NBME, CMS & more on coursology-qbank.com',
    group: 'Related exams',
  },
];

interface Props {
  active: NavSection;
  onNavigate: (section: NavSection, itemId?: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ active, onNavigate, mobileOpen, onCloseMobile }: Props) {
  const handleNav = (id: NavSection) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon" aria-hidden="true">
            🩺
          </span>
          <div>
            <strong>OET Study Partner</strong>
            <span className="brand-sub">Exam preparation hub</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, index) => {
            const showGroup = item.group && item.group !== navItems[index - 1]?.group;

            return (
              <div key={item.id}>
                {showGroup && <div className="nav-group-label">{item.group}</div>}
                <button
                  type="button"
                  className={`nav-item ${active === item.id ? 'nav-item-active' : ''}`}
                  onClick={() => handleNav(item.id)}
                  title={item.description}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="nav-label">{item.label}</span>
                </button>
              </div>
            );
          })}

          {externalNavItems.map((item, index) => {
            const previousGroup = index > 0
              ? externalNavItems[index - 1]?.group
              : navItems[navItems.length - 1]?.group;
            const showGroup = item.group !== previousGroup;

            return (
              <div key={item.href}>
                {showGroup && <div className="nav-group-label">{item.group}</div>}
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-item nav-item-external"
                  title={item.description}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="nav-label">
                    {item.label}
                    <span className="nav-external-hint">↗ Opens in new tab</span>
                  </span>
                </a>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p>Medicine-first preparation with source provenance and rights-aware curation.</p>
        </div>
      </aside>
    </>
  );
}
