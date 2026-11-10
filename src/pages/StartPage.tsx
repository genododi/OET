import { priorityCollections } from '../lib/studyNavigation';
import { readStudyLocation } from '../lib/studyResume';
import { useTestReviews } from '../lib/testReviews';
import { AppIcon } from '../components/AppIcon';
import type { NavSection } from '../types';
import { readWalkthroughProgress, walkthroughs } from '../data/walkthroughs';
import './walkthrough.css';

type Props = { onNavigate: (section: NavSection, itemId?: string, returnTo?: 'recent') => void };
export function StartPage({ onNavigate }: Props) {
  const done = readWalkthroughProgress();
  const next = walkthroughs.find(lesson => !done.includes(lesson.id));
  const last = readStudyLocation();
  const reviews = useTestReviews();
  const latest = reviews.find(review => review.state === 'complete');
  return <div className="study-hub study-desk">
    <section className="study-desk-hero"><div><span className="section-kicker">A LITTLE FOCUS. A BETTER SESSION.</span><h2>Your next test starts here.</h2><p>Choose your collection, work through one test, then let your mentor help you review what you learned.</p><button type="button" className="btn btn-primary" onClick={()=>onNavigate(last?.section ?? 'benchmark',last?.itemId,last?.returnTo)}>{last ? `Return to ${last.label}` : 'Start with Benchmark'} <span aria-hidden="true">→</span></button>{last && <span className="study-resume-note">Your last study page · answers stay with their test</span>}</div><div className="study-desk-method" aria-label="Study steps"><span><b>01</b> Choose a test</span><span><b>02</b> Find the evidence</span><span><b>03</b> Review & improve</span></div></section>
    <section aria-labelledby="my-collections"><div className="study-section-heading"><div><span className="section-kicker">YOUR PRIORITIES</span><h2 id="my-collections">My study collections</h2></div><span>Everything you use most, together.</span></div><div className="study-collection-grid">{priorityCollections.map(collection=><button type="button" key={collection.id} aria-label={`Open ${collection.label}`} className={`study-collection-card collection-${collection.accent}`} onClick={()=>onNavigate(collection.id)}><span className="study-collection-icon"><AppIcon name={collection.icon}/></span><strong>{collection.label}</strong><span>{collection.description}</span><b>Open collection <span aria-hidden="true">↗</span></b></button>)}</div></section>
    <section className="study-desk-review"><div><span className="section-kicker">TURN A FINISHED TEST INTO PROGRESS</span><h3>{latest ? 'Your latest mentor review is ready' : 'Finish a test. Keep the learning.'}</h3><p>{latest ? latest.title : 'Mark your test Done to save a review of mistakes, important points and useful takeaways.'}</p></div><button className="btn btn-secondary" onClick={()=>onNavigate('reviews')}>My test reviews →</button></section>
    <div className="study-desk-help"><span>Need the method first?</span><button type="button" className="link-btn" onClick={()=>onNavigate(next ? 'walkthrough':'tools',next?.id)}>{done.length===0?'Start my first walkthrough':next?'Continue my walkthroughs':'Browse study tools'}</button><span>{done.length} / {walkthroughs.length} walkthroughs completed</span></div>
  </div>;
}

export function PracticeChoicePage({ onNavigate }: Props) {
  return <div className="learning-path"><section className="card path-hero"><span className="section-kicker">PRIORITY 1 · OFFICIAL PAPERS</span><h2>Choose one skill for today</h2><p>Use the walkthrough first if you are unsure how to approach a question.</p></section><div className="path-skill-grid">{(['listening', 'reading', 'writing', 'speaking'] as const).map(skill => <section className="card" key={skill}><h3>{skill[0].toUpperCase() + skill.slice(1)}</h3><p>{skill === 'listening' ? 'Original human OET recordings with matching questions. No computer-generated listening voices.' : skill === 'reading' ? 'Complete an original 42-question paper: 15 minutes for A, then 45 for B and C.' : skill === 'writing' ? 'Use original Medicine case notes: five minutes to read, then 40 minutes to write.' : 'Prepare and perform two official role-plays with a human partner.'}</p><button className="btn btn-primary" onClick={() => onNavigate('practice', skill)}>Practise {skill}</button><button className="btn btn-ghost" onClick={() => onNavigate('walkthrough', skill === 'listening' || skill === 'reading' ? `${skill}-a` : skill)}>Show me how →</button></section>)}</div><a href="#materials" className="btn btn-secondary">Use my OET & AMR files →</a></div>;
}
