# OET Study Partner

A static, Medicine-first OET study system for learners targeting Grade A / 450+. It combines a first-run diagnostic, adaptive local study plan, timed practice across all four sub-tests, source-traceable guides, and deterministic tutoring that works without an API key.

This is an independent preparation tool. Practice scores and tutor feedback are coaching indicators, not official OET results.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
npm run dev
```

The production build uses the `/OET/` base path required by this repository's GitHub Pages deployment.

```bash
npm run build
npm run preview
```

## Learner features

- An English-only interactive mentor across Listening, Reading, Writing and Speaking, with 14 focused lessons, progressive hints, response review, worked examples and saved conversations. Recent lessons can be resumed from the mentor home.
- Coach and patient modes, editable voice dictation and spoken replies where the browser supports speech. Optional streaming AI adapts its follow-up to the current task, conversation, recent skill gaps and saved mistake reflections.
- Task mentoring inside practice and a review mentor after completed mocks. Using help marks practice as coached; coached results do not qualify as independent readiness evidence or advance mistake-recall intervals.
- Daily routine with a live exam countdown, a scored-session goal, calendar-day study streaks, and seven-day coverage of all four OET skills.
- Mistake Notebook with task/feedback search, skill and due-date filters, saved error reasons and next-time rules, answer evidence, and individual or selected spaced retries. Failed retries remain due; successful corrections follow the existing 1/3/7/14-day schedule. New responses are saved locally with feedback; older attempts remain readable without response text.
- Grade A diagnostic and plan based on exam date, available days, daily time, and four baseline scaled scores.
- Medicine resource library with sub-test, format, source, and text filters.
- Timed Listening, Reading, Writing, and Speaking sessions with review evidence and provenance.
- Authentic mock orchestration derived from the mounted official sample papers: locked Listening/Reading/Writing/Speaking phases, exact task quotas, phase clocks, one-use audio, and no in-test answer reveal.
- More than 1,000 browsable Medicine test sessions in each of Listening, Reading, Writing, and Speaking.
- A single next-best-move prescription that samples unmeasured skills first, then routes the weakest sub-test to its lowest measured Part A/B/C or productive rubric score.
- Time-calibrated adaptive workloads: at most one full Writing letter, one Speaking role-play in a mixed set, or the two-role-play workload when Speaking is trained alone.
- Original referral, discharge, transfer, advice, and patient-role-play practice.
- Offline rubric feedback, corrections, vocabulary cues, model structures, and next drills.
- Optional bring-your-own Anthropic key for a second writing or speaking review. The key stays in browser storage and the app remains usable if the provider times out or fails.
- USMLE remains a separate related-exam area and is excluded from OET planning, readiness, ingestion, and reporting.

## Source policy

Public availability is not redistribution permission. Every public resource must have a source URL, publication decision, and rights status.

- Official or permission-confirmed assets may be served locally.
- Rights-unclear community files remain in the private external archive and appear in the app only as link-only references or newly authored derivative exercises.
- Paid packs, third-party recordings, copied answer keys, generated testimonials, corrupt downloads, executables, and unsafe archives are not published.
- The Official OET speaking masterclass is linked and used to author original drills; its video is not republished.

The private archive lives outside Git at:

```text
/Volumes/GENODODI/oet-study-sources/
  raw/{google-drive,facebook,telegram,mega,references}/
  normalized/
  quarantine/
  manifests/
  reports/
