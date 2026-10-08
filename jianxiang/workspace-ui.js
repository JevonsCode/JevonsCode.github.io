'use strict';

function isEditorLocked(){return !!(state.locked||state.restoring||state.busy);}

// Native disabling stops the browser from moving a range thumb before any input
// handler runs. Keep each control's own availability separate from this gate.
const editorMutationControls = [
  '.settings input','.settings select','.settings [data-mode]',
  '.settings [data-overflow-preset]','.settings [data-inset-preset]',
  '.settings [data-layer-action]','#resetCrop','#applyLayerScope','#retryDefaultLayers','#resetOverlayPosition','#reloadOverlayImage',
  '.story input','.story select','.photo-adjust','.photo-actions button',
  '[data-story-drag]','.fill-clear','#demoStory',
  '.crop-editor input','.crop-editor select','#resetPhotoCrop','#applyPhotoCrop',
  '#longZoom','#longReset','#longFillInput','#longMoveAcross','#longMoveUp','#longMoveDown',
  '#undoBtn','#redoBtn','#longUndo','#longRedo','.history-step'
].join(',');
const editorControlLocks = new WeakMap();
let editorAvailabilityObserver = null, syncingEditorAvailability = false;
const editorAvailabilityObservation = {subtree:true,childList:true,attributes:true,attributeFilter:['disabled']};
function rememberEditorAvailabilityChanges(records){
  for(const mutation of records){
    if(mutation.type!=='attributes')continue;
    const saved=editorControlLocks.get(mutation.target);
    // These records come only from other UI code. Our own writes occur with
    // observation paused, so rebuilt selection rules survive an unlock.
    if(saved)saved.disabled=mutation.target.disabled;
  }
}
function syncEditorControlAvailability(){
  if(syncingEditorAvailability)return;
  syncingEditorAvailability=true;
  rememberEditorAvailabilityChanges(editorAvailabilityObserver?.takeRecords()||[]);
  editorAvailabilityObserver?.disconnect();
  try{
    const blocked=isEditorLocked()||state.importing>0;
    for(const control of $$(editorMutationControls)){
      if(!('disabled' in control))continue;
      const saved=editorControlLocks.get(control);
      if(blocked){
        const entry=saved||{disabled:control.disabled};
        if('value' in control)entry.value=control.value;
        if('checked' in control)entry.checked=control.checked;
        editorControlLocks.set(control,entry);
        if(!control.disabled)control.disabled=true;
      }else if(saved){
        if(control.disabled!==saved.disabled)control.disabled=saved.disabled;
        editorControlLocks.delete(control);
      }
    }
    // A label has no native disabled state; its target input does. Reflect that
    // state for assistive technology without disabling browsing controls.
    for(const label of $$('label[for]')){
      const control=document.getElementById(label.htmlFor);
      if(!control?.matches(editorMutationControls))continue;
      if(control.disabled)label.setAttribute('aria-disabled','true');
      else label.removeAttribute('aria-disabled');
    }
  }finally{
    if(editorAvailabilityObserver&&document.body)editorAvailabilityObserver.observe(document.body,editorAvailabilityObservation);
    syncingEditorAvailability=false;
  }
}
function restoreLockedEditorControl(control){
  const saved=editorControlLocks.get(control);
  if(!saved)return;
  if('value' in saved&&control.type!=='file')control.value=saved.value;
  if('checked' in saved)control.checked=saved.checked;
}
function watchEditorControlAvailability(){
  if(editorAvailabilityObserver)return;
  editorAvailabilityObserver=new MutationObserver(records=>{
    rememberEditorAvailabilityChanges(records);syncEditorControlAvailability();
  });
  syncEditorControlAvailability();
}
function toggleEditorLock(){
  if(state.restoring)return;
  state.locked=!state.locked;refreshLockUI();
  document.dispatchEvent(new CustomEvent('editorlockchange',{detail:{locked:state.locked}}));
  toast(t(state.locked?'已锁定，可浏览和下载；解锁后继续调整。':'已解锁，可以继续编辑。'));
}
function refreshLockUI(){
  const button=$('#lockBtn');if(!button)return;
  button.setAttribute('aria-pressed',String(state.locked));button.setAttribute('aria-label',t(state.locked?'解锁编辑':'锁定，防止误触'));
  button.innerHTML=`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="${state.locked?'M8 10V7a4 4 0 0 1 8 0v3':'M8 10V7a4 4 0 0 1 8 0'}"/><path d="M12 14v3"/></svg><span>${t(state.locked?'解锁':'锁定')}</span>`;
  document.body.classList.toggle('editor-locked',state.locked);refreshHistoryUI();syncEditorControlAvailability();
}
function refreshHistoryUI(){
  if(!$('#undoBtn'))return;
  const history=historyState();
  $('#undoBtn').disabled=isEditorLocked()||!history.canUndo;
  $('#redoBtn').disabled=isEditorLocked()||!history.canRedo;
  $('#historyCount').textContent=history.current<0?'':String(history.current+1);
  const list=$('#historyList');if(!list)return;
  list.replaceChildren();
  history.entries.forEach((entry,index)=>{
    const item=document.createElement('li'),button=document.createElement('button');
    button.className='history-step'+(index===history.current?' current':'')+(index>history.current?' undone':'');
    const number=document.createElement('span');number.className='history-number';number.textContent=String(index+1).padStart(2,'0');
    const label=document.createElement('span');label.textContent=t(entry.labelKey);
    const marker=document.createElement('span');marker.className='history-marker';marker.textContent=index===history.current?t('当前'):'';
    button.append(number,label,marker);button.disabled=isEditorLocked()||state.importing>0;
    button.setAttribute('aria-current',index===history.current?'step':'false');button.onclick=()=>historyGoTo(index);
    item.append(button);list.append(item);
  });
}
function showHistory(){
  showModal(t('步骤记录'),`<div class="modal-content history-dialog"><p class="hint">${t('保留本次打开后的最近 40 个状态，点选步骤即可恢复。')}</p><ol id="historyList" class="history-list"></ol></div>`);
  refreshHistoryUI();
}
function refreshSaveUI(){
  const element=$('#draftStatus');if(!element)return;
  const status=getProjectSaveStatus();
  const key={loading:'正在恢复作品…',ready:'作品自动保存在本机',saving:'正在保存作品…',saved:'作品已保存在本机',error:'保存未完成，请先导出作品',unavailable:'本机存储不可用，请先导出作品'}[status.status];
  element.textContent=t(key||'作品自动保存在本机');element.dataset.state=status.status;
}
function refreshProjectUI(){
  if(state.coverAsset)syncCoverUpload(state.coverAsset,state.isDefaultCover);
  $$('[data-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.mode===state.mode);button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode));});
  $('#overflowControls').hidden=state.mode!=='overflow';$('#modeLabel').textContent=t(state.mode==='classic'?'经典九宫格':'溢出拼贴');
  for(const [id,value] of [['zoom',Math.round(state.zoom*100)],['posX',state.x*100],['posY',state.y*100],['gridGap',state.gridGap],['thumbWidth',state.thumbWidth],['paperColor',state.paper]])$('#'+id).value=value;
  $('#zoomValue').textContent=Math.round(state.zoom*100)+'%';$('#gapSummary').textContent=state.gridGap+' px';
  syncOverflowControls();repaintProject();selectCell(state.selected);refreshLockUI();refreshSaveUI();
  document.dispatchEvent(new CustomEvent('projectrestored'));
}
let recoveryFrame=null,recoveryRevision=0;
function recoverProjectCanvases(){
  if(state.restoring||!state.cover||document.visibilityState==='hidden')return;
  const revision=++recoveryRevision;cancelAnimationFrame(recoveryFrame);
  recoveryFrame=requestAnimationFrame(async()=>{
    const previous=state.cover;
    try{
      if(previous instanceof HTMLImageElement){
        try{await overflowReadWithTimeout(previous.decode(),3000);}
        catch{
          const blob=assetBlobs.get(previous),src=blob?URL.createObjectURL(blob):state.coverAsset?.src;
          if(src){const image=await overflowReadWithTimeout(loadImage(src));if(blob)assetBlobs.set(image,blob);if(state.cover===previous){state.cover=image;state.coverAsset={...state.coverAsset,img:image,src};}}
        }
      }
      await recoverOverflowImages({force:true});
    }catch{ /* Keep the existing artwork editable if one asset cannot recover. */ }
    if(revision!==recoveryRevision||state.restoring||document.hidden)return;
    // Recreate discarded backing stores only after encoded sources are ready.
    cover.width=cover.width;cover.height=cover.height;
    for(const target of $$('.cover-cell canvas,#selectedCanvas'))target.width=target.width;
    repaintProject();document.dispatchEvent(new CustomEvent('projectresume'));
  });
}
function bindWorkspaceUI(){
  watchEditorControlAvailability();
  $('#lockBtn').onclick=toggleEditorLock;$('#undoBtn').onclick=()=>historyUndo();$('#redoBtn').onclick=()=>historyRedo();$('#historyBtn').onclick=showHistory;
  document.addEventListener('historychange',refreshHistoryUI);document.addEventListener('projectsavechange',refreshSaveUI);
  document.addEventListener('languagechange',()=>{refreshLockUI();refreshHistoryUI();refreshSaveUI();});
  document.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(isEditorLocked()||state.importing||$('#modal').open)return;
    if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?historyRedo():historyUndo();}
    else if(event.key.toLowerCase()==='y'){event.preventDefault();historyRedo();}
  });
  // Gate editing controls at capture time, before native file pickers or handlers.
  const editable=editorMutationControls+',.settings label[for],.story label[for],.crop-editor label[for],.stage label[for="coverInput"]';
  for(const type of ['click','input','change','pointerdown','keydown'])document.addEventListener(type,event=>{
    if(!(isEditorLocked()||state.importing>0)||!event.target.closest?.(editable))return;
    if(type==='input'||type==='change')restoreLockedEditorControl(event.target);
    event.preventDefault();event.stopImmediatePropagation();
    if(type==='click')toast(t(state.locked?'已锁定，可浏览和下载；解锁后继续调整。':'照片读取中，请稍等。'));
  },true);
  // A range interaction is a single undo step; keyboard changes commit on change.
  let activeControl=null;
  const controls='.settings input[type="range"],.gap-fields input,#paperColor';
  function endControl(){if(activeControl){activeControl=null;historyEnd();}}
  document.addEventListener('pointerdown',event=>{if(event.target.matches?.(controls)&&!isEditorLocked()){endControl();historyBegin('调整作品');activeControl=event.target;}},true);
  document.addEventListener('pointerup',endControl);document.addEventListener('pointercancel',endControl);
  document.addEventListener('change',event=>{if(event.target.matches?.(controls)&&!isEditorLocked()){if(activeControl)endControl();else historyCheckpoint('调整作品');}});
  window.addEventListener('blur',endControl);
  document.addEventListener('editorlockchange',()=>{endControl();syncEditorControlAvailability();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)endControl();else recoverProjectCanvases();});
  window.addEventListener('pageshow',recoverProjectCanvases);document.addEventListener('resume',recoverProjectCanvases);
  for(const target of [cover,...$$('.cover-cell canvas,#selectedCanvas')])target.addEventListener('contextrestored',recoverProjectCanvases);
  attachStoryReorder($('.story-scroll'),{
    items:()=>$$('.photo-row').map(element=>({element,side:element.dataset.side,index:Number(element.dataset.index)})),
    zones:()=>['top','bottom'].map(side=>({element:$('#'+side+'List').closest('.story-section'),side})),
    locked:()=>isEditorLocked()||state.importing>0,
    scrollElement:innerWidth<=620?document.scrollingElement:$('.story-scroll'),
    move:(fromSide,fromIndex,toSide,toIndex)=>moveStoryPhoto(state.selected,fromSide,fromIndex,toSide,toIndex)
  });
  refreshLockUI();
}
