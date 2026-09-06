import type { OetSubtest } from '../types';
import { referencesForSkill } from '../data/mentorReferences';

export function MentorReferences({ skill }: { skill: OetSubtest }) {
  return <details className="mentor-references"><summary>Learn from public instructors & OET</summary><p className="meta">Open a lesson at its original source. The mentor uses the short teaching notes shown here; linked videos are not automatically transcribed.</p><div>{referencesForSkill(skill).map((reference) => <article key={reference.id}><span>{reference.author} · {reference.kind}</span><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title} ↗</a>{reference.teachingNote && <p>{reference.teachingNote}</p>}</article>)}</div></details>;
}
