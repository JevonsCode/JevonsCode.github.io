'use strict';

let projectFileOperation=false;
function projectEditingUnavailable(){return state.restoring||state.importing>0||state.busy||projectFileOperation;}
function refreshProjectFileUI(){
  const active=getActiveProject();
  $('#projectName').textContent=active?.name||t('未命名作品');$('#projectName').title=active?.name||t('未命名作品');
  for(const id of ['saveProjectBtn','saveProjectAsBtn','openProjectsBtn'])$('#'+id).disabled=projectEditingUnavailable();
}
function projectFailure(error){
  const key=error?.name==='QuotaExceededError'?'本机空间不足，请下载作品备份。':'操作未完成，当前作品已保留。';
  toast(t(key));
}
async function projectOperation(task){
  if(projectEditingUnavailable()){toast(t('请等待当前操作完成。'));return false;}
  projectFileOperation=true;state.restoring=true;refreshProjectFileUI();syncEditorControlAvailability();importStatus(0);$('#closeModal').disabled=true;
  try{return await task();}
  catch(error){projectFailure(error);return false;}
  finally{projectFileOperation=false;state.restoring=false;$('#closeModal').disabled=false;refreshProjectFileUI();syncEditorControlAvailability();importStatus(0);}
}
function suggestedProjectName(copy=false){
  const active=getActiveProject();
  if(active?.name)return copy?t('{name} · 副本',{name:active.name}):active.name;
  return t('作品 {date}',{date:new Date().toLocaleString(document.documentElement.lang,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})});
}
async function saveCurrentProject(){
  if(projectEditingUnavailable()){toast(t('请等待当前操作完成。'));return;}
  const active=getActiveProject();if(!active)return showProjectName(false);
  await projectOperation(async()=>{await saveNamedProject({id:active.id,name:active.name});toast(t('作品已保存。'));});
}
function showProjectName(copy=false,afterSave=null){
  if(projectEditingUnavailable()){toast(t('请等待当前操作完成。'));return;}
  showModal(t(copy?'另存为':'保存作品'),`<form id="projectNameForm" class="modal-content project-name-dialog"><label for="projectNameInput">${t('作品名称')}</label><input id="projectNameInput" maxlength="100" required autocomplete="off"><p class="hint">${t('保存在当前设备，可从「本机作品」继续编辑。')}</p><p id="projectSaveError" class="project-error" role="status"></p><div class="modal-actions"><button type="submit" id="confirmProjectSave" class="btn primary">${t(copy?'保存副本':'保存')}</button></div></form>`);
  const input=$('#projectNameInput');input.value=suggestedProjectName(copy);input.focus();input.select();
  $('#projectNameForm').onsubmit=async event=>{
    event.preventDefault();const name=input.value.trim();if(!name){input.setCustomValidity(t('请填写作品名称。'));input.reportValidity();return;}input.setCustomValidity('');
    const active=getActiveProject(),button=$('#confirmProjectSave');button.disabled=true;button.textContent=t('正在保存…');
    const result=await projectOperation(async()=>{await saveNamedProject({id:copy?undefined:active?.id,name});toast(t('作品已保存。'));return true;});
    if(result){$('#modal').close();if(afterSave)await afterSave();}
    else if(button.isConnected){button.disabled=false;button.textContent=t(copy?'保存副本':'保存');$('#projectSaveError').textContent=t('保存未完成。可关闭此窗口，再从「本机作品」下载备份。');}
  };
}
async function downloadProjectBackup(){
  await projectOperation(async()=>{
    const blob=await exportProjectFile();
    const name=(getActiveProject()?.name||t('未命名作品')).replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').slice(0,80);
    download(blob,name+'.jianxiang');toast(t('完整作品备份已下载，可稍后导入继续编辑。'));
  });
}
function projectHasChanges(){return typeof hasUnsavedProjectChanges==='function'?hasUnsavedProjectChanges():state.dirty;}
async function guardProjectSwitch(action){
  if(!projectHasChanges())return action();
  const active=getActiveProject();
  showModal(t('先保存当前作品'),`<div class="modal-content project-switch-dialog"><p>${t('当前作品还有未保存的修改，保存后再打开其他作品。')}</p><div class="modal-actions"><button id="cancelProjectSwitch" class="btn secondary">${t('继续编辑')}</button><button id="saveBeforeSwitch" class="btn primary">${t('保存并打开')}</button></div></div>`);
  $('#cancelProjectSwitch').onclick=()=>$('#modal').close();
  $('#saveBeforeSwitch').onclick=async()=>{
    if(!active){showProjectName(false,action);return;}
    const success=await projectOperation(async()=>{await saveNamedProject({id:active.id,name:active.name});return true;});
    if(success){$('#modal').close();await action();}
  };
}
async function openSavedProject(id){
  return guardProjectSwitch(()=>projectOperation(async()=>{
    const project=await loadSavedProject(id);if(!project){toast(t('未找到这个作品。'));return;}
    $('#modal').close();refreshProjectFileUI();toast(t('已打开 {name}。',{name:project.name}));
  }));
}
async function importProjectBackup(file){
  if(!file)return;
  return guardProjectSwitch(()=>projectOperation(async()=>{
    const project=await importProjectFile(file);$('#modal').close();refreshProjectFileUI();toast(t('已导入 {name}。',{name:project.name}));
  }));
}
let projectLibraryRequest=0;
async function showProjectLibrary(){
  if(projectEditingUnavailable()){toast(t('请等待当前操作完成。'));return;}
  const request=++projectLibraryRequest;
  showModal(t('本机作品'),`<div class="modal-content project-library"><div class="project-library-actions"><button id="downloadProjectBackup" class="btn secondary">${t('下载当前作品备份')}</button><label for="importProjectBackup" class="btn secondary">${t('导入备份')}</label><input id="importProjectBackup" class="file-input" type="file" accept=".jianxiang,application/vnd.jianxiang.project,application/octet-stream"></div><p class="hint">${t('作品保存在当前设备。备份文件包含全部图片与编辑进度，可换设备导入。')}</p><div id="savedProjectsList" class="saved-projects-list" role="list"><p class="hint">${t('正在读取作品…')}</p></div></div>`);
  const list=$('#savedProjectsList');$('#downloadProjectBackup').onclick=downloadProjectBackup;
  $('#importProjectBackup').onchange=async event=>{const file=event.target.files[0];event.target.value='';await importProjectBackup(file);};
  try{
    const projects=await listSavedProjects();if(request!==projectLibraryRequest||!list.isConnected)return;
    list.replaceChildren();if(!projects.length){const empty=document.createElement('p');empty.className='project-empty';empty.textContent=t('还没有保存的作品。点击「保存」开始。');list.append(empty);return;}
    const active=getActiveProject();
    for(const project of projects){
      const item=document.createElement('div');item.className='saved-project';item.setAttribute('role','listitem');
      const thumb=document.createElement('img');thumb.alt='';if(project.thumbnail)thumb.src=project.thumbnail;else thumb.hidden=true;
      const copy=document.createElement('div');copy.className='saved-project-copy';
      const title=document.createElement('strong');title.textContent=project.name;title.title=project.name;
      const meta=document.createElement('small');meta.textContent=new Date(project.savedAt).toLocaleString(document.documentElement.lang,{dateStyle:'short',timeStyle:'short'})+' · '+t('{count} 张照片',{count:project.photoCount||0});
      if(project.id===active?.id)title.append(document.createTextNode(' · '+t('当前')));
      copy.append(title,meta);
      const button=document.createElement('button');button.className='btn secondary small';button.textContent=t('打开');button.setAttribute('aria-label',t('打开作品 {name}',{name:project.name}));button.onclick=()=>openSavedProject(project.id);
      item.append(thumb,copy,button);list.append(item);
    }
  }catch(error){if(list.isConnected){list.textContent=t('暂时无法读取本机作品，可下载当前作品备份。');} }
}
function bindSavedProjects(){
  $('#saveProjectBtn').onclick=saveCurrentProject;$('#saveProjectAsBtn').onclick=()=>showProjectName(true);$('#openProjectsBtn').onclick=showProjectLibrary;
  for(const type of ['projectidentitychange','historychange','projectsavechange','languagechange'])document.addEventListener(type,refreshProjectFileUI);
  refreshProjectFileUI();
}
