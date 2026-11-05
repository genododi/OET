# Offline Mac application

The Mac application runs the OET workspace, original recordings, transcripts,
papers and live AI mentoring without an internet connection or an API key.
It targets the supplied Apple Silicon Mac. The browser website remains available.

Open `~/Applications/OET Study.app` and create a profile. Each profile uses a
separate persistent Chromium session, including its own answers, drafts, notes,
preferences and mentor conversations. Profiles are local study spaces, not
password-protected accounts. Recordings made with the speaking recorder should
be downloaded before leaving the recording screen.

The application bundles the existing study library, all 20 Benchmark recordings
and the 90 Jahshan recordings. The complete released OET collection is also saved
once under `~/Library/Application Support/OET Study/offline-library` on the Mac.
Recordings, PDFs, images, archives and other released originals open without
GENODODI or an internet connection. The permanent copy is shared by local profiles
and survives application updates; each profile's study progress stays separate.
GENODODI is needed only to check/import newly added source material.

Every build checks this permanent copy against the committed release catalog.
It copies and hashes available external originals, or downloads missing files
from their existing GitHub Releases, verifies size and SHA-256, and replaces each
file atomically. Interrupted copies resume by verified file. An altered local copy
is preserved in the library's `quarantine` directory. Originals, profiles, backups
and models are not deleted. The build fails before replacing the app if space or
verification is insufficient. Full collections stay outside Git history and the
signed app bundle, avoiding a 14 GB duplicate on every application update.

`npm run desktop:cache-library` repairs the permanent copy without rebuilding.
The maintenance pipeline invokes it as part of app builds under its existing
exclusive lock. `npm run desktop:check` verifies library completeness as well as
the installed signature and live GitHub source. Private USMLE files remain local
in their separate private library and are never uploaded by this process.

The local AI engine is llama.cpp with Metal acceleration and a pinned
Qwen3.5 4B Q4_K_M model, chosen for this Mac's 8 GB of memory. The model and
runtime are installed under `~/Library/Application Support/OET Study/local-ai`.
The first request loads the model; subsequent conversation reuses it. The app
starts its own loopback-only inference process and stops it on exit. No hosted
service or user-supplied credential is involved. The renderer blocks all HTTP,
HTTPS and WebSocket network access; publisher references open separately in the
user's browser when explicitly selected.

Local AI supplies individual explanations, patient dialogue and response review.
Coaching estimates are not official OET results. Text transcripts do not establish
pronunciation or intelligibility. The built-in deterministic guide remains an
alternative. Original exam recordings remain human speech.

Use **Profiles & backups** to create, switch or rename profiles and export/import
study data. The website's **Settings → Export my saved study data** produces a
compatible backup. Import adds missing entries and preserves existing saved work;
create an empty profile to restore the complete backup without conflicts. API
keys are excluded from exports. Profile data is independent of application
updates and the external study library.

## Rebuild

Use Node.js 24 or later, Python 3, Poppler and the macOS signing/icon utilities.

```sh
npm ci
node node_modules/electron/install.js
python3 scripts/import-offline-library.py --output "/Volumes/GENODODI/OET/Mac App/offline-library"
python3 scripts/install-local-ai.py --output "$HOME/Library/Application Support/OET Study/local-ai"
# Commit and push source changes before building the installed release.
npm run desktop:build
npm run desktop:check
```

The builder installs an ad-hoc signed application in `~/Applications`, with a
stethoscope icon and its own bundled Electron runtime. Application Support data
and the original library are preserved during a rebuild. `OET_MAC_RESOURCES`,
`OET_MAC_AI` and `OET_MAC_OUTPUT` configure other installation locations.

Every release build requires clean source matching the live GitHub main commit,
rebuilds the frontend, and records its commit, Git tree and build date inside the
signed application. **Profiles & backups** shows the running app's source commit.
`desktop:check` independently compares the installed app with GitHub main and
verifies its signature; an unreachable GitHub server is an unverified check,
never a successful one. Run it after every publication and rebuild if the app
differs. This release check uses the internet; normal study does not. An already
open app keeps running its earlier version until you reopen it. Saved profiles
survive the update. `AGENTS.md` records this required workflow for future changes.

## Import and publication

Scheduled refreshes use the persistent transcription environment at
`~/Library/Application Support/OET Study/local-ai/transcription/venv` and keep
its Whisper model under `transcription/models`. These files survive temporary
cache cleanup. The refresh runs transcription with network access disabled;
the runtime and model must be installed before processing new recordings.
If this environment is absent, the updater tries the existing offline `uv`
cache. A failed refresh preserves completed recognition work and saved profiles.

The importer deduplicates by SHA-256, retains source paths, extracts PDF and Word
text, and copies originals unchanged. Archives, executables, repository/build
copies, quarantine, sidecars and temporary Word lock files are excluded. Scanned
pages remain available as originals even when no searchable text can be extracted.

Large originals are uploaded to release assets rather than Git history. Uploads
are resumable, stage one batch on the Mac to avoid removable-drive stalls, verify
its checksum before transfer, and publish searchable text only after a release
batch succeeds. `--finalize` verifies and commits only generated import files and
pushes them through the normal GitHub Pages checks; it refuses an already-staged
Git index and never force-pushes.

```sh
python3 scripts/publish-offline-library.py --library "/Volumes/GENODODI/OET/Mac App/offline-library" --workers 1 --apply --finalize
node scripts/verify-imported-resources.mjs
npm run test:desktop
node scripts/verify-macos-app.mjs
```

`OET_SMOKE_EXECUTABLE` tests the installed application instead of the development
entry. Tests use disposable profiles, verify separation and draft persistence,
play/seek/resume real audio, and verify that network requests are blocked.

Model provenance and licence are stored beside the installed weights. The model
download is pinned to a repository revision and full SHA-256. The inference runtime
comes from [llama.cpp](https://github.com/ggml-org/llama.cpp/releases/tag/b11734);
the quantized model comes from
[Unsloth's Qwen3.5 4B repository](https://huggingface.co/unsloth/Qwen3.5-4B-GGUF).
