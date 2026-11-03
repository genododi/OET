// Exercises the real Electron application with a disposable profile directory.
import { _electron as electron } from 'playwright-core';
import { expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const data = process.env.OET_SMOKE_DATA || await fs.mkdtemp(path.join(os.tmpdir(), 'oet-mac-smoke-'));
const app = await electron.launch({
  ...(process.env.OET_SMOKE_EXECUTABLE ? { executablePath: process.env.OET_SMOKE_EXECUTABLE, args: [] } : { args: [path.join(root, 'desktop')] }),
  ...(!process.env.OET_SMOKE_EXECUTABLE && process.env.OET_SMOKE_DEV_EXECUTABLE ? { executablePath: process.env.OET_SMOKE_DEV_EXECUTABLE } : {}),
  env: { ...process.env, OET_DESKTOP_USER_DATA: data, ...(process.env.OET_SMOKE_USMLE === '1' ? { OET_DESKTOP_USMLE: path.join(os.homedir(), 'Library/Application Support/OET Study/usmle-library') } : {}), ...(!process.env.OET_SMOKE_EXECUTABLE ? { OET_DESKTOP_WEB: path.join(root, 'dist'), OET_DESKTOP_LIBRARY: '/Volumes/GENODODI/OET/Mac App/offline-library', OET_DESKTOP_AI: path.join(os.homedir(), 'Library/Application Support/OET Study/local-ai') } : {}) },
  timeout: 60000,
});
try {
  let page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Who is studying today?' }).waitFor();
  if (process.env.OET_SMOKE_EXECUTABLE) {
    const build = await page.evaluate(async () => (await window.oetDesktop.info()).build);
    assert.equal(build?.gitCommit, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), 'Installed app must run the current source commit');
    await page.getByText(`App source: ${build.gitCommit.slice(0, 7)}`, { exact: false }).waitFor();
  }
  let startupResult;
  await expect.poll(async () => {
    startupResult = await page.evaluate(async () => (await window.oetDesktop.info()).updates);
    return startupResult?.checking;
  }, { timeout: 30000 }).toBe(false);
  assert.equal(startupResult.checking, false);
  await page.getByText(startupResult.message, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Check again', exact: true }).waitFor();
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
  await page.waitForFunction(() => document.querySelector('audio')?.duration > 0, null, { timeout: 60000 });
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
  let importedOriginals = null;
  let suppliedPracticeVerified = false;
  if (process.env.OET_SMOKE_LIBRARY === '1') {
    const result = await page.evaluate(async () => {
      const catalog = await (await fetch('/OET/offline-library/catalog.json')).json();
      const file = catalog.files.find(file => file.format === 'pdf' && file.hasText);
      const original = await fetch(`/OET/${file.assetPath}`, { method: 'HEAD' });
      const text = await (await fetch(`/OET/${file.textPath}`)).json();
      return { count: catalog.files.length, bytes: Number(original.headers.get('content-length')), expected: file.bytes, sha: file.sha256, textSha: text.sourceSha256, text: text.text.length };
    });
    assert(result.count > 2000); assert.equal(result.bytes, result.expected);
    assert.equal(result.sha, result.textSha); assert(result.text > 0);
    importedOriginals = result.count;
    const collection=JSON.parse(await fs.readFile(path.join(root,'public/imported-resources/catalog.json'),'utf8')).files;
    let chosen;
    for(const file of collection.filter(file=>file.skills.includes('reading'))) {
      const sheet=JSON.parse(await fs.readFile(path.join(root,`public/material-practice/sheets/${file.sha256}.json`),'utf8'));
      const unit=sheet.units.find(unit=>unit.skills.includes('reading')&&unit.questions.some(question=>question.answer));
      if(unit) {chosen={file,unit};break;}
    }
    assert(chosen,'A source-backed reading practice paper must be available');
    await page.evaluate(id=>{location.hash=`#materials/${id}`;},chosen.file.id);
    await page.getByRole('group',{name:'Practice skill',exact:true}).getByRole('button',{name:'Reading',exact:true}).click();
    await page.getByRole('combobox',{name:'Task or part',exact:true}).selectOption(chosen.unit.id);
    await page.locator('.material-paper-question').first().waitFor();
    const question=chosen.unit.questions.find(question=>question.answer);
    const row=page.getByRole('article',{name:`Question ${question.number}`,exact:true});
    await row.getByRole('button',{name:`Show answer for Question ${question.number}`,exact:true}).click();
    await row.locator('.reading-revealed').waitFor();
    const audioFile=collection.find(file=>['mp3','m4a','ogg'].includes(file.format)&&fsSync.existsSync(path.join(root,`public/material-practice/transcripts/${file.sha256}.json`)));
    assert(audioFile,'A source-matched listening transcript must be available');
    await page.evaluate(id=>{location.hash=`#materials/${id}`;},audioFile.id);
    await page.getByRole('group',{name:'Practice skill',exact:true}).getByRole('button',{name:'Listening',exact:true}).click();
    await page.locator('audio').first().waitFor({state:'attached'});
    await page.waitForFunction(()=>document.querySelector('audio')?.duration>0,null,{timeout:60000});
    const transcript=await page.evaluate(async sha=>{const response=await fetch(`/OET/material-practice/transcripts/${sha}.json`);return response.json();},audioFile.sha256);
    assert.equal(transcript.sourceSha256,audioFile.sha256);assert(transcript.segments.length>0);
    suppliedPracticeVerified=true;
  }
  let privateUsmleVerified = false;
  if (process.env.OET_SMOKE_USMLE === '1') {
    await page.evaluate(() => { location.hash = '#usmle'; });
    await page.getByRole('heading', { name: 'Your USMLE study workspace' }).waitFor();
    const index = await page.evaluate(() => window.oetDesktop.usmleLibrary());
    assert(index.questions.filter(question => !question.reviewOnly).length >= 2180);
    assert(index.questions.filter(question => question.reviewOnly).length >= 7);
    assert(index.resources.filter(resource => resource.kind === 'pdf').length >= 22);
    assert.deepEqual(index, JSON.parse(await fs.readFile(path.join(os.homedir(), 'Library/Application Support/OET Study/usmle-library/index.json'), 'utf8')), 'The app must expose the complete current private index.');
    assert.equal(index.questions.find(question => question.block === 15 && question.number === 24).key, 'B');
    assert.equal(index.questions.find(question => question.block === 7 && question.number === 16).key, 'C');
    await page.getByRole('button', { name: '1 · Study files', exact: true }).click();
    const question = page.getByRole('article', { name: 'Selected study question' });
    await question.waitFor();
    await expect(question.getByLabel('Printed answer and explanation')).toHaveCount(0);
    await question.getByRole('radio').first().check();
    await question.getByRole('button', { name: '☆ Flag for review' }).click();
    await question.getByLabel('My revision notes').fill('Disposable profile revision note');
    await question.getByRole('button', { name: 'Reveal answer and explanation' }).click();
    await expect(question.getByLabel('Printed answer and explanation')).toBeVisible();
    await question.getByRole('button', { name: 'Hide answer', exact: true }).click();
    await expect(question.getByLabel('Printed answer and explanation')).toHaveCount(0);
    const images = question.locator('.usmle-source-images').first();
    await images.locator('summary').click();
    await expect.poll(() => images.locator('img').first().evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    const privateAssets = await page.evaluate(async index => {
      const pdf = index.resources.find(resource => resource.asset);
      const response = await fetch(`/OET/desktop/usmle/${pdf.asset}`, { method: 'HEAD' });
      const forbidden = await fetch('/OET/desktop/usmle/index.json');
      return { pdf: response.status, type: response.headers.get('content-type'), forbidden: forbidden.status };
    }, index);
    assert.deepEqual(privateAssets, { pdf: 200, type: 'application/pdf', forbidden: 404 });
    await page.reload();
    await page.getByRole('button', { name: '1 · Study files', exact: true }).click();
    await expect(page.getByLabel('My revision notes')).toHaveValue('Disposable profile revision note');
    await switchTo(second.id);
    assert.equal(await page.evaluate(() => localStorage.getItem('usmle-private-study-v1')), null);
    assert.equal((await page.evaluate(() => window.oetDesktop.usmleLibrary())).questions.length, index.questions.length);
    await switchTo(first.id);
    await page.evaluate(() => { location.hash = '#usmle'; });
    await page.getByRole('button', { name: /Step 1.*available questions/ }).click();
    await page.getByRole('radio', { name: /Custom Quiz/ }).check();
    await page.getByLabel('Number of questions').focus();
    await page.getByLabel('Number of questions').press('Home');
    await page.getByRole('button', { name: 'Start Quiz (1 questions, 30 min)' }).click();
    await page.getByRole('button', { name: 'Start 30-minute session' }).click();
    await expect(page.getByRole('button', { name: /Check answer/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Finish session', exact: true }).click();
    await expect(page.getByText('0/1', { exact: true })).toBeVisible();
    await expect(page.getByText('Unanswered (counted in total)', { exact: true })).toBeVisible();
    await expect(page.getByText('Estimated Score', { exact: true })).toHaveCount(0);
    await page.getByRole('heading', { name: 'Review every question' }).waitFor();
    await page.getByRole('button', { name: 'Back to USMLE', exact: true }).click();
    await page.getByRole('heading', { name: 'Review mistakes and flagged questions' }).waitFor();
    privateUsmleVerified = true;
    await page.getByRole('button', { name: '2 · Practise a block', exact: true }).click();
  }
  let aiVerified = false;
  if (process.env.OET_SMOKE_AI === '1') {
    const policySource = await fs.readFile(path.join(root, 'src/lib/oetMedicalCoach.ts'), 'utf8');
    const policy = policySource.match(/MEDICAL_COACH_POLICY = `([^`]+)`/s)?.[1];
    assert(policy, 'The actual Medicine coaching policy must be available.');
    const result = await page.evaluate(async policy => {
      const response = await fetch('/OET/desktop/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: policy }, { role: 'user', content: 'Synthetic OET writing case, not medical advice. Source notes: Chris Lee is referred for assessment of suspected asthma; no diagnosis is confirmed. Learner sentence: "Chris Lee has confirmed asthma." Give direct feedback on the change in meaning and one source-faithful replacement. Do not ask a question. Use fewer than 80 words.' }], max_tokens: 300, stream: false, careful: true }) });
      const data = await response.json(); return { ok: response.ok, reply: data.choices?.[0]?.message?.content, error: data.error };
    }, policy);
    assert(result.ok, result.error); assert(result.reply?.length > 20);
    assert.match(result.reply, /suspected|not confirmed|certainty/i, 'The offline model must preserve diagnostic uncertainty.');
    assert(!result.reply.includes('?'), 'Direct coaching must not append an unnecessary question.');
    aiVerified = true;
    console.log('Local AI response:', result.reply);
  }
  await fs.mkdir(path.join(root, 'output/playwright'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'output/playwright/macos-offline-workspace.png'), fullPage: false });
  console.log(JSON.stringify({ startupCheckFinishes: !startupResult.checking, startupState: startupResult.state, profilesIsolated: true, draftsSurviveReload: true, localAudioPlaysSeeksAndResumes: true, networkBlocked: true, localAiNeedsNoKey: aiVerified, importedOriginals, suppliedPracticeVerified, privateUsmleVerified, duration }));
} finally { await app.close(); }
