'use strict';

const overflowEdges=['top','right','bottom','left'];
let overflowLayerSerial=0,defaultOverflowPromise=null,layerSelectionRevision=0,coverUploadDetails=null,defaultLayersStatusKey=null;
function overflowLayerName(layer){return layer.nameKey?t(layer.nameKey):layer.name;}
function overflowCellList(indexes){return indexes.join(t('、'));}
const allOverflowCells=()=>Array.from({length:9},(_,i)=>i);
function overflowInsets(cell){return Object.fromEntries(overflowEdges.map(edge=>[edge,clampCrop(cell?.insets?.[edge]??.1,0,.4)]));}
function selectedOverflowCells(){return state.overflowSelection.map(index=>state.overflowCells[index]);}
function activeOverflowLayer(){return state.overlayLayers.find(layer=>layer.id===state.activeOverlayId)||null;}
function selectedLayerTransforms(layer=activeOverflowLayer()){
  return layer?state.overflowSelection.filter(i=>state.overflowCells[i].enabled&&layer.cells[i]).map(i=>layer.cells[i]):[];
}
function activeOverflowFigure(){
  const layer=activeOverflowLayer(),transform=selectedLayerTransforms(layer)[0];
  return layer?.visible&&overflowImageReady(layer.image)&&transform?{image:layer.image,...transform}:null;
}
// Bounds and read errors are runtime metadata, never part of a user's artwork.
const overflowBoundsCache=new WeakMap(),overflowReadErrors=new WeakMap(),overflowReloads=new WeakMap();
function overflowImageReady(image){return !!(image&&image.width>0&&image.height>0&&(!(image instanceof HTMLImageElement)||(image.complete&&image.naturalWidth>0&&image.naturalHeight>0)));}
function overflowContentBounds(image){
  if(!overflowImageReady(image))return null;
  if(overflowBoundsCache.has(image))return overflowBoundsCache.get(image);
  const scale=Math.min(1,256/Math.max(image.width,image.height)),probe=canvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale))),ctx=probe.getContext('2d',{willReadFrequently:true});
  try{
    ctx.drawImage(image,0,0,probe.width,probe.height);
    const pixels=ctx.getImageData(0,0,probe.width,probe.height).data;let left=probe.width,top=probe.height,right=-1,bottom=-1;
    for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(pixels[(y*probe.width+x)*4+3]>=8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    const bounds=right<left?{x:0,y:0,w:0,h:0}:{x:left/probe.width,y:top/probe.height,w:(right-left+1)/probe.width,h:(bottom-top+1)/probe.height};
    overflowBoundsCache.set(image,bounds);return bounds;
  }catch{return null;}finally{probe.width=probe.height=1;}
}
function overflowEffectiveBounds(image,transform,geometry,bounds=overflowContentBounds(image)){
  if(!bounds||!transform||![transform.x,transform.y,transform.scale].every(Number.isFinite)||transform.scale<=0)return null;
  const width=geometry.size*transform.scale,height=width*image.height/image.width;
  return {x:transform.x*geometry.size+(bounds.x-.5)*width,y:transform.y*geometry.size+(bounds.y-.5)*height,w:bounds.w*width,h:bounds.h*height};
}
function overflowBoundsIntersectTile(bounds,index,geometry){
  if(!bounds||bounds.w<=0||bounds.h<=0)return false;
  const x=index%3*(geometry.tile+geometry.gap),y=Math.floor(index/3)*(geometry.tile+geometry.gap);
  return bounds.x<x+geometry.tile&&bounds.y<y+geometry.tile&&bounds.x+bounds.w>x&&bounds.y+bounds.h>y;
}
function overflowLayerCondition(layer,geometry=gridGeometry()){
  if(!layer.visible)return 'hidden';
  if(layer.loading||overflowReloads.has(layer))return 'loading';
  if(!overflowImageReady(layer.image)||overflowReadErrors.has(layer))return 'unavailable';
  const bounds=overflowContentBounds(layer.image);
  if(bounds&&(!bounds.w||!bounds.h))return 'empty';
  const enabled=layer.cells.flatMap((transform,index)=>transform&&state.overflowCells[index].enabled?[index]:[]);
  if(!enabled.length)return 'disabled';
  if(bounds&&!enabled.some(index=>overflowBoundsIntersectTile(overflowEffectiveBounds(layer.image,layer.cells[index],geometry,bounds),index,geometry)))return 'outside';
  return 'ready';
}
// Diagnostic data deliberately excludes image pixels, names, sources and URLs.
function overflowLayerDiagnostics(){
  const geometry=gridGeometry(),round=value=>Number.isFinite(value)?Math.round(value*10000)/10000:null;
  return state.overlayLayers.map((layer,index)=>{
    const image=layer.image,bounds=overflowContentBounds(image);
    return {index,kind:layer.kind,active:layer.id===state.activeOverlayId,visible:!!layer.visible,loading:!!layer.loading,condition:overflowLayerCondition(layer,geometry),image:{present:!!image,ready:overflowImageReady(image),width:image?.width||0,height:image?.height||0,complete:image instanceof HTMLImageElement?image.complete:null,hasRecoverableBlob:!!(image&&typeof assetBlobs!=='undefined'&&assetBlobs.has(image))},contentBounds:bounds,cells:layer.cells.map((transform,tile)=>{
      if(!transform)return null;
      const effective=overflowEffectiveBounds(image,transform,geometry,bounds);
      return {tile:tile+1,enabled:!!state.overflowCells[tile].enabled,x:round(transform.x),y:round(transform.y),scale:round(transform.scale),effectiveBounds:effective?Object.fromEntries(Object.entries(effective).map(([key,value])=>[key,round(value/geometry.size)])):null,intersectsTile:overflowBoundsIntersectTile(effective,tile,geometry)};
    })};
  });
}
function defaultOverflowSource(layer){
  if(layer.kind!=='default')return null;
  if(layer.nameKey==='呐喊人物 · 默认'||layer.name==='呐喊人物 · 默认')return 'assets/overflow-person.png';
  if(layer.nameKey==='DEATH SCREAMING · 默认文字'||layer.name==='DEATH SCREAMING · 默认文字')return 'assets/overflow-title.png';
  return null;
}
function overflowReadWithTimeout(promise,milliseconds=8000){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('image-read-timeout')),milliseconds);})]).finally(()=>clearTimeout(timer));
}
async function reloadOverflowLayerImage(layer,{force=false}={}){
  if(!state.overlayLayers.includes(layer)||layer.loading)return false;
  if(overflowReloads.has(layer))return overflowReloads.get(layer);
  const currentImage=layer.image;
  if(!force&&overflowImageReady(currentImage)&&!overflowReadErrors.has(layer))return true;
  const task=(async()=>{
    try{
      // decode() restores discarded decoded resources without changing positions
      // or replacing immutable asset identities used by undo and local drafts.
      if(overflowImageReady(currentImage)&&currentImage instanceof HTMLImageElement&&!overflowReadErrors.has(layer)){
        try{await overflowReadWithTimeout(currentImage.decode(),3000);if(state.overlayLayers.includes(layer)&&layer.image===currentImage){overflowReadErrors.delete(layer);return true;}}catch{}
      }
      const blob=currentImage&&typeof assetBlobs!=='undefined'?assetBlobs.get(currentImage):null;
      const source=blob?URL.createObjectURL(blob):currentImage?.currentSrc||currentImage?.src||defaultOverflowSource(layer);
      if(!source)throw new Error('missing-source');
      let image,usedBlob=blob;
      try{image=await overflowReadWithTimeout(loadImage(source));}
      catch(error){const fallback=defaultOverflowSource(layer);if(!fallback||source===fallback)throw error;image=await overflowReadWithTimeout(loadImage(fallback));usedBlob=null;}
      if(!state.overlayLayers.includes(layer)||layer.image!==currentImage)return false;
      if(usedBlob&&typeof assetBlobs!=='undefined')assetBlobs.set(image,usedBlob);
      layer.image=image;overflowReadErrors.delete(layer);return true;
    }catch{if(state.overlayLayers.includes(layer))overflowReadErrors.set(layer,true);return false;}
  })();
  overflowReloads.set(layer,task);
  try{return await task;}finally{overflowReloads.delete(layer);}
}
async function recoverOverflowImages(options={}){
  const layers=[...state.overlayLayers].filter(layer=>!layer.loading);
  const results=await Promise.all(layers.map(layer=>reloadOverflowLayerImage(layer,options)));
  syncOverflowControls();
  return {checked:layers.length,recovered:results.filter(Boolean).length,failed:results.filter(value=>!value).length};
}
async function retryCurrentOverflowImage(){
  if(isEditorLocked())return;
  const layer=activeOverflowLayer();if(!layer)return;
  importStatus(1);
  try{const success=await reloadOverflowLayerImage(layer,{force:true});if(state.overlayLayers.includes(layer))toast(t(success?'图层图片已重新读取，位置保持不变。':'图层图片无法读取，请重新添加该图片。'));}
  finally{importStatus(-1);syncOverflowControls();requestRender();historyCheckpoint('重新读取溢出图层');}
}
function resetCurrentOverflowPosition(){
  if(isEditorLocked())return;
  const layer=activeOverflowLayer();if(!layer||!overflowImageReady(layer.image))return;
  const indexes=layer.cells.flatMap((transform,index)=>transform?[index]:[]);if(!indexes.length)return;
  const geometry=gridGeometry(),bounds=overflowContentBounds(layer.image),pitch=geometry.tile+geometry.gap;
  if(!bounds||bounds.w<=0||bounds.h<=0){toast(t('这个图层没有可见内容，请重新添加图片。'));return;}
  let transform={x:.5,y:.5,scale:1};
  const enabled=indexes.filter(index=>state.overflowCells[index].enabled),scope=enabled.length?enabled:indexes;
  if(layer.kind!=='default'||!scope.some(index=>overflowBoundsIntersectTile(overflowEffectiveBounds(layer.image,transform,geometry,bounds),index,geometry))){
    const left=Math.min(...scope.map(index=>index%3*pitch)),top=Math.min(...scope.map(index=>Math.floor(index/3)*pitch)),right=Math.max(...scope.map(index=>index%3*pitch))+geometry.tile,bottom=Math.max(...scope.map(index=>Math.floor(index/3)*pitch))+geometry.tile;
    const fit=(x,y,w,h)=>{
      const scale=clampCrop(Math.min(w/(bounds.w*geometry.size),h/(bounds.h*geometry.size*layer.image.height/layer.image.width))*.85,.05,2),width=geometry.size*scale,height=width*layer.image.height/layer.image.width;
      return {scale,x:clampCrop((x+w/2-(bounds.x+bounds.w/2-.5)*width)/geometry.size,0,1),y:clampCrop((y+h/2-(bounds.y+bounds.h/2-.5)*height)/geometry.size,0,1)};
    };
    transform=fit(left,top,right-left,bottom-top);
    if(!scope.some(index=>overflowBoundsIntersectTile(overflowEffectiveBounds(layer.image,transform,geometry,bounds),index,geometry)))transform=fit(scope[0]%3*pitch,Math.floor(scope[0]/3)*pitch,geometry.tile,geometry.tile);
  }
  for(const index of indexes)layer.cells[index]={...transform};
  syncOverflowControls();requestRender();historyCheckpoint('恢复图层位置');toast(t('已恢复当前图层的位置，显示状态和覆盖格子保持不变。'));
}

