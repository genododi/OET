import type { OetSubtest } from '../types';
import type { SessionTask } from '../types/session';
import { mentorCurriculum, type MentorTopic } from '../data/mentorCurriculum';
import { oetTaskPart } from '../data/sessionTaskBank';
import { evaluateMcqAnswer } from './oetScoring';
import { buildOfflineSpeakingFeedback, buildOfflineWritingFeedback } from './offlineTutor';
import { oetResponseMode } from './oetResponseMode';
import { referencesForSkill } from '../data/mentorReferences';
import { buildMedicalEvidencePacket, MEDICAL_COACH_POLICY, MEDICAL_SKILL_FOCUS } from './oetMedicalCoach';

export type MentorAction = 'strategy' | 'hint' | 'feedback' | 'explain' | 'ask' | 'patient';
export interface MentorMessage { id: string; role: 'user' | 'assistant'; text: string; source?: 'guide' | 'ai'; }
export interface MentorContext {
  task: SessionTask;
  response: string;
  topic?: MentorTopic;
  learnerMemory: string;
  hintLevel: number;
  action: MentorAction;
  messages: MentorMessage[];
}

export function topicForTask(task: SessionTask): MentorTopic {
  return mentorCurriculum.find((topic) => topic.subtest === task.subtest && topic.part === oetTaskPart(task)) ??
    mentorCurriculum.find((topic) => topic.subtest === task.subtest)!;
}

export function mentorGreeting(task: SessionTask, topic = topicForTask(task)) {
  return `Let’s work through “${task.title}” together.\n\nOur goal: ${topic.goal}\n\n${topic.checkpoint}\n\nTry an answer in the response area whenever you’re ready. I can give you a hint before you commit, then help you improve it.`;
}

export function guidedMentorReply(context: MentorContext): string {
  const { task, response, action } = context;
  const topic = context.topic ?? topicForTask(task);
  if (action === 'patient') {
    const lastTurn = context.messages.filter((message) => message.role === 'user').at(-1)?.text.toLowerCase() ?? '';
    if (/understand|worr|concern|feel|help/.test(lastTurn)) return 'Thank you for listening. Could you explain the next step in simple words?';
    if (/question|sense|understood|understanding/.test(lastTurn)) return 'Could you go over the main point once more? I want to be sure I understand what happens next.';
    return 'I would like to understand what this means for me. What would you like to ask me first?';
  }
  if (action === 'strategy') return `${topic.goal}\n\n${topic.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nYour turn: ${topic.checkpoint}`;
  if (action === 'hint') {
    const index = Math.min(Math.max(context.hintLevel - 1, 0), topic.steps.length - 1);
    return `Hint ${index + 1}: ${topic.steps[index]}\n\nApply it to this question: ${task.prompt?.slice(0, 450) ?? task.title}\n\nTell me which clue you would use and why.`;
  }
  if (action === 'feedback' || action === 'explain') {
    if (!response.trim()) return 'Make a first attempt in the response area. Even an uncertain answer gives us something specific to improve.';
    if (task.options?.length) {
      const answer = oetResponseMode(task) === 'single-choice'
        ? task.options.find((option) => option.id === response || option.label.toLowerCase() === response.trim().toLowerCase())?.id ?? response
        : response;
      const evaluation = evaluateMcqAnswer(task, answer);
      if (!evaluation) return 'I could not score that response. Check the response format and try again.';
      const evidence = task.subtest === 'listening' ? task.audioTranscript : task.readingPassage;
      return `${evaluation.correct ? 'Your answer is correct.' : 'Let’s repair this answer.'}\n\n${evaluation.explanation}\n\n${action === 'explain' ? evaluation.optionFeedback.map((option) => `${option.label}: ${option.explanation}`).join('\n\n') : `Expected answer: ${evaluation.correctLabel}`}\n\n${evidence ? `Evidence to revisit: ${evidence.slice(0, 1600)}\n\n` : ''}Your next attempt: state the evidence in your own words, then explain why one distractor fails.`;
    }
    if (task.subtest === 'reading' || task.subtest === 'listening') return 'No verified answer key is included with this question. I cannot mark your response correct or invent the missing key. Compare your answer with the exact passage or recording transcript, keeping negation, dates and the speaker’s meaning unchanged. Include the specific question and source wording in your message for an evidence-based discussion with Live AI.';
    const feedback = task.subtest === 'writing' ? buildOfflineWritingFeedback(task, response) : buildOfflineSpeakingFeedback(task, response);
    const weakest = [...feedback.rubricScores].sort((a, b) => a.score - b.score)[0];
    const model = task.modelAnswer ?? task.sampleAnswer ?? task.speakingCriteria?.samplePhrases.join('\n');
    return `Your priority: ${weakest?.dimension ?? topic.goal}.\n\n${feedback.strengths.slice(0, 2).join('\n')}\n\nImprove next:\n${feedback.improvements.slice(0, 3).map((point) => `• ${point}`).join('\n')}\n\n${feedback.nextDrill}${action === 'explain' && model ? `\n\nModel for comparison:\n${model}` : ''}\n\n${task.subtest === 'speaking' ? 'This text review cannot assess pronunciation or the sound of your voice.' : 'Revise your answer, then ask me to review the new version.'}`;
  }
  const question = context.messages.filter((message) => message.role === 'user').at(-1)?.text ?? '';
  if (/plan|start|approach|structure|how.*answer/i.test(question)) return guidedMentorReply({ ...context, action: 'strategy' });
  if (/hint|stuck|clue/i.test(question)) return guidedMentorReply({ ...context, action: 'hint', hintLevel: Math.max(1, context.hintLevel) });
  return `For this task, focus on: ${topic.goal}\n\n${topic.checkpoint}\n\nThe built-in guide can walk through a strategy, give hints and review your attempt. Enable Live AI for an individual answer to “${question.slice(0, 200)}” and follow-up discussion.`;
}

