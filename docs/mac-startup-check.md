# File checks when OET Study opens

Every Mac app launch starts a background check after the offline profile picker
opens. Opening the app again while it is running repeats the check; simultaneous
checks share one scan. **Study → Check for file updates** and **Check again** offer
the same check without leaving a study screen.

The check compares source filenames, sizes and precise modification/change times
against the importer’s local source cache. It follows the importer’s format and
exclusion rules, skips symlinks, and does not rehash the entire resource drive.
Full import and publication still verify exact original-file hashes. A separate
comparison detects external-library originals not yet in the app’s practice
catalog. Removed sources do not remove archived copies.

The app also checks the public GitHub main revision, without a token or API key.
No profile answers, recordings, filenames or chat histories are sent to GitHub.
The result appears in the profile picker and the compact profile bar. It clearly
distinguishes new files awaiting the scheduled update, an unfinished library
update, a newer published app, an installed replacement needing a reopen, a
disconnected drive, and an unavailable online check.

Drive scans have a deadline; network or drive failures do not prevent offline
study. Startup checks never close the app, change a profile, replace originals,
publish material, or start a competing recognition job. The existing scheduled
library update handles import, publication, rebuild, signature/version checks
and the installed-app smoke test. The user reopens an installed update when ready.

The latest check is recorded in the app’s `library-sync/startup-check.json` for
the daily updater. The receipt contains status and counts, not study responses.
Native profile switching retains this process-wide check and its current result.
