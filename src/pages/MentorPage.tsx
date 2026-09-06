import { useMemo, useState } from 'react';
import type { NavSection, OetSubtest } from '../types';
import type { SessionConfig, SessionTask } from '../types/session';
import { mentorCurriculum, mentorSkillCopy, type MentorTopic } from '../data/mentorCurriculum';
import { bankBySubtest, oetTaskPart } from '../data/sessionTaskBank';
import { buildTaskStats, canonicalIdOf, recommendGradeAFocus, weightedPick } from '../lib/taskHistory';
import { useProgress } from '../hooks/useProgress';
import { computeSessionReview } from '../lib/oetScoring';
import { evaluateSpeakingResponse } from '../lib/speakingEvaluation';
import { oetResponseMode } from '../lib/oetResponseMode';
import { readMentorLessons } from '../lib/mentorMemory';
import { MENTOR_SUBTESTS } from '../lib/mentor';
import { MentorPanel } from '../components/MentorPanel';
import { AudioPlayer } from '../components/AudioPlayer';
import { AppIcon } from '../components/AppIcon';
import { SubtestBadge } from '../components/SubtestBadge';
import { MentorReferences } from '../components/MentorReferences';

function MentorLesson({ task, topic, onBack, onNext }: { task: SessionTask; topic: MentorTopic; onBack: () => void; onNext: () => void }) {
  const { completed, markComplete } = useProgress();
  const lessonKey = `${topic.id}-${task.id}`;
  const [response, setResponse] = useState(() => readMentorLessons()[lessonKey]?.response ?? '');
  const [reviewedResponse, setReviewedResponse] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const canSave = response.trim().length > 0 && reviewedResponse === response;
  const save = () => {
    if (!canSave || saved) return;
    const config: SessionConfig = { id: `mentor-${topic.id}-${Date.now()}`, title: `Mentor lesson: ${topic.title}`, kind: 'practice', subtitle: 'Coached learning', durationMinutes: 0, tasks: [task], subtests: [topic.subtest] };
    const speaking = topic.subtest === 'speaking' && task.speakingCriteria ? { [task.id]: { ...evaluateSpeakingResponse(response, Math.max(30, response.split(/\s+/).length / 2), task.speakingCriteria, true), transcript: response } } : {};
    const review = computeSessionReview(config, { [task.id]: response }, { [task.id]: response }, speaking);
    try {
      markComplete({ id: config.id, kind: 'practice', title: config.title, completedAt: new Date().toISOString(), durationMinutes: 0, coached: true,
        review: { ...review, overallExamReady: false, subtestScores: review.subtestScores.map((score) => ({ ...score, examReady: false })), taskReviews: review.taskReviews.map((item) => ({ ...item, evidenceQualified: false })) } });
      setSaved(true); setSaveError('');
    } catch { setSaveError('Could not save this lesson. Your response is still here; check browser storage and retry.'); }
  };
  return <div className="mentor-lesson">
    <div className="mentor-lesson-toolbar"><button type="button" className="btn btn-ghost" onClick={onBack}>← All lessons</button><span>Guided learning · Work at your own pace</span></div>
    <div className="mentor-lesson-grid">
      <section className="card mentor-task" aria-label="Lesson task and response">
        <SubtestBadge subtest={topic.subtest} small /><span className="section-kicker"> {topic.title}</span>
        <h2>{task.title}</h2><p>{topic.goal}</p>
        <ol className="mentor-lesson-path"><li>Plan</li><li className={response.trim() ? 'complete' : ''}>Attempt</li><li className={canSave ? 'complete' : ''}>Review & improve</li><li className={saved ? 'complete' : ''}>Save lesson</li></ol>
        {(task.audioSrc || task.audioExternalUrl) && <AudioPlayer src={task.audioSrc} externalUrl={task.audioExternalUrl} label={task.audioLabel ?? 'Lesson recording'} note="Replay is available during guided learning. Use timed practice to test single-play performance." />}
        <div className="mentor-task-material">
          {task.readingPassage && <><h3>{task.readingPassageTitle ?? 'Reading text'}</h3><p>{task.readingPassage}</p></>}
          <h3>{topic.subtest === 'speaking' ? 'Your role-play card' : topic.subtest === 'writing' ? 'Case notes & writing task' : 'Question'}</h3>
          <p>{task.prompt ?? task.instructions}</p>
        </div>
        {task.options?.length && oetResponseMode(task) === 'single-choice' ? <fieldset className="mentor-answer-options"><legend>Your first answer</legend>{task.options.map((option) => <label key={option.id}><input type="radio" name={`mentor-answer-${task.id}`} value={option.id} checked={response === option.id} onChange={() => { setResponse(option.id); setSaved(false); }} />{option.label}</label>)}</fieldset> : <label className="mentor-response-label">{topic.subtest === 'writing' ? 'Your letter draft' : topic.subtest === 'speaking' ? 'Your consultation transcript' : 'Your answer'}<textarea rows={topic.subtest === 'writing' || topic.subtest === 'speaking' ? 10 : 3} value={response} maxLength={12000} onChange={(event) => { setResponse(event.target.value); setSaved(false); }} placeholder={topic.subtest === 'speaking' ? 'Type your response or use patient mode. Your doctor turns will collect here.' : 'Make a first attempt. We will work through it together.'} /></label>}
        {topic.subtest === 'writing' && <p className="meta">{response.trim() ? response.trim().split(/\s+/).length : 0} words · Practise a complete letter around 180–200 words.</p>}
        <div className="mentor-save-row"><button type="button" className="btn btn-primary" disabled={!canSave || saved} onClick={save}>{saved ? 'Lesson saved ✓' : 'Save reviewed lesson'}</button>{saved && <button type="button" className="btn btn-secondary" onClick={onNext}>Next lesson task →</button>}</div>
        <p className="meta" role="status">{saveError || (saved ? 'Saved as coached practice. Build independent evidence in a timed session next.' : 'Ask the mentor to review your current response before saving this lesson.')}</p>
        <MentorReferences skill={topic.subtest} />
      </section>
      <MentorPanel key={lessonKey} task={task} topic={topic} response={response} completed={completed} lessonKey={lessonKey} onReviewed={setReviewedResponse} onPatientTurn={(text) => { setResponse((current) => `${current}${current ? '\n\n' : ''}${text}`.slice(0, 12000)); setSaved(false); }} />
    </div>
  </div>;
}

