'use strict';

let longEditorSession = null;
let longEditorRequest = 0;

function closeLongEditorSession() {
  longEditorRequest++;
  if (!longEditorSession) return;
  cancelAnimationFrame(longEditorSession.frame);
  if (longEditorSession.changed) renderStory();
  longEditorSession = null;
}

function longPhotoRegions(cell, width) {
  const geometry = layout(cell,width), regions = [];
  for (const side of ['top','bottom']) {
    let y = side==='top' ? geometry.topStart : geometry.bottomStart;
    cell[side].forEach((photo,index)=>{
      regions.push({key:side+'-'+index,kind:'photo',side,index,photo,y,h:geometry[side].sizes[index],label:t(side==='top'?'上方照片 {number}':'下方照片 {number}', {number:index+1})});
      y += geometry[side].sizes[index]+geometry[side].g;
    });
    const area=geometry.padding[side];
    if(area.h>0) {
      const fill=paddingPhoto(cell,side);
      regions.push({key:'fill-'+side,kind:fill?'fill':'blank',side,photo:fill?.photo,y:area.y,h:area.h,label:side==='top'?t('上方填充图'):t('底部填充图')});
    }
  }
  regions.push({key:'cover',kind:'cover',y:geometry.s,h:width,label:t('九宫格封面 · 位置锁定')});
  return {geometry,regions:regions.sort((a,b)=>a.y-b.y)};
}

