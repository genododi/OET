import type { NavSection } from '../types';
import { readWalkthroughProgress, walkthroughs } from '../data/walkthroughs';
import './walkthrough.css';

type Props = { onNavigate: (section: NavSection, itemId?: string) => void };
export function StartPage({ onNavigate }: Props) {
  const done = readWalkthroughProgress();
  const next = walkthroughs.find(lesson => !done.includes(lesson.id));
  return <div className="learning-path">
    <section className="card path-hero"><span className="section-kicker">YOUR PREPARATION PRIORITIES</span><h2>Start here. One step at a time.</h2><p>Start with an official paper. Build toward timed mocks, then review your errors and plan your next practice.</p><button className="btn btn-primary" onClick={() => onNavigate('practice')}>Start official exam practice</button><p className="meta">Need the method first? Use a worked walkthrough.</p><button className="btn btn-secondary" onClick={() => onNavigate(next ? 'walkthrough' : 'practice', next?.id)}>{done.length === 0 ? 'Start my first walkthrough' : next ? 'Continue my walkthroughs' : 'Choose my practice'}</button><p className="path-progress">{done.length} of 8 walkthroughs completed · Progress saved on this device</p>{next && <p className="meta">Next walkthrough: {next.title}</p>}</section>
    <ol className="path-steps">{[
      { title: 'Practise official papers', text: 'Choose Reading, Listening, Writing or Speaking. Use the original task and its matching human recording.', section: 'practice' as const, label: '1 · Official exam practice' },
      { title: 'Try a timed mock', text: 'Apply the method under OET on Paper timing. For Listening, play the original recording once.', section: 'mock' as const, label: '2 · Timed mock exams' },
      { title: 'Review your mistakes', text: 'Find the evidence you missed. Write one correction and repeat your weakest skill.', section: 'mistakes' as const, label: '3 · Review mistakes' },
      { title: 'Plan the next session', text: 'Use your results to decide what to practise next. Keep your plan focused on the skills that need work.', section: 'planner' as const, label: '4 · My study plan' },
    ].map(step => <li className="card" key={step.section}><span className="section-kicker">{step.label}</span><h3>{step.title}</h3><p>{step.text}</p><button className="btn btn-secondary" onClick={() => onNavigate(step.section)}>{step.label} →</button></li>)}</ol>
    <p className="meta">Benchmark, Jahshan and your OET & AMR files are in “Extra practice collections”. Walkthroughs, the mentor and NotebookLM notes are in “Help & exam methods”.</p>
  </div>;
}

export function PracticeChoicePage({ onNavigate }: Props) {
  return <div className="learning-path"><section className="card path-hero"><span className="section-kicker">PRIORITY 1 · OFFICIAL PAPERS</span><h2>Choose one skill for today</h2><p>Use the walkthrough first if you are unsure how to approach a question.</p></section><div className="path-skill-grid">{(['listening', 'reading', 'writing', 'speaking'] as const).map(skill => <section className="card" key={skill}><h3>{skill[0].toUpperCase() + skill.slice(1)}</h3><p>{skill === 'listening' ? 'Original human OET recordings with matching questions. No computer-generated listening voices.' : skill === 'reading' ? 'Complete an original 42-question paper: 15 minutes for A, then 45 for B and C.' : skill === 'writing' ? 'Use original Medicine case notes: five minutes to read, then 40 minutes to write.' : 'Prepare and perform two official role-plays with a human partner.'}</p><button className="btn btn-primary" onClick={() => onNavigate('practice', skill)}>Practise {skill}</button><button className="btn btn-ghost" onClick={() => onNavigate('walkthrough', skill === 'listening' || skill === 'reading' ? `${skill}-a` : skill)}>Show me how →</button></section>)}</div><a href="#materials" className="btn btn-secondary">Use my OET & AMR files →</a></div>;
}
