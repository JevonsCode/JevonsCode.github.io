// Authentic Brand-Coupled Kinetic Art Engines + Real fuli-avatar v5 SVG Portrait Stage.
// Runs a single shared requestAnimationFrame loop over visible canvas tiles.

import { createAvatar, nameFor } from '../vendor/fuli-avatar.js';
import { synth } from '../audio/micro-synth.js';

const TAU = Math.PI * 2;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '#FF3B1D').replace('#', '');
  if (clean.length !== 3 && clean.length !== 6) return `rgba(255, 59, 29, ${alpha})`;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Shared brand sprite cache
const SPRITE_CACHE = new Map();
function getSprite(src) {
  if (!src) return null;
  if (SPRITE_CACHE.has(src)) return SPRITE_CACHE.get(src);
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  SPRITE_CACHE.set(src, img);
  return img;
}

// Preload flagship brand sprites
const BRAND_SPRITES = {
  fuliLogo: './portal/assets/brands/fuli-logo.png',
  ddIcon: './portal/assets/brands/dingdong-icon.png',
  ddIconW: './portal/assets/brands/dingdong-icon-w.png',
  ddRest1: './portal/assets/brands/dingdong-rest-1.png',
  ddRest2: './portal/assets/brands/dingdong-rest-2.png',
  ddRest1W: './portal/assets/brands/dingdong-rest-1-w.png',
  ddRest2W: './portal/assets/brands/dingdong-rest-2-w.png',
  ddDing1: './portal/assets/brands/dingdong-ding-1.png',
  ddDing2: './portal/assets/brands/dingdong-ding-2.png',
  ddDing1W: './portal/assets/brands/dingdong-ding-1-w.png',
  ddDing2W: './portal/assets/brands/dingdong-ding-2-w.png',
  image2b64: './portal/assets/brands/image2base64-logo.svg',
};
Object.values(BRAND_SPRITES).forEach(getSprite);

