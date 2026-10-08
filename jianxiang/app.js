'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const assetBlobs = new WeakMap();
const state = { cover:null, selected:4, mode:'classic', gridGap:4, thumbWidth:90, dragLayer:'cover', zoom:1, x:0, y:0, paper:'#ffffff', cells:Array.from({length:9},()=>({top:[],bottom:[],fill:{top:null,bottom:null},fillEdits:{top:null,bottom:null}})), busy:false, importing:0, dirty:false, isDefaultCover:true, coverRevision:0, defaultsInitialized:false, overflowBackground:null, overlayLayers:[], activeOverlayId:null };
state.overflowSelection=Array.from({length:9},(_,i)=>i);
state.locked=false;state.restoring=true;state.coverAsset=null;
state.overflowCells=Array.from({length:9},()=>({enabled:true,insets:{top:.1,right:.1,bottom:.1,left:.1}}));
const cover = document.createElement('canvas'); cover.width=cover.height=3240;
let demoImage, toastTimer, renderFrame;
function toast(message){ $('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000); }
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(t("图片无法读取，请换一张 JPG、PNG 或 WebP 图片。")));img.src=src;});}
async function readPhoto(file, purpose='photo'){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(t("请选择 JPG、PNG 或 WebP 图片；HEIC 请先转为 JPG。"));
  const url=URL.createObjectURL(file);
  try{const img=await loadImage(url);if(img.naturalWidth*img.naturalHeight>60000000)throw new Error(t("图片像素过大，请缩小到 6000 × 6000 以内。"));
    const limit=purpose==='cover'?3240:purpose==='overlay'?2400:1600,scale=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));
    const c=canvas(Math.max(1,Math.round(img.naturalWidth*scale)),Math.max(1,Math.round(img.naturalHeight*scale)));
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const thumb=imageThumbnail(c,144,purpose==='overlay'),width=c.width,height=c.height;
    const blob=await blobFromCanvas(c,purpose==='overlay'?'image/png':'image/webp',.96),src=URL.createObjectURL(blob);
    c.width=c.height=1;
    // Keep encoded image data: a canvas backing store can be discarded on mobile.
    const stableImage=await loadImage(src);assetBlobs.set(stableImage,blob);
    return {img:stableImage,src,width,height,name:file.name,thumb};
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
function repaintProject(){composeCover();$$('.cover-cell canvas').forEach((c,i)=>paintTile(c,i));paintTile($('#selectedCanvas'),state.selected);}
function requestRender(){cancelAnimationFrame(renderFrame);renderFrame=requestAnimationFrame(repaintProject);state.dirty=true;}
function selectCell(i){state.selected=i;$$('.cover-cell,.mini-cell').forEach(b=>{const active=+b.dataset.index===i;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('#selectedLabel').textContent=String(i+1).padStart(2,'0');paintTile($('#selectedCanvas'),i);renderStory();}
function makeGrids(){for(let i=0;i<9;i++){
  const b=document.createElement('button');b.className='cover-cell';b.dataset.index=i;b.setAttribute('aria-label',t('编辑第 {index} 格的长图',{index:i+1}));const c=canvas(420,420);b.append(c);const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');b.append(n);b.onclick=()=>{if(Date.now()<coverGestureUntil)return;selectCell(i);if(innerWidth<=620)$('.story').scrollIntoView({behavior:'smooth',block:'start'});};$('#coverGrid').append(b);
  const m=document.createElement('button');m.className='mini-cell';m.dataset.index=i;m.setAttribute('aria-label',t('选择第 {index} 格',{index:i+1}));m.textContent=i+1;m.onclick=()=>selectCell(i);$('#miniGrid').append(m);
}}
function setMode(mode){if(isEditorLocked())return;if(!['classic','overflow'].includes(mode))throw new Error(t("不支持的模式"));state.mode=mode;$$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('#overflowControls').hidden=mode!=='overflow';$('#modeLabel').textContent=mode==='classic'?t("经典九宫格"):t("溢出拼贴");syncOverflowControls();syncDragLayers();requestRender();if(mode==='overflow'&&!state.defaultsInitialized)ensureDefaultOverflow();else historyCheckpoint('切换封面模式');}
function renderStory(){
  const cell=state.cells[state.selected];
  for(const side of ['top','bottom']){
    const list=$('#'+side+'List');list.replaceChildren();$('#'+side+'Count').textContent=t('{count} 张',{count:cell[side].length});
    cell[side].forEach((photo,i)=>{
      const row=document.createElement('div');row.className='photo-row';row.dataset.side=side;row.dataset.index=i;
      const handle=document.createElement('button');handle.className='story-drag-handle';handle.dataset.storyDrag='';handle.textContent='⠿';handle.setAttribute('aria-label',t('拖动 {name} 调整顺序',{name:displayPhotoName(photo)}));handle.title=t('拖动排序，可移到封面上方或下方');
      const img=document.createElement('img');img.src=photo.thumb;img.alt='';
      const name=document.createElement('span');name.className='photo-title';name.textContent=displayPhotoName(photo);
      const editButton=document.createElement('button');editButton.className='photo-adjust';editButton.textContent=t('调整');editButton.setAttribute('aria-label',t('调整 {name}',{name:displayPhotoName(photo)}));editButton.onclick=()=>openPhotoEditor(state.selected,side,i);
      row.append(handle,img,name,editButton);const actions=document.createElement('div');actions.className='photo-actions';
      const other=side==='top'?'bottom':'top';
      for(const [symbol,title,act,disabled] of [
        ['↑',t('上移'),()=>movePhoto(side,i,-1),side==='top'&&i===0],
        ['↓',t('下移'),()=>movePhoto(side,i,1),side==='bottom'&&i===cell[side].length-1],
        ['⇄',t(side==='top'?'移到封面下方':'移到封面上方'),()=>moveStoryPhoto(state.selected,side,i,other,side==='top'?0:cell.top.length),false],
        ['×',t('删除'),()=>{if(isEditorLocked())return;cell[side].splice(i,1);state.dirty=true;renderStory();historyCheckpoint('删除照片');},false]
      ]){const button=document.createElement('button');button.textContent=symbol;button.title=title;button.setAttribute('aria-label',title+' '+displayPhotoName(photo));button.disabled=disabled;button.onclick=act;actions.append(button);}
      row.append(actions);list.append(row);
    });
    if(!cell[side].length){const empty=document.createElement('div');empty.className='story-drop-empty';empty.textContent=t('可将照片拖到这里');list.append(empty);}
  }
  let filled=0;state.cells.forEach((c,i)=>{const has=c.top.length+c.bottom.length>0;if(has)filled++;const b=$$('.mini-cell')[i];b.querySelector('.has-content')?.remove();if(has){const dot=document.createElement('i');dot.className='has-content';b.append(dot);}});$('#filledCount').textContent=filled+' / 9';
  const w=safeLongWidth(state.selected,720),l=layout(cell,w);
  $('#balanceHint').textContent=cell.top.length+cell.bottom.length?t('长图约 {width} × {height} 像素 · 封面保持居中。',{width:w,height:l.h}):t('照片数量不限，可拖到封面上方或下方。');
  renderPaddingControls(cell,l);syncEditorControlAvailability();
}
function importStatus(delta){state.importing=Math.max(0,state.importing+delta);if(state.importing===0)historyFlushPending();$('#exportBtn').disabled=state.importing>0||state.restoring;$('#exportBtn').innerHTML=`<span aria-hidden="true">${state.importing?'…':'↓'}</span> ${t(state.importing?'正在读取照片':'导出 9 张长图')}`;refreshHistoryUI();syncEditorControlAvailability();refreshProjectFileUI();}
function moveStoryPhoto(cellIndex,fromSide,fromIndex,toSide,toIndex){
  if(isEditorLocked()||!['top','bottom'].includes(fromSide)||!['top','bottom'].includes(toSide))return false;
  const cell=state.cells[cellIndex],source=cell?.[fromSide],target=cell?.[toSide];
  if(!source||!Number.isInteger(fromIndex)||fromIndex<0||fromIndex>=source.length||!Number.isInteger(toIndex))return false;
  let insertion=Math.max(0,Math.min(target.length,toIndex));if(source===target&&fromIndex<insertion)insertion--;
  if(source===target&&insertion===fromIndex)return false;
  const [photo]=source.splice(fromIndex,1);target.splice(insertion,0,photo);state.dirty=true;renderStory();historyCheckpoint('移动照片');return true;
}
function movePhoto(side,i,delta){
  const cell=state.cells[state.selected],next=i+delta;
  if(next<0&&side==='bottom')return moveStoryPhoto(state.selected,side,i,'top',cell.top.length);
  if(next>=cell[side].length&&side==='top')return moveStoryPhoto(state.selected,side,i,'bottom',0);
  return moveStoryPhoto(state.selected,side,i,side,delta>0?i+2:i-1);
}
async function addPhotos(side,files){
  if(isEditorLocked())return;
  const selected=state.selected,cell=state.cells[selected],chosen=[...files],errors=[];
  for(const file of chosen){try{const photo=await readPhoto(file);if(state.cells[selected]===cell)cell[side].push(photo);}catch(error){errors.push(error.message);}}
  state.dirty=true;renderStory();if(errors.length)toast(errors[0]);
}
// Preserve each frame's aspect ratio. Very long exports adapt their resolution to mobile canvas limits.
function photoEdit(photo){return {zoom:1,x:0,y:0,frame:null,...photo.edit};}
function photoAspect(photo,edit=photoEdit(photo)){return edit.frame||(photo.height||photo.img.height)/(photo.width||photo.img.width);}
function layout(cell,w,override=null){
  const gap=Math.round(w*.016);
  const side=(photos)=>{
    const natural=photos.map(p=>w*photoAspect(p,override?.photo===p?override.edit:photoEdit(p)));
    const scale=1;
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
function safeLongWidth(index,requested=720){
  let width=Math.max(1,Math.floor(requested));
  for(let attempt=0;attempt<12;attempt++){
    const height=layout(state.cells[index],width).h;
    if(height<=32760&&width*height<=16000000)return width;
    width=Math.max(1,Math.floor(width*Math.min(32700/height,Math.sqrt(15900000/(width*height)))*.995));
  }
  return width;
}
function drawLongCover(ctx,index,w,l){
  // Duplicate edge pixels outside the exact centered square. JPEG chroma blocks
  // can otherwise carry adjacent photo colors 1–2 pixels into its white edges.
  if(l.s>0){
    const tile=canvas(w,w);drawTile(tile.getContext('2d'),index,0,0,w);
    const bleed=Math.min(16,l.s);ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(tile,0,0,w,1,0,l.s-bleed,w,bleed);
    ctx.drawImage(tile,0,w-1,w,1,0,l.s+w,w,bleed);ctx.restore();tile.width=tile.height=1;
  }
  drawTile(ctx,index,0,l.s,w);
}
async function renderLong(index,w=720){
  w=safeLongWidth(index,w);
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
  drawLongCover(ctx,index,w,l);
  return c;
}
function blobFromCanvas(c,type='image/jpeg',quality=.94){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error(t("导出失败，请尝试 720 像素。"))),type,quality));}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function showModal(title,body){closePhotoEditorSession();closeLongEditorSession();$('#modal').classList.remove('long-editor-modal');$('#modalTitle').textContent=title;$('#modalBody').replaceChildren();if(typeof body==='string')$('#modalBody').innerHTML=body;else $('#modalBody').append(body);if(!$('#modal').open)$('#modal').showModal();}
async function showStory(index=state.selected,fromMoments=false){return openLongEditor(index,fromMoments);}
// ZIP (store method), UTF-8 file names, CRC-32. No external service or dependency.
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function createZip(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0,total=0;for(const f of files){const name=enc.encode(f.name),data=f.data,crc=crc32(data);const local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);parts.push(local,data);const cd=new Uint8Array(46+name.length),d=new DataView(cd.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);cd.set(name,46);central.push(cd);offset+=local.length+data.length;total+=cd.length;}
  const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,total,true);e.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
