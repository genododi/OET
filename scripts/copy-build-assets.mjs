import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Node's preferred-clone copy can silently fall back to full copies on macOS.
// Native cp -c requires an actual clone, keeping large assets independent while
// sharing their unchanged disk blocks. Failure leaves the installed app intact.
export async function copyBuildAssets(source, destination, { recursive = false } = {}) {
  if (process.platform !== 'darwin') return fs.cp(source, destination, { recursive, mode: 2 });
  await fs.mkdir(recursive ? destination : path.dirname(destination), { recursive: true });
  execFileSync('/bin/cp', [recursive ? '-cR' : '-c', recursive ? source + path.sep + '.' : source, destination], { stdio: 'pipe' });
  // cp cannot combine its clone and no-xattr options. Strip copied metadata
  // only from the new staging copy, leaving the source and installed app alone.
  execFileSync('/usr/bin/xattr', ['-crs', destination], { stdio: 'pipe' });
}
