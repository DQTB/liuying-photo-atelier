'use strict';
const $=id=>document.getElementById(id);
const keys=['camera','lens','focal','aperture','shutter','iso'];
const state={exporting:false,glassCache:null,image:null,style:'gallery',color:null,demo:true,loading:false,revision:0,importId:0,blob:null,resultURL:null,timer:null};
const demo={camera:'PHOTO ATELIER',lens:'山间来信 · 示意插画',focal:'50 mm',aperture:'ƒ/1.8',shutter:'1/250 s',iso:'ISO 100'};
keys.forEach(k=>$(k).value=demo[k]);
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error)}
function fitText(ctx,text,x,y,max,size,color,font='sans-serif',align='left'){
 if(!text)return;ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`${size}px ${font}`;
 while(ctx.measureText(text).width>max&&size>9){size-=.5;ctx.font=`${size}px ${font}`}
 if(ctx.measureText(text).width>max){while(text.length&&ctx.measureText(text+'…').width>max)text=text.slice(0,-1);text+='…'}
 ctx.fillText(text,x,y);ctx.textAlign='left';
}
function draw(target,longEdge,source={}){
 const img=source.image||state.image;if(!img)return;
 const fields=source.fields||Object.fromEntries(keys.map(k=>[k,$(k).value.trim()]));
 const title=source.title??$('title').value.trim(),author=source.author??$('author').value.trim();
 const brand=source.brand??$('brand').value,brandMode=source.brandMode??$('brandMode').value;
 const ratio=img.naturalHeight/img.naturalWidth;
 const baseW=1000, pad=state.style==='editorial'?75:state.style==='film'?30:55;
 const photoW=baseW-pad*2,photoH=photoW*ratio,top=state.style==='film'?42:pad;
 const footer=state.style==='editorial'?240:state.style==='film'?160:185;
 const baseH=top+photoH+footer;
 const scale=longEdge/Math.max(baseW,baseH);
 target.width=Math.round(baseW*scale);target.height=Math.round(baseH*scale);
 const ctx=target.getContext('2d');if(!ctx)throw Error('无法建立绘图画布，请重新打开页面。');
 ctx.scale(scale,scale);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const {paper,dark,ink,muted,accent}=frameTheme();
 drawFrameBackground(ctx,img,{baseW,baseH,pad,top,photoW,photoH},paper);ctx.drawImage(img,pad,top,photoW,photoH);
 if(state.color==='glass'){ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1;ctx.strokeRect(pad-.5,top-.5,photoW+1,photoH+1)}
 const y=top+photoH,lens=fields.lens;
 const identityOptions={camera:fields.camera,brand,brandMode};
 const params=['focal','aperture','shutter','iso'].map(k=>fields[k]).filter(Boolean).join('  ·  ');
 if(state.style==='film'){
 ctx.fillStyle='#a99056';for(let x=30;x<980;x+=40){ctx.fillRect(x,14,15,7)}
 fitText(ctx,title||'PHOTOGRAPH',pad,y+48,photoW*.64,29,ink,'Georgia, "Songti SC", serif');
 fitText(ctx,author?`© ${author}`:'',baseW-pad,y+48,photoW*.3,17,muted,'sans-serif','right');
 drawCameraLine(ctx,pad,y+86,photoW,muted,dark,{suffix:lens,...identityOptions});
 fitText(ctx,params,pad,y+125,photoW,23,accent,'monospace');
 }else if(state.style==='editorial'){
 fitText(ctx,title,pad,y+61,photoW,46,ink,'Georgia, "Songti SC", serif');
 fitText(ctx,author?`摄影 / ${author}`:'',pad,y+98,photoW,18,muted);
 ctx.fillStyle=muted;ctx.fillRect(pad,y+124,photoW,1);
 drawCameraLine(ctx,pad,y+163,photoW,muted,dark,{suffix:lens,...identityOptions});
 fitText(ctx,params,pad,y+199,photoW,24,ink);
 }else{
 fitText(ctx,title,baseW/2,y+53,photoW,33,ink,'Georgia, "Songti SC", serif','center');
 drawCameraLine(ctx,baseW/2,y+88,photoW,muted,dark,{prefix:author?`© ${author}`:'',center:true,...identityOptions});
 fitText(ctx,params,baseW/2,y+124,photoW,23,ink,'sans-serif','center');
 fitText(ctx,lens,baseW/2,y+153,photoW,15,muted,'sans-serif','center');
 }
 return {width:target.width,height:target.height};
}
function scheduleRender(){
 if(state.exporting)return;
 updateCustomization();
 state.revision++;state.blob=null;clearTimeout(state.timer);$('export').disabled=true;
 if(!state.image||state.loading)return;
 try{draw($('preview'),1200)}catch(e){status(e.message,true);return}
 if(typeof batchState!=='undefined'&&batchState.importing)return;
 const revision=state.revision;
 state.timer=setTimeout(async()=>{
 let c=document.createElement('canvas');
 try{
 const dims=draw(c,Number($('size').value));
 const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.94));
 if(revision!==state.revision)return;
 if(!blob)throw Error('图片生成失败，请尝试选择较小的导出尺寸。');
 state.blob=blob;$('dimensions').textContent=`${dims.width} × ${dims.height} px`;
 $('export').disabled=typeof batchState!=='undefined'&&(batchState.importing||(batchState.photos.length>0&&(!activeRecord()?.ready||activeRecord()?.error)));
 }catch(e){if(revision===state.revision)status(e.message,true)}finally{c.width=1;c.height=1}
 },180);
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('无法打开这张图片。HEIC 请使用较新版本的 Safari，或改选 JPEG / PNG。'));img.src=src})}
function numeric(v){return typeof v==='number'&&Number.isFinite(v)&&v>0?v:null}
function metadataValues(data){
 const d=data||{},f=numeric(d.FocalLength),a=numeric(d.FNumber),t=numeric(d.ExposureTime),iso=numeric(d.ISO);
 const model=String(d.Model||'').trim(),make=String(d.Make||'').trim();
 return {camera:model&&make&&!model.toLowerCase().includes(make.toLowerCase())?`${make} ${model}`:model||make,
 lens:String(d.LensModel||''),focal:f?`${Number(f.toFixed(1))} mm`:'',aperture:a?`ƒ/${Number(a.toFixed(1))}`:'',
 shutter:t?t>=1?`${Number(t.toFixed(2))} s`:`1/${Math.round(1/t)} s`:'',iso:iso?`ISO ${iso}`:''};
}
document.querySelectorAll('[data-style]').forEach(button=>button.addEventListener('click',()=>{
 state.style=button.dataset.style;document.querySelectorAll('[data-style]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});scheduleRender();
}));
[...keys,'title','author'].forEach(id=>$(id).addEventListener('input',scheduleRender));$('size').addEventListener('change',scheduleRender);
$('export').addEventListener('click',()=>{
 if(!state.blob)return;
 if(typeof saveActiveEdits==='function')saveActiveEdits();
 if(state.resultURL)URL.revokeObjectURL(state.resultURL);
 state.resultURL=URL.createObjectURL(state.blob);$('resultImage').src=state.resultURL;$('download').href=state.resultURL;
 $('download').download=($('title').value.trim()||(typeof currentPhotoName==='function'?currentPhotoName():'留影作品')).replace(/[\\/:*?"<>|]/g,'-')+'.jpg';
 $('resultInfo').textContent=`${state.demo?'示意作品 · ':''}${$('dimensions').textContent} · JPEG · ${(state.blob.size/1024/1024).toFixed(2)} MB`;
 $('shareStatus').textContent='';$('result').showModal();
});
$('share').addEventListener('click',async()=>{
 const file=new File([state.blob],$('download').download,{type:'image/jpeg'});
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]})}else{$('shareStatus').textContent='此浏览器不支持直接分享图片。请使用“下载 JPEG 图片”，或长按图片保存。'}}catch(e){if(e.name!=='AbortError')$('shareStatus').textContent='分享未完成，请长按图片保存，或使用下方下载链接。'}
});
$('closeResult').onclick=()=>$('result').close();$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
setupCustomization();
loadImage('demo.svg').then(img=>{state.demoImage=img;if(typeof batchState!=='undefined')batchState.demoImage=img;if(!state.importId){state.image=img;scheduleRender()}}).catch(()=>status('预览加载失败，请选择你的照片。',true));
