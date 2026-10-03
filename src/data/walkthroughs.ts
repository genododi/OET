import type { OetSubtest } from '../types';

export interface Walkthrough {
  id: string; skill: OetSubtest; title: string; format: string;
  steps: { title: string; text: string }[];
  material: string; question: string; answer: string; reasoning: string[]; transfer: string;
  part?: 'A' | 'B' | 'C'; questionNumber?: number;
}

export const walkthroughs: Walkthrough[] = [
  {
    id: 'listening-a', skill: 'listening', part: 'A', questionNumber: 1,
    title: 'Listening A · Catch the missing detail',
    format: '24 gaps across two consultations. Write the word or short phrase you hear.',
    steps: [
      { title: 'Preview the notes', text: 'Use the preparation time to follow the headings: history, symptoms, treatment. Predict what kind of word fits each gap, without guessing the answer.' },
      { title: 'Follow the patient', text: 'Listen for the idea in the note, which may be phrased differently in the conversation. Write the detail that completes the gap.' },
      { title: 'Keep moving', text: 'If you miss an answer, leave a space and follow the next cue. Do not lose several answers while thinking about one.' },
      { title: 'Check the completed note', text: 'Check spelling, grammar and meaning. Keep your response short; do not add a diagnosis from your own medical knowledge.' },
    ],
    material: 'Bundled Sample Test 1 · Ray Sands consultation · question 1 on PDF page 4. Open the matching paper below before playing Part A.',
    question: 'What was Ray lifting when he sustained his back injury? Write the missing object in question 1.',
    answer: 'heavy suitcase',
    reasoning: [
      'The gap follows “lifting”, so predict an object, not a date, symptom or treatment. This prediction tells you what to listen for; it is not an answer.',
      'The verified answer key gives “heavy suitcase” (also accepts “suitcase”). Insert it into the note to check that the sentence makes sense.',
      'The date and the later symptoms belong to other notes. A plausible cause of back pain is not enough: your answer must come from this patient’s account.',
      'Replay the first consultation and locate the words supporting your answer. Then continue with questions 2–12 using the same method.',
    ],
    transfer: 'Try questions 2–12 on the same paper, then take the full 42-question test without pausing.',
  },
  {
    id: 'listening-b', skill: 'listening', part: 'B', questionNumber: 25,
    title: 'Listening B · Identify the purpose',
    format: 'Six short workplace extracts, one three-option question per extract.',
    steps: [
      { title: 'Read the exact question', text: 'Decide whether you need a warning, main purpose, opinion or next action. Keep that question in mind throughout the extract.' },
      { title: 'Reduce each option', text: 'Summarise each choice in a few words. Look for the difference between the options, not just words they have in common.' },
      { title: 'Hear the whole message', text: 'A speaker can mention all three topics. Listen for what is being recommended, corrected or emphasised.' },
      { title: 'Choose and move on', text: 'Select the option that answers the question, then prepare for the next extract. During review, explain why each distractor fails.' },
    ],
    material: 'Bundled Sample Test 1 · question 25 on PDF page 6. The nurse is briefing a colleague. Options concern antibiotics, falls and oxygen.',
    question: 'Listen to the first Part B extract. Which option answers what the nurse warns her colleague about: A, B or C?',
    answer: 'B — preventing a fall',
    reasoning: [
      'The key word in the question is “warn”. You need the caution being communicated, not every fact in the handover.',
      'The verified answer is B: take care to prevent a fall. In review, replay and identify the part of the handover that makes this a warning.',
      'A and C concern other clinical topics. Recognising an antibiotic or oxygen-related word would not establish that either is the requested warning.',
      'Do not choose from clinical plausibility. Your evidence is the speaker’s intended message in this extract.',
    ],
    transfer: 'Try questions 26–30. After each review, write “The question asked …; the speaker meant …”.',
  },
  {
    id: 'listening-c', skill: 'listening', part: 'C', questionNumber: 31,
    title: 'Listening C · Follow the speaker’s reasoning',
    format: 'Two longer extracts with six three-option questions each. Track opinions, reasons and implications.',
    steps: [
      { title: 'Map the questions', text: 'Read the six stems in order during the preparation time. They give you a route through the interview or presentation.' },
      { title: 'Listen beyond keywords', text: 'Expect paraphrases. Note contrast and qualification: however, initially, in fact, or the main reason.' },
      { title: 'Match a complete idea', text: 'Identify whose view it is and what the speaker concludes. An example may illustrate a point rather than be the main point itself.' },
      { title: 'Test the alternatives', text: 'Ask whether each option answers this exact question. Reject a true statement that answers a different question.' },
    ],
    material: 'Bundled Sample Test 1 · Dr Jack Robson interview · question 31 on PDF page 8. This asks why he regards Chagas as neglected.',
    question: 'Listen to the opening interview discussion. Choose A, B or C for question 31, then give your reason.',
    answer: 'A — the social groups mainly affected',
    reasoning: [
      'The question is about the reason for neglect, not the symptoms or severity of Chagas disease.',
      'The verified key selects A. Review the discussion for the link between the affected population and the attention the disease receives.',
      'B focuses on unrecognised infection; C focuses on severe cases. Those are different explanations from the social-group reason selected in the key.',
      'Now follow questions 32–36 in sequence. If one answer is missed, reconnect at the next question’s topic rather than replaying it mentally.',
    ],
    transfer: 'Complete the first six-question interview, then attempt the second extract without pausing.',
  },
  {
    id: 'reading-a', skill: 'reading', title: 'Reading A · Find, then extract',
    format: '20 questions about four related texts in 15 minutes. This is a speed-and-location task.',
    steps: [
      { title: 'Map the four texts', text: 'Quickly identify what each text contains: overview, table, process or exceptions. You are building a map, not memorising every line.' },
      { title: 'Read the question first', text: 'Underline the distinctive detail. Decide which text is likely to contain it, then scan that text.' },
      { title: 'Read around the match', text: 'Check the whole sentence, row or heading. A matching word alone may send you to the wrong answer.' },
      { title: 'Copy precisely', text: 'For short answers and gaps, use the words in the text and obey the question instructions. Check the grammar of the completed gap.' },
    ],
    material: 'Original miniature teaching set (shortened, not an official test):\nText A — Clinic opening hours: Monday–Friday, 08:00–17:00.\nText B — Booking: telephone appointments or book at reception.\nText C — Forms: bring a completed registration form to the first appointment.\nText D — Cancellations: telephone reception at least 24 hours before the appointment.',
    question: 'Which text explains cancelling a booking? Complete the note: Give at least ___ notice.',
    answer: 'Text D; 24 hours',
    reasoning: ['Map “cancelling” to Text D’s heading instead of reading all four texts again.', 'The quantity belongs to cancellation notice, not the clinic’s opening time in Text A.', '“24 hours” fits the gap. “Telephone reception” is the method, so it answers a different question.'],
    transfer: 'Open a Reading paper in your AMR files. Map its four Part A texts, then attempt all 20 questions with a 15-minute timer.',
  },
  {
    id: 'reading-b', skill: 'reading', title: 'Reading B · Read the whole instruction',
    format: 'Six short workplace texts with one three-option question each. Parts B and C share 45 minutes.',
    steps: [
      { title: 'Identify the purpose', text: 'Is this a policy, reminder, email or instruction? Read the question before deciding which detail matters.' },
      { title: 'Read for conditions', text: 'Pay attention to who, when, must, may, only and unless. These small words can change the answer.' },
      { title: 'Compare meanings', text: 'Translate each option into plain language. Select the complete meaning of the text rather than the most familiar phrase.' },
      { title: 'Budget the shared time', text: 'Keep moving through the short texts so you leave enough of the 45 minutes for the longer Part C passages.' },
    ],
    material: 'Original teaching notice:\n“Staff should use the online room-booking system. If the system is unavailable, contact reception before using a room.”\nA — Reception must approve every online booking.\nB — Contact reception when the online system cannot be used.\nC — Use any empty room when the system is unavailable.',
    question: 'What does the notice tell staff to do? Choose A, B or C.',
    answer: 'B',
    reasoning: ['“If” introduces the condition: the online system is unavailable. Under that condition, staff must contact reception.', 'A adds a requirement for every booking, which the notice does not state.', 'C removes the instruction to contact reception first. An empty room is not permission to use it.'],
    transfer: 'For six real Part B texts, underline the words establishing the rule and any exception before reviewing your answers.',
  },
  {
    id: 'reading-c', skill: 'reading', title: 'Reading C · Prove the interpretation',
    format: 'Two longer texts, eight four-option questions per text. Interpret detail, viewpoints and meaning in context.',
    steps: [
      { title: 'Find the relevant passage', text: 'Use the stem and paragraph reference. Read enough surrounding context to understand the writer’s argument.' },
      { title: 'Predict the meaning', text: 'Before studying the options, say the answer in your own words. This reduces the pull of a tempting distractor.' },
      { title: 'Compare every option', text: 'Check strength, scope and viewpoint. “May help” does not mean “always works”; a quoted view is not automatically the author’s opinion.' },
      { title: 'Name the evidence', text: 'Point to the sentence or connection that supports the answer. For vocabulary questions, substitute the proposed meaning into the passage.' },
    ],
    material: 'Original teaching passage:\n“The pilot reduced missed appointments in one clinic. The author welcomes the early findings but argues that wider use should wait until clinics serving different communities have been studied.”\nA — The pilot has no practical value.\nB — All clinics should adopt it immediately.\nC — It is promising, but broader evidence is needed.\nD — The pilot proves community differences are irrelevant.',
    question: 'Which option best describes the author’s attitude?',
    answer: 'C',
    reasoning: ['“Welcomes” signals a positive response; “but” introduces a reservation. The answer must preserve both.', 'A discards the positive finding. B ignores the call to wait for more evidence.', 'D reverses the reason for studying different communities. C alone includes promise and caution.'],
    transfer: 'In your next Part C passage, write one evidence sentence and one reason for rejecting the strongest distractor for every missed question.',
  },
  {
    id: 'writing', skill: 'writing', title: 'Writing · Turn case notes into a useful letter',
    format: 'One profession-specific task: 5 minutes to read, then 40 minutes to write. Aim for approximately 180–200 words in the letter body. Writing has no Parts A/B/C.',
    steps: [
      { title: 'Read for the reader and purpose', text: 'During the five-minute reading period, identify who receives the letter, why you are writing and what they need to do. Read the task before selecting facts.' },
      { title: 'Select and organise', text: 'Once writing time starts, plan purpose → current situation → relevant background → requested action. Include information needed by this reader; leave out unrelated history.' },
      { title: 'Write connected prose', text: 'Expand note fragments into accurate sentences. Keep the purpose clear from the opening and group related information. Do not simply copy the case-note order.' },
      { title: 'Check against the task', text: 'Reserve a few minutes for purpose, missing key facts, dates, tense, tone and clarity. Never invent missing details. A word target does not justify padding.' },
    ],
    material: 'Original miniature case (language exercise, not clinical advice):\nTask: write to physiotherapist Ms Patel requesting a mobility assessment for Maria Lewis, aged 68.\nNotes: discharged home yesterday after rehabilitation; uses a walking frame; lives alone; daughter visits each evening; worried about steps at the entrance; enjoys crosswords.\nThis is a short extract exercise. A full exam task provides more case notes.',
    question: 'Write the opening and a short supporting paragraph. Which note would you leave out, and why?',
    answer: 'Dear Ms Patel,\n\nI am writing to request a mobility assessment for Ms Maria Lewis, a 68-year-old woman who returned home yesterday after rehabilitation.\n\nMs Lewis currently uses a walking frame and is concerned about managing the steps at her entrance. She lives alone, although her daughter visits each evening. Please assess her mobility and advise on appropriate support at home.\n\nYours sincerely',
    reasoning: ['The opening states the recipient’s job: a mobility assessment. The patient and recent discharge establish the context immediately.', 'The frame, entrance steps and living arrangements explain the practical assessment needs. They belong together rather than in a list of disconnected notes.', 'Crosswords are omitted because this task gives no connection between that hobby and the requested assessment.', 'This is an annotated short example, not a complete 180–200-word exam response. Use the fuller notes in an AMR task to practise the complete letter.'],
    transfer: 'Choose one AMR Writing case, use the same four stages, and compare your draft with the saved NotebookLM writing checklist.',
  },
  {
    id: 'speaking', skill: 'speaking', title: 'Speaking · Build a patient conversation',
    format: 'Two profession-specific role-plays, normally 3 minutes to prepare and about 5 minutes to speak for each. Speaking has no Parts A/B/C.',
    steps: [
      { title: 'Prepare a flexible route', text: 'Read the setting, patient concern and tasks during preparation. Plan an opening and task order, not a memorised speech. The warm-up is not one of the assessed role-plays.' },
      { title: 'Establish rapport and explore', text: 'Introduce your role as appropriate, ask an open question and listen. Acknowledge the patient’s concern before explaining.' },
      { title: 'Explain in small pieces', text: 'Use plain language, signpost the next topic and pause for the patient. Respond to their answers instead of reciting every task on the card.' },
      { title: 'Agree the next step', text: 'Invite questions, check understanding in the patient’s own words and agree a plan based on the role card. Record yourself and review clarity, pace and interaction.' },
    ],
    material: 'Original mini role-card: You are a doctor discussing an upcoming referral. The patient is worried because they do not know what will happen. Explore the concern, explain the purpose of the referral and check understanding. The card gives no confirmed appointment date or test, so do not invent either.',
    question: 'Say your opening aloud. Then respond to: “Does this mean something serious is wrong?”',
    answer: 'Doctor: “Before we talk about the referral, what is worrying you most?”\nPatient: “Does this mean something serious is wrong?”\nDoctor: “I can hear that you’re worried. A referral lets the specialist assess the problem in more detail; it does not by itself confirm a serious diagnosis. Would it help if I explained the purpose of the appointment?”\nPatient: “Yes.”\nDoctor: “The specialist will review the concern and discuss the next steps with you. We do not have a confirmed plan for tests yet. What questions would you like to take to the appointment?”\nDoctor, after discussion: “Just so I know I have explained it clearly, could you tell me what you understand the referral is for?”',
    reasoning: ['The first question finds the patient’s concern before delivering information. Acknowledging the worry addresses the emotional cue.', 'The explanation avoids both jargon and unsupported reassurance. No appointment date, investigation or guaranteed outcome is invented.', 'Asking permission and inviting questions make space for the patient. A real partner should answer naturally, so your next response may differ from this demonstration.', 'The final check asks for understanding in the patient’s own words. Practise with a partner and record your own human voice; this lesson uses no synthetic dialogue.'],
    transfer: 'Open an AMR Speaking card, prepare for three minutes, then role-play for five with a partner. Review one communication habit before trying the second card.',
  },
];

export const walkthroughStorageKey = 'oet-walkthrough-progress-v1';
export function readWalkthroughProgress(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(walkthroughStorageKey) ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && walkthroughs.some(lesson => lesson.id === id)) : []; }
  catch { return []; }
}
