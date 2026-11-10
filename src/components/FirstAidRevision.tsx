import { useEffect, useState } from 'react';
import { isDesktop } from '../lib/desktop';

type Match = { page: number; text: string; matched: string[] };
type Result = { state: string; sourceName?: string; sourceSha256?: string; edition?: number; matches: Match[]; message?: string };
interface Props { enabled: boolean; questionId: string; prompt: string; answer?: string; explanation?: string }

export function FirstAidRevision({ enabled, questionId, prompt, answer='', explanation='' }: Props) {
  const [loaded,setLoaded]=useState<{key:string;result:Result}|null>(null), [query,setQuery]=useState(''), [search,setSearch]=useState(''), [retry,setRetry]=useState(0);
  const requestKey=JSON.stringify([questionId,prompt,answer,explanation,search,retry]);
  const result=loaded?.key===requestKey ? loaded.result : null;
  const busy=enabled && isDesktop() && !result;
  useEffect(() => {
    if (!enabled || !isDesktop()) return;
    const controller=new AbortController();
    void fetch(`${import.meta.env.BASE_URL}desktop/first-aid/search`,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(190000)]),body:JSON.stringify({prompt:prompt.slice(0,12000),answer:answer.slice(0,2000),explanation:explanation.slice(0,20000),query:search.slice(0,500)})}).then(async response => {
      const data=await response.json();
      if (!Array.isArray(data.matches)) throw Error();
      if (!controller.signal.aborted) setLoaded({key:requestKey,result:data});
    }).catch(() => { if (!controller.signal.aborted) setLoaded({key:requestKey,result:{state:'unavailable',matches:[],message:'The textbook search could not finish. Retry when the local PDF is available.'}}); });
    return () => controller.abort();
  },[enabled,questionId,prompt,answer,explanation,search,retry,requestKey]);
  if (!enabled) return null;
  return <section className="first-aid-revision" aria-label="First Aid Step 1 revision">
    <header><div><span className="section-kicker">REVISE FROM YOUR TEXTBOOK</span><h4>First Aid · Step 1</h4></div><span>Local textbook</span></header>
    {!isDesktop() ? <p>Open this question in the Mac app to match it against your own First Aid PDF.</p> : <>
      {busy && <p role="status">{result ? 'Finding relevant textbook passages…' : 'Finding relevant First Aid passages. The first search prepares your textbook index…'}</p>}
      {result?.message && <p role="status">{result.message}</p>}
      {result?.state==='no-match' && <p>No confident match was found. Search using the diagnosis or mechanism you want to revise.</p>}
      {!!result?.matches.length && <><p className="meta">{result.sourceName} · Text matched to this question; check the surrounding textbook context.</p>{result.matches.map(match => <details key={match.page} open={result.matches[0]===match}><summary>PDF page {match.page} · {match.matched.slice(0,4).join(', ')}</summary><pre className="first-aid-excerpt">{match.text}</pre><a href={`${import.meta.env.BASE_URL}desktop/usmle/originals/${result.sourceSha256}.pdf#page=${match.page}`} target="_blank" rel="noreferrer">Open this textbook page ↗</a></details>)}</>}
      <form onSubmit={event => {event.preventDefault();setSearch(query.trim());setRetry(value=>value+1);}}><label>Search your First Aid PDF<input type="search" value={query} maxLength={500} onChange={event=>setQuery(event.target.value)} placeholder="Diagnosis, mechanism or key concept…" /></label><button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>{result?.state==='unavailable' && !query ? 'Retry textbook match' : 'Find in First Aid'}</button></form>
    </>}
  </section>;
}
