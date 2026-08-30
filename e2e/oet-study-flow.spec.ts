import { expect, test } from '@playwright/test';

test('first-run diagnostic creates a Grade A plan', async ({ page }) => {
  await page.goto('./#planner');
  await page.getByLabel('writing baseline score').fill('300');
  await page.getByRole('button', { name: 'Generate Grade A plan' }).click();
  await expect(page.getByTestId('study-plan-results')).toContainText('Target 450+');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('oet-study-partner-study-plan'))).toContain('"targetScore":450');
});

test('command center launches a qualifying four-skill baseline', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start baseline session' }).click();
  await expect(page.getByRole('heading', { name: 'Grade A Baseline' })).toBeVisible();
  await expect(page.getByText('10 Listening + 10 Reading + one letter + two recorded role-plays')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start 115-minute session' })).toBeVisible();
  await expect(page.getByText('Listening audio is one-use in this session.')).toBeVisible();
  await page.getByRole('button', { name: 'Start 115-minute session' }).click();
  const playback = page.locator('.listening-player button');
  await expect(playback).toHaveText('▶ Play all audio once');
  await playback.click();
  await expect(playback).toBeDisabled();
  await expect(playback).toHaveText('Audio sequence playing…');
  await page.getByRole('button', { name: 'Next task' }).click();
  await expect(page.getByRole('heading', { name: 'Short break' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.locator('.listening-player button')).toBeDisabled();
  await expect(page.locator('.listening-player button')).toHaveText('Playback used');
});

test('command center launches the latest balanced daily challenge', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('New today · Stage 17')).toBeVisible();
  await page.getByRole('button', { name: 'Start Stage 17 challenge' }).click();
  await expect(page.getByRole('heading', { name: 'Daily Grade A Challenge · Stage 17' })).toBeVisible();
  await expect(page.getByText('One new advanced Medicine task in every OET sub-test')).toBeVisible();
  await expect(page.locator('.description').getByText(/Response-mode switching and proportionate boundaries/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start 60-minute session' })).toBeVisible();
  await page.getByRole('button', { name: 'Start 60-minute session' }).click();
  const playback = page.getByRole('button', {
    name: 'Play Question-matched listening clip once',
  });
  await playback.click();
  await expect(playback).toBeDisabled();
  await expect(playback).toHaveText('Audio playing…');
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
  await expect(page.getByText('1 task(s)')).toBeVisible();
  await page.getByRole('button', { name: /Start \d+-minute session/ }).click();
  await expect(page.locator('.session-timer')).toContainText(/\d+:\d{2}/);
  await context.setOffline(true);
  await page.getByLabel('Your letter draft').fill('Dear Dr Lee,\n\nI am writing to refer Mr Ali for urgent review of his persistent symptoms and current treatment. Please assess him and advise on ongoing management.\n\nYours sincerely');
  await page.getByRole('button', { name: 'Submit draft & review' }).click();
  await expect(page.getByTestId('offline-tutor-result')).toContainText('Works offline');
  await expect(page.getByTestId('offline-tutor-result')).toContainText('not an official OET score');
  await expect(page.getByTestId('offline-tutor-result')).toContainText('180-200 words');
});

test('catalog Speaking workload matches the available session time', async ({ page }) => {
  await page.goto('./#practice/speaking');
  await page.getByLabel('Search practice modules').fill('Anticoagulation Safety Role-Plays');
  await expect(page.getByText('2 tasks · 20 min')).toBeVisible();
  await page.getByRole('button', { name: 'Practise' }).click();
  await expect(page.getByText('2 task(s)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start 20-minute session' })).toBeVisible();
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

test('a recent mistake becomes the next best move and opens focused review', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oet-study-partner-progress',
      JSON.stringify({
        schemaVersion: 1,
        completed: [
          {
            id: 'seed-listening-attempt',
            kind: 'practice',
            title: 'Listening evidence practice',
            completedAt: new Date().toISOString(),
            durationMinutes: 20,
            review: {
              subtestScores: [
                {
                  subtest: 'listening',
                  percentScore: 0,
                  correct: 0,
                  total: 1,
                  practicePass: false,
                  examReady: false,
                  weakAreas: ['Listening: evidence discrimination'],
                },
              ],
              overallPercent: 0,
              overallPracticePass: false,
              overallExamReady: false,
              weakAreas: ['Listening: evidence discrimination'],
              taskReviews: [
                {
                  taskId: 'seed-lis-118',
                  subtest: 'listening',
                  passed: false,
                  scorePercent: 0,
                  summary: 'Missed the outcome-dependent exclusion evidence',
                },
              ],
            },
          },
        ],
      }),
    );
  });

  await page.goto('./');
  await expect(page.getByText('Correct 1 due mistake')).toBeVisible();
  await page.getByRole('button', { name: 'Start mistake review (1)' }).click();
  await expect(page.getByRole('heading', { name: 'Mistake Review' })).toBeVisible();
  await expect(page.getByText('1 due mistake')).toBeVisible();
});

