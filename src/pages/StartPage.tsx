import type { NavSection } from '../types';
import { readWalkthroughProgress, walkthroughs } from '../data/walkthroughs';
import './walkthrough.css';

type Props = { onNavigate: (section: NavSection, itemId?: string) => void };
export function StartPage({ onNavigate }: Props) {
  const done = readWalkthroughProgress();
  const next = walkthroughs.find(lesson => !done.includes(lesson.id));
  return <div className="learning-path">
    <section className="card path-hero"><span className="section-kicker">YOUR OET LEARNING PATH</span><h2>Start here. One step at a time.</h2><p>First see how an answer is built. Then practise one skill, try a timed test, and review what you missed.</p><p className="path-progress">{done.length} of 8 walkthroughs completed · Progress saved in this browser</p><button className="btn btn-primary" onClick={() => onNavigate(next ? 'walkthrough' : 'practice', next?.id)}>{done.length === 0 ? 'Start my first walkthrough' : next ? 'Continue my walkthroughs' : 'Choose my practice'}</button>{next && <p className="meta">Up next: {next.title}</p>}</section>
    <ol className="path-steps">{[
      { title: 'Learn the method', text: 'Eight worked lessons: Listening A/B/C, Reading A/B/C, Writing and Speaking.', section: 'walkthrough' as const, label: '1 · Walkthroughs' },
      { title: 'Practise one skill', text: 'Choose a complete official OET paper. Keep worked examples and AMR notes for learning time.', section: 'practice' as const, label: '2 · Practice' },
      { title: 'Try timed practice', text: 'Apply the method without help. For listening, use the original recording and its own paper.', section: 'mock' as const, label: '3 · Timed tests' },
      { title: 'Review and repeat', text: 'Find the evidence you missed. Write one correction and try that skill again.', section: 'mistakes' as const, label: '4 · Review' },
    ].map(step => <li className="card" key={step.section}><span className="section-kicker">{step.label}</span><h3>{step.title}</h3><p>{step.text}</p><button className="btn btn-secondary" onClick={() => onNavigate(step.section)}>{step.label} →</button></li>)}</ol>
    <p className="meta">You can jump to any step. Your AMR files and NotebookLM notes are always available under Study materials.</p>
  </div>;
}

export function PracticeChoicePage({ onNavigate }: Props) {
  return <div className="learning-path"><section className="card path-hero"><span className="section-kicker">STEP 2</span><h2>Choose one skill for today</h2><p>Use the walkthrough first if you are unsure how to approach a question.</p></section><div className="path-skill-grid">{(['listening', 'reading', 'writing', 'speaking'] as const).map(skill => <section className="card" key={skill}><h3>{skill[0].toUpperCase() + skill.slice(1)}</h3><p>{skill === 'listening' ? 'Original human OET recordings with matching questions. No computer-generated listening voices.' : skill === 'reading' ? 'Complete an original 42-question paper: 15 minutes for A, then 45 for B and C.' : skill === 'writing' ? 'Use original Medicine case notes: five minutes to read, then 40 minutes to write.' : 'Prepare and perform two official role-plays with a human partner.'}</p><button className="btn btn-primary" onClick={() => onNavigate('practice', skill)}>Practise {skill}</button><button className="btn btn-ghost" onClick={() => onNavigate('walkthrough', skill === 'listening' || skill === 'reading' ? `${skill}-a` : skill)}>Show me how →</button></section>)}</div><a href="#materials" className="btn btn-secondary">Use my OET & AMR files →</a></div>;
}
