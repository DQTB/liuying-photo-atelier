'use strict';
const batchState={photos:[],activeId:null,serial:0,previewToken:0,importing:false,demoImage:state.demoImage||null,cancel:false,results:[],zipURL:null,locked:false};
const MAX_PHOTOS=50,MAX_OUTPUT_BYTES=96*1024*1024;
function activeRecord(){return batchState.photos.find(p=>p.id===batchState.activeId)}
function currentPhotoName(){const record=activeRecord();return record?record.file.name.replace(/\.[^.]+$/,'')+'_留影':'留影作品'}
function saveActiveEdits(){
 const record=activeRecord();if(!record||state.loading)return;
 record.title=$('title').value.trim();record.fields=Object.fromEntries(keys.map(k=>[k,$(k).value.trim()]));record.brand=$('brand').value;
}
function validPhotos(){return batchState.photos.filter(p=>p.ready&&!p.error)}
function renderQueue(){
 $('choosePhoto').disabled=batchState.importing;
 $('choosePhoto').setAttribute('aria-busy',String(batchState.importing));
 $('choosePhoto').setAttribute('aria-label',batchState.photos.length?'更换照片，支持多选':'选择照片，支持多选');
 const strip=$('photoStrip'),scroll=strip.scrollLeft;strip.replaceChildren();
 $('photoQueue').hidden=!batchState.photos.length;
 $('queueCount').textContent=`已选 ${batchState.photos.length} 张`;
 if(activeRecord()&&!state.loading){$('demoLabel').textContent=`第 ${batchState.photos.findIndex(p=>p.id===batchState.activeId)+1} / ${batchState.photos.length} 张 · 本机处理`;$('fileName').textContent=`已选 ${batchState.photos.length} 张 · 点击预览更换照片`}
 $('addPhotos').disabled=batchState.importing;$('clearPhotos').disabled=batchState.importing;
 $('photo').disabled=batchState.importing;
 const many=batchState.photos.length>1,valid=validPhotos().length;
 $('batchExport').hidden=!many;$('batchNote').hidden=!many;$('applyTitle').hidden=!many;
 $('batchExport').disabled=batchState.importing||state.loading||valid<1;
 $('batchExport').textContent=`批量生成 ${valid} 张作品 ↗`;
 $('export').classList.toggle('secondary',many);
 $('export').replaceChildren(document.createTextNode(many?'生成当前作品':'生成作品'),Object.assign(document.createElement('span'),{textContent:'↗'}));
 for(const [index,record] of batchState.photos.entries()){
  const item=document.createElement('div');item.className='queue-item';item.setAttribute('role','listitem');
  const preview=document.createElement('button');preview.className='queue-preview';preview.type='button';preview.disabled=!record.ready||!!record.error;
  preview.setAttribute('aria-label',`预览第 ${index+1} 张：${record.file.name}`);preview.setAttribute('aria-pressed',String(record.id===batchState.activeId));
  if(record.thumbURL){const img=new Image();img.src=record.thumbURL;img.alt='';preview.append(img)}else{const placeholder=document.createElement('span');placeholder.className='queue-placeholder';placeholder.textContent=record.error?'无法读取':'读取中…';preview.append(placeholder)}
  const filename=document.createElement('span');filename.className='queue-filename';filename.textContent=`${index+1}. ${record.file.name}`;preview.append(filename);
  const info=document.createElement('small');info.textContent=record.error?'请移除或重选':record.ready?(record.exifCount?`EXIF ${record.exifCount} 项`:'无 EXIF，可补填'):'正在准备';preview.append(info);
  preview.onclick=()=>activateRecord(record.id);item.append(preview);
  const remove=document.createElement('button');remove.className='queue-remove';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`移除 ${record.file.name}`);remove.disabled=batchState.importing;remove.onclick=()=>removeRecord(record.id);item.append(remove);strip.append(item);
 }
 strip.scrollLeft=scroll;
}
function releasePreview(img){if(img&&img!==batchState.demoImage&&img!==state.demoImage)img.src=''}
function setPhotoInputsDisabled(disabled){for(const id of [...keys,'title','brand'])$(id).disabled=disabled}
async function decodeFile(file){
 const url=URL.createObjectURL(file);
 try{return await loadImage(url)}finally{URL.revokeObjectURL(url)}
}
async function thumbnail(img){
 const c=document.createElement('canvas'),scale=150/Math.max(img.naturalWidth,img.naturalHeight);c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
 c.getContext('2d').drawImage(img,0,0,c.width,c.height);
 try{const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.7));return blob?URL.createObjectURL(blob):null}finally{c.width=c.height=1}
}
async function activateRecord(id,providedImage=null){
 const record=batchState.photos.find(p=>p.id===id);if(!record?.ready||record.error){releasePreview(providedImage);return}
 saveActiveEdits();const token=++batchState.previewToken;
 batchState.activeId=id;state.loading=true;state.importId++;state.revision++;clearTimeout(state.timer);state.blob=null;$('export').disabled=true;setPhotoInputsDisabled(true);renderQueue();
 let img=providedImage;
 try{
  img=img||await decodeFile(record.file);
  if(token!==batchState.previewToken){releasePreview(img);return}
  releasePreview(state.image);state.image=img;state.glassCache=null;state.demo=false;
  keys.forEach(k=>$(k).value=record.fields[k]||'');$('title').value=record.title;$('brand').value=record.brand;
  $('fileName').textContent=`已选 ${batchState.photos.length} 张 · 点击预览更换照片`;
  $('demoLabel').textContent=`第 ${batchState.photos.indexOf(record)+1} / ${batchState.photos.length} 张 · 本机处理`;
  $('exifBadge').textContent=record.exifCount?`已读取 ${record.exifCount} 项`:'未检测到参数';
  if(!record.exifCount)$('metadata').open=true;
  if(!batchState.importing)status(record.exifCount?'当前照片参数已载入，可逐张检查与修改。':'当前照片没有读取到 EXIF，可手动补填。');
 }catch(e){record.error=e.message;status(`${record.file.name}：${e.message}`,true)}
 finally{if(token===batchState.previewToken){state.loading=false;setPhotoInputsDisabled(false);renderQueue();scheduleRender()}}
}
function showDemo(){
 batchState.previewToken++;batchState.activeId=null;state.importId++;state.revision++;clearTimeout(state.timer);releasePreview(state.image);state.image=batchState.demoImage||state.demoImage;state.glassCache=null;state.demo=true;state.loading=false;setPhotoInputsDisabled(false);
 keys.forEach(k=>$(k).value=demo[k]);$('title').value='山间来信';$('brand').value='auto';$('fileName').textContent='点击预览，选择照片';$('demoLabel').textContent='示意作品 · 非真实拍摄参数';$('exifBadge').textContent='示例参数';renderQueue();scheduleRender();
}
function disposeRecords(){for(const record of batchState.photos)if(record.thumbURL)URL.revokeObjectURL(record.thumbURL);batchState.photos=[]}
function removeRecord(id){
 saveActiveEdits();const record=batchState.photos.find(p=>p.id===id);if(record?.thumbURL)URL.revokeObjectURL(record.thumbURL);
 const wasActive=batchState.activeId===id;batchState.photos=batchState.photos.filter(p=>p.id!==id);
 if(wasActive){batchState.activeId=null;const next=validPhotos()[0];if(next)activateRecord(next.id);else showDemo()}
 else renderQueue();
 if(batchState.photos.length===0){showDemo();status('选择原始照片，可一次多选，单批最多 50 张。')}
}
async function importPhotos(files,append=false){
 if(batchState.importing||state.exporting||!files.length)return;
 saveActiveEdits();if(!append){disposeRecords();showDemo()}
 const available=MAX_PHOTOS-batchState.photos.length,selected=Array.from(files).slice(0,available),omitted=Math.max(0,files.length-selected.length);
 if(!selected.length){status('单批最多 50 张，请先移除部分照片或分批处理。',true);return}
 const records=selected.map(file=>({id:++batchState.serial,file,title:'',brand:'auto',fields:{},ready:false,error:null,exifCount:0,thumbURL:null}));
 batchState.photos.push(...records);batchState.importing=true;renderQueue();
 let added=0;
 try{
  for(const [index,record] of records.entries()){
   status(`正在读取 ${index+1} / ${records.length} 张：${record.file.name}`);
   let img;
   try{
    if(record.file.size>60*1024*1024)throw Error('文件超过 60 MB，请选择较小的原片。');
    const result=await Promise.allSettled([decodeFile(record.file),exifr.parse(record.file,{pick:['Make','Model','LensModel','FocalLength','FNumber','ExposureTime','ISO','DateTimeOriginal','CreateDate'],reviveValues:false,gps:false})]);
    if(result[0].status==='rejected')throw result[0].reason;
    img=result[0].value;record.fields=metadataValues(result[1].status==='fulfilled'?result[1].value:null);record.exifCount=Object.values(record.fields).filter(Boolean).length;
    record.thumbURL=await thumbnail(img);record.ready=true;added++;
    if(!batchState.activeId){await activateRecord(record.id,img);img=null}
   }catch(e){record.error=e.message||'无法读取图片，请重新选择原片。'}
   finally{releasePreview(img)}
   renderQueue();await new Promise(resolve=>setTimeout(resolve,0));
  }
 }finally{
  batchState.importing=false;renderQueue();scheduleRender();
  const errors=batchState.photos.filter(p=>p.error).length;
  status(`已加入 ${added} 张照片${errors?`；${errors} 张无法读取，请移除或重选`:''}${omitted?`；超出单批限制的 ${omitted} 张未加入`:''}。${added?'点击缩略图可逐张查看。':''}`,errors>0||omitted>0);
 }
}
$('choosePhoto').onclick=()=>{if(!batchState.importing&&!state.exporting)$('photo').click()};
$('photo').addEventListener('change',event=>{const files=Array.from(event.target.files);event.target.value='';importPhotos(files)});
$('morePhotos').addEventListener('change',event=>{const files=Array.from(event.target.files);event.target.value='';importPhotos(files,true)});
$('addPhotos').onclick=()=>$('morePhotos').click();
$('clearPhotos').onclick=()=>{disposeRecords();showDemo();status('已清空选片，原图仍保留在你的设备中。')};
$('applyTitle').onclick=()=>{saveActiveEdits();const title=$('title').value.trim();batchState.photos.forEach(p=>p.title=title);status(title?'已将当前作品名应用到全部照片。':'已清空全部照片的作品名。')};
for(const id of [...keys,'title'])$(id).addEventListener('input',saveActiveEdits);$('brand').addEventListener('change',saveActiveEdits);
function batchFileName(record,index){
 const stem=record.file.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').slice(0,90)||'照片';
 return `${String(index+1).padStart(3,'0')}_${stem}_留影.jpg`;
}
async function jpegForRecord(record,longEdge){
 let img,canvas=document.createElement('canvas');
 try{
  img=await decodeFile(record.file);if(batchState.cancel)return null;
  draw(canvas,longEdge,{image:img,fields:record.fields,title:record.title,author:$('author').value.trim(),brand:record.brand,brandMode:$('brandMode').value});
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
  if(!blob)throw Error('图片生成失败，请降低导出尺寸后重试。');return blob;
 }finally{canvas.width=canvas.height=1;if(state.glassCache?.image===img)state.glassCache=null;releasePreview(img)}
}
function lockBatch(locked){
 batchState.locked=locked;document.querySelector('main').inert=locked;document.querySelector('header').inert=locked;
 $('closeBatch').disabled=locked;
}
function reportBatchErrors(errors){
 $('batchErrorList').replaceChildren();$('batchErrors').hidden=!errors.length;
 for(const error of errors){const li=document.createElement('li');li.textContent=error;$('batchErrorList').append(li)}
}
async function buildArchive(results){
 // JPEGs are already compressed. Stream them into ZIP without recompressing.
 const chunks=[];let failure=null,finished=false;
 const zip=new fflate.Zip((error,data,final)=>{if(error)failure=error;else chunks.push(data);if(final)finished=true});
 for(const result of results){const entry=new fflate.ZipPassThrough(result.name);zip.add(entry);entry.push(new Uint8Array(await result.blob.arrayBuffer()),true);if(failure)throw failure}
 zip.end();if(failure)throw failure;if(!finished)throw Error('打包未完成，请重试。');
 return new Blob(chunks,{type:'application/zip'});
}
async function exportBatch(){
 if(batchState.importing||state.loading||state.exporting)return;saveActiveEdits();
 const photos=validPhotos().map(p=>({...p,fields:{...p.fields}}));if(!photos.length)return;
 state.exporting=true;await state.logosReady;
 state.revision++;clearTimeout(state.timer);batchState.cancel=false;batchState.results=[];
 if(batchState.zipURL)URL.revokeObjectURL(batchState.zipURL);batchState.zipURL=null;
 $('batchDownloads').hidden=true;$('batchMessage').textContent='生成期间请保持页面打开。';$('batchErrors').hidden=true;
 $('batchHeading').textContent='让每个瞬间成作。';$('batchProgress').max=photos.length;$('batchProgress').value=0;$('batchCurrent').textContent='正在准备…';$('cancelBatch').hidden=false;$('cancelBatch').disabled=false;
 $('batchProgressText').textContent=`正在生成 0 / ${photos.length} 张`;$('batchDialog').showModal();lockBatch(true);
 releasePreview(state.image);state.image=null;state.glassCache=null;
 const errors=batchState.photos.filter(p=>p.error).map(p=>`${p.file.name}：${p.error}`);
 let totalBytes=0,attempted=0;
 try{
  for(const [index,record] of photos.entries()){
   if(batchState.cancel)break;
   $('batchCurrent').textContent=record.file.name;$('batchProgressText').textContent=`正在生成 ${index+1} / ${photos.length} 张`;
   try{
    const blob=await jpegForRecord(record,Number($('size').value));if(!blob||batchState.cancel)break;
    if(totalBytes+blob.size>MAX_OUTPUT_BYTES){errors.push(`为控制手机内存，本次已停止继续生成。剩余照片请分批选择，或降低导出尺寸。`);break}
    totalBytes+=blob.size;batchState.results.push({name:batchFileName(record,index),blob});
   }catch(e){errors.push(`${record.file.name}：${e.message||'生成失败'}`)}
   attempted=index+1;$('batchProgress').value=attempted;await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(batchState.results.length){
   $('batchCurrent').textContent='正在打包 JPEG 作品…';const zip=await buildArchive(batchState.results);
   batchState.zipURL=URL.createObjectURL(zip);$('downloadBatch').href=batchState.zipURL;
   $('downloadBatch').download=`留影作品_${batchState.results.length}张.zip`;
   $('batchDownloads').hidden=false;
   const files=batchState.results.map(r=>new File([r.blob],r.name,{type:'image/jpeg'}));
   $('shareBatch').hidden=!(navigator.canShare&&navigator.canShare({files}));
   $('batchResultInfo').textContent=`${batchState.results.length} 张 JPEG · ZIP ${(zip.size/1024/1024).toFixed(2)} MB · 保留每张照片比例`;
  }
  const complete=batchState.results.length===photos.length;
  $('batchHeading').textContent=complete&&!errors.length?'每个瞬间，都已成作。':batchState.cancel?'已停止，作品已保留。':'这批作品已处理。';
  $('batchProgressText').textContent=`已完成 ${batchState.results.length} / ${photos.length} 张`;
  $('batchCurrent').textContent=complete?'每张作品均使用各自的拍摄参数。':batchState.cancel?'已完成的作品可继续分享或下载。':`未完成 ${photos.length-batchState.results.length} 张，请检查下方说明。`;
  $('batchMessage').textContent=batchState.cancel?'可下载已完成的作品，或关闭后重新批量生成。':complete?'':'部分照片未完成，可重新选择或分批处理。';
  reportBatchErrors(errors);
 }catch(e){$('batchMessage').textContent=`打包未完成：${e.message}。请减少照片数量或降低尺寸后重试。`}
 finally{state.exporting=false;$('cancelBatch').hidden=true;await activateRecord(batchState.activeId);lockBatch(false);renderQueue()}
}
$('batchExport').onclick=exportBatch;
$('cancelBatch').onclick=()=>{batchState.cancel=true;$('cancelBatch').disabled=true;$('batchMessage').textContent='正在停止，保留已经完成的作品…'};
$('closeBatch').onclick=()=>$('batchDialog').close();
$('batchDialog').addEventListener('close',()=>{if(!state.exporting){batchState.results=[];if(batchState.zipURL)URL.revokeObjectURL(batchState.zipURL);batchState.zipURL=null;$('downloadBatch').removeAttribute('href')}});
$('batchDialog').addEventListener('cancel',event=>{if(state.exporting){event.preventDefault();$('cancelBatch').click()}});
$('shareBatch').onclick=async()=>{
 const files=batchState.results.map(r=>new File([r.blob],r.name,{type:'image/jpeg'}));
 try{await navigator.share({files})}catch(e){if(e.name!=='AbortError')$('batchMessage').textContent='多图分享未完成，可下载 ZIP 后解压保存，或减少照片数量。'}
};
