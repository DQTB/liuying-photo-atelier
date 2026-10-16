const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const sourcePath=process.argv[2]||require('node:path').join(__dirname,'sw.js');
async function run({redirectHome=false,offline=false,cacheFails=false,redirectedCache=false,versionedAsset=false}={}){
 const origin='https://example.test/liuying/';const handlers={};const responses=new Map();
 const networkResponse=()=>new Response('<!doctype html><title>留影</title>',{headers:{'Content-Type':'text/html'}});
 const markRedirected=()=>{const response=networkResponse();Object.defineProperty(response,'redirected',{value:true});return response};
 if(redirectedCache)responses.set(origin+'index.html',markRedirected());
 const cache={
  async addAll(urls){for(const url of urls){const key=new URL(url,origin).href;responses.set(key,redirectHome&&(key===origin||key===origin+'index.html')?markRedirected():networkResponse())}},
  async match(key,options={}){if(cacheFails)throw Error('Cache storage unavailable');const url=typeof key==='string'?new URL(key,origin).href:key.url||key.href;if(options.ignoreSearch)return [...responses.entries()].find(([cached])=>cached.split('?')[0]===url.split('?')[0])?.[1];return responses.get(url)},
  async put(key,response){responses.set(typeof key==='string'?new URL(key,origin).href:key.url||key.href,response)},
 };
 const caches={open:async()=>{if(cacheFails)throw Error('Cache storage unavailable');return cache},keys:async()=>[],delete:async()=>true};
 const context={URL,Response,Request,Headers,Promise,console,setTimeout,clearTimeout,AbortController,caches,fetch:async request=>{if(offline)throw TypeError('Network is offline');const url=typeof request==='string'?request:request.url||request.href;return redirectHome&&new URL(url,origin).pathname.endsWith('index.html')?markRedirected():networkResponse()},self:{skipWaiting:async()=>{},location:{origin:new URL(origin).origin,href:origin+'sw.js'},registration:{scope:origin},clients:{claim:async()=>{}},addEventListener:(type,handler)=>handlers[type]=handler}};
 vm.runInNewContext(fs.readFileSync(sourcePath,'utf8'),context);
 if(!redirectedCache&&!cacheFails){let installation;handlers.install({waitUntil:p=>installation=p});await installation}
 if(versionedAsset){responses.set(origin+'app.js',new Response('old-renderer'));let asset;handlers.fetch({request:{method:'GET',url:origin+'app.js?v=new-release',mode:'cors'},respondWith:p=>asset=p});assert.notEqual(await (await asset).text(),'old-renderer','versioned code must never fall back to a stale renderer');return}
 let responsePromise;handlers.fetch({request:{method:'GET',url:origin,mode:'navigate',redirect:'manual'},respondWith:p=>responsePromise=p,waitUntil:()=>{}});
 const response=await responsePromise;
 assert.ok(response instanceof Response,'Navigation must return a Response');
 assert.equal(response.redirected,false,'ERR_FAILED: a cached redirected Response cannot satisfy a manual-redirect navigation');
 assert.equal(response.status,200,'App HTML must open successfully');
 assert.match(await response.text(),/留影/);
}
(async()=>{for(const [label,options] of [['canonical homepage redirect',{redirectHome:true}],['existing redirected cache',{redirectedCache:true,offline:true}],['offline reopen',{offline:true}],['new asset version bypasses stale cache',{versionedAsset:true}],['cache storage failure with working network',{cacheFails:true}]]){try{await run(options);console.log('PASS',label)}catch(error){console.error('FAIL',label,':',error.message);process.exitCode=1}}})()