function imageThumbnail(image,size=144,transparent=false){
  let sx=0,sy=0,sw=image.width,sh=image.height;
  if(transparent){
    const ratio=Math.min(1,256/Math.max(sw,sh)),probe=canvas(Math.max(1,Math.round(sw*ratio)),Math.max(1,Math.round(sh*ratio))),pc=probe.getContext('2d');pc.drawImage(image,0,0,probe.width,probe.height);
    const pixels=pc.getImageData(0,0,probe.width,probe.height).data;let left=probe.width,top=probe.height,right=-1,bottom=-1;
    for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(pixels[(y*probe.width+x)*4+3]>=8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    if(right>=left){sx=Math.max(0,left-1)/probe.width*image.width;sy=Math.max(0,top-1)/probe.height*image.height;sw=Math.min(image.width-sx,(right-left+3)/probe.width*image.width);sh=Math.min(image.height-sy,(bottom-top+3)/probe.height*image.height);}
  }
  const c=canvas(size,size),ctx=c.getContext('2d'),scale=Math.min(size/sw,size/sh);
  if(!transparent){ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);}
  ctx.drawImage(image,sx,sy,sw,sh,(size-sw*scale)/2,(size-sh*scale)/2,sw*scale,sh*scale);
  return c.toDataURL(transparent?'image/png':'image/jpeg',.85);
}
function makeOverflowLayer(name,image,indexes,transform,kind='upload'){
  return {id:'layer-'+(++overflowLayerSerial),name,nameKey:kind==='default'?name:null,image,thumb:image?imageThumbnail(image,144,true):null,visible:true,loading:!image,kind,cells:Array.from({length:9},(_,i)=>indexes.includes(i)?{...transform}:null)};
}
function selectOverflowLayer(id){
  const layer=state.overlayLayers.find(item=>item.id===id);if(!layer)return;
  layerSelectionRevision++;state.activeOverlayId=id;state.overflowSelection=layer.cells.flatMap((value,i)=>value?[i]:[]);
  state.dragLayer='overlay';syncOverflowControls();
}
function selectFallbackOverlay(){
  const layer=[...state.overlayLayers].reverse().find(item=>item.visible&&item.image)||state.overlayLayers.at(-1);
  if(layer)selectOverflowLayer(layer.id);else{state.activeOverlayId=null;layerSelectionRevision++;}
}
function syncCoverUpload(photo,isDefault=false){
  coverUploadDetails={name:photo.name,thumb:photo.thumb,isDefault};
  $('#coverUploadPreview').src=photo.thumb;refreshCoverUploadLabels();
}
function refreshCoverUploadLabels(){
  if(!coverUploadDetails)return;
  const {name,isDefault}=coverUploadDetails;
  $('#coverUploadPreview').alt=t('当前封面：{name}',{name});
  $('#coverUploadName').textContent=name;$('#coverUploadName').title=name;
  $('#coverUploadStatus').textContent=t(isDefault?'默认封面 · 点击更换':'已上传 · 点击更换');
  $('#sourceName').textContent=isDefault?t('{name} · 默认封面',{name}):name;$('#sourceName').title=name;
}
async function ensureDefaultOverflow(){
  if(isEditorLocked())return;
  if(state.defaultsInitialized)return;
  if(defaultOverflowPromise)return defaultOverflowPromise;
  $('#retryDefaultLayers').hidden=true;$('#defaultLayersStatus').hidden=false;defaultLayersStatusKey='正在加载默认人物与文字…';$('#defaultLayersStatus').textContent=t(defaultLayersStatusKey);importStatus(1);
  defaultOverflowPromise=(async()=>{
    try{
      const [background,person,title]=await Promise.all(['assets/overflow-background.png','assets/overflow-person.png','assets/overflow-title.png'].map(loadImage));
      // Foreground layers are independent of the current background.
      state.overflowBackground=background;
      const indexes=allOverflowCells(),transform={x:.5,y:.5,scale:1};
      const personLayer=makeOverflowLayer('呐喊人物 · 默认',person,indexes,transform,'default');
      const titleLayer=makeOverflowLayer('DEATH SCREAMING · 默认文字',title,indexes,transform,'default');
      // Default assets sit below user-added layers, even if an upload finishes first.
      state.overlayLayers.unshift(personLayer,titleLayer);state.defaultsInitialized=true;
      if(!state.activeOverlayId){state.activeOverlayId=personLayer.id;state.dragLayer='overlay';}
      $('#defaultLayersStatus').hidden=true;syncOverflowControls();requestRender();
    }catch(error){$('#retryDefaultLayers').hidden=false;defaultLayersStatusKey='默认图层未能加载，可点击下方重新载入。';$('#defaultLayersStatus').textContent=t(defaultLayersStatusKey);toast(t('默认图层未能加载，请重试。'));}
    finally{importStatus(-1);defaultOverflowPromise=null;historyCheckpoint('切换封面模式');}
  })();
  return defaultOverflowPromise;
}
function renderOverflowLayers(){
  const list=$('#overlayList'),stage=$('#stageLayerSelect');list.replaceChildren();stage.replaceChildren();
  const layers=state.overlayLayers;
  $('#overlayCount').textContent=t('{count} 层',{count:layers.length});$('#overlayEmpty').hidden=layers.length>0;
  for(const layer of [...layers].reverse()){
    const displayName=overflowLayerName(layer);
    const row=document.createElement('div');row.className='overlay-row'+(layer.id===state.activeOverlayId?' active':'')+(!layer.visible?' hidden-layer':'');row.dataset.layerId=layer.id;
    const select=document.createElement('button');select.className='overlay-select';select.setAttribute('aria-pressed',String(layer.id===state.activeOverlayId));select.setAttribute('aria-label',t('选择图层 {name}',{name:displayName}));
    const preview=document.createElement('span');preview.className='overlay-thumb';
    if(layer.thumb){const img=document.createElement('img');img.src=layer.thumb;img.alt=displayName;preview.append(img);}else preview.textContent='…';
    const copy=document.createElement('span');copy.className='overlay-copy';const name=document.createElement('strong');name.textContent=displayName;name.title=displayName;const detail=document.createElement('small');const indexes=layer.cells.flatMap((c,i)=>c?[i+1]:[]),condition=overflowLayerCondition(layer);detail.textContent=condition==='loading'?t('正在读取…'):condition==='hidden'?t('已隐藏'):condition==='unavailable'?t('图片读取失败'):condition==='empty'?t('没有可见内容'):condition==='outside'?t('位于画布外'):t('第 {cells} 格',{cells:overflowCellList(indexes)});
    copy.append(name,detail);select.append(preview,copy);select.onclick=()=>selectOverflowLayer(layer.id);row.append(select);
    const actions=document.createElement('div');actions.className='overlay-row-actions';
    const index=layers.indexOf(layer);
    for(const [action,label,disabled,fn] of [
      ['visible',layer.visible?'隐藏':'显示',layer.loading,()=>{if(isEditorLocked())return;layer.visible=!layer.visible;syncOverflowControls();requestRender();historyCheckpoint(layer.visible?'显示溢出图层':'隐藏溢出图层');}],
      ['up','上移',index===layers.length-1,()=>{if(isEditorLocked())return;[layers[index],layers[index+1]]=[layers[index+1],layers[index]];syncOverflowControls();requestRender();historyCheckpoint('上移溢出图层');}],
      ['down','下移',index===0,()=>{if(isEditorLocked())return;[layers[index],layers[index-1]]=[layers[index-1],layers[index]];syncOverflowControls();requestRender();historyCheckpoint('下移溢出图层');}],
      ['delete','删除',false,()=>{if(isEditorLocked())return;state.overlayLayers=state.overlayLayers.filter(item=>item!==layer);if(state.activeOverlayId===layer.id)selectFallbackOverlay();syncOverflowControls();requestRender();historyCheckpoint('删除溢出图层');}]
    ]){const button=document.createElement('button');button.textContent=t(label);button.dataset.layerAction=action;button.disabled=disabled;button.setAttribute('aria-label',t('操作图层：{action} {name}',{action:t(label),name:displayName}));button.onclick=fn;actions.append(button);}
    row.append(actions);list.append(row);
    const option=document.createElement('option');option.value=layer.id;option.textContent=displayName+(layer.visible?'':t('（已隐藏）'));stage.append(option);
  }
  stage.hidden=!layers.length;stage.value=state.activeOverlayId||'';
}
function syncOverflowControls(){
  refreshCoverUploadLabels();
  if(defaultLayersStatusKey)$('#defaultLayersStatus').textContent=t(defaultLayersStatusKey);
  const selected=selectedOverflowCells();
  for(const button of $$('#overflowGrid button')){const i=Number(button.dataset.index);button.classList.toggle('selected',state.overflowSelection.includes(i));button.classList.toggle('enabled',state.overflowCells[i].enabled);button.setAttribute('aria-pressed',String(state.overflowSelection.includes(i)));button.title=t(state.overflowCells[i].enabled?'第 {cell} 格，已开启溢出':'第 {cell} 格，未开启溢出',{cell:i+1});button.setAttribute('aria-label',t('选择调整第 {cell} 格溢出',{cell:i+1}));}
  $('#overflowSelectionLabel').textContent=selected.length?t('正在调整第 {cells} 格',{cells:overflowCellList(state.overflowSelection.map(i=>i+1))}):t('请点选需要调整的格子');
  const checkbox=$('#overflowEnabled');checkbox.disabled=!selected.length;checkbox.checked=selected.length>0&&selected.every(c=>c.enabled);checkbox.indeterminate=selected.some(c=>c.enabled)&&!checkbox.checked;
  const firstInsets=overflowInsets(selected[0]);
  for(const edge of overflowEdges){const input=$(`[data-inset-edge="${edge}"]`),output=$(`[data-inset-value="${edge}"]`);input.disabled=!selected.length;input.value=Math.round(firstInsets[edge]*100);const mixed=selected.some(c=>overflowInsets(c)[edge]!==firstInsets[edge]);output.textContent=!selected.length?'—':mixed?t('各格不同'):input.value+'%';input.setAttribute('aria-valuetext',mixed?t('各格不同，调整后统一此方向的留白'):input.value+'%');}
  for(const button of $$('[data-inset-preset]')){const preset=button.dataset.insetPreset,active=selected.length>0&&selected.every(c=>overflowEdges.every(edge=>(overflowInsets(c)[edge]>0)===(preset==='all'||edge===preset)));button.disabled=!selected.length;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  renderOverflowLayers();
  const layer=activeOverflowLayer(),figure=activeOverflowFigure();$('#overlaySettings').hidden=!layer;
  if(layer){
    $('#activeOverlayName').textContent=overflowLayerName(layer);$('#activeOverlayName').title=overflowLayerName(layer);
    const scope=layer.cells.flatMap((c,i)=>c?[i+1]:[]);$('#overlayScope').textContent=t('当前覆盖：第 {cells} 格',{cells:overflowCellList(scope)});
    $('#applyLayerScope').disabled=!selected.length||layer.loading;
    const condition=overflowLayerCondition(layer);
    $('#overlayEditHint').textContent=t(condition==='loading'?'图片正在读取。':condition==='hidden'?'当前图层已隐藏，点击「显示」后可调整。':figure?'大小和位置只影响选中格子中的当前图层。':'当前选中格子没有此图层，或尚未开启溢出。可点击下方应用覆盖范围。');
    const health=$('#overlayHealthStatus'),healthKey=condition==='unavailable'?'图层图片未能显示，请重新读取图片。':condition==='empty'?'这个图层没有可见内容，请重新添加图片。':condition==='outside'?'图层已移出可见范围，可点击「恢复图层位置」找回。':null;
    if(health){health.textContent=healthKey?t(healthKey):'';health.hidden=!healthKey;}
    const reset=$('#resetOverlayPosition'),reload=$('#reloadOverlayImage');
    if(reset){reset.textContent=t('恢复图层位置');reset.disabled=layer.loading||!overflowImageReady(layer.image);}
    if(reload){reload.textContent=t('重新读取图片');reload.disabled=layer.loading||overflowReloads.has(layer);}
    for(const [id,key] of [['overlayScale','scale'],['overlayX','x'],['overlayY','y']]){$('#'+id).disabled=!figure;$('#'+id).value=Math.round((figure?.[key]??(key==='scale'?1:.5))*100);}
    $('#overlayScaleValue').textContent=figure?Math.round(figure.scale*100)+'%':'—';
  }
  syncDragLayers();syncEditorControlAvailability();
}
function applyOverflowPatch(patch){if(isEditorLocked())return;for(const c of selectedOverflowCells())Object.assign(c,patch);syncOverflowControls();requestRender();historyCheckpoint(patch.enabled===false?'关闭选中格溢出':'开启选中格溢出');}
function writeOverflowGesture(next){if(isEditorLocked())return;const anchor=activeOverflowFigure();if(!anchor)return;const dx=next.x-anchor.x,dy=next.y-anchor.y,factor=next.zoom/anchor.scale;for(const c of selectedLayerTransforms()){c.x=clampCrop(c.x+dx,0,1);c.y=clampCrop(c.y+dy,0,1);c.scale=clampCrop(c.scale*factor,.05,2);}syncOverflowControls();requestRender();}
function drawOverflowLayers(ctx,geometry){
  for(const layer of state.overlayLayers){
    if(!layer.visible||!overflowImageReady(layer.image))continue;
    for(let i=0;i<9;i++){
      const transform=layer.cells[i];if(!state.overflowCells[i].enabled||!transform||![transform.x,transform.y,transform.scale].every(Number.isFinite)||transform.scale<=0)continue;
      const x=i%3*(geometry.tile+geometry.gap),y=Math.floor(i/3)*(geometry.tile+geometry.gap),w=geometry.size*transform.scale,h=w*layer.image.height/layer.image.width;
      ctx.save();
      try{ctx.beginPath();ctx.rect(x,y,geometry.tile,geometry.tile);ctx.clip();ctx.drawImage(layer.image,transform.x*geometry.size-w/2,transform.y*geometry.size-h/2,w,h);}
      catch{if(!overflowReadErrors.has(layer)){overflowReadErrors.set(layer,true);queueMicrotask(syncOverflowControls);}break;}
      finally{ctx.restore();}
    }
  }
}
function bindOverflowEditor(){
  if($('#resetOverlayPosition'))$('#resetOverlayPosition').onclick=resetCurrentOverflowPosition;
  if($('#reloadOverlayImage'))$('#reloadOverlayImage').onclick=retryCurrentOverflowImage;
  for(let i=0;i<9;i++){const b=document.createElement('button');b.textContent=i+1;b.dataset.index=i;b.type='button';b.setAttribute('aria-label',t('选择调整第 {cell} 格溢出',{cell:i+1}));b.onclick=()=>{state.overflowSelection=state.overflowSelection.includes(i)?state.overflowSelection.filter(v=>v!==i):[...state.overflowSelection,i].sort((a,b)=>a-b);syncOverflowControls();};$('#overflowGrid').append(b);}
  $$('[data-overflow-preset]').forEach(b=>b.onclick=()=>{if(isEditorLocked())return;const preset=b.dataset.overflowPreset,indexes=preset==='top'?[0,1,2]:preset==='two-three'?[1,2]:preset==='all'?allOverflowCells():[];state.overflowCells.forEach((c,i)=>{c.enabled=indexes.includes(i);});state.overflowSelection=indexes;syncOverflowControls();requestRender();historyCheckpoint('调整溢出格子');});
  $('#overflowEnabled').onchange=e=>applyOverflowPatch({enabled:e.target.checked});
  $$('[data-inset-edge]').forEach(input=>input.oninput=()=>{if(isEditorLocked())return;for(const c of selectedOverflowCells())c.insets={...overflowInsets(c),[input.dataset.insetEdge]:clampCrop(Number(input.value)/100,0,.4)};syncOverflowControls();requestRender();});
  $$('[data-inset-preset]').forEach(b=>b.onclick=()=>{if(isEditorLocked())return;const preset=b.dataset.insetPreset;for(const c of selectedOverflowCells()){const prev=overflowInsets(c);c.insets=Object.fromEntries(overflowEdges.map(edge=>[edge,preset==='all'||edge===preset?prev[edge]||.1:0]));}syncOverflowControls();requestRender();historyCheckpoint('调整溢出方向');});
  for(const [id,key] of [['overlayScale','scale'],['overlayX','x'],['overlayY','y']])$('#'+id).oninput=e=>{if(isEditorLocked())return;for(const c of selectedLayerTransforms())c[key]=Number(e.target.value)/100;syncOverflowControls();requestRender();};
  $('#stageLayerSelect').onchange=e=>selectOverflowLayer(e.target.value);
  $('#applyLayerScope').onclick=()=>{if(isEditorLocked())return;const layer=activeOverflowLayer();if(!layer||layer.loading||!state.overflowSelection.length)return;const anchor=layer.cells.find(Boolean)||{scale:.65,x:.5,y:.5};layer.cells=Array.from({length:9},(_,i)=>state.overflowSelection.includes(i)?{...(layer.cells[i]||anchor)}:null);for(const c of selectedOverflowCells())c.enabled=true;layer.visible=true;state.dragLayer='overlay';syncOverflowControls();requestRender();historyCheckpoint('调整图层覆盖范围');};
  $('#retryDefaultLayers').onclick=()=>ensureDefaultOverflow();
  $('#overlayInput').onchange=async e=>{
    const input=e.target,files=[...input.files],indexes=[...state.overflowSelection];input.value='';if(!files.length||isEditorLocked())return;
    if(!indexes.length){toast(t('先选择需要放入图层的格子。'));return;}
    const selectionRevision=layerSelectionRevision,geometry=gridGeometry(),pitch=geometry.tile+geometry.gap;
    const left=Math.min(...indexes.map(i=>i%3*pitch)),top=Math.min(...indexes.map(i=>Math.floor(i/3)*pitch)),right=Math.max(...indexes.map(i=>i%3*pitch))+geometry.tile,bottom=Math.max(...indexes.map(i=>Math.floor(i/3)*pitch))+geometry.tile;
    const pending=files.map(file=>makeOverflowLayer(file.name,null,indexes,{scale:.65,x:(left+right)/2/geometry.size,y:(top+bottom)/2/geometry.size}));
    state.overlayLayers.push(...pending);for(const index of indexes)state.overflowCells[index].enabled=true;importStatus(files.length);syncOverflowControls();
    for(let i=0;i<files.length;i++){
      const layer=pending[i];try{
        const photo=await readPhoto(files[i],'overlay');if(!state.overlayLayers.includes(layer))continue;
        layer.image=photo.img;layer.thumb=photo.thumb;layer.loading=false;
        const scale=clampCrop(Math.min((right-left)/geometry.size,(bottom-top)*photo.img.width/photo.img.height/geometry.size)*.95,.05,2);
        for(const c of layer.cells)if(c)c.scale=scale;
        if(layerSelectionRevision===selectionRevision){state.activeOverlayId=layer.id;state.dragLayer='overlay';}
        requestRender();
      }catch(error){state.overlayLayers=state.overlayLayers.filter(l=>l!==layer);if(state.activeOverlayId===layer.id)selectFallbackOverlay();toast(t('{name}：{error}',{name:files[i].name,error:error.message}));}
      finally{importStatus(-1);syncOverflowControls();}
    }
    historyCheckpoint('添加溢出图层');
  };
  syncOverflowControls();
}
