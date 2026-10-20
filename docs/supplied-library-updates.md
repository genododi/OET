# Studying from OET and AMR files

Open **My OET & AMR Files**, select a file and choose Reading, Listening,
Writing or Speaking. Select a task or part in the workspace.

The complete source text appears above the numbered questions. Each response
field is beside its printed question. **Show answer** and **Reveal all** display
matched printed keys without replacing your attempt. Uncertain or unavailable
keys are labelled rather than guessed. Some keys are available as original pages.
Scanned text is labelled as recognised text; consult the original if recognition
has lost formatting or wording.

Listening uses original recordings. A transcript belongs to the exact recording,
and its highlighted sentence follows playback. Selecting a part seeks to its
recognised introduction when available; playback can also select the matching
question part. Where several recordings could match, choose the correct one.
Automatic transcripts can contain recognition errors and are not printed keys.

Writing shows case notes and the task, with supplied model letters available
under a disclosure. Speaking shows the candidate card and any supplied partner
card. Neither has a single correct answer. Drafts and review notes are saved per
file, skill and selected task within the active offline profile. Download a
speaking recording before leaving its session.

# Automatic library updates

`npm run materials:sync` checks `/Volumes/GENODODI/OET`, preserves exact originals
in its `Mac App/offline-library` archive, safely expands supported study archives,
recognises scanned pages and recordings locally, publishes verified resources,
and rebuilds the installed Mac app after committing to GitHub main.

Recognition runs in resumable batches (250 pages and 10 new recordings per run)
so new original files can be published without waiting for an entire scanned
library. Subsequent scheduled runs continue the remaining work. Completed text
and transcripts are reused only for matching original checksums.

The scheduled chat follow-up checks hourly while the Mac is available. If the
drive is disconnected, existing study data remains usable. Unrelated source
edits, failed checks or a diverging GitHub branch stop automatic publication for
review; no profiles, backups, models or originals are reset. GitHub access is
needed for publishing and release verification, not for offline study.

After a successful installed update, reopen **OET Study** when convenient. The
updater does not close a running study session or interrupt a recording.

Save study attachments from the Telegram group in
`/Volumes/GENODODI/OET/Telegram Inbox` to include them in the same import. Direct
group attachment acquisition requires readable access to the already-open group;
it is not established merely by opening an invite link. Chat histories, private
messages and account credentials are not imported as study material.
