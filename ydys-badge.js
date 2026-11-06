/**
 * YdysCyberBadge (UMD) — Centrally maintained Cyberpunk Neon Flickering Badge for 有点.意思.com
 * Hosted at: https://xn--8ovp9s.xn--m8txu.com/ydys-badge.js
 *
 * Usage:
 *   1. Declarative HTML in footer:
 *      <a href="https://xn--8ovp9s.xn--m8txu.com/" data-ydys-badge>有点.意思.com</a>
 *      <script src="https://xn--8ovp9s.xn--m8txu.com/ydys-badge.js" defer></script>
 *
 *   2. Programmatic UMD API:
 *      window.YdysCyberBadge.mount('#my-footer-slot');
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.YdysCyberBadge = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PORTAL_URL = 'https://xn--8ovp9s.xn--m8txu.com/';
  var DISPLAY_TEXT = '有点.意思.com';
  var STYLE_ID = 'ydys-cyber-badge-styles';
  var GLITCH_GLYPHS = ['⚡', '◈', '░', '▒', '✦', '❖', '￥', '∆'];

  var CSS_TEXT = [
    'a.ydys-cyber-badge, .ydys-cyber-badge {',
    '  position: relative;',
    '  box-sizing: border-box !important;',
    '  display: inline-flex !important;',
    '  align-items: center;',
    '  justify-content: center !important;',
    '  width: 98px !important;',
    '  min-width: 98px !important;',
    '  max-width: 98px !important;',
    '  height: 22px !important;',
    '  padding: 0 6px !important;',
    '  flex-shrink: 0 !important;',
    '  contain: layout style;',
    '  border-radius: 4px;',
    '  background: linear-gradient(135deg, #090a12 0%, #141024 55%, #090d16 100%) !important;',
    '  border: 1px solid rgba(0, 240, 255, 0.58) !important;',
    '  box-shadow:',
    '    0 0 8px rgba(0, 240, 255, 0.32),',
    '    0 0 18px rgba(255, 0, 85, 0.18),',
    '    inset 0 0 8px rgba(0, 240, 255, 0.14);',
    '  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Noto Sans SC", "PingFang SC", monospace !important;',
    '  font-size: 12px !important;',
    '  font-weight: 800 !important;',
    '  line-height: 1 !important;',
    '  letter-spacing: 0;',
    '  text-decoration: none !important;',
    '  white-space: nowrap;',
    '  vertical-align: middle;',
    '  overflow: hidden;',
    '  cursor: pointer;',
    '  user-select: none;',
    '  -webkit-user-select: none;',
    '  clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px));',
    '  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;',
    '  animation: ydysBorderPulse 3.6s ease-in-out infinite;',
    '}',
    'a.ydys-cyber-badge::before, .ydys-cyber-badge::before {',
    '  content: "";',
    '  position: absolute;',
    '  inset: 0;',
    '  background: repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px);',
    '  pointer-events: none;',
    '  z-index: 1;',
    '}',
    'a.ydys-cyber-badge::after, .ydys-cyber-badge::after {',
    '  content: attr(data-ydys-glitch);',
    '  position: absolute;',
    '  inset: 0;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  color: #ff0055;',
    '  text-shadow: -1.5px 0 #00f0ff, 1.5px 0 #fcee09;',
    '  opacity: 0;',
    '  pointer-events: none;',
    '  z-index: 3;',
    '  animation: ydysChromaticGlitch 4.2s steps(2, end) infinite;',
    '}',
    'a.ydys-cyber-badge:hover, .ydys-cyber-badge:hover {',
    '  transform: translateY(-1px);',
    '  border-color: #fcee09 !important;',
    '  box-shadow:',
    '    0 0 12px rgba(0, 240, 255, 0.75),',
    '    0 0 24px rgba(255, 0, 85, 0.5),',
    '    0 0 36px rgba(252, 238, 9, 0.28),',
    '    inset 0 0 12px rgba(0, 240, 255, 0.28);',
    '}',
    '.ydys-cyber-inner {',
    '  position: relative;',
    '  z-index: 2;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 100%;',
    '}',
    '.ydys-seg-left {',
    '  display: inline-block;',
    '  width: 25px;',
    '  text-align: center;',
    '  flex-shrink: 0;',
    '  color: #00f0ff !important;',
    '  text-shadow: 0 0 5px #00f0ff, 0 0 11px rgba(0, 240, 255, 0.8), 1px 0 0 rgba(255, 0, 85, 0.65);',
    '  animation: ydysNeonFlickerA 2.9s infinite;',
    '}',
    '.ydys-seg-dot {',
    '  display: inline-block;',
    '  width: 6px;',
    '  text-align: center;',
    '  flex-shrink: 0;',
    '  margin: 0;',
    '  color: #ff0055 !important;',
    '  font-weight: 900;',
    '  text-shadow: 0 0 6px #ff0055, 0 0 12px #ff0055;',
    '  animation: ydysDotStrobe 1.35s steps(2, start) infinite;',
    '}',
    '.ydys-seg-right {',
    '  display: inline-block;',
    '  width: 25px;',
    '  text-align: center;',
    '  flex-shrink: 0;',
    '  color: #fcee09 !important;',
    '  text-shadow: 0 0 5px rgba(252, 238, 9, 0.9), 0 0 12px rgba(255, 0, 85, 0.7), -1px 0 0 rgba(0, 240, 255, 0.7);',
    '  animation: ydysNeonFlickerB 3.4s infinite;',
    '}',
    '.ydys-seg-tld {',
    '  display: inline-block;',
    '  width: 28px;',
    '  text-align: left;',
    '  flex-shrink: 0;',
    '  color: #ff2a85 !important;',
    '  font-size: 10.5px;',
    '  font-weight: 700;',
    '  margin-left: 0;',
    '  text-shadow: 0 0 5px rgba(255, 42, 133, 0.9), 0 0 10px rgba(0, 240, 255, 0.55);',
    '  animation: ydysNeonFlickerC 2.3s infinite;',
    '}',
    'a.ydys-cyber-badge.is-sparking, .ydys-cyber-badge.is-sparking {',
    '  border-color: #ff0055 !important;',
    '  box-shadow: 0 0 16px #ff0055, 0 0 28px #00f0ff !important;',
    '}',
    '@keyframes ydysNeonFlickerA {',
    '  0%, 18%, 22%, 25%, 53%, 57%, 100% {',
    '    opacity: 1;',
    '    text-shadow: 0 0 5px #00f0ff, 0 0 11px rgba(0, 240, 255, 0.85), 1px 0 0 rgba(255, 0, 85, 0.65);',
    '  }',
    '  20%, 24%, 55% {',
    '    opacity: 0.24;',
    '    text-shadow: none;',
    '  }',
    '}',
    '@keyframes ydysNeonFlickerB {',
    '  0%, 39%, 41%, 43%, 78%, 80%, 100% {',
    '    opacity: 1;',
    '    text-shadow: 0 0 5px rgba(252, 238, 9, 0.92), 0 0 12px rgba(255, 0, 85, 0.75), -1px 0 0 rgba(0, 240, 255, 0.7);',
    '  }',
    '  40%, 42%, 79% {',
    '    opacity: 0.18;',
    '    text-shadow: none;',
    '  }',
    '}',
    '@keyframes ydysNeonFlickerC {',
    '  0%, 63%, 66%, 100% { opacity: 1; }',
    '  64%, 65% { opacity: 0.22; text-shadow: none; }',
    '}',
    '@keyframes ydysDotStrobe {',
    '  0%, 100% { opacity: 1; transform: scale(1); }',
    '  50% { opacity: 0.35; transform: scale(0.88); }',
    '}',
    '@keyframes ydysChromaticGlitch {',
    '  0%, 91%, 96%, 100% { opacity: 0; transform: translate(0, 0); }',
    '  92% { opacity: 0.88; transform: translate(-2px, 0.5px) skewX(-8deg); clip-path: inset(10% 0 45% 0); }',
    '  94% { opacity: 0.88; transform: translate(2px, -0.5px) skewX(8deg); clip-path: inset(50% 0 8% 0); }',
    '}',
    '@keyframes ydysBorderPulse {',
    '  0%, 100% {',
    '    border-color: rgba(0, 240, 255, 0.6);',
    '    box-shadow: 0 0 8px rgba(0, 240, 255, 0.3), 0 0 18px rgba(255, 0, 85, 0.16), inset 0 0 8px rgba(0, 240, 255, 0.12);',
    '  }',
    '  50% {',
    '    border-color: rgba(255, 0, 85, 0.72);',
    '    box-shadow: 0 0 11px rgba(255, 0, 85, 0.36), 0 0 22px rgba(0, 240, 255, 0.24), inset 0 0 10px rgba(255, 0, 85, 0.14);',
    '  }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  a.ydys-cyber-badge, .ydys-cyber-badge,',
    '  a.ydys-cyber-badge::after, .ydys-cyber-badge::after,',
    '  .ydys-seg-left, .ydys-seg-dot, .ydys-seg-right, .ydys-seg-tld {',
    '    animation: none !important;',
    '  }',
    '}',
  ].join('\n');

  function injectStyles(doc) {
    var d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || d.getElementById(STYLE_ID)) return;
    var style = d.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS_TEXT;
    (d.head || d.documentElement).appendChild(style);
  }

  function buildInnerMarkup(el) {
    el.classList.add('ydys-cyber-badge');
    if (el.tagName === 'A') {
      if (!el.getAttribute('href') || el.getAttribute('href') === '#') {
        el.setAttribute('href', PORTAL_URL);
      }
      if (!el.getAttribute('target')) {
        el.setAttribute('target', '_blank');
      }
      el.setAttribute('rel', 'noopener');
    }
    el.setAttribute('data-ydys-glitch', DISPLAY_TEXT);
    el.setAttribute('aria-label', DISPLAY_TEXT + ' — 有点意思互动作品集');
    el.setAttribute('title', '有点.意思.com · 赛博传送门');

    el.innerHTML =
      '<span class="ydys-cyber-inner">' +
      '<span class="ydys-seg-left" data-orig="有点">有点</span>' +
      '<span class="ydys-seg-dot">.</span>' +
      '<span class="ydys-seg-right" data-orig="意思">意思</span>' +
      '<span class="ydys-seg-tld">.com</span>' +
      '</span>';

    bindSparkEffect(el);
    return el;
  }

  function triggerSpark(el) {
    if (!el || el.dataset.ydysSparkBusy === '1') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    el.dataset.ydysSparkBusy = '1';
    el.classList.add('is-sparking');

    var left = el.querySelector('.ydys-seg-left');
    var right = el.querySelector('.ydys-seg-right');
    var g1 = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
    var g2 = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];

    if (left) left.textContent = '有' + g1;
    if (right) right.textContent = g2 + '思';

    setTimeout(function () {
      if (left) left.textContent = left.getAttribute('data-orig') || '有点';
      if (right) right.textContent = right.getAttribute('data-orig') || '意思';
      el.classList.remove('is-sparking');
      el.dataset.ydysSparkBusy = '0';
    }, 110);
  }

  function bindSparkEffect(el) {
    if (el.dataset.ydysBound === '1') return;
    el.dataset.ydysBound = '1';

    el.addEventListener('pointerenter', function () {
      triggerSpark(el);
    });
  }

  var sparkTimer = null;
  function ensureGlobalSparkLoop() {
    if (sparkTimer || typeof window === 'undefined' || typeof document === 'undefined') return;
    sparkTimer = setInterval(function () {
      var badges = document.querySelectorAll('.ydys-cyber-badge');
      for (var i = 0; i < badges.length; i += 1) {
        if (Math.random() < 0.65) {
          triggerSpark(badges[i]);
        }
      }
    }, 3200);
  }

  function mount(target, options) {
    injectStyles();
    var opts = options || {};
    var el = null;

    if (typeof target === 'string') {
      el = document.querySelector(target);
    } else if (target && target.nodeType === 1) {
      el = target;
    }

    if (!el) return null;

    if (el.tagName !== 'A' && !opts.replaceElement) {
      var existing = el.querySelector('[data-ydys-badge], .ydys-cyber-badge');
      if (existing) return buildInnerMarkup(existing);
      var anchor = document.createElement('a');
      anchor.href = opts.href || PORTAL_URL;
      anchor.setAttribute('data-ydys-badge', '');
      el.appendChild(anchor);
      el = anchor;
    }

    ensureGlobalSparkLoop();
    return buildInnerMarkup(el);
  }

  function mountAll(rootNode) {
    injectStyles();
    var scope = rootNode || (typeof document !== 'undefined' ? document : null);
    if (!scope || !scope.querySelectorAll) return [];

    var nodes = scope.querySelectorAll(
      '[data-ydys-badge], a.ydys-cyber-badge, a[href="https://xn--8ovp9s.xn--m8txu.com/"], a[href="https://xn--8ovp9s.xn--m8txu.com"]'
    );
    var mounted = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (node.dataset.ydysBound !== '1') {
        buildInnerMarkup(node);
      }
      mounted.push(node);
    }
    if (mounted.length > 0) {
      ensureGlobalSparkLoop();
    }
    return mounted;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        mountAll(document);
      });
    } else {
      mountAll(document);
    }
  }

  return {
    PORTAL_URL: PORTAL_URL,
    LABEL: DISPLAY_TEXT,
    CSS_TEXT: CSS_TEXT,
    injectStyles: injectStyles,
    mount: mount,
    mountAll: mountAll,
    triggerSpark: triggerSpark,
  };
});