```

## Refresh the source archive

GENODODI must be mounted. The scripts refuse an archive root outside that volume.

```bash
npm run sources:acquire -- --references
npm run sources:acquire -- --drive
npm run sources:drive-resilient -- --default-sources --retry-blocked --max-workers 4
npm run sources:acquire -- --mega
python3 scripts/acquire-telegram-links.py --download-drive
npm run sources:drive-resilient -- --from-telegram-manifest /Volumes/GENODODI/oet-study-sources/manifests/telegram-link-index.json --destination /Volumes/GENODODI/oet-study-sources/raw/telegram/google-drive --retry-blocked --max-workers 4
# Later retries can add: --incomplete-only --skip-direct-files
npm run sources:extract-mega
npm run sources:quarantine
npm run sources:inventory
```

Facebook files use the account owner's signed-in Safari session. Set Safari's download location to `raw/facebook`, download from the group's Files view, then run the inventory command. Credentials and signed download URLs must never be copied into the repository or manifest.

Source import is resumable. Checksums drive duplicate relationships; every original source-path record is retained. Encrypted, executable, corrupt, path-traversing, unverifiable, or rights-unclear material is quarantined or marked private.

The project mirrors every external source record into `sources/source-manifest.generated.json` and publishes only an aggregate dashboard summary. The source binaries remain on GENODODI because the archive is larger than a normal GitHub repository and its third-party files are not cleared for redistribution.

The explicitly supplied `/Volumes/GENODODI/oet-study-sources/Google drive Folder` is also covered entry-for-entry. Its generated manifest records every filesystem entry, while the app exposes a searchable private index of every real study file. macOS `._` sidecars are checksummed and accounted for but excluded from learner search results. Raw third-party bytes remain private because the multi-gigabyte folder contains files above GitHub's normal per-file limit and has no blanket redistribution clearance. Current counts and bytes come from the generated catalog rather than documentation so daily additions cannot make the UI stale.

Private-index cards can open their underlying files on the source Mac through a
read-only localhost gateway. Install or refresh it with
`npm run sources:install-gateway`; it starts automatically at login, binds only
to `127.0.0.1`, confines requests to the configured GENODODI folder, and supports
streaming byte ranges for PDFs, audio and video. The public GitHub Pages site
contains only the file metadata and localhost links—not the private bytes.

The source-learning map assigns every real file a learning role, an OET route, an integration decision, and a stable source ID. Every safe mapped record is rotated through the generated advanced Practice catalog, so PDFs, audio, video, documents, images, and archives all influence the learner-facing source map without copying private material into a public session. Restricted test scans and unsafe files remain visible as accounted-for private records but are excluded from generated tasks. Files above GitHub's 100 MiB Git-blob limit are labelled explicitly; see [GitHub's large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

Refresh the complete local ledger manually:

```bash
npm run sources:inventory
npm run sources:sync-local
npm run test:source-manifest
```

Import the verified real Listening Sample Test 1 and 2 recordings from the mounted source folder. The importer joins each matched Part A, B, and C set into one exam recording and records checksums for the source tracks, script, answer key, and generated audio:

```bash
npm run sources:import-real-listening
npm run test:real-listening
```

These two official-public sample packs power 84 scored answers in the Mock Exams workspace. Other recordings in the folder remain private until their question paper, answer key, and redistribution status can be verified.

Install the macOS source watcher for an immediate local refresh when the raw source folder changes:

```bash
npm run sources:install-daily
```

The Codex automation **OET daily source deploy** owns the 06:30 daily run. It inventories and
verifies generated source changes in isolation, commits only the generated manifest and catalog files,
pushes to `main`, waits for GitHub Pages, and reports failures without force-pushing.

The authentic mock blueprint is documented in [the OET exam simulation specification](docs/authentic-oet-simulation.md). The reconciled delivery checklist and remaining external-access exceptions are maintained in [the source-driven upgrade status](docs/source-driven-upgrade-status.md).

## Tutoring and privacy

The built-in tutor is deterministic and fully client-side. Optional AI review calls Anthropic directly from the browser with the learner's own key, validates the structured response, limits output sizes, and times out after 30 seconds. Provider failure never blocks offline study.

For the conversational mentor, open **Your OET Mentor**, choose a lesson, and try an answer before requesting a review. To activate open-ended conversation, add an Anthropic API key in **Settings**, then choose **Live AI** under **Tutor connection**. Requests use Claude Sonnet 5 and stream text, with a 60-second limit covering both connection and reply. Stop and retry are supported. API use is billed to the key's account. Without a key, structured strategies, hints and rubric feedback remain available; the built-in patient has limited scripted replies.

Live mentoring sends the current task, answer, bounded recent conversation and a short study summary directly to Anthropic. Answer keys, listening transcripts and worked models are withheld from fresh strategy/hint requests; they become available when reviewing an attempted response. The mentor receives text, not microphone audio, and cannot judge pronunciation. Browser dictation may use the browser's speech service; the learner can edit the transcript before sending.

Public instructor references are attributed links and a small number of source-checked teaching notes, not imported courses or video transcripts. The mentor is independent and does not impersonate Dr Ashgan or Dr Elghazouly. References and verification notes are recorded in `src/data/mentorReferences.ts`.

Learner settings, diagnostic profile, plan, and progress use versioned local-storage schemas. Mentor memory retains up to 12 recent conversations with at most 40 messages each, plus their current drafts, on the same browser. No application backend is required.

Mentor checks cover prompt evidence boundaries, exact answer feedback, coached-score exclusion, bounded memory, streaming events, timeouts, cancellation and retry. Automated API checks use simulated responses; they do not verify a paid account or real microphone permission.

## Verification

```bash
npm run lint
npm run test:unit
npm run test:oet
npm run test:governance
npm run test:source-manifest
npm run build
npm run test:e2e
```

`test:oet` verifies official blueprint counts/timing, question uniqueness and answers, productive-skill coverage, Part A responses, audio mappings, spoken relevance, and Grade A readiness. `test:governance` blocks unsafe, quarantined, oversized, and unverifiable public assets. `test:source-manifest` validates the checked-in source register and automatically validates the detailed external manifest when GENODODI is mounted; use `npm run test:source-manifest -- --require-external` for final archive acceptance. Playwright covers diagnostic planning, resource search, timed writing, speaking fallback, offline tutoring, precision recommendations, and hash routing.

For a fresh Playwright installation:

```bash
npx playwright install --with-deps chromium
```

## Deployment

GitHub Actions gates deployment on lint, unit/component tests, all OET content verifiers, source governance, the production build, and Playwright smoke tests. Only a successful `main` build is deployed to GitHub Pages.
