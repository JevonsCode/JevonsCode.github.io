'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { cover:null, selected:4, mode:'classic', gridGap:4, thumbWidth:90, dragLayer:'cover', zoom:1, x:0, y:0, paper:'#ffffff', cells:Array.from({length:9},()=>({top:[],bottom:[],fill:{top:null,bottom:null},fillEdits:{top:null,bottom:null}})), busy:false, importing:0, dirty:false, isDefaultCover:true, coverRevision:0, defaultsInitialized:false, overflowBackground:null, overlayLayers:[], activeOverlayId:null };
state.overflowSelection=Array.from({length:9},(_,i)=>i);
state.overflowCells=Array.from({length:9},()=>({enabled:true,insets:{top:.1,right:.1,bottom:.1,left:.1}}));
const cover = document.createElement('canvas'); cover.width=cover.height=3240;
let demoImage, toastTimer, renderFrame;
function toast(message){ $('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000); }
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('图片无法读取，请换一张 JPG、PNG 或 WebP 图片。'));img.src=src;});}
async function readPhoto(file, purpose='photo'){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('请选择 JPG、PNG 或 WebP 图片；HEIC 请先转为 JPG。');
  const url=URL.createObjectURL(file);
  try{const img=await loadImage(url);if(img.naturalWidth*img.naturalHeight>60000000)throw new Error('图片像素过大，请缩小到 6000 × 6000 以内。');
    const limit=purpose==='cover'?3240:purpose==='overlay'?2400:1600;const scale=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));const c=canvas(Math.round(img.naturalWidth*scale),Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const thumb=imageThumbnail(c,144,purpose==='overlay');if(purpose!=='photo')return {img:c,name:file.name,thumb};const blob=await blobFromCanvas(c,'image/webp',.94);const src=URL.createObjectURL(blob),width=c.width,height=c.height;c.width=c.height=1;return {src,width,height,name:file.name,thumb};
  }finally{URL.revokeObjectURL(url);}
}
function drawCrop(ctx,img,x,y,w,h,zoom=1,px=0,py=0){const iw=img.width,ih=img.height;const scale=Math.max(w/iw,h/ih)*zoom;const dw=iw*scale,dh=ih*scale;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x-(dw-w)/2+px*(dw-w)/2,y-(dh-h)/2+py*(dh-h)/2,dw,dh);ctx.restore();}
function gridGeometry(){const tile=1080,gap=Math.round(tile*state.gridGap/state.thumbWidth);return {tile,gap,size:tile*3+gap*2};}
function drawTile(ctx,index,x,y,size){const g=gridGeometry();ctx.drawImage(cover,index%3*(g.tile+g.gap),Math.floor(index/3)*(g.tile+g.gap),g.tile,g.tile,x,y,size,size);}
function composeCover(){
  if(!state.cover)return;const g=gridGeometry();
  if(cover.width!==g.size){cover.width=cover.height=g.size;}
  const ctx=cover.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,g.size,g.size);
  if(state.mode==='classic')drawCrop(ctx,state.cover,0,0,g.size,g.size,state.zoom,state.x,state.y);
  else{
    // Clip one continuous background; do not squeeze nine separate pieces into their frames.
    ctx.save();ctx.beginPath();
    for(let i=0;i<9;i++){
      const cfg=state.overflowCells[i],insets=overflowInsets(cfg),x=i%3*(g.tile+g.gap),y=Math.floor(i/3)*(g.tile+g.gap);
      const top=cfg.enabled?g.tile*insets.top:0,right=cfg.enabled?g.tile*insets.right:0,bottom=cfg.enabled?g.tile*insets.bottom:0,left=cfg.enabled?g.tile*insets.left:0;
      ctx.rect(x+left,y+top,g.tile-left-right,g.tile-top-bottom);
    }
    const cleanBackground=state.isDefaultCover&&state.overflowBackground;
    ctx.clip();drawCrop(ctx,cleanBackground||state.cover,0,0,g.size,g.size,state.zoom,state.x,state.y);ctx.restore();
    // A disabled tile retains the complete original cover, including its subject.
    if(cleanBackground){ctx.save();ctx.beginPath();for(let i=0;i<9;i++)if(!state.overflowCells[i].enabled)ctx.rect(i%3*(g.tile+g.gap),Math.floor(i/3)*(g.tile+g.gap),g.tile,g.tile);ctx.clip();drawCrop(ctx,state.cover,0,0,g.size,g.size,state.zoom,state.x,state.y);ctx.restore();}
    drawOverflowLayers(ctx,g);
  }
  document.documentElement.style.setProperty('--grid-gap',`${100*g.gap/g.size}%`);
}
function paintTile(c,index){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);drawTile(ctx,index,0,0,c.width);}
function requestRender(){cancelAnimationFrame(renderFrame);renderFrame=requestAnimationFrame(()=>{composeCover();$$('.cover-cell canvas').forEach((c,i)=>paintTile(c,i));paintTile($('#selectedCanvas'),state.selected);});state.dirty=true;}
function selectCell(i){state.selected=i;$$('.cover-cell,.mini-cell').forEach(b=>{const active=+b.dataset.index===i;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('#selectedLabel').textContent=String(i+1).padStart(2,'0');paintTile($('#selectedCanvas'),i);renderStory();}
function makeGrids(){for(let i=0;i<9;i++){
  const b=document.createElement('button');b.className='cover-cell';b.dataset.index=i;b.setAttribute('aria-label',`编辑第 ${i+1} 格的长图`);const c=canvas(420,420);b.append(c);const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');b.append(n);b.onclick=()=>{if(Date.now()<coverGestureUntil)return;selectCell(i);if(innerWidth<=620)$('.story').scrollIntoView({behavior:'smooth',block:'start'});};$('#coverGrid').append(b);
  const m=document.createElement('button');m.className='mini-cell';m.dataset.index=i;m.setAttribute('aria-label',`选择第 ${i+1} 格`);m.textContent=i+1;m.onclick=()=>selectCell(i);$('#miniGrid').append(m);
}}
function setMode(mode){if(!['classic','overflow'].includes(mode))throw new Error('不支持的模式');state.mode=mode;$$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('#overflowControls').hidden=mode!=='overflow';$('#modeLabel').textContent=mode==='classic'?'经典九宫格':'溢出拼贴';syncOverflowControls();syncDragLayers();requestRender();if(mode==='overflow')ensureDefaultOverflow();}
function renderStory(){const cell=state.cells[state.selected];for(const side of ['top','bottom']){const list=$('#'+side+'List');list.replaceChildren();$('#'+side+'Count').textContent=cell[side].length+' 张';cell[side].forEach((photo,i)=>{
    const row=document.createElement('div');row.className='photo-row';const img=document.createElement('img');img.src=photo.thumb;img.alt='';const name=document.createElement('span');name.className='photo-title';name.textContent=photo.name;const editButton=document.createElement('button');editButton.className='photo-adjust';editButton.textContent='调整';editButton.setAttribute('aria-label','调整 '+photo.name);editButton.onclick=()=>openPhotoEditor(state.selected,side,i);row.append(img,name,editButton);const actions=document.createElement('div');actions.className='photo-actions';
    for(const [symbol,title,act,disabled] of [ ['↑','上移',()=>movePhoto(side,i,-1),i===0],['↓','下移',()=>movePhoto(side,i,1),i===cell[side].length-1],['×','删除',()=>{const old=cell[side].splice(i,1)[0];if(old.src)URL.revokeObjectURL(old.src);state.dirty=true;renderStory();},false]]){const b=document.createElement('button');b.textContent=symbol;b.title=title;b.setAttribute('aria-label',title+' '+photo.name);b.disabled=disabled;b.onclick=act;actions.append(b);}row.append(actions);list.append(row);
  });}
  let filled=0;state.cells.forEach((c,i)=>{const has=c.top.length+c.bottom.length>0;if(has)filled++;const b=$$('.mini-cell')[i];b.querySelector('.has-content')?.remove();if(has){const dot=document.createElement('i');dot.className='has-content';b.append(dot);}});$('#filledCount').textContent=filled+' / 9';
  const l=layout(cell,720);$('#balanceHint').textContent=cell.top.length+cell.bottom.length?`长图约 720 × ${l.h} 像素 · 封面保持居中，填图不会挤动其他照片。`:'每格最多放 6 张照片，可单独调整取景。';renderPaddingControls(cell,l);
}
function importStatus(delta){state.importing+=delta;$('#exportBtn').disabled=state.importing>0;$('#exportBtn').innerHTML=state.importing?'<span>…</span> 正在读取照片':'<span>↓</span> 导出 9 张长图';}
function movePhoto(side,i,delta){const a=state.cells[state.selected][side];[a[i],a[i+delta]]=[a[i+delta],a[i]];state.dirty=true;renderStory();}
async function addPhotos(side,files){const selected=state.selected,cell=state.cells[selected];const room=6-cell.top.length-cell.bottom.length;if(room<=0){toast('这一格已放入 6 张照片，请先移除一些。');return;}const chosen=[...files].slice(0,room);if(files.length>room)toast('每格最多 6 张，已选取前 '+room+' 张。');let errors=[];for(const f of chosen){try{const p=await readPhoto(f);if(cell.top.length+cell.bottom.length<6)cell[side].push(p);else if(p.src)URL.revokeObjectURL(p.src);}catch(e){errors.push(e.message);}}state.dirty=true;renderStory();if(errors.length)toast(errors[0]);}
// Bound total canvas height; each visible frame uses the same crop in the editor and export.
function photoEdit(photo){return {zoom:1,x:0,y:0,frame:null,...photo.edit};}
function photoAspect(photo,edit=photoEdit(photo)){return edit.frame||(photo.height||photo.img.height)/(photo.width||photo.img.width);}
function layout(cell,w,override=null){
  const gap=Math.round(w*.016);
  const side=(photos)=>{
    const natural=photos.map(p=>w*photoAspect(p,override?.photo===p?override.edit:photoEdit(p)));
    const sum=natural.reduce((a,b)=>a+b,0)+photos.length*gap;
    const scale=Math.min(1,w*5.5/Math.max(sum,1));
    const sizes=natural.map(h=>Math.max(1,Math.round(h*scale)));
    const g=photos.length?Math.max(1,Math.round(gap*scale)):0;
    return {sizes,g,h:sizes.reduce((a,b)=>a+b,0)+photos.length*g,scale};
  };
  const top=side(cell.top),bottom=side(cell.bottom),s=Math.max(top.h,bottom.h);
  return {top,bottom,s,h:2*s+w,topStart:0,bottomStart:s+w+bottom.g,padding:{top:{y:top.h,h:s-top.h},bottom:{y:s+w+bottom.h,h:s-bottom.h}}};
}
function paddingPhoto(cell,side){
  const custom=cell.fill?.[side];
  const source=custom||(side==='top'?(cell.top.at(-1)||cell.bottom[0]):null);
  if(!source)return null;
  return {photo:source,edit:{zoom:1,x:0,y:0,...cell.fillEdits?.[side]},automatic:!custom};
}
async function renderLong(index,w=720){
  const cell=state.cells[index],l=layout(cell,w),c=canvas(w,l.h),ctx=c.getContext('2d');
  ctx.fillStyle=state.paper;ctx.fillRect(0,0,w,l.h);
  const draw=async(photos,side,y)=>{for(let j=0;j<photos.length;j++){
    const p=photos[j],img=p.img||await loadImage(p.src),h=side.sizes[j],e=photoEdit(p);
    drawCrop(ctx,img,0,y,w,h,e.zoom,e.x,e.y);y+=h+side.g;
  }};
  await draw(cell.top,l.top,l.topStart);
  await draw(cell.bottom,l.bottom,l.bottomStart);
  for(const side of ['top','bottom']){
    const area=l.padding[side],fill=paddingPhoto(cell,side);
    if(area.h>0&&fill){const img=fill.photo.img||await loadImage(fill.photo.src);drawCrop(ctx,img,0,area.y,w,area.h,fill.edit.zoom,fill.edit.x,fill.edit.y);}
  }
  // Draw the locked cover last, keeping fill and crop operations outside it.
  drawTile(ctx,index,0,l.s,w);
  return c;
}
function blobFromCanvas(c,type='image/jpeg',quality=.94){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('导出失败，请尝试 720 像素。')),type,quality));}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function showModal(title,body){closeLongEditorSession();$('#modal').classList.remove('long-editor-modal');$('#modalTitle').textContent=title;$('#modalBody').replaceChildren();if(typeof body==='string')$('#modalBody').innerHTML=body;else $('#modalBody').append(body);if(!$('#modal').open)$('#modal').showModal();}
async function showStory(index=state.selected,fromMoments=false){return openLongEditor(index,fromMoments);}
function showMoments(){composeCover();const wrap=document.createElement('div');wrap.className='modal-content';wrap.innerHTML='<p class="preview-caption">按居中裁切模拟。点击任意小图，查看展开效果。</p><div class="moments-post"><div class="avatar">我</div><div class="moments-body"><strong>我的朋友圈</strong><p>把喜欢的瞬间，都放在这里。</p><div class="moments-grid"></div><div class="moments-time">刚刚 · 仅自己可见（模拟）</div></div></div><p class="preview-caption" style="margin-top:22px">微信实际裁切可能随版本变化，建议先发一条「仅自己可见」测试。</p>';const grid=wrap.querySelector('.moments-grid');for(let i=0;i<9;i++){const b=document.createElement('button');b.setAttribute('aria-label',`打开第 ${i+1} 张长图`);const c=canvas(300,300);paintTile(c,i);b.append(c);b.onclick=()=>showStory(i,true);grid.append(b);}showModal('朋友圈预览',wrap);}
function showHelp(){showModal('用 3 步，做一组拼图',`<div class="modal-content"><h3>1. 选一张大图做封面</h3><p>上传图片后，单指拖动、双指缩放，轻点格子添加照片。拆图会扣除格间缝隙遮住的内容；可展开「格子间距」手动校准。示例仅供体验，导出前可换成自己的照片。</p><h3>2. 点一格，放入更多照片</h3><p>在封面上方或下方添加照片，长图预览铺满屏幕宽度，点选照片后仍可单指上下浏览，双指移动或缩放照片，也可重置取景；电脑可用鼠标拖动。列表里的「调整」也能改变画框高度；超出画框的部分会裁切。可继续添加照片、移动顺序或删除。</p><h3>留白和填图</h3><p>白色尽量留在底部。上方不足时，默认用相邻照片补齐，保持封面居中；你也可以为上下空缺分别选择另一张图片，再单独调整它的取景。填图不会改变长图尺寸。</p><h3>3. 导出，再发朋友圈</h3><p>下载压缩包并解压，保存 01–09 共 9 张图片，按编号依次选择发布。手机也可在长图预览里逐张下载。</p><div class="callout">第一次使用，请先选择「仅自己可见」试发。朋友圈的缩略图由微信裁切，不同版本可能有差异。</div><h3>想做人物溢出？</h3><p>切换「溢出拼贴」，可选择仅第一排、仅第 2、3 格，或自行点选格子。留白可按上、下、左、右四边单独设置，设为 0% 即不留白；也可快捷选择仅一个方向。四边留白、当前图层的图片及位置只影响本次选中的格子，各格会记住自己的设置。首次切换溢出模式时，会自动载入人物和文字两个透明图层。可以一次添加多张图片，上传后显示缩略图和文件名；各图层可单独调整、隐藏、排序和删除。在预览上方选择当前图层即可拖动或缩放，真实格缝依然保留。更换封面只替换背景，人物、文字和其他图层的大小、位置、显示状态与覆盖范围均保留；不需要的图层可以手动删除。</p><h3>图片和草稿存在哪里？</h3><p>上传的照片只在当前浏览器内存里处理，不上传到服务器。关闭或刷新页面会清空草稿，请先导出。</p></div>`);}
function showCompat(){showModal('关于微信的显示方式',`<div class="modal-content"><h3>缩略图是 A，点开看到 A ＋ B</h3><p>每个九宫格小图，实际上都是一张长图。我们把 A 放在正中央，把 B 等照片放在上下，利用朋友圈长图缩略图的居中裁切形成九宫格。</p><div class="callout">普通朋友圈图片没有可供这个工具设置的独立封面，因此不能保证「显示 A，点开后 A 消失、完全变成 B」。</div><h3>溢出的是画面内部的白边</h3><p>人物可以跨越各格里的白边，但不能覆盖微信本身的格子间隙，也不能出现在九宫格的外面。</p><h3>格子间距怎么算？</h3><p>默认按小图宽 90、间距 4 的比例预览。拆图会跳过缝隙对应的画面，人物也会被真实格缝遮挡。可在「格子间距」里填写同一张微信截图中的小图宽度和缝隙宽度。</p><p>公开仿微信组件的默认间距并不一致，例如 <a href="https://github.com/jeasonlzy/NineGridView" target="_blank" rel="noopener">NineGridView（3dp）</a>、<a href="https://github.com/bingoogolapple/BGAPhotoPicker-Android" target="_blank" rel="noopener">BGAPhotoPicker（4dp）</a>。这些是参考实现，不是微信官方统一规格。</p><h3>先试发一次</h3><p>当前预览按居中裁切模拟，没有经过你的手机微信真机验证。先用「仅自己可见」发 9 张图片，检查顺序、裁切和清晰度。</p><p>实现参考：<a href="https://github.com/paul-zz/WechatLongPic" target="_blank" rel="noopener" style="text-decoration:underline">WechatLongPic 开源项目</a>。这是公开实践，不是微信的兼容承诺。</p></div>`);}
// ZIP (store method), UTF-8 file names, CRC-32. No external service or dependency.
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function createZip(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0,total=0;for(const f of files){const name=enc.encode(f.name),data=f.data,crc=crc32(data);const local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);parts.push(local,data);const cd=new Uint8Array(46+name.length),d=new DataView(cd.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);cd.set(name,46);central.push(cd);offset+=local.length+data.length;total+=cd.length;}
  const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,total,true);e.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
