import { expect, test } from '@playwright/test';
import path from 'node:path';
import catalog from '../public/usmle-library/index.json' with { type: 'json' };

test('shared Telegram blocks work on the website without the desktop bridge', async ({ page }) => {
  const question = catalog.questions.find(q => q.sourceGroup === 'GENODODI Telegram folder' && q.options.length > 1 && q.questionImages.length)!;
  await page.goto('./#usmle');
  await page.getByRole('button', { name: '1 · Study files' }).click();
  await page.getByLabel('Question bank / source').selectOption(question.sourceId);
  await page.getByRole('button').filter({ hasText: `Block ${question.block} · Q${question.number} ` }).first().click();
  const selected = page.getByRole('article', { name: 'Selected study question' });
  await expect(selected).toContainText(question.prompt.slice(0, 70));
  await expect(selected.getByLabel('Printed answer and explanation')).toHaveCount(0);
  await selected.locator('.usmle-source-images summary').first().click();
  const image = selected.locator('img').first();
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(selected.getByRole('link', { name: 'Open complete original block PDF ↗' })).toHaveAttribute('href', /^https:\/\/github.com\/genododi\/OET\/releases\/download\/usmle-/);
  await selected.getByRole('radio').first().check();
  await selected.getByLabel('My revision notes').fill('Browser-local revision note');
  await selected.getByRole('button', { name: 'Reveal answer and explanation' }).click();
  await expect(selected.getByLabel('Printed answer and explanation')).toContainText(question.explanation.slice(0, 70));
  await page.reload();
  await page.getByRole('button', { name: '1 · Study files' }).click();
  await page.getByLabel('Question bank / source').selectOption(question.sourceId);
  await page.getByRole('button').filter({ hasText: `Block ${question.block} · Q${question.number} ` }).first().click();
  await expect(selected.getByLabel('My revision notes')).toHaveValue('Browser-local revision note');
  const originalOnly = catalog.resources.find(resource => resource.questionBoundaryReview)!;
  await page.getByLabel('Question bank / source').selectOption(originalOnly.sha256);
  await expect(page.getByRole('article', { name: 'Selected study question' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open complete original PDF ↗', exact: true })).toBeVisible();
});


test('previously local imported banks expose their question and answer images and source attribution', async ({ page }) => {
  await page.route(/^https:\/\/raw\.githubusercontent\.com\/genododi\/OET\/main\/shared-usmle-media\/[a-f0-9]{64}\.webp$/, async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)!;
    await route.fulfill({ path: path.join(process.cwd(), 'shared-usmle-media', name), contentType: 'image/webp' });
  });
  const question = catalog.questions.find(q => q.sourceGroup === 'Imported USMLE question library' && q.block && q.number && q.questionImages.length && q.answerImages.length)!;
  await page.goto('./#usmle');
  await page.getByRole('button', { name: '1 · Study files' }).click();
  await page.getByLabel('Question bank / source').selectOption(question.sourceId);
  await page.getByRole('button').filter({ hasText: `Block ${question.block} · Q${question.number} ` }).first().click();
  const selected = page.getByRole('article', { name: 'Selected study question' });
  await expect(selected).toContainText(question.prompt.slice(0, 70));
  await selected.locator('.usmle-source-images summary').first().click();
  await expect.poll(() => selected.locator('img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await selected.getByRole('radio').first().check();
  await selected.getByRole('button', { name: 'Reveal answer and explanation' }).click();
  const gallery = selected.getByLabel('Printed answer and explanation').locator('.usmle-source-images');
  await gallery.locator('summary').click();
  await expect.poll(() => gallery.locator('img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(gallery.locator('a').first()).toHaveAttribute('href', /^https:\/\/raw.githubusercontent.com\/genododi\/OET\/main\/shared-usmle-media\//);
  const open = catalog.questions.find(q => q.sourceOrigin === 'generated')!;
  await page.getByLabel('Question bank / source').selectOption(open.sourceId);
  await expect(selected).toContainText(open.sourceAttribution!);
  await expect(selected).toContainText(open.sourceLicense!);
  await expect(selected.getByRole('link', { name: 'Original source and licence ↗' })).toHaveAttribute('href', open.sourceUrl!);
});
