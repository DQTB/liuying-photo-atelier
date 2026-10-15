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
function frameTheme(){
 const paper=(state.color==='glass'?'#e6ebe3':state.color)||(state.style==='film'?'#222920':state.style==='editorial'?'#eee8da':'#fffef9');
 const rgb=paper.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2],dark=luminance<.19;
 return {paper,dark,ink:dark?'#fffdf5':'#151b11',muted:dark?'#fffdf5':'#242e1e',accent:dark?'#fff0cd':'#32280e'};
}
function drawCameraLine(ctx,x,y,max,color,dark,{prefix='',suffix='',center=false,camera,brand,brandMode=$('brandMode').value}={}){
 const identity=cameraIdentity(camera,brand),logo=brandMode==='logo'&&identity.key&&logoImages[identity.key];
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
function updateCustomization(){
 const identity=cameraIdentity(),mode=$('brandMode').value,brand=identity.key&&cameraBrands[identity.key];
 $('brandStatus').textContent=brand?`${$('brand').value==='auto'?'已识别':'已选择'} ${brand.name}${mode==='logo'&&!logoImages[identity.key]?' · Logo 尚不可用，暂用文字':''}`:mode==='logo'?'未识别到支持的品牌，暂用文字；也可手动选择品牌。':'品牌名称以文字显示。';
 $('colorName').textContent=state.color==='glass'?'':state.color?frameColors.find(c=>c[1]===state.color)[0]:'随模板';
 $('glassOptions').hidden=state.color!=='glass';$('glassValue').textContent=$('glassStrength').value+'%';
 document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===(state.color||''))));
}
function setupCustomization(){
 frameColors.forEach(([name,hex])=>{const b=document.createElement('button');b.type='button';b.className='swatch';b.dataset.color=hex;b.title=name;b.setAttribute('aria-label',`${name}边框`);b.setAttribute('aria-pressed','false');const circle=document.createElement('span');circle.style.backgroundColor=hex;b.appendChild(circle);$('palette').insertBefore(b,$('glassColor'))});
 document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color||null;scheduleRender()}));
 $('glassStrength').addEventListener('input',scheduleRender);
 ['brand','brandMode'].forEach(id=>$(id).addEventListener('change',scheduleRender));
 state.logosReady=Promise.all(Object.keys(cameraBrands).map(async key=>{try{logoImages[key]=await loadImage(`${key}.svg`)}catch{logoImages[key]=null}})).then(scheduleRender);
 updateCustomization();
}
