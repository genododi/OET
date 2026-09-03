import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const launchAgents = resolve(homedir(), 'Library/LaunchAgents');
const label = 'com.oet-workstation.local-source-gateway';
const plistPath = resolve(launchAgents, `${label}.plist`);
const scriptPath = resolve(projectRoot, 'scripts/serve-local-source-files.mjs');
const logDirectory = resolve(projectRoot, 'logs');
const sourceRoot = '/Volumes/GENODODI/oet-study-sources/Google drive Folder';
const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(process.execPath)}</string>
    <string>${escapeXml(scriptPath)}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OET_LOCAL_SOURCE_ROOT</key><string>${escapeXml(sourceRoot)}</string>
    <key>OET_LOCAL_SOURCE_PORT</key><string>4318</string>
  </dict>
  <key>WorkingDirectory</key><string>${escapeXml(projectRoot)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${escapeXml(resolve(logDirectory, 'local-source-gateway.log'))}</string>
  <key>StandardErrorPath</key><string>${escapeXml(resolve(logDirectory, 'local-source-gateway.error.log'))}</string>
</dict>
</plist>
`;

await mkdir(launchAgents, { recursive: true });
await mkdir(logDirectory, { recursive: true });
await writeFile(plistPath, plist);
spawnSync('launchctl', ['bootout', `gui/${process.getuid()}/${label}`], { stdio: 'ignore' });
const result = spawnSync('launchctl', ['bootstrap', `gui/${process.getuid()}`, plistPath], {
  encoding: 'utf8',
});
if (result.status !== 0) throw new Error(result.stderr || 'Could not install the local source gateway.');
console.log(`Installed OET local source gateway: ${plistPath}`);

