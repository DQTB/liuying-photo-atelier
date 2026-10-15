'use strict';
let installPrompt=null;
const installDialog=$('installDialog'),offlineStatus=$('offlineStatus');
function offlineState(text,ready=false){offlineStatus.textContent=text;offlineStatus.dataset.ready=String(ready)}
function openInstall(){
 if(installPrompt){installPrompt.prompt();installPrompt.userChoice.finally(()=>{installPrompt=null});return}
 installDialog.showModal();
}
$('installApp').onclick=openInstall;$('installCardButton').onclick=openInstall;$('closeInstall').onclick=()=>installDialog.close();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
window.addEventListener('appinstalled',()=>{$('installCard').hidden=true;installPrompt=null});
if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){$('installCard').hidden=true;$('installApp').textContent='应用信息'}
function readPreferences(){
 try{return JSON.parse(localStorage.getItem('liuying-preferences-v1'))||{}}catch{return {}}
}
function restorePreferences(){
 const p=readPreferences();
 if(['gallery','editorial','film'].includes(p.style)){state.style=p.style;document.querySelectorAll('[data-style]').forEach(button=>{const active=button.dataset.style===state.style;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})}
 if(p.color==='glass'||frameColors.some(c=>c[1]===p.color))state.color=p.color;
 if(['logo','text'].includes(p.brandMode))$('brandMode').value=p.brandMode;
 if(typeof p.author==='string')$('author').value=p.author.slice(0,50);
 if(Number.isFinite(p.glassStrength))$('glassStrength').value=Math.max(0,Math.min(100,p.glassStrength));
 scheduleRender();
}
function savePreferences(){
 try{localStorage.setItem('liuying-preferences-v1',JSON.stringify({style:state.style,color:state.color,brandMode:$('brandMode').value,author:$('author').value,glassStrength:Number($('glassStrength').value)}))}catch{}
}
document.querySelector('.controls').addEventListener('change',savePreferences);
document.querySelectorAll('[data-style],[data-color]').forEach(button=>button.addEventListener('click',savePreferences));
restorePreferences();
if('serviceWorker' in navigator&&window.isSecureContext){
 offlineState('正在准备离线使用…');
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(async registration=>{
  let timer;
  try{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Offline preparation timed out')),15000)})])}finally{clearTimeout(timer)}
  const prefix='liuying-shell:'+encodeURIComponent(new URL(registration.scope).pathname)+':';
  const names=(await caches.keys()).filter(name=>name.startsWith(prefix));
  let ready=false;
  for(const name of names){const cache=await caches.open(name);if(await cache.match(new URL('./',registration.scope))){ready=true;break}}
  offlineState(ready?'离线已就绪 · 本机处理':'离线资源准备中，请联网重开后再试',ready);
  const showUpdate=()=>{if(registration.waiting)offlineState('新版本已备好 · 保存作品后关闭并重开即可更新',true)};
  showUpdate();registration.addEventListener('updatefound',()=>{registration.installing?.addEventListener('statechange',showUpdate)});
 }).catch(()=>offlineState('离线准备未完成 · 请联网使用并稍后重试'));
}else{offlineState('当前浏览器未启用离线支持 · 可联网使用')}
window.addEventListener('offline',()=>{if(offlineStatus.dataset.ready==='true')offlineState('当前离线 · 可继续处理照片',true)});

const feedbackDialog=$('feedbackDialog');
function openFeedback(){
 $('copyStatus').textContent='也可以长按微信号复制，在微信中搜索添加。';
 feedbackDialog.showModal();
}
$('feedback').onclick=openFeedback;$('footerFeedback').onclick=openFeedback;
$('closeFeedback').onclick=()=>feedbackDialog.close();
$('copyWechat').onclick=async()=>{
 try{
  await navigator.clipboard.writeText('bdq102');
  $('copyStatus').textContent='已复制微信号 bdq102，可前往微信搜索添加。';
 }catch{
  $('copyStatus').textContent='当前浏览器无法自动复制，请长按上方微信号 bdq102 复制。';
 }
};