function drawRegistrationMarks(ctx, w, h, inkAlpha) {
  const s = 4.5;
  const pad = 10;
  ctx.strokeStyle = inkAlpha;
  ctx.lineWidth = 1;
  for (const [x, y] of [
    [pad, pad],
    [w - pad, pad],
    [pad, h - pad],
    [w - pad, h - pad],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }
}

const ART_RENDERERS = {
  // 01. FULI 复利 — Official FULI wave+bars emblem + Jade (#0F6B55) & Amber (#D4942A) multi-agent knowledge graph
  'fuli-brand'(ctx, state, t) {
    const { w, h, ink, inkFaint, hover, lx, ly, impulse } = state;
    const jade = '#0F6B55';
    const amber = '#D4942A';
    const cx = w * 0.5;
    const cy = h * 0.5;
    const minDim = Math.min(w, h);
    const hubX = lerp(cx, lx * w, hover * 0.22);
    const hubY = lerp(cy, ly * h, hover * 0.22);

    // Subtle rising compound-interest background bars echoing the 3 bars in FULI's logo
    const barBaseY = h * 0.84;
    const barMaxH = minDim * 0.5;
    for (let b = 0; b < 3; b += 1) {
      const bw = minDim * 0.055;
      const bx = w - 28 - (2 - b) * (bw + 6);
      const bh = barMaxH * (0.34 + b * 0.26) * (0.88 + Math.sin(t * 2.2 + b * 0.8) * 0.08 + hover * 0.12);
      ctx.fillStyle = b === 2 ? hexToRgba(jade, 0.24 + hover * 0.2) : hexToRgba(amber, 0.16 + hover * 0.14);
      ctx.beginPath();
      ctx.roundRect(bx, barBaseY - bh, bw, bh, 3);
      ctx.fill();
    }

    // Orbiting Agent Client & Knowledge Graph nodes
    const agents = ['CODEX', 'CLAUDE', 'CURSOR', 'MCP', 'SKILLS', 'TASTE'];
    const pts = [];
    const totalNodes = 12;

    for (let i = 0; i < totalNodes; i += 1) {
      const outer = i < 6;
      const radiusX = minDim * (outer ? 0.43 : 0.27) * (w > h * 1.2 ? 1.18 : 1);
      const radiusY = minDim * (outer ? 0.36 : 0.24);
      const speed = (outer ? 0.28 : -0.42) * (1 + hover * 0.75);
      const a = (i / (outer ? 6 : 6)) * TAU + t * speed + (outer ? 0 : 0.55);
      let px = cx + Math.cos(a) * radiusX;
      let py = cy + Math.sin(a) * radiusY;

      if (hover > 0.04) {
        const dx = lx * w - px;
        const dy = ly * h - py;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = Math.max(0, 1 - dist / (minDim * 0.7)) * 22 * hover;
        px += (dx / dist) * pull;
        py += (dy / dist) * pull;
      }
      pts.push({ x: px, y: py, label: outer ? agents[i] : null, isAmber: i % 3 === 0 });
    }

    // Knowledge graph edges & synaptic pulses flowing into FULI emblem
    ctx.lineWidth = 1.1;
    for (let i = 0; i < pts.length; i += 1) {
      const p = pts[i];
      ctx.strokeStyle = p.isAmber ? hexToRgba(amber, 0.34 + hover * 0.25) : hexToRgba(jade, 0.32 + hover * 0.28);
      ctx.beginPath();
      ctx.moveTo(hubX, hubY);
      ctx.quadraticCurveTo((hubX + p.x) * 0.5, (hubY + p.y) * 0.5 - 12, p.x, p.y);
      ctx.stroke();

      const next = pts[(i + 1) % 6];
      if (i < 6) {
        ctx.strokeStyle = inkFaint;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }

      // Traveling memory pulse toward FULI center
      const flow = 1 - ((t * (0.65 + (i % 3) * 0.22) + i * 0.17) % 1);
      const sx = lerp(hubX, p.x, flow);
      const sy = lerp(hubY, p.y, flow);
      ctx.fillStyle = p.isAmber ? amber : jade;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, TAU);
      ctx.fill();
    }

    // Draw satellite pills & nodes
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of pts) {
      if (p.label && minDim > 220) {
        const pw = p.label.length * 6.2 + 12;
        ctx.fillStyle = state.surface;
        ctx.strokeStyle = p.isAmber ? hexToRgba(amber, 0.65) : hexToRgba(jade, 0.65);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.roundRect(p.x - pw * 0.5, p.y - 9, pw, 18, 9);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.fillText(p.label, p.x, p.y + 0.5);
      } else {
        ctx.fillStyle = p.isAmber ? amber : jade;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, TAU);
        ctx.fill();
      }
    }

    // Centerpiece FULI Medallion housing official fuli-logo.png
    const logoR = clamp(minDim * 0.17, 28, 56) + hover * 4 + impulse * 8;
    ctx.save();
    ctx.translate(hubX, hubY);

    // Outer breathing Jade & Amber rings
    ctx.strokeStyle = hexToRgba(jade, 0.5 + hover * 0.35);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, logoR + 9 + Math.sin(t * 2.6) * 3, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(amber, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, logoR + 4, Math.PI * 0.55 + t * 0.5, Math.PI * 1.15 + t * 0.5);
    ctx.stroke();

    // Warm ivory seal disc so fuli-logo.png's ink & gold crescent look 100% crisp in both Light & Dark themes
    ctx.fillStyle = '#F7F5F0';
    ctx.shadowColor = 'rgba(15, 107, 85, 0.28)';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, 0, logoR, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = hexToRgba(jade, 0.4);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const logoImg = getSprite(BRAND_SPRITES.fuliLogo);
    if (logoImg?.complete && logoImg.naturalWidth > 0) {
      const s = logoR * 1.48;
      ctx.drawImage(logoImg, -s * 0.5, -s * 0.5, s, s);
    }
    ctx.restore();
  },

  // 02. 叮咚 DingDongBuddy — Real animated DingDong mascot (resting coffee <-> ringing handbell!)
  'dingdong-mascot'(ctx, state, t) {
    const { w, h, ink, isDark, hover, lx, ly, impulse } = state;
    const blue = '#2F6F8F';
    const orange = '#F06438';
    const cx = w * 0.5;
    const cy = h * 0.52;
    const minDim = Math.min(w, h);
    const awake = hover > 0.2 || impulse > 0.08;

    // Sonic bell shockwaves when awake!
    const ringCount = awake ? 3 : 1;
    for (let i = 0; i < ringCount; i += 1) {
      const phase = (t * (awake ? 1.35 : 0.45) + i / ringCount) % 1;
      ctx.strokeStyle = hexToRgba(i % 2 === 0 ? orange : blue, (1 - phase) * (awake ? 0.55 : 0.2));
      ctx.lineWidth = awake ? 1.8 : 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, minDim * (0.2 + phase * 0.34), 0, TAU);
      ctx.stroke();
    }

    // Authentic DingDong Quiet Workbench capability chips orbiting gently
    const chips = [
      { text: 'PROMPT', color: '#A97822', angle: -0.65 },
      { text: 'SKILL', color: '#4C63A1', angle: 0.55 },
      { text: 'MCP', color: '#2F7651', angle: 2.55 },
    ];
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    chips.forEach((chip, idx) => {
      const a = chip.angle + Math.sin(t * 1.2 + idx) * 0.14 + hover * 0.25;
      const rx = cx + Math.cos(a) * minDim * 0.36;
      const ry = cy + Math.sin(a) * minDim * 0.34;
      const pw = chip.text.length * 6.4 + 12;
      ctx.fillStyle = state.surface;
      ctx.strokeStyle = hexToRgba(chip.color, 0.75);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(rx - pw * 0.5, ry - 9, pw, 18, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isDark ? '#F3F1EC' : ink;
      ctx.fillText(chip.text, rx, ry + 0.5);
    });

    // Pick live animation frame of the real DingDong mascot!
    const frameTwo = Math.floor(t * (awake ? 7.5 : 1.4)) % 2 === 1;
    let spriteSrc;
    if (awake) {
      spriteSrc = isDark
        ? frameTwo
          ? BRAND_SPRITES.ddDing2W
          : BRAND_SPRITES.ddDing1W
        : frameTwo
          ? BRAND_SPRITES.ddDing2
          : BRAND_SPRITES.ddDing1;
    } else {
      spriteSrc = isDark
        ? frameTwo
          ? BRAND_SPRITES.ddRest2W
          : BRAND_SPRITES.ddRest1W
        : frameTwo
          ? BRAND_SPRITES.ddRest2
          : BRAND_SPRITES.ddRest1;
    }

    const img = getSprite(spriteSrc);
    const size = clamp(minDim * 0.62, 96, 178) * (1 + hover * 0.07 + impulse * 0.1);
    const bobY = awake ? Math.abs(Math.sin(t * 9)) * -6 : Math.sin(t * 2.1) * 4;
    const tilt = awake ? Math.sin(t * 14) * 0.06 : (lx - 0.5) * hover * 0.1;

    ctx.save();
    ctx.translate(cx + (lx - 0.5) * hover * 10, cy + bobY + (ly - 0.5) * hover * 6);
    ctx.rotate(tilt);
    if (img?.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -size * 0.5, -size * 0.5, size, size);
    }
    ctx.restore();
  },

  // 03. PhoneBridge — Official Phone-⇄-Desktop S-Curve Bridge Vector Mark (#1967D2) + Live Touch & Vision Stream
  'phonebridge-brand'(ctx, state, t) {
    const { w, h, hover, lx, ly, impulse } = state;
    const blue = '#1967D2';
    const sky = '#60A5FA';
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = Math.min(w / 250, h / 145);

    ctx.save();
    ctx.translate(cx + (lx - 0.5) * hover * 10, cy + (ly - 0.5) * hover * 8);
    ctx.scale(scale, scale);

    // Left Smartphone body (matching PhoneBridge's official mark.png proportions)
    ctx.strokeStyle = blue;
    ctx.fillStyle = hexToRgba(blue, 0.08 + hover * 0.08);
    ctx.lineWidth = 7.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.roundRect(-84, -46, 52, 92, 13);
    ctx.fill();
    ctx.stroke();

    // Phone home pill
    ctx.strokeStyle = blue;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-64, 34);
    ctx.lineTo(-52, 34);
    ctx.stroke();

    // Right Desktop Monitor (matching PhoneBridge's official mark.png)
    ctx.fillStyle = hexToRgba(blue, 0.06 + hover * 0.07);
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.roundRect(10, -24, 74, 54, 12);
    ctx.fill();
    ctx.stroke();

    // Monitor stand base
    ctx.fillStyle = blue;
    ctx.beginPath();
    ctx.roundRect(29, 36, 36, 7, 3.5);
    ctx.fill();

    // Signature PhoneBridge S-Curve Conduit linking Phone -> Monitor
    ctx.strokeStyle = blue;
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(-32, -16);
    ctx.bezierCurveTo(-12, -16, -22, 6, 4, 6);
    ctx.bezierCurveTo(22, 6, 26, 12, 26, 20);
    ctx.stroke();

    // Animated AI touch target inside phone screen
    const tx = -58 + Math.sin(t * 2.4) * 11;
    const ty = -4 + Math.cos(t * 1.9) * 18;
    const rip = ((t * 1.6) % 1) * 12 + impulse * 8;
    ctx.strokeStyle = hexToRgba(sky, 0.75);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(tx, ty, 3 + rip, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#F06438';
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, TAU);
    ctx.fill();

    // Glowing data packets streaming along the S-curve bridge
    for (let i = 0; i < 3; i += 1) {
      const p = (t * (0.9 + hover * 0.8) + i / 3) % 1;
      const bx = lerp(-32, 34, p);
      const by = Math.sin(p * Math.PI) * 12 - 6;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = sky;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Synchronized AI cursor frame inside Desktop Monitor
    ctx.strokeStyle = hexToRgba(blue, 0.55);
    ctx.lineWidth = 2;
    ctx.strokeRect(32, -11, 32, 22);
    ctx.restore();
  },

  // 05. 间象 Jianxiang — Official 3x3 Nine-Grid Mark (#6367F2 Indigo center + 8 architectural tiles + #E85F35 crop ticks)
  'jianxiang-grid'(ctx, state, t) {
    const { w, h, ink, isDark, hover, lx, ly, impulse } = state;
    const indigo = '#6367F2';
    const terra = '#E85F35';
    const cx = w * 0.5;
    const cy = h * 0.5;
    const minDim = Math.min(w, h);
    const cell = clamp(minDim * 0.145, 18, 32);
    const breath = Math.sin(t * 1.8) * 1.8;
    const gap = 6 + breath + hover * 9 + impulse * 8;

    const shiftX = (lx - 0.5) * hover * 12;
    const shiftY = (ly - 0.5) * hover * 12;

    for (let r = -1; r <= 1; r += 1) {
      for (let c = -1; c <= 1; c += 1) {
        const isCenter = r === 0 && c === 0;
        const parallax = isCenter ? 1.35 : 0.7;
        const x = cx + c * (cell + gap) - cell * 0.5 + shiftX * parallax;
        const y = cy + r * (cell + gap) - cell * 0.5 + shiftY * parallax;

        ctx.fillStyle = isCenter ? indigo : isDark ? '#E4E2DC' : '#212226';
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, cell * 0.2);
        ctx.fill();
      }
    }

    // Rule-of-thirds negative-space viewfinder crop marks (#E85F35) expanding on hover
    const frameHalf = cell * 1.5 + gap + 12 + hover * 6;
    const tick = 9;
    ctx.strokeStyle = hover > 0.12 ? terra : hexToRgba(ink, 0.3);
    ctx.lineWidth = 1.6;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const fx = cx + sx * frameHalf;
      const fy = cy + sy * frameHalf;
      ctx.beginPath();
      ctx.moveTo(fx, fy - sy * tick);
      ctx.lineTo(fx, fy);
      ctx.lineTo(fx - sx * tick, fy);
      ctx.stroke();
    }
  },

  // 06. 叮咚声库 DingDong Voices — Real DingDong Detective Mascot + 3-Tone (#315F7A / #AD4A3E / #E9C95F) Audio Spectrum
  'dingdong-voices'(ctx, state, t) {
    const { w, h, isDark, hover, lx, impulse } = state;
    const palette = ['#315F7A', '#AD4A3E', '#E9C95F'];
    const bars = 22;
    const padX = w * 0.14;
    const usableW = w - padX * 2;
    const step = usableW / bars;
    const cy = h * 0.58;

    for (let i = 0; i < bars; i += 1) {
      const norm = i / (bars - 1);
      const focus = 1 - Math.min(1, Math.abs(norm - lx) * 2.8);
      const wave =
        Math.sin(t * 4.4 + i * 0.6) * 0.42 +
        Math.cos(t * 2.8 - i * 0.35) * 0.3 +
        focus * hover * 0.95 +
        impulse * 0.4;
      const bh = Math.max(5, Math.abs(wave) * h * 0.32 + 5);
      const x = padX + i * step + step * 0.18;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.roundRect(x, cy - bh * 0.5, Math.max(2.5, step * 0.54), bh, 2);
      ctx.fill();
    }

    // Floating DingDong magnifying-glass detective badge gliding over the waveform
    const icon = getSprite(isDark ? BRAND_SPRITES.ddIconW : BRAND_SPRITES.ddIcon);
    if (icon?.complete && icon.naturalWidth > 0) {
      const s = 44 + hover * 6;
      const ix = lerp(w * 0.5, clamp(lx * w, padX + 20, w - padX - 20), hover);
      const iy = h * 0.26 + Math.sin(t * 2.8) * 3;
      ctx.drawImage(icon, ix - s * 0.5, iy - s * 0.5, s, s);
    }
  },

  'kepler-orrery'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover, lx, ly } = state;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.min(w, h) * 0.41;
    const tilt = 0.42 + (ly - 0.5) * hover * 0.38;
    const yaw = (lx - 0.5) * hover * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(yaw);

    ctx.fillStyle = '#F59E0B';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + hover * 2.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    const orbits = [
      { r: 0.34, speed: 1.9, size: 3.2, color: ink },
      { r: 0.56, speed: -1.25, size: 4.8, color: accent },
      { r: 0.78, speed: 0.82, size: 4.0, color: '#F97316' },
      { r: 0.96, speed: 0.52, size: 3.0, color: '#38BDF8' },
    ];

    for (const orb of orbits) {
      const rx = maxR * orb.r;
      const ry = rx * tilt;
      ctx.strokeStyle = inkFaint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, Math.max(8, Math.abs(ry)), 0, 0, TAU);
      ctx.stroke();

      const a = t * orb.speed * (1 + hover * 0.6) + orb.r * 5;
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, orb.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  'astrolabe-chart'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover, lx } = state;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.min(w, h) * 0.34;

    ctx.save();
    ctx.translate(cx, cy);
    for (const [mult, dir] of [
      [1, 1],
      [0.72, -1.4],
      [0.44, 2.1],
    ]) {
      ctx.save();
      ctx.rotate(t * 0.32 * dir + (lx - 0.5) * hover * dir);
      ctx.strokeStyle = mult === 0.72 ? hexToRgba(accent, 0.75) : inkFaint;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, r * mult, 0, TAU * 0.82);
      ctx.stroke();

      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * mult * 0.92, Math.sin(a) * r * mult * 0.92);
        ctx.lineTo(Math.cos(a) * r * mult, Math.sin(a) * r * mult);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, 0);
    ctx.lineTo(r * 1.1, 0);
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(0, r * 1.1);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  'lotto-drums'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover, impulse } = state;
    if (!state.lottoNums || impulse > 0.75 || (hover > 0.5 && Math.random() < 0.08)) {
      const pool = [];
      while (pool.length < 6) {
        const n = 1 + Math.floor(Math.random() * 33);
        if (!pool.includes(n)) pool.push(n);
      }
      pool.sort((a, b) => a - b);
      pool.push(1 + Math.floor(Math.random() * 16));
      state.lottoNums = pool;
    }

    const nums = state.lottoNums;
    const cols = 4;
    const r = Math.min(w / 10.5, h / 6.2, 18);
    const gapX = r * 2.45;
    const gapY = r * 2.55;
    const startX = w * 0.5 - ((cols - 1) * gapX) / 2;
    const startY = h * 0.5 - gapY * 0.52;

    ctx.font = `600 ${Math.round(r * 0.82)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    nums.forEach((n, idx) => {
      const row = idx < 4 ? 0 : 1;
      const col = idx < 4 ? idx : idx - 3.5;
      const bx = startX + col * gapX;
      const by = startY + row * gapY + Math.sin(t * 3 + idx) * (1.8 + hover * 3.5);
      const isBlue = idx === 6;

      ctx.fillStyle = isBlue ? '#2563EB' : idx % 2 === 0 ? accent : hexToRgba(accent, 0.16);
      ctx.strokeStyle = isBlue ? '#2563EB' : ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, TAU);
      ctx.fill();
      if (!isBlue && idx % 2 !== 0) ctx.stroke();

      ctx.fillStyle = isBlue || idx % 2 === 0 ? '#FFFFFF' : ink;
      ctx.fillText(String(n).padStart(2, '0'), bx, by + 0.5);
    });

    ctx.strokeStyle = inkFaint;
    ctx.strokeRect(w * 0.14, h * 0.18, w * 0.72, h * 0.64);
  },

  'switchboard-matrix'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover, lx, ly } = state;
    const cols = 6;
    const rows = 4;
    const padX = w * 0.18;
    const padY = h * 0.22;
    const cw = (w - padX * 2) / (cols - 1);
    const ch = (h - padY * 2) / (rows - 1);
    const activeCol = Math.round(lx * (cols - 1));
    const activeRow = Math.round(ly * (rows - 1));

    ctx.strokeStyle = inkFaint;
    ctx.lineWidth = 1;
    for (let r = 0; r < rows; r += 1) {
      const y = padY + r * ch;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - padX, y);
      ctx.stroke();
    }

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = padX + c * cw;
        const y = padY + r * ch;
        const lit = (hover > 0.1 && (c === activeCol || r === activeRow)) || Math.sin(t * 2.6 + c * 0.8 + r * 1.1) > 0.42;
        ctx.fillStyle = lit ? accent : inkFaint;
        ctx.strokeStyle = ink;
        ctx.beginPath();
        ctx.rect(x - 4.5, y - 4.5, 9, 9);
        if (lit) ctx.fill();
        ctx.stroke();
      }
    }
  },

  'poker-fan'(ctx, state, t) {
    const { w, h, accent, ink, surface, hover, lx, impulse } = state;
    const suits = ['♠', '♥', '♦', '♣'];
    const cx = w * 0.5;
    const cy = h * 0.62;
    const cw = Math.min(w, h) * 0.28;
    const ch = cw * 1.38;
    const spread = 0.16 + hover * 0.18 + impulse * 0.15;

    ctx.font = `700 ${Math.round(cw * 0.38)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    suits.forEach((suit, i) => {
      const offset = i - 1.5;
      const rot = offset * spread + Math.sin(t * 1.8 + i) * 0.03 + (lx - 0.5) * hover * 0.16;
      ctx.save();
      ctx.translate(cx + offset * cw * 0.34, cy);
      ctx.rotate(rot);
      ctx.fillStyle = surface;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-cw * 0.5, -ch * 0.82, cw, ch, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = i === 1 || i === 2 ? accent : ink;
      ctx.fillText(suit, 0, -ch * 0.32);
      ctx.restore();
    });
  },

  'modular-blocks'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover } = state;
    const padX = w * 0.18;
    const padY = h * 0.18;
    const bw = w - padX * 2;
    const bh = h - padY * 2;
    const split = lerp(0.34, 0.58, hover > 0.1 ? hover : Math.sin(t * 1.6) * 0.5 + 0.5);

    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padX, padY, bw, bh);

    ctx.fillStyle = accent;
    ctx.fillRect(padX + 6, padY + 6, bw - 12, bh * 0.18);

    const topY = padY + 12 + bh * 0.18;
    const remH = bh - (18 + bh * 0.18);
    const leftW = (bw - 18) * split;
    const rightW = bw - 18 - leftW;

    ctx.fillStyle = inkFaint;
    ctx.fillRect(padX + 6, topY, leftW, remH);
    ctx.strokeStyle = ink;
    ctx.strokeRect(padX + 12 + leftW, topY, rightW, remH * 0.46);
    ctx.strokeRect(padX + 12 + leftW, topY + remH * 0.54, rightW, remH * 0.46);
  },

  'rgb-subpixel'(ctx, state, t) {
    const { w, h, hover, lx, ly } = state;
    const cols = 9;
    const rows = 4;
    const padX = w * 0.15;
    const padY = h * 0.22;
    const cellW = (w - padX * 2) / cols;
    const cellH = (h - padY * 2) / rows;
    const colors = ['#FF3B1D', '#10B981', '#3B82F6'];

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cx = padX + c * cellW;
        const cy = padY + r * cellH;
        const wave = Math.sin(t * 3.2 - c * 0.55 - r * 0.75 + lx * 4 * hover);
        const alpha = clamp(0.28 + wave * 0.35 + hover * 0.25, 0.12, 0.95);
        const barW = Math.max(2, (cellW - 6) / 3);
        for (let k = 0; k < 3; k += 1) {
          ctx.fillStyle = hexToRgba(colors[k], k === Math.floor((ly * 3 + c) % 3) ? alpha : alpha * 0.65);
          ctx.fillRect(cx + k * (barW + 1), cy + 2, barW, cellH - 5);
        }
      }
    }
  },

  'pixel-cipher'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover, lx } = state;
    const splitX = w * lerp(0.5, clamp(lx, 0.25, 0.75), hover);
    const padY = h * 0.2;

    const size = 10;
    for (let y = padY; y < h - padY; y += size + 3) {
      for (let x = w * 0.16; x < splitX - 8; x += size + 3) {
        const on = Math.sin(x * 0.09 + y * 0.11 + t * 2) > 0;
        ctx.fillStyle = on ? accent : inkFaint;
        ctx.fillRect(x, y, size, size);
      }
    }

    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitX, padY - 8);
    ctx.lineTo(splitX, h - padY + 8);
    ctx.stroke();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = accent;
    ctx.textAlign = 'left';
    for (let row = 0; row < 5; row += 1) {
      let line = '';
      for (let col = 0; col < 9; col += 1) {
        const idx = Math.floor(Math.abs(Math.sin(t * 2.5 + row * 3 + col * 1.7)) * chars.length) % chars.length;
        line += chars[idx];
      }
      const rx = splitX + 10;
      if (rx < w * 0.82) {
        ctx.fillText(line.slice(0, Math.max(1, Math.floor((w * 0.86 - rx) / 6.5))), rx, padY + 10 + row * 17);
      }
    }
  },

  'syntax-morph'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover } = state;
    const mix = hover > 0.08 ? hover : Math.sin(t * 1.7) * 0.5 + 0.5;
    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = hexToRgba(ink, 1 - mix * 0.65);
    ctx.fillText('{ TS }', cx - mix * 34, cy - (1 - mix) * 2);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 20);
    ctx.lineTo(cx + 18, cy + 20);
    ctx.stroke();

    ctx.fillStyle = hexToRgba(accent, 0.35 + mix * 0.65);
    ctx.fillText('# MD', cx + (1 - mix) * 34, cy);

    ctx.strokeStyle = inkFaint;
    ctx.strokeRect(w * 0.18, h * 0.22, w * 0.64, h * 0.56);
  },

  'vernier-dial'(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, hover, lx, ly } = state;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.min(w, h) * 0.33;
    const angle = hover > 0.05 ? Math.atan2(ly - 0.5, lx - 0.5) : t * 0.8;
    const deg = Math.round((((angle * 180) / Math.PI) + 360) % 360);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < 36; i += 1) {
      const a = (i / 36) * TAU;
      const major = i % 3 === 0;
      ctx.strokeStyle = major ? ink : inkFaint;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * (major ? 0.82 : 0.9), Math.sin(a) * r * (major ? 0.82 : 0.9));
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * r * 0.88, Math.sin(angle) * r * 0.88);
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${String(deg).padStart(3, '0')}°`, 0, r * 0.42);
    ctx.restore();
  },

  // 17. check-version — Official #68E534 animated circular stroke & verification checkmark
  'version-check-ring'(ctx, state, t) {
    const { w, h, inkFaint, hover, impulse } = state;
    const neonGreen = '#68E534';
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.min(w, h) * 0.31;

    ctx.strokeStyle = inkFaint;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    const sweep = hover > 0.1 ? TAU * (0.75 + hover * 0.25) : TAU * (0.55 + Math.sin(t * 1.8) * 0.35);
    ctx.strokeStyle = neonGreen;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.5, -Math.PI * 0.5 + sweep);
    ctx.stroke();

    // Official check-version polyline checkmark
    const s = (r / 42) * (1 + impulse * 0.18);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.strokeStyle = neonGreen;
    ctx.lineWidth = 5.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.lineTo(-4, 15);
    ctx.lineTo(20, -13);
    ctx.stroke();
    ctx.restore();
  },

  'vector-compass'(ctx, state, t, pointer) {
    const { w, h, accent, ink, rect, hover } = state;
    const cols = 6;
    const rows = 3;
    const padX = w * 0.17;
    const padY = h * 0.24;
    const cw = (w - padX * 2) / (cols - 1);
    const ch = (h - padY * 2) / (rows - 1);

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = padX + c * cw;
        const y = padY + r * ch;
        const gx = rect.left + x;
        const gy = rect.top + y;
        const a = Math.atan2(pointer.y - gy, pointer.x - gx) + Math.sin(t + c * 0.3) * (1 - hover) * 0.15;
        const near = Math.hypot(pointer.x - gx, pointer.y - gy) < 150;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.strokeStyle = near || hover > 0.2 ? accent : ink;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.moveTo(2, -4);
        ctx.lineTo(7, 0);
        ctx.lineTo(2, 4);
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  procedural(ctx, state, t) {
    const { w, h, accent, ink, inkFaint, seed, hover, lx, ly } = state;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.min(w, h) * 0.32;
    const freqA = 2 + (seed % 4);
    const freqB = 3 + ((seed >> 3) % 4);

    ctx.strokeStyle = inkFaint;
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);

    ctx.strokeStyle = hover > 0.1 ? accent : ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const steps = 110;
    for (let i = 0; i <= steps; i += 1) {
      const p = (i / steps) * TAU;
      const x = cx + Math.sin(p * freqA + t * 1.1 + lx * hover * 2) * r * 0.85;
      const y = cy + Math.cos(p * freqB + t * 0.8 + ly * hover * 2) * r * 0.85;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5 + hover * 2, 0, TAU);
    ctx.fill();
  },
};

// Mounts a live interactive 3-character SVG stage powered by the REAL fuli-avatar v5 engine!
export function mountLiveFuliAvatarStage(stageEl) {
  const wrap = document.createElement('div');
  wrap.className = 'fuli-avatar-stage';

  const trio = document.createElement('div');
  trio.className = 'fuli-avatar-trio';

  const footer = document.createElement('div');
  footer.className = 'fuli-avatar-caption';

  const nameBadge = document.createElement('span');
  nameBadge.className = 'fuli-avatar-name';

  const rollBtn = document.createElement('button');
  rollBtn.type = 'button';
  rollBtn.className = 'fuli-avatar-roll';
  rollBtn.setAttribute('data-cursor', 'ROLL 🎲');
  rollBtn.textContent = '↻ ROLL';

  footer.append(nameBadge, rollBtn);
  wrap.append(trio, footer);
  stageEl.prepend(wrap);

  const CURATED_SEEDS = [
    ['jevons-architect', 'fuli-sage-7', 'aurora-cat'],
    ['dingdong-pal', 'tonborg-lead', 'solaris-pilot'],
    ['jade-craft-8', 'swiss-grid-3', 'cyber-poet'],
    ['velvet-owl', 'neon-monk-5', 'kintsugi-9'],
  ];
  let batchIdx = 0;

  const renderTrio = (seeds) => {
    trio.innerHTML = '';
    seeds.forEach((seed, idx) => {
      const slot = document.createElement('div');
      slot.className = `avatar-portrait-card is-pos-${idx}`;
      slot.innerHTML = createAvatar(seed, { eggs: true });
      trio.appendChild(slot);
    });
    nameBadge.textContent = `✦ ${nameFor(seeds[1])}`;
  };

  renderTrio(CURATED_SEEDS[0]);

  const rollNext = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    synth.playClick();
    batchIdx = (batchIdx + 1) % (CURATED_SEEDS.length + 4);
    const nextSeeds =
      batchIdx < CURATED_SEEDS.length
        ? CURATED_SEEDS[batchIdx]
        : [
            `ydys-${Math.random().toString(36).slice(2, 7)}`,
            `fuli-${Math.random().toString(36).slice(2, 7)}`,
            `egg-${Math.random().toString(36).slice(2, 7)}`,
          ];
    renderTrio(nextSeeds);
  };

  rollBtn.addEventListener('click', rollNext);
}

export class CardArtDirector {
  constructor() {
    this.instances = new Map();
    this.pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    this.themeColors = this.readThemeColors();
    this.rafId = 0;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const inst = this.instances.get(entry.target);
          if (inst) inst.visible = entry.isIntersecting;
        }
      },
      { rootMargin: '120px' }
    );

    window.addEventListener(
      'pointermove',
      (e) => {
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
      },
      { passive: true }
    );
    window.addEventListener('resize', () => this.measureAll(), { passive: true });
    window.addEventListener('scroll', () => this.refreshRects(), { passive: true });
  }

  readThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.documentElement.classList.contains('is-overdrive');
    return {
      isDark,
      ink: styles.getPropertyValue('--ink').trim() || '#111113',
      inkFaint: styles.getPropertyValue('--hairline-strong').trim() || 'rgba(17,17,19,0.18)',
      surface: styles.getPropertyValue('--surface').trim() || '#FFFFFF',
    };
  }

  refreshTheme() {
    this.themeColors = this.readThemeColors();
  }

  mount(canvas, item) {
    if (item.artKey === 'fuli-avatar-live') {
      canvas.remove();
      const stageEl = item._stageEl;
      if (stageEl) mountLiveFuliAvatarStage(stageEl);
      return;
    }

    const ctx = canvas.getContext('2d');
    const state = {
      canvas,
      ctx,
      artKey: item.artKey || 'procedural',
      accent: item.accent || '#FF3B1D',
      accentAlt: item.accentAlt || null,
      seed: item.seed || 1,
      w: 300,
      h: 180,
      rect: { left: 0, top: 0, width: 300, height: 180 },
      visible: true,
      hoverTarget: 0,
      hover: 0,
      lx: 0.5,
      ly: 0.5,
      impulse: 0,
    };

    const card = canvas.closest('.portal-card') || canvas;
    card.addEventListener('pointerenter', () => {
      state.hoverTarget = 1;
      state.rect = canvas.getBoundingClientRect();
    });
    card.addEventListener('pointerleave', () => {
      state.hoverTarget = 0;
    });
    card.addEventListener('pointermove', (e) => {
      const r = state.rect;
      if (r.width > 0 && r.height > 0) {
        state.lx = clamp((e.clientX - r.left) / r.width, 0, 1);
        state.ly = clamp((e.clientY - r.top) / r.height, 0, 1);
      }
    });
    card.addEventListener('pointerdown', () => {
      state.impulse = 1;
      if (item.slug === 'DingDongBuddy') {
        synth.playDingDong();
      }
    });

    this.instances.set(canvas, state);
    this.observer.observe(canvas);
    this.measureOne(state);
    if (!this.rafId) this.start();
  }

  clear() {
    for (const canvas of this.instances.keys()) {
      this.observer.unobserve(canvas);
    }
    this.instances.clear();
  }

  measureOne(state) {
    const rect = state.canvas.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = rect.width;
    state.h = rect.height;
    state.rect = rect;
    state.canvas.width = Math.round(rect.width * dpr);
    state.canvas.height = Math.round(rect.height * dpr);
    state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  measureAll() {
    for (const state of this.instances.values()) {
      this.measureOne(state);
    }
  }

  refreshRects() {
    for (const state of this.instances.values()) {
      if (state.visible) {
        state.rect = state.canvas.getBoundingClientRect();
      }
    }
  }

  start() {
    const tick = (now) => {
      const t = now * 0.001;
      const { ink, inkFaint, surface, isDark } = this.themeColors;

      for (const state of this.instances.values()) {
        if (!state.visible) continue;
        if (Math.abs(state.canvas.clientWidth - state.w) > 2 || Math.abs(state.canvas.clientHeight - state.h) > 2) {
          this.measureOne(state);
        }
        state.hover = lerp(state.hover, state.hoverTarget, 0.12);
        state.impulse *= 0.9;

        state.ink = ink;
        state.inkFaint = inkFaint;
        state.surface = surface;
        state.isDark = isDark;

        const { ctx, w, h } = state;
        ctx.clearRect(0, 0, w, h);
        drawRegistrationMarks(ctx, w, h, inkFaint);

        const render = ART_RENDERERS[state.artKey] || ART_RENDERERS.procedural;
        render(ctx, state, t, this.pointer);
      }

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