function showExport(){
  const filled=state.cells.filter(c=>c.top.length+c.bottom.length).length,photos=state.cells.reduce((n,c)=>n+c.top.length+c.bottom.length,0);
  showModal(t('导出你的九宫格'),`<div class="modal-content"><div class="export-summary"><div><strong>9</strong><span>${t('张封面')}</span></div><div><strong>${filled}</strong><span>${t('格含额外照片')}</span></div><div><strong>${photos}</strong><span>${t('张添加的照片')}</span></div></div><label class="export-select" for="exportSize">${t('每张图片宽度')}<select id="exportSize"><option value="1080">${t('1080 px · 高清')}</option><option value="720">${t('720 px · 轻量')}</option></select></label><div class="callout">${filled<9?t('还有 {count} 格没有额外照片，会导出为方形封面。',{count:9-filled})+'<br>':''}${t('下载后解压，按 01–09 的顺序选图发布。建议先发「仅自己可见」检查效果。')}<br>${t('超长图会自动降低输出宽度，以保留全部照片。')}</div><div class="modal-actions"><button id="downloadZip" class="btn primary">${t('下载 9 张图片（ZIP）')}</button></div><p id="exportStatus" class="preview-caption" role="status" style="margin-top:12px;margin-bottom:0"></p></div>`);
  $('#downloadZip').onclick=exportAll;
}
async function exportAll(){if(state.busy)return;if(state.importing){toast(t("照片仍在读取，请稍后再导出。"));return;}state.busy=true;const button=$('#downloadZip'),status=$('#exportStatus'),w=+$('#exportSize').value;button.disabled=true;$('#closeModal').disabled=true;
  try{composeCover();const files=[];for(let i=0;i<9;i++){status.textContent=t('正在生成第 {index} / 9 张…',{index:i+1});await new Promise(resolve=>requestAnimationFrame(resolve));const c=await renderLong(i,w);const blob=await blobFromCanvas(c);files.push({name:`${String(i+1).padStart(2,'0')}.jpg`,data:new Uint8Array(await blob.arrayBuffer())});c.width=c.height=1;}
    download(createZip(files),t("间象-01至09.zip"));status.textContent=t("9 张图片已生成。请在下载文件夹解压后，按编号保存并发布。");button.textContent=t("再次下载");state.dirty=false;toast(t("已打包完成，按 01–09 顺序发布即可。"));
  }catch(e){status.textContent=e.message||t("导出失败，请尝试 720 像素。");}finally{state.busy=false;button.disabled=false;$('#closeModal').disabled=false;}
}
function bind(){
  bindWorkspaceUI();bindSavedProjects();bindBugReport();bindPaddingInputs();bindOverflowEditor();bindCoverGestures();
  for(const [id,key,min,max] of [['gridGap','gridGap',0,30],['thumbWidth','thumbWidth',40,500]])$('#'+id).addEventListener('input',e=>{if(isEditorLocked())return;const value=Number(e.target.value);if(e.target.value===''||!Number.isFinite(value)||value<min||value>max){e.target.setCustomValidity(t('请输入 {min}–{max} 之间的数值',{min,max}));return;}e.target.setCustomValidity('');state[key]=value;$('#gapSummary').textContent=state.gridGap+' px';requestRender();});
  $$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  for(const [id,key,divisor] of [['zoom','zoom',100],['posX','x',100],['posY','y',100]])$('#'+id).oninput=e=>{if(isEditorLocked())return;state[key]=+e.target.value/divisor;if(id==='zoom')$('#zoomValue').textContent=e.target.value+'%';requestRender();};
  $('#resetCrop').onclick=()=>{if(isEditorLocked())return;state.zoom=1;state.x=state.y=0;$('#zoom').value=100;$('#zoomValue').textContent='100%';$('#posX').value=$('#posY').value=0;requestRender();historyCheckpoint('重置封面');};
  let coverUploadRequest=0;
  $('#coverInput').onchange=async e=>{
    const file=e.target.files[0];if(!file||isEditorLocked())return;const request=++coverUploadRequest;e.target.value='';importStatus(1);$('.upload-cover').setAttribute('aria-busy','true');$('#coverUploadStatus').textContent=t('正在读取 {name}…',{name:file.name});
    try{
      const photo=await readPhoto(file,'cover');if(request!==coverUploadRequest)return;
      state.coverRevision++;state.isDefaultCover=false;state.cover=photo.img;state.coverAsset=photo;
      syncCoverUpload(photo);state.zoom=1;state.x=state.y=0;$('#zoom').value=100;$('#zoomValue').textContent='100%';$('#posX').value=$('#posY').value=0;syncOverflowControls();requestRender();toast(t("背景已更新，所有溢出图层和长图照片已保留。"));
    }catch(err){if(request===coverUploadRequest){$('#coverUploadStatus').textContent=t("读取失败 · 点击重试");toast(err.message);}}
    finally{importStatus(-1);if(request===coverUploadRequest){$('.upload-cover').setAttribute('aria-busy','false');historyCheckpoint('更换封面');}}
  };
  for(const side of ['top','bottom'])$('#'+side+'Input').onchange=async e=>{importStatus(1);try{await addPhotos(side,e.target.files);}finally{importStatus(-1);e.target.value='';historyCheckpoint('添加照片');}};
  $('#paperColor').oninput=e=>{if(isEditorLocked())return;state.paper=e.target.value;state.dirty=true;};
  $('#demoStory').onclick=()=>{if(isEditorLocked())return;const c=state.cells[state.selected];if(c.top.length+c.bottom.length){toast(t("这格已经有照片，可在空白格中填入示例。"));return;}const thumb=imageThumbnail(demoImage);c.top.push({img:demoImage,name:'默认封面 · 示例照片',nameKey:'默认封面 · 示例照片',thumb});c.bottom.push({img:demoImage,name:'默认封面 · 示例照片',nameKey:'默认封面 · 示例照片',thumb});state.dirty=true;renderStory();historyCheckpoint("添加示例照片");toast(t("已添加示例，可点击长图预览查看。"));};
  $('#backToGrid').onclick=()=>$('.stage').scrollIntoView({behavior:'smooth',block:'start'});$('#helpBtn').onclick=showHelp;$('#compatBtn').onclick=showCompat;$('#momentsBtn').onclick=showMoments;$('#previewStory').onclick=()=>showStory();$('#exportBtn').onclick=showExport;
  $('#closeModal').onclick=()=>{if(!state.busy)$('#modal').close();};$('#modal').addEventListener('close',()=>{if(!$('#modal').open){closePhotoEditorSession();closeLongEditorSession();}});$('#modal').addEventListener('cancel',e=>{if(state.busy)e.preventDefault();});$('#modal').onclick=e=>{if(e.target===$('#modal')&&!state.busy){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}};
  bindLocaleAndShare();
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
}
function registerAgentTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();for(const tool of [
  {name:'read_collage_state',description:'Read the cover mode, selected tile, and photo counts of the current nine-photo collage.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({mode:state.mode,selectedTile:state.selected+1,tiles:state.cells.map((c,i)=>({tile:i+1,above:c.top.length,below:c.bottom.length}))})},
  {name:'select_collage_tile',description:'Select a tile from 1 to 9 in the editor. Does not export or publish images.',inputSchema:{type:'object',properties:{tile:{type:'integer',minimum:1,maximum:9}},required:['tile'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||!Number.isInteger(input.tile)||input.tile<1||input.tile>9)throw new Error('tile must be an integer from 1 to 9');selectCell(input.tile-1);return {selectedTile:state.selected+1};}}
]){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
async function init(){
  I18n.apply();makeGrids();bind();$('.editor').inert=true;$('#previewStory').disabled=true;
  try{
    demoImage=await loadImage('assets/cover-57979.jpg');
    state.cover=demoImage;state.coverAsset={img:demoImage,src:demoImage.src,width:demoImage.width,height:demoImage.height,name:'57979.jpg',thumb:imageThumbnail(demoImage)};
    syncCoverUpload(state.coverAsset,true);
    const restored=await initializeProjectStorage();
    historyInit(restored.restored?'恢复的作品':'初始状态');
    state.dirty=false;refreshProjectUI();registerAgentTools();
  }catch(error){toast(error.message);$('#sourceName').textContent=t('请上传封面图片');historyInit();}
  finally{state.restoring=false;$('.editor').inert=false;$('#previewStory').disabled=false;importStatus(0);refreshSaveUI();syncEditorControlAvailability();refreshProjectFileUI();}
}
init();
