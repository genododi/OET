# Recently added study files

The visible sidebar entry opens a searchable list of supplied study originals,
including PDFs, recordings, photos and other supported files. It opens the same
file and saved practice workspace as My OET & AMR Files. Source, skill and file
type filters work offline using `recent-materials.json`, included in the app and
the Home Screen app's cached shell.

`scripts/build-recent-materials.py` runs during each library sync after publication
and practice preparation. Legacy dates are the first catalog appearance in Git
history. Newly imported bytes receive their first import date; OCR and transcript
updates retain the original's date. Exact duplicates share one entry. Dates are
library import dates, not Telegram posting dates or publication dates.

Sources come from catalog folders, the external library's source paths and the
two authorized groups' saved attachment inventories. Only descriptive source
labels are published, never absolute paths, message identifiers, chat histories
or authentication data. Pending downloads and unverified originals are excluded.
Without a connected drive, the released list remains usable offline.
