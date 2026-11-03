import { useEffect, useState } from 'react';
import type { NavSection } from '../types';
import { dailyPearls, pearlReference } from '../data/dailyPearls';
import { localDayKey } from '../lib/studyActivity';
import './dailyPearl.css';
const seenKey='oet-daily-pearl-seen-v1', pausedKey='oet-daily-pearl-paused-v1';
function stored(key:string) { try { return localStorage.getItem(key); } catch { return null; } }
function save(key:string,value:string) { try { localStorage.setItem(key,value); } catch { /* A tip remains usable without storage. */ } }
export function DailyPearlBalloon({ section }: { section: NavSection }) {
  const [clock,setClock]=useState(()=>({day:localDayKey(new Date()),index:Math.floor(Date.UTC(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())/86400000)%dailyPearls.length}));
  const {day,index}=clock;
  const [open,setOpen]=useState(false),[paused,setPaused]=useState(()=>stored(pausedKey)==='yes');
  const pearl=dailyPearls[index];
  const safe=!['practice','mock','drills','usmle','listening'].includes(section);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(previous=>{const now=new Date(),next=localDayKey(now);return next===previous.day?previous:{day:next,index:Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000)%dailyPearls.length};}),30000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(!safe || paused || stored(seenKey)===day)return;
    const timer=window.setInterval(()=>{
      const playing=[...document.querySelectorAll('audio,video')].some(media=>!(media as HTMLMediaElement).paused);
      if(document.visibilityState==='hidden' || playing || document.querySelector('[data-recording="true"]'))return;
      save(seenKey,day);setOpen(true);window.clearInterval(timer);
    },2500);
    return()=>window.clearInterval(timer);
  },[day,paused,safe]);
  return <aside className="daily-pearl-anchor" aria-label="Daily exam pearl">
    {open && safe && <section className="daily-pearl-balloon" role="dialog" aria-modal="false" aria-labelledby="daily-pearl-title"><header><span>DAILY OET PEARL · {pearl.skill}{pearl.part ? ` ${pearl.part}` : ''}</span><button aria-label="Close daily pearl" onClick={()=>setOpen(false)}>×</button></header><h2 id="daily-pearl-title">{pearl.title}</h2><p>{pearl.pearl}</p><div className="daily-pearl-pitfall"><strong>Watch out</strong><p>{pearl.pitfall}</p></div><p><strong>Try today:</strong> {pearl.practice}</p><footer><button className="btn btn-secondary btn-sm" onClick={()=>setClock(current=>({...current,index:(current.index+1)%dailyPearls.length}))}>Another pearl</button><a href={pearlReference} target="_blank" rel="noreferrer">OET guide ↗</a></footer><label className="daily-pearl-preference"><input type="checkbox" checked={paused} onChange={e=>{setPaused(e.target.checked);save(pausedKey,e.target.checked?'yes':'no');}} /> Pause automatic daily popups</label></section>}
    {safe && <button className="daily-pearl-trigger" aria-expanded={open} onClick={()=>{save(seenKey,day);setOpen(!open);}}>✦ <span>Daily pearl</span></button>}
  </aside>;
}
