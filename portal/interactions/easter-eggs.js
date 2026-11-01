// 10 interactive Easter Eggs + minimalist 1-character glyph hint drawer + keyboard secret listener.

import { synth } from '../audio/micro-synth.js';
import { scrambleText } from './cursor-and-tilt.js';

export const EGG_REGISTRY = [
  { id: 'pinball', code: '01', glyph: '●', hint: '弹', label: 'PINBALL' },
  { id: 'wordplay', code: '02', glyph: '◈', hint: '词', label: 'MORPH' },
  { id: 'eclipse', code: '03', glyph: '◐', hint: '蚀', label: 'ECLIPSE' },
  { id: 'vortex', code: '04', glyph: '◎', hint: '旋', label: 'VORTEX' },
  { id: 'zerog', code: '05', glyph: '◌', hint: '浮', label: 'ZERO-G' },
  { id: 'konami', code: '06', glyph: '⚡', hint: '秘', label: 'OVERDRIVE' },
  { id: 'dingdong', code: '07', glyph: '🔔', hint: '铃', label: 'DINGDONG' },
  { id: 'warp', code: '08', glyph: '✦', hint: '跃', label: 'WARP' },
  { id: 'punycode', code: '09', glyph: '⌘', hint: '译', label: 'PUNYCODE' },
  { id: 'vault', code: '10', glyph: '⚿', hint: '藏', label: 'VAULT' },
];

