import { installedMacApp } from './macos-installation.mjs';
// Exercise only a disposable instance; never reload or close the learner's app.
import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const data = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-collection-done-'));
const executable = process.env.OET_SMOKE_EXECUTABLE || path.join(installedMacApp(), 'Contents/MacOS/OET Study');
const app = await electron.launch({ executablePath: executable, args: [], timeout: 60000,
  env: { ...process.env, OET_DESKTOP_USER_DATA: data, OET_DESKTOP_SOURCE: path.join(data, 'missing-drive'), OET_DESKTOP_SOURCE_LIBRARY: path.join(data, 'missing-source-cache') } });
try {
  await app.evaluate(async ({ session }) => session.defaultSession.enableNetworkEmulation({ offline: true }));
  let page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Who is studying today?' }).waitFor();
  const build = await page.evaluate(async () => (await window.oetDesktop.info()).build);
  assert.equal(build.gitCommit, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  const first = await page.evaluate(() => window.oetDesktop.createProfile('Completion first learner'));
  const second = await page.evaluate(() => window.oetDesktop.createProfile('Completion second learner'));
  const switchTo = async id => {
    const opened = app.waitForEvent('window');
    void page.evaluate(id => window.oetDesktop.switchProfile(id), id).catch(() => {});
    page = await opened; await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Profiles & backups' }).waitFor();
  };
  const open = async (route, label) => {
    await page.evaluate(route => { location.hash = `#${route}`; }, route);
    await page.getByRole('checkbox', { name: label, exact: true }).waitFor();
  };
  const done = () => page.getByRole('checkbox', { name: /^Done:/ });
  const select = label => page.getByRole('combobox', { name: label, exact: true });
  await switchTo(first.id);
  await open('benchmark/listening-1', 'Done: Benchmark · Listening Test 1');
  const answer = page.getByRole('textbox', { name: 'Question 1', exact: true });
  await answer.fill('Keep my listening answer');
  const audio = page.locator('audio').first();
  await page.waitForFunction(() => document.querySelector('audio')?.duration > 0, null, { timeout: 60000 });
  await audio.evaluate(async element => { element.dataset.completionTest = 'same-player'; await element.play(); });
  await done().check();
  await select('Filter by completion').selectOption('undone');
  await expect(answer).toHaveValue('Keep my listening answer');
  await expect(audio).toHaveAttribute('data-completion-test', 'same-player');
  await page.waitForFunction(() => document.querySelector('audio')?.currentTime > .3);
  await audio.evaluate(element => element.pause());
  await page.getByRole('button', { name: 'Next test', exact: true }).click();
  await expect(select('Choose a listening test')).toHaveValue('listening-2');
  await expect(done()).not.toBeChecked();
  await expect(select('Filter by completion')).toHaveValue('undone');
  for (const [route, label] of [
    ['benchmark/reading-1', 'Done: Benchmark · Reading Test 1 · Skin Cancer'],
    ['benchmark/writing-1', 'Done: Benchmark · Medicine Writing Task 1'],
    ['benchmark/speaking', 'Done: Benchmark · GP consultation · Unexpected pregnancy'],
  ]) {
    await open(route, label); await expect(done()).not.toBeChecked(); await done().check();
  }
  await open('jahshan/listening', 'Done: Jahshan Listening · 3- Sample Test 1');
  await done().check();
  const listeningSet = select('Listening set');
  const initialSet = await listeningSet.inputValue();
  await page.getByRole('button', { name: 'Next test', exact: true }).click();
  await expect(done()).not.toBeChecked();
  await listeningSet.selectOption(initialSet); await expect(done()).toBeChecked();
  await open('jahshan/reading', 'Done: Jahshan Reading · 3- Sample Test 1');
  const readingAnswer = page.getByRole('combobox', { name: 'Part A · Question 1', exact: true });
  await readingAnswer.selectOption('D'); await done().check();
  await expect(readingAnswer).toHaveValue('D');
  await select('Reading test').selectOption('4'); await expect(done()).not.toBeChecked();
  await select('Filter by completion').selectOption('done');
  await page.getByRole('button', { name: 'Previous test', exact: true }).click();
  await expect(select('Reading test')).toHaveValue('3'); await expect(readingAnswer).toHaveValue('D');
  await page.locator('.collection-test-picker').screenshot({ path: 'tmp/collection-done-installed.png' });
  for (const skill of ['writing', 'speaking']) {
    await open(`jahshan/${skill}`, `Done: Jahshan ${skill === 'writing' ? 'Writing' : 'Speaking'} · Official sample 1`);
    await expect(done()).not.toBeChecked(); await done().check();
    await select('Choose a sample').selectOption('2'); await expect(done()).not.toBeChecked(); await done().check();
  }
  const completion = await page.evaluate(() => JSON.parse(localStorage.getItem('oet-file-completion-v1')));
  assert.equal(Object.keys(completion).length, 10);
  await switchTo(second.id);
  await open('benchmark/listening-1', 'Done: Benchmark · Listening Test 1');
  await expect(done()).not.toBeChecked(); await expect(page.getByRole('textbox', { name: 'Question 1', exact: true })).toHaveValue('');
  assert.equal(await page.evaluate(() => localStorage.getItem('oet-file-completion-v1')), null);
  await switchTo(first.id);
  await open('benchmark/listening-1', 'Done: Benchmark · Listening Test 1');
  await expect(done()).toBeChecked();
  await expect(page.getByRole('textbox', { name: 'Question 1', exact: true })).toHaveValue('Keep my listening answer');
  await page.reload();
  await open('benchmark/listening-1', 'Done: Benchmark · Listening Test 1');
  await expect(done()).toBeChecked();
  console.log(JSON.stringify({ gitCommit: build.gitCommit, allFourSkillsInBothCollections: true, perTestAndPerProfile: true, survivesReload: true, draftsPreserved: true, audioUninterrupted: true, completionFiltersAndNavigation: true, offlineWithoutSourceDrive: true, disposableProfile: true }));
} finally { await app.close(); }
