'use strict';
const CACHE_PREFIX='liuying-shell:'+encodeURIComponent(new URL(self.registration.scope).pathname)+':';
const APP_CACHE=CACHE_PREFIX+'v8-20261015-preview-upload';
const SHELL=['./','index.html','style.css','exifr.js','fflate.js','batch.js','customize.js','glass.js','app.js','pwa.js','demo.svg','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png',...['sony','canon','nikon','fujifilm','leica','apple'].map(brand=>`${brand}.svg`)];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(APP_CACHE);await cache.addAll(SHELL);await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const rootScope=new URL(self.registration.scope).pathname==='/';
 await Promise.all((await caches.keys()).filter(key=>key!==APP_CACHE&&(key.startsWith(CACHE_PREFIX)||(rootScope&&key.startsWith('liuying-shell-v')))).map(key=>caches.delete(key)));
 await self.clients.claim();
})())});
async function documentResponse(response){
 // A navigation uses redirect:'manual'. Returning a followed redirect from Cache
 // causes ERR_FAILED, even when that cached response contains a valid HTML page.
 if(!response.redirected)return response;
 return new Response(await response.arrayBuffer(),{status:response.status,statusText:response.statusText,headers:response.headers});
}
async function navigationResponse(request){
 try{
  const cache=await caches.open(APP_CACHE);
  const cached=(await cache.match(new URL('./',self.registration.scope)))||(await cache.match(new URL('index.html',self.registration.scope)));
  if(cached)return await documentResponse(cached);
 }catch{}
 try{return await documentResponse(await fetch(request.url,{credentials:'same-origin',redirect:'follow',cache:'no-cache'}))}
 catch{return new Response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>留影 · 请联网重试</title><body style="font:16px -apple-system,sans-serif;background:#f4f2ec;color:#4c6040;margin:15vh 8%;line-height:1.9"><h1>留影需要先联网打开一次。</h1><p>当前没有可用的离线资源。请连接网络后重新加载。</p><button onclick="location.reload()">重新加载</button></body></html>',{status:503,headers:{'Content-Type':'text/html;charset=utf-8'}})}
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(navigationResponse(event.request));return}
 event.respondWith((async()=>{
  try{const cache=await caches.open(APP_CACHE);const cached=await cache.match(event.request,{ignoreSearch:true});if(cached)return cached}catch{}
  return fetch(event.request);
 })());
});
