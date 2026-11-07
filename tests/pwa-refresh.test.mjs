import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const code=read('../dist/sw.js');
function harness({cached=null,index=null,fetch=async()=>{throw Error('offline');}}={}){
 const listeners={},writes=[];
 const cache={match:async request=>request==='./index.html'?index:cached,put:async(...args)=>writes.push(args),addAll:async()=>{}};
 const scope={URL,Request,Response,AbortController,setTimeout,clearTimeout,fetch,
  caches:{open:async()=>cache},self:{location:{origin:'https://example.com'},addEventListener:(type,fn)=>listeners[type]=fn}};
 vm.runInNewContext(code,scope);
 return {listeners,writes,dispatch:async(request)=>{
  let response;const waits=[];
  listeners.fetch({request,respondWith:p=>response=p,waitUntil:p=>waits.push(p)});
  const result=await response;await Promise.all(waits);return result;
 }};
}
test('HTML and offline installation use the same refreshed app and stylesheet versions',()=>{
 const html=read('../dist/index.html');
 assert.match(code,/learn-everyday-v13/);
 for(const file of ['site.css?v=13','fonts.css?v=13','app.js?v=13']){assert.ok(html.includes(file));assert.ok(code.includes(file));}
 assert.ok(code.includes('modules/assessment.js?v=13'));
 assert.match(code,/\.woff2/);
 assert.doesNotMatch(code,/\.ttf|adventure\.css/);
 assert.match(code,/skipWaiting\(\)/);
 assert.match(code,/clients.claim\(\)/);
});
test('cached static resources are returned without waiting on the network',async()=>{
 let calls=0;
 const h=harness({cached:new Response('cached asset'),fetch:async()=>{calls++;throw Error('offline');}});
 const response=await h.dispatch({url:'https://example.com/site.css?v=13',method:'GET',mode:'cors'});
 assert.equal(await response.text(),'cached asset');assert.equal(calls,0);
});
test('offline navigation falls back to the app shell, while missing files return a clear 503',async()=>{
 const h=harness({index:new Response('offline app')});
 assert.equal(await (await h.dispatch({url:'https://example.com/',method:'GET',mode:'navigate'})).text(),'offline app');
 assert.equal((await h.dispatch({url:'https://example.com/missing.png',method:'GET',mode:'cors'})).status,503);
 assert.equal(await h.dispatch({url:'https://other.example/file',method:'GET'}),undefined);
 assert.equal(await h.dispatch({url:'https://example.com/',method:'POST'}),undefined);
});
test('successful navigation refreshes the cached response without swallowing the page',async()=>{
 const h=harness({fetch:async()=>new Response('current app')});
 const response=await h.dispatch({url:'https://example.com/',method:'GET',mode:'navigate'});
 assert.equal(await response.text(),'current app');assert.equal(h.writes.length,1);
 assert.equal(await h.writes[0][1].text(),'current app');
});
test('updates preserve learning storage and wait while an assessment dialog is open',()=>{
 const app=read('../dist/app.js'),update=app.substring(app.lastIndexOf("if('serviceWorker'"));
 assert.match(update,/controllerchange/);
 assert.match(update,/updateViaCache:'none'/);
 assert.match(update,/querySelector\('#modal\[open\]'\)/);
 assert.doesNotMatch(update,/localStorage.clear|removeItem/);
});
