# Medicine-focused OET mentor

The mentor uses the existing local Qwen model, without an account, key or network
connection on the Mac. This change improves its task evidence and coaching rules;
it does not claim to add new model weights or provide an official examiner score.

The shared medicine coaching notes apply to conversations and structured writing
and speaking feedback. They prioritise the recipient/patient, the task purpose,
factual fidelity, actual learner wording, and a small, actionable correction.
Special attention goes to negation, suspected versus confirmed diagnoses, personal
versus family history, medication details, numbers/units, chronology and next actions.
The patient simulator is instructed to stay on the selected card and acknowledge missing facts.
Reading and listening answers must come from source evidence rather than medical
plausibility. Text alone cannot establish spoken intelligibility or fluency.

Local response reviews undergo a second, independent comparison against the source
before feedback is displayed. The second pass receives only neutral topic hints,
not the unverified first draft: copying an earlier draft can preserve invented facts.
It uses deterministic sampling and adds response time. Patient turns instead use a
focused card-only prompt, without the coach's rubric or invented draft dialogue.
Neither approach guarantees correctness. No extra API call or key is needed locally.

The evidence check uses the model's local reasoning mode with a bounded 384-token
budget. Ordinary hints and patient dialogue disable reasoning for responsiveness.
The UI displays only the final answer, never the model's private reasoning trace.
The same model and one local server are retained to fit this Mac's memory.

Long sources are fitted into a complete JSON evidence packet before transmission
within the app. The latest response and question are retained alongside excerpts
from both ends and relevant middle passages. Omitted sections are explicitly
labelled. The model is instructed to request missing evidence before judging it.
Protected keys and transcripts remain unavailable before a permitted review.

Original teaching notes are informed by these public primary sources:

- [OET Writing criteria](https://prod-wp-content.occupationalenglishtest.org/resources/uploads/2019/07/31135305/Writing-Criteria-August-19.pdf)
- [OET Speaking linguistic criteria](https://cdn-aus.aglty.io/oet/pdf-files/Speaking%20assessment%20criteria%20and%20level%20descriptors.pdf)
- [OET clinical communication guide](https://cdn-aus.aglty.io/oet/OET%20Test%20Speaking%20Guide%20Clinical%20Communications%202024.pdf)
- [Cambridge English OET test overview](https://www.cambridgeenglish.org/exams-and-tests/oet/test-overview/)

This is communication coaching, not a diagnostic or prescribing system. A stronger
instruction and evidence packet can reduce errors but does not guarantee factual
accuracy; a source or transcript can itself be incomplete or incorrectly recognised.
