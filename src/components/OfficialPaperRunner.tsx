import { useEffect, useRef, useState } from 'react';
import { PdfViewer } from './PdfViewer';
import { officialPaperAsset, paperSamples, paperStages, paperPosition, type PaperSkill } from '../data/officialExamPractice';
import '../pages/officialExam.css';

interface Attempt { startedAt: number | null; submitted: boolean; answers: Record<string, string>; letter: string; medium: 'paper' | 'screen' }
const emptyAttempt = (): Attempt => ({ startedAt: null, submitted: false, answers: {}, letter: '', medium: 'paper' });
function readAttempt(key: string): Attempt {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (value && (value.startedAt === null || (typeof value.startedAt === 'number' && Number.isFinite(value.startedAt))) && typeof value.submitted === 'boolean' && typeof value.letter === 'string' && value.answers && typeof value.answers === 'object' && !Array.isArray(value.answers)) return { ...value, medium: value.medium === 'screen' ? 'screen' : 'paper' };
  } catch { /* New attempt when storage is unavailable or invalid. */ }
  return emptyAttempt();
}
export function OfficialPaperRunner({ skill, sample, onExit, continuousStart, onComplete }: { skill: PaperSkill; sample: number; onExit: () => void; continuousStart?: number; onComplete?: () => void }) {
  const key = continuousStart === undefined ? `oet-official-paper-${skill}-${sample}-v1` : `oet-full-paper-${skill}-${sample}-${continuousStart}-v1`;
  const [attempt, setAttempt] = useState(() => continuousStart === undefined ? readAttempt(key) : { ...emptyAttempt(), startedAt: continuousStart });
  const [now, setNow] = useState(Date.now);
  const [storageError, setStorageError] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const stages = paperStages(skill, sample);
  const position = paperPosition(stages, attempt.startedAt ?? now, now);
  const stage = stages[position.index];
  const done = attempt.submitted || (attempt.startedAt !== null && position.done);
  const completionSent = useRef(false);
  useEffect(() => { if (done && onComplete && !completionSent.current) { completionSent.current = true; onComplete(); } }, [done, onComplete]);
  const paper = paperSamples.find(item => item.number === sample)!;
  const update = (value: Attempt) => {
    setAttempt(value);
    try { localStorage.setItem(key, JSON.stringify(value)); setStorageError(false); }
    catch { setStorageError(true); }
  };
  useEffect(() => {
    if (attempt.startedAt === null || done) return;
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 250);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(interval); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [attempt.startedAt, done]);
  // Recheck the deadline in input handlers as well as on screen updates.
  const canRespond = (at: number) => attempt.startedAt !== null && !attempt.submitted && !paperPosition(stages, attempt.startedAt, at).done && paperPosition(stages, attempt.startedAt, at).index === position.index;
  const minutes = Math.floor(position.secondsLeft / 60);
  const seconds = String(position.secondsLeft % 60).padStart(2, '0');
  const readingPartA = stage.response === 'reading-a';
  const questions = Array.from({ length: readingPartA ? 20 : 22 }, (_, i) => i + 1);
  const answerText = skill === 'writing' ? attempt.letter : Object.entries(attempt.answers).map(([id, value]) => `${id}: ${value}`).join('\n');
  return <div className="page-section official-paper-runner"><button className="btn btn-ghost" onClick={onExit}>← Back to official tests</button>
    {storageError && <p role="alert">Browser storage is unavailable. Keep this page open and download your response before leaving.</p>}
    {attempt.startedAt === null ? <section className="card"><span className="section-kicker">OFFICIAL PAPER · TIMED PRACTICE</span><h2>{skill === 'speaking' ? 'Two official Medicine role-plays' : `${paper.title} · ${skill}`}</h2><p>Original OET questions and instructions. Print the question pack before starting and write your answers by hand to rehearse OET on Paper. An optional on-screen worksheet is available for convenience.</p>{skill !== 'speaking' && <><a className="btn btn-secondary" href={paper.questionsUrl} target="_blank" rel="noopener noreferrer">Open question pack to print ↗</a><p><label><input type="checkbox" checked={attempt.medium === 'paper'} onChange={e => update({ ...attempt, medium: e.target.checked ? 'paper' : 'screen' })} /> I will write my answers on paper</label></p></>}<ul>{stages.map(item => <li key={item.id}>{item.title} — {item.seconds / 60} minutes</li>)}</ul><p>The timer continues if you switch tabs or reload. Completed phases cannot be reopened. Answers and teaching help are hidden until the end.</p>{skill === 'speaking' && <><p>Speaking is a live conversation with a person, not a typed answer. Ask a partner to play the patient. Warm up with general questions about your work before starting; the warm-up is unassessed. Cards 1 and 2 below are combined from official samples 1 and 2.</p><div className="study-source-links">{[1, 2].map(card => <a key={card} href={officialPaperAsset(card, 'speaking-partner')} target="_blank" rel="noopener noreferrer">Partner’s card {card} ↗</a>)}</div><label><input type="checkbox" checked={partnerReady} onChange={e => setPartnerReady(e.target.checked)} /> My partner has the patient cards and our warm-up is complete</label><p className="meta">No automatic speaking grade is issued. Have a qualified OET teacher assess your performance against the official criteria.</p></>}
    <button className="btn btn-primary" disabled={skill === 'speaking' && !partnerReady} onClick={() => { const startedAt = Date.now(); setNow(startedAt); update({ ...emptyAttempt(), startedAt, medium: attempt.medium }); }}>Start timed {skill}</button></section> : done && onComplete ? <p role="status">Moving to the next section…</p> : done ? <section className="card"><h2>{skill[0].toUpperCase() + skill.slice(1)} practice complete</h2><p>Your responses are now locked. Review against the publisher’s key or sample response. A raw practice result is not an official OET grade.</p>{skill !== 'speaking' && <><a className="btn btn-primary" href={paper.answersUrl} target="_blank" rel="noopener noreferrer">Open official answers and sample letter ↗</a><pre className="official-response-review">{attempt.medium === 'paper' ? 'Compare your handwritten response with the official key or sample letter.' : answerText || 'No response entered.'}</pre>{attempt.medium === 'screen' && <a className="btn btn-secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(answerText)}`} download={`${skill}-sample-${sample}-response.txt`}>Download my response</a>}</>}{skill === 'speaking' && <p>Review intelligibility, fluency, appropriate language, grammar and expression, rapport, the patient’s perspective, structure, information gathering and information giving with your partner or teacher.</p>}<button className="btn btn-secondary" onClick={() => { update(emptyAttempt()); setConfirmSubmit(false); }}>New attempt</button></section> : <>
      <div className="session-toolbar"><h2>{stage.title}</h2><strong className="session-timer" role="timer" aria-label="Time remaining">{minutes}:{seconds}</strong></div>
      <p className="meta">{position.index > 0 ? 'Earlier phases are closed. ' : ''}{stage.response === 'locked' ? 'Preparation / reading time. Responses are locked.' : 'No hints, model answers or feedback during the test.'}</p>
      <div className="official-paper-layout"><PdfViewer key={stage.asset + stage.sample} src={officialPaperAsset(stage.sample, stage.asset)} title={`${stage.title} official paper`} /><section className="card official-response-sheet">
        {attempt.medium === 'paper' && skill !== 'speaking' && <><h3>Write on your printed paper</h3><p>{stage.response === 'locked' ? 'Reading time only. Do not write until the five minutes have elapsed.' : 'Complete the questions for this phase on paper. Stop writing when the phase ends.'}</p><p>Keep earlier Reading Part A papers out of reach after the phase changes. The screen also closes that section.</p></>}
        {skill === 'reading' && attempt.medium === 'screen' && <><h3>{readingPartA ? 'Part A · 20 answers' : 'Parts B & C · 22 answers'}</h3><p>{readingPartA ? '1–7: write A, B, C or D. Use words or short phrases for the remaining answers.' : 'Numbering restarts here, exactly as in the paper. Part B: 1–6 (A–C). Part C: 7–22 (A–D).'}</p>{questions.map(number => { const id = `${readingPartA ? 'A' : 'BC'}-${number}`; return <div className="official-answer" key={id}>{readingPartA ? <label>{`Part A question ${number}`}<input value={attempt.answers[id] ?? ''} autoComplete="off" spellCheck={false} onChange={e => { if (canRespond(Date.now())) update({ ...attempt, answers: { ...attempt.answers, [id]: e.target.value } }); }} /></label> : <fieldset><legend>{`Question ${number}`}</legend>{(number <= 6 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map(letter => <label key={letter}><input type="radio" name={id} checked={attempt.answers[id] === letter} onChange={() => { if (canRespond(Date.now())) update({ ...attempt, answers: { ...attempt.answers, [id]: letter } }); }} />{letter}</label>)}</fieldset>}</div>; })}</>}
        {skill === 'writing' && attempt.medium === 'screen' && <><label htmlFor="official-letter">Your letter</label><textarea id="official-letter" rows={25} spellCheck={false} autoCorrect="off" disabled={stage.response !== 'writing'} value={attempt.letter} placeholder="Writing unlocks after the five-minute reading period." onChange={e => { if (canRespond(Date.now()) && stage.response === 'writing') update({ ...attempt, letter: e.target.value }); }} /><p className="meta">Follow the printed task. Approximately 180–200 words in the body; use letter format.</p></>}
        {skill === 'speaking' && <><h3>{stage.response === 'conversation' ? 'Speak with your partner now' : 'Read and prepare'}</h3><p>{stage.response === 'conversation' ? 'Your partner responds as the patient. Follow the card and respond naturally. The role-play ends when this five-minute phase expires.' : 'You have three minutes to prepare. Your partner should keep the patient card private during the role-play.'}</p><p>No synthetic patient voice, transcript scoring or model response is used in this test.</p></>}
      </section></div>
      {!onComplete && position.index === stages.length - 1 && skill !== 'speaking' && <div className="card">{confirmSubmit ? <><p>Submit this entire section now? You will not be able to change your answers.</p><button className="btn btn-primary" onClick={() => update({ ...attempt, submitted: true })}>Confirm submission</button><button className="btn btn-secondary" onClick={() => setConfirmSubmit(false)}>Keep working</button></> : <button className="btn btn-secondary" onClick={() => setConfirmSubmit(true)}>Finish and submit section</button>}</div>}
    </>}
  </div>;
}
