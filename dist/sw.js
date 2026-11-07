const CACHE='learn-everyday-v13';
const FILES=['./','./index.html','./site.css?v=13','./fonts.css?v=13','./app.js?v=13','./manifest.webmanifest','./modules/icons.js','./modules/diagrams.js','./modules/store.js','./modules/engine.js','./modules/assessment.js?v=13','./modules/audio.js','./data/english.js','./data/computer.js','./data/culture.js?v=8','./assets/hero-learning.svg','./assets/english.svg','./assets/computer.svg','./assets/culture.svg','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png',...Array.from({length:8},(_,i)=>'./assets/fonts/font-'+i+'.woff2')];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('learn-everyday-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(event.request);
  // Installation refreshes app assets together; navigation checks the network briefly.
  if(cached&&event.request.mode!=='navigate')return cached;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3000);
  try{
   const response=await fetch(event.request,{cache:'no-store',signal:controller.signal});
   if(response.ok)event.waitUntil(cache.put(event.request,response.clone()).catch(()=>{}));
   return response;
  }catch{
   if(cached)return cached;
   if(event.request.mode==='navigate'){
    const page=await cache.match('./index.html');
    if(page)return page;
   }
   return new Response('غير متاح دون اتصال',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }finally{clearTimeout(timeout);}
 })());
});
