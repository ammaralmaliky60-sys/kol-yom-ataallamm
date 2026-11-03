import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshState, loadState, saveState, completeLesson, recordQuiz, toggleFavorite,
} from '../dist/modules/store.js';
import {
  normalizeAnswer, gradeAnswer, isUnlocked, nextLesson, currentLevel, progressFor, getReviewWords,
} from '../dist/modules/engine.js';

let saved = new Map();
beforeEach(() => {
  saved = new Map();
  globalThis.localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => { saved.set(key, String(value)); },
  };
});
const key = 'learn-everyday-v1';
const lessons = [
  { id: 'en-1', track: 'english', level: 'A1', vocabulary: [{ word: 'apple', meaning: 'تفاحة' }] },
  { id: 'pc-1', track: 'computer', level: 'أساسي' },
  { id: 'cu-1', track: 'culture', level: 'أساسي' },
  { id: 'en-2', track: 'english', level: 'A1', vocabulary: [{ word: 'book', meaning: 'كتاب' }] },
  { id: 'pc-2', track: 'computer', level: 'أساسي' },
  { id: 'en-3', track: 'english', level: 'A2' },
  { id: 'en-4', track: 'english', level: 'A2' },
  { id: 'en-5', track: 'english', level: 'B1' },
  { id: 'en-6', track: 'english', level: 'C2' },
];
const byId = id => lessons.find(lesson => lesson.id === id);

test('new learners can start each track but cannot skip its prerequisites', () => {
  const state = freshState();
  assert.equal(isUnlocked(byId('en-1'), lessons, state), true);
  assert.equal(isUnlocked(byId('pc-1'), lessons, state), true);
  assert.equal(isUnlocked(byId('cu-1'), lessons, state), true);
  for (const id of ['en-2', 'en-3', 'en-4', 'en-5', 'en-6', 'pc-2']) {
    assert.equal(isUnlocked(byId(id), lessons, state), false, `${id} must be locked`);
  }
  completeLesson(state, byId('en-1'), 75);
  assert.equal(isUnlocked(byId('en-2'), lessons, state), true);
  assert.equal(isUnlocked(byId('en-3'), lessons, state), false);
  assert.equal(isUnlocked(byId('pc-2'), lessons, state), false);
});

test('a passed placement assessment waives its assessed level but not later levels', () => {
  const state = freshState();
  state.placementPassed.push('A1');
  assert.equal(isUnlocked(byId('en-2'), lessons, state), true);
  assert.equal(isUnlocked(byId('en-3'), lessons, state), true);
  assert.equal(isUnlocked(byId('en-4'), lessons, state), false);
  assert.equal(isUnlocked(byId('en-5'), lessons, state), false);
  assert.equal(isUnlocked(byId('en-6'), lessons, state), false);
  assert.equal(isUnlocked(byId('pc-2'), lessons, state), false);
});

test('a completed lesson remains available to review', () => {
  const state = freshState();
  state.completed['en-3'] = { score: 100, date: '2026-11-03' };
  assert.equal(isUnlocked(byId('en-3'), lessons, state), true);
});

test('continuation and displayed level advance beyond levels passed by assessment', () => {
  const state = freshState();
  state.placementPassed.push('A1');
  assert.equal(nextLesson(lessons, state).id, 'en-3');
  assert.equal(currentLevel(lessons, state), 'A2');
  assert.equal(nextLesson(lessons, state, 'computer').id, 'pc-1');
  state.placementPassed.push('A2');
  assert.equal(nextLesson(lessons, state).id, 'en-5');
  assert.equal(currentLevel(lessons, state), 'B1');
  // Assessed lessons remain available for voluntary review.
  assert.equal(isUnlocked(byId('en-1'), lessons, state), true);
  assert.equal(isUnlocked(byId('en-2'), lessons, state), true);
});

test('finishing all lessons retains the highest level and suggests the final lesson for review', () => {
  const state = freshState();
  for (const lesson of lessons) completeLesson(state, lesson, 100);
  assert.equal(currentLevel(lessons, state), 'C2');
  assert.equal(nextLesson(lessons, state).id, 'en-6');
  assert.equal(nextLesson(lessons, state, 'computer').id, 'pc-2');
  assert.equal(currentLevel([], freshState()), 'A1');
  assert.equal(nextLesson([], freshState()), undefined);
});

test('assessing the whole English curriculum does not reset the displayed level to A1', () => {
  const state = freshState();
  state.placementPassed = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  assert.equal(currentLevel(lessons, state), 'C2');
});

test('grading tolerates formatting and declared alternatives, but rejects different answers', () => {
  assert.equal(normalizeAnswer('  Hello, WORLD!  '), 'hello world');
  assert.equal(normalizeAnswer('أَحْمَد'), 'احمد');
  assert.equal(gradeAnswer({ answer: 'I’m ready.' }, "I'm ready"), true);
  assert.equal(gradeAnswer({ answer: 'colour', acceptedAnswers: ['color'] }, 'COLOR!'), true);
  assert.equal(gradeAnswer({ answer: 'am' }, 'are'), false);
  assert.equal(gradeAnswer({ answer: 'true' }, 'false'), false);
  assert.equal(gradeAnswer({ answer: 'I like tea' }, 'tea like I'), false);
  assert.equal(gradeAnswer({ answer: '12' }, '١٢'), true);
  assert.equal(gradeAnswer({ answer: '2026' }, '۲۰۲۶'), true);
  assert.equal(gradeAnswer({ answer: '١٠' }, '10'), true);
});

