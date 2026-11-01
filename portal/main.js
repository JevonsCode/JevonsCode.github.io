// Portal composition root: wires catalog, 3 kinetic stage modes (GRID / ORBIT / RUNWAY), dual Website + GitHub links, Eclipse theme, Peek & Spotlight.

import { DISPLAY_DOMAIN, loadLivePagesCatalog } from './data/pages-catalog.js';
import { synth } from './audio/micro-synth.js';
import { CardArtDirector } from './visuals/card-art.js';
import { SwissFieldCanvas } from './visuals/field-canvas.js';
import { SwissReticleCursor, bindCardTiltAndScramble } from './interactions/cursor-and-tilt.js';
import { EasterEggController } from './interactions/easter-eggs.js';
import {
  t,
  pickText,
  currentLang,
  setLang,
  onLangChange,
  applyStaticTranslations,
  renderBrandGloss,
} from './i18n/locale.js';

const THEME_STORAGE_KEY = 'ydys.theme.v1';

const GITHUB_ICON_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;

const state = {
  allItems: [],
  activeTag: 'ALL',
  stageMode: 'grid', // 'grid' | 'orbit' | 'runway'
  vaultUnlocked: false,
  hoveredItem: null,
  rouletteSpins: 0,
  orbitAngle: 0,
  orbitVelocity: 0.14,
  orbitDragging: false,
  orbitRaf: 0,
};

const artDirector = new CardArtDirector();
let field = null;
let eggs = null;

function visibleItems() {
  return state.allItems.filter((item) => {
    if (item.vault && !state.vaultUnlocked) return false;
    if (state.activeTag === 'ALL') return !item.vault || state.activeTag === 'VAULT';
    return item.tag === state.activeTag;
  });
}

