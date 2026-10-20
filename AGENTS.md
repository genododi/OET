# Mac app and GitHub parity

The user requires the installed macOS app to match the latest GitHub changes.
After changing and publishing this project, complete this release sequence:

1. Run the checks relevant to the change, commit and push the source to GitHub main.
2. Run `npm run desktop:build` using Node.js 24 or later. It builds fresh web assets
   from clean committed source, records the commit and installs the signed app.
3. Run `npm run desktop:check`. It must compare the installed stamp with the live
   GitHub main commit and verify the application signature. Do not report parity
   if GitHub could not be reached or this check fails.
4. Run the installed-app smoke check when application behavior changes, and verify
   the GitHub Pages deployment. Rebuild again if any source changes afterwards.

Preserve local profiles, backups, model files and the external original library.
Do not interrupt a running app that might contain an unsaved speaking recording.
Tell the user to reopen it when an installed update needs a fresh launch.
The app must remain usable offline; GitHub checking is a release check, not a
network requirement for studying.
