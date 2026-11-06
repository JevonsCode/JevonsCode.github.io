// Portal locale: zh / en interface strings, persisted choice, and bilingual text picking.
// The 有点·意思 wordmark is never translated; English adds a gloss beneath it instead.

const STORAGE_KEY = 'ydys.lang.v1';

export const PREFIX_VARIANTS = [
  { prefix: '有点', pinyin: 'yǒu diǎn', meaning: 'a little / got a dot', sum: 'kinda interesting' },
  { prefix: '差点', pinyin: 'chà diǎn', meaning: 'almost / lacking a bit', sum: 'almost got the point' },
  { prefix: '意思', pinyin: 'yì si', meaning: 'just a token gesture', sum: 'just being polite' },
  { prefix: '真有', pinyin: 'zhēn yǒu', meaning: 'really got', sum: 'genuinely interesting' },
  { prefix: '超有', pinyin: 'chāo yǒu', meaning: 'super got', sum: 'super interesting' },
  { prefix: '够', pinyin: 'gòu', meaning: 'enough of / stand-up', sum: 'plenty generous & cool' },
  { prefix: '别有', pinyin: 'bié yǒu', meaning: 'uniquely holding', sum: 'a whole different flavor' },
  { prefix: '全是', pinyin: 'quán shì', meaning: 'purely / all', sum: 'chock-full of meaning' },
];

const STRINGS = {
  zh: {
    langToggle: 'EN',
    langToggleAria: '切换为英文',
    themeDark: '◐ 暗色',
    themeLight: '☀ 亮色',
    soundOn: '♪ 开',
    soundOff: '♪ 关',
    livePages: '在线作品',
    site: '官网 ↗',
    siteCursor: '官网 ↗',
    githubCursor: 'GITHUB ↗',
    peekCursor: '预览 ◫',
    peekTitle: '站内预览',
    githubTitle: 'GitHub 仓库',
    siteTitle: '打开官网',
    hot: '推荐',
    hotTitle: '站长强力推荐',
    orbitHint: '拖拽 / 滚动 · 360°',
    spotlightPlaceholder: '跳转 // FULI、3D、叮咚、手机…',
    mobileView: '▯ 手机',
    desktopView: '▭ 桌面',
    zeroGReset: '0G · 复位',
    stageLoading: '赛博神经矩阵接入中 // OVERDRIVE',
    peekLoading: '传送门跃迁中 // WARPING SITE…',
    tag_ALL: '全部',
    tag_AI: 'AI',
    tag_3D: '3D',
    tag_STUDIO: '创作',
    tag_PLAY: '好玩',
    tag_TOOL: '工具',
    tag_VAULT: '⚿ 密室',
  },
  en: {
    langToggle: '中',
    langToggleAria: 'Switch to Chinese',
    themeDark: '◐ DARK',
    themeLight: '☀ LIGHT',
    soundOn: '♪ ON',
    soundOff: '♪ OFF',
    livePages: 'LIVE PAGES',
    site: 'SITE ↗',
    siteCursor: 'SITE ↗',
    githubCursor: 'GITHUB ↗',
    peekCursor: 'PEEK ◫',
    peekTitle: 'Preview here',
    githubTitle: 'GitHub repository',
    siteTitle: 'Open site',
    hot: 'HOT',
    hotTitle: 'Featured Flagship',
    orbitHint: 'DRAG / SCROLL · 360°',
    spotlightPlaceholder: 'JUMP // FULI, 3D, DINGDONG, PHONE…',
    mobileView: '▯ MOBILE',
    desktopView: '▭ DESKTOP',
    zeroGReset: '0G · RESET',
    stageLoading: 'NEURAL MATRIX INJECTION // OVERDRIVE',
    peekLoading: 'PORTAL WARP IN PROGRESS…',
    tag_ALL: 'ALL',
    tag_AI: 'AI',
    tag_3D: '3D',
    tag_STUDIO: 'STUDIO',
    tag_PLAY: 'PLAY',
    tag_TOOL: 'TOOL',
    tag_VAULT: '⚿ VAULT',
  },
};

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // Private mode: fall through to the browser language.
  }
  return String(navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let current = detectLang();
const listeners = new Set();

export function currentLang() {
  return current;
}

export function t(key) {
  return STRINGS[current]?.[key] ?? STRINGS.zh[key] ?? key;
}

export function pickText(bilingual) {
  if (!bilingual) return '';
  if (typeof bilingual === 'string') return bilingual;
  return bilingual[current] || bilingual.zh || bilingual.en || '';
}

export function applyStaticTranslations(root = document) {
  document.documentElement.lang = current === 'en' ? 'en' : 'zh-CN';
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
}

export function setLang(lang) {
  current = lang === 'en' ? 'en' : 'zh';
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // Ignore storage failures; the choice still applies to this page view.
  }
  applyStaticTranslations();
  listeners.forEach((fn) => fn(current));
}

export function onLangChange(fn) {
  listeners.add(fn);
}

export function renderBrandGloss(el, prefix = '有点') {
  if (!el) return;
  if (current !== 'en') {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const meta = PREFIX_VARIANTS.find((p) => p.prefix === prefix) || PREFIX_VARIANTS[0];
  el.hidden = false;
  el.innerHTML = `
    <span class="gloss-pinyin">${meta.pinyin} <span class="gloss-dot" aria-hidden="true">·</span> yì si</span>
    <span class="gloss-line"><b>${prefix}</b> (${meta.meaning}) + <b class="gloss-dot-highlight">·</b> (the literal <em>dot</em>) + <b>意思</b> (interest / meaning).</span>
    <span class="gloss-line">Combined: <em>“${meta.sum}.”</em> Our domain is literally a pun on “having a dot”!</span>
  `;
}