function animateCounter(targetValue) {
  const el = document.getElementById('total-counter');
  if (!el) return;
  const start = performance.now();
  const from = parseInt(el.textContent || '0', 10) || 0;
  const step = (now) => {
    const p = Math.min(1, (now - start) / 560);
    const eased = 1 - (1 - p) ** 3;
    const val = Math.round(from + (targetValue - from) * eased);
    el.textContent = String(val).padStart(2, '0');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function renderBrandBadgeHtml(item) {
  if (!item.logo) return '';
  const cls = [
    'brand-badge',
    item.logoLightBg ? 'is-light-seal' : '',
    item.logoDark ? 'has-dark-variant' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const darkImg = item.logoDark ? `<img class="img-dark" src="${item.logoDark}" alt="" loading="lazy" />` : '';
  return `<span class="${cls}" aria-hidden="true"><img class="img-light" src="${item.logo}" alt="" loading="lazy" />${darkImg}</span>`;
}

function renderFilterPills() {
  const wrap = document.getElementById('filter-pills');
  if (!wrap) return;
  const tags = ['ALL', 'AI', '3D', 'STUDIO', 'PLAY', 'TOOL'];
  if (state.vaultUnlocked) tags.push('VAULT');

  wrap.innerHTML = '';
  for (const tag of tags) {
    const count =
      tag === 'ALL'
        ? state.allItems.filter((i) => !i.vault).length
        : state.allItems.filter((i) => i.tag === tag && (!i.vault || state.vaultUnlocked)).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pill-btn${state.activeTag === tag ? ' is-active' : ''}${tag === 'VAULT' ? ' is-vault' : ''}`;
    btn.setAttribute('data-cursor', tag);
    btn.textContent = `${t(`tag_${tag}`)} · ${String(count).padStart(2, '0')}`;
    btn.addEventListener('click', () => {
      synth.playClick();
      state.activeTag = tag;
      renderFilterPills();
      renderStage();
    });
    wrap.appendChild(btn);
  }
}

function createCardElement(item, visualIdx, { forOrbit = false } = {}) {
  const article = document.createElement('article');
  article.className = 'portal-card';
  article.dataset.slug = item.slug;
  if (!forOrbit) {
    article.dataset.span = state.activeTag === 'ALL' ? item.span : 'standard';
  }
  article.style.setProperty('--card-accent', item.accent);
  article.style.animationDelay = `${Math.min(visualIdx * 32, 360)}ms`;

  const blurb = escapeHtml(pickText(item.blurb));
  article.innerHTML = `
    <div class="card-top">
      <span class="card-index">${String(visualIdx + 1).padStart(2, '0')} // ${item.stamp}</span>
      <span class="card-top-right">
        ${renderHotBadgeHtml(item)}
        ${renderBrandBadgeHtml(item)}
        <span class="card-tag">${t(`tag_${item.tag}`)}</span>
      </span>
    </div>
    <div class="card-stage">
      <canvas class="card-canvas" aria-hidden="true"></canvas>
      <button type="button" class="card-hit-link" aria-label="${t('peekTitle')} ${item.displayTitle}" data-cursor="${t('peekCursor')}"></button>
      ${blurb ? `<div class="card-blurb" aria-hidden="true">${blurb}</div>` : ''}
    </div>
    <div class="card-bottom">
      <div class="card-identity">
        <h2 class="card-title">${item.displayTitle}</h2>
        <span class="card-route">${DISPLAY_DOMAIN}${item.routeLabel}</span>
      </div>
      ${renderLinkActionsHtml(item)}
    </div>
  `;

  const canvas = article.querySelector('.card-canvas');
  const stageEl = article.querySelector('.card-stage');
  artDirector.mount(canvas, { ...item, _stageEl: stageEl });
  bindCardTiltAndScramble(article, item.displayTitle, () => synth.playHover(visualIdx));

  article.addEventListener('pointerenter', () => {
    state.hoveredItem = item;
  });
  article.addEventListener('pointerleave', () => {
    if (state.hoveredItem === item) state.hoveredItem = null;
  });

  // Clicking anywhere on the card except its link buttons opens the in-portal preview.
  article.addEventListener('click', (e) => {
    if (e.target.closest('a, .fuli-avatar-roll')) return;
    synth.playClick();
    openPeek(item);
  });

  return article;
}

function renderHotBadgeHtml(item) {
  if (!item.hot) return '';
  return `<span class="hot-badge" title="${t('hotTitle')}"><span class="hot-flame" aria-hidden="true">🔥</span>${t('hot')}</span>`;
}

function renderLinkActionsHtml(item) {
  return `
    <div class="card-actions">
      <a class="icon-chip is-site" href="${item.href}" target="_blank" rel="noopener" title="${t('siteTitle')}" data-cursor="${t('siteCursor')}">${t('site')}</a>
      <a class="icon-chip" href="${item.repoUrl}" target="_blank" rel="noopener" title="${t('githubTitle')}" data-cursor="${t('githubCursor')}">${GITHUB_ICON_SVG}<span>GitHub</span></a>
    </div>
  `;
}

function stopOrbitLoop() {
  if (state.orbitRaf) {
    cancelAnimationFrame(state.orbitRaf);
    state.orbitRaf = 0;
  }
}

function renderOrbitStage(container, items) {
  const wrap = document.createElement('div');
  wrap.className = 'stage-orbit-wrap';
  const ring = document.createElement('div');
  ring.className = 'orbit-ring';
  wrap.appendChild(ring);

  const hint = document.createElement('div');
  hint.className = 'orbit-hint';
  hint.textContent = t('orbitHint');
  wrap.appendChild(hint);
  container.appendChild(wrap);

  const cards = items.map((item, idx) => {
    const el = createCardElement(item, idx, { forOrbit: true });
    ring.appendChild(el);
    return el;
  });

  requestAnimationFrame(() => artDirector.measureAll());

  let lastX = 0;
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    state.orbitDragging = true;
    lastX = e.clientX;
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!state.orbitDragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    state.orbitVelocity = dx * 0.22;
    state.orbitAngle += state.orbitVelocity;
  });
  const endDrag = () => {
    state.orbitDragging = false;
  };
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
  wrap.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault();
        state.orbitVelocity += (e.deltaX || e.deltaY) * -0.04;
      } else {
        state.orbitVelocity += e.deltaY * -0.025;
      }
    },
    { passive: false }
  );

  const count = Math.max(1, cards.length);
  const radius = Math.max(360, Math.min(760, count * 48));

  const tick = () => {
    if (!state.orbitDragging) {
      state.orbitAngle += state.orbitVelocity;
      state.orbitVelocity = state.orbitVelocity * 0.95 + (state.orbitVelocity >= 0 ? 0.005 : -0.005);
    }
    const stepDeg = 360 / count;
    cards.forEach((card, i) => {
      const deg = i * stepDeg + state.orbitAngle;
      const rad = (deg * Math.PI) / 180;
      const frontness = (Math.cos(rad) + 1) * 0.5;
      card.style.transform = `rotateY(${deg.toFixed(2)}deg) translateZ(${radius}px)`;
      card.style.opacity = (0.28 + frontness * 0.72).toFixed(2);
      card.style.zIndex = String(Math.round(frontness * 100));
    });
    state.orbitRaf = requestAnimationFrame(tick);
  };
  state.orbitRaf = requestAnimationFrame(tick);
}

function renderRunwayStage(container, items) {
  const list = document.createElement('div');
  list.className = 'stage-runway';

  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'runway-row';
    row.dataset.slug = item.slug;
    row.setAttribute('data-cursor', t('peekCursor'));
    const blurb = escapeHtml(pickText(item.blurb));
    row.innerHTML = `
      <span class="runway-idx" style="display:inline-flex;align-items:center;gap:8px;">
        <span>${String(idx + 1).padStart(2, '0')}</span>
        ${renderBrandBadgeHtml(item)}
      </span>
      <span class="runway-name">${item.displayTitle}${renderHotBadgeHtml(item)}</span>
      <span class="runway-meta">
        <span class="runway-route">${t(`tag_${item.tag}`)} · ${DISPLAY_DOMAIN}${item.routeLabel}</span>
        ${blurb ? `<span class="runway-blurb">${blurb}</span>` : ''}
      </span>
      ${renderLinkActionsHtml(item)}
    `;
    row.addEventListener('pointerenter', () => {
      state.hoveredItem = item;
      synth.playHover(idx);
    });
    row.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      synth.playClick();
      openPeek(item);
    });
    list.appendChild(row);
  });

  container.appendChild(list);
}

function renderStage() {
  stopOrbitLoop();
  artDirector.clear();
  const container = document.getElementById('stage-container');
  if (!container) return;
  container.innerHTML = '';

  const items = visibleItems();
  animateCounter(items.length);

  if (state.stageMode === 'orbit') {
    renderOrbitStage(container, items);
    return;
  }

  if (state.stageMode === 'runway') {
    renderRunwayStage(container, items);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'stage-grid';
  items.forEach((item, idx) => {
    grid.appendChild(createCardElement(item, idx));
  });
  container.appendChild(grid);
  requestAnimationFrame(() => artDirector.measureAll());
}

/* Dimension Peek (◫) Live Preview Glass Modal */
function openPeek(item) {
  const backdrop = document.getElementById('peek-backdrop');
  const frame = document.getElementById('peek-frame');
  const urlEl = document.getElementById('peek-url');
  const openBtn = document.getElementById('peek-open-ext');
  const ghBtn = document.getElementById('peek-open-gh');
  if (!backdrop || !frame) return;

  document.body.classList.add('has-peek-open');
  const ring = document.getElementById('swiss-cursor-ring');
  const label = document.getElementById('swiss-cursor-label');
  ring?.classList.remove('is-engaged');
  if (label) label.textContent = '';

  urlEl.textContent = `${item.indexCode} · ${DISPLAY_DOMAIN}${item.routeLabel}/`;
  if (openBtn) openBtn.href = item.href;
  if (ghBtn) ghBtn.href = item.repoUrl;
  frame.src = item.href;
  backdrop.hidden = false;
}

function closePeek() {
  const backdrop = document.getElementById('peek-backdrop');
  const frame = document.getElementById('peek-frame');
  if (!backdrop || backdrop.hidden) return;
  backdrop.hidden = true;
  document.body.classList.remove('has-peek-open');
  if (frame) frame.src = 'about:blank';
}

/* ⌘K Instant Spotlight Palette */
function openSpotlight() {
  const backdrop = document.getElementById('spotlight-backdrop');
  const input = document.getElementById('spotlight-input');
  if (!backdrop || !input) return;
  document.body.classList.add('has-spotlight-open');
  const ring = document.getElementById('swiss-cursor-ring');
  const label = document.getElementById('swiss-cursor-label');
  ring?.classList.remove('is-engaged');
  if (label) label.textContent = '';
  backdrop.hidden = false;
  input.value = '';
  renderSpotlightResults('');
  input.focus();
}

function closeSpotlight() {
  const backdrop = document.getElementById('spotlight-backdrop');
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('has-spotlight-open');
}

function renderSpotlightResults(query) {
  const listEl = document.getElementById('spotlight-list');
  if (!listEl) return;
  const q = query.trim().toLowerCase();
  const matches = visibleItems().filter(
    (item) =>
      !q ||
      item.displayTitle.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      item.tag.toLowerCase().includes(q) ||
      pickText(item.blurb).toLowerCase().includes(q)
  );

  listEl.innerHTML = '';
  matches.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = `spotlight-item${idx === 0 ? ' is-selected' : ''}`;
    row.dataset.slug = item.slug;
    row.title = pickText(item.blurb);
    row.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;min-width:0;">
        <strong>${item.indexCode}</strong>
        ${renderBrandBadgeHtml(item)}
        <span>${item.displayTitle}</span>
        ${renderHotBadgeHtml(item)}
      </span>
      ${renderLinkActionsHtml(item)}
    `;
    row.addEventListener('click', (e) => {
      synth.playClick();
      closeSpotlight();
      if (!e.target.closest('a')) openPeek(item);
    });
    listEl.appendChild(row);
  });
}

/* Circular Radial Eclipse Theme Toggle */
function toggleThemeWithEclipse(event) {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  const btn = document.getElementById('theme-toggle');
  const rect = btn?.getBoundingClientRect();
  const x = event?.clientX ?? (rect ? rect.left + rect.width * 0.5 : window.innerWidth - 40);
  const y = event?.clientY ?? (rect ? rect.top + rect.height * 0.5 : 26);
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    if (btn) btn.textContent = next === 'dark' ? t('themeLight') : t('themeDark');
    artDirector.refreshTheme();
    field?.refreshTheme();
  };

  synth.playEclipse();
  eggs?.unlock('eclipse');

  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyTheme();
    return;
  }

  const transition = document.startViewTransition(() => {
    applyTheme();
  });

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
      },
      {
        duration: 540,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  });
}

