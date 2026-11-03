const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { englishLessons } from '../dist/data/english.js';
import { computerLessons } from '../dist/data/computer.js';
import { cultureLessons } from '../dist/data/culture.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qa = path.join(project, 'qa');
await fs.mkdir(qa, { recursive: true });
const report = { checks: [], pageErrors: [], consoleErrors: [], screenshots: [], physicalDevice: false };
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const all = [...englishLessons, ...computerLessons, ...cultureLessons];
const origin = process.env.TEST_URL || 'http://localhost:3000';
const storage = page => page.evaluate(() => JSON.parse(localStorage.getItem('learn-everyday-v1')));
function monitor(page, name) {
  page.on('pageerror', error => report.pageErrors.push({ page: name, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ page: name, message: message.text() }); });
}
async function check(name, action) {
  try { await action(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, passed: false, message: error.message }); console.error('FAIL', name, error.message); throw error; }
}
async function navigate(page, route) {
  await page.evaluate(route => { location.hash = route; }, route);
  await page.waitForFunction(route => location.hash.slice(1) === route && document.querySelector('main'), route);
  await page.waitForTimeout(60);
}
async function closeModal(page) { await page.locator('#modal [data-action=close-modal]').click(); await page.locator('#modal').waitFor({ state: 'hidden' }); }
async function assertNoOverflow(page, name) {
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  assert.ok(sizes.page <= sizes.viewport + 1, `${name} overflows horizontally: ${JSON.stringify(sizes)}`);
}
async function answerQuestion(page, question, correct = true) {
  assert.equal(await page.locator('#quiz-form .quiz-submit').count(), 0, 'The verification button must be removed');
  assert.ok(!(await page.locator('#quiz-form').innerText()).includes('تحقق من إجابتي'));
  if (question.audio || question.type === 'listening') await page.locator('#modal [data-action=speak]').click();
  if (question.type === 'order') {
    const first = page.locator('.order-tokens .word-token').first();
    await first.click();
    assert.equal(await page.locator('.answer-feedback').count(), 0, 'Partial ordering must not be graded');
    await page.locator('#order-answer .word-token').first().click();
    assert.equal(await page.locator('#order-answer .word-token').count(), 0, 'A selected word can be removed before completion');
    for (const word of question.answer.split(/\s+/)) {
      const tokens = page.locator('.order-tokens .word-token:not(.used)');
      const index = await tokens.evaluateAll((elements, word) => elements.findIndex(element => element.textContent === word), word);
      assert.ok(index >= 0, `No order token for ${word}`);
      await tokens.nth(index).click();
    }
  } else if (question.options?.length || question.type === 'boolean') {
    const inputs = page.locator('#quiz-form input[type=radio]');
    const index = await inputs.evaluateAll((elements, args) => elements.findIndex(element => args.correct ? element.value === args.answer : element.value !== args.answer), { answer: question.answer, correct });
    assert.ok(index >= 0, `No option for ${question.answer}`);
    await page.locator('.quiz-options label').nth(index).click();
  } else {
    const input = page.locator('#quiz-form input[name=answer]');
    await input.fill(correct ? String(question.answer) : 'incorrect answer');
    assert.equal(await page.locator('.answer-feedback').count(), 0, 'Typing must not be graded before submission');
    await input.press('Enter');
  }
  await page.locator(`.answer-feedback.${correct ? 'correct' : 'incorrect'}`).waitFor();
  if (!correct) assert.match(await page.locator('.answer-feedback').textContent(), /الإجابة الصحيحة/);
  await page.locator('#quiz-form').evaluate(form => { const input = form.querySelector('input[name=answer]'); input?.dispatchEvent(new Event('change', { bubbles: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  assert.equal(await page.locator('.answer-feedback').count(), 1, 'Duplicate answer events must not duplicate feedback');
  await page.locator('#modal [data-action=quiz-next]').click();
}
async function finishLessonQuiz(page, lesson, pass = true) {
  await page.locator(`[data-action=quiz][data-id="${lesson.id}"]`).click();
  for (const question of lesson.questions) await answerQuestion(page, question, pass);
  await page.locator('.quiz-result').waitFor();
  const saved = await storage(page);
  assert.equal(saved.history.at(-1).score, pass ? 100 : 0);
  assert.equal(saved.history.at(-1).total, lesson.questions.length, 'Duplicate submissions must not change the test size');
  assert.equal(saved.history.at(-1).answers.length, lesson.questions.length, 'Each question must be recorded once');
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const page = await desktop.newPage(); monitor(page, 'desktop');
  await page.goto(origin);
  await page.locator('.hero').waitFor();
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(qa, 'glass-desktop.png'), fullPage: true }); report.screenshots.push('glass-desktop.png');

  await check('desktop navigation, all routes and horizontal layout', async () => {
    for (const route of ['english', 'pronunciation', 'tests', 'computer', 'culture', 'favorites', 'profile', 'home']) {
      await page.locator(`.sidebar nav a[href="#${route}"]`).click();
      await page.waitForFunction(route => location.hash === '#' + route, route);
      await assertNoOverflow(page, route);
      assert.ok(await page.locator('main h1').textContent());
    }
  });
  await check('notifications, help, install instructions and daily goal', async () => {
    await page.locator('[data-action=notifications]').click(); assert.match(await page.locator('#modal').innerText(), /آخر نشاط/); await closeModal(page);
    await page.locator('[data-action=help]').click(); assert.match(await page.locator('#modal').innerText(), /لا يوجد حد يومي/);
    await page.locator('#modal [data-action=install]').click(); assert.match(await page.locator('#modal').innerText(), /Safari/); await closeModal(page);
    await page.locator('[data-action=goal]').click(); await page.locator('[data-action=save-goal][data-value="30"]').click(); assert.equal((await storage(page)).goal, 30);
  });
  await check('locked lesson, locked next button and unknown lesson', async () => {
    await navigate(page, 'english');
    await page.locator(`.curriculum-row[data-id="${englishLessons[1].id}"]`).click(); assert.equal(await page.evaluate(() => location.hash), '#english');
    await navigate(page, 'lesson/' + englishLessons[1].id); assert.match(await page.locator('main h1').textContent(), /الخطوة السابقة/);
    await page.locator('[data-action=continue]').click(); await page.locator('.lesson-header').waitFor();
    await page.locator('.lesson-pagination [data-id="' + englishLessons[1].id + '"]').click(); assert.equal(await page.evaluate(() => location.hash), '#lesson/' + englishLessons[0].id);
    await navigate(page, 'lesson/not-found'); assert.match(await page.locator('main').innerText(), /غير موجود/);
  });
  await check('favorites and listening buttons invoke speech synthesis', async () => {
    await navigate(page, 'lesson/' + englishLessons[0].id);
    await page.evaluate(() => { window.qaUtterances = []; const original = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = utterance => { window.qaUtterances.push(utterance.text); original(utterance); }; });
    const word = englishLessons[0].vocabulary[0];
    await page.locator('.vocab-card [data-action=favorite]').first().click(); assert.ok((await storage(page)).favorites.includes(word.word));
    await page.locator('.vocab-card [data-action=speak]').first().click(); assert.ok((await page.evaluate(() => window.qaUtterances)).includes(word.word));
    await navigate(page, 'favorites'); assert.equal(await page.locator('.vocab-card').count(), 1);
    await page.locator('.vocab-card [data-action=favorite]').click(); assert.equal((await storage(page)).favorites.length, 0);
  });
  await check('failed quiz explains errors, creates review and awards no points', async () => {
    await navigate(page, 'lesson/' + englishLessons[0].id); await finishLessonQuiz(page, englishLessons[0], false);
    const saved = await storage(page); assert.equal(saved.xp, 0); assert.ok(saved.review.includes(englishLessons[0].id));
    assert.equal(await page.locator('.answer-review.incorrect').count(), englishLessons[0].questions.length);
    await page.locator('[data-action=review-lesson]').click();
  });
  await check('first English lesson passes all quiz types and unlocks next lesson', async () => {
    await finishLessonQuiz(page, englishLessons[0]);
    const saved = await storage(page); assert.equal(saved.xp, 50); assert.equal(saved.completed[englishLessons[0].id].score, 100); assert.ok(!saved.review.includes(englishLessons[0].id));
    await page.locator('[data-action=next-after-quiz]').click(); await page.waitForFunction(title => document.querySelector('.lesson-header h1')?.textContent === title, englishLessons[1].title);
    assert.equal(await page.locator('.lesson-header h1').textContent(), englishLessons[1].title);
    await page.locator('.lesson-pagination [data-id="' + englishLessons[0].id + '"]').click(); await page.reload(); await page.locator('.success-tag').waitFor();
    assert.equal((await storage(page)).xp, 50);
  });
  await check('replaying a completed quiz preserves XP and history', async () => {
    await finishLessonQuiz(page, englishLessons[0]); assert.equal((await storage(page)).xp, 50); await closeModal(page);
  });
  await check('sequential progression has no daily cap and word ordering works', async () => {
    const firstOrder = englishLessons.findIndex(lesson => lesson.questions.some(question => question.type === 'order'));
    for (let index = 1; index <= firstOrder; index++) {
      await navigate(page, 'lesson/' + englishLessons[index].id); await finishLessonQuiz(page, englishLessons[index]); await closeModal(page);
    }
    const saved = await storage(page); assert.equal(Object.keys(saved.completed).length, firstOrder + 1); assert.equal(saved.xp, (firstOrder + 1) * 50);
  });
  await check('search finds English vocabulary, computer topics and empty state', async () => {
    for (const query of ['apple', 'Excel', 'no-results-zzzz']) {
      await page.locator('#search-form input').fill(query); await page.locator('#search-form input').press('Enter');
      await page.waitForFunction(q => location.hash.includes(encodeURIComponent(q)) && document.querySelector('main h1')?.textContent.includes(q), query);
      if (query === 'no-results-zzzz') assert.match(await page.locator('main').innerText(), /لم نجد/);
      else assert.ok(await page.locator('.vocab-card,.curriculum-row').count());
      await assertNoOverflow(page, 'search');
    }
  });
  await check('profile updates name, exports backup and opens quiz history', async () => {
    await navigate(page, 'profile'); await page.locator('[data-action=edit-name]').click(); await page.locator('#learner-name').fill('نور'); await page.locator('#name-form button').click();
    assert.equal((await storage(page)).name, 'نور');
    const downloadPromise = page.waitForEvent('download'); await page.locator('[data-action=export]').click(); const download = await downloadPromise;
    const downloadPath = await download.path(); const backup = JSON.parse(await fs.readFile(downloadPath, 'utf8')); assert.equal(backup.name, 'نور'); assert.ok(Object.keys(backup.completed).length >= 8);
    await page.locator('[data-action=history]').first().click(); assert.ok(await page.locator('#modal .answer-review').count()); await closeModal(page);
    await page.reload(); await page.locator('.profile-header h2').waitFor(); assert.equal(await page.locator('.profile-header h2').textContent(), 'نور');
  });
  await check('backup import previews before replacing current state', async () => {
    const backup = await storage(page); backup.name = 'نور المستعادة';
    await page.locator('#import-file').setInputFiles({ name: 'learning.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.locator('#modal [data-action=confirm-import]').waitFor(); assert.equal((await storage(page)).name, 'نور');
    await page.locator('#modal [data-action=confirm-import]').click(); assert.equal((await storage(page)).name, 'نور المستعادة');
  });
  await check('computer and culture quizzes open directly without a practical checkbox', async () => {
    for (const lesson of [computerLessons[0], cultureLessons[0]]) {
      await navigate(page, 'lesson/' + lesson.id); await page.locator('.lesson-header').waitFor(); assert.equal(await page.locator('#practice-done').count(), 0);
      await finishLessonQuiz(page, lesson); await closeModal(page);
    }
  });
  await check('placement opens starts and cancels without granting a level', async () => {
    await navigate(page, 'tests'); await page.locator('[data-action=placement]').click(); assert.match(await page.locator('#modal').innerText(), /٩٠/);
    await page.locator('[data-action=start-placement]').click(); await page.locator('#quiz-form').waitFor(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal').isVisible(), false); assert.deepEqual((await storage(page)).placementPassed, []);
  });
  await check('listening, review quizzes and pronunciation practice open correctly', async () => {
    for (const action of ['listening-quiz', 'review-quiz']) { await page.locator(`[data-action=${action}]`).click(); await page.locator('#quiz-form').waitFor(); await closeModal(page); }
    await page.locator('[data-action=unit-quiz]').last().click(); assert.match(await page.locator('#toast').textContent(), /أكمل دروس/);
    await navigate(page, 'pronunciation'); assert.ok(await page.locator('.pronunciation-card').count());
    await page.locator('#practice-form input').fill('Please open the book.'); await page.locator('#practice-form button').click(); assert.equal(await page.locator('#free-speech .speech-target').textContent(), 'Please open the book.');
    await page.evaluate(() => { window.qaUtterances = []; speechSynthesis.speak = utterance => { window.qaUtterances.push(utterance.text); }; });
    await page.locator('#free-speech [data-audio=slow]').click(); await page.locator('#free-speech [data-audio=stop]').click(); assert.match(await page.locator('#free-speech .audio-status').textContent(), /إيقاف/);
    assert.match(await page.locator('#free-speech .speech-disclaimer').textContent(), /لا تقيس مخارج الحروف/);
    await page.locator('[data-action=sound-guide]').first().click(); await page.locator('#modal .speech-practice').waitFor(); await closeModal(page);
  });
  await check('PWA caches complete content and reloads lessons while offline', async () => {
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 10000 });
    await desktop.setOffline(true); await page.reload(); await page.locator('main').waitFor();
    await navigate(page, 'english'); assert.equal(await page.locator('.curriculum-row').count(), englishLessons.length);
    await navigate(page, 'lesson/' + englishLessons[0].id); assert.equal(await page.locator('.lesson-header h1').textContent(), englishLessons[0].title);
    await desktop.setOffline(false);
  });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const phone = await mobile.newPage(); monitor(phone, 'mobile'); await phone.goto(origin); await phone.locator('.hero').waitFor(); await phone.evaluate(async () => { await document.fonts.ready; }); await phone.waitForTimeout(400);
  await phone.screenshot({ path: path.join(qa, 'glass-mobile.png'), fullPage: true }); report.screenshots.push('glass-mobile.png');
  await check('mobile bottom navigation, sidebar overlay and all route layouts', async () => {
    for (const route of ['english', 'pronunciation', 'tests', 'profile', 'home']) {
      await phone.locator(`.mobile-bottom a[href="#${route}"]`).click(); await phone.waitForFunction(route => location.hash === '#' + route, route); await assertNoOverflow(phone, 'mobile ' + route);
    }
    for (const route of ['computer', 'culture', 'favorites', 'home']) {
      await phone.locator('button.mobile-menu').click(); await phone.locator('.sidebar').waitFor({ state: 'visible' });
      assert.equal(await phone.evaluate(() => document.body.classList.contains('menu-open')), true);
      await phone.locator(`.sidebar nav a[href="#${route}"]`).click(); await phone.waitForFunction(route => location.hash === '#' + route, route);
      assert.equal(await phone.evaluate(() => document.body.classList.contains('menu-open')), false); await assertNoOverflow(phone, 'mobile sidebar ' + route);
    }
    await phone.locator('button.mobile-menu').click(); await phone.locator('.mobile-overlay').click({ position: { x: 10, y: 300 } }); assert.equal(await phone.evaluate(() => document.body.classList.contains('menu-open')), false);
  });
  await check('mobile lesson and quiz remain readable without horizontal overflow', async () => {
    await navigate(phone, 'lesson/' + englishLessons[0].id); await assertNoOverflow(phone, 'mobile lesson');
    await phone.locator('[data-action=quiz]').click(); await assertNoOverflow(phone, 'mobile quiz');
    assert.ok((await phone.locator('#modal').boundingBox()).width <= 390); await closeModal(phone);
  });
  report.browser = await browser.version(); report.webkitAvailable = await fs.access(webkit.executablePath()).then(() => true, () => false);
  assert.deepEqual(report.pageErrors, []);
} catch (error) { report.fatal = error.stack; process.exitCode = 1; }
finally { await fs.writeFile(path.join(qa, 'browser-report.json'), JSON.stringify(report, null, 2)); await browser.close(); console.log(JSON.stringify({ checks: report.checks.length, passed: report.checks.filter(check => check.passed).length, pageErrors: report.pageErrors, fatal: report.fatal || null })); }