function showExport(){const filled=state.cells.filter(c=>c.top.length+c.bottom.length).length,photos=state.cells.reduce((n,c)=>n+c.top.length+c.bottom.length,0);showModal('导出你的九宫格',`<div class="modal-content"><div class="export-summary"><div><strong>9</strong><span>张封面</span></div><div><strong>${filled}</strong><span>格含额外照片</span></div><div><strong>${photos}</strong><span>张添加的照片</span></div></div><label class="export-select" for="exportSize">每张图片宽度<select id="exportSize"><option value="1080">1080 px · 高清</option><option value="720">720 px · 轻量</option></select></label><div class="callout">${filled<9?`还有 ${9-filled} 格没有额外照片，会导出为方形封面。<br>`:''}下载后解压，按 01–09 的顺序选图发布。建议先发「仅自己可见」检查效果。</div><div class="modal-actions"><button id="downloadZip" class="btn primary">下载 9 张图片（ZIP）</button></div><p id="exportStatus" class="preview-caption" role="status" style="margin-top:12px;margin-bottom:0"></p></div>`);$('#downloadZip').onclick=exportAll;}
async function exportAll(){if(state.busy)return;if(state.importing){toast('照片仍在读取，请稍后再导出。');return;}state.busy=true;const button=$('#downloadZip'),status=$('#exportStatus'),w=+$('#exportSize').value;button.disabled=true;$('#closeModal').disabled=true;
  try{composeCover();const files=[];for(let i=0;i<9;i++){status.textContent=`正在生成第 ${i+1} / 9 张…`;await new Promise(resolve=>requestAnimationFrame(resolve));const c=await renderLong(i,w);const blob=await blobFromCanvas(c);files.push({name:`${String(i+1).padStart(2,'0')}.jpg`,data:new Uint8Array(await blob.arrayBuffer())});c.width=c.height=1;}
    download(createZip(files),'间象-01至09.zip');status.textContent='9 张图片已生成。请在下载文件夹解压后，按编号保存并发布。';button.textContent='再次下载';state.dirty=false;toast('已打包完成，按 01–09 顺序发布即可。');
  }catch(e){status.textContent=e.message||'导出失败，请尝试 720 像素。';}finally{state.busy=false;button.disabled=false;$('#closeModal').disabled=false;}
}
function bind(){
  bindPaddingInputs();bindOverflowEditor();bindCoverGestures();
  for(const [id,key,min,max] of [['gridGap','gridGap',0,30],['thumbWidth','thumbWidth',40,500]])$('#'+id).addEventListener('input',e=>{const value=Number(e.target.value);if(e.target.value===''||!Number.isFinite(value)||value<min||value>max){e.target.setCustomValidity(`请输入 ${min}–${max} 之间的数值`);return;}e.target.setCustomValidity('');state[key]=value;$('#gapSummary').textContent=state.gridGap+' px';requestRender();});
  $$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  for(const [id,key,divisor] of [['zoom','zoom',100],['posX','x',100],['posY','y',100]])$('#'+id).oninput=e=>{state[key]=+e.target.value/divisor;if(id==='zoom')$('#zoomValue').textContent=e.target.value+'%';requestRender();};
  $('#resetCrop').onclick=()=>{state.zoom=1;state.x=state.y=0;$('#zoom').value=100;$('#zoomValue').textContent='100%';$('#posX').value=$('#posY').value=0;requestRender();};
  let coverUploadRequest=0;
  $('#coverInput').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;const request=++coverUploadRequest;e.target.value='';importStatus(1);$('.upload-cover').setAttribute('aria-busy','true');$('#coverUploadStatus').textContent='正在读取 '+file.name+'…';
    try{
      const photo=await readPhoto(file,'cover');if(request!==coverUploadRequest)return;
      state.coverRevision++;state.isDefaultCover=false;state.cover=photo.img;
      syncCoverUpload(photo);syncOverflowControls();$('#resetCrop').click();toast('背景已更新，所有溢出图层和长图照片已保留。');
    }catch(err){if(request===coverUploadRequest){$('#coverUploadStatus').textContent='读取失败 · 点击重试';toast(err.message);}}
    finally{importStatus(-1);if(request===coverUploadRequest)$('.upload-cover').setAttribute('aria-busy','false');}
  };
  for(const side of ['top','bottom'])$('#'+side+'Input').onchange=async e=>{importStatus(1);try{await addPhotos(side,e.target.files);}finally{importStatus(-1);e.target.value='';}};
  $('#paperColor').oninput=e=>{state.paper=e.target.value;state.dirty=true;};
  $('#demoStory').onclick=()=>{const c=state.cells[state.selected];if(c.top.length+c.bottom.length){toast('这格已经有照片，可在空白格中填入示例。');return;}const thumb=demoImage.toDataURL('image/jpeg',.8);c.top.push({img:demoImage,name:'默认封面 · 示例照片',thumb});c.bottom.push({img:demoImage,name:'默认封面 · 示例照片',thumb});state.dirty=true;renderStory();toast('已添加示例，可点击长图预览查看。');};
  $('#backToGrid').onclick=()=>$('.stage').scrollIntoView({behavior:'smooth',block:'start'});$('#helpBtn').onclick=showHelp;$('#compatBtn').onclick=showCompat;$('#momentsBtn').onclick=showMoments;$('#previewStory').onclick=()=>showStory();$('#exportBtn').onclick=showExport;
  $('#closeModal').onclick=()=>{if(!state.busy)$('#modal').close();};$('#modal').addEventListener('close',closeLongEditorSession);$('#modal').addEventListener('cancel',e=>{if(state.busy)e.preventDefault();});$('#modal').onclick=e=>{if(e.target===$('#modal')&&!state.busy){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}};
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
}
function registerAgentTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();for(const tool of [
  {name:'read_collage_state',description:'Read the cover mode, selected tile, and photo counts of the current nine-photo collage.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({mode:state.mode,selectedTile:state.selected+1,tiles:state.cells.map((c,i)=>({tile:i+1,above:c.top.length,below:c.bottom.length}))})},
  {name:'select_collage_tile',description:'Select a tile from 1 to 9 in the editor. Does not export or publish images.',inputSchema:{type:'object',properties:{tile:{type:'integer',minimum:1,maximum:9}},required:['tile'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||!Number.isInteger(input.tile)||input.tile<1||input.tile>9)throw new Error('tile must be an integer from 1 to 9');selectCell(input.tile-1);return {selectedTile:state.selected+1};}}
]){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
async function init(){makeGrids();bind();try{const img=await loadImage('assets/cover-57979.jpg');demoImage=canvas(img.naturalWidth,img.naturalHeight);demoImage.getContext('2d').drawImage(img,0,0);if(state.coverRevision===0){state.cover=demoImage;syncCoverUpload({name:'57979.jpg',thumb:imageThumbnail(demoImage)},true);}composeCover();$$('.cover-cell canvas').forEach((c,i)=>paintTile(c,i));selectCell(4);registerAgentTools();}catch(e){toast(e.message);$('#sourceName').textContent='请上传封面图片';}}
init();
