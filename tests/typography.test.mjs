import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('all local font faces use valid WOFF2 files and preserve four weights for both scripts',()=>{
 const css=read('../dist/fonts.css');
 const files=[...css.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]);
 assert.equal(files.length,8);
 for(const file of files){
  assert.ok(file.endsWith('.woff2'));
  const bytes=readFileSync(new URL('../dist/'+file,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'wOF2');
 }
 for(const weight of [400,500,600,700])assert.equal([...css.matchAll(new RegExp('font-weight: '+weight+';','g'))].length,2);
 assert.doesNotMatch(css,/https?:/);
 assert.equal([...css.matchAll(/font-display: swap/g)].length,8);
});
test('reading text is no longer forced bold and typography does not access progress storage',()=>{
 const theme=read('../dist/theme.css'),glass=read('../dist/glass.css');
 assert.doesNotMatch(glass,/body,body \*[^}]*font-weight:700!important/);
 assert.match(theme,/body\s*\{[^}]*font-weight:400/s);
 assert.match(theme,/h1,h2,h3,h4,strong,b\s*\{[^}]*font-weight:700/);
 assert.doesNotMatch(theme,/localStorage|indexedDB|sessionStorage/);
});
