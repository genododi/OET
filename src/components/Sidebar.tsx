import type { NavSection } from '../types';
import { AppIcon } from './AppIcon';
import { mainStudyNavigation, navigationParent } from '../lib/studyNavigation';
import './studyNavigation.css';
interface Props { active:NavSection; onNavigate:(section:NavSection,itemId?:string)=>void; mobileOpen:boolean; onCloseMobile:()=>void }
export function Sidebar({active,onNavigate,mobileOpen,onCloseMobile}:Props) {
 const go=(section:NavSection)=>{onNavigate(section);onCloseMobile();};
 return <>{mobileOpen&&<button type="button" className="sidebar-overlay" aria-label="Close menu" onClick={onCloseMobile}/>}<aside className={`sidebar study-sidebar ${mobileOpen?'sidebar-open':''}`}><div className="sidebar-brand"><span className="brand-icon"><AppIcon name="stethoscope"/></span><div><strong>OET Workstation</strong><span className="brand-sub">Your study space</span></div></div><nav className="sidebar-nav" aria-label="Main navigation">{mainStudyNavigation.map((item,index)=><button type="button" key={item.id} className={`nav-item study-nav-item ${navigationParent(active)===item.id?'nav-item-active':''} ${index===1?'study-nav-first-collection':''}`} aria-current={active===item.id?'page':undefined} onClick={()=>go(item.id)}><span className="nav-icon"><AppIcon name={item.icon}/></span><span className="nav-label">{item.label}</span></button>)}</nav><div className="study-sidebar-note"><span>YOUR STUDY FLOW</span><p>Choose a test<br/>Find the evidence<br/>Review what you learned</p></div><div className="sidebar-footer"><button type="button" className={`nav-item ${navigationParent(active)==='tools'?'nav-item-active':''}`} onClick={()=>go('tools')}><AppIcon name="settings"/> More study tools</button></div></aside></>;
}
