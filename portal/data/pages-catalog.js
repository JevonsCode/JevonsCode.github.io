// Curated Swiss visual metadata, authentic product brand tokens/logos, & live GitHub Pages catalog merger.

export const PORTAL_OWNER = 'JevonsCode';
export const PORTAL_REPO = 'JevonsCode.github.io';
export const DISPLAY_DOMAIN = '有点.意思.com';
export const ORIGIN_PUNYCODE = 'https://xn--8ovp9s.xn--m8txu.com';

const PRODUCTION_HOSTS = new Set([
  '有点.意思.com',
  'xn--8ovp9s.xn--m8txu.com',
  'jevonscode.github.io',
]);

// Authentic brand logos, palettes, and kinetic stage keys matching each project's real visual identity.
export const CURATED_STAGE_META = Object.freeze({
  fuli: {
    displayTitle: 'FULI · 复利',
    tag: 'AI',
    artKey: 'fuli-brand',
    span: 'hero',
    accent: '#0F6B55',
    accentAlt: '#D4942A',
    logo: './portal/assets/brands/fuli-logo.png',
    logoLightBg: true,
    order: 1,
    hot: true,
  },
  DingDongBuddy: {
    displayTitle: '叮咚 · DINGDONG',
    tag: 'AI',
    artKey: 'dingdong-mascot',
    span: 'tall',
    accent: '#2F6F8F',
    accentAlt: '#F06438',
    logo: './portal/assets/brands/dingdong-icon.png',
    logoDark: './portal/assets/brands/dingdong-icon-w.png',
    order: 2,
    hot: true,
  },
  phonebridge: {
    displayTitle: 'PHONEBRIDGE',
    tag: 'AI',
    artKey: 'phonebridge-brand',
    span: 'wide',
    accent: '#1967D2',
    accentAlt: '#60A5FA',
    logo: './portal/assets/brands/phonebridge-mark.png',
    logoLightBg: true,
    order: 3,
  },
  'fuli-avatar': {
    displayTitle: 'FULI AVATAR',
    tag: 'AI',
    artKey: 'fuli-avatar-live',
    span: 'wide',
    accent: '#34543B',
    accentAlt: '#C9773F',
    logo: './portal/assets/brands/fuli-avatar-logo.svg',
    order: 4,
  },
  jianxiang: {
    displayTitle: '间象 · JIANXIANG',
    tag: 'STUDIO',
    artKey: 'jianxiang-grid',
    span: 'tall',
    accent: '#6367F2',
    accentAlt: '#E85F35',
    logo: './portal/assets/brands/jianxiang-icon.png',
    logoLightBg: true,
    order: 5,
    localSubpath: true,
  },
  'dingdong-voices': {
    displayTitle: '叮咚声库 · VOICES',
    tag: 'STUDIO',
    artKey: 'dingdong-voices',
    span: 'standard',
    accent: '#315F7A',
    accentAlt: '#AD4A3E',
    logo: './portal/assets/brands/dingdong-icon.png',
    logoDark: './portal/assets/brands/dingdong-icon-w.png',
    order: 6,
  },
  '3d-solar-system': {
    displayTitle: '3D SOLAR',
    tag: '3D',
    artKey: 'kepler-orrery',
    span: 'standard',
    accent: '#3B82F6',
    order: 7,
  },
  'astron-solar-system': {
    displayTitle: 'SOLARIS 3D · 太阳系',
    tag: '3D',
    artKey: 'astrolabe-chart',
    span: 'wide',
    accent: '#6366F1',
    order: 8,
  },
  'union-lotto': {
    displayTitle: 'UNION LOTTO',
    tag: 'PLAY',
    artKey: 'lotto-drums',
    span: 'standard',
    accent: '#EF4444',
    order: 9,
  },
  'my-awesome-ai-tools': {
    displayTitle: 'WORKSTATION',
    tag: 'AI',
    artKey: 'switchboard-matrix',
    span: 'standard',
    accent: '#14B8A6',
    order: 10,
  },
  'game-score-website': {
    displayTitle: 'DECK SCORE',
    tag: 'PLAY',
    artKey: 'poker-fan',
    span: 'standard',
    accent: '#EC4899',
    order: 11,
  },
  'notion-resume-builder': {
    displayTitle: 'SWISS RESUME',
    tag: 'STUDIO',
    artKey: 'modular-blocks',
    span: 'standard',
    accent: '#8B5CF6',
    order: 12,
  },
  'oled-burn-fix': {
    displayTitle: 'OLED PRISM',
    tag: 'TOOL',
    artKey: 'rgb-subpixel',
    span: 'standard',
    accent: '#06B6D4',
    order: 13,
  },
  image2base64: {
    displayTitle: 'IMG ⇄ B64',
    tag: 'TOOL',
    artKey: 'pixel-cipher',
    span: 'standard',
    accent: '#4CAF50',
    logo: './portal/assets/brands/image2base64-logo.svg',
    order: 14,
  },
  'typescript-interface-generate-markdown': {
    displayTitle: 'TS ⟶ MD',
    tag: 'TOOL',
    artKey: 'syntax-morph',
    span: 'standard',
    accent: '#2563EB',
    order: 15,
  },
  tools: {
    displayTitle: 'CALIPER KIT',
    tag: 'TOOL',
    artKey: 'vernier-dial',
    span: 'standard',
    accent: '#F97316',
    order: 16,
  },
  'check-version': {
    displayTitle: 'ENV PROBE',
    tag: 'TOOL',
    artKey: 'version-check-ring',
    span: 'standard',
    accent: '#4CAF50',
    accentAlt: '#68E534',
    order: 17,
  },
  index: {
    displayTitle: 'INDEXS ➹',
    tag: 'STUDIO',
    artKey: 'vector-compass',
    span: 'standard',
    accent: '#3AAAE8',
    order: 18,
  },
  // Hidden Vault items (unlocked via [VAULT] Easter Egg)
  'pages-index': {
    displayTitle: 'ARCHIVE v0',
    tag: 'VAULT',
    artKey: 'procedural',
    span: 'standard',
    accent: '#71717A',
    order: 90,
    vault: true,
  },
  __temporary__: {
    displayTitle: 'UA PROBE',
    tag: 'VAULT',
    artKey: 'procedural',
    span: 'standard',
    accent: '#A1A1AA',
    order: 91,
    vault: true,
  },
  postmessagetest: {
    displayTitle: 'POSTMSG BUS',
    tag: 'VAULT',
    artKey: 'procedural',
    span: 'standard',
    accent: '#78716C',
    order: 92,
    vault: true,
    localSubpath: true,
  },
});

