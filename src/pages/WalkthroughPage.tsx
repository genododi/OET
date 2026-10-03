import { useRef, useState } from 'react';
import { walkthroughs, readWalkthroughProgress, walkthroughStorageKey, type Walkthrough } from '../data/walkthroughs';
import { realListeningTests } from '../data/realListeningTests';
import { baseUrl } from '../lib/baseUrl';
import { SavedStudyNotes } from '../components/SavedStudyNotes';
import type { NavSection } from '../types';
import './walkthrough.css';
import './studySources.css';

type Props = { itemId?: string; onNavigate: (section: NavSection, itemId?: string) => void };
export function WalkthroughPage({ itemId, onNavigate }: Props) {
  const [done, setDone] = useState(readWalkthroughProgress);
  const [storageError, setStorageError] = useState(false);
  const lesson = walkthroughs.find(item => item.id === itemId) ?? walkthroughs.find(item => !done.includes(item.id)) ?? walkthroughs[0];
  const index = walkthroughs.indexOf(lesson);
  const complete = () => {
    const updated = [...new Set([...done, lesson.id])]; setDone(updated);
    try { localStorage.setItem(walkthroughStorageKey, JSON.stringify(updated)); setStorageError(false); } catch { setStorageError(true); }
    if (index < walkthroughs.length - 1) onNavigate('walkthrough', walkthroughs[index + 1].id);
    else onNavigate('practice');
  };
  return <div className="learning-path"><div className="lesson-heading"><span className="section-kicker">STEP 1 · LESSON {index + 1} OF 8</span><span>{done.length}/8 completed</span></div>
    <nav className="lesson-picker" aria-label="Walkthrough lessons">{walkthroughs.map((item, i) => <button className={item.id === lesson.id ? 'selected' : ''} aria-current={item.id === lesson.id ? 'step' : undefined} key={item.id} onClick={() => onNavigate('walkthrough', item.id)}>{done.includes(item.id) ? '✓' : i + 1} · {item.title.split(' · ')[0]}</button>)}</nav>
    {storageError && <p role="alert">Progress could not be saved in this browser. You can still continue.</p>}
    <Lesson key={lesson.id} lesson={lesson} onComplete={complete} />
    <p className="meta">Exam format reference: <a href="https://www.cambridgeenglish.org/exams-and-tests/oet/test-overview/" target="_blank" rel="noopener noreferrer">Cambridge English OET overview ↗</a>. Listening demonstrations use the bundled sample’s verified paper and answer key; explanations are our teaching notes. Other miniature examples are original practice, not official exam items.</p>
  </div>;
}

function Lesson({ lesson, onComplete }: { lesson: Walkthrough; onComplete: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const test = realListeningTests[0];
  const offset = lesson.part === 'B' ? test.sourceParts[0].durationSeconds : lesson.part === 'C' ? test.sourceParts[0].durationSeconds + test.sourceParts[1].durationSeconds : 0;
  const practiceUrl = lesson.skill === 'listening' ? '#listening' : `#practice/${lesson.skill}`;
  const startAudio = async () => {
    if (!audio.current) return;
    try { audio.current.currentTime = offset; await audio.current.play(); setAudioError(false); } catch { setAudioError(true); }
  };
  return <article className="card worked-lesson"><h2>{lesson.title}</h2><p className="lesson-format">{lesson.format}</p>
    <h3>1. See the method</h3><ol className="method-steps">{lesson.steps.map(step => <li key={step.title}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol>
    <h3>2. Try this example</h3><div className="lesson-material">{lesson.material}</div>
    {lesson.skill === 'listening' && <section className="lesson-audio" aria-label="Original human recording"><p><strong>Original OET voices · Bundled Sample Test 1</strong></p><a href={`${baseUrl}${test.questionPdf.slice(1)}#page=${lesson.part === 'A' ? 4 : lesson.part === 'B' ? 6 : 8}`} target="_blank" rel="noopener noreferrer">Open the matching question paper ↗</a><audio ref={audio} controls preload="metadata" src={`${baseUrl}${test.audioPath.slice(1)}`} onLoadedMetadata={() => { if (audio.current) audio.current.currentTime = offset; }} onError={() => setAudioError(true)} /><button className="btn btn-secondary" onClick={() => void startAudio()}>Play Part {lesson.part} from its start</button><p className="meta">Replay is available here for learning. During a timed test, listen once. The jump starts the part, including its instructions; it is not an exact answer cue.</p>{audioError && <p role="alert">The recording could not play here. <a href={`${baseUrl}${test.audioPath.slice(1)}`} target="_blank" rel="noopener noreferrer">Open the original audio directly ↗</a></p>}</section>}
    <p><strong>{lesson.question}</strong></p><SavedStudyNotes storageKey={`oet-walkthrough-draft-${lesson.id}-v1`} label="My attempt and evidence" rows={5} placeholder="Try an answer first. What supports it?" />
    <button className="btn btn-primary" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide worked explanation' : 'Show worked explanation'}</button>
    {revealed && <section className="worked-answer" aria-label="Worked explanation"><h3>3. Compare the answer and reasoning</h3><div className="lesson-material">{lesson.answer}</div><ol>{lesson.reasoning.map(reason => <li key={reason}>{reason}</li>)}</ol><h3>4. Apply it to a full task</h3><p>{lesson.transfer}</p><div className="lesson-actions"><button className="btn btn-primary" onClick={onComplete}>Mark complete & {lesson.id === 'speaking' ? 'choose practice' : 'next lesson'} →</button><a className="btn btn-secondary" href={practiceUrl}>Practise {lesson.skill} now</a>{lesson.skill !== 'listening' && <a className="btn btn-secondary" href="#materials">Open my AMR files</a>}</div></section>}
  </article>;
}