export function MentorPage({ onNavigate }: { onNavigate: (section: NavSection, itemId?: string) => void }) {
  const { completed } = useProgress();
  const [skill, setSkill] = useState<OetSubtest>('listening');
  const [lesson, setLesson] = useState<{ task: SessionTask; topic: MentorTopic } | null>(null);
  const recommendation = useMemo(() => recommendGradeAFocus(completed), [completed]);
  const startLesson = (topic: MentorTopic, previousId?: string) => {
    const pool = bankBySubtest[topic.subtest].filter((task) => !topic.part || oetTaskPart(task) === topic.part);
    const learned = new Set(completed.filter((session) => session.coached).flatMap((session) => session.review?.taskReviews.map((review) => canonicalIdOf(review.taskId)) ?? []));
    const fresh = pool.filter((task) => task.id !== previousId && !learned.has(task.id));
    const candidates = fresh.length ? fresh : pool.filter((task) => task.id !== previousId);
    const task = weightedPick(candidates.length ? candidates : pool, 1, buildTaskStats(completed))[0];
    if (task) { setLesson({ topic, task }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  if (lesson) return <MentorLesson key={`${lesson.topic.id}-${lesson.task.id}`} {...lesson} onBack={() => setLesson(null)} onNext={() => startLesson(lesson.topic, lesson.task.id)} />;
  const coached = completed.filter((session) => session.coached).length;
  const recommendedSkill = recommendation.kind === 'baseline' ? 'listening' : recommendation.subtest;
  const recentLessons = Object.entries(readMentorLessons())
    .filter(([, memory]) => memory.response.trim() || memory.messages.some((message) => message.role === 'user'))
    .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
    .flatMap(([key]) => {
      const topic = mentorCurriculum.find((candidate) => key.startsWith(`${candidate.id}-`));
      const task = topic && bankBySubtest[topic.subtest].find((candidate) => key === `${topic.id}-${candidate.id}`);
      return topic && task ? [{ key, topic, task }] : [];
    }).slice(0, 3);
  return <div className="mentor-home">
    <section className="mentor-hero">
      <div><span className="section-kicker">One learner. Four skills. A method that sticks.</span><h2>Your OET mentor,<br /><em>beside you at every step.</em></h2><p>Ask questions, think aloud, practise with a patient, and improve your answers through a real conversation. Start with a focused lesson, then take the method into timed practice.</p><button type="button" className="btn btn-primary" onClick={() => startLesson(mentorCurriculum.find((topic) => topic.subtest === recommendedSkill)!)}>Start my recommended lesson <AppIcon name="sparkles" /></button></div>
      <div className="mentor-course-card"><span className="section-kicker">Your learning journey</span><strong>{coached}</strong><span>coached lessons saved</span><div className="mentor-course-steps"><span>01 · Understand the approach</span><span>02 · Try, discuss, revise</span><span>03 · Apply it independently</span></div><button type="button" className="link-btn" onClick={() => onNavigate('practice')}>Go to timed practice →</button></div>
    </section>
    {recentLessons.length > 0 && <section className="card mentor-resume"><span className="section-kicker">Pick up where you left off</span><h3>Recent lesson conversations</h3><div className="mentor-resume-list">{recentLessons.map(({ key, topic, task }) => <button key={key} type="button" className="btn btn-secondary" onClick={() => { setLesson({ topic, task }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><SubtestBadge subtest={topic.subtest} small /><span>Resume {topic.title}<small>{task.title}</small></span><span aria-hidden="true">→</span></button>)}</div></section>}
    <div className="mentor-skill-tabs" role="tablist" aria-label="Choose a skill to learn">{MENTOR_SUBTESTS.map((subtest) => <button key={subtest} type="button" role="tab" id={`mentor-tab-${subtest}`} aria-controls="mentor-lessons" aria-selected={skill === subtest} onClick={() => setSkill(subtest)}><AppIcon name={mentorSkillCopy[subtest].icon} /><strong>{subtest}</strong><span>{mentorSkillCopy[subtest].description}</span></button>)}</div>
    <section role="tabpanel" id="mentor-lessons" aria-labelledby={`mentor-tab-${skill}`}><div className="section-heading-row"><div><span className="section-kicker">{skill} studio</span><h2>{mentorSkillCopy[skill].title}</h2></div><span className="meta">English coaching · Original Medicine tasks</span></div><div className="mentor-topic-grid">{mentorCurriculum.filter((topic) => topic.subtest === skill).map((topic, index) => <article className="card mentor-topic" key={topic.id}><span className="section-kicker">Lesson {String(index + 1).padStart(2, '0')}{topic.part ? ` · Part ${topic.part}` : ''}</span><h3>{topic.title}</h3><p>{topic.goal}</p><button type="button" className="btn btn-secondary" onClick={() => startLesson(topic)}>Start lesson →</button></article>)}</div></section>
    <section className="card mentor-how"><h3>A course that connects to your practice</h3><p>The mentor uses your recent skill gaps and saved mistake reflections. Guided lessons are recorded as learning activity; complete independent timed practice to measure readiness.</p><p>Use “Open task mentor” inside any OET practice session for help with the question in front of you.</p><button type="button" className="link-btn" onClick={() => onNavigate('resources')}>Browse your source library →</button></section>
    <MentorReferences skill={skill} />
  </div>;
}
