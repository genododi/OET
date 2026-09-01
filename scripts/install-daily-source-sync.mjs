import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const launchAgents = resolve(homedir(), 'Library/LaunchAgents');
const plistPath = resolve(launchAgents, 'com.oet-workstation.daily-source-sync.plist');
const logPath = resolve(projectRoot, 'logs/source-sync.log');
const shellCommand = `cd ${JSON.stringify(projectRoot)} && (/usr/bin/env npm run sources:inventory && /usr/bin/env npm run sources:sync-local && /usr/bin/env npm run sources:import-real-listening) >> ${JSON.stringify(logPath)} 2>&1`;
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.oet-workstation.daily-source-sync</string>
  <key>ProgramArguments</key>
  <array><string>/bin/zsh</string><string>-lc</string><string>${escapeXml(shellCommand)}</string></array>
  <key>WatchPaths</key><array>
    <string>/Volumes/GENODODI/oet-study-sources/raw</string>
    <string>/Volumes/GENODODI/oet-study-sources/Google drive Folder</string>
  </array>
</dict>
</plist>
`;

await mkdir(launchAgents, { recursive: true });
await mkdir(dirname(logPath), { recursive: true });
await writeFile(plistPath, plist);
spawnSync('launchctl', ['bootout', `gui/${process.getuid()}`, plistPath], { stdio: 'ignore' });
const result = spawnSync('launchctl', ['bootstrap', `gui/${process.getuid()}`, plistPath], { encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || 'Could not install daily source sync.');
console.log(`Installed daily source sync: ${plistPath}`);
