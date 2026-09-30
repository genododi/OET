import { useState } from 'react';
import { notebookLessons, notebookSource, notebookWritingChecklist } from '../data/notebookNotes';
import { SavedStudyNotes } from '../components/SavedStudyNotes';
import './studySources.css';

export function NotebookPage() {
  const [skill, setSkill] = useState('writing');
  return <div className="page-section study-sources">
    <section className="card study-source-hero">
      <span className="hero-eyebrow">YOUR NOTEBOOK → YOUR PRACTICE</span>
      <h2>Put your OET notes to work</h2>
      <p>Your saved writing guide, adapted into practical steps for your local OET and AMR collection.</p>
      <div className="study-source-links"><a className="btn btn-primary" href="#materials">Open OET & AMR files</a><a className="btn btn-secondary" href={notebookSource.url} target="_blank" rel="noopener noreferrer">Open original NotebookLM ↗</a></div>
      <p className="meta">Imported {notebookSource.importedAt} · 1 saved report based on {notebookSource.sourceCount} sources, plus selected chat study themes. Snapshot import; changes in NotebookLM do not sync automatically. Original notebook requires your Google access.</p>
    </section>
    <div className="study-skill-tabs" role="group" aria-label="Notebook skill">{['writing','reading','speaking','listening'].map(s => <button key={s} aria-pressed={skill === s} onClick={() => setSkill(s)}>{s}</button>)}</div>
    {skill === 'writing' && <>
      <article className="card"><h3>{notebookSource.title}</h3><p>NotebookLM generated this report from your sources. The applied guide qualifies unsupported rules about fixed word limits, expanding every acronym and “banned” linking words. It does not assign an OET grade.</p><a href={`${import.meta.env.BASE_URL}notebook-notes/oet-writing-guide.md`} download>Download imported study summary</a> · <a href="https://oet.com/ready/writing" target="_blank" rel="noopener noreferrer">Official writing guidance ↗</a></article>
      <div className="study-lesson-grid">{notebookLessons.map((lesson, i) => <article className="card" key={lesson.title}><span className="study-step">0{i + 1}</span><h3>{lesson.title}</h3><p>{lesson.text}</p><p className="study-apply"><strong>Apply it:</strong> {lesson.task}</p></article>)}</div>
      <article className="card"><h3>Your AMR review checklist</h3><ul>{notebookWritingChecklist.map(item => <li key={item}>{item}</li>)}</ul><p>This checklist is also available beside every writing task in My OET & AMR Files.</p><a className="btn btn-primary" href="#materials">Choose a case and write →</a></article>
    </>}
    {skill === 'reading' && <article className="card"><h3>Read for evidence</h3><p>From your notebook’s Part B strategies: identify the setting and audience, read the question for its purpose, then return to the passage for evidence.</p><ol><li>Write your answer before checking the key.</li><li>Copy the phrase that supports it.</li><li>Explain why each distractor does not fit the passage.</li></ol><p>Use the supplied paper’s questions and answer key. The notebook’s short generated sets are mini exercises, not complete official exams.</p><a href="#materials">Choose a reading source →</a></article>}
    {skill === 'speaking' && <article className="card"><h3>John Davies: explore the patient’s concerns</h3><p>Adapted from your notebook role-play: a busy accountant is worried about an investigation and taking time away from work. Use 3 minutes to prepare and 5 minutes to practise the communication.</p><ol><li>Open with a question and find out what worries him most.</li><li>Acknowledge the worry without making guarantees.</li><li>Ask permission to explain; use short, clear sections.</li><li>Invite questions, check understanding and agree next steps.</li></ol><blockquote>“I’m worried about the procedure, and I can’t keep taking time off work.”</blockquote><p>Practise your response to that concern. This adapted language exercise omits the notebook’s unverified treatment recommendations and promises of painless procedures or absolute certainty.</p><a href="#materials">Open a source and record your response →</a></article>}
    {skill === 'listening' && <article className="card"><h3>Use original recordings</h3><p>Your notebook points to external audio collections. Its written transcripts and AI Audio Overviews are not original OET recordings. Practise with OET’s human-recorded samples, paired by the publisher with the question packs and answer keys.</p><a className="btn btn-primary" href="#listening">Open real listening recordings →</a></article>}
    <article className="card"><SavedStudyNotes key={skill} storageKey={`oet-notebook-${skill}-v1`} label={`My ${skill} practice and corrections`} placeholder="Source or case title, my attempt, evidence and what I will improve next time…" /></article>
  </div>;
}
