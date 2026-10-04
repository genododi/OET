# Official OET on Paper practice

The main Practice and Timed tests routes use original Medicine samples 1 and 2.
Source URLs, source SHA-256, one-based page selections, role-card crops and output
SHA-256 are recorded in `src/data/officialExamAssets.json`. The official papers
and publisher instructions are the authority for question content and timing.

- Listening: matched original human recordings and 42 original questions (24/6/12).
  Recording pauses include the final two-minute checking period; no extra checking
  time is appended. One playback per attempt. Interrupted audio is not scored.
- Reading: 20 Part A questions / 15 minutes, followed by 22 B/C questions / 45 minutes.
  Part A closes permanently for that attempt when the clock expires.
- Writing: original case notes and task; 5 minutes reading, then 40 minutes writing.
- Speaking: two original Medicine role cards, each with 3 minutes preparation and
  5 minutes conversation with a human partner. Complete an unassessed warm-up first.
  The two cards come from separate official sample packs, disclosed in the UI.

Handwriting is the default. Individual sections optionally provide an on-screen
response worksheet. This is a convenience, not an imitation of paper handwriting.
The full written sitting runs Listening → Reading → Writing without coaching or
intermediate answer feedback. Its wall-clock schedule is anchored to the original
recording's start and duration. Reloads do not grant extra Reading or Writing time;
reloading during Listening ends the interrupted attempt instead of replaying audio.
Speaking is separate. Actual venue administration, invigilation and official OET
assessment are outside the app. Raw practice marks must never be called OET grades.

Existing generated/short activities remain supplementary learning exercises under
`#drills`. A central SessionRunner guard keeps old generated mocks out of the
exam area. Original audio is also enforced centrally by AudioPlayer.

To reproduce the PDF splits, download the two manifest source URLs and run
`python scripts/import-official-exam-papers.py sample1.pdf sample2.pdf` using
pypdf 6.10.0. Different source hashes deliberately fail; review the source edition
and layout before updating the manifest. Role-card cropping only separates the
visible cards and is not secure redaction. Run `npm run test:source-manifest` after
any asset change, and visually inspect the original instructions and cropped cards.

Regression coverage includes phase deadlines, writing lock, saved responses,
reload/replay guards, full-sitting order, paper-default routing and original media.
