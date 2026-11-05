# Open Step 1 imports

The Mac app's private question library can include source-authored or generated
open practice alongside the learner's own materials. The library remains under
`~/Library/Application Support/OET Study/usmle-library`; no private questions,
answers, study progress, original PDFs or media are committed to this repository.

## Cohort

- Publisher: MD3 contributors, https://github.com/todd866/cohort
- Pinned release: `839dde632f515ffa27423f0c9868dae8a77c408e`
- Content: 556 Step 1-labelled, generated practice questions and five ECG exhibits.
- Question licence: CC BY 4.0, individually recorded by the publisher.
- Attribution: MD3 contributors. The original repository and licence link are
  shown on each question. Source citations and option explanations are retained.
- Adaptations: mapped fields to the local library; rendered SVG exhibits as PNG
  while retaining original files and media attribution/individual licence.
- Dates: the question production year is not stated and remains unknown.
  Download time, repository revision and cited textbook publication dates are
  not used as question production years.
- These are supplementary practice, not official exam questions, a complete
  Step 1 blueprint or an independently clinically validated bank.

`scripts/import-open-step1.py --cache <retained-source-folder>` downloads only the
pinned content inventory needed for this bank, checks every SHA-256 against its
pinned distribution manifest, requires per-question rights/origin/Step labels,
validates a unique source key and citation, and copies required exhibits locally.
It requires the maintenance release lock and the private import lock. It keeps a
content-addressed backup of the old index and atomically replaces the index only
after all source questions validate. Existing question IDs and first-added dates
survive repeated imports; conflicting duplicate keys fail for review.

## Discovery boundaries

The November 5, 2026 search checked the official USMLE sample page and open source
question repositories. The current official sample booklets were already in the
private library. MedQA was not imported: BigBio labels its data licence unknown,
and the authors' issue 19 asks for clarification of source-by-source rights.
The physician-reviewed 20-item pilot in
`ehsanimanimd76/usmle-style-medical-llm-benchmark` explicitly targets Step 2 CK and
was excluded from this Step 1 import. Paid-bank dumps and recalled exam questions
are not acquisition sources. No fresh native Telegram attachment coverage is
claimed by this import.