/** Before an attempt, omit answer keys, transcripts, rubric model points and distractor explanations. */
export function buildMentorSystemPrompt(context: MentorContext, maxChars = 30000): string {
  const { task, action, response } = context;
  const canReveal = Boolean(response.trim()) && (action === 'feedback' || action === 'explain');
  const topic = context.topic ?? topicForTask(task);
  const lessonFocus = !context.topic && (task.subtest === 'reading' || task.subtest === 'listening') && !oetTaskPart(task)
    ? 'Determine the selected part from the supplied instructions; do not assume Part A when the part is not stated.'
    : `${topic.goal.slice(0, 280)}. ${topic.checkpoint.slice(0, 200)}`;
  const references = referencesForSkill(task.subtest as OetSubtest).filter(reference => reference.teachingNote).slice(0, 2).map(reference => ({ url: reference.url, note: reference.teachingNote }));
  const fixed = `${MEDICAL_COACH_POLICY}
${MEDICAL_SKILL_FOCUS[task.subtest as OetSubtest] ?? ''}
You are not Dr Ashgan, Dr Elghazouly, or an official examiner. Do not attribute private methods or invented quotations to instructors.
Use concise connected paragraphs or a few numbered steps, normally 100–220 words. Explain only the criteria relevant to this turn, rather than reciting the whole rubric. Before an attempt, give one progressive hint and Do not reveal the answer or write the finished response. Answer evidence is ${canReveal ? 'available for review; distinguish a verified key from an illustrative model answer' : 'withheld; teach the method without guessing the key'}.
${action === 'patient' ? 'SIMULATED PATIENT mode: reply ONLY as this patient, in 1–3 natural sentences. Answer the doctor’s latest question first. Use only patient facts explicitly on the selected card, not doctor task instructions as patient history. Do not recite all facts at once, invent symptoms, age, test results or treatment, or turn into a coach. For an absent fact say you are not sure or have not been told. Keep earlier patient facts consistent and raise a card-supported concern naturally.' : `MENTOR mode. Requested action: ${action}. Hint level: ${context.hintLevel}. Give evidence → explanation → a fact-preserving repair when reviewing. A worked example is a comparison, not the only acceptable wording.`}
Lesson focus: ${lessonFocus}
Public teaching notes (reference notes, not patient facts): ${JSON.stringify(references)}
If omittedSections is non-empty, the evidence contains excerpts. Do not assume omitted details are absent from the original or judge a full source you have not received.
Lesson data: `;
  const query = context.messages.filter(message => message.role === 'user').at(-1)?.text ?? '';
  return fixed + buildMedicalEvidencePacket({ task, response, reveal: canReveal, query, memory: context.learnerMemory, maxChars: maxChars - fixed.length });
}

export const MENTOR_SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
