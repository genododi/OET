import { useState } from 'react';
import type { CompletedSession, SessionTask } from '../types/session';
import { MentorPanel } from './MentorPanel';

interface Props {
  tasks: SessionTask[];
  responses: Record<string, string>;
  completed: CompletedSession[];
  onOpen: () => void;
  completedReview?: boolean;
}

export function SessionMentor({ tasks, responses, completed, onOpen, completedReview = false }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(tasks[0].id);
  const selected = tasks.find((task) => task.id === selectedId) ?? tasks[0];
  return <div className="session-mentor">
    <div className="session-mentor-toggle"><div><strong>{completedReview ? 'Discuss your completed test' : 'A mentor for this task'}</strong><p className="meta">{completedReview ? 'Revisit the evidence, ask about a difficult question, and plan a better next attempt.' : 'Get a strategy, a hint or a response review. Using the mentor records this session as coached learning.'}</p></div><button type="button" className="btn btn-secondary" onClick={() => { if (!open) onOpen(); setOpen(!open); }}>{open ? 'Close task mentor' : completedReview ? 'Open review mentor' : 'Open task mentor'}</button></div>
    {open && <>
      {tasks.length > 1 && <label className="mentor-task-selector">Question to discuss<select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{tasks.map((task, index) => <option key={task.id} value={task.id}>{index + 1}. {task.title}</option>)}</select></label>}
      <MentorPanel key={selected.id} task={selected} response={responses[selected.id] ?? ''} completed={completed} />
    </>}
  </div>;
}
