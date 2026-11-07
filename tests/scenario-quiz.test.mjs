import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cultureLessons } from '../dist/data/culture.js';
import { gradeAnswer } from '../dist/modules/engine.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const lesson = cultureLessons.find(item => item.id === 'cu-001');

test('scientific method lesson gives three original evidence cases before assessing them', () => {
  assert.ok(lesson, 'cu-001 must exist');
  assert.equal(lesson.sections.length, 3, 'keep all three explanatory sections');
  assert.equal(lesson.questions.length, 9, 'three questions per case');
  const cases = [...new Map(lesson.questions.map(q => [q.context?.id, q.context])).values()];
  assert.equal(cases.length, 3);
  for (const study of cases) {
    assert.ok(study?.id?.startsWith('cu001-'));
    assert.ok(study.title.length > 12);
    assert.equal(study.facts.length, 3);
    assert.ok(study.facts.every(fact => typeof fact === 'string' && fact.length > 35));
    assert.equal(lesson.questions.filter(q => q.context?.id === study.id).length, 3);
  }
  assert.deepEqual(new Set(lesson.questions.map(q => q.skill)),
    new Set(['فهم المعطيات', 'التحليل', 'التطبيق']));
});

test('every scenario question has one unambiguous correct answer and explains its reasoning', () => {
  const seen = new Set();
  for (const q of lesson.questions) {
    assert.equal(q.type, 'choice');
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(!seen.has(q.prompt), 'questions must not repeat');
    seen.add(q.prompt);
    assert.equal(q.options.filter(o => o === q.answer).length, 1);
    assert.ok(q.explanation.length >= 35);
    assert.equal(gradeAnswer(q, q.answer), true);
    assert.ok(q.options.filter(o => o !== q.answer).every(o => !gradeAnswer(q, o)));
  }
});

test('shared evidence UI supports review and skill diagnostics without modifying stored progress', () => {
  const app = read('../dist/app.js');
  const skin = read('../dist/vivid.css');
  assert.match(app, /quiz-evidence/);
  assert.match(app, /quizSkillsSummary/);
  assert.match(app, /items\.map\(mixCaseOptions\)/);
  assert.match(app, /context\?\.id/);
  assert.match(app, /l\.questions\.some\(q=>q\.context\)/);
  assert.match(skin, /\.quiz-evidence\{/);
  assert.match(skin, /\.quiz-skills\{/);
  assert.match(read('../dist/sw.js'), /learn-everyday-v8/);
  assert.match(read('../dist/index.html'), /vivid\.css\?v=4/);
  assert.doesNotMatch(app, /localStorage\.clear\(/);
});
