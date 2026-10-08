'use strict';

function isEditorLocked(){return !!(state.locked||state.restoring||state.busy);}
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
  document.body.classList.toggle('editor-locked',state.locked);refreshHistoryUI();
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
let recoveryFrame=null;
function recoverProjectCanvases(){
  if(state.restoring||!state.cover||document.visibilityState==='hidden')return;
  cancelAnimationFrame(recoveryFrame);
  recoveryFrame=requestAnimationFrame(()=>{
    // Resizing re-creates backing stores after a browser discards GPU resources.
    cover.width=cover.width;cover.height=cover.height;
    for(const target of $$('.cover-cell canvas,#selectedCanvas'))target.width=target.width;
    repaintProject();document.dispatchEvent(new CustomEvent('projectresume'));
  });
}
function bindWorkspaceUI(){
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
  const editable='.settings input,.settings label[for],.settings [data-mode],.settings [data-overflow-preset],.settings [data-inset-preset],.settings [data-layer-action],#resetCrop,#applyLayerScope,#retryDefaultLayers,.story input,.story label[for],.photo-adjust,.photo-actions button,[data-story-drag],#demoStory,.stage label[for="coverInput"]';
  for(const type of ['click','input','change','pointerdown','keydown'])document.addEventListener(type,event=>{
    if(!(isEditorLocked()||state.importing>0)||!event.target.closest?.(editable))return;
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
