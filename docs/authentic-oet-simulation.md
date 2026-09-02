# Authentic OET simulation specification

Last reviewed against the mounted source papers: 2026-09-03

## Source-paper basis

The simulation structure was derived by extracting and visually reviewing these
papers in `/Volumes/GENODODI/oet-study-sources/Google drive Folder`:

- `Listening-Sample-Test-1-Question-Paper.pdf`
- `Listening-Sample-Test-2-Question-Paper.pdf`
- `Reading-Sample-Test-2-Question-Paper-Part-A.pdf`
- `Reading-Sample-Test-2-Text-Booklet-Part-A.pdf`
- `Reading-Sample-Test-2-Question-Paper-Part-BC.pdf`
- `Writing-Medicine-Sample-Test-1.pdf`
- `Writing-Medicine-Sample-Test-2.pdf`
- `Speaking-Medicine-Sample-Test-2.pdf`

The project copies the assessment workflow and response structure, not protected
question wording. Generated scenarios remain original, independent preparation
material. The two explicitly verified public Listening sample packs retain their
source-matched papers, recordings and answer keys.

## Enforced blueprint

| Sub-test | Phase structure | Scored workload |
| --- | --- | --- |
| Listening | One approximately 40-minute, one-use recording; Parts A, B and C in order | Part A: 24 note-completion answers; Part B: 6 three-option questions; Part C: 12 three-option questions |
| Reading | Part A closes after 15 minutes; Parts B and C share a separate 45-minute clock | Part A: 7 text matches plus 13 produced answers from one four-text booklet; Part B: 6 three-option questions; Part C: two long texts with 8 four-option questions each |
| Writing | 5 minutes reading only, followed by 40 minutes writing | One Medicine letter based on case notes |
| Speaking | Interlocutor warm-up, then preparation and performance for each card | Two role-plays; 3 minutes preparation and 5 minutes performance each |

## Runner behavior

- The current phase has its own clock and visible phase position.
- A phase advances automatically when its clock reaches zero.
- Reading Part A cannot be reopened after the Part B/C phase starts.
- The Writing response field is locked during the five-minute reading phase.
- Speaking recording is locked while the candidate prepares the role card.
- Listening audio cannot be stopped, restarted or replayed in mock mode.
- Correct answers, explanations and rubric feedback stay hidden until the mock is
  complete.
- Full four-sub-test simulation time is 165 minutes of assessed component time.

`scripts/verify-oet-blueprint.ts` fails deployment if any mock loses these task
counts, response formats, shared-text groupings, phase clocks or lock rules.
