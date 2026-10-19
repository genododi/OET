import { lazy, Suspense, useEffect, useState } from 'react';
import type { OetSubtest } from '../types';
import { isDesktop } from '../lib/desktop';
const MentorPanel = lazy(() => import('./MentorPanel').then(module => ({ default: module.MentorPanel })));

export function SourcePracticeCoach({ id, title, skill, response, textPath, startPage, endPage, sourceText }: { id: string; title: string; skill: OetSubtest; response: string; textPath?: string; startPage?: number; endPage?: number; sourceText?: string }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(sourceText ?? '');
  const [state, setState] = useState('');
  useEffect(() => {
    if (!open || !textPath) return;
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}${textPath}`, { signal: controller.signal }).then(async result => {
      if (!result.ok) throw Error();
      const data = await result.json();
      const page = startPage ?? Number(localStorage.getItem(`oet-material-page-v1:${id}`) || 1);
      const pages = Array.isArray(data.pages) ? data.pages.filter((p: { number: number }) => p.number >= page && p.number <= (endPage ?? page)) : [];
      const text = pages.length ? pages.map((p: { number: number; text: string }) => `Page ${p.number}\n${p.text}`).join('\n\n') : data.text || '';
      if (!controller.signal.aborted) { setSource(text.slice(0, 16000)); setState(text.trim() ? 'Source text loaded for this task.' : 'This source is a scan or recording. Include the task wording in your message for specific feedback.'); }
    }).catch(() => { if (!controller.signal.aborted) setState('Source text is unavailable. Include the task wording in your message for specific feedback.'); });
    return () => controller.abort();
  }, [id, open, textPath, startPage, endPage]);
  if (!isDesktop()) return null;
  return <details className="card source-practice-coach" onToggle={event => setOpen(event.currentTarget.open)}><summary>Offline AI mentor · ask questions or review my response</summary>{open && <><p className="meta">{state || 'Use the local mentor with this source and your current response. No key or internet needed.'} Close and reopen this panel after changing source pages.</p><Suspense fallback={<p>Opening your mentor…</p>}><MentorPanel key={`${id}-${skill}`} lessonKey={`source-${id}-${skill}`} task={{ id, subtest: skill, title, instructions: 'Coach English communication for the selected OET source. Use only the supplied source evidence; if the task or answer key is missing, say so and ask for the relevant wording. For speaking transcripts, assess language and communication but do not claim to judge pronunciation or audio quality.', prompt: source || title }} response={response} completed={[]} /></Suspense></>}</details>;
}
