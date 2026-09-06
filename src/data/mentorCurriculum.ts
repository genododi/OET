import type { OetSubtest } from '../types';

export interface MentorTopic {
  id: string;
  subtest: OetSubtest;
  title: string;
  part?: 'A' | 'B' | 'C';
  goal: string;
  steps: string[];
  checkpoint: string;
}

/** Original teaching sequences; no private instructor course is reproduced. */
export const mentorCurriculum: MentorTopic[] = [
  { id: 'listen-a', subtest: 'listening', part: 'A', title: 'Capture the missing detail', goal: 'Predict the answer type, listen for the exact detail, and check the completed note.', steps: ['Read the gap and predict a number, symptom, treatment or time expression.', 'Listen for the patient’s wording and any correction that follows.', 'Check spelling and whether the answer fits the note.'], checkpoint: 'What kind of information does this question need?' },
  { id: 'listen-b', subtest: 'listening', part: 'B', title: 'Hear the speaker’s purpose', goal: 'Separate the main message from details that merely sound familiar.', steps: ['Identify the setting and who is speaking to whom.', 'Listen for the action, purpose or opinion the question asks about.', 'Reject an option if any part of it is unsupported.'], checkpoint: 'Are you listening for a detail, an action or the overall purpose?' },
  { id: 'listen-c', subtest: 'listening', part: 'C', title: 'Follow attitude and inference', goal: 'Track how the speaker qualifies a claim or changes direction.', steps: ['Restate the question in your own words before listening.', 'Notice contrast, uncertainty and the speaker’s conclusion.', 'Match the whole meaning rather than one repeated word.'], checkpoint: 'Which contrast or qualification would change your choice?' },
  { id: 'read-a', subtest: 'reading', part: 'A', title: 'Find it, then verify it', goal: 'Locate relevant information quickly without guessing from clinical knowledge.', steps: ['Use headings and distinctive terms to locate the relevant text.', 'Read the surrounding sentence to verify the detail.', 'Follow the response instruction and check the exact wording.'], checkpoint: 'What is your best search anchor in this question?' },
  { id: 'read-b', subtest: 'reading', part: 'B', title: 'Decode workplace messages', goal: 'Identify what a workplace text requires, permits or intends.', steps: ['Identify the intended reader and the purpose of the document.', 'Distinguish must, may, only and except.', 'Check every clause in the chosen answer against the text.'], checkpoint: 'Who needs to do what, and under which condition?' },
  { id: 'read-c', subtest: 'reading', part: 'C', title: 'Defend an inference', goal: 'Use the writer’s reasoning to eliminate plausible distractors.', steps: ['Find the paragraph connected to the question.', 'Separate reported evidence from the writer’s own view.', 'Explain why the other choices overstate or distort the text.'], checkpoint: 'What does the writer support, rather than merely mention?' },
  { id: 'write-purpose', subtest: 'writing', title: 'A purpose-first opening', goal: 'Make the reader, reason for writing and requested action clear.', steps: ['Identify the recipient and what they need to do next.', 'Select the current problem and relevant context.', 'Draft an opening that makes the purpose immediately clear.'], checkpoint: 'Who is receiving this letter and what action do you need?' },
  { id: 'write-content', subtest: 'writing', title: 'Select and connect case notes', goal: 'Include the information needed for continuing care without copying every note.', steps: ['Sort notes into essential, supporting and irrelevant for this reader.', 'Group related information rather than following every date.', 'Check that purpose-critical information has not disappeared.'], checkpoint: 'Which three facts does this reader most need, and why?' },
  { id: 'write-structure', subtest: 'writing', title: 'Build a clear clinical letter', goal: 'Organise a complete letter around the recipient’s needs.', steps: ['Open with the purpose and current issue.', 'Give relevant findings, treatment and background in logical groups.', 'Close with a clear request or plan; edit repetition.'], checkpoint: 'What is the job of each paragraph in your letter?' },
  { id: 'write-language', subtest: 'writing', title: 'Edit for precision', goal: 'Make professional English clear, concise and easy to act on.', steps: ['Check dates, medication details and references against the notes.', 'Use complete sentences, accurate tense and clear connections.', 'Remove redundant wording without losing essential meaning.'], checkpoint: 'Which sentence could be clearer without losing clinical meaning?' },
  { id: 'speak-rapport', subtest: 'speaking', title: 'Open with rapport', goal: 'Start a consultation that responds to the patient’s perspective.', steps: ['Introduce yourself and establish the reason for the conversation.', 'Ask an open question and acknowledge the concern you hear.', 'Agree what to cover before giving a long explanation.'], checkpoint: 'What could you say to invite the patient’s main concern?' },
  { id: 'speak-explore', subtest: 'speaking', title: 'Explore before explaining', goal: 'Ask useful questions and adapt to what the patient tells you.', steps: ['Start broad and then clarify relevant details.', 'Explore ideas, concerns and expectations.', 'Summarise what you heard and check your understanding.'], checkpoint: 'What do you need to understand before giving advice?' },
  { id: 'speak-explain', subtest: 'speaking', title: 'Explain in patient language', goal: 'Give information in small chunks and check understanding.', steps: ['Ask what the patient already knows.', 'Use everyday language and explain unavoidable terms.', 'Pause, invite questions and check understanding without testing the patient.'], checkpoint: 'How would you explain the key point without medical jargon?' },
  { id: 'speak-plan', subtest: 'speaking', title: 'Agree the next step', goal: 'Respond to concerns and close with a shared, understandable plan.', steps: ['Invite the patient’s preferences and barriers.', 'Discuss the plan using only the supplied scenario details.', 'Check understanding and close with the next step described on the card.'], checkpoint: 'How will you check that the plan works for this patient?' },
];

export const mentorSkillCopy: Record<OetSubtest, { title: string; description: string; icon: 'headphones' | 'book' | 'pen' | 'message' }> = {
  listening: { title: 'Listen with intent', description: 'Predict, hear the evidence, and avoid the distractor.', icon: 'headphones' },
  reading: { title: 'Read with a method', description: 'Find the evidence and defend your answer.', icon: 'book' },
  writing: { title: 'Write for the reader', description: 'Plan, draft, and improve one paragraph at a time.', icon: 'pen' },
  speaking: { title: 'Lead the consultation', description: 'Practise with a patient, pause for coaching, and try again.', icon: 'message' },
};
