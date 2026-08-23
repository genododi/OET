import { expect, test } from '@playwright/test';

test('first-run diagnostic creates a Grade A plan', async ({ page }) => {
  await page.goto('./#planner');
  await page.getByLabel('writing baseline score').fill('300');
  await page.getByRole('button', { name: 'Generate Grade A plan' }).click();
  await expect(page.getByTestId('study-plan-results')).toContainText('Target 450+');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('oet-study-partner-study-plan'))).toContain('"targetScore":450');
});

test('resource search preserves link-only governance', async ({ page }) => {
  await page.goto('./#resources');
  await page.getByLabel('Search resources').fill('letter type');
  await expect(page.getByTestId('resource-grid')).toContainText('Writing Tasks by Letter Type');
  await expect(page.getByTestId('resource-grid')).toContainText('Link only');
  await expect(page.getByTestId('resource-grid').getByRole('link')).toHaveAttribute('href', /drive\.google\.com/);
});

test('timed writing session provides built-in feedback while offline', async ({ context, page }) => {
  await page.goto('./#practice/writing');
  await page.getByRole('button', { name: 'Practise' }).first().click();
  await page.getByRole('button', { name: /Start \d+-minute session/ }).click();
  await expect(page.locator('.session-timer')).toContainText(/\d+:\d{2}/);
  await context.setOffline(true);
  await page.getByLabel('Your letter draft').fill('Dear Dr Lee,\n\nI am writing to refer Mr Ali for urgent review of his persistent symptoms and current treatment. Please assess him and advise on ongoing management.\n\nYours sincerely');
  await page.getByRole('button', { name: 'Submit draft & review' }).click();
  await expect(page.getByTestId('offline-tutor-result')).toContainText('Works offline');
  await expect(page.getByTestId('offline-tutor-result')).toContainText('not an official OET score');
});

test('speaking text fallback produces a review without microphone access', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
    });
  });
  await page.goto('./#practice/speaking');
  await page.getByRole('button', { name: 'Practise' }).first().click();
  await page.getByRole('button', { name: /Start \d+-minute session/ }).click();
  await page.getByRole('button', { name: '● Record response' }).click();
  await page.getByLabel('Type your spoken response').fill('I understand that you are worried. I will explain the treatment in plain language, check your understanding, and tell you when to seek urgent help. Does that make sense?');
  await page.getByRole('button', { name: 'Evaluate text' }).click();
  await expect(page.getByText('Speaking practice review')).toBeVisible();
  await expect(page.getByTestId('offline-tutor-result')).toContainText('Typed transcripts');
});
