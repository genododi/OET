import { expect, test } from '@playwright/test';

test('first-run diagnostic creates a Grade A plan', async ({ page }) => {
  await page.goto('./#planner');
  await page.getByLabel('writing baseline score').fill('300');
  await page.getByRole('button', { name: 'Generate Grade A plan' }).click();
  await expect(page.getByTestId('study-plan-results')).toContainText('Target 450+');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('oet-study-partner-study-plan'))).toContain('"targetScore":450');
});

test('guided start walks through a real Listening example and saves progress', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start my first walkthrough' }).click();
  await expect(page).toHaveURL(/#walkthrough\/listening-a$/);
  await expect(page.locator('audio')).toHaveAttribute('src', /audio\/real-listening\/source-sample-test-1.mp3$/);
  await page.getByLabel('My attempt and evidence').fill('heavy suitcase');
  await page.getByRole('button', { name: 'Show worked explanation' }).click();
  await expect(page.getByRole('region', { name: 'Worked explanation' })).toContainText('heavy suitcase');
  await page.getByRole('button', { name: /Mark complete & next lesson/ }).click();
  await expect(page).toHaveURL(/#walkthrough\/listening-b$/);
  await page.reload();
  await expect(page.getByText('1/8 completed')).toBeVisible();
  await page.goto('./#walkthrough/listening-a');
  await expect(page.getByLabel('My attempt and evidence')).toHaveValue('heavy suitcase');
});

test('older mixed sessions cannot play generated listening clips', async ({ page }) => {
  await page.goto('./#dashboard');
  await page.getByRole('button', { name: 'Start baseline session' }).click();
  await expect(page.getByRole('heading', { name: 'Continue with original listening audio' })).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(0);
  await page.getByRole('button', { name: /Real Audio Listening Test 1/ }).click();
  await expect(page.getByRole('button', { name: 'Start real listening test' })).toBeVisible();
});

test('resource search preserves link-only governance', async ({ page }) => {
  await page.goto('./#resources');
  await page.getByLabel('Search resources').fill('letter type');
  await expect(page.getByTestId('resource-grid')).toContainText('Writing Tasks by Letter Type');
  await expect(page.getByTestId('resource-grid')).toContainText('Link only');
  await expect(page.getByTestId('resource-grid').getByRole('link')).toHaveAttribute('href', /drive\.google\.com/);
});

test('private source index links mounted files through the local gateway', async ({ page }) => {
  await page.goto('./#resources');
  await page.getByRole('button', { name: /Private source index/ }).click();
  await page.getByLabel('Search private source index').fill('(1) OET Masterclass Reading Section Overview.mp4');
  await expect(page.getByText('1 indexed private files')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open local file' })).toHaveAttribute(
    'href',
    /^http:\/\/127\.0\.0\.1:4318\/file\?path=.*OET%20Masterclass%20Reading/,
  );
});

test('source learning map accounts for the folder and routes into practice', async ({ page }) => {
  await page.goto('./#resources');
  await expect(page.getByRole('heading', { name: 'Every file accounted for, every safe file mapped' })).toBeVisible();
  await expect(page.getByText('Files indexed + checksummed')).toBeVisible();
  await page.getByRole('button', { name: /Listening.*mapped source records/ }).click();
  await expect(page).toHaveURL(/#practice\/listening$/);
  await expect(page.getByRole('heading', { name: 'Official exam practice' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Real audio listening exams' })).toBeVisible();
  await expect(page.locator('audio[src*="question-matched"]')).toHaveCount(0);
});

test('real listening mock pairs the imported audio with its 42-question paper', async ({ page, request }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '3 · Timed tests', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Real audio listening exams' })).toBeVisible();
  await page.getByRole('button', { name: 'Start real test' }).first().click();
  await expect(page.getByRole('heading', { name: 'Real Audio Listening Test 1' })).toBeVisible();
  await expect(page.getByText('Part A · 11 min')).toBeVisible();
  await page.getByRole('button', { name: 'Start real listening test' }).click();
  await expect(page.getByRole('button', { name: /Play Real Audio Listening Test 1.*once/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Listening answer sheet' })).toHaveCount(0);
  await page.getByRole('button', { name: /Play Real Audio Listening Test 1.*once/ }).click();
  await expect(page.getByRole('region', { name: 'Listening answer sheet' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Part A' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('iframe[title="Real Audio Listening Test 1 question paper"]')).toBeVisible();

  const audioResponse = await request.head('./audio/real-listening/source-sample-test-1.mp3');
  const paperResponse = await request.head('./pdfs/books/oet-listening-sample-test-1.pdf');
  expect(audioResponse.ok()).toBeTruthy();
  expect(Number(audioResponse.headers()['content-length'])).toBeGreaterThan(10_000_000);
  expect(paperResponse.ok()).toBeTruthy();
});

test('timed writing session provides built-in feedback while offline', async ({ context, page }) => {
  await page.goto('./#drills/writing');
  await page.getByRole('button', { name: 'Practise' }).first().click();
  await expect(page.getByText('1 task(s)')).toBeVisible();
  await page.getByRole('button', { name: /Start \d+-minute session/ }).click();
  await expect(page.locator('.session-timer')).toContainText(/\d+:\d{2}/);
  await context.setOffline(true);
  await page.getByLabel('Your letter draft').fill('Dear Dr Lee,\n\nI am writing to refer Mr Ali for urgent review of his persistent symptoms and current treatment. Please assess him and advise on ongoing management.\n\nYours sincerely');
  await page.getByRole('button', { name: 'Submit draft & review' }).click();
  await expect(page.getByTestId('offline-tutor-result')).toContainText('Works offline');
  await expect(page.getByTestId('offline-tutor-result')).toContainText('not an official OET score');
  await expect(page.getByTestId('offline-tutor-result')).toContainText(/180[-–]200 words/);
});

test('catalog Speaking workload matches the available session time', async ({ page }) => {
  await page.goto('./#drills/speaking');
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
  await page.goto('./#drills/speaking');
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

  await page.goto('./#dashboard');
  await expect(page.getByText('Correct 1 due mistake')).toBeVisible();
  await page.getByRole('button', { name: 'Start mistake review (1)' }).click();
  await expect(page.getByRole('heading', { name: 'Continue with original listening audio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Choose another skill' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Continue with original listening audio' })).toBeVisible();
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

  await page.goto('./#dashboard');
  await expect(page.getByTestId('part-focus-target')).toContainText('Listening Part C: 0%');
  await page.getByRole('button', { name: 'Drill listening Part C' }).click();
  await expect(page.getByRole('heading', { name: 'Continue with original listening audio' })).toBeVisible();
  await page.getByRole('link', { name: 'Part C · Follow the argument' }).click();
  await expect(page.getByRole('heading', { name: 'Listening C · Follow the speaker’s reasoning' })).toBeVisible();
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

  await page.goto('./#dashboard');
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


test('official paper writing does not allow an early response or phase skip', async ({ page }) => {
  await page.goto('./#practice/writing');
  await page.getByRole('button', { name: 'Start writing sample 1' }).click();
  await page.getByLabel('I will write my answers on paper').uncheck();
  await page.getByRole('button', { name: 'Start timed writing' }).click();
  await expect(page.getByLabel('Your letter')).toBeDisabled();
  await expect(page.getByRole('button', { name: /Skip|Next phase/ })).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveAttribute('src', /sample-1-writing.pdf$/);
  await page.reload();
  await expect(page.getByLabel('Your letter')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Start timed writing' })).toHaveCount(0);
});

test('Jahshan collection maps the original sets and preserves missing-audio status', async ({ page }) => {
  await page.goto('./#jahshan');
  await expect(page.getByRole('heading', { name: 'Jahshan Collection', exact: true })).toBeVisible();
  await expect(page.getByText('Question page 39 · Answer page 49 in the Listening collection.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reading Jahshan OET Collection.pdf ↗' })).toHaveAttribute('href', /1592KOopEqQrhlvulCarZzWDkwDhwqmRz/);
  await page.getByLabel('Listening set').selectOption({ label: '8- Practice Test 4 — audio missing' });
  await expect(page.getByRole('alert')).toContainText('missing-audio notice');
  await expect(page.locator('audio')).toHaveCount(0);
  await page.getByLabel('My numbered answers, evidence and corrections').fill('Review the missing set as paper-only study.');
  await page.getByLabel('Listening set').selectOption({ label: '3- Sample Test 1' });
  await expect(page.getByLabel('My numbered answers, evidence and corrections')).toHaveValue('');
  await page.getByLabel('Listening set').selectOption({ label: '8- Practice Test 4 — audio missing' });
  await expect(page.getByLabel('My numbered answers, evidence and corrections')).toHaveValue('Review the missing set as paper-only study.');
});

test('Jahshan Reading resumes per-test answers and labels the shorter paper', async ({ page }) => {
  await page.goto('./#jahshan/reading');
  await expect(page.getByLabel('Reading test')).toHaveValue('3');
  await page.getByLabel('Part A · Question 1', { exact: true }).selectOption('D');
  await page.getByLabel('Reading test').selectOption('8');
  await expect(page.getByLabel('Part A · Question 1', { exact: true })).toHaveValue('');
  await expect(page.getByText(/shorter than a full 42-question/)).toBeVisible();
  await page.getByLabel('Part A · Question 1', { exact: true }).fill('A');
  await page.reload();
  await expect(page.getByLabel('Reading test')).toHaveValue('8');
  await expect(page.getByLabel('Part A · Question 1', { exact: true })).toHaveValue('A');
  await page.getByLabel('Reading test').selectOption('3');
  await expect(page.getByLabel('Part A · Question 1', { exact: true })).toHaveValue('D');
});

test('Jahshan reveals the selected blank and preserves my response across recording changes', async ({ page }) => {
  await page.goto('./#jahshan');
  await page.getByLabel('Extract 1 · Question 1', { exact: true }).fill('my first attempt');
  await page.getByRole('button', { name: 'Show answer for Extract 1 · Question 1', exact: true }).click();
  await expect(page.getByText('(a) (heavy) suitcase / case', { exact: true })).toBeVisible();
  await expect(page.getByText('(his/the) right leg', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Extract 1 · Question 1', { exact: true })).toHaveValue('my first attempt');
  await page.getByLabel('Recording', { exact: true }).selectOption({ label: '3-Part B.mp3' });
  await expect(page.getByText('(a) (heavy) suitcase / case', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show answer for Question 25', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View printed key · page 50' })).toBeVisible();
  await page.getByLabel('Recording', { exact: true }).selectOption({ label: '3-Part A.mp3' });
  await expect(page.getByLabel('Extract 1 · Question 1', { exact: true })).toHaveValue('my first attempt');
  await page.reload();
  await expect(page.getByLabel('Extract 1 · Question 1', { exact: true })).toHaveValue('my first attempt');
});
