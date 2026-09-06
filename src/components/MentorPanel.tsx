import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompletedSession, SessionTask } from '../types/session';
import type { MentorTopic } from '../data/mentorCurriculum';
import { useApiKey } from '../lib/apiKeyStore';
import { useSettingsContext } from '../lib/settingsContext';
import { guidedMentorReply, mentorGreeting, type MentorAction, type MentorContext, type MentorMessage } from '../lib/mentor';
import { streamMentorReply } from '../lib/mentorApi';
import { buildLearnerMemory, readMentorLessons, saveMentorLesson } from '../lib/mentorMemory';
import { MentorVoiceControls } from './MentorVoiceControls';

interface Props {
  task: SessionTask;
  response: string;
  completed: CompletedSession[];
  topic?: MentorTopic;
  lessonKey?: string;
  onInteraction?: () => void;
  onReviewed?: (response: string) => void;
  onPatientTurn?: (text: string) => void;
}

const ACTIONS: { action: MentorAction; label: string; query: string }[] = [
  { action: 'strategy', label: 'Teach the approach', query: 'Walk me through a strategy for this task. Ask me one question to check my understanding.' },
  { action: 'hint', label: 'Give me a hint', query: 'Give me one hint without revealing the answer.' },
  { action: 'feedback', label: 'Review my response', query: 'Review my current response. Be specific about what works, what to change, and what I should try next.' },
  { action: 'explain', label: 'Explain the worked answer', query: 'Explain how a strong answer is built and compare it with my attempt.' },
];

