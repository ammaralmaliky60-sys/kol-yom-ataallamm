import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('one bundled stylesheet keeps explicit visual layers and the existing blue-purple identity',()=>{
 const html=read('../dist/index.html'),css=read('../dist/site.css');
 assert.match(html,/site\.css\?v=13/);
 assert.doesNotMatch(html,/(?:glass|vivid|adventure|styles)\.css/);
 assert.match(css,/@layer base,glass,vivid,theme/);
 assert.ok(css.indexOf('@layer theme {')>css.indexOf('@layer vivid {'));
 assert.match(css,/--purple:#5540e9/);
 assert.match(css,/#172d86/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
});
test('responsive and high-resolution layouts remain part of the compiled styles',()=>{
 const css=read('../dist/site.css');
 for(const rule of ['@media(max-width:760px)','@media(max-width:380px)','@media(min-width:1920px)','@media(min-width:2560px)'])assert.ok(css.includes(rule),rule);
 assert.match(css,/\.sidebar \{ visibility:hidden/);
 assert.match(css,/\.menu-open \.sidebar \{ visibility:visible/);
 assert.doesNotMatch(read('../dist/theme.css'),/!important/);
});
