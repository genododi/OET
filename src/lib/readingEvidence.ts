import { createContext, useContext } from 'react';
export interface ReadingClueQuestion { id: string; prompt: string; answer?: string; pages?: number[]; label?: string }
export interface EvidenceRange { start: number; end: number; questions: string[] }
export interface ReadingEvidenceState { enabled: boolean; active: string | null; questions: ReadingClueQuestion[]; toggle: () => void; locate: (id: string) => void }
export const ReadingEvidenceContext = createContext<ReadingEvidenceState>({enabled:false,active:null,questions:[],toggle:()=>{},locate:()=>{}});
export const useReadingEvidence = () => useContext(ReadingEvidenceContext);
const stop = new Set('about after also answer before being between could detail does following from given have into main most name patient patients question questions reading should statement text that their them then there these they this what when where which with would your according author writer information paragraph passage'.split(' '));
const words = (s:string) => [...new Set((s.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []).filter(w => !stop.has(w)))];
const normal = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

/** Conservative lexical clues, not semantic answer verification. No match means no highlight. */
export function findReadingEvidence(text:string, questions:ReadingClueQuestion[], page?:number):EvidenceRange[] {
  // Replace physical line wraps without shifting offsets. Sentence segmentation
  // keeps decimals such as 5.0%, abbreviations and their surrounding meaning.
  const reflowed=text.replace(/(?<!\n)\n(?!\n)/g,' ');
  const spans=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(reflowed)].map(part=>{const original=text.slice(part.index,part.index+part.segment.length);return {text:original.trim(),start:part.index+(original.match(/^\s*/)?.[0].length ?? 0)};}).filter(span=>span.text.trim().length>16 && !span.text.includes('?') && !/^\s*[A-D][).]\s/.test(span.text));
  const result:EvidenceRange[]=[];
  for(const question of questions) {
    if(page && question.pages?.length && !question.pages.includes(page))continue;
    const terms=words(question.prompt);const answer=question.answer && !/^[A-D](?:\b|\s*[).])/.test(question.answer.trim()) ? normal(question.answer) : '';
    let best:{start:number;end:number;score:number}|null=null;
    for(const span of spans) {
      const candidate=normal(span.text);
      // Never "locate" the question itself or an option copied from its prompt.
      if(normal(question.prompt).includes(candidate))continue;
      const hits=terms.filter(term => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(span.text));
      const exact=answer.length>=4 && (` ${candidate} `).includes(` ${answer} `);
      if(!exact && (hits.length<2 || hits.reduce((sum,word)=>sum+word.length,0)<11))continue;
      const score=hits.length*3+(exact?8:0)-span.text.length/1500;
      if(!best || score>best.score)best={start:span.start,end:span.start+span.text.length,score};
    }
    if(best)result.push({start:best.start,end:best.end,questions:[question.id]});
  }
  const merged:EvidenceRange[]=[];
  for(const range of result.sort((a,b)=>a.start-b.start)) {
    const previous=merged.at(-1);
    if(previous && range.start<=previous.end){previous.end=Math.max(previous.end,range.end);previous.questions=[...new Set([...previous.questions,...range.questions])];}
    else merged.push({...range});
  }
  return merged;
}
