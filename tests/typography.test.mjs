import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('learning pages use local bold fonts everywhere including inputs and placeholders', () => {
  const skin = read('../dist/glass.css');
  const fonts = read('../dist/fonts.css');
  const index = read('../dist/index.html');
  const guide = read('../dist/guide.html');
  const generator = read('../scripts/make-guide.py');
  const bold = /body,body \*,body input::placeholder,body textarea::placeholder\{font-weight:700!important\}/;
  assert.match(skin, bold);
  assert.match(guide, bold);
  assert.match(generator, bold);
  assert.ok(index.indexOf('./glass.css') > index.indexOf('./styles.css'));
  assert.match(fonts, /font-family: 'IBM Plex Sans Arabic';[\s\S]*?font-weight: 700;/);
  assert.match(fonts, /font-family: 'DM Sans';[\s\S]*?font-weight: 700;/);
});

test('bold typography ships with a fresh offline cache without touching progress storage', () => {
  const serviceWorker = read('../dist/sw.js');
  assert.match(serviceWorker, /learn-everyday-v9/);
  assert.match(serviceWorker, /'\.\/glass\.css\?v=7'/);
  assert.doesNotMatch(read('../dist/glass.css'), /localStorage|indexedDB|sessionStorage/);
});
