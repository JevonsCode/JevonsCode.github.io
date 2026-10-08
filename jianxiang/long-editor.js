'use strict';

let longEditorSession = null;
let longEditorRequest = 0;
let longToolbarTouchUntil = 0;

function closeLongEditorSession() {
  longEditorRequest++;
  if (!longEditorSession) return;
  cancelAnimationFrame(longEditorSession.frame);
  longEditorSession.destroy?.();
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

async function openLongEditor(index,fromMoments=false,restore={}) {
  if(state.importing){toast(t('照片读取中，请稍等。'));return;}
  const request=++longEditorRequest,cell=state.cells[index],width=safeLongWidth(index,720);
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
    <div class="long-toolbar-row"><div class="long-mode"><button id="longBrowse" class="active" aria-pressed="true">${t('浏览')}</button><button id="longEditMode" aria-pressed="false">${t('调整照片')}</button></div><span id="longSelectionName">${t('点照片即可调整')}</span><button id="longLock" class="btn secondary small" aria-pressed="false">${t('锁定')}</button><button id="longDownload" class="btn primary small">${t('下载这张')}</button></div>
    <div class="long-toolbar-row long-adjust-controls"><label for="longZoom">${t('缩放')} <output id="longZoomValue">100%</output></label><input id="longZoom" type="range" min="100" max="400" value="100" disabled><button id="longReset" class="btn secondary small" disabled>${t('重置取景')}</button></div>
    <div class="long-toolbar-row long-order-controls"><button id="longUndo" class="btn secondary small" aria-label="${t('撤销')}" title="${t('撤销')}" disabled>↶</button><button id="longRedo" class="btn secondary small" aria-label="${t('重做')}" title="${t('重做')}" disabled>↷</button><span>${t('照片顺序')}</span><button id="longMoveUp" class="btn secondary small" disabled>${t('上移')}</button><button id="longMoveDown" class="btn secondary small" disabled>${t('下移')}</button><button id="longMoveAcross" class="btn secondary small" disabled>${t('移到封面另一侧')}</button></div>
    <p id="longGestureHint">${t('单指上下滑动浏览；选中照片后，用双指移动或缩放，也可使用缩放滑杆。')}</p>
  </div><div class="long-strip" id="longStrip"></div><div class="long-end"><span>${t('已到长图底部 · {width} × {height} px 预览', {width, height:geometry.h})}</span>${fromMoments?`<button id="longBack" class="text-btn">${t('返回九宫格')}</button>`:''}</div><input id="longFillInput" class="file-input" type="file" accept="image/jpeg,image/png,image/webp">`;
  showModal(t('第 {number} 格 · 长图编辑', {number:index+1}),wrap);
  $('#modal').classList.add('long-editor-modal');
  const strip=$('#longStrip');strip.append(preview);preview.id='longCanvas';
  preview.setAttribute('aria-label',t('完整长图预览'));
  const session={index,cell,regions,images,preview,selected:null,frame:null,changed:false,refreshing:false,fillTarget:null,pending:new Set()};
  longEditorSession=session;
  const current=()=>longEditorSession===session&&wrap.isConnected;
  const locked=()=>isEditorLocked();
  let rangeHistory=false;
  function finishRangeHistory(){if(rangeHistory){rangeHistory=false;historyEnd();}}
  function syncSelectionControls(){
    if(!current())return;
    const region=session.selected,canEdit=!!region&&!locked()&&!session.refreshing,canMove=canEdit&&region.kind==='photo';
    $('#longZoom').disabled=!canEdit;$('#longReset').disabled=!canEdit;
    const history=historyState();$('#longUndo').disabled=locked()||session.refreshing||!history.canUndo;$('#longRedo').disabled=locked()||session.refreshing||!history.canRedo;
    $('#longMoveUp').disabled=!canMove||(region.side==='top'&&region.index===0);
    $('#longMoveDown').disabled=!canMove||(region.side==='bottom'&&region.index===cell.bottom.length-1);
    $('#longMoveAcross').disabled=!canMove;
    $('#longMoveAcross').textContent=region?.side==='top'?t('移到封面下方'):region?.side==='bottom'?t('移到封面上方'):t('移到封面另一侧');
    $('#longLock').textContent=t(locked()?'解锁':'锁定');
    $('#longLock').setAttribute('aria-pressed',String(locked()));
    $('#longLock').setAttribute('aria-label',t(locked()?'解锁编辑':'锁定，防止误触'));
    wrap.classList.toggle('editor-locked',locked());
    for(const handle of strip.querySelectorAll('[data-story-drag]'))handle.disabled=locked()||session.refreshing;
    $('#longGestureHint').textContent=locked()?t('已锁定，可浏览和下载；解锁后继续调整。'):t('单指滑动浏览，双指调整照片；拖动右上角手柄可跨封面排序。');
  }
  async function refreshEditor(selected=session.selected?.photo){
    if(!current())return;
    finishRangeHistory();session.refreshing=true;syncSelectionControls();
    await openLongEditor(index,fromMoments,{scrollTop:$('#modal').scrollTop,selectedPhoto:selected,selectedSide:session.selected?.side,selectedIndex:session.selected?.index});
    if(current()){session.refreshing=false;syncSelectionControls();}
  }
  async function reorder(fromSide,fromIndex,toSide,toIndex){
    if(locked()||session.refreshing||!current())return;
    const selected=cell[fromSide][fromIndex];
    if(moveStoryPhoto(index,fromSide,fromIndex,toSide,toIndex)===false)return;
    await refreshEditor(selected);
  }
  const getEdit=region=>region.kind==='photo'?photoEdit(region.photo):{zoom:1,x:0,y:0,...cell.fillEdits[region.side]};
  function selectRegion(region) {
    if(!current())return;
    if(region?.kind==='cover'){toast(t('封面位置保持锁定，保证朋友圈拼图准确。'));return;}
    if(region?.kind==='blank'){if(locked())return;session.fillTarget=region;$('#longFillInput').click();return;}
    session.selected=region;
    strip.classList.toggle('editing',!!region);
    for(const item of regions)item.hit.classList.toggle('selected',item===region);
    $('#longBrowse').classList.toggle('active',!region);$('#longBrowse').setAttribute('aria-pressed',String(!region));
    $('#longEditMode').classList.toggle('active',!!region);$('#longEditMode').setAttribute('aria-pressed',String(!!region));
    syncSelectionControls();
    $('#longSelectionName').textContent=region?region.label:t('点照片即可调整');
    const edit=region?getEdit(region):{zoom:1};
    $('#longZoom').value=Math.round(edit.zoom*100);$('#longZoomValue').textContent=Math.round(edit.zoom*100)+'%';
  }
  function redrawRegion(region) {
    if(!current())return;
    const image=images.get(region.photo),edit=getEdit(region),ctx=preview.getContext('2d');
    ctx.fillStyle=state.paper;ctx.fillRect(0,region.y,width,region.h);
    drawCrop(ctx,image,0,region.y,width,region.h,edit.zoom,edit.x,edit.y);
    drawLongCover(ctx,index,width,geometry);
  }
  function applyTransform(transform) {
    const region=session.selected;if(!region||!current()||locked()||session.refreshing)return;
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
    if(region.kind==='photo'){
      const handle=document.createElement('button');handle.className='story-drag-handle long-drag-handle';handle.dataset.storyDrag='';
      handle.type='button';handle.textContent='⠿';handle.setAttribute('aria-label',t('拖动 {name} 调整顺序',{name:region.label}));handle.title=t('拖动排序，可移到封面上方或下方');
      hit.append(handle);
    }
    hit.onkeydown=event=>{
      if(event.target.closest('[data-story-drag]'))return;
      if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRegion(region);return;}
      if(locked()||session.selected!==region||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const edit=getEdit(region),step=event.shiftKey?.1:.025;
      applyTransform({x:clampCrop(edit.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0)),y:clampCrop(edit.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0))});historyCheckpoint('调整长图照片');
    };
    hit.onclick=event=>{if(event.detail===0)selectRegion(region);};
    region.hit=hit;strip.append(hit);
  }
  const destroyReorder=attachStoryReorder(strip,{
    items:()=>regions.filter(region=>region.kind==='photo').map(region=>({element:region.hit,side:region.side,index:region.index})),
    zones:()=>['top','bottom'].map(side=>({side,rect:()=>{
      const box=strip.getBoundingClientRect(),scale=box.height/geometry.h;
      const top=side==='top'?box.top:box.top+(geometry.s+width)*scale;
      const height=Math.max(20,geometry.s*scale);
      return {left:box.left,right:box.right,width:box.width,top,bottom:top+height,height};
    }})),
    locked:()=>locked()||session.refreshing,scrollElement:$('#modal'),move:reorder,
    onStart:item=>selectRegion(regions.find(region=>region.hit===item.element))
  });
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
  const destroyGestures=attachImageGestures(strip,{
    scrollWithOneFinger:true,
    image:()=>session.selected&&!locked()&&!session.refreshing?images.get(session.selected.photo):null,
    historyLabel:'调整长图照片',
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
  $('#longZoom').oninput=event=>{if(locked())return;if(!rangeHistory){historyBegin('调整长图照片');rangeHistory=true;}applyTransform({zoom:Number(event.target.value)/100});};
  $('#longZoom').onchange=finishRangeHistory;
  $('#longZoom').addEventListener('blur',finishRangeHistory);
  $('#longReset').onclick=()=>{if(locked())return;applyTransform({zoom:1,x:0,y:0});historyCheckpoint('重置长图照片');toast(t('已重置这张图片的取景，画框高度保持不变。'));};
  $('#longFillInput').onchange=async event=>{
    const file=event.target.files[0],region=session.fillTarget;if(!file||!region||locked())return;
    importStatus(1);$('#longDownload').disabled=true;
    try {
      const photo=await readPhoto(file),img=await loadImage(photo.src);
      if(locked()||state.cells[index]!==cell)return;
      cell.fill[region.side]=photo;cell.fillEdits[region.side]=null;state.dirty=true;session.changed=true;historyCheckpoint('添加填充照片');
      if(!current()){if(state.selected===index)renderStory();return;}
      images.set(photo,img);region.photo=photo;region.kind='fill';region.hit.className='long-region fill';
      region.hit.setAttribute('aria-label',t('{label}，点选后可拖动和缩放', {label:region.label}));region.hit.querySelector('span').textContent=region.label;
      redrawRegion(region);selectRegion(region);
    }catch(error){toast(error.message);}
    finally{importStatus(-1);if(current()){$('#longFillInput').value='';$('#longDownload').disabled=false;}}
  };
  $('#longUndo').onclick=()=>{if(!locked()){finishRangeHistory();historyUndo();}};
  $('#longRedo').onclick=()=>{if(!locked()){finishRangeHistory();historyRedo();}};
  $('#longLock').onclick=()=>{finishRangeHistory();toggleEditorLock();};
  $('#longMoveAcross').onclick=()=>{const r=session.selected;if(r?.kind==='photo')reorder(r.side,r.index,r.side==='top'?'bottom':'top',r.side==='top'?0:cell.top.length);};
  $('#longMoveUp').onclick=()=>{const r=session.selected;if(r?.kind!=='photo')return;if(r.index>0)reorder(r.side,r.index,r.side,r.index-1);else if(r.side==='bottom')reorder(r.side,r.index,'top',cell.top.length);};
  $('#longMoveDown').onclick=()=>{const r=session.selected;if(r?.kind!=='photo')return;if(r.index<cell[r.side].length-1)reorder(r.side,r.index,r.side,r.index+2);else if(r.side==='top')reorder(r.side,r.index,'bottom',0);};
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
    let tap=null;
    button.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')tap={id:event.pointerId,x:event.clientX,y:event.clientY};});
    button.addEventListener('pointercancel',()=>{tap=null;});
    button.addEventListener('pointerup',event=>{
      const valid=tap?.id===event.pointerId&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<8;
      tap=null;
      if(valid&&!button.disabled){longToolbarTouchUntil=performance.now()+700;button.click();}
    });
    button.addEventListener('click',event=>{if(event.detail>0&&performance.now()<longToolbarTouchUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  }
  const onLock=()=>{finishRangeHistory();syncSelectionControls();};
  const onRestore=()=>refreshEditor();
  document.addEventListener('historychange',syncSelectionControls);
  document.addEventListener('editorlockchange',onLock);
  document.addEventListener('projectrestored',onRestore);
  document.addEventListener('projectresume',onRestore);
  session.destroy=()=>{document.removeEventListener('historychange',syncSelectionControls);finishRangeHistory();destroyReorder();destroyGestures?.();document.removeEventListener('editorlockchange',onLock);document.removeEventListener('projectrestored',onRestore);document.removeEventListener('projectresume',onRestore);};
  const previous=restore.selectedPhoto;
  const selected=previous&&regions.find(region=>region.kind==='photo'&&(region.photo===previous||(previous.src&&region.photo.src===previous.src)))||regions.find(region=>previous&&region.side===restore.selectedSide&&region.index===restore.selectedIndex);
  selectRegion(selected||null);
  $('#modal').scrollTop=restore.scrollTop||0;
}
