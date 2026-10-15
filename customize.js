'use strict';
const frameColors=[
 ['雪白','#FFFEF9'],['象牙','#F2EBDD'],['燕麦','#E5D7BD'],['沙丘','#CFB895'],['陶土','#BA7B64'],['藕粉','#E1C0BA'],
 ['玫瑰灰','#AE7C83'],['雾紫','#D3CBDC'],['暮紫','#79718B'],['雾蓝','#CFDBE2'],['灰蓝','#728B9E'],['冰川','#AFCECB'],
 ['鼠尾草','#BBC7AD'],['橄榄','#858969'],['松林','#496553'],['墨绿','#253D35'],['炭灰','#444743'],['曜黑','#202220']
];
const cameraBrands={
 sony:{name:'SONY',match:/\bsony\b/i},canon:{name:'Canon',match:/\bcanon\b/i},nikon:{name:'Nikon',match:/\bnikon\b/i},
 fujifilm:{name:'FUJIFILM',match:/\b(?:fujifilm|fuji)\b/i},leica:{name:'Leica',match:/\bleica\b/i},apple:{name:'Apple',match:/\bapple\b|\biphone\b/i}
};
const logoImages={};
function cameraIdentity(camera=$('camera').value.trim(),selection=$('brand').value){
 const detected=Object.keys(cameraBrands).find(k=>cameraBrands[k].match.test(camera));
 const key=selection==='auto'?detected:selection;
 const brand=cameraBrands[key];
 let model=camera;
 if(detected){const remove=detected==='apple'?/\bapple\b\s*/ig:cameraBrands[detected].match;model=camera.replace(remove,'').replace(/^\s*[-/·]\s*/,'').trim()}
 if(!brand)return {key:null,label:camera,model:camera};
 return {key,label:[brand.name,model].filter(Boolean).join(' '),model};
}
// Sample each source image once; a batch must never reuse the active photo's colour.
const photoPalettes=new WeakMap();
function photoPalette(img){
 if(!img)return {paper:'#e5e7de',overlayInk:'#fffdf5'};
 if(photoPalettes.has(img))return photoPalettes.get(img);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=48;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,0,0,48,48);
 const pixels=ctx.getImageData(0,0,48,48).data,buckets=new Map();
 let lowerLight=0,lowerCount=0;
 for(let y=0;y<48;y++)for(let x=0;x<48;x++){
  const i=(y*48+x)*4;if(pixels[i+3]<128)continue;
  const [r,g,b]=[pixels[i],pixels[i+1],pixels[i+2]];
  if(y>=32&&x<42){lowerLight+=(.2126*r+.7152*g+.0722*b)/255;lowerCount++}
  const edge=x<9||x>=39||y<9||y>=39;
  const weight=(edge?2:1)*(.7+(Math.max(r,g,b)-Math.min(r,g,b))/255*.6);
  const key=((r>>5)<<6)|((g>>5)<<3)|(b>>5);
  const bucket=buckets.get(key)||{weight:0,r:0,g:0,b:0};
  bucket.weight+=weight;bucket.r+=r*weight;bucket.g+=g*weight;bucket.b+=b*weight;buckets.set(key,bucket);
 }
 const dominant=[...buckets.values()].sort((a,b)=>b.weight-a.weight)[0];
 const paper=dominant?'#'+['r','g','b'].map(k=>Math.round(dominant[k]/dominant.weight*.84+255*.16).toString(16).padStart(2,'0')).join(''):'#e5e7de';
 const result={paper,overlayInk:lowerCount&&lowerLight/lowerCount>.62?'#182018':'#fffdf5'};
 photoPalettes.set(img,result);canvas.width=canvas.height=1;return result;
}
function frameTheme(img=state.image,appearance=captureAppearance()){
 const {style,color}=appearance;
 const paper=color==='glass'?'#e6ebe3':color==='match'?photoPalette(img).paper:color||(style==='film'?'#222920':style==='editorial'?'#eee8da':'#fffef9');
 const rgb=paper.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2],dark=luminance<.19;
 return {paper,dark,ink:dark?'#fffdf5':'#151b11',muted:dark?'#fffdf5':'#242e1e',accent:dark?'#fff0cd':'#32280e'};
}
function drawPhotoWatermark(ctx,img,baseW,baseH,{fields,title,author,brand,brandMode,appearance=captureAppearance()}){
 const choice=appearance.overlayInk,color=choice==='white'?'#fffdf5':choice==='black'?'#182018':photoPalette(img).overlayInk;
 const cameraVisible=appearance.visible.camera&&(fields.camera||(brand!=='auto'&&cameraBrands[brand]));
 const rows=[];
 if(title)rows.push({kind:'title',height:43});
 if(cameraVisible||fields.lens||author)rows.push({kind:'identity',height:32});
 const params=['focal','aperture','shutter','iso'].map(k=>fields[k]).filter(Boolean).join('  ·  ');
 if(params)rows.push({kind:'params',height:32});
 if(fields.capturedAt)rows.push({kind:'time',height:27});
 if(!rows.length)return;
 // Scale the block down on wide panoramas; preserve every pixel of the photo.
 const unit=Math.min(1,baseH/500),margin=34,max=baseW/unit-margin*2;
 ctx.save();ctx.scale(unit,unit);
 ctx.globalAlpha=appearance.overlayOpacity/100;
 ctx.shadowColor=color==='#fffdf5'?'rgba(0,0,0,.55)':'rgba(255,255,255,.65)';ctx.shadowBlur=4;ctx.shadowOffsetY=1;
 let y=baseH/unit-32-rows.reduce((sum,row)=>sum+row.height,0);
 for(const row of rows){
  y+=row.height;
  if(row.kind==='title')fitText(ctx,title,margin,y,max,30,color,'Georgia, "Songti SC", serif');
  if(row.kind==='identity')drawCameraLine(ctx,margin,y,max,color,color==='#fffdf5',{camera:fields.camera,brand,brandMode,showCamera:appearance.visible.camera,prefix:author?`© ${author}`:'',suffix:fields.lens});
  if(row.kind==='params')fitText(ctx,params,margin,y,max,23,color,'sans-serif');
  if(row.kind==='time')fitText(ctx,fields.capturedAt,margin,y,max,17,color,'monospace');
 }
 ctx.restore();
}
function drawCameraLine(ctx,x,y,max,color,dark,{prefix='',suffix='',center=false,camera,brand,showCamera=true,brandMode=$('brandMode').value}={}){
 const identity=showCamera?cameraIdentity(camera,brand):{key:null,label:'',model:''},logo=brandMode==='logo'&&identity.key&&logoImages[identity.key];
 if(!logo){fitText(ctx,[prefix,identity.label,suffix].filter(Boolean).join(' / '),x,y,max,19,color,'sans-serif',center?'center':'left');return}
 const ratio=logo.naturalWidth/logo.naturalHeight,h=Math.min(30,115/ratio),w=h*ratio;
 const text=[prefix,identity.model,suffix].filter(Boolean).join(' / '),gap=text?16:0;
 ctx.font='19px sans-serif';const textWidth=Math.min(ctx.measureText(text).width,max-w-gap),total=w+gap+textWidth;
 const start=center?x-total/2:x;
 ctx.drawImage(tintedWordmark(identity.key,color),start,y-8-h/2,w,h);
 fitText(ctx,text,start+w+gap,y,max-w-gap,19,color);
}
const wordmarkTints=new Map();
function tintedWordmark(key,color){
 const cacheKey=key+color;if(wordmarkTints.has(cacheKey))return wordmarkTints.get(cacheKey);
 const img=logoImages[key],canvas=document.createElement('canvas');
 canvas.width=600;canvas.height=Math.max(1,Math.round(600*img.naturalHeight/img.naturalWidth));
 const context=canvas.getContext('2d');context.drawImage(img,0,0,canvas.width,canvas.height);context.globalCompositeOperation='source-in';context.fillStyle=color;context.fillRect(0,0,canvas.width,canvas.height);
 wordmarkTints.set(cacheKey,canvas);return canvas;
}
function copyAppearance(appearance){return {...appearance,visible:{...appearance.visible}}}
function captureAppearance(){
 return {style:state.style,color:state.color,visible:{...state.visible},brandMode:$('brandMode').value,author:$('author').value.trim(),glassStrength:Number($('glassStrength').value),overlayInk:$('overlayInk').value,overlayOpacity:Number($('overlayOpacity').value)};
}
function restoreAppearance(appearance){
 const saved=copyAppearance(appearance);
 state.style=saved.style;state.color=saved.color;state.visible=saved.visible;
 for(const id of ['brandMode','author','glassStrength','overlayInk','overlayOpacity'])$(id).value=String(saved[id]);
 keys.forEach(key=>$('show-'+key).checked=state.visible[key]);
}
function updatePhotoScope(){
 const record=typeof activeRecord==='function'?activeRecord():null;
 $('frameScope').textContent=record?`正在编辑第 ${batchState.photos.indexOf(record)+1} 张 · 更改仅影响当前照片`:'选好喜欢的样式，再点击预览添加照片';
}
function updateCustomization(){
 document.querySelectorAll('[data-style]').forEach(button=>{const active=button.dataset.style===state.style;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
 updatePhotoScope();
 const identity=cameraIdentity(),mode=$('brandMode').value,brand=identity.key&&cameraBrands[identity.key];
 $('brandStatus').textContent=brand?`${$('brand').value==='auto'?'已识别':'已选择'} ${brand.name}${mode==='logo'&&!logoImages[identity.key]?' · Logo 尚不可用，暂用文字':''}`:mode==='logo'?'未识别到支持的品牌，暂用文字；也可手动选择品牌。':'品牌名称以文字显示。';
 $('colorName').textContent=state.color==='glass'?'':state.color==='match'?'随照片自动匹配':state.color?frameColors.find(c=>c[1]===state.color)?.[0]||'随模板':'随模板';
 const overlay=state.style==='overlay';$('borderColors').hidden=overlay;$('overlayOptions').hidden=!overlay;
 $('overlayOpacityValue').textContent=$('overlayOpacity').value+'%';
 $('matchColor').style.setProperty('--matched-color',state.color==='match'?photoPalette(state.image).paper:'#a3b397');
 $('glassOptions').hidden=state.color!=='glass';$('glassValue').textContent=$('glassStrength').value+'%';
 document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===(state.color||''))));
}
function setupCustomization(){
 frameColors.forEach(([name,hex])=>{const b=document.createElement('button');b.type='button';b.className='swatch';b.dataset.color=hex;b.title=name;b.setAttribute('aria-label',`${name}边框`);b.setAttribute('aria-pressed','false');const circle=document.createElement('span');circle.style.backgroundColor=hex;b.appendChild(circle);$('palette').insertBefore(b,$('glassColor'))});
 document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color||null;scheduleRender()}));
 $('glassStrength').addEventListener('input',scheduleRender);
 $('overlayOpacity').addEventListener('input',scheduleRender);$('overlayInk').addEventListener('change',scheduleRender);
 ['brand','brandMode'].forEach(id=>$(id).addEventListener('change',scheduleRender));
 state.logosReady=Promise.all(Object.keys(cameraBrands).map(async key=>{try{logoImages[key]=await loadImage(`${key}.svg`)}catch{logoImages[key]=null}})).then(scheduleRender);
 updateCustomization();
}