// One-line hover introductions. Repos without an entry fall back to their GitHub description.
export const PROJECT_BLURBS = Object.freeze({
  fuli: { zh: '让 AI Agent 记住你的品味与判断，跨客户端接力协作', en: 'Keeps your taste and judgment across AI agents and clients.' },
  DingDongBuddy: { zh: '本地 AI Agent 的桌面小伙伴，剪贴板与提醒一手掌握', en: 'A desktop companion for your clipboard and local AI agents.' },
  phonebridge: { zh: '让 AI 看见屏幕，替你点按、滑动和打字的安卓桥', en: 'Lets your AI see, tap, swipe and type on your Android phone.' },
  'fuli-avatar': { zh: '零依赖、确定性生成的 SVG 角色头像', en: 'Dependency-free, deterministic SVG character avatars.' },
  jianxiang: { zh: '图像与留白的排版小工坊，可离线安装', en: 'A pocket studio for images and negative space, works offline.' },
  'dingdong-voices': { zh: '叮咚社区提示音库，每段不超过 3 秒', en: 'Community notification sounds for DingDong, 3 seconds or less.' },
  '3d-solar-system': { zh: '用虚拟摇杆漫游的 Three.js 3D 太阳系', en: 'Fly through a Three.js solar system with a virtual joystick.' },
  'astron-solar-system': { zh: '可自由飞行、时间驱动、可着陆的精细 3D 太阳系', en: 'Free-flying, time-driven, landable high-precision 3D solar system.' },
  'union-lotto': { zh: '双色球号码小工具', en: 'A little Union Lotto number picker.' },
  'my-awesome-ai-tools': { zh: '我的数字工作站，常用 AI 工具一站直达', en: 'My digital workstation: favorite AI tools in one place.' },
  'game-score-website': { zh: '德州扑克等桌游计分板，手机上顺手', en: "Mobile-friendly scorekeeping for Texas Hold'em and friends." },
  'notion-resume-builder': { zh: 'Notion 风格的轻量简历生成器', en: 'A lightweight, Notion-style resume builder.' },
  'oled-burn-fix': { zh: '全屏循环变色，缓解 OLED 烧屏', en: 'Cycles full-screen colors to ease OLED burn-in.' },
  image2base64: { zh: '把图片一键转成 Base64', en: 'Turns images into Base64 strings.' },
  'typescript-interface-generate-markdown': { zh: '从 TypeScript 接口生成 Markdown 文档', en: 'Generates Markdown docs from TypeScript interfaces.' },
  tools: { zh: '随手做的小工具合集', en: 'A grab bag of small tools.' },
  'check-version': { zh: '一眼看清当前版本是否最新', en: 'Checks at a glance whether you are on the latest version.' },
  index: { zh: '早期的网址导航，支持标签与搜索', en: 'An early link index with tags and search.' },
  'pages-index': { zh: '这个门户的初版存档', en: 'The first draft of this portal.' },
  __temporary__: { zh: 'UA 识别测试页', en: 'A user-agent test page.' },
  postmessagetest: { zh: 'postMessage 跨窗口通信测试', en: 'A cross-window postMessage test.' },
});

