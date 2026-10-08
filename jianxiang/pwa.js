'use strict';

const appPWA={registration:null,ready:false,error:false,supported:'serviceWorker' in navigator&&isSecureContext,prompt:null,installed:false,updateRequested:false,initializing:false,statusRequest:0};
const appScopeURL=new URL('./',document.baseURI);
const appWorkerURL=new URL('sw.js',appScopeURL);
const watchedAppWorkers=new WeakSet();
const watchedAppRegistrations=new WeakSet();

function appIsStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||appPWA.installed;}
function workerMessage(worker,type){
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const finish=()=>{clearTimeout(timeout);channel.port1.close();};
    const timeout=setTimeout(()=>{finish();reject(new Error('Worker response timed out'));},8000);
    channel.port1.onmessage=event=>{finish();resolve(event.data);};
    try{worker.postMessage({type},[channel.port2]);}catch(error){finish();reject(error);}
  });
}
function renderPWAStatus(){
  const status=document.querySelector('#pwaStatus');if(!status)return;
  const mode=!appPWA.supported?'unsupported':appPWA.ready?(navigator.onLine?'ready':'offline'):appPWA.error?'error':'pending';
  const key={unsupported:'当前浏览器不支持离线安装',ready:'可离线使用',offline:'离线模式 · 可正常编辑',error:'离线准备未完成',pending:'正在准备离线使用…'}[mode];
  status.dataset.state=mode;$('#pwaStatusText').textContent=t(key);
  $('#installAppBtn').textContent=t(appIsStandalone()?'应用已安装':'安装应用');
  $('#pwaUpdateBtn').hidden=!appPWA.registration?.waiting;
  $('#pwaUpdateBtn').textContent=t('有新版本');
  // The install dialog can stay open while a slow first download completes.
  const detail=$('#offlineSetupDetail');
  if(detail)detail.textContent=t(appPWA.ready?'离线内容已准备好，包括编辑器、三种语言和默认图片素材。':appPWA.error?'离线内容准备失败，请联网后重试。':'请保持联网，等页面显示「可离线使用」后再断网。');
  const retry=$('#retryOfflineSetup');if(retry)retry.hidden=appPWA.ready||!appPWA.supported;
  const install=$('#nativeInstallBtn');if(install){install.hidden=!appPWA.prompt||appIsStandalone();install.disabled=!appPWA.ready;}
}
async function refreshOfflineStatus(){
  const request=++appPWA.statusRequest,worker=appPWA.registration?.active;
  if(!worker){appPWA.ready=false;renderPWAStatus();return;}
  try{
    const status=await workerMessage(worker,'GET_OFFLINE_STATUS');
    if(request!==appPWA.statusRequest)return;
    appPWA.ready=status.ready===true;
    if(appPWA.ready)appPWA.error=false;
    else if(!appPWA.registration.installing)appPWA.error=true;
  }catch{if(request===appPWA.statusRequest){appPWA.ready=false;appPWA.error=true;}}
  renderPWAStatus();
}
function watchAppWorker(worker){
  if(!worker||watchedAppWorkers.has(worker))return;
  watchedAppWorkers.add(worker);
  worker.addEventListener('statechange',()=>{
    if(worker.state==='redundant'&&!appPWA.registration?.active){appPWA.error=true;renderPWAStatus();}
    else if(['installed','activated'].includes(worker.state))refreshOfflineStatus();
  });
}
function watchAppRegistration(registration){
  appPWA.registration=registration;
  watchAppWorker(registration.installing);
  if(!watchedAppRegistrations.has(registration)){
    watchedAppRegistrations.add(registration);
    registration.addEventListener('updatefound',()=>{watchAppWorker(registration.installing);renderPWAStatus();});
  }
}
async function prepareOffline(retry=false){
  if(!appPWA.supported||appPWA.initializing)return;
  appPWA.initializing=true;appPWA.error=false;renderPWAStatus();
  try{
    let registration=await navigator.serviceWorker.getRegistration(appScopeURL.href);
    // A parent site's service worker must never be replaced or unregistered.
    if(registration?.scope!==appScopeURL.href)registration=null;
    const worker=registration?.waiting||registration?.active||registration?.installing;
    if(worker&&new URL(worker.scriptURL).pathname!==appWorkerURL.pathname)registration=null;
    if(!registration||retry&&!appPWA.ready&&registration.active){
      const url=new URL(appWorkerURL);
      // Force a complete reinstall only when a previously installed cache was
      // removed. Keep its active worker until the replacement is fully cached.
      if(registration?.active)url.searchParams.set('repair',Date.now());
      registration=await navigator.serviceWorker.register(url.href,{scope:appScopeURL.href,updateViaCache:'none'});
    }
    watchAppRegistration(registration);
    await refreshOfflineStatus();
    if(navigator.onLine){
      registration.update().catch(()=>{if(!registration.active){appPWA.error=true;renderPWAStatus();}});
    }
  }catch{appPWA.error=true;renderPWAStatus();}
  finally{appPWA.initializing=false;}
}
function pwaText(tag,key,className){
  const element=document.createElement(tag);element.textContent=t(key);if(className)element.className=className;return element;
}
function showInstallApp(){
  const body=document.createElement('div');body.className='modal-content pwa-install-dialog';
  body.append(pwaText('p','将间象添加到主屏幕，像应用一样打开。首次联网完成离线准备后，断网也可添加照片、调整图层和导出。'));
  const offline=pwaText('p','请保持联网，等页面显示「可离线使用」后再断网。','callout');offline.id='offlineSetupDetail';body.append(offline);
  if(appIsStandalone())body.append(pwaText('h3','已安装到设备'));
  const install=pwaText('button','现在安装','btn primary');install.id='nativeInstallBtn';install.onclick=promptInstallApp;body.append(install);
  body.append(pwaText('h3','iPhone / iPad'),pwaText('p','在 Safari 中打开此页，轻点浏览器的分享按钮，再选择「添加到主屏幕」；若出现「作为网页 App 打开」，请开启。'));
  body.append(pwaText('h3','Android / 电脑'),pwaText('p','在 Chrome 或 Edge 的浏览器菜单中选择「安装应用」或「添加到主屏幕」。若没有这个选项，请在系统浏览器中打开当前网址。'));
  const retry=pwaText('button','重新准备离线内容','btn secondary');retry.id='retryOfflineSetup';retry.onclick=async()=>{retry.disabled=true;try{await prepareOffline(true);}finally{if(retry.isConnected)retry.disabled=false;}};body.append(retry);
  body.append(pwaText('p','照片不会上传。作品会自动保存在本机浏览器中；重新打开可恢复最近成功保存的草稿，重要作品请导出备份。','hint'));
  showModal(t('安装间象'),body);renderPWAStatus();
}
async function promptInstallApp(){
  const event=appPWA.prompt;if(!event||!appPWA.ready){showInstallApp();return;}
  appPWA.prompt=null;
  try{
    // Called directly from the button's user gesture, as browsers require.
    await event.prompt();
    const result=await event.userChoice;
    if(result.outcome==='accepted')toast(t('浏览器正在处理安装，请按屏幕提示完成。'));
  }catch{showInstallApp();}
  finally{renderPWAStatus();}
}
function showAppUpdate(){
  if(!appPWA.registration?.waiting){toast(t('当前已是最新版本。'));return;}
  const body=document.createElement('div');body.className='modal-content';
  body.append(pwaText('p','新版本已下载。应用更新会重新打开页面。'));
  if(state.dirty)body.append(pwaText('p','请先导出当前作品，再应用更新；也可以继续使用当前版本。','callout'));
  const button=pwaText('button','应用更新','btn primary');button.id='applyAppUpdate';button.disabled=state.dirty||state.busy||state.importing>0;
  button.onclick=applyAppUpdate;body.append(button);showModal(t('更新间象'),body);
}
async function applyAppUpdate(){
  if(state.busy||state.importing){toast(t('请先等待照片读取或导出完成。'));return;}
  if(state.dirty){toast(t('请先导出当前作品，再应用更新；也可以继续使用当前版本。'));return;}
  const worker=appPWA.registration?.waiting;if(!worker){renderPWAStatus();return;}
  const button=$('#applyAppUpdate');if(button)button.disabled=true;
  appPWA.updateRequested=true;
  try{
    const result=await workerMessage(worker,'SKIP_WAITING');
    if(!result.accepted){
      appPWA.updateRequested=false;
      toast(t(result.reason==='other-tabs'?'请先关闭其他间象页面，再应用更新。':'暂时无法更新，可以稍后再试。'));
    }
  }catch{appPWA.updateRequested=false;toast(t('暂时无法更新，可以稍后再试。'));}
  finally{if(button?.isConnected)button.disabled=false;}
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();appPWA.prompt=event;renderPWAStatus();});
window.addEventListener('appinstalled',()=>{appPWA.prompt=null;appPWA.installed=true;renderPWAStatus();toast(t('已安装到设备'));});
window.addEventListener('online',()=>{renderPWAStatus();prepareOffline();});
window.addEventListener('offline',()=>{renderPWAStatus();refreshOfflineStatus();});
document.addEventListener('languagechange',renderPWAStatus);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshOfflineStatus();});
document.addEventListener('DOMContentLoaded',()=>{
  $('#installAppBtn').onclick=()=>appPWA.prompt&&appPWA.ready&&!appIsStandalone()?promptInstallApp():showInstallApp();
  $('#pwaUpdateBtn').onclick=showAppUpdate;
  if(appPWA.supported){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(appPWA.updateRequested){appPWA.updateRequested=false;location.reload();}
      else refreshOfflineStatus();
    });
  }
  renderPWAStatus();prepareOffline();
});
