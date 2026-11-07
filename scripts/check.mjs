import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {prepareLessonAssessment} from '../dist/modules/assessment.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    files.push(...(e.isDirectory() ? await walk(path) : [path]));
  }
  return files;
}
const files = await walk(dist);
for (const file of files.filter(f => f.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Syntax error in ${file}: ${result.stderr}`);
}
const manifest = JSON.parse(await readFile(join(dist, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.dir, 'rtl');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) await access(join(dist, icon.src));
await access(join(dist, 'index.html'));
const workerScope={self:{addEventListener(){}}};
vm.runInNewContext((await readFile(join(dist,'sw.js'),'utf8'))+'\nglobalThis.requiredAssets=FILES;',workerScope);
for(const asset of workerScope.requiredAssets){
 const file=asset==='./'?'index.html':asset.split('?')[0];
 await access(join(dist,file));
}
const ids = new Set();
let lessons = 0;
let questions = 0;
let assessmentQuestions = 0;
for (const [file, name] of [['english.js', 'englishLessons'], ['computer.js', 'computerLessons'], ['culture.js', 'cultureLessons']]) {
  const content = await import(pathToFileURL(join(dist, 'data', file)));
  assert.ok(Array.isArray(content[name]) && content[name].length > 0, `Missing ${name}`);
  for (const lesson of content[name]) {
    assert.ok(lesson.id && !ids.has(lesson.id), `Duplicate lesson ID ${lesson.id}`);
    ids.add(lesson.id);
    assert.ok(lesson.title && lesson.description && lesson.sections?.length && lesson.questions?.length, `Incomplete lesson ${lesson.id}`);
    const assessed=prepareLessonAssessment(lesson);
    assert.equal(assessed.length,lesson.questions.length+1,`Missing integrated challenge in ${lesson.id}`);
    const finalQuestion=assessed.at(-1);
    assert.ok(finalQuestion.options?.includes(finalQuestion.answer),`Challenge answer missing in ${lesson.id}`);
    assessmentQuestions+=assessed.length;
    for (const question of lesson.questions) {
      assert.ok(['choice', 'input', 'order', 'boolean', 'listening'].includes(question.type), `Unknown type ${lesson.id}`);
      assert.ok(question.prompt && typeof question.answer === 'string' && question.explanation, `Incomplete question ${lesson.id}`);
      if (question.options) assert.ok(question.options.includes(question.answer) || question.type === 'order', `Answer missing from options ${lesson.id}: ${question.answer}`);
      questions++;
    }
    lessons++;
  }
}
assert.equal(lessons,146);
assert.equal(assessmentQuestions,questions+lessons);
console.log(`فحص ناجح: ${lessons} درساً، ${questions} سؤالاً مؤلفاً، ${assessmentQuestions} سؤالاً مع تحديات الربط، وملفات PWA سليمة.`);
