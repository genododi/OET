# OET Study on iPhone and iPad

OET Study is an installable Home Screen web app. It does not require an Apple
developer account, an App Store purchase, certificates, sideloading or weekly
signing. It uses the same published source as the website and Mac app.

## Install

1. In Safari, open <https://genododi.github.io/OET/#app>.
2. Choose **Share → Add to Home Screen**. Keep **Open as Web App** on if offered.
3. Tap **Add**, then open the stethoscope icon.
4. Keep it open online until the install page says **Core app saved for offline use**.
5. Open a test and expand **Save this test for offline study**, then tap
   **Save for offline**. Wait for completion before switching to Airplane Mode.

Apple's instructions: <https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios>.

## What is saved

The small core app contains all application screens and embedded practice data.
Large recordings, paper images and extracted text are saved only when selected.
Benchmark, Jahshan, My OET & AMR Files, and official paper practice offer saves
beside their paper or player. The install page lists saved selections and checks
whether required files remain available. Reading questions and printed answer
reveals use the same source-backed data as the website.

When a download host blocks browser saving, a verified original with a recorded
SHA-256 can be saved to Files and selected in the offline save panel. The app
rejects a mismatched file. Optional original PDFs and unavailable transcripts are
shown separately; they are not falsely reported as downloaded. Saved audio is
served with byte ranges so seeking and resume can work without internet.

Install and new downloads need internet. Publisher-hosted exam players, external
links and optional online services still need internet. The Mac's local AI model
does not transfer to iPhone; built-in practice review and guidance need no API key.
Keep the app in the foreground during downloads and role-play recordings.

## Profiles and backups

On **Install app · Offline & profiles**, create and choose a local profile.
Existing browser answers remain in **My study profile**. Each profile has separate
answers, letters, notes and progress; downloads are shared on the device. Profiles
are not password-protected and do not automatically sync between devices.

Export a profile backup regularly and keep it in Files. Import fills missing
entries and preserves existing answers. Backups exclude API credentials and audio
files. Download voice recordings separately before closing or switching profiles.
Safari and the Home Screen app can have separate storage; transfer an existing
profile using its backup if needed.

iOS can reclaim website storage under pressure. A save is not a permanent archive.
The app offers a persistent-storage request, but the browser decides whether to
grant it. Removing website data or the installed app can remove local work.

## Updates

New service workers wait while the app is open. Use **Check for app update**, then
**Apply update & reopen** after saving work. Updates preserve profiles and pinned
test downloads. They never automatically reload an open recording or letter.

`npm run build` generates the manifest-linked service worker and a content-versioned
core shell. GitHub Pages deploys them together. Native macOS builds skip browser
profile interception and service-worker registration and retain native profiles.
The release must also complete the Mac build, installed signature/source check,
disposable-profile smoke test and live Pages verification required by AGENTS.md.
