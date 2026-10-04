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
  return layer?.visible&&layer.image&&transform?{image:layer.image,...transform}:null;
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
    finally{importStatus(-1);defaultOverflowPromise=null;}
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
    const copy=document.createElement('span');copy.className='overlay-copy';const name=document.createElement('strong');name.textContent=displayName;name.title=displayName;const detail=document.createElement('small');const indexes=layer.cells.flatMap((c,i)=>c?[i+1]:[]);detail.textContent=layer.loading?t('正在读取…'):!layer.visible?t('已隐藏'):t('第 {cells} 格',{cells:overflowCellList(indexes)});
    copy.append(name,detail);select.append(preview,copy);select.onclick=()=>selectOverflowLayer(layer.id);row.append(select);
    const actions=document.createElement('div');actions.className='overlay-row-actions';
    const index=layers.indexOf(layer);
    for(const [action,label,disabled,fn] of [
      ['visible',layer.visible?'隐藏':'显示',layer.loading,()=>{layer.visible=!layer.visible;syncOverflowControls();requestRender();}],
      ['up','上移',index===layers.length-1,()=>{[layers[index],layers[index+1]]=[layers[index+1],layers[index]];syncOverflowControls();requestRender();}],
      ['down','下移',index===0,()=>{[layers[index],layers[index-1]]=[layers[index-1],layers[index]];syncOverflowControls();requestRender();}],
      ['delete','删除',false,()=>{state.overlayLayers=state.overlayLayers.filter(item=>item!==layer);if(state.activeOverlayId===layer.id)selectFallbackOverlay();syncOverflowControls();requestRender();}]
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
    $('#overlayEditHint').textContent=t(layer.loading?'图片正在读取。':!layer.visible?'当前图层已隐藏，点击「显示」后可调整。':figure?'大小和位置只影响选中格子中的当前图层。':'当前选中格子没有此图层，或尚未开启溢出。可点击下方应用覆盖范围。');
    for(const [id,key] of [['overlayScale','scale'],['overlayX','x'],['overlayY','y']]){$('#'+id).disabled=!figure;$('#'+id).value=Math.round((figure?.[key]??(key==='scale'?1:.5))*100);}
    $('#overlayScaleValue').textContent=figure?Math.round(figure.scale*100)+'%':'—';
  }
  syncDragLayers();
}
function applyOverflowPatch(patch){for(const c of selectedOverflowCells())Object.assign(c,patch);syncOverflowControls();requestRender();}
function writeOverflowGesture(next){const anchor=activeOverflowFigure();if(!anchor)return;const dx=next.x-anchor.x,dy=next.y-anchor.y,factor=next.zoom/anchor.scale;for(const c of selectedLayerTransforms()){c.x=clampCrop(c.x+dx,0,1);c.y=clampCrop(c.y+dy,0,1);c.scale=clampCrop(c.scale*factor,.05,2);}syncOverflowControls();requestRender();}
function drawOverflowLayers(ctx,geometry){
  for(const layer of state.overlayLayers){if(!layer.visible||!layer.image)continue;
    for(let i=0;i<9;i++){const transform=layer.cells[i];if(!state.overflowCells[i].enabled||!transform)continue;const x=i%3*(geometry.tile+geometry.gap),y=Math.floor(i/3)*(geometry.tile+geometry.gap),w=geometry.size*transform.scale,h=w*layer.image.height/layer.image.width;ctx.save();ctx.beginPath();ctx.rect(x,y,geometry.tile,geometry.tile);ctx.clip();ctx.drawImage(layer.image,transform.x*geometry.size-w/2,transform.y*geometry.size-h/2,w,h);ctx.restore();}
  }
}
function bindOverflowEditor(){
  for(let i=0;i<9;i++){const b=document.createElement('button');b.textContent=i+1;b.dataset.index=i;b.type='button';b.setAttribute('aria-label',t('选择调整第 {cell} 格溢出',{cell:i+1}));b.onclick=()=>{state.overflowSelection=state.overflowSelection.includes(i)?state.overflowSelection.filter(v=>v!==i):[...state.overflowSelection,i].sort((a,b)=>a-b);syncOverflowControls();};$('#overflowGrid').append(b);}
  $$('[data-overflow-preset]').forEach(b=>b.onclick=()=>{const preset=b.dataset.overflowPreset,indexes=preset==='top'?[0,1,2]:preset==='two-three'?[1,2]:preset==='all'?allOverflowCells():[];state.overflowCells.forEach((c,i)=>{c.enabled=indexes.includes(i);});state.overflowSelection=indexes;syncOverflowControls();requestRender();});
  $('#overflowEnabled').onchange=e=>applyOverflowPatch({enabled:e.target.checked});
  $$('[data-inset-edge]').forEach(input=>input.oninput=()=>{for(const c of selectedOverflowCells())c.insets={...overflowInsets(c),[input.dataset.insetEdge]:clampCrop(Number(input.value)/100,0,.4)};syncOverflowControls();requestRender();});
  $$('[data-inset-preset]').forEach(b=>b.onclick=()=>{const preset=b.dataset.insetPreset;for(const c of selectedOverflowCells()){const prev=overflowInsets(c);c.insets=Object.fromEntries(overflowEdges.map(edge=>[edge,preset==='all'||edge===preset?prev[edge]||.1:0]));}syncOverflowControls();requestRender();});
  for(const [id,key] of [['overlayScale','scale'],['overlayX','x'],['overlayY','y']])$('#'+id).oninput=e=>{for(const c of selectedLayerTransforms())c[key]=Number(e.target.value)/100;syncOverflowControls();requestRender();};
  $('#stageLayerSelect').onchange=e=>selectOverflowLayer(e.target.value);
  $('#applyLayerScope').onclick=()=>{const layer=activeOverflowLayer();if(!layer||layer.loading||!state.overflowSelection.length)return;const anchor=layer.cells.find(Boolean)||{scale:.65,x:.5,y:.5};layer.cells=Array.from({length:9},(_,i)=>state.overflowSelection.includes(i)?{...(layer.cells[i]||anchor)}:null);for(const c of selectedOverflowCells())c.enabled=true;layer.visible=true;state.dragLayer='overlay';syncOverflowControls();requestRender();};
  $('#retryDefaultLayers').onclick=()=>ensureDefaultOverflow();
  $('#overlayInput').onchange=async e=>{
    const input=e.target,files=[...input.files],indexes=[...state.overflowSelection];input.value='';if(!files.length)return;
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
  };
  syncOverflowControls();
}