const STORAGE_KEY = 'ydys.eggs.v1';
const WORDPLAY_VARIANTS = ['意思', '东西', '上头', '离谱', '浪漫', '硬核', '未来', '造物'];
const KONAMI_SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export class EasterEggController {
  constructor({ field, onVaultUnlock, onThemeToggle } = {}) {
    this.field = field;
    this.onVaultUnlock = onVaultUnlock || (() => {});
    this.onThemeToggle = onThemeToggle || (() => {});
    this.unlocked = new Set(this.loadSaved());
    this.wordIndex = 0;
    this.konamiPos = 0;
    this.typedBuffer = '';
    this.zeroG = false;
    this.overdrive = false;
    this.punyDecoded = false;

    this.counterEl = document.getElementById('egg-counter');
    this.drawerEl = document.getElementById('egg-drawer');
    this.toastEl = document.getElementById('egg-toast');

    this.renderDrawer();
    this.updateCounter();
    this.bindSlingshotDot();
    this.bindWordplay();
    this.bindKeyboardSecrets();
    this.bindPunycodeStamp();
    this.bindVaultSeal();

    if (this.unlocked.has('vault')) {
      this.onVaultUnlock(true);
    }
  }

  loadSaved() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.unlocked]));
    } catch {
      // Ignore private browsing quota errors.
    }
  }

  unlock(id) {
    const meta = EGG_REGISTRY.find((e) => e.id === id);
    if (!meta) return;
    const isNew = !this.unlocked.has(id);
    if (isNew) {
      this.unlocked.add(id);
      this.save();
      this.updateCounter();
      this.renderDrawer();
      this.showToast(`${meta.glyph} ${meta.code}/10 · ${meta.label}`);
      synth.playUnlock();
    }
    if (id === 'vault') {
      this.onVaultUnlock(false);
    }
  }

  updateCounter() {
    if (!this.counterEl) return;
    const count = String(this.unlocked.size).padStart(2, '0');
    this.counterEl.textContent = `✦ ${count}/${EGG_REGISTRY.length}`;
    if (this.unlocked.size === EGG_REGISTRY.length) {
      this.counterEl.classList.add('is-complete');
    }
  }

  showToast(text) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.add('is-visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
    }, 2100);
  }

  renderDrawer() {
    if (!this.drawerEl) return;
    this.drawerEl.innerHTML = '';
    for (const egg of EGG_REGISTRY) {
      const done = this.unlocked.has(egg.id);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `egg-slot${done ? ' is-unlocked' : ''}`;
      cell.setAttribute('data-cursor', done ? 'REPLAY' : egg.hint);
      cell.innerHTML = `
        <span class="egg-code">${egg.code}</span>
        <span class="egg-glyph">${done ? egg.glyph : '?'}</span>
        <span class="egg-name">${done ? egg.label : egg.hint}</span>
      `;
      cell.addEventListener('click', () => {
        synth.playClick();
        if (done) {
          this.replay(egg.id);
        } else {
          cell.classList.remove('is-nudged');
          void cell.offsetWidth;
          cell.classList.add('is-nudged');
        }
      });
      this.drawerEl.appendChild(cell);
    }
  }

  replay(id) {
    if (id === 'pinball') {
      const dot = document.getElementById('hero-dot');
      const r = dot?.getBoundingClientRect();
      const x = r ? r.left + r.width * 0.5 : window.innerWidth * 0.5;
      const y = r ? r.top + r.height * 0.5 : 180;
      this.field?.launchPinball(x, y, (Math.random() - 0.5) * 18, 12);
    } else if (id === 'wordplay') {
      this.cycleWordplay();
    } else if (id === 'eclipse') {
      this.onThemeToggle();
    } else if (id === 'vortex') {
      this.field?.triggerVortex(window.innerWidth * 0.5, window.innerHeight * 0.5);
    } else if (id === 'zerog') {
      this.toggleZeroG();
    } else if (id === 'konami') {
      this.toggleOverdrive();
    } else if (id === 'dingdong') {
      this.field?.triggerBellRain();
    } else if (id === 'warp') {
      this.field?.triggerWarp();
    } else if (id === 'punycode') {
      this.togglePunycode();
    } else if (id === 'vault') {
      this.onVaultUnlock(false);
    }
  }

  bindSlingshotDot() {
    const dot = document.getElementById('hero-dot');
    if (!dot) return;

    let dragging = false;
    let ox = 0;
    let oy = 0;

    dot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      dot.setPointerCapture(e.pointerId);
      const r = dot.getBoundingClientRect();
      ox = r.left + r.width * 0.5;
      oy = r.top + r.height * 0.5;
      dot.classList.add('is-dragging');
      synth.playClick();
    });

    dot.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = Math.max(-130, Math.min(130, e.clientX - ox));
      const dy = Math.max(-130, Math.min(130, e.clientY - oy));
      dot.style.transform = `translate(${dx}px, ${dy}px) scale(0.9)`;
      this.field?.setSlingshotPreview({ ox, oy, cx: ox + dx, cy: oy + dy });
    });

    const release = (e) => {
      if (!dragging) return;
      dragging = false;
      dot.classList.remove('is-dragging');
      dot.style.transform = '';
      this.field?.setSlingshotPreview(null);

      const dx = ox - e.clientX;
      const dy = oy - e.clientY;
      const pull = Math.hypot(dx, dy);
      if (pull > 14) {
        const vx = Math.max(-24, Math.min(24, dx * 0.22));
        const vy = Math.max(-24, Math.min(24, dy * 0.22));
        this.field?.launchPinball(ox, oy, vx, vy);
      } else {
        // Quick tap shoots a playful bounce downward!
        this.field?.launchPinball(ox, oy, (Math.random() - 0.5) * 14, 11);
      }
    };

    dot.addEventListener('pointerup', release);
    dot.addEventListener('pointercancel', release);
  }

  cycleWordplay() {
    const wordEl = document.getElementById('hero-word-right');
    if (!wordEl) return;
    this.wordIndex = (this.wordIndex + 1) % WORDPLAY_VARIANTS.length;
    const next = WORDPLAY_VARIANTS[this.wordIndex];
    wordEl.classList.remove('is-flipping');
    void wordEl.offsetWidth;
    wordEl.classList.add('is-flipping');
    scrambleText(wordEl, next, 260);
    synth.playHover(this.wordIndex * 2);
    this.unlock('wordplay');
  }

  bindWordplay() {
    const rightEl = document.getElementById('hero-word-right');
    const leftEl = document.getElementById('hero-word-left');
    rightEl?.addEventListener('click', () => this.cycleWordplay());
    leftEl?.addEventListener('dblclick', () => this.cycleWordplay());
  }

  toggleZeroG() {
    this.zeroG = !this.zeroG;
    document.body.classList.toggle('is-zero-g', this.zeroG);
    const cards = document.querySelectorAll('.portal-card');
    cards.forEach((card, idx) => {
      if (this.zeroG) {
        card.style.setProperty('--float-delay', `${(idx % 5) * -0.65}s`);
        card.style.setProperty('--float-tilt', `${((idx % 2 === 0 ? 1 : -1) * (1.4 + (idx % 3) * 0.8)).toFixed(1)}deg`);
      } else {
        card.style.removeProperty('--float-delay');
        card.style.removeProperty('--float-tilt');
      }
    });
    const badge = document.getElementById('zerog-pill');
    if (badge) badge.hidden = !this.zeroG;
    synth.playEclipse();
    if (this.zeroG) this.unlock('zerog');
  }

  toggleOverdrive() {
    this.overdrive = !this.overdrive;
    document.documentElement.classList.toggle('is-overdrive', this.overdrive);
    this.field?.refreshTheme();
    if (this.overdrive) {
      synth.playOverdrive();
      this.unlock('konami');
    } else {
      synth.playClick();
    }
  }

  togglePunycode() {
    const stamp = document.getElementById('punycode-stamp');
    if (!stamp) return;
    this.punyDecoded = !this.punyDecoded;
    const target = this.punyDecoded ? '有点.意思.COM // IDN-UTF8' : 'XN--8OVP9S.XN--M8TXU.COM';
    scrambleText(stamp, target, 420);
    synth.playClick();
    this.unlock('punycode');
  }

  bindPunycodeStamp() {
    const stamp = document.getElementById('punycode-stamp');
    stamp?.addEventListener('click', () => this.togglePunycode());
  }

  bindVaultSeal() {
    const seal = document.getElementById('vault-seal');
    seal?.addEventListener('click', () => {
      this.unlock('vault');
    });
  }

  bindKeyboardSecrets() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.zeroG) {
        this.toggleZeroG();
        return;
      }

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      // Konami sequence check
      const expected = KONAMI_SEQ[this.konamiPos];
      if (e.key === expected || e.key.toLowerCase() === expected) {
        this.konamiPos += 1;
        if (this.konamiPos === KONAMI_SEQ.length) {
          this.konamiPos = 0;
          this.toggleOverdrive();
        }
      } else {
        this.konamiPos = e.key === 'ArrowUp' ? 1 : 0;
      }

      // Secret word buffer
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        this.typedBuffer = (this.typedBuffer + e.key.toLowerCase()).slice(-14);
        if (this.typedBuffer.endsWith('dingdong')) {
          this.typedBuffer = '';
          this.field?.triggerBellRain();
        } else if (this.typedBuffer.endsWith('space') || this.typedBuffer.endsWith('warp') || this.typedBuffer.endsWith('3d')) {
          this.typedBuffer = '';
          this.field?.triggerWarp();
        } else if (this.typedBuffer.endsWith('fuli')) {
          this.typedBuffer = '';
          this.field?.triggerConstellation();
        } else if (this.typedBuffer.endsWith('vault')) {
          this.typedBuffer = '';
          this.unlock('vault');
        } else if (this.typedBuffer.endsWith('0g')) {
          this.typedBuffer = '';
          this.toggleZeroG();
        }
      }
    });
  }
}
