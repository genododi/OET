import { installedMacApp } from './macos-installation.mjs';
// Exercise the installed app with both external source locations unavailable.
// Uses disposable profiles and never reloads or closes the learner's running app.
import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const installed = installedMacApp();
const resources = path.join(installed, 'Contents/Resources');
const locations = JSON.parse(await fs.readFile(path.join(resources, 'offline-locations.json'), 'utf8'));
assert(!locations.library.startsWith('/Volumes/'), 'The default study library must be on the Mac');
assert.notEqual(locations.library, locations.sourceLibrary);
const catalog = JSON.parse(await fs.readFile(path.join(resources, 'dist/imported-resources/catalog.json'), 'utf8'));
assert(catalog.files.length > 1000, 'The complete released collection must be tested');
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-no-drive-smoke-'));
const app = await electron.launch({
  executablePath: path.join(installed, 'Contents/MacOS/OET Study'), args: [],
  env: { ...process.env, OET_DESKTOP_USER_DATA: data, OET_DESKTOP_SOURCE: path.join(data, 'unmounted-source'), OET_DESKTOP_SOURCE_LIBRARY: path.join(data, 'unmounted-source-library') }, timeout: 60000,
});
try {
  await app.evaluate(({ session }) => session.defaultSession.enableNetworkEmulation({ offline: true }));
  let page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Who is studying today?' }).waitFor();
  const profile = await page.evaluate(() => window.oetDesktop.createProfile('Offline files verification'));
  const opened = app.waitForEvent('window');
  void page.evaluate(id => window.oetDesktop.switchProfile(id), profile.id).catch(() => {});
  page = await opened; await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button', { name: 'Profiles & backups' }).waitFor();
  let startup;
  await expect.poll(async () => {
    startup = await page.evaluate(async () => (await window.oetDesktop.info()).updates);
    return startup?.checking;
  }, { timeout: 65000 }).toBe(false);
  assert.equal(startup.files.state, 'disconnected');
  assert.equal(startup.localLibrary.state, 'ready');
  assert.equal(startup.localLibrary.files, catalog.files.length);
  assert.equal(startup.state, 'offline-ready');
  const errors = await page.evaluate(async rows => {
    const errors = [];
    for (let offset = 0; offset < rows.length; offset += 12) {
      await Promise.all(rows.slice(offset, offset + 12).map(async row => {
        try {
          const response = await fetch(`/OET/desktop/original/${row.sha256}?format=${row.format}`, { headers: { Range: 'bytes=0-0' } });
          if (response.status !== 206 || response.headers.get('content-range') !== `bytes 0-0/${row.bytes}` || (await response.arrayBuffer()).byteLength !== 1) errors.push(row.sha256);
        } catch { errors.push(row.sha256); }
      }));
    }
    return errors;
  }, catalog.files.map(({ sha256, format, bytes }) => ({ sha256, format, bytes })));
  assert.deepEqual(errors, [], 'Every released original must open with the external source unavailable');
  console.log(JSON.stringify({ allOriginalsOpenedWithoutDrive: catalog.files.length }));
  const playedFormats = [];
  for (const format of ['mp3', 'ogg', 'm4a']) {
    const file = catalog.files.find(file => file.format === format && (format !== 'ogg' || file.filename === 'Task 2.ogg'));
    assert(file, `An original ${format} recording must be available`);
    await page.evaluate(id => { location.hash = `#materials/${id}`; }, file.id);
    await expect(page.getByRole('heading', { name: `1 · ${file.filename}`, exact: true })).toBeVisible();
    await page.waitForFunction(sha => document.querySelector('audio')?.currentSrc.includes(sha), file.sha256, { timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('audio')?.duration > 0, null, { timeout: 60000 });
    const audio = page.locator('audio').first();
    await audio.evaluate(async element => { element.muted = false; element.volume = 1; await element.play(); });
    await expect.poll(() => audio.evaluate(element => element.currentTime)).toBeGreaterThan(.25);
    await audio.evaluate(element => { element.pause(); element.currentTime = Math.min(20, element.duration / 2); });
    const paused = await audio.evaluate(element => element.currentTime);
    await audio.evaluate(async element => { await element.play(); });
    await expect.poll(() => audio.evaluate(element => element.currentTime)).toBeGreaterThan(paused + .25);
    await audio.evaluate(element => element.pause()); playedFormats.push(format);
  }
  const pdf = catalog.files.find(file => file.format === 'pdf');
  const textResult = await page.evaluate(async file => {
    const original = await fetch(`/OET/desktop/original/${file.sha256}?format=pdf`, { headers: { Range: 'bytes=0-4' } });
    const text = await (await fetch(`/OET/offline-library/text/${file.sha256}.json`)).json();
    return { prefix: await original.text(), type: original.headers.get('content-type'), sourceSha256: text.sourceSha256 };
  }, pdf);
  assert.deepEqual(textResult, { prefix: '%PDF-', type: 'application/pdf', sourceSha256: pdf.sha256 });
  const networkBlocked = await page.evaluate(async () => { try { await fetch('https://example.com'); return false; } catch { return true; } });
  assert(networkBlocked);
  console.log(JSON.stringify({ sourceDriveUnavailable: true, internetUnavailable: true, localLibraryReady: true, originalsVerified: catalog.files.length, bytes: startup.localLibrary.bytes, pdfAndSavedTextOpen: true, unmutedAudioPlaysSeeksAndResumes: playedFormats, rendererNetworkBlocked: true, disposableProfile: true }));
} finally { await app.close(); }
