// Random Periodic Cyberpunk Signal Malfunction / Static Crackle ("滋滋滋") Controller
// Fires at random 20s ~ 44s intervals on the main portal (https://xn--8ovp9s.xn--m8txu.com/),
// simulating a sudden neural link / CRT carrier drop with static snow, horizontal RGB tearing,
// brief signal blackout micro-frames, DOM text corruption, and WebAudio static crackle.

import { synth } from '../audio/micro-synth.js';

const STATIC_GLYPHS = '▓▒░█▄▀■□ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ019F∆╬⚡';

const ERROR_BANNERS = [
  'SIGNAL_LOST // CARRIER_DROP [0xE4]',
  'NEURAL_LINK_ERR // STATIC_BURST',
  'NO_CARRIER // RELIC_SYNC_FAIL',
  'BLACKWALL_INTERFERENCE // 0x9F',
];

export const DEFAULT_SIGNAL_PROBABILITY = 0.2; // 1/5 probability per 20s-44s window

export function randomSignalDelayMs(minMs = 20000, maxMs = 44000) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

export function shouldTriggerSignalGlitch(
  probability = DEFAULT_SIGNAL_PROBABILITY,
  rng = Math.random
) {
  return rng() < probability;
}

export function startCyberSignalGlitchLoop(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { stop: () => {}, triggerNow: () => {} };
  }

  const minMs = options.minMs ?? 20000;
  const maxMs = options.maxMs ?? 44000;
  const probability = options.probability ?? DEFAULT_SIGNAL_PROBABILITY;

  let timerId = 0;
  let rafId = 0;
  let stopped = false;
  let activeBurst = false;

  // Create dedicated full-viewport non-blocking static interference canvas
  let canvas = document.getElementById('cyber-signal-overlay');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'cyber-signal-overlay';
    canvas.className = 'cyber-signal-overlay';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = true;
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');

  // Low-res offscreen noise buffer scaled up for crisp blocky CRT static snow ("滋滋滋")
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 220;
  noiseCanvas.height = 140;
  const noiseCtx = noiseCanvas.getContext('2d');

  function fillStaticSnow(intensity = 0.65) {
    const w = noiseCanvas.width;
    const h = noiseCanvas.height;
    const img = noiseCtx.createImageData(w, h);
    const data = img.data;

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() > intensity) {
        data[i + 3] = 0;
        continue;
      }
      const r = Math.random();
      if (r < 0.72) {
        // High-contrast monochrome TV snow
        const lum = Math.random() < 0.5 ? 245 : 18;
        data[i] = lum;
        data[i + 1] = lum;
        data[i + 2] = lum;
        data[i + 3] = Math.floor(110 + Math.random() * 135);
      } else if (r < 0.86) {
        // Electric Cyan static grain
        data[i] = 0;
        data[i + 1] = 240;
        data[i + 2] = 255;
        data[i + 3] = 210;
      } else if (r < 0.96) {
        // Cyber Magenta static grain
        data[i] = 255;
        data[i + 1] = 0;
        data[i + 2] = 85;
        data[i + 3] = 210;
      } else {
        // Acid Yellow spark grain
        data[i] = 252;
        data[i + 1] = 238;
        data[i + 2] = 9;
        data[i + 3] = 230;
      }
    }
    noiseCtx.putImageData(img, 0, 0);
  }

  function scrambleVisibleTexts() {
    const targets = Array.from(
      document.querySelectorAll('.card-title, .runway-name, .hud-coords, .counter-num')
    ).slice(0, 8);
    const saved = [];

    targets.forEach((el) => {
      if (Math.random() < 0.45) return;
      const orig = el.textContent;
      if (!orig) return;
      saved.push({ el, orig });
      const chars = orig.split('');
      for (let i = 0; i < chars.length; i += 1) {
        if (chars[i] !== ' ' && Math.random() < 0.55) {
          chars[i] = STATIC_GLYPHS[Math.floor(Math.random() * STATIC_GLYPHS.length)];
        }
      }
      el.textContent = chars.join('');
    });

    return () => {
      saved.forEach(({ el, orig }) => {
        el.textContent = orig;
      });
    };
  }

  function triggerSignalMalfunction() {
    if (stopped || activeBurst) return;
    if (
      document.hidden ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      scheduleNext();
      return;
    }

    activeBurst = true;
    const durationMs = Math.floor(520 + Math.random() * 340); // 520ms ~ 860ms multi-pulse burst
    const startAt = performance.now();
    const bannerText = ERROR_BANNERS[Math.floor(Math.random() * ERROR_BANNERS.length)];

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    canvas.hidden = false;

    document.body.classList.add('is-signal-glitch');
    synth.playSignalInterference(durationMs);
    const restoreTexts = scrambleVisibleTexts();

    const tick = (now) => {
      const elapsed = now - startAt;
      if (elapsed >= durationMs || stopped) {
        ctx.clearRect(0, 0, width, height);
        canvas.hidden = true;
        document.body.classList.remove(
          'is-signal-glitch',
          'is-signal-dropout',
          'is-signal-invert'
        );
        document.documentElement.style.removeProperty('--signal-jx');
        document.documentElement.style.removeProperty('--signal-jy');
        document.documentElement.style.removeProperty('--signal-skew');
        restoreTexts();
        activeBurst = false;
        scheduleNext();
        return;
      }

      // Stutter gate: alternates between violent static snow, brief signal blackout, and normal micro-gaps
      const pulse = Math.sin(elapsed * 0.065) * Math.cos(elapsed * 0.029);
      const isBlackout = elapsed > durationMs * 0.36 && elapsed < durationMs * 0.48;
      const isInvert = elapsed > durationMs * 0.68 && elapsed < durationMs * 0.76;

      document.body.classList.toggle('is-signal-dropout', isBlackout);
      document.body.classList.toggle('is-signal-invert', isInvert);

      // Whole-page horizontal/vertical sync jitter variables
      const jx = (Math.random() - 0.5) * (isBlackout ? 28 : 16);
      const jy = (Math.random() - 0.5) * (isBlackout ? 14 : 6);
      const skew = (Math.random() - 0.5) * (isBlackout ? 6 : 2.5);
      document.documentElement.style.setProperty('--signal-jx', `${jx.toFixed(1)}px`);
      document.documentElement.style.setProperty('--signal-jy', `${jy.toFixed(1)}px`);
      document.documentElement.style.setProperty('--signal-skew', `${skew.toFixed(2)}deg`);

      ctx.clearRect(0, 0, width, height);

      if (pulse > -0.35 || isBlackout) {
        // 1. Draw scaled CRT Static Snow ("滋滋滋"颗粒雪花噪点)
        fillStaticSnow(isBlackout ? 0.85 : 0.48);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = isBlackout ? 0.78 : 0.36;
        ctx.drawImage(noiseCanvas, 0, 0, width, height);
        ctx.restore();

        // 2. Horizontal VHS / Neural Tracking Tear Bars
        const barCount = isBlackout ? 14 : 7;
        for (let i = 0; i < barCount; i += 1) {
          const by = Math.random() * height;
          const bh = 3 + Math.random() * (isBlackout ? 46 : 22);
          const colorPick = Math.random();
          ctx.fillStyle =
            colorPick < 0.38
              ? 'rgba(0, 240, 255, 0.42)'
              : colorPick < 0.76
                ? 'rgba(255, 0, 85, 0.42)'
                : 'rgba(252, 238, 9, 0.48)';
          ctx.fillRect(0, by, width, bh);

          // Bright white static zip line inside the tear bar
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(Math.random() * width * 0.4, by + bh * 0.5, width * 0.6, 1.5);
        }

        // 3. Flickering Carrier-Lost HUD Warning Stamp during peak dropout
        if (isBlackout || Math.random() < 0.45) {
          ctx.save();
          const boxW = Math.min(440, width * 0.86);
          const boxH = 44;
          const bx = (width - boxW) * 0.5 + (Math.random() - 0.5) * 18;
          const by = height * 0.5 - boxH * 0.5 + (Math.random() - 0.5) * 14;

          ctx.fillStyle = 'rgba(6, 5, 14, 0.92)';
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2;
          ctx.fillRect(bx, by, boxW, boxH);
          ctx.strokeRect(bx, by, boxW, boxH);

          ctx.font = '900 13px "JetBrains Mono", monospace';
          ctx.fillStyle = '#fcee09';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`⚡ ${bannerText}`, bx + boxW * 0.5, by + boxH * 0.5);
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  function scheduleNext() {
    if (stopped) return;
    if (timerId) clearTimeout(timerId);
    const delay = randomSignalDelayMs(minMs, maxMs);
    timerId = setTimeout(() => {
      if (stopped) return;
      if (shouldTriggerSignalGlitch(probability)) {
        triggerSignalMalfunction();
      } else {
        scheduleNext();
      }
    }, delay);
  }

  scheduleNext();

  return {
    triggerNow: triggerSignalMalfunction,
    stop: () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
      if (rafId) cancelAnimationFrame(rafId);
      canvas.hidden = true;
      document.body.classList.remove(
        'is-signal-glitch',
        'is-signal-dropout',
        'is-signal-invert'
      );
    },
  };
}