const FALLBACK_ACCENTS = ['#FF3B1D', '#1967D2', '#0F6B55', '#E09F3E', '#6367F2', '#EC4899', '#06B6D4'];

export function hashSeed(input) {
  let h = 2166136261;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function inferTagFromRepo(entry) {
  const topics = Array.isArray(entry.topics) ? entry.topics.join(' ').toLowerCase() : '';
  const name = String(entry.slug || entry.name || '').toLowerCase();
  if (topics.includes('ai') || topics.includes('mcp') || name.includes('agent') || name.includes('ai')) {
    return 'AI';
  }
  if (name.includes('3d') || name.includes('solar') || topics.includes('webgl')) {
    return '3D';
  }
  if (name.includes('game') || name.includes('lotto') || name.includes('play')) {
    return 'PLAY';
  }
  return 'TOOL';
}

function cleanDisplayTitle(slug, rawTitle) {
  const curated = CURATED_STAGE_META[slug];
  if (curated?.displayTitle) return curated.displayTitle;
  if (rawTitle && rawTitle.trim().length > 0 && rawTitle.trim().length <= 24) {
    return rawTitle.trim().toUpperCase();
  }
  return String(slug)
    .replace(/[-_]+/g, ' ')
    .trim()
    .toUpperCase();
}

function formatStamp(isoDate) {
  if (!isoDate) return '26.00';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '26.00';
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}.${mm}`;
}

export function resolvePageHref(slug, { hostname = '', localSubpath = false } = {}) {
  const cleanSlug = String(slug || '').replace(/^\/+|\/+$/g, '');
  const normalizedHost = String(hostname || '').toLowerCase();
  if (PRODUCTION_HOSTS.has(normalizedHost) || localSubpath) {
    return `/${cleanSlug}/`;
  }
  return `${ORIGIN_PUNYCODE}/${cleanSlug}/`;
}

export function mergePagesCatalog(manifestItems = [], liveGithubRepos = [], options = {}) {
  const hostname = options.hostname || '';
  const bySlug = new Map();

  for (const item of manifestItems) {
    if (!item?.slug || item.slug.toLowerCase() === PORTAL_REPO.toLowerCase()) continue;
    bySlug.set(item.slug, { ...item });
  }

  for (const repo of liveGithubRepos) {
    if (!repo || !repo.has_pages || repo.archived) continue;
    if (!repo.name || repo.name.toLowerCase() === PORTAL_REPO.toLowerCase()) continue;
    const prev = bySlug.get(repo.name) || {};
    bySlug.set(repo.name, {
      ...prev,
      slug: repo.name,
      language: repo.language || prev.language || '',
      description: repo.description || prev.description || '',
      topics: Array.isArray(repo.topics) && repo.topics.length ? repo.topics : prev.topics || [],
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : prev.stars || 0,
      pushedAt: repo.pushed_at || prev.pushedAt || '',
      repoUrl: repo.html_url || prev.repoUrl || `https://github.com/${PORTAL_OWNER}/${repo.name}`,
    });
  }

  const normalized = [];
  for (const [slug, raw] of bySlug.entries()) {
    const curated = CURATED_STAGE_META[slug];
    const seed = hashSeed(slug);
    const localSubpath = Boolean(curated?.localSubpath || raw.localSubpath);
    normalized.push({
      slug,
      displayTitle: cleanDisplayTitle(slug, raw.pageTitle),
      tag: curated?.tag || raw.tag || inferTagFromRepo(raw),
      artKey: curated?.artKey || 'procedural',
      span: curated?.span || 'standard',
      accent: curated?.accent || FALLBACK_ACCENTS[seed % FALLBACK_ACCENTS.length],
      accentAlt: curated?.accentAlt || null,
      blurb: PROJECT_BLURBS[slug] || (raw.description ? { zh: raw.description, en: raw.description } : null),
      hot: Boolean(curated?.hot),
      logo: curated?.logo || null,
      logoDark: curated?.logoDark || null,
      logoLightBg: Boolean(curated?.logoLightBg),
      order: curated?.order ?? 50,
      vault: Boolean(curated?.vault || raw.vault),
      localSubpath,
      seed,
      stamp: formatStamp(raw.pushedAt),
      routeLabel: `/${slug}`,
      href: resolvePageHref(slug, { hostname, localSubpath }),
      repoUrl:
        raw.repoUrl ||
        (localSubpath
          ? `https://github.com/${PORTAL_OWNER}/${PORTAL_REPO}/tree/master/${slug}`
          : `https://github.com/${PORTAL_OWNER}/${slug}`),
      pushedAt: raw.pushedAt || '',
      stars: raw.stars || 0,
    });
  }

  normalized.sort((a, b) => {
    if (a.vault !== b.vault) return a.vault ? 1 : -1;
    if (a.order !== b.order) return a.order - b.order;
    return String(b.pushedAt).localeCompare(String(a.pushedAt));
  });

  return normalized.map((entry, idx) => ({
    ...entry,
    indexCode: String(idx + 1).padStart(2, '0'),
  }));
}

