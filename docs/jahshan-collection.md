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

GitHub contains the catalog, source links, page mappings and player code.
The large source files stay on the external drive; the Reading PDF exceeds
GitHub's normal 100 MiB file limit. The hosted page uses browser-selected files, so file contents are never uploaded
by this page. The existing read-only gateway is available only when the app itself
is opened from an HTTP loopback address (localhost / 127.0.0.1). Hosted HTTPS pages
do not show the gateway button or issue any gateway request. Google Drive links work as a fallback on other devices. Select the Jahshan folder on GENODODI to use its local audio and PDFs. File selections must be repeated after a reload.

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
