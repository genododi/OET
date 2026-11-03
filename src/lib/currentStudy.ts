import type { SessionTask } from '../types/session';
import { evidenceExcerpt } from './oetMedicalCoach';
const key='oet-current-study-v1';
export interface CurrentStudy { task: SessionTask; response: string; updatedAt: string }
export function rememberCurrentStudy(task:SessionTask,response:string) {
  if(!['reading','listening','writing','speaking'].includes(task.subtest))return;
  const value:CurrentStudy={task:{...task,prompt:evidenceExcerpt(task.prompt ?? '',18000,task.title),readingPassage:task.readingPassage && evidenceExcerpt(task.readingPassage,18000,task.title)},response:response.slice(0,12000),updatedAt:new Date().toISOString()};
  try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Studying continues if storage is unavailable. */}
}
export function readCurrentStudy():CurrentStudy|null {
  try{const value=JSON.parse(localStorage.getItem(key) ?? 'null');return value && typeof value.response==='string' && typeof value.task?.id==='string' && typeof value.task?.instructions==='string' && ['reading','listening','writing','speaking'].includes(value.task.subtest) ? value : null;}catch{return null;}
}
