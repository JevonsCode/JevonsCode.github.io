// Dual-ring Swiss reticle cursor, 3D card spring tilt + glare, cipher text scramble, and long-press Zero-G gauge.

const CIPHER_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+*#░▒▓';

export function scrambleText(el, finalText, durationMs = 340) {
  if (!el || !finalText) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = finalText;
    return;
  }
  cancelAnimationFrame(el._scrambleRaf || 0);
  const start = performance.now();
  const chars = Array.from(finalText);

  const step = (now) => {
    const progress = Math.min(1, (now - start) / durationMs);
    const settled = Math.floor(progress * chars.length);
    let out = '';
    for (let i = 0; i < chars.length; i += 1) {
      const ch = chars[i];
      if (ch === ' ' || ch === '·' || i < settled) {
        out += ch;
      } else {
        out += CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
      }
    }
    el.textContent = out;
    if (progress < 1) {
      el._scrambleRaf = requestAnimationFrame(step);
    } else {
      el.textContent = finalText;
    }
  };
  el._scrambleRaf = requestAnimationFrame(step);
}

export function bindCardTiltAndScramble(card, titleText, onHoverSound) {
  const titleEl = card.querySelector('.card-title');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  card.addEventListener('pointerenter', () => {
    onHoverSound?.();
    scrambleText(titleEl, titleText, 300);
  });

  if (reduced) return;

  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - ny) * 11;
    const ry = (nx - 0.5) * 11;
    card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    card.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
    card.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
  });

  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
}

export class SwissReticleCursor {
  constructor({ onLongPressBackground } = {}) {
    this.isCoarse = window.matchMedia('(pointer: coarse)').matches;
    this.onLongPressBackground = onLongPressBackground || (() => {});
    this.el = document.getElementById('swiss-cursor');
    this.ringEl = document.getElementById('swiss-cursor-ring');
    this.labelEl = document.getElementById('swiss-cursor-label');
    this.coordsEl = document.getElementById('hud-coords');
    this.gaugeCircle = document.getElementById('cursor-gauge-arc');

    this.tx = window.innerWidth * 0.5;
    this.ty = window.innerHeight * 0.5;
    this.rx = this.tx;
    this.ry = this.ty;
    this.holdStart = 0;
    this.holdTriggered = false;

    this.init();
  }

  init() {
    if (this.isCoarse || !this.el || !this.ringEl) {
      document.documentElement.classList.add('is-touch');
      return;
    }

    document.documentElement.classList.add('has-custom-cursor');

    window.addEventListener(
      'pointermove',
      (e) => {
        this.tx = e.clientX;
        this.ty = e.clientY;
        this.el.style.transform = `translate3d(${this.tx}px, ${this.ty}px, 0)`;
        if (this.coordsEl) {
          this.coordsEl.textContent = `${String(Math.round(this.tx)).padStart(4, '0')} · ${String(Math.round(this.ty)).padStart(4, '0')}`;
        }

        const target = e.target;
        const hintEl = target?.closest?.('[data-cursor]');
        if (hintEl) {
          this.ringEl.classList.add('is-engaged');
          if (this.labelEl) this.labelEl.textContent = hintEl.getAttribute('data-cursor') || '';
        } else {
          this.ringEl.classList.remove('is-engaged');
          if (this.labelEl) this.labelEl.textContent = '';
        }

        if (this.holdStart && Math.hypot(e.movementX || 0, e.movementY || 0) > 12) {
          this.cancelHold();
        }
      },
      { passive: true }
    );

    window.addEventListener('pointerdown', (e) => {
      this.ringEl.classList.add('is-down');
      const interactive = e.target?.closest?.('a, button, input, dialog, .portal-card, [data-no-hold]');
      if (!interactive && e.button === 0) {
        this.holdStart = performance.now();
        this.holdTriggered = false;
      }
    });

    window.addEventListener('pointerup', () => {
      this.ringEl.classList.remove('is-down');
      this.cancelHold();
    });

    const animate = (now) => {
      this.rx += (this.tx - this.rx) * 0.2;
      this.ry += (this.ty - this.ry) * 0.2;
      this.ringEl.style.transform = `translate3d(${this.rx.toFixed(1)}px, ${this.ry.toFixed(1)}px, 0)`;

      if (this.holdStart && !this.holdTriggered) {
        const progress = Math.min(1, (now - this.holdStart) / 920);
        if (this.gaugeCircle) {
          const circumference = 163.36;
          this.gaugeCircle.style.strokeDashoffset = String(circumference * (1 - progress));
        }
        if (progress >= 1) {
          this.holdTriggered = true;
          this.cancelHold();
          this.onLongPressBackground();
        }
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  cancelHold() {
    this.holdStart = 0;
    if (this.gaugeCircle) {
      this.gaugeCircle.style.strokeDashoffset = '163.36';
    }
  }
}
