import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { findReadingEvidence, ReadingEvidenceContext, useReadingEvidence, type ReadingClueQuestion } from '../lib/readingEvidence';
import { validSourceLayout, type SourceLayout } from '../lib/sourceTextLayout';
import './readingEvidence.css';

export function ReadingEvidenceProvider({ questions, storageKey, children }:{ questions:ReadingClueQuestion[];storageKey:string;children:ReactNode }) {
  const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem(`oet-reading-clues:${storageKey}`)==='yes';}catch{return false;}});
  const [active,setActive]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!enabled || !active)return;
    let found=false;
    const attempt=()=>{const mark=[...(root.current?.querySelectorAll<HTMLElement>('[data-reading-evidence]') ?? [])].find(el=>el.dataset.readingEvidence?.split(' ').includes(active));if(mark){found=true;mark.scrollIntoView?.({behavior:'smooth',block:'center'});setNotice('Matching source wording is highlighted. Check the context before choosing your answer.');observer.disconnect();}};
    const observer=new MutationObserver(attempt);
    if(root.current)observer.observe(root.current,{childList:true,subtree:true});
    attempt();
    const timer=window.setTimeout(()=>{observer.disconnect();if(!found)setNotice('No confident wording match was found for this question. Read the complete source and check its printed key.');},4000);
    return()=>{observer.disconnect();window.clearTimeout(timer);};
  },[enabled,active]);
  const value={enabled,active,questions,toggle:()=>setEnabled(current=>{try{localStorage.setItem(`oet-reading-clues:${storageKey}`,current?'no':'yes');}catch{/* Continue in memory. */}return !current;}),locate:(id:string)=>{setNotice('');setEnabled(true);setActive(id);}};
  return <ReadingEvidenceContext.Provider value={value}><div className="reading-clue-workspace" ref={root}>{enabled && active && notice && <p role="status" className="reading-evidence-notice">{notice}</p>}{children}</div></ReadingEvidenceContext.Provider>;
}
export function ReadingEvidenceToggle() {
  const {enabled,toggle,active,locate,questions}=useReadingEvidence();
  return <div className="reading-evidence-tools"><button className="btn btn-secondary" aria-pressed={enabled} onClick={toggle}>{enabled?'Hide yellow highlights':'Highlight relevant text'}</button>{active && enabled && <button className="btn btn-ghost" onClick={()=>locate('')}>All question clues</button>}<small>Study aid: yellow marks matching source wording{active?` for ${questions.find(q=>q.id===active)?.label ?? 'this question'}`:''}. Check its meaning in context; highlights are not a verified answer key.</small></div>;
}
export function ReadingEvidenceLocate({id}:{id:string}) {
  const {questions,locate}=useReadingEvidence();
  return questions.some(q=>q.id===id)?<button className="btn btn-ghost reading-source-page" onClick={()=>locate(id)}>Locate relevant text</button>:null;
}
export function HighlightedReadingText({text,page,uncertain}:{text:string;page?:number;uncertain?:Set<string>}) {
  const {enabled,active,questions}=useReadingEvidence();
  const ranges=useMemo(()=>enabled?findReadingEvidence(text,active?questions.filter(q=>q.id===active):questions,page):[],[enabled,active,questions,text,page]);
  const sourceWords=(value:string)=>uncertain?.size ? value.split(/(\s+)/).map((word,i)=>uncertain.has(word)?<mark key={i} className="recognised-word-uncertain" title="Uncertain recognition: check the original">{word}</mark>:word):value;
  if(!ranges.length)return <>{sourceWords(text)}</>;
  return <>{ranges.map((range,i)=>{const prefix=text.slice(ranges[i-1]?.end ?? 0,range.start);return <Fragment key={i}>{sourceWords(prefix)}<mark className="reading-evidence-mark" data-reading-evidence={range.questions.join(' ')} title="Question-related source wording — check in context">{sourceWords(text.slice(range.start,range.end))}</mark></Fragment>;})}{sourceWords(text.slice(ranges.at(-1)?.end ?? 0))}</>;
}
export function ReadingPageClues({page}:{page:number}) {
  const {enabled}=useReadingEvidence();
  const [data,setData]=useState<{text:string;layout:unknown}|null>(null);
  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();
    void fetch(`${import.meta.env.BASE_URL}jahshan-reading-layouts/${page}.json`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(value=>{if(!controller.signal.aborted && validSourceLayout(value.layout,value.text))setData(value);}).catch(()=>{});
    return()=>controller.abort();
  },[enabled,page]);
  if(!enabled || !data || !validSourceLayout(data.layout,data.text))return null;
  return <svg className="reading-page-clues" viewBox={`0 0 ${data.layout.width} ${data.layout.height}`} aria-label="Yellow question-related text highlights"><PositionedReadingClues layout={data.layout} text={data.text} page={page} /></svg>;
}
export function PositionedReadingClues({layout,text,page}:{layout:SourceLayout;text:string;page?:number}) {
  const {enabled,active,questions}=useReadingEvidence();
  const ranges=enabled?findReadingEvidence(text,active?questions.filter(q=>q.id===active):questions,page):[];
  const rectangles=[];
  let offset=0;
  for(const block of layout.blocks) {
    for(const line of block.lines) {
      const related=ranges.filter(r=>r.start<offset+line.text.length && r.end>offset);
      if(related.length)rectangles.push({line,start:offset,questions:related.flatMap(r=>r.questions)});
      offset+=line.text.length+1;
    }
    offset+=1;
  }
  return <g className="reading-positioned-clues">{rectangles.map(({line,start,questions:related})=><rect key={start} x={line.x*layout.width} y={line.y*layout.height} width={line.width*layout.width} height={line.height*layout.height} data-reading-evidence={related.join(' ')} />)}</g>;
}