async function openLongEditor(index,fromMoments=false) {
  if(state.importing){toast(t('照片读取中，请稍等。'));return;}
  const request=++longEditorRequest,cell=state.cells[index],width=720;
  composeCover();
  let preview;
  try { preview=await renderLong(index,width); }
  catch(error){toast(error.message);return;}
  if(request!==longEditorRequest)return;
  const {geometry,regions}=longPhotoRegions(cell,width),images=new Map();
  try {
    for(const region of regions)if(region.photo&&!images.has(region.photo))images.set(region.photo,region.photo.img||await loadImage(region.photo.src));
  }catch(error){toast(error.message);return;}
  if(request!==longEditorRequest)return;
  const wrap=document.createElement('div');wrap.className='long-editor';
  wrap.innerHTML=`<div class="long-editor-toolbar">
    <div class="long-toolbar-row"><div class="long-mode"><button id="longBrowse" class="active" aria-pressed="true">${t('浏览')}</button><button id="longEditMode" aria-pressed="false">${t('调整照片')}</button></div><span id="longSelectionName">${t('点照片即可调整')}</span><button id="longDownload" class="btn primary small">${t('下载这张')}</button></div>
    <div class="long-toolbar-row long-adjust-controls"><label for="longZoom">${t('缩放')} <output id="longZoomValue">100%</output></label><input id="longZoom" type="range" min="100" max="400" value="100" disabled><button id="longReset" class="btn secondary small" disabled>${t('重置取景')}</button></div>
    <p id="longGestureHint">${t('单指上下滑动浏览；选中照片后，用双指移动或缩放，也可使用缩放滑杆。')}</p>
  </div><div class="long-strip" id="longStrip"></div><div class="long-end"><span>${t('已到长图底部 · {width} × {height} px 预览', {width, height:geometry.h})}</span>${fromMoments?`<button id="longBack" class="text-btn">${t('返回九宫格')}</button>`:''}</div><input id="longFillInput" class="file-input" type="file" accept="image/jpeg,image/png,image/webp">`;
  showModal(t('第 {number} 格 · 长图编辑', {number:index+1}),wrap);
  $('#modal').classList.add('long-editor-modal');
  const strip=$('#longStrip');strip.append(preview);preview.id='longCanvas';
  preview.setAttribute('aria-label',t('完整长图预览'));
  const session={index,cell,regions,images,preview,selected:null,frame:null,changed:false,fillTarget:null,pending:new Set()};
  longEditorSession=session;
  const current=()=>longEditorSession===session&&wrap.isConnected;
  const getEdit=region=>region.kind==='photo'?photoEdit(region.photo):{zoom:1,x:0,y:0,...cell.fillEdits[region.side]};
  function selectRegion(region) {
    if(!current())return;
    if(region?.kind==='cover'){toast(t('封面位置保持锁定，保证朋友圈拼图准确。'));return;}
    if(region?.kind==='blank'){session.fillTarget=region;$('#longFillInput').click();return;}
    session.selected=region;
    strip.classList.toggle('editing',!!region);
    for(const item of regions)item.hit.classList.toggle('selected',item===region);
    $('#longBrowse').classList.toggle('active',!region);$('#longBrowse').setAttribute('aria-pressed',String(!region));
    $('#longEditMode').classList.toggle('active',!!region);$('#longEditMode').setAttribute('aria-pressed',String(!!region));
    $('#longZoom').disabled=!region;$('#longReset').disabled=!region;
    $('#longSelectionName').textContent=region?region.label:t('点照片即可调整');
    $('#longGestureHint').textContent=region?t('已选中照片：单指仍可上下浏览，双指移动或缩放。电脑可用鼠标拖动取景。'):t('单指上下滑动浏览；选中照片后，用双指移动或缩放，也可使用缩放滑杆。');
    const edit=region?getEdit(region):{zoom:1};
    $('#longZoom').value=Math.round(edit.zoom*100);$('#longZoomValue').textContent=Math.round(edit.zoom*100)+'%';
  }
  function redrawRegion(region) {
    if(!current())return;
    const image=images.get(region.photo),edit=getEdit(region),ctx=preview.getContext('2d');
    ctx.fillStyle=state.paper;ctx.fillRect(0,region.y,width,region.h);
    drawCrop(ctx,image,0,region.y,width,region.h,edit.zoom,edit.x,edit.y);
  }
  function applyTransform(transform) {
    const region=session.selected;if(!region||!current())return;
    if(region.kind==='photo')region.photo.edit={...photoEdit(region.photo),...transform};
    else cell.fillEdits[region.side]={...getEdit(region),...transform};
    session.changed=true;state.dirty=true;
    $('#longZoom').value=Math.round(getEdit(region).zoom*100);$('#longZoomValue').textContent=Math.round(getEdit(region).zoom*100)+'%';
    session.pending.add(region);if(session.frame===null)session.frame=requestAnimationFrame(()=>{session.frame=null;for(const item of session.pending)redrawRegion(item);session.pending.clear();});
  }
  for(const region of regions) {
    const hit=document.createElement('div');hit.className='long-region '+region.kind;hit.dataset.key=region.key;
    hit.style.top=(100*region.y/geometry.h)+'%';hit.style.height=(100*region.h/geometry.h)+'%';
    hit.setAttribute('role','button');hit.tabIndex=0;
    hit.setAttribute('aria-label',region.kind==='blank'?t('选择图片填补底部留白'):region.kind==='cover'?region.label:t('{label}，点选后可拖动和缩放', {label:region.label}));
    const label=document.createElement('span');label.className='long-region-label';label.textContent=region.kind==='blank'?t('＋ 选择图片填补留白'):region.label;hit.append(label);
    hit.onkeydown=event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRegion(region);return;}
      if(session.selected!==region||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const edit=getEdit(region),step=event.shiftKey?.1:.025;
      applyTransform({x:clampCrop(edit.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0)),y:clampCrop(edit.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0))});
    };
    hit.onclick=event=>{if(event.detail===0)selectRegion(region);};
    region.hit=hit;strip.append(hit);
  }
  // Touch taps select photos; one-finger swipes always keep native scrolling.
  let browseTap=null;
  strip.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'&&!event.isPrimary){browseTap=null;return;}
    if(event.pointerType==='touch'||!session.selected)browseTap={id:event.pointerId,x:event.clientX,y:event.clientY,target:event.target};
  });
  strip.addEventListener('pointermove',event=>{if(browseTap&&Math.hypot(event.clientX-browseTap.x,event.clientY-browseTap.y)>5)browseTap=null;});
  strip.addEventListener('pointercancel',()=>{browseTap=null;});
  strip.addEventListener('pointerup',event=>{
    if(browseTap?.id===event.pointerId){const hit=browseTap.target.closest('.long-region');browseTap=null;selectRegion(regions.find(region=>region.hit===hit)||null);}
  });
  attachImageGestures(strip,{
    scrollWithOneFinger:true,
    image:()=>session.selected?images.get(session.selected.photo):null,
    frameRect:()=>session.selected?.hit.getBoundingClientRect(),
    read:()=>session.selected?getEdit(session.selected):{zoom:1,x:0,y:0},
    write:applyTransform,zoomRange:()=>[1,4],
    onTap:target=>{const hit=target.closest('.long-region');if(hit)selectRegion(regions.find(region=>region.hit===hit));}
  });
  $('#longBrowse').onclick=()=>selectRegion(null);
  $('#longEditMode').onclick=()=>{
    const region=session.selected||regions.find(region=>region.kind==='photo'||region.kind==='fill');
    if(!region){toast(t('先在这一格添加照片。'));return;}
    selectRegion(region);region.hit.scrollIntoView({block:'center',behavior:'smooth'});
  };
  $('#longZoom').oninput=event=>applyTransform({zoom:Number(event.target.value)/100});
  $('#longReset').onclick=()=>{applyTransform({zoom:1,x:0,y:0});toast(t('已重置这张图片的取景，画框高度保持不变。'));};
  $('#longFillInput').onchange=async event=>{
    const file=event.target.files[0],region=session.fillTarget;if(!file||!region)return;
    importStatus(1);$('#longDownload').disabled=true;
    try {
      const photo=await readPhoto(file),img=await loadImage(photo.src);
      if(cell.fill[region.side]?.src)URL.revokeObjectURL(cell.fill[region.side].src);
      cell.fill[region.side]=photo;cell.fillEdits[region.side]=null;state.dirty=true;session.changed=true;
      if(!current()){if(state.selected===index)renderStory();return;}
      images.set(photo,img);region.photo=photo;region.kind='fill';region.hit.className='long-region fill';
      region.hit.setAttribute('aria-label',t('{label}，点选后可拖动和缩放', {label:region.label}));region.hit.querySelector('span').textContent=region.label;
      redrawRegion(region);selectRegion(region);
    }catch(error){toast(error.message);}
    finally{importStatus(-1);if(current()){$('#longFillInput').value='';$('#longDownload').disabled=false;}}
  };
  $('#longDownload').onclick=async()=>{
    if(state.importing){toast(t('照片读取中，请稍等。'));return;}
    const button=$('#longDownload');button.disabled=true;
    try{composeCover();const output=await renderLong(index,1080);download(await blobFromCanvas(output),`${String(index+1).padStart(2,'0')}-${t('间象')}.jpg`);output.width=output.height=1;toast(t('已按当前调整下载长图。'));}
    catch(error){toast(error.message);}
    finally{if(current())button.disabled=false;}
  };
  if(fromMoments)$('#longBack').onclick=showMoments;
  // Some mobile browsers suppress the first synthetic click just after a drag.
  // Activate toolbar taps on pointerup and ignore only their duplicate native click.
  for(const button of wrap.querySelectorAll('.long-editor-toolbar button')) {
    let tap=null,lastTouchTap=-Infinity;
    button.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')tap={id:event.pointerId,x:event.clientX,y:event.clientY};});
    button.addEventListener('pointercancel',()=>{tap=null;});
    button.addEventListener('pointerup',event=>{
      const valid=tap?.id===event.pointerId&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<8;
      tap=null;
      if(valid&&!button.disabled){lastTouchTap=performance.now();button.click();}
    });
    button.addEventListener('click',event=>{if(event.detail>0&&performance.now()-lastTouchTap<700){event.preventDefault();event.stopImmediatePropagation();}},true);
  }
  $('#modal').scrollTop=0;
}
