import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('HTML loads independently versioned assets and the updated site-wide vivid stylesheet',()=>{
  const html=read('../dist/index.html');
  for(const path of ['styles.css?v=7','glass.css?v=7','vivid.css?v=3','app.js?v=7'])
    assert.ok(html.includes(path),path);
  assert.ok(html.indexOf('glass.css?v=7')<html.indexOf('vivid.css?v=3'));
});
test('service worker installs latest assets, bypasses HTTP cache and activates right away',()=>{
  const sw=read('../dist/sw.js');
  assert.match(sw,/learn-everyday-v7/);
  for(const path of ['styles.css?v=7','glass.css?v=7','vivid.css?v=3','app.js?v=7'])
    assert.ok(sw.includes(path),path);
  assert.match(sw,/skipWaiting\(\)/);
  assert.match(sw,/cache:'no-store'/);
  assert.match(sw,/clients.claim\(\)/);
});
test('update reload preserves saved learning progress and waits if quiz is open',()=>{
  const app=read('../dist/app.js');
  assert.match(app,/controllerchange/);
  assert.match(app,/updateViaCache:'none'/);
  assert.match(app,/reg.update\(\)/);
  assert.match(app,/querySelector\('#modal\[open\]'\)/);
  assert.match(app,/location.reload\(\)/);
  assert.doesNotMatch(app.slice(app.lastIndexOf("if('serviceWorker'")),),/localStorage.clear|removeItem/);
});
