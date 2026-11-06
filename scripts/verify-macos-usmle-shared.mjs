// Read shared sources using disposable profiles. Never touch the learner's window.
import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.join(os.homedir(), 'Library/Application Support/OET Study/usmle-library');
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-shared-usmle-'));
const executable = process.env.OET_SMOKE_EXECUTABLE || path.join(os.homedir(), 'Applications/OET Study.app/Contents/MacOS/OET Study');
const raw = await fs.readFile('public/usmle-library/index.json');
const catalog = JSON.parse(raw);
const originalIndex = await fs.readFile(path.join(root, 'index.json'));
const app = await electron.launch({ executablePath: executable, args: [], timeout: 60000,
  env: { ...process.env, OET_DESKTOP_USER_DATA: data, OET_DESKTOP_USMLE: root,
    OET_DESKTOP_SOURCE: path.join(data, 'missing-drive'), OET_DESKTOP_SOURCE_LIBRARY: path.join(data, 'missing-source-cache') } });
try {
  let page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Who is studying today?' }).waitFor();
  const build = await page.evaluate(async () => (await window.oetDesktop.info()).build);
  assert.equal(build.gitCommit, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  assert.equal(build.sharedUsmleLibrary.catalogSha256, createHash('sha256').update(raw).digest('hex'));
  const first = await page.evaluate(() => window.oetDesktop.createProfile('USMLE first smoke learner'));
  const second = await page.evaluate(() => window.oetDesktop.createProfile('USMLE second smoke learner'));
  const switchTo = async id => {
    const opened = app.waitForEvent('window');
    void page.evaluate(id => window.oetDesktop.switchProfile(id), id).catch(() => {});
    page = await opened; await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Profiles & backups' }).waitFor();
    await app.evaluate(async ({ BrowserWindow }) => { for (const w of BrowserWindow.getAllWindows()) await w.webContents.session.enableNetworkEmulation({ offline: true }); });
    await page.addLocatorHandler(page.getByRole('button', { name: 'Close daily pearl' }), async target => { await target.click(); });
  };
  await switchTo(first.id);
  const readiness = await page.evaluate(async resources => {
    const results = [];
    for (const resource of resources) {
      const response = await fetch('/OET/desktop/usmle/originals/' + resource.sha256 + '.pdf', { headers: { Range: 'bytes=0-4' } });
      results.push({ status: response.status, magic: await response.text(), range: response.headers.get('content-range') });
    }
    return results;
  }, catalog.resources);
  for (let i = 0; i < readiness.length; i++) {
    assert.equal(readiness[i].status, 206); assert.equal(readiness[i].magic, '%PDF-');
    assert.equal(readiness[i].range, `bytes 0-4/${catalog.resources[i].size}`);
  }
  const shared = catalog.questions.find(q => q.options.length > 1 && q.questionImages.length);
  const local = JSON.parse(originalIndex).questions.find(q => q.id === shared.id);
  const openStudy = async () => {
    await page.evaluate(() => { location.hash = '#usmle'; });
    await page.getByRole('button', { name: '1 · Study files' }).click();
    await expect(page.getByLabel('Question bank / source')).toContainText(shared.sourceName);
    await page.getByLabel('Question bank / source').selectOption(shared.sourceId);
    await page.getByRole('button').filter({ hasText: `Block ${shared.block} · Q${shared.number} ` }).first().click();
    await expect(page.getByRole('article', { name: 'Selected study question' })).toContainText(shared.prompt.slice(0, 70));
  };
  await openStudy();
  await page.locator('.usmle-study-question .usmle-source-images summary').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('.usmle-study-question img')].some(image => image.naturalWidth > 0));
  await page.getByRole('radio').first().check();
  await page.getByLabel('My revision notes').fill('Disposable profile note only');
  await page.getByRole('button', { name: 'Reveal answer and explanation' }).click();
  await expect(page.getByLabel('Printed answer and explanation')).toBeVisible();
  await expect(page.getByLabel('Printed answer and explanation')).toContainText(local.explanation.slice(0, 70));
  const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('usmle-private-study-v1'))[id], shared.id);
  assert.equal(saved.note, 'Disposable profile note only'); assert.equal(saved.revealed, true);
  const viewerOpened = app.waitForEvent('window');
  await page.getByRole('link', { name: 'Open complete original block PDF ↗', exact: true }).click();
  const viewer = await viewerOpened; await viewer.waitForLoadState('domcontentloaded');
  assert.match(viewer.url(), /oet:\/\/study\/OET\/desktop\/usmle\/originals\/[a-f0-9]{64}\.pdf/);
  await viewer.close();
  const withheld = catalog.resources.find(resource => resource.questionBoundaryReview);
  if (withheld) {
    await page.getByLabel('Question bank / source').selectOption(withheld.sha256);
    await expect(page.getByText('The complete original is ready.', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open complete original PDF ↗', exact: true })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Selected study question' })).toHaveCount(0);
  }
  await switchTo(second.id); await openStudy();
  await expect(page.getByLabel('My revision notes')).toHaveValue('');
  assert.equal(await page.evaluate(() => localStorage.getItem('usmle-private-study-v1')), null);
  await switchTo(first.id); await openStudy();
  await expect(page.getByLabel('My revision notes')).toHaveValue('Disposable profile note only');
  await expect(page.getByLabel('Printed answer and explanation')).toBeVisible();
  await page.reload(); await openStudy();
  await expect(page.getByLabel('My revision notes')).toHaveValue('Disposable profile note only');
  await page.screenshot({ path: 'tmp/usmle-telegram/installed-shared-study.png', fullPage: false });
  assert.deepEqual(await fs.readFile(path.join(root, 'index.json')), originalIndex);
  console.log(JSON.stringify({ gitCommit: build.gitCommit, sharedOriginalsOffline: readiness.length,
    sharedAndExistingLocalQuestions: true, questionAndAnswerImages: true, originalViewer: true,
    uncertainBoundariesWithheld: !!withheld, isolatedProfiles: true, progressSurvivesReload: true,
    localQuestionIndexUnchanged: true, noSourceDriveOrInternetNeeded: true, disposableProfile: true }));
} finally { await app.close(); }
