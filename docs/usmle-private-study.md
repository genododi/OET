# Private USMLE study on Mac

Open **USMLE Study** in the sidebar. Use **Study files**, **Practise a block**,
then **Review & revise**. Each offline profile keeps separate answers, flags,
revision notes, Step assignments and practice history.

**Import / update my study folder** reads a folder selected through the Mac
file picker. It imports PDFs and supported traditional Anki `.apkg` exports
without modifying the originals. Supported note layouts are **SBA MCQ (v2)**
and **Blocks 01–21 source study cards** with Question/Answer/Source/SearchText
fields. Other layouts and newer compressed Anki database formats are reported
as unsupported. PDFs stay available as source documents; importing a PDF alone
does not invent an extracted question bank.

The importer retains question and answer images, checks archive integrity,
deduplicates repeated question content, and keeps source labels. Incomplete
cards stay review-only. Source-deck Step/subject classifications may be inferred;
unassigned questions stay out of timed Step blocks until the learner assigns a
Step. A final corrected source key takes priority over an earlier text extraction.
The private library is shared between profiles; personal study data is separate.

Private question content, media and PDF copies live under
`~/Library/Application Support/OET Study/usmle-library`, outside this repository,
GitHub Pages and the application bundle. They continue working without the
internet or the original external drive. Keep separate backups of this folder
and of the original study files; profile backups contain personal study data,
not the shared source library. Re-importing preserves original added dates.

Publisher links open the official USMLE, NBME, UWorld, AMBOSS and El Husseiny
sites. The app does not scrape paid accounts or unofficial Telegram mirrors.
Only import material you are entitled to use; private imports are never part of
the public release pipeline.

Practice blocks default to up to 20 questions in 30 minutes, reflecting the 2026
USMLE software format. They are not full official examinations. Practice results
show accuracy and unanswered counts; they do not predict official scores or
pass/fail results. Historical records are preserved, and legacy subject results
without exact denominators are not turned into fabricated question counts.

Maintenance: `node desktop/usmle-import-worker.mjs /path/to/source /path/to/private-library`
uses the same importer as the app. Mac SQLite is read-only, safe mode is enabled,
and the importer runs in a separate process. The installed-app verification script
supports `OET_SMOKE_USMLE=1` for a disposable-profile test against the actual private
library; the learner's profiles and running app are not touched.
