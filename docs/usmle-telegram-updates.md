# Weekly USMLE Telegram-folder updates

The owner's weekly task checks `/Volumes/GENODODI/TELEGRAM` on Saturdays at
09:00 Africa/Cairo. It imports study attachments already saved in that folder;
it does not claim to have checked Telegram groups. The computer and Codex must
be running for the local scheduled task. The OET daily check and weekly mentor
review remain separate.

The owner explicitly requested public sharing of these USMLE study blocks.
Only records marked `publicSharing: true` are exported. Profiles, personal
answers, revision notes, local paths, credentials and models stay on the Mac.
Earlier local imports remain local unless separately selected for sharing.
The owner subsequently selected all previously imported question banks too.
Their persistent source selection is recorded in the local
`usmle-library/public-sharing-selection.json`; ordinary weekly publication
retains that selection alongside newly imported Telegram blocks. It never
selects profiles or learner notes.

## Before importing

Follow AGENTS.md. Inspect the existing maintenance status and exclusive
`~/Library/Application Support/OET Study/library-sync/sync.lock` owner first.
Defer while another update holds the lock. Hold that same exclusive lock across
this entire import/release. Do not delete another process's marker or lock.
Never interrupt the learner's running app or recording.

Compare eligible filenames, sizes and exact SHA-256 with
`usmle-library/telegram-block-inventory.json` in the app support folder. Ignore
AppleDouble sidecars, hidden folders and unrelated OET files. Identical bytes
are reposts, not new editions. Preserve changed editions as distinct sources.
If no hashes changed and no unfinished release exists, stay quiet; do not create
an empty recognition batch or release merely to change the import date.

## Recognise and prepare

Use CommandLineTools DEVELOPER_DIR when the selected Xcode license blocks Swift
or Git. Use the existing local Python/Pillow/Tesseract tools and Node 24+.
Set `GODEBUG=netdns=cgo` for GitHub CLI operations on this Mac to avoid the
intermittent resolver timeouts observed during release verification.
Compile the recognizer, then run the maintained importer:

```sh
swiftc -O scripts/recognize-usmle-pdf.swift -o tmp/usmle-recognize
python3 scripts/import-usmle-blocks.py \
  --source /Volumes/GENODODI/TELEGRAM \
  --library "$HOME/Library/Application Support/OET Study/usmle-library" \
  --recognizer tmp/usmle-recognize --workers 1
```

The importer copies verified originals internally, backs up the existing index,
recognises pages locally and saves resumable page caches. `--resume-snapshot`
continues missing OCR pages without another drive transfer. `--reparse-only`
rebuilds cards from a completed verified cache. An incomplete receipt must never
be published. Preserve IDs and original added dates so progress stays intact.

Only explicit source keys or an identical clinical stem and complete option
wording matched to an existing source key permit scored practice. Never infer
a key from wrong-choice discussions. Retain every original PDF; withhold
uncertain question/explanation boundaries and report original-only sources.
Read production years only from explicit source labels, never file/import dates.
Unknown years and Steps must remain unassigned.

## Publish and install

Prepare and review the static snapshot before applying it:

```sh
python3 scripts/publish-usmle-library.py \
  --library "$HOME/Library/Application Support/OET Study/usmle-library"
# After reviewing the prepared snapshot:
python3 scripts/publish-usmle-library.py \
  --library "$HOME/Library/Application Support/OET Study/usmle-library" --apply
npm run test:usmle-shared
npm run test:unit
npm run lint
```

Originals use the `usmle-telegram-library-v1` GitHub Release, named by SHA-256;
GitHub size/digests must match before publication. Recognised text and Telegram
question-page images go in `public/usmle-library`. Full Telegram explanation scans
remain in the public original PDFs and richer local cache. Previously local
question-bank images, including answer diagrams, are public files in
`shared-usmle-media`; the website reads them from GitHub and the Mac build copies
them into its signed offline bundle. The media manifest verifies both locations.
Source authorship, license labels and classification stay with each question.
The Mac merges by stable ID, retaining existing source images and profile progress.

The one-time `--share-imported-questions` selection publishes every current
imported question bank and its relevant source PDFs. It does not publish a raw
Anki learner database, unselected reference books or personal profile history.
Future publication retains this explicit selection. Native reimport must retain
its sharing flags, and exact-key matching must continue accepting verified
original-source keys after publication, without circular derivative matching.

Review and commit only the intended source/static changes, then push main.
Check disk space before `npm run desktop:build` with Node 24+; set
`OET_LIBRARY_SYNC_LOCK_PID` to the actual held maintenance lock PID.
The build restores/verifies all shared PDFs on the internal disk before safely
installing the signed app. Run `npm run desktop:check` against live GitHub main,
`npm run desktop:check-usmle-shared`, and verify the actual Pages workflow,
`web-app-build.json` commit, public catalog and changed image hashes.

If publication succeeded but a later build/deployment step failed, preserve the
same source commit and resume remaining steps; do not repeat recognition just to
retry installation. Preserve dirty source work, originals, models and backups.
Record import, publication and installed/live verification separately. Only
report completion after all required checks, then remind the learner to reopen
the updated app after saving any recording. Keep the maintenance lock intact
until final verification, releasing only the current run's own marker/holder.
