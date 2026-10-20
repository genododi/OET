// Exercises the real Electron application with a disposable profile directory.
import { _electron as electron } from 'playwright-core';
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
  env: { ...process.env, OET_DESKTOP_USER_DATA: data, ...(!process.env.OET_SMOKE_EXECUTABLE ? { OET_DESKTOP_WEB: path.join(root, 'dist'), OET_DESKTOP_LIBRARY: '/Volumes/GENODODI/OET/Mac App/offline-library', OET_DESKTOP_AI: path.join(os.homedir(), 'Library/Application Support/OET Study/local-ai') } : {}) },
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
    await page.locator('.material-question-row').first().waitFor();
    const question=chosen.unit.questions.find(question=>question.answer);
    const row=page.getByRole('article',{name:`Question ${question.number}`,exact:true});
    await row.getByRole('button',{name:`Show answer for Question ${question.number}`,exact:true}).click();
    await row.locator('.material-printed-answer').waitFor();
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
  console.log(JSON.stringify({ profilesIsolated: true, draftsSurviveReload: true, localAudioPlaysSeeksAndResumes: true, networkBlocked: true, localAiNeedsNoKey: aiVerified, importedOriginals, suppliedPracticeVerified, duration }));
} finally { await app.close(); }
