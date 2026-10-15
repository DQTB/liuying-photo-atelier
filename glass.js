'use strict';
// Blur a small edge extension in pixels: no Canvas filter dependency on iOS.
function softenPixels(canvas,radius){
 const context=canvas.getContext('2d',{willReadFrequently:true}),{width:w,height:h}=canvas;
 const pixels=context.getImageData(0,0,w,h),a=new Float32Array(w*h*3),b=new Float32Array(a.length);
 for(let i=0,j=0;i<pixels.data.length;i+=4,j+=3){a[j]=pixels.data[i];a[j+1]=pixels.data[i+1];a[j+2]=pixels.data[i+2]}
 function pass(src,dst,horizontal){
  const outer=horizontal?h:w,inner=horizontal?w:h,denom=radius*2+1;
  for(let row=0;row<outer;row++)for(let channel=0;channel<3;channel++){
   const at=pos=>((horizontal?row*w+Math.max(0,Math.min(inner-1,pos)):Math.max(0,Math.min(inner-1,pos))*w+row)*3)+channel;
   let sum=0;for(let offset=-radius;offset<=radius;offset++)sum+=src[at(offset)];
   for(let pos=0;pos<inner;pos++){dst[at(pos)]=sum/denom;sum+=src[at(pos+radius+1)]-src[at(pos-radius)]}
  }
 }
 for(let round=0;round<3;round++){pass(a,b,true);pass(b,a,false)}
 for(let i=0,j=0;i<pixels.data.length;i+=4,j+=3){pixels.data[i]=a[j];pixels.data[i+1]=a[j+1];pixels.data[i+2]=a[j+2];pixels.data[i+3]=255}
 context.putImageData(pixels,0,0);
}
function glassBackdrop(img,baseW,baseH,pad,top,photoW,photoH){
 const strength=Number($('glassStrength').value),key=`${baseW}:${baseH}:${pad}:${top}:${strength}`;
 if(state.glassCache?.image===img&&state.glassCache.key===key)return state.glassCache.canvas;
 const scale=320/Math.max(baseW,baseH),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(baseW*scale));canvas.height=Math.max(1,Math.round(baseH*scale));
 const c=canvas.getContext('2d'),iw=img.naturalWidth,ih=img.naturalHeight,edgeX=Math.max(1,iw*.10),edgeY=Math.max(1,ih*.10),bottom=top+photoH,foot=baseH-bottom,right=pad+photoW;
 c.save();c.scale(scale,scale);
 c.drawImage(img,0,0,iw,ih,pad,top,photoW,photoH);
 c.drawImage(img,0,0,iw,edgeY,pad,0,photoW,top);
 c.drawImage(img,0,ih-edgeY,iw,edgeY,pad,bottom,photoW,foot);
 c.drawImage(img,0,0,edgeX,ih,0,top,pad,photoH);
 c.drawImage(img,iw-edgeX,0,edgeX,ih,right,top,pad,photoH);
 c.drawImage(img,0,0,edgeX,edgeY,0,0,pad,top);
 c.drawImage(img,iw-edgeX,0,edgeX,edgeY,right,0,pad,top);
 c.drawImage(img,0,ih-edgeY,edgeX,edgeY,0,bottom,pad,foot);
 c.drawImage(img,iw-edgeX,ih-edgeY,edgeX,edgeY,right,bottom,pad,foot);
 c.restore();softenPixels(canvas,Math.max(2,Math.round(2+strength/14)));
 c.fillStyle=`rgba(255,255,255,${.42+strength*.0025})`;c.fillRect(0,0,canvas.width,canvas.height);
 c.fillStyle='rgba(255,255,255,.20)';c.fillRect(0,bottom*scale,canvas.width,foot*scale+1);
 // A deterministic fine frost texture is shared by preview and exported sizes.
 const image=c.getImageData(0,0,canvas.width,canvas.height);
 for(let i=0;i<image.data.length;i+=4){const n=((i*13+37)%7-3)*.35;for(let j=0;j<3;j++)image.data[i+j]+=n}
 c.putImageData(image,0,0);
 state.glassCache={image:img,key,canvas};return canvas;
}
function drawFrameBackground(ctx,img,geometry,paper){
 const {baseW,baseH,pad,top,photoW,photoH}=geometry;
 if(state.color!=='glass'){ctx.fillStyle=paper;ctx.fillRect(0,0,baseW,baseH);return}
 ctx.drawImage(glassBackdrop(img,baseW,baseH,pad,top,photoW,photoH),0,0,baseW,baseH);
 const glow=ctx.createLinearGradient(0,0,baseW,baseH);glow.addColorStop(0,'rgba(255,255,255,.24)');glow.addColorStop(.5,'rgba(255,255,255,0)');glow.addColorStop(1,'rgba(255,255,255,.10)');
 ctx.fillStyle=glow;ctx.fillRect(0,0,baseW,baseH);
 ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=1.2;ctx.strokeRect(1,1,baseW-2,baseH-2);
}
