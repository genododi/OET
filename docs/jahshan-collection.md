# Jahshan collection

Verified 2026-10-06 using the user-supplied Drive folder, its child folders,
the Reading folder and the mounted GENODODI archive.

- 90 original MP3 files in 25 available sets (26 numbered folders).
- Listening Jahshan OET Collection.pdf: 65,093,659 bytes.
- Reading Jahshan OET Collection.pdf: 124,446,334 bytes.
- Set 8 / Practice Test 4 contains only the publisher's missing-audio notice.
- All 93 files already existed on GENODODI with the expected Drive sizes;
  local SHA-256 values are recorded in the catalog. No redundant downloads.
- Both collection PDFs exactly match the user-provided copies in Downloads.

The source remains under `GENODODI/oet-study-sources/Google drive Folder/`
in the existing Jahshan/OET Listening and Jahshan/OET Reading folders.
The complete verification report is saved to
`GENODODI/oet-study-sources/manifests/jahshan-drive-verification.json`.

`#jahshan` provides original audio playback, the two PDFs, question/answer page
links taken from the Listening index, and separate saved notes per set. This is
source-guided study, not a new set of automatically marked official mocks.

GitHub Pages hosts all 90 available recordings as AAC streaming copies under
`public/jahshan-audio/<exact Drive ID>.m4a`. The player appears immediately for
any available set and recording, with no local connection required. The human
speech, complete track and timing are preserved; no speech is generated.
The original MP3 files remain unchanged on GENODODI and linked in Drive.

Local files are optional overrides. The page can open a browser-selected PDF or
original MP3, without uploading it. These selections must be repeated after a
reload. The read-only gateway is available only from HTTP localhost; hosted
HTTPS pages never request it. Playback errors show a retry control and the exact
original recording link, rather than leaving a silent or missing player.

Regenerate streaming assets with `python3 scripts/publish-jahshan-audio.py`.
The script checks every original SHA-256 before encoding AAC at 48 kbps mono,
32 kHz, with fast-start MP4 metadata. This keeps the complete site within the
GitHub Pages size limit. It performs no trimming, speed changes or silence removal,
and verifies duration differences under 0.2 seconds. The generated audio manifest
records both original and published checksums. The collection verifier checks
all 90 files and their mapping to the exact catalog track IDs.

Validation: `node scripts/verify-jahshan-collection.mjs` verifies the manifest.
Add `--local` to verify all mounted files against their sizes and SHA-256 values.
The regular source-manifest CI check includes the catalog validation.

## Reading workspace

Open `#jahshan/reading` to begin with Reading. All 26 entries use question and
answer page ranges transcribed from the visually checked Reading index on page 2,
with the original PDF checksum recorded in `readingIndex`. The book has 575 pages.
Practice Test 4 (entry 8) is labelled 34 questions; entry 1 is strategies/exercises.
Neither is presented as a standard full Reading mock.

Filter by source, select a paper, switch between questions/key/index, adjust the
PDF page, and expand the paper. Answers for A/B/C, corrections, an optional
self-marked result and review completion save separately per entry. The last test
resumes on reload. Earlier shared Reading notes remain visible without migration
or deletion. Responses can be downloaded as text. This is guided source study;
the link to official timed Reading remains the route for a fixed exam workflow.

## Listening answer reveals

All 90 recording IDs have matching worksheets in `jahshanListeningAnswers.json`.
The 1,085 answer slots preserve extract numbering, including the individual Kaplan
strategy tracks and the combined Kaplan mock. Each reveal displays only that
question's printed key and never replaces the learner's response. Responses save
per recording; reveals reset when changing recordings. This is a study feature.

The source omits all 18 B/C keys for OET Online Test 1 and one Part A answer in
OET Online Test 2. These 19 omissions are labelled, never guessed. The latter
paper's final two answers are mapped to question-sheet blanks 11/12 (p182), because
the key (p188) incorrectly numbers them 10/11. E2Language II's merged A2 answers
6/7 on p137 are separated to match the question sheet on p130. Scanned keys on
pp74–75, 88–89 and 101–102 were visually reviewed. These are printed-key answers,
not quotations from an audio transcript. The importer requires the exact PDF hash.

## Reading question forms

Step 4 now includes 1,123 source question forms across the 26 index entries. Entry 1 has separate strategy and practice groups (81 questions in total); entry 8 has 34 questions. All other entries have 42. Repeated Part C numbering is scoped to its text, and responses are stored by test, section and question. Existing free-form drafts remain under “Earlier free-form answers”. Downloads include both the new numbered responses and the earlier notes.

`src/data/jahshanReadingQuestions.json` records the question page, key page and source PDF checksum. Scanned Parts B/C in entries 5–7 and 18–20 use 61 original rendered page images above their answer fields, preserving option labels which OCR reads poorly. Other questions use extracted text with explicit corrections for inline gaps and unnumbered worksheets. The source-page link remains available for checking the original layout. Scanned keys on pages 147–148, 169–170, 190–191, 207, 228 and 250 and missing PDF glyphs on page 573 were checked visually. The blank Part A answer page 206 is explicitly unavailable, not filled with invented answers.

Text A–D filters are study hints: a matching question can reveal its correct text by being filtered. Default “All questions” keeps paper order. Links use the printed key’s explicit text references, the reviewed Sample Test 1 mapping, or a unique answer phrase in the source text. Unconfirmed links remain under “Other questions” and in the full question list.

Regenerate with Python, Pillow, Poppler and Tesseract installed:

```sh
python3 scripts/import-jahshan-reading-questions.py
```

The importer checks the supplied PDF checksum, caches text and OCR on GENODODI, applies the documented source-specific corrections, and writes the question dataset and web page images. `--source-root` and `--work-dir` support another mounted location.

## Original-recording transcripts

Every available original track has an automatically generated English transcript under `public/jahshan-transcripts/<exact Drive ID>.json`. Each file records the source audio SHA-256, transcription model, and timed segments. The UI rejects a mismatched track/checksum, clears the previous script on a recording change, follows playback inside its own scroll box, and supports seeking by timestamp and downloading the text. The original recording is unchanged. Repetitive recognition loops and nonverbal output are replaced with timestamped “Unclear interval” markers, rather than presented as reliable speech. These are automatic recognition results, not publisher transcripts or answer keys; recognition errors, especially names and medical terms, may remain.

Generation runs locally using `mlx-whisper` with `mlx-community/whisper-base.en-mlx`. It uploads no audio. Work resumes from matching completed files on GENODODI:

```sh
python scripts/transcribe-jahshan-audio.py --publish
```

Use a Python environment containing `mlx-whisper` and an installed `ffmpeg`. The first run downloads the model. The publish step requires all 90 original tracks to have matching nonempty transcripts. Source checks verify all track IDs/checksums and monotonic timestamps. A unit test rejects a transcript belonging to a different recording.

### Complete Reading pages

The Reading workspace displays complete original page images directly in step 3,
without requiring the local PDF. Parts A, B and C include every page in their
source ranges: passages, tables, diagrams, instructions and questions. Filtering
answer fields by Text A–D never removes the other source passages. Passage and
answer-part selectors stay synchronized. Answer-key pages and the index are also
available in the page reader; the optional PDF viewer remains under its own disclosure.

Regenerate from the checksum-verified source PDF with:

```sh
python3 scripts/import-jahshan-reading-pages.py --pdf '/path/to/Reading Jahshan OET Collection.pdf'
```

This requires Poppler and Pillow. Images retain the complete original layout at
2200 pixels on the longest edge and load as the reader scrolls. The collection
verifier checks that no question or passage page is omitted from any entry.
