import type { NavSection } from '../types';
import { AppIcon, type AppIconName } from './AppIcon';

type NavItem = { id: NavSection; label: string; icon: AppIconName };
const main: NavItem[] = [
  { id: 'home', label: 'Start here', icon: 'dashboard' },
  { id: 'practice', label: '1 · Official exam practice', icon: 'target' },
  { id: 'mock', label: '2 · Timed mock exams', icon: 'exam' },
  { id: 'mistakes', label: '3 · Review mistakes', icon: 'pen' },
  { id: 'planner', label: '4 · My study plan', icon: 'plan' },
];
const materials: NavItem[] = [
  { id: 'benchmark', label: 'Benchmark tests', icon: 'book' },
  { id: 'jahshan', label: 'Jahshan Collection', icon: 'book' },
  { id: 'materials', label: 'My OET & AMR Files', icon: 'folder' },
];
const guidance: NavItem[] = [
  { id: 'walkthrough', label: 'Exam walkthroughs', icon: 'guide' },
  { id: 'mentor', label: 'Your OET Mentor', icon: 'message' },
  { id: 'notebook', label: 'NotebookLM Notes', icon: 'book' },
  { id: 'guide', label: 'Study Guide', icon: 'guide' },
  { id: 'tips', label: 'Tips & Tricks', icon: 'lightbulb' },
  { id: 'pearls', label: 'Pearls & Pitfalls', icon: 'pulse' },
];
const reference: NavItem[] = [
  { id: 'dashboard', label: 'Detailed dashboard', icon: 'dashboard' },
  { id: 'listening', label: 'Original listening archive', icon: 'activity' },
  { id: 'drills', label: 'Learning exercises', icon: 'pen' },
  { id: 'resources', label: 'Source Library', icon: 'folder' },
  { id: 'books', label: 'Book PDFs', icon: 'book' },
  { id: 'usmle', label: 'USMLE Q-Banks', icon: 'activity' },
];
interface Props { active: NavSection; onNavigate: (section: NavSection, itemId?: string) => void; mobileOpen: boolean; onCloseMobile: () => void }
export function Sidebar({ active, onNavigate, mobileOpen, onCloseMobile }: Props) {
  const item = (entry: NavItem) => <button type="button" key={entry.id} className={`nav-item ${active === entry.id ? 'nav-item-active' : ''}`} aria-current={active === entry.id ? 'page' : undefined} onClick={() => { onNavigate(entry.id); onCloseMobile(); }}><span className="nav-icon" aria-hidden="true"><AppIcon name={entry.icon} /></span><span className="nav-label">{entry.label}</span></button>;
  const group = (label: string, entries: NavItem[]) => <details open={entries.some(entry => entry.id === active) || undefined}><summary>{label}</summary>{entries.map(item)}</details>;
  return <>{mobileOpen && <button type="button" className="sidebar-overlay" aria-label="Close menu" onClick={onCloseMobile} />}<aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><span className="brand-icon"><AppIcon name="stethoscope" /></span><div><strong>OET Workstation</strong><span className="brand-sub">Medicine · Exam preparation</span></div></div><nav className="sidebar-nav" aria-label="Main navigation"><div className="nav-group-label">Preparation priorities</div>{main.map(item)}{group('Extra practice collections', materials)}{group('Help & exam methods', guidance)}{group('Reference & other tools', reference)}</nav><div className="sidebar-footer"><p>Official papers → Timed mocks → Review</p></div></aside></>;
}