test('dated Grade A plan adapts to a due mistake and launches it directly', async ({ page }) => {
  await page.addInitScript(() => {
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 42);
    localStorage.setItem(
      'oet-study-partner-study-plan',
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          schemaVersion: 1,
          targetScore: 450,
          examDate: examDate.toISOString().slice(0, 10),
          studyDaysPerWeek: 5,
          minutesPerDay: 60,
          baseline: { listening: 450, reading: 450, writing: 300, speaking: 450 },
          weakAreas: ['writing'],
          completedAt: new Date().toISOString(),
        },
        plan: null,
      }),
    );
    localStorage.setItem(
      'oet-study-partner-progress',
      JSON.stringify({
        schemaVersion: 1,
        completed: [
          {
            id: 'planner-listening-mistake',
            kind: 'practice',
            title: 'Listening evidence practice',
            completedAt: new Date().toISOString(),
            durationMinutes: 20,
            review: {
              subtestScores: [
                {
                  subtest: 'listening',
                  percentScore: 0,
                  correct: 0,
                  total: 1,
                  practicePass: false,
                  examReady: false,
                  weakAreas: ['Listening: evidence discrimination'],
                },
              ],
              overallPercent: 0,
              overallPracticePass: false,
              overallExamReady: false,
              weakAreas: ['Listening: evidence discrimination'],
              taskReviews: [
                {
                  taskId: 'planner-lis-118',
                  subtest: 'listening',
                  passed: false,
                  scorePercent: 0,
                  summary: 'Missed the outcome-dependent exclusion evidence',
                },
              ],
            },
          },
        ],
      }),
    );
  });

  await page.goto('./#planner');
  await expect(page.getByText(/Adapted from completed sessions · 1 correction due now/)).toBeVisible();
  await expect(page.getByText('Due mistake review')).toBeVisible();
  await page.getByRole('button', { name: 'Review now' }).click();
  await expect(page.getByRole('heading', { name: 'Mistake Review' })).toBeVisible();
});

test('readiness history targets the weakest Listening or Reading part', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oet-study-partner-progress',
      JSON.stringify({
        schemaVersion: 1,
        completed: [
          {
            id: 'part-precision-seed',
            kind: 'practice',
            title: 'Listening part evidence set',
            completedAt: new Date().toISOString(),
            durationMinutes: 20,
            review: {
              subtestScores: [
                {
                  subtest: 'listening',
                  percentScore: 33,
                  correct: 1,
                  total: 3,
                  practicePass: false,
                  examReady: false,
                  weakAreas: ['Listening Part C: viewpoint and implication'],
                },
              ],
              overallPercent: 33,
              overallPracticePass: false,
              overallExamReady: false,
              weakAreas: ['Listening Part C: viewpoint and implication'],
              taskReviews: [
                {
                  taskId: 'part-seed-lis-3',
                  subtest: 'listening',
                  passed: false,
                  scorePercent: 0,
                  summary: 'Missed the speaker viewpoint',
                },
                {
                  taskId: 'part-seed-lis-118',
                  subtest: 'listening',
                  passed: false,
                  scorePercent: 0,
                  summary: 'Missed the implication',
                },
                {
                  taskId: 'part-seed-lis-1',
                  subtest: 'listening',
                  passed: true,
                  scorePercent: 100,
                  summary: 'Correctly selected the short extract answer',
                },
              ],
            },
          },
        ],
      }),
    );
  });

  await page.goto('./');
  await expect(page.getByTestId('part-focus-target')).toContainText('Listening Part C: 0%');
  await page.getByRole('button', { name: 'Drill listening Part C' }).click();
  await expect(page.getByRole('heading', { name: 'Listening Part C Focus' })).toBeVisible();
  await expect(
    page.getByText('Track speaker attitude, inference and the evidence that qualifies a conclusion.'),
  ).toBeVisible();
});

test('the next-best-move button launches the weakest writing criterion', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oet-study-partner-progress',
      JSON.stringify({
        schemaVersion: 1,
        completed: [
          {
            id: 'writing-criterion-seed',
            kind: 'practice',
            title: 'Medicine referral practice',
            completedAt: new Date().toISOString(),
            durationMinutes: 45,
            review: {
              subtestScores: [
                {
                  subtest: 'listening',
                  percentScore: 92,
                  correct: 39,
                  total: 42,
                  practicePass: true,
                  examReady: true,
                  weakAreas: [],
                },
                {
                  subtest: 'reading',
                  percentScore: 92,
                  correct: 39,
                  total: 42,
                  practicePass: true,
                  examReady: true,
                  weakAreas: [],
                },
                {
                  subtest: 'writing',
                  percentScore: 62,
                  practicePass: false,
                  examReady: false,
                  weakAreas: ['Writing Content: purpose-critical facts omitted'],
                },
                {
                  subtest: 'speaking',
                  percentScore: 90,
                  practicePass: true,
                  examReady: true,
                  weakAreas: [],
                },
              ],
              overallPercent: 62,
              overallPracticePass: false,
              overallExamReady: false,
              weakAreas: ['Writing Content: purpose-critical facts omitted'],
              taskReviews: [
                {
                  taskId: 'criterion-seed-letter',
                  subtest: 'writing',
                  passed: false,
                  scorePercent: 62,
                  summary: 'Writing rubric 62%',
                  criteriaScores: [
                    { criterion: 'Purpose', scorePercent: 85 },
                    { criterion: 'Content', scorePercent: 35 },
                    { criterion: 'Conciseness & Clarity', scorePercent: 70 },
                    { criterion: 'Genre', scorePercent: 80 },
                    { criterion: 'Organisation', scorePercent: 75 },
                    { criterion: 'Language', scorePercent: 72 },
                  ],
                },
              ],
            },
          },
        ],
      }),
    );
  });

  await page.goto('./');
  await expect(page.getByTestId('productive-focus-target')).toContainText(
    'Writing · Content: 35%',
  );
  await expect(page.getByText('Repair Writing Content · 35%')).toBeVisible();
  await page.getByRole('button', { name: 'Start Writing Content focus' }).click();
  await expect(page.getByRole('heading', { name: 'Writing Content Focus' })).toBeVisible();
  await expect(
    page.getByText('Select and synthesise only the facts the recipient needs for safe next care.'),
  ).toBeVisible();
});
