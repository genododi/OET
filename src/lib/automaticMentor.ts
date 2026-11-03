import type { SessionTask } from '../types/session';
import { buildOfflineSpeakingFeedback, buildOfflineWritingFeedback } from './offlineTutor';
import { topicForTask } from './mentor';

/** Observations describe actual saved activity, never inferred exam performance. */
export function automaticMentorObservation(task: SessionTask, response: string) {
  const words=response.trim().split(/\s+/).filter(Boolean).length;
  const topic=topicForTask(task);
  if(!words)return { stage:'Ready to begin', progress:`Following: ${task.title}`, next:topic.steps[0] };
  if(task.subtest==='writing' || task.subtest==='speaking') {
    const feedback=task.subtest==='writing' ? buildOfflineWritingFeedback(task,response) : buildOfflineSpeakingFeedback(task,response);
    return {stage:task.subtest==='writing'?'Draft in progress':'Transcript in progress',progress:`${words} words in your current ${task.subtest==='writing'?'letter':'transcript'}.`,next:feedback.improvements[0] ?? topic.steps[1]};
  }
  const answers=response.split('\n').filter(line=>/^\s*\d+\.\s*\S/.test(line)).length;
  return {stage:'Attempt in progress',progress:answers?`${answers} numbered answers entered in this task.`:'Your current answer is available for review.',next:topic.steps[1]};
}
export function automaticReviewReady(skill:string,response:string) {
  const words=response.trim().split(/\s+/).filter(Boolean).length;
  return words >= (skill==='writing'?40:skill==='speaking'?20:1);
}
