# Source-based study workspace

My OET & AMR Files uses the same paper-style question cards, adjacent response
fields, progress indicator, next-unanswered control and individual printed-key
reveals as the Jahshan and Benchmark workspaces. Listening gaps retain their
surrounding words. Reading keeps source text alongside the questions on larger
screens; Writing and Speaking offer full-width or adjacent source/response views.
Existing answer and draft storage keys are retained. A single unambiguous older
draft for the exact same task/skill can be copied when that source is opened
under its own file; originals are never deleted. Broad numbered subject folders
and generic test titles no longer establish passage or printed-key relationships.

PDF geometry is display metadata, separate from the original extracted text used
by question offsets. `scripts/pdf_layout.py` preserves word positions and rotated
headings; a word-content comparison rejects divergent display data. A fixed-width
fallback preserves tabular extraction when geometry is unavailable. Original files
remain unchanged. Readers can enlarge positioned text or return to readable text.

Daily pearls appear once per local calendar day in each profile. They are optional,
work offline and do not appear in timed test routes or during playback/recording.
They are original preparation reminders with a link to the OET Teachers' Handbook.
They are in-app balloons, not operating-system notifications.

The mentor follows the selected task, part and current response. Immediate progress
observations do not claim an exam score. On the Mac, automatic local-model review
runs after a 12-second pause and no more than once per minute, only for a changed
attempt with enough content. It waits during media playback, recording or a hidden
window. No automatic review uses a paid API. Draft changes discard a stale review.
Tutor settings remain optional; the default coaching policy gives direct next
steps and asks only for essential missing information. Text cannot establish voice
quality or pronunciation. The Mentor page can resume the latest source context.

Reading highlights are opt-in study clues. They match informative question wording
or a supplied text answer against source sentences; they do not prove the correct
answer or replace the printed key. Unmatched questions remain unhighlighted.
Jahshan overlays use original page coordinates; saved offline tests include their
highlight geometry. The highlight locator reports when no confident wording match
is available. These aids are outside the locked official-paper exam flow.

# Private USMLE imports

Question content, page images and original PDFs stay under the existing private
Mac library, outside GitHub and the public web build. Source-labelled edition
years sort newest first in the library and when selecting a practice block.
Download, import and filesystem dates are never treated as production years.
Unknown years remain explicit; exact duplicates can retain multiple edition
labels and their filename/tag provenance without replacing corrected source keys.

`scripts/import-usmle-samples.py` accepts the complete, locally saved official
sample booklets with consecutive question numbering and complete printed keys.
It preserves physical source-page images, uses the booklet's printed update date,
and marks incomplete or unavailable-media items for review rather than scoring.
The normal private Anki/PDF importer preserves those cards during later imports.
Profile answers, labels, flags and notes are not modified by a library refresh.