export function MentorPanel({ task, response, completed, topic, lessonKey, onInteraction, onReviewed, onPatientTurn }: Props) {
  const { apiKey, hasKey } = useApiKey();
  const { openSettings } = useSettingsContext();
  const key = lessonKey ?? `practice-${task.id}`;
  const [messages, setMessages] = useState<MentorMessage[]>(() => readMentorLessons()[key]?.messages ?? [
    { id: 'welcome', role: 'assistant', text: mentorGreeting(task, topic), source: 'guide' },
  ]);
  const [engine, setEngine] = useState<'guide' | 'ai'>(hasKey ? 'ai' : 'guide');
  const [mode, setMode] = useState<'coach' | 'patient'>('coach');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState('');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [failedContext, setFailedContext] = useState<MentorContext | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const log = useRef<HTMLDivElement>(null);
  const pendingSave = useRef<(() => void) | null>(null);
  const learnerMemory = useMemo(() => buildLearnerMemory(completed, task.id), [completed, task.id]);
  const lastReply = [...messages].reverse().find((message) => message.role === 'assistant')?.text ?? '';

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; controllerRef.current?.abort(); };
  }, []);
  useEffect(() => {
    const persist = () => saveMentorLesson(key, { messages, response, updatedAt: new Date().toISOString() });
    pendingSave.current = persist;
    const timeout = window.setTimeout(() => {
      try { persist(); pendingSave.current = null; setSaveError(''); }
      catch { setSaveError('Browser storage is full or unavailable. This conversation is available until you leave; copy important notes.'); }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [key, messages, response]);
  useEffect(() => {
    const flush = () => { try { pendingSave.current?.(); pendingSave.current = null; } catch { /* Storage can be unavailable while leaving the page. */ } };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, stream]);

  const request = async (action: MentorAction, query: string, retry?: MentorContext) => {
    if (busy.current || (!query.trim() && !retry)) return;
    if ((action === 'feedback' || action === 'explain') && !response.trim() && !retry) { setError('Try a response in the answer area first.'); return; }
    if (engine === 'ai' && !hasKey) { openSettings(); return; }
    onInteraction?.();
    const nextHint = action === 'hint' ? Math.min(3, hintLevel + 1) : hintLevel;
    setHintLevel(nextHint);
    const responseLabel = task.options?.find((option) => option.id === response)?.label ?? response;
    const questionText = (action === 'feedback' || action === 'explain')
      ? `${query.trim()}\n\nMy current response:\n${responseLabel}`
      : query.trim();
    const history: MentorMessage[] = retry?.messages ?? [...messages, { id: crypto.randomUUID(), role: 'user', text: questionText.slice(0, 12000) }];
    const context: MentorContext = retry ?? { task, response, topic, learnerMemory, hintLevel: nextHint, action, messages: history };
    setMessages(history.slice(-40)); setInput(''); setError(''); setStream(''); setFailedContext(null);
    if (action === 'patient' && !retry) onPatientTurn?.(query.trim());
    busy.current = true; setLoading(true);
    const controller = new AbortController(); controllerRef.current = controller;
    try {
      const reply = engine === 'ai'
        ? await streamMentorReply(context, apiKey ?? '', controller.signal, (text) => { if (alive.current) setStream(text); })
        : guidedMentorReply(context);
      if (!alive.current || controller.signal.aborted) return;
      const next: MentorMessage[] = [...history, { id: crypto.randomUUID(), role: 'assistant', text: reply, source: engine }];
      setMessages(next.slice(-40)); setStream('');
      if (context.action === 'feedback' || context.action === 'explain') onReviewed?.(context.response);
    } catch (cause) {
      if (!alive.current) return;
      setStream('');
      setError(controller.signal.aborted ? 'Reply stopped. You can retry or ask a different question.' : cause instanceof Error ? cause.message : 'Could not reach the tutor. Please retry.');
      setFailedContext(context);
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  };
  return (
    <section className="mentor-panel" aria-label="Interactive OET mentor">
      <div className="mentor-panel-head">
        <div><span className="section-kicker">Your private study room</span><h3>{mode === 'patient' ? 'Patient role-play' : 'Let’s work it out together'}</h3></div>
        <span className={`mentor-engine-badge ${engine === 'ai' ? 'live' : ''}`}>{engine === 'ai' ? 'Live AI' : 'Built-in guide'}</span>
      </div>
      <div className="mentor-controls">
        <label>Tutor connection<select value={engine} disabled={loading} onChange={(event) => setEngine(event.target.value as 'ai' | 'guide')}><option value="guide">Built-in guide · no key needed</option><option value="ai">Live AI · conversational mentoring</option></select></label>
        {task.subtest === 'speaking' && <label>Conversation mode<select value={mode} disabled={loading} onChange={(event) => setMode(event.target.value as 'coach' | 'patient')}><option value="coach">Coach me</option><option value="patient">Play the patient</option></select></label>}
      </div>
      {engine === 'ai' ? <p className="mentor-connection-note">Your task, response, recent conversation and study summary are sent directly to Anthropic when you send a message. API usage is billed to your account. <button type="button" className="link-btn" onClick={openSettings}>{hasKey ? 'Connection settings' : 'Add API key to connect'}</button></p> : <p className="mentor-connection-note">Structured strategies, hints and rubric checks work here without a key. Live AI adds open-ended follow-up and adaptive patient dialogue.</p>}
      <div className="mentor-chat" ref={log} role="log" aria-label="Mentor conversation" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => <article key={message.id} className={`mentor-bubble mentor-${message.role}`}><span>{message.role === 'user' ? 'You' : message.source === 'ai' ? 'AI mentor' : 'Study guide'}</span><p>{message.text}</p></article>)}
        {loading && <article className="mentor-bubble mentor-assistant mentor-stream"><span>{mode === 'patient' ? 'Patient' : 'Mentor'}</span><p>{stream || 'Thinking through your task…'}</p></article>}
      </div>
      {error && <div className="mentor-error" role="alert"><p>{error}</p>{failedContext && <button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={() => request(failedContext.action, '', failedContext)}>Retry reply</button>}</div>}
      {saveError && <p className="mentor-error" role="status">{saveError}</p>}
      {mode === 'coach' && <div className="mentor-prompts">{ACTIONS.map(({ action, label, query }) => <button type="button" key={action} disabled={loading || ((action === 'feedback' || action === 'explain') && !response.trim())} onClick={() => request(action, query)}>{label}</button>)}</div>}
      {mode === 'patient' && <p className="meta">Speak or type as the doctor. The patient replies one turn at a time. Switch to “Coach me” for feedback.</p>}
      <MentorVoiceControls onDictation={setInput} reply={lastReply} disabled={loading} />
      <form className="mentor-composer" onSubmit={(event) => { event.preventDefault(); void request(mode === 'patient' ? 'patient' : 'ask', input); }}>
        <label className="sr-only" htmlFor={`mentor-message-${task.id}`}>{mode === 'patient' ? 'Your words to the patient' : 'Ask your mentor'}</label>
        <textarea id={`mentor-message-${task.id}`} value={input} maxLength={4000} rows={3} onChange={(event) => setInput(event.target.value)} placeholder={mode === 'patient' ? 'Hello, I’m your doctor today. How can I help?' : 'Ask about this question, your reasoning, a sentence, or the next step…'} disabled={loading} />
        {loading ? <button type="button" className="btn btn-secondary" onClick={() => controllerRef.current?.abort()}>Stop reply</button> : <button type="submit" className="btn btn-primary" disabled={!input.trim()}>{mode === 'patient' ? 'Speak to patient' : 'Send to mentor'}</button>}
      </form>
      <p className="mentor-footnote">English only · Recent lessons saved on this device · Coaching feedback is not an official OET assessment.</p>
    </section>
  );
}
