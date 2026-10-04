'use strict';

I18n.addMessages({
  en:{
    '语言':'Language','使用指南':'Guide','分享':'Share','分享当前链接':'Share this link',
    '链接已复制，可以粘贴分享。':'Link copied. Paste it to share.',
    '复制链接':'Copy link','当前网址':'Current URL',
    '也可以长按或选中下方网址，手动复制。':'You can also select or press and hold the URL below to copy it.',
    '请选中网址并复制。':'Select the URL and copy it.',
    '分享间象':'Share Jianxiang',
    '间象 · 图像与留白之间，自有想象。':'Jianxiang · A space for images and imagination.'
  },
  es:{
    '语言':'Idioma','使用指南':'Guía','分享':'Compartir','分享当前链接':'Compartir este enlace',
    '链接已复制，可以粘贴分享。':'Enlace copiado. Pégalo para compartirlo.',
    '复制链接':'Copiar enlace','当前网址':'URL actual',
    '也可以长按或选中下方网址，手动复制。':'También puedes seleccionar o mantener pulsada la URL para copiarla.',
    '请选中网址并复制。':'Selecciona la URL y cópiala.',
    '分享间象':'Compartir Jianxiang',
    '间象 · 图像与留白之间，自有想象。':'Jianxiang · Un espacio para las imágenes y la imaginación.'
  }
});

function refreshLanguageUI(){
  I18n.apply();
  clearTimeout(toastTimer);$('#toast').classList.remove('show');$('#toast').textContent='';
  $('#modeLabel').textContent=t(state.mode==='classic'?'经典九宫格':'溢出拼贴');
  for(const button of $$('.cover-cell'))button.setAttribute('aria-label',t('编辑第 {index} 格的长图',{index:Number(button.dataset.index)+1}));
  for(const button of $$('.mini-cell'))button.setAttribute('aria-label',t('选择第 {index} 格',{index:Number(button.dataset.index)+1}));
  importStatus(0);
  renderStory();
  syncOverflowControls();
  for(const id of ['gridGap','thumbWidth']){
    const input=$('#'+id);
    if(input.validity.customError)input.setCustomValidity(t('请输入 {min}–{max} 之间的数值',{min:input.min,max:input.max}));
  }
}

async function copyLink(url){
  if(navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(url);return true;}catch{}
  }
  return false;
}

function showShareLink(url){
  showModal(t('分享当前链接'),`<div class="modal-content share-dialog"><label for="shareUrl">${t('当前网址')}</label><input id="shareUrl" type="url" readonly dir="ltr"><p class="hint">${t('也可以长按或选中下方网址，手动复制。')}</p><div class="modal-actions"><button id="copyShareLink" class="btn primary">${t('复制链接')}</button></div></div>`);
  const input=$('#shareUrl');input.value=url;input.onclick=()=>input.select();
  $('#copyShareLink').onclick=async()=>{
    input.focus();input.select();
    let copied=await copyLink(url);
    if(!copied){try{copied=document.execCommand('copy');}catch{}}
    toast(t(copied?'链接已复制，可以粘贴分享。':'请选中网址并复制。'));
  };
  input.focus();input.select();
}

async function shareCurrentPage(){
  const button=$('#shareBtn'),url=location.href;
  button.disabled=true;button.setAttribute('aria-busy','true');
  try{
    if(navigator.share){
      try{await navigator.share({title:t('间象 · 图像与留白之间，自有想象。'),url});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    if(await copyLink(url))toast(t('链接已复制，可以粘贴分享。'));
    else showShareLink(url);
  }finally{button.disabled=false;button.removeAttribute('aria-busy');}
}

function bindLocaleAndShare(){
  $('#languageSelect').onchange=event=>I18n.setLanguage(event.target.value);
  $('#shareBtn').onclick=shareCurrentPage;
  document.addEventListener('languagechange',refreshLanguageUI);
  refreshLanguageUI();
}
