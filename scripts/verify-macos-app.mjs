// Exercises the real Electron application with a disposable profile directory.
import { _electron as electron } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const root = process.cwd();
const data = process.env.OET_SMOKE_DATA || await fs.mkdtemp(path.join(os.tmpdir(), 'oet-mac-smoke-'));
const app = await electron.launch({
  ...(process.env.OET_SMOKE_EXECUTABLE ? { executablePath: process.env.OET_SMOKE_EXECUTABLE, args: [] } : { args: [path.join(root, 'desktop')] }),
  env: { ...process.env, OET_DESKTOP_USER_DATA: data, ...(!process.env.OET_SMOKE_EXECUTABLE ? { OET_DESKTOP_WEB: path.join(root, 'dist'), OET_DESKTOP_LIBRARY: '/Volumes/GENODODI/OET/Mac App/offline-library', OET_DESKTOP_AI: '/Volumes/GENODODI/OET/Mac App/local-ai' } : {}) },
  timeout: 60000,
});
try {
  let page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Who is studying today?' }).waitFor();
  const first = await page.evaluate(() => window.oetDesktop.createProfile('First learner'));
  const second = await page.evaluate(() => window.oetDesktop.createProfile('Second learner'));
  const switchTo = async id => {
    const opened = app.waitForEvent('window');
    void page.evaluate(id => window.oetDesktop.switchProfile(id), id).catch(() => {});
    page = await opened; await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Profiles & backups' }).waitFor();
  };
  await switchTo(first.id);
  await page.evaluate(() => { localStorage.setItem('oet-smoke-answer', 'First learner draft'); location.hash = '#jahshan/listening'; });
  const audio = page.locator('audio').first();
  await audio.waitFor({ state: 'attached' });
  await page.waitForFunction(() => document.querySelector('audio')?.duration > 0, { timeout: 60000 });
  const duration = await audio.evaluate(el => el.duration);
  assert(duration > 60);
  const played = await audio.evaluate(async el => { await el.play(); return !el.paused; }); assert.equal(played, true);
  await page.waitForFunction(() => document.querySelector('audio')?.currentTime > .2);
  await audio.evaluate(el => { el.pause(); el.currentTime = 60; });
  await page.waitForFunction(() => Math.abs(document.querySelector('audio').currentTime - 60) < .5);
  await audio.evaluate(async el => { await el.play(); });
  await page.waitForFunction(() => document.querySelector('audio')?.currentTime > 60.2);
  await audio.evaluate(el => el.pause());
  const networkBlocked = await page.evaluate(async () => { try { await fetch('https://example.com'); return false; } catch { return true; } }); assert(networkBlocked);
  await switchTo(second.id);
  assert.equal(await page.evaluate(() => localStorage.getItem('oet-smoke-answer')), null);
  await page.evaluate(() => localStorage.setItem('oet-smoke-answer', 'Second learner draft'));
  await switchTo(first.id);
  assert.equal(await page.evaluate(() => localStorage.getItem('oet-smoke-answer')), 'First learner draft');
  await page.reload();
  assert.equal(await page.evaluate(() => localStorage.getItem('oet-smoke-answer')), 'First learner draft');
  await page.getByRole('heading', { name: 'Start here. One step at a time.' }).waitFor();
  let aiVerified = false;
  if (process.env.OET_SMOKE_AI === '1') {
    const result = await page.evaluate(async () => {
      const response = await fetch('/OET/desktop/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'You are an OET English writing coach. Give concise language guidance.' }, { role: 'user', content: 'Give two short tips for an OET referral-letter opening. Use fewer than 60 words.' }], max_tokens: 180, stream: false }) });
      const data = await response.json(); return { ok: response.ok, reply: data.choices?.[0]?.message?.content, error: data.error };
    });
    assert(result.ok, result.error); assert(result.reply?.length > 20); aiVerified = true;
    console.log('Local AI response:', result.reply);
  }
  await fs.mkdir(path.join(root, 'output/playwright'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'output/playwright/macos-offline-workspace.png'), fullPage: false });
  console.log(JSON.stringify({ profilesIsolated: true, draftsSurviveReload: true, localAudioPlaysSeeksAndResumes: true, networkBlocked: true, localAiNeedsNoKey: aiVerified, duration }));
} finally { await app.close(); }