/* Random Roulette Die (⚄) */
function spinRoulette() {
  const items = visibleItems();
  if (!items.length) return;
  state.rouletteSpins += 1;
  if (state.rouletteSpins >= 3) {
    eggs?.unlock('vault');
  }

  const cards = [...document.querySelectorAll('.portal-card, .runway-row')];
  const winnerIdx = Math.floor(Math.random() * items.length);
  const totalTicks = 14;
  let step = 0;

  const tick = () => {
    cards.forEach((c) => c.classList.remove('is-roulette'));
    const cur = step === totalTicks ? winnerIdx : (step * 3 + winnerIdx) % Math.max(1, cards.length);
    const el = cards[cur];
    if (el) el.classList.add('is-roulette');
    synth.playHover(cur);
    step += 1;
    if (step <= totalTicks) {
      setTimeout(tick, 45 + step * 11);
    } else {
      const winner = items[winnerIdx];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        el?.classList.remove('is-roulette');
        openPeek(winner);
      }, 360);
    }
  };
  tick();
}

function bindControls() {
  document.querySelectorAll('[data-stage-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-stage-mode');
      if (!mode || mode === state.stageMode) return;
      synth.playClick();
      state.stageMode = mode;
      document.querySelectorAll('[data-stage-mode]').forEach((b) =>
        b.classList.toggle('is-active', b.getAttribute('data-stage-mode') === mode)
      );
      renderStage();
    });
  });

  document.getElementById('theme-toggle')?.addEventListener('click', (e) => toggleThemeWithEclipse(e));

  const soundBtn = document.getElementById('sound-toggle');
  soundBtn?.addEventListener('click', () => {
    synth.toggle();
    syncChromeLabels();
  });

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    synth.playClick();
    setLang(currentLang() === 'en' ? 'zh' : 'en');
  });

  window.addEventListener('pointerdown', () => synth.ensureContext(), { once: true });

  const eggBtn = document.getElementById('egg-counter');
  const drawerWrap = document.getElementById('egg-drawer-wrap');
  eggBtn?.addEventListener('click', () => {
    synth.playClick();
    drawerWrap?.classList.toggle('is-open');
  });

  document.getElementById('zerog-pill')?.addEventListener('click', () => {
    eggs?.toggleZeroG();
  });

  document.getElementById('roulette-btn')?.addEventListener('click', () => spinRoulette());

  document.getElementById('spotlight-btn')?.addEventListener('click', () => {
    synth.playClick();
    openSpotlight();
  });
  document.getElementById('spotlight-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'spotlight-backdrop') closeSpotlight();
  });
  const spotInput = document.getElementById('spotlight-input');
  spotInput?.addEventListener('input', () => renderSpotlightResults(spotInput.value));
  spotInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = document.querySelector('.spotlight-item');
      const item = first && state.allItems.find((entry) => entry.slug === first.dataset.slug);
      if (item) {
        synth.playClick();
        closeSpotlight();
        openPeek(item);
      }
    } else if (e.key === 'Escape') {
      closeSpotlight();
    }
  });

  document.getElementById('peek-close')?.addEventListener('click', () => {
    synth.playClick();
    closePeek();
  });
  document.getElementById('peek-viewport-toggle')?.addEventListener('click', () => {
    synth.playClick();
    document.getElementById('peek-window')?.classList.toggle('is-mobile');
    syncChromeLabels();
  });
  document.getElementById('peek-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'peek-backdrop') closePeek();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSpotlight();
      return;
    }
    if (e.key === 'Escape') {
      closePeek();
      closeSpotlight();
      return;
    }
    const tag = document.activeElement?.tagName;
    if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'A' && state.hoveredItem) {
      e.preventDefault();
      synth.playClick();
      openPeek(state.hoveredItem);
    }
  });
}

