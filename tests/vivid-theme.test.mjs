import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const css = read('../dist/vivid.css');
const page = read('../dist/index.html');
const sw = read('../dist/sw.js');

test('vivid visual layer loads after glass and preserves the approved bold font', () => {
  assert.ok(page.indexOf('./styles.css') < page.indexOf('./glass.css'));
  assert.ok(page.indexOf('./glass.css') < page.indexOf('./vivid.css?v=3'));
  assert.match(read('../dist/glass.css'), /font-weight:700!important/);
  assert.match(css, /--purple:#6C22DE/);
  assert.match(css, /--pink:#C51B89/);
  assert.match(css, /--teal:#007D88/);
});

test('clear UI surfaces and focus affordances are present for desktop and mobile', () => {
  for (const rule of ['.hero{', '.course-card{', '.quiz-options label>span{', '.btn-primary{',
    '.sidebar,.topbar,.mobile-bottom{', '@media(max-width:520px)', 'focus-visible']) {
    assert.ok(css.includes(rule), rule);
  }
  assert.match(css, /#F4EEFF/);
  assert.match(css, /#24143F/);
  assert.doesNotMatch(css, /localStorage|indexedDB|sessionStorage|fetch\(/);
});

test('PWA precaches the vivid stylesheet and refreshes cache version', () => {
  assert.match(sw, /learn-everyday-v7/);
  assert.ok(sw.includes("'./vivid.css?v=3'"));
});

test('ultra crisp layer avoids microscopic labels on phones and scales for 4K', () => {
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.week-days small,\.week-days span,\.goal-row div>span\{font-size:10px\}/);
  assert.match(css, /@media\(min-width:1920px\)/);
  assert.match(css, /@media\(min-width:2560px\)/);
  assert.match(css, /shape-rendering:geometricPrecision/);
  assert.match(css, /text-rendering:optimizeLegibility/);
  assert.match(css, /\.quiz-options label>span\{min-height:58px\}/);
  assert.doesNotMatch(css, /localStorage|indexedDB|sessionStorage|fetch\(/);
});
