import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Node's preferred-clone copy can silently fall back to full copies on macOS.
// Native cp -c requires an actual clone, keeping large assets independent while
// sharing their unchanged disk blocks. Failure leaves the installed app intact.
export async function copyBuildAssets(source, destination, { recursive = false } = {}) {
  if (process.platform !== 'darwin') return fs.cp(source, destination, { recursive, mode: 2 });
  await fs.mkdir(recursive ? destination : path.dirname(destination), { recursive: true });
  const sameVolume=(await fs.stat(source)).dev===(await fs.stat(recursive ? destination : path.dirname(destination))).dev;
  // A removable FAT volume cannot share APFS blocks. Use its free storage for
  // a real copy while continuing to require clones for same-volume staging.
  execFileSync('/bin/cp', [recursive ? sameVolume ? '-cR' : '-RX' : sameVolume ? '-c' : '-pX', recursive ? source + path.sep + '.' : source, destination], { stdio: 'pipe' });
  // cp cannot combine its clone and no-xattr options. Strip copied metadata
  // only from the new staging copy, leaving the source and installed app alone.
  // Across volumes cp -X omits source metadata as it copies. Recursively clearing
  // it afterwards fails on the AppleDouble files created by FAT itself.
  if (sameVolume) execFileSync('/usr/bin/xattr', ['-crs', destination], { stdio: 'pipe' });
}
