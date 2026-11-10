import { lazy, Suspense, useEffect, useState } from 'react';
import type { OetSubtest } from '../types';
import { useProgress } from '../hooks/useProgress';
import { rememberCurrentStudy } from '../lib/currentStudy';
import { isDesktop } from '../lib/desktop';
import { evidenceExcerpt } from '../lib/oetMedicalCoach';
import type { MaterialTextRange } from '../lib/materialPractice';
const MentorPanel = lazy(() => import('./MentorPanel').then(module => ({ default: module.MentorPanel })));

export function SourcePracticeCoach({ id, title, skill, response, textPath, startPage, endPage, sourceRanges, sourceText }: { id: string; title: string; skill: OetSubtest; response: string; textPath?: string; startPage?: number; endPage?: number; sourceRanges?: MaterialTextRange[]; sourceText?: string }) {
  const { completed } = useProgress();
  const [open, setOpen] = useState(false);
  const [loadedSource, setSource] = useState('');
  const [loadedFor,setLoadedFor] = useState('');
  const sourceKey = `${id}:${textPath ?? ''}`;
  const source = textPath ? loadedFor === sourceKey ? loadedSource : '' : sourceText ?? '';
  const ready = !textPath || loadedFor === sourceKey;
  const [state, setState] = useState('');
  useEffect(() => {
    if (!isDesktop() || !textPath) return;
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}${textPath}`, { signal: controller.signal }).then(async result => {
      if (!result.ok) throw Error();
      const data = await result.json();
      const page = startPage ?? Number(localStorage.getItem(`oet-material-page-v1:${id}`) || 1);
      const pages = Array.isArray(data.pages) ? data.pages.filter((p: { number: number }) => p.number >= page && p.number <= (endPage ?? page)) : [];
      const text = pages.length ? pages.map((p: { number: number; text: string; needsReview?: boolean }) => {const range=sourceRanges?.find(range=>range.page===p.number);return `Page ${p.number}${p.needsReview ? ' [Unverified transcription of handwriting or difficult text. Ask the learner to check names, numbers and medical terms against the original before judging clinical meaning.]' : ''}\n${range ? p.text.slice(range.start,range.end) : p.text}`;}).join('\n\n') : sourceRanges?.length ? (data.text || '').slice(sourceRanges[0].start,sourceRanges[0].end) : data.text || '';
      if (!controller.signal.aborted) { setLoadedFor(`${id}:${textPath}`); setSource(evidenceExcerpt(text, 60000, title)); setState(text.trim() ? 'Source text loaded for this task.' : 'This source is a scan or recording. Include the task wording in your message for specific feedback.'); }
    }).catch(() => { if (!controller.signal.aborted) { setLoadedFor(`${id}:${textPath}`); setSource(''); setState('Source text is unavailable. The mentor will explain what it can check from your response.'); } });
    return () => controller.abort();
  }, [id, title, textPath, startPage, endPage, sourceRanges]);
  useEffect(() => { if (source.trim()) rememberCurrentStudy({id,title,subtest:skill,instructions:'Coach the selected OET source using only its supplied facts.',prompt:source},response); },[id,title,skill,source,response]);
  if (!isDesktop()) return null;
  return <details open={open} className="card source-practice-coach" onToggle={event => setOpen(event.currentTarget.open)}><summary>Ask the mentor during this test</summary>{open && <><p className="meta">{state || 'Use the local mentor with this source and your current response. No key or internet needed.'}</p><Suspense fallback={<p>Opening your mentor…</p>}>{ready ? <MentorPanel key={`${id}-${skill}`} lessonKey={`source-${id}-${skill}`} task={{ id, subtest: skill, title, instructions: 'Coach English communication for the selected OET source. Use only the supplied source evidence; if the task or answer key is missing, state the limitation and continue with useful guidance from the available source. Give the next useful step directly; do not ask routine questions. For speaking transcripts, assess language and communication but do not claim to judge pronunciation or audio quality.', prompt: source || title }} response={response} completed={completed} /> : <p role="status">Loading the selected task for your mentor…</p>}</Suspense></>}</details>;
}