test('only the first passing completion awards XP and survives a storage round trip', () => {
  const state = freshState();
  assert.equal(completeLesson(state, byId('en-1'), 75), true);
  assert.equal(state.xp, 50);
  assert.equal(completeLesson(state, byId('en-1'), 100), false);
  assert.equal(state.completed['en-1'].score, 100);
  assert.equal(completeLesson(state, byId('en-1'), 75), false);
  assert.equal(state.completed['en-1'].score, 100);
  assert.equal(state.xp, 50);
  assert.equal(Object.values(state.activity)[0].lessons, 1);
  assert.equal(Object.values(state.activity)[0].xp, 50);
  const restored = loadState();
  assert.equal(restored.xp, 50);
  assert.equal(restored.completed['en-1'].score, 100);
});

test('failed quizzes keep a review task and history until a passing completion', () => {
  const state = freshState();
  const failure = { lessonId: 'en-1', title: 'الحروف', score: 50 };
  assert.equal(completeLesson(state, byId('en-1'), 74), false);
  assert.equal(state.xp, 0);
  assert.equal(state.completed['en-1'], undefined);
  recordQuiz(state, failure);
  recordQuiz(state, failure);
  assert.deepEqual(state.review, ['en-1']);
  assert.equal(state.history.length, 2);
  assert.ok(state.history.every(item => !Number.isNaN(Date.parse(item.date))));
  completeLesson(state, byId('en-1'), 100);
  assert.deepEqual(state.review, []);
  assert.equal(state.history.length, 2);
});

test('invalid scores cannot create completions or rewards', () => {
  const state = freshState();
  for (const score of [NaN, Infinity, -Infinity, 101, '100', undefined]) {
    assert.equal(completeLesson(state, byId('en-1'), score), false, `reject ${score}`);
  }
  assert.equal(state.xp, 0);
  assert.deepEqual(state.completed, {});
});

test('favorites are toggleable and review vocabulary includes the source lesson', () => {
  const state = freshState();
  toggleFavorite(state, 'apple');
  assert.deepEqual(loadState().favorites, ['apple']);
  toggleFavorite(state, 'apple');
  assert.deepEqual(state.favorites, []);
  state.weakWords = ['apple'];
  assert.deepEqual(getReviewWords(lessons, state), [{ word: 'apple', meaning: 'تفاحة', lessonId: 'en-1' }]);
});

test('progress and next lesson are calculated independently for each track', () => {
  const state = freshState();
  completeLesson(state, byId('en-1'), 100);
  assert.equal(nextLesson(lessons, state, 'english').id, 'en-2');
  assert.equal(nextLesson(lessons, state, 'computer').id, 'pc-1');
  assert.deepEqual(progressFor(lessons, state, 'computer'), { completed: 0, total: 2, percent: 0 });
  assert.deepEqual(progressFor(lessons, state, 'english'), { completed: 1, total: 6, percent: 17 });
  assert.deepEqual(progressFor([], state), { completed: 0, total: 0, percent: 0 });
});

test('missing, corrupt and incompatible storage recover to an independent new state', () => {
  assert.deepEqual(loadState(), freshState());
  for (const value of ['{bad json', 'null', '[]', JSON.stringify({ version: 99, xp: 500 })]) {
    saved.set(key, value);
    assert.deepEqual(loadState(), freshState());
  }
  const one = freshState(), two = freshState();
  one.favorites.push('book');
  assert.deepEqual(two.favorites, []);
});

test('partially damaged stored progress retains valid entries without unlocking corrupt ones', () => {
  saved.set(key, JSON.stringify({
    version: 1, name: 'أ'.repeat(100), xp: -5, goal: -3,
    favorites: ['apple', 4, null], review: 'not-an-array',
    completed: { 'en-1': { score: 85, date: '2026-11-03' }, 'en-2': 'broken', 'en-3': null, 'en-4': { score: 150 } },
    activity: { good: { lessons: 2, xp: 100 }, bad: 'broken', negative: { lessons: -1, xp: -50 } },
    history: [{ title: 'الحروف', score: 85 }, null, { title: 10, score: 50 }, { title: 'corrupt', score: 200 }],
  }));
  const state = loadState();
  assert.equal(state.name.length, 40);
  assert.equal(state.xp, 0);
  assert.equal(state.goal, freshState().goal);
  assert.deepEqual(state.favorites, ['apple']);
  assert.deepEqual(state.review, []);
  assert.deepEqual(Object.keys(state.completed), ['en-1']);
  assert.deepEqual(Object.keys(state.activity), ['good']);
  assert.equal(state.history.length, 1);
  assert.equal(isUnlocked(byId('en-3'), lessons, state), false);
});

test('storage failures do not crash a learning session', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('storage disabled'); },
    setItem() { throw new Error('quota exceeded'); },
  };
  assert.deepEqual(loadState(), freshState());
  const state = freshState();
  assert.equal(saveState(state), false);
  assert.doesNotThrow(() => completeLesson(state, byId('en-1'), 100));
  assert.equal(state.xp, 50);
});


test('review quiz activity counts for the streak without awarding points or new lessons', () => {
  const state = freshState();
  recordQuiz(state, { title: 'مراجعة', score: 50, total: 4, correct: 2 });
  const activity = Object.values(state.activity);
  assert.equal(activity.length, 1);
  assert.deepEqual(activity[0], { lessons: 0, xp: 0 });
  assert.equal(state.xp, 0);
  assert.equal(Object.keys(state.completed).length, 0);
});