/* Labels whose text depends on both the locale and live UI state. */
function syncChromeLabels() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.textContent = isDark ? t('themeLight') : t('themeDark');

  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.textContent = t('langToggle');
    langBtn.setAttribute('aria-label', t('langToggleAria'));
  }

  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.textContent = synth.enabled ? t('soundOn') : t('soundOff');
    soundBtn.classList.toggle('is-active', synth.enabled);
  }

  const viewportBtn = document.getElementById('peek-viewport-toggle');
  const mobile = document.getElementById('peek-window')?.classList.contains('is-mobile');
  if (viewportBtn) viewportBtn.textContent = mobile ? t('desktopView') : t('mobileView');
}

function syncBrandGloss(prefix) {
  const leftEl = document.getElementById('hero-word-left');
  renderBrandGloss(document.getElementById('brand-gloss'), prefix || leftEl?.textContent?.trim() || '有点');
}

async function bootstrap() {
  applyStaticTranslations();
  syncChromeLabels();
  syncBrandGloss();

  document.addEventListener('ydys:wordchange', (e) => {
    syncBrandGloss(e.detail?.prefix);
  });

  onLangChange(() => {
    syncChromeLabels();
    syncBrandGloss();
    eggs?.renderDrawer();
    if (state.allItems.length) {
      renderFilterPills();
      renderStage();
    }
  });

  const fieldCanvas = document.getElementById('swiss-field');
  field = new SwissFieldCanvas(fieldCanvas, {
    onEasterEgg: (id) => eggs?.unlock(id),
  });

  eggs = new EasterEggController({
    field,
    onVaultUnlock: (silent) => {
      if (!state.vaultUnlocked) {
        state.vaultUnlocked = true;
        renderFilterPills();
        if (!silent) {
          state.activeTag = 'VAULT';
          renderFilterPills();
          renderStage();
        }
      }
    },
    onThemeToggle: () => toggleThemeWithEclipse(),
  });

  new SwissReticleCursor({
    onLongPressBackground: () => eggs.toggleZeroG(),
  });

  bindControls();

  state.allItems = await loadLivePagesCatalog();
  renderFilterPills();
  renderStage();
}

bootstrap();
