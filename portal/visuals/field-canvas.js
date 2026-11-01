// Full-viewport 60fps Swiss Crosshair Magnetic Fabric + Physics Pinball + Vortex + Warp + Bells.

import { synth } from '../audio/micro-synth.js';

const TAU = Math.PI * 2;

export class SwissFieldCanvas {
  constructor(canvas, { onEasterEgg } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onEasterEgg = onEasterEgg || (() => {});
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.pointer = { x: this.w * 0.5, y: this.h * 0.5, vx: 0, vy: 0, active: false };
    this.nodes = [];
    this.ripples = [];
    this.sparks = [];
    this.pinballs = [];
    this.bells = [];
    this.vortex = null;
    this.warpUntil = 0;
    this.constellationUntil = 0;
    this.swirlAccum = 0;
    this.lastAngle = null;
    this.swirlCentroid = { x: this.w * 0.5, y: this.h * 0.5 };
    this.slingshot = null;
    this.colors = this.readColors();
    this.ddMascotLight = new Image();
    this.ddMascotLight.src = './portal/assets/brands/dingdong-ding-1.png';
    this.ddMascotDark = new Image();
    this.ddMascotDark.src = './portal/assets/brands/dingdong-ding-1-w.png';

    this.resize();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  readColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      ink: cs.getPropertyValue('--ink').trim() || '#111113',
      grid: cs.getPropertyValue('--field-dot').trim() || 'rgba(17, 17, 19, 0.2)',
      accent: cs.getPropertyValue('--accent').trim() || '#FF3B1D',
    };
  }

  refreshTheme() {
    this.colors = this.readColors();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const step = this.w < 768 ? 58 : 68;
    this.nodes = [];
    for (let y = step * 0.6; y < this.h; y += step) {
      for (let x = step * 0.6; x < this.w; x += step) {
        this.nodes.push({
          ox: x,
          oy: y,
          x,
          y,
          vx: 0,
          vy: 0,
          cross: ((Math.round(x / step) + Math.round(y / step)) % 3) === 0,
        });
      }
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener(
      'pointermove',
      (e) => {
        const dx = e.clientX - this.pointer.x;
        const dy = e.clientY - this.pointer.y;
        this.pointer.vx = dx;
        this.pointer.vy = dy;
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.active = true;
        this.detectSwirl(e.clientX, e.clientY, dx, dy);
      },
      { passive: true }
    );

    window.addEventListener(
      'pointerdown',
      (e) => {
        this.spawnRipple(e.clientX, e.clientY, 1);
      },
      { passive: true }
    );
  }

  detectSwirl(x, y, dx, dy) {
    const speed = Math.hypot(dx, dy);
    if (speed < 6) {
      this.swirlAccum *= 0.94;
      return;
    }
    this.swirlCentroid.x += (x - this.swirlCentroid.x) * 0.08;
    this.swirlCentroid.y += (y - this.swirlCentroid.y) * 0.08;
    const angle = Math.atan2(y - this.swirlCentroid.y, x - this.swirlCentroid.x);
    if (this.lastAngle !== null) {
      let delta = angle - this.lastAngle;
      if (delta > Math.PI) delta -= TAU;
      if (delta < -Math.PI) delta += TAU;
      this.swirlAccum = this.swirlAccum * 0.985 + delta;
      if (Math.abs(this.swirlAccum) > TAU * 2.3 && !this.vortex) {
        this.triggerVortex(this.swirlCentroid.x, this.swirlCentroid.y);
        this.swirlAccum = 0;
      }
    }
    this.lastAngle = angle;
  }

  spawnRipple(x, y, power = 1, color = null) {
    this.ripples.push({
      x,
      y,
      r: 4,
      maxR: 160 + power * 120,
      alpha: 0.65,
      power,
      color: color || this.colors.accent,
    });
  }

  spawnSparks(x, y, count = 14, color = null) {
    const c = color || this.colors.accent;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU + Math.random() * 0.4;
      const spd = 2 + Math.random() * 6.5;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 1,
        color: c,
      });
    }
  }

  setSlingshotPreview(preview) {
    this.slingshot = preview;
  }

  launchPinball(x, y, vx, vy) {
    this.pinballs.push({
      x,
      y,
      vx,
      vy,
      r: 11,
      life: 11,
      combo: 0,
      trail: [],
    });
    this.spawnRipple(x, y, 1.5);
    this.spawnSparks(x, y, 18);
    this.onEasterEgg('pinball');
  }

  triggerVortex(x = this.w * 0.5, y = this.h * 0.5) {
    this.vortex = { x, y, life: 1, ttl: 2.8 };
    this.spawnSparks(x, y, 26);
    synth.playEclipse();
    this.onEasterEgg('vortex');
  }

  triggerWarp() {
    this.warpUntil = performance.now() + 4200;
    synth.playOverdrive();
    this.onEasterEgg('warp');
  }

  triggerConstellation() {
    this.constellationUntil = performance.now() + 5500;
    synth.playUnlock();
  }

  triggerBellRain() {
    for (let i = 0; i < 14; i += 1) {
      this.bells.push({
        x: this.w * (0.12 + Math.random() * 0.76),
        y: -30 - Math.random() * 180,
        vx: (Math.random() - 0.5) * 4,
        vy: 1 + Math.random() * 3,
        r: 12 + Math.random() * 5,
        rot: (Math.random() - 0.5) * 0.6,
        vrot: (Math.random() - 0.5) * 0.1,
        bounces: 0,
      });
    }
    synth.playDingDong();
    this.onEasterEgg('dingdong');
  }

  collectCardRects() {
    const cards = document.querySelectorAll('.portal-card');
    const list = [];
    cards.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < this.h && r.width > 20) {
        list.push({ el, left: r.left, right: r.right, top: r.top, bottom: r.bottom, cx: r.left + r.width * 0.5, cy: r.top + r.height * 0.5 });
      }
    });
    return list;
  }

  loop(now) {
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.clearRect(0, 0, w, h);

    const warping = now < this.warpUntil;
    const showingConstellation = now < this.constellationUntil;

    if (this.vortex) {
      this.vortex.ttl -= 0.016;
      this.vortex.life = Math.max(0, this.vortex.ttl / 2.8);
      if (this.vortex.ttl <= 0) this.vortex = null;
    }

    // 1. Update & render architectural Swiss crosshair field
    ctx.strokeStyle = this.colors.grid;
    ctx.fillStyle = this.colors.grid;
    ctx.lineWidth = 1;

    for (const n of this.nodes) {
      if (warping) {
        const dx = n.ox - this.pointer.x;
        const dy = n.oy - this.pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        const streak = ((now * 0.45 + dist) % 180) / 180;
        const sx = this.pointer.x + (dx / dist) * (dist * (0.4 + streak * 1.1));
        const sy = this.pointer.y + (dy / dist) * (dist * (0.4 + streak * 1.1));
        ctx.strokeStyle = streak > 0.7 ? this.colors.accent : this.colors.grid;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (dx / dist) * 18 * streak, sy + (dy / dist) * 18 * streak);
        ctx.stroke();
        continue;
      }

      let fx = (n.ox - n.x) * 0.1;
      let fy = (n.oy - n.y) * 0.1;

      if (this.pointer.active) {
        const dx = n.x - this.pointer.x;
        const dy = n.y - this.pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 24000) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / 155) * 3.1;
          fx += (dx / d) * push + this.pointer.vx * 0.025 * (1 - d / 155);
          fy += (dy / d) * push + this.pointer.vy * 0.025 * (1 - d / 155);
        }
      }

      if (this.vortex) {
        const dx = this.vortex.x - n.x;
        const dy = this.vortex.y - n.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 380) {
          const pull = (1 - d / 380) * 6.5 * this.vortex.life;
          fx += (dx / d) * pull - (dy / d) * pull * 1.35;
          fy += (dy / d) * pull + (dx / d) * pull * 1.35;
        }
      }

      for (const rip of this.ripples) {
        const d = Math.hypot(n.x - rip.x, n.y - rip.y);
        if (Math.abs(d - rip.r) < 28) {
          const a = Math.atan2(n.y - rip.y, n.x - rip.x);
          fx += Math.cos(a) * rip.alpha * 3.8;
          fy += Math.sin(a) * rip.alpha * 3.8;
        }
      }

      n.vx = (n.vx + fx) * 0.8;
      n.vy = (n.vy + fy) * 0.8;
      n.x += n.vx;
      n.y += n.vy;

      const disp = Math.hypot(n.x - n.ox, n.y - n.oy);
      if (n.cross) {
        const s = disp > 4 ? 4.2 : 3;
        ctx.strokeStyle = disp > 8 ? this.colors.accent : this.colors.grid;
        ctx.beginPath();
        ctx.moveTo(n.x - s, n.y);
        ctx.lineTo(n.x + s, n.y);
        ctx.moveTo(n.x, n.y - s);
        ctx.lineTo(n.x, n.y + s);
        ctx.stroke();
      } else {
        ctx.fillStyle = disp > 9 ? this.colors.accent : this.colors.grid;
        ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
      }
    }

    // 2. Vortex visual core
    if (this.vortex) {
      ctx.save();
      ctx.translate(this.vortex.x, this.vortex.y);
      ctx.rotate(now * 0.008);
      for (let i = 1; i <= 3; i += 1) {
        ctx.strokeStyle = this.colors.accent;
        ctx.globalAlpha = this.vortex.life * (0.65 / i);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, i * 26 * (1.2 - this.vortex.life * 0.3), 0, TAU * 0.72);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Ripples
    for (let i = this.ripples.length - 1; i >= 0; i -= 1) {
      const rip = this.ripples[i];
      rip.r += (rip.maxR - rip.r) * 0.08 + 2.2;
      rip.alpha *= 0.93;
      if (rip.alpha < 0.02 || rip.r >= rip.maxR) {
        this.ripples.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.strokeStyle = rip.color;
      ctx.globalAlpha = rip.alpha;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Slingshot aiming trajectory
    if (this.slingshot) {
      const { ox, oy, cx, cy } = this.slingshot;
      ctx.save();
      ctx.strokeStyle = this.colors.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Predicted launch arrow
      const vx = (ox - cx) * 0.85;
      const vy = (oy - cy) * 0.85;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + vx, oy + vy);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = this.colors.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const needRects = this.pinballs.length > 0 || this.bells.length > 0 || showingConstellation;
    const cardRects = needRects ? this.collectCardRects() : [];

    // 5. Neural Constellation overlay (secret `fuli` word!)
    if (showingConstellation && cardRects.length > 1) {
      ctx.save();
      ctx.strokeStyle = this.colors.accent;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < cardRects.length; i += 1) {
        const a = cardRects[i];
        const b = cardRects[(i + 1) % cardRects.length];
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Physics Pinballs colliding against real DOM cards!
    for (let i = this.pinballs.length - 1; i >= 0; i -= 1) {
      const b = this.pinballs[i];
      b.life -= 0.016;
      b.vy += 0.22; // subtle gravity
      b.vx *= 0.996;
      b.vy *= 0.996;
      b.x += b.vx;
      b.y += b.vy;

      // Viewport walls
      if (b.x < b.r) {
        b.x = b.r;
        b.vx = Math.abs(b.vx) * 0.9;
        synth.playBounce(Math.abs(b.vx), b.combo);
      } else if (b.x > w - b.r) {
        b.x = w - b.r;
        b.vx = -Math.abs(b.vx) * 0.9;
        synth.playBounce(Math.abs(b.vx), b.combo);
      }
      if (b.y < b.r) {
        b.y = b.r;
        b.vy = Math.abs(b.vy) * 0.9;
        synth.playBounce(Math.abs(b.vy), b.combo);
      } else if (b.y > h - b.r) {
        b.y = h - b.r;
        b.vy = -Math.abs(b.vy) * 0.85;
        synth.playBounce(Math.abs(b.vy), b.combo);
      }

      // Collide with visible project cards
      for (const rect of cardRects) {
        const closestX = Math.max(rect.left, Math.min(b.x, rect.right));
        const closestY = Math.max(rect.top, Math.min(b.y, rect.bottom));
        const dx = b.x - closestX;
        const dy = b.y - closestY;
        const dist = Math.hypot(dx, dy);
        if (dist < b.r && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = closestX + nx * (b.r + 1);
          b.y = closestY + ny * (b.r + 1);
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx = (b.vx - 2 * dot * nx) * 0.94;
            b.vy = (b.vy - 2 * dot * ny) * 0.94;
            b.combo += 1;
            this.spawnSparks(closestX, closestY, 10);
            this.spawnRipple(closestX, closestY, 0.7);
            synth.playBounce(Math.hypot(b.vx, b.vy), b.combo);
            rect.el.classList.add('is-hit');
            setTimeout(() => rect.el.classList.remove('is-hit'), 220);
          }
        }
      }

      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 16) b.trail.shift();

      if (b.life <= 0) {
        this.spawnSparks(b.x, b.y, 16);
        this.pinballs.splice(i, 1);
        continue;
      }

      // Draw trail + orb + combo stamp
      ctx.save();
      for (let k = 0; k < b.trail.length; k += 1) {
        const pt = b.trail[k];
        ctx.fillStyle = this.colors.accent;
        ctx.globalAlpha = (k / b.trail.length) * 0.38;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, b.r * (k / b.trail.length), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = Math.min(1, b.life);
      ctx.fillStyle = this.colors.accent;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();

      if (b.combo > 0) {
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = this.colors.ink;
        ctx.fillText(`×${b.combo}`, b.x + 15, b.y - 10);
      }
      ctx.restore();
    }

    // 7. Bouncing Real DingDong Mascots!
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const ddImg = isDark ? this.ddMascotDark : this.ddMascotLight;
    for (let i = this.bells.length - 1; i >= 0; i -= 1) {
      const bell = this.bells[i];
      bell.vy += 0.34;
      bell.x += bell.vx;
      bell.y += bell.vy;
      bell.rot += bell.vrot;

      if (bell.y > h - bell.r * 2.2) {
        bell.y = h - bell.r * 2.2;
        bell.vy = -Math.abs(bell.vy) * 0.74;
        bell.bounces += 1;
        if (bell.bounces <= 2) synth.playHover(i);
      }
      if (bell.bounces > 5) {
        this.bells.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(bell.x, bell.y);
      ctx.rotate(bell.rot);
      const s = bell.r * 3.8;
      if (ddImg?.complete && ddImg.naturalWidth > 0) {
        ctx.drawImage(ddImg, -s * 0.5, -s * 0.5, s, s);
      } else {
        ctx.fillStyle = '#F06438';
        ctx.beginPath();
        ctx.arc(0, 0, bell.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Particle sparks
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const sp = this.sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vx *= 0.93;
      sp.vy *= 0.93;
      sp.life -= 0.032;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = sp.life;
      ctx.fillStyle = sp.color;
      ctx.fillRect(sp.x - 1.8, sp.y - 1.8, 3.6, 3.6);
      ctx.restore();
    }

    requestAnimationFrame(this.loop);
  }
}
