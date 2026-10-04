'use strict';

// Keep language changes separate from the photo draft: no reloads or data resets.
const I18n=(()=>{
  const messages={en:{},es:{}},supported=['zh','en','es'];
  let saved='zh';
  try{saved=localStorage.getItem('jianxiang-language')||'zh';}catch{}
  const requested=new URL(location.href).searchParams.get('lang');
  let language=supported.includes(requested)?requested:supported.includes(saved)?saved:'zh';
  function syncUrl(){
    const url=new URL(location.href);url.searchParams.set('lang',language);
    try{history.replaceState(history.state,'',url);}catch{}
  }
  function translate(key,params={}){
    let value=language==='zh'?key:messages[language][key]??key;
    if(typeof value==='object')value=value[Number(params.count)===1?'one':'other'];
    return value.replace(/\{([\w]+)\}/g,(match,name)=>Object.hasOwn(params,name)?String(params[name]):match);
  }
  function apply(root=document){
    document.documentElement.lang=language==='zh'?'zh-CN':language;
    const attributes=['aria-label','alt','title','placeholder','content'];
    const selector=['[data-i18n]',...attributes.map(name=>`[data-i18n-${name}]`)].join(',');
    const elements=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
    for(const element of elements){
      if(element.hasAttribute('data-i18n'))element.textContent=translate(element.getAttribute('data-i18n'));
      for(const name of attributes){const key=element.getAttribute('data-i18n-'+name);if(key!==null)element.setAttribute(name,translate(key));}
    }
    const picker=document.querySelector('#languageSelect');if(picker)picker.value=language;
  }
  function setLanguage(next){
    if(!supported.includes(next))return;
    language=next;
    try{localStorage.setItem('jianxiang-language',next);}catch{}
    // Share links reopen in the same language, preserving other query/hash values.
    syncUrl();
    apply();
    document.dispatchEvent(new CustomEvent('languagechange',{detail:{language}}));
  }
  if(language!=='zh'||requested!==null)syncUrl();
  return {addMessages(catalog){for(const locale of ['en','es'])Object.assign(messages[locale],catalog[locale]||{});},t:translate,apply,setLanguage,get language(){return language;}};
})();
function t(key,params){return I18n.t(key,params);}
function displayPhotoName(photo){return photo.nameKey?t(photo.nameKey):photo.name;}
