import { coursologyPortalUrl } from '../data/usmleCourses';
import type { NavSection } from '../types';
import { AppIcon, type AppIconName } from './AppIcon';

interface NavItem {
  id: NavSection;
  label: string;
  icon: AppIconName;
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
  { id: 'home', label: 'Dashboard', icon: 'dashboard' },
  { id: 'mentor', label: 'Your OET Mentor', icon: 'message', group: 'Learn with me' },
  { id: 'planner', label: 'Grade A Plan', icon: 'plan', group: 'Plan' },
  { id: 'mock', label: 'Mock Exams', icon: 'exam', group: 'Practice' },
  { id: 'practice', label: 'Practice Library', icon: 'target', group: 'Practice' },
  { id: 'mistakes', label: 'Mistake Notebook', icon: 'pen', group: 'Practice' },
  { id: 'guide', label: 'Study Guide', icon: 'guide', group: 'Learn' },
  { id: 'tips', label: 'Tips & Tricks', icon: 'lightbulb', group: 'Learn' },
  { id: 'pearls', label: 'Pearls & Pitfalls', icon: 'pulse', group: 'Learn' },
  { id: 'resources', label: 'Source Library', icon: 'folder', group: 'Resources' },
  { id: 'books', label: 'Book PDFs', icon: 'book', group: 'Resources' },
  {
    id: 'usmle',
    label: 'USMLE Q-Banks',
    icon: 'activity',
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
          <span className="brand-icon"><AppIcon name="stethoscope" /></span>
          <div>
            <strong>OET Workstation</strong>
            <span className="brand-sub">Medicine · Grade A</span>
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
                    <AppIcon name={item.icon} />
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
          <div className="sidebar-status"><span /> Source sync active</div>
          <p>Private archive indexed daily. Public study content stays rights-aware.</p>
        </div>
      </aside>
    </>
  );
}