const SESSION_CACHE_KEY = 'ydys.gh.pages.v2';
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function loadLivePagesCatalog({ fetchImpl = fetch, hostname = window.location.hostname } = {}) {
  let manifestItems = [];
  try {
    const manifestResp = await fetchImpl('./portal/data/pages-manifest.json');
    if (manifestResp.ok) {
      const parsed = await manifestResp.json();
      manifestItems = Array.isArray(parsed?.items) ? parsed.items : [];
    }
  } catch {
    // Fallback to live API or curated defaults if manifest fetch fails.
  }

  let liveRepos = [];
  try {
    const cachedRaw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (Date.now() - cached.ts < CACHE_TTL_MS && Array.isArray(cached.repos)) {
        liveRepos = cached.repos;
      }
    }
    if (!liveRepos.length) {
      const ghResp = await fetchImpl(`https://api.github.com/users/${PORTAL_OWNER}/repos?per_page=100&sort=pushed`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (ghResp.ok) {
        const json = await ghResp.json();
        if (Array.isArray(json)) {
          liveRepos = json.filter((r) => r && r.has_pages);
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ ts: Date.now(), repos: liveRepos }));
        }
      }
    }
  } catch {
    // Offline or rate-limited: manifestItems already carry the full snapshot.
  }

  return mergePagesCatalog(manifestItems, liveRepos, { hostname });
}
