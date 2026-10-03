import type { NavSection } from '../types';
import { AppIcon, type AppIconName } from './AppIcon';

type NavItem = { id: NavSection; label: string; icon: AppIconName };
const main: NavItem[] = [
  { id: 'home', label: 'Start here', icon: 'dashboard' },
  { id: 'walkthrough', label: '1 · Walkthroughs', icon: 'guide' },
  { id: 'practice', label: '2 · Practice', icon: 'target' },
  { id: 'mock', label: '3 · Timed tests', icon: 'exam' },
  { id: 'mistakes', label: '4 · Review', icon: 'pen' },
];
const materials: NavItem[] = [
  { id: 'listening', label: 'Real Listening', icon: 'activity' },
  { id: 'materials', label: 'My OET & AMR Files', icon: 'folder' },
  { id: 'notebook', label: 'NotebookLM Notes', icon: 'book' },
];
const more: NavItem[] = [
  { id: 'mentor', label: 'Your OET Mentor', icon: 'message' },
  { id: 'planner', label: 'Grade A Plan', icon: 'plan' },
  { id: 'dashboard', label: 'Detailed dashboard', icon: 'dashboard' },
  { id: 'guide', label: 'Study Guide', icon: 'guide' },
  { id: 'tips', label: 'Tips & Tricks', icon: 'lightbulb' },
  { id: 'pearls', label: 'Pearls & Pitfalls', icon: 'pulse' },
  { id: 'resources', label: 'Source Library', icon: 'folder' },
  { id: 'books', label: 'Book PDFs', icon: 'book' },
  { id: 'usmle', label: 'USMLE Q-Banks', icon: 'activity' },
];
interface Props { active: NavSection; onNavigate: (section: NavSection, itemId?: string) => void; mobileOpen: boolean; onCloseMobile: () => void }
export function Sidebar({ active, onNavigate, mobileOpen, onCloseMobile }: Props) {
  const item = (entry: NavItem) => <button type="button" key={entry.id} className={`nav-item ${active === entry.id ? 'nav-item-active' : ''}`} aria-current={active === entry.id ? 'page' : undefined} onClick={() => { onNavigate(entry.id); onCloseMobile(); }}><span className="nav-icon" aria-hidden="true"><AppIcon name={entry.icon} /></span><span className="nav-label">{entry.label}</span></button>;
  return <>{mobileOpen && <button type="button" className="sidebar-overlay" aria-label="Close menu" onClick={onCloseMobile} />}<aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><span className="brand-icon"><AppIcon name="stethoscope" /></span><div><strong>OET Workstation</strong><span className="brand-sub">Medicine · Learn step by step</span></div></div><nav className="sidebar-nav" aria-label="Main navigation">{main.map(item)}<div className="nav-group-label">Study materials</div>{materials.map(item)}<details open={more.some(entry => entry.id === active) || undefined}><summary>More study tools</summary>{more.map(item)}</details></nav><div className="sidebar-footer"><p>Learn → Practise → Test → Review</p></div></aside></>;
}
