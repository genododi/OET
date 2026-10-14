import { useEffect, useState } from 'react';
import { VoiceRecorder } from './MaterialsPage';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

function PhaseClock({ minutes, label, onComplete }: { minutes: number; label: string; onComplete: () => void }) {
  const [seconds, setSeconds] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(value => {
      if (value <= 1) { setRunning(false); onComplete(); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running, onComplete]);
  return <div className="jahshan-phase-clock"><strong>{label}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong><div><button className="btn btn-secondary" disabled={running || seconds === 0} onClick={() => setRunning(true)}>{running ? 'Timer running…' : seconds === 0 ? 'Complete' : `Start ${minutes}-minute timer`}</button><button className="btn btn-ghost" onClick={() => { setRunning(false); setSeconds(minutes * 60); }}>Reset</button></div></div>;
}

function SavedText({ storageKey, label, rows = 14 }: { storageKey: string; label: string; rows?: number }) {
  const [text, setText] = useState(() => { try { return localStorage.getItem(storageKey) ?? ''; } catch { return ''; } });
  const [error, setError] = useState(false);
  return <><label htmlFor={storageKey}>{label}</label><textarea id={storageKey} rows={rows} value={text} onChange={event => { setText(event.target.value); try { localStorage.setItem(storageKey, event.target.value); setError(false); } catch { setError(true); } }} /><p className="meta" role={error ? 'alert' : 'status'}>{error ? 'Saving is unavailable. Download or copy your work before leaving.' : 'Saved in this browser on this device.'}</p>{text && <a className="btn btn-secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download={`${storageKey}.txt`}>Download my draft</a>}</>;
}

export function JahshanProductivePractice({ skill }: { skill: 'writing' | 'speaking' }) {
  const [sample, setSample] = useState(1);
  const speaking = skill === 'speaking';
  const source = speaking ? `official-exam-papers/sample-${sample}-speaking-candidate.pdf` : `official-exam-papers/sample-${sample}-writing.pdf`;
  const partner = `official-exam-papers/sample-${sample}-speaking-partner.pdf`;
  const checklist = speaking
    ? ['I explored the patient’s concerns before giving advice.', 'I used clear, patient-friendly language and checked understanding.', 'I responded to emotion and involved the patient in decisions.', 'I agreed a safe, practical next step.']
    : ['I addressed the correct recipient and purpose.', 'I selected and prioritised relevant case-note details.', 'I organised the letter so the reader can act on it.', 'I checked tone, clarity, grammar, spelling and closing.'];
  return <div className="jahshan-productive">
    <section className="card"><span className="section-kicker">SUPPLEMENTARY OFFICIAL OET SAMPLES</span><h2>{speaking ? 'Speaking practice' : 'Writing practice'}</h2><p>The supplied Jahshan archive contains Listening and Reading books only. These two official OET sample tasks are included here as supplementary practice, with a guided work and review flow.</p><label htmlFor="jahshan-productive-sample">Choose a sample</label><select id="jahshan-productive-sample" value={sample} onChange={event => setSample(Number(event.target.value))}><option value={1}>Official sample 1</option><option value={2}>Official sample 2</option></select></section>
    <section className="card"><h3>1 · Open the {speaking ? 'role-play cards' : 'case notes and task'}</h3><p>{speaking ? 'Give your partner the partner card. Keep the candidate card for yourself. Warm up briefly, then prepare your approach.' : 'Read the complete task and case notes first. Identify the recipient, purpose and facts that matter before drafting.'}</p><div className="study-source-links"><a className="btn btn-primary" href={asset(source)} target="_blank" rel="noopener noreferrer">Open {speaking ? 'candidate' : 'writing'} sample {sample} ↗</a>{speaking && <a className="btn btn-secondary" href={asset(partner)} target="_blank" rel="noopener noreferrer">Open partner card {sample} ↗</a>}</div><div className="jahshan-sample-preview"><iframe title={`Official OET ${skill} sample ${sample}`} src={asset(source)} /></div></section>
    <section className="card"><h3>2 · {speaking ? 'Prepare and perform' : 'Use the exam time'}</h3>{speaking ? <><p>Use the candidate card to plan a patient-centred conversation. Ask your partner to play the patient and respond naturally instead of reading a script.</p><PhaseClock key={`speaking-prep-${sample}`} minutes={3} label="Preparation" onComplete={() => {}} /><h4>Record your role-play</h4><PhaseClock key={`speaking-time-${sample}`} minutes={5} label="Role-play" onComplete={() => {}} /><VoiceRecorder /><SavedText key={`speaking-draft-${sample}`} storageKey={`jahshan-speaking-sample-${sample}`} label="Transcript or notes from your role-play" rows={8} /></> : <><p>OET on Paper Writing uses five minutes to read the case notes and 40 minutes to write. Start each clock when ready; use the case notes above as your source.</p><PhaseClock key={`writing-prep-${sample}`} minutes={5} label="Reading" onComplete={() => {}} /><PhaseClock key={`writing-time-${sample}`} minutes={40} label="Writing" onComplete={() => {}} /><SavedText key={`writing-draft-${sample}`} storageKey={`jahshan-writing-sample-${sample}`} label="Your letter draft" rows={18} /></>}</section>
    <section className="card"><h3>3 · Review your work</h3><p>Use the relevant points below to review your communication. This practice area does not assign an official OET grade.</p><ul className="jahshan-review-list">{checklist.map(item => <li key={item}><label><input type="checkbox" />{item}</label></li>)}</ul><SavedText key={`review-${skill}-${sample}`} storageKey={`jahshan-${skill}-review-${sample}`} label="Corrections and next-practice notes" rows={6} /></section>
  </div>;
}
