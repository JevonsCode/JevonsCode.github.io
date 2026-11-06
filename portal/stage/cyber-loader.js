// Procedural Multi-Scene 3D Cyberpunk Overdrive Canvas Loader
// Zero Chinese characters, zero brand wordmarks, zero traditional progress bars.
// Guarantees a different procedural 3D Cyberpunk spectacle on every page entry/refresh.

const DECK_KEY = 'ydys.cyber.deck.v2';
const LAST_KEY = 'ydys.cyber.last.v2';

export const CYBER_SCENES = [
  {
    id: 'oni-katana',
    code: '0x01 // ONI_KATANA_SLASH',
    sub: 'MECHA_SAMURAI_WIREFRAME // BLADE_STORM',
    accent: '#ff0055',
    secondary: '#00f0ff',
  },
  {
    id: 'hyper-warp',
    code: '0x02 // NIGHTCITY_HYPERWARP',
    sub: 'MACH_09_MEGASTRUCTURE // TUNNEL_BREACH',
    accent: '#00f0ff',
    secondary: '#fcee09',
  },
  {
    id: 'blackwall-vortex',
    code: '0x03 // BLACKWALL_AI_BREACH',
    sub: 'ROGUE_NEURAL_SINGULARITY // DATA_VORTEX',
    accent: '#ff0055',
    secondary: '#fcee09',
  },
  {
    id: 'tesseract-overload',
    code: '0x04 // TESSERACT_MELTDOWN',
    sub: '4D_HYPERCUBE_REACTOR // PLASMA_COILS',
    accent: '#fcee09',
    secondary: '#00f0ff',
  },
  {
    id: 'synth-canyon',
    code: '0x05 // SYNTH_CANYON_2099',
    sub: 'OUTRUN_TERRAIN_GRID // TWIN_GLITCH_SUN',
    accent: '#00f0ff',
    secondary: '#ff0055',
  },
];

const GLYPH_POOL = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF∆╬▓░▒◈❖⚡';

export function pickNextCyberSceneIndex() {
  const total = CYBER_SCENES.length;
  let last = -1;
  let deck = [];

  try {
    const rawLast = sessionStorage.getItem(LAST_KEY);
    if (rawLast !== null) last = parseInt(rawLast, 10);
    const rawDeck = sessionStorage.getItem(DECK_KEY);
    if (rawDeck) {
      const parsed = JSON.parse(rawDeck);
      if (Array.isArray(parsed)) {
        deck = parsed.filter((n) => Number.isInteger(n) && n >= 0 && n < total);
      }
    }
  } catch {
    // Ignore storage errors in private browsing
  }

  if (deck.length === 0) {
    deck = Array.from({ length: total }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    if (deck[0] === last && deck.length > 1) {
      const swapIdx = 1 + Math.floor(Math.random() * (deck.length - 1));
      const tmp = deck[0];
      deck[0] = deck[swapIdx];
      deck[swapIdx] = tmp;
    }
  }

  const chosen = deck.shift();
  try {
    sessionStorage.setItem(LAST_KEY, String(chosen));
    sessionStorage.setItem(DECK_KEY, JSON.stringify(deck));
  } catch {
    // Ignore storage errors
  }

  return chosen;
}

// Build 3D Cyber-Oni Samurai Mask wireframe vertices & edges
function createOniMesh() {
  const verts = [
    // Forehead & Horn Crest (0..7)
    [0, -1.15, 0.35],
    [-0.55, -0.95, 0.25],
    [0.55, -0.95, 0.25],
    [-1.15, -1.85, -0.15], // Left Cyber Horn tip
    [1.15, -1.85, -0.15],  // Right Cyber Horn tip
    [-0.32, -1.35, 0.15],
    [0.32, -1.35, 0.15],
    [0, -1.55, 0.05],
    // Visor & Brow Ridge (8..15)
    [0, -0.45, 0.72],
    [-0.48, -0.52, 0.62],
    [0.48, -0.52, 0.62],
    [-0.95, -0.32, 0.28],
    [0.95, -0.32, 0.28],
    [-0.22, -0.22, 0.76],
    [0.22, -0.22, 0.76],
    [0, -0.1, 0.88],
    // Cheek Armor & Fangs (16..25)
    [-0.88, 0.28, 0.35],
    [0.88, 0.28, 0.35],
    [-0.58, 0.45, 0.68],
    [0.58, 0.45, 0.68],
    [-0.42, 0.88, 0.78], // Left Fang tip
    [0.42, 0.88, 0.78],  // Right Fang tip
    [0, 0.52, 0.82],
    [-0.36, 1.12, 0.48],
    [0.36, 1.12, 0.48],
    [0, 1.28, 0.56],     // Chin point
    // Rear Cranium Stabilizers (26..29)
    [-1.18, -0.65, -0.45],
    [1.18, -0.65, -0.45],
    [-0.92, 0.65, -0.38],
    [0.92, 0.65, -0.38],
  ];

  const edges = [
    // Horns & Brow
    [0, 1], [0, 2], [0, 7], [1, 5], [2, 6], [5, 7], [6, 7],
    [1, 3], [5, 3], [2, 4], [6, 4], [3, 26], [4, 27],
    // Visor Slits (glowing eyes)
    [0, 8], [1, 9], [2, 10], [8, 9], [8, 10], [9, 11], [10, 12],
    [9, 13], [10, 14], [13, 11], [14, 12], [13, 15], [14, 15], [8, 15],
    // Cheek & Jaw
    [11, 16], [12, 17], [13, 18], [14, 19], [15, 22],
    [16, 18], [17, 19], [18, 22], [19, 22],
    // Fangs & Mandible
    [18, 20], [22, 20], [19, 21], [22, 21],
    [16, 23], [17, 24], [20, 23], [21, 24], [23, 25], [24, 25], [22, 25],
    // Outer Mech Frame
    [11, 26], [12, 27], [16, 28], [17, 29], [26, 28], [27, 29], [23, 28], [24, 29],
  ];

  const visorTriangles = [
    [9, 11, 13],
    [10, 12, 14],
    [18, 20, 22],
    [19, 21, 22],
  ];

  return { verts, edges, visorTriangles };
}

// Build 4D Tesseract (16 vertices, 32 edges)
function createTesseract() {
  const verts4D = [];
  for (let i = 0; i < 16; i += 1) {
    verts4D.push([
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
      i & 8 ? 1 : -1,
    ]);
  }
  const edges = [];
  for (let i = 0; i < 16; i += 1) {
    for (let j = i + 1; j < 16; j += 1) {
      const diff = i ^ j;
      if (diff && (diff & (diff - 1)) === 0) {
        edges.push([i, j]);
      }
    }
  }
  return { verts4D, edges };
}

function rotate3D(pt, rx, ry, rz) {
  let [x, y, z] = pt;
  // Rotate Y
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  x = x1;
  z = z1;
  // Rotate X
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y2 = y * cx - z * sx;
  const z2 = y * sx + z * cx;
  y = y2;
  z = z2;
  // Rotate Z
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  const x3 = x * cz - y * sz;
  const y3 = x * sz + y * cz;
  return [x3, y3, z];
}

export function mountCyberLoader(container, options = {}) {
  if (!container) return { stop: () => {}, nextScene: () => {} };

  const canvas = container.querySelector('.cyber-stage-canvas');
  const codeEl = container.querySelector('.cyber-hud-code');
  const subEl = container.querySelector('.cyber-hud-sub');
  const hexEl = container.querySelector('.cyber-hud-hex');
  if (!canvas) return { stop: () => {}, nextScene: () => {} };

  const ctx = canvas.getContext('2d');
  let sceneIndex =
    typeof options.sceneIndex === 'number' ? options.sceneIndex : pickNextCyberSceneIndex();

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let stopped = false;
  const startTime = performance.now();

  let pointerX = 0;
  let pointerY = 0;

  const oniMesh = createOniMesh();
  const tesseract = createTesseract();

  // Procedural state for slashes, particles, vortex nodes
  const slashes = [];
  const sparks = [];
  let lastSlashAt = 0;

  const warpStars = Array.from({ length: 160 }, () => ({
    x: (Math.random() - 0.5) * 4,
    y: (Math.random() - 0.5) * 4,
    z: Math.random() * 12 + 0.5,
    color: ['#00f0ff', '#ff0055', '#fcee09', '#b829ff'][Math.floor(Math.random() * 4)],
  }));

  const vortexNodes = Array.from({ length: 260 }, (_, i) => ({
    angle: (i / 260) * Math.PI * 24,
    height: (Math.random() - 0.5) * 3.6,
    radius: 0.25 + Math.random() * 1.9,
    speed: 1.4 + Math.random() * 2.6,
    glyph: GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)],
    isGlyph: i % 5 === 0,
    color: i % 3 === 0 ? '#ff0055' : i % 3 === 1 ? '#00f0ff' : '#fcee09',
  }));

  function updateHudMeta() {
    const meta = CYBER_SCENES[sceneIndex] || CYBER_SCENES[0];
    container.dataset.cyberScene = meta.id;
    if (codeEl) codeEl.textContent = meta.code;
    if (subEl) subEl.textContent = meta.sub;
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(320, rect.width || window.innerWidth);
    height = Math.max(240, rect.height || window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const onPointerMove = (e) => {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  resize();
  updateHudMeta();

  // --- SCENE 0: CYBER ONI SAMURAI MASK & KATANA SLASH STORM ---
  function renderOniKatana(t, cx, cy, scale) {
    // Spawn diagonal Katana slashes periodically
    if (t - lastSlashAt > 0.24) {
      lastSlashAt = t;
      const angle = (Math.random() - 0.5) * 1.4 + (Math.random() < 0.5 ? 0.45 : -0.45);
      const offsetX = (Math.random() - 0.5) * width * 0.35;
      const offsetY = (Math.random() - 0.5) * height * 0.35;
      const color = Math.random() < 0.5 ? '#00f0ff' : Math.random() < 0.7 ? '#ff0055' : '#fcee09';
      slashes.push({
        x: cx + offsetX,
        y: cy + offsetY,
        angle,
        born: t,
        color,
      });
      for (let i = 0; i < 18; i += 1) {
        const dir = angle + (Math.random() - 0.5) * 0.7;
        const spd = 240 + Math.random() * 680;
        sparks.push({
          x: cx + offsetX + (Math.random() - 0.5) * 160,
          y: cy + offsetY + (Math.random() - 0.5) * 160,
          vx: Math.cos(dir) * spd * (Math.random() < 0.5 ? 1 : -1),
          vy: Math.sin(dir) * spd * (Math.random() < 0.5 ? 1 : -1),
          born: t,
          color,
        });
      }
    }

    // Background radial cyber equalizer halo
    const ringRadius = scale * 1.48;
    const bars = 48;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.45);
    for (let i = 0; i < bars; i += 1) {
      const a = (i / bars) * Math.PI * 2;
      const amp =
        14 +
        Math.abs(Math.sin(t * 9 + i * 0.7)) * scale * 0.38 +
        (i % 4 === 0 ? scale * 0.2 : 0);
      const x0 = Math.cos(a) * ringRadius;
      const y0 = Math.sin(a) * ringRadius;
      const x1 = Math.cos(a) * (ringRadius + amp);
      const y1 = Math.sin(a) * (ringRadius + amp);
      ctx.strokeStyle = i % 3 === 0 ? '#ff0055' : i % 3 === 1 ? '#00f0ff' : '#fcee09';
      ctx.lineWidth = i % 4 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();

    // Project 3D Oni Mesh with chromatic triple pass
    const ry = Math.sin(t * 1.9) * 0.58 + pointerX * 0.55;
    const rx = Math.cos(t * 1.4) * 0.24 + pointerY * 0.38;
    const rz = Math.sin(t * 0.9) * 0.12;

    const projected = oniMesh.verts.map((v) => {
      const [x, y, z] = rotate3D(v, rx, ry, rz);
      const fov = 3.4 / (3.4 - z);
      return [cx + x * scale * fov, cy + y * scale * fov, z];
    });

    const passes = [
      { dx: -5, dy: 0, color: 'rgba(0, 240, 255, 0.75)', lw: 1.8 },
      { dx: 5, dy: 0, color: 'rgba(255, 0, 85, 0.75)', lw: 1.8 },
      { dx: 0, dy: 0, color: '#fcee09', lw: 2.2 },
    ];

    for (const pass of passes) {
      ctx.strokeStyle = pass.color;
      ctx.lineWidth = pass.lw;
      ctx.beginPath();
      for (const [a, b] of oniMesh.edges) {
        const pa = projected[a];
        const pb = projected[b];
        ctx.moveTo(pa[0] + pass.dx, pa[1] + pass.dy);
        ctx.lineTo(pb[0] + pass.dx, pb[1] + pass.dy);
      }
      ctx.stroke();
    }

    // Glowing Visor & Fang Fills
    ctx.fillStyle = 'rgba(255, 0, 85, 0.78)';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 24;
    for (const [a, b, c] of oniMesh.visorTriangles) {
      ctx.beginPath();
      ctx.moveTo(projected[a][0], projected[a][1]);
      ctx.lineTo(projected[b][0], projected[b][1]);
      ctx.lineTo(projected[c][0], projected[c][1]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Render Katana Slashes
    for (let i = slashes.length - 1; i >= 0; i -= 1) {
      const s = slashes[i];
      const age = t - s.born;
      if (age > 0.34) {
        slashes.splice(i, 1);
        continue;
      }
      const p = 1 - age / 0.34;
      const len = Math.max(width, height) * 1.25;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 10 * p;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * p;
      ctx.beginPath();
      ctx.moveTo(-len * 0.85, 0);
      ctx.lineTo(len * 0.85, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Render Sparks
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const sp = sparks[i];
      const age = t - sp.born;
      if (age > 0.42) {
        sparks.splice(i, 1);
        continue;
      }
      const p = 1 - age / 0.42;
      const x = sp.x + sp.vx * age;
      const y = sp.y + sp.vy * age;
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 2.4 * p;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - sp.vx * 0.035, y - sp.vy * 0.035);
      ctx.stroke();
    }
  }

  // --- SCENE 1: NIGHT CITY HYPER-WARP MEGASTRUCTURE TUNNEL ---
  function renderHyperWarp(t, cx, cy, scale) {
    const vanishX = cx + Math.sin(t * 2.1) * scale * 0.45 + pointerX * scale * 0.6;
    const vanishY = cy + Math.cos(t * 1.6) * scale * 0.32 + pointerY * scale * 0.5;

    // 32 Concentric Polygonal Megastructure Gates rushing toward camera
    const gateCount = 28;
    const speed = (t * 6.5) % 1;
    const prevGates = [];

    for (let i = gateCount; i >= 1; i -= 1) {
      const depth = i - speed;
      if (depth <= 0.18) continue;
      const fov = (scale * 3.1) / depth;
      const twist = depth * 0.14 - t * 1.2;
      const gx = vanishX + (cx - vanishX) * (1 / depth);
      const gy = vanishY + (cy - vanishY) * (1 / depth);

      const sides = i % 3 === 0 ? 4 : 8;
      const pts = [];
      for (let s = 0; s < sides; s += 1) {
        const a = (s / sides) * Math.PI * 2 + twist;
        const rx = Math.cos(a) * fov * (sides === 4 ? 1.15 : 1);
        const ry = Math.sin(a) * fov * 0.78;
        pts.push([gx + rx, gy + ry]);
      }

      const color =
        i % 4 === 0
          ? '#fcee09'
          : i % 3 === 0
            ? '#ff0055'
            : i % 2 === 0
              ? '#00f0ff'
              : '#b829ff';
      const alpha = Math.min(1, (gateCount - depth) / gateCount + 0.15);

      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.min(4.5, 9 / depth);
      ctx.beginPath();
      pts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      });
      ctx.closePath();
      ctx.stroke();

      // Connect longitudinal neon rails between octagon gates
      if (sides === 8 && prevGates.length === 8) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.32)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let s = 0; s < 8; s += 2) {
          ctx.moveTo(prevGates[s][0], prevGates[s][1]);
          ctx.lineTo(pts[s][0], pts[s][1]);
        }
        ctx.stroke();
      }
      if (sides === 8) {
        prevGates.length = 0;
        prevGates.push(...pts);
      }
    }
    ctx.globalAlpha = 1;

    // High-speed Neon Light Streaks
    for (const star of warpStars) {
      star.z -= 0.22;
      if (star.z <= 0.2) {
        star.z = 12;
        star.x = (Math.random() - 0.5) * 4;
        star.y = (Math.random() - 0.5) * 4;
      }
      const f1 = (scale * 2.2) / star.z;
      const f2 = (scale * 2.2) / (star.z + 0.65);
      const x1 = vanishX + star.x * f1;
      const y1 = vanishY + star.y * f1;
      const x2 = vanishX + star.x * f2;
      const y2 = vanishY + star.y * f2;

      ctx.strokeStyle = star.color;
      ctx.lineWidth = Math.min(4, 5 / star.z);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Center Fighter HUD Lock-On Reticle
    ctx.save();
    ctx.translate(vanishX, vanishY);
    ctx.rotate(-t * 2.4);
    ctx.strokeStyle = '#fcee09';
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -26, 52, 52);
    ctx.rotate(t * 4.8);
    ctx.strokeStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
  }

  // --- SCENE 2: BLACKWALL ROGUE AI SINGULARITY VORTEX ---
  function renderBlackwallVortex(t, cx, cy, scale) {
    // Background Red-Alert Fracture Waves
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.26)';
    ctx.lineWidth = 1.5;
    for (let row = -6; row <= 6; row += 1) {
      const yBase = cy + row * (height / 13);
      ctx.beginPath();
      for (let x = 0; x <= width; x += 28) {
        const wave =
          Math.sin(x * 0.018 + t * 8 + row) * 18 +
          (Math.random() < 0.08 ? (Math.random() - 0.5) * 45 : 0);
        if (x === 0) ctx.moveTo(x, yBase + wave);
        else ctx.lineTo(x, yBase + wave);
      }
      ctx.stroke();
    }

    // Swirling 3D Neural Tornado & Katakana/Hex Glyphs
    ctx.font = '900 14px "JetBrains Mono", monospace';
    const tiltX = 0.42 + pointerY * 0.35;
    const tiltY = pointerX * 0.45;

    for (const node of vortexNodes) {
      const a = node.angle + t * node.speed;
      const funnel = 0.25 + Math.abs(node.height) * 0.85;
      const r = node.radius * funnel;
      const vx = Math.cos(a) * r;
      const vz = Math.sin(a) * r;
      const vy = node.height + Math.sin(t * 3 + node.angle) * 0.12;

      const [rx, ry, rz] = rotate3D([vx, vy, vz], tiltX, tiltY, Math.sin(t * 0.7) * 0.18);
      const fov = 3.6 / (3.6 - rz);
      const sx = cx + rx * scale * fov;
      const sy = cy + ry * scale * fov;

      if (node.isGlyph) {
        ctx.fillStyle = node.color;
        ctx.fillText(node.glyph, sx, sy);
      } else {
        const tailA = a - 0.22;
        const [tx, ty, tz] = rotate3D(
          [Math.cos(tailA) * r, vy, Math.sin(tailA) * r],
          tiltX,
          tiltY,
          Math.sin(t * 0.7) * 0.18
        );
        const tfov = 3.6 / (3.6 - tz);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = Math.max(1.2, 2.6 * fov);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx + tx * scale * tfov, cy + ty * scale * tfov);
        ctx.stroke();
      }
    }

    // Central Gravitational Singularity Core
    const pulse = 1 + Math.sin(t * 16) * 0.16;
    const coreR = scale * 0.38 * pulse;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, coreR * 2.2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#ff0055');
    grad.addColorStop(0.65, 'rgba(0, 240, 255, 0.45)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#05040a';
    ctx.strokeStyle = '#fcee09';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // --- SCENE 3: 4D TESSERACT HYPERCUBE MELTDOWN & TESLA PLASMA ARCS ---
  function renderTesseractMeltdown(t, cx, cy, scale) {
    // 8 High-Voltage Jagged Plasma Arcs from viewport border to center
    const coilCount = 8;
    for (let c = 0; c < coilCount; c += 1) {
      const baseAngle = (c / coilCount) * Math.PI * 2 + t * 0.5;
      const outerR = Math.max(width, height) * 0.65;
      const ex = cx + Math.cos(baseAngle) * outerR;
      const ey = cy + Math.sin(baseAngle) * outerR;
      const ix = cx + Math.cos(baseAngle) * scale * 0.45;
      const iy = cy + Math.sin(baseAngle) * scale * 0.45;

      ctx.strokeStyle = c % 2 === 0 ? '#00f0ff' : '#ff0055';
      ctx.lineWidth = c % 2 === 0 ? 2.4 : 1.8;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      const segs = 12;
      for (let s = 1; s < segs; s += 1) {
        const u = s / segs;
        const px = ex + (ix - ex) * u + (Math.random() - 0.5) * 48 * (1 - u * 0.5);
        const py = ey + (iy - ey) * u + (Math.random() - 0.5) * 48 * (1 - u * 0.5);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(ix, iy);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 4D Rotation in XW, YW, ZW planes
    const aXW = t * 1.45;
    const aYW = t * 1.12;
    const aZW = t * 0.85;
    const rx3 = t * 0.9 + pointerY * 0.5;
    const ry3 = t * 1.2 + pointerX * 0.5;

    const projected = tesseract.verts4D.map((v4) => {
      let [x, y, z, w] = v4;
      // Rotate XW
      let nx = x * Math.cos(aXW) - w * Math.sin(aXW);
      let nw = x * Math.sin(aXW) + w * Math.cos(aXW);
      x = nx;
      w = nw;
      // Rotate YW
      let ny = y * Math.cos(aYW) - w * Math.sin(aYW);
      nw = y * Math.sin(aYW) + w * Math.cos(aYW);
      y = ny;
      w = nw;
      // Rotate ZW
      let nz = z * Math.cos(aZW) - w * Math.sin(aZW);
      nw = z * Math.sin(aZW) + w * Math.cos(aZW);
      z = nz;
      w = nw;

      // 4D -> 3D perspective
      const wDist = 2.65 / (2.65 - w);
      const p3 = rotate3D([x * wDist, y * wDist, z * wDist], rx3, ry3, t * 0.4);
      // 3D -> 2D perspective
      const zDist = 3.8 / (3.8 - p3[2]);
      return [
        cx + p3[0] * scale * 0.72 * zDist,
        cy + p3[1] * scale * 0.72 * zDist,
        w,
      ];
    });

    // Chromatic RGB Passes for 4D Tesseract Edges
    const passes = [
      { dx: -4, color: 'rgba(0, 240, 255, 0.78)', lw: 2 },
      { dx: 4, color: 'rgba(255, 0, 85, 0.78)', lw: 2 },
      { dx: 0, color: '#fcee09', lw: 2.4 },
    ];

    for (const pass of passes) {
      ctx.strokeStyle = pass.color;
      ctx.lineWidth = pass.lw;
      ctx.beginPath();
      for (const [i, j] of tesseract.edges) {
        ctx.moveTo(projected[i][0] + pass.dx, projected[i][1]);
        ctx.lineTo(projected[j][0] + pass.dx, projected[j][1]);
      }
      ctx.stroke();
    }

    // Glowing Vertex Nodes
    for (const [px, py, w] of projected) {
      ctx.fillStyle = w > 0 ? '#00f0ff' : '#ff0055';
      ctx.fillRect(px - 4, py - 4, 8, 8);
    }
  }

  // --- SCENE 4: SYNTHWAVE 2099 WIREFRAME CANYON & TWIN GLITCH SUN ---
  function renderSynthCanyon(t, cx, cy, scale) {
    const horizonY = cy - height * 0.06 + pointerY * 28;
    const sunX = cx + pointerX * 45;
    const sunY = horizonY - scale * 0.36;
    const sunR = scale * 0.85;

    // Giant Sliced Glitch Sun
    ctx.save();
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunGrad.addColorStop(0, '#fcee09');
    sunGrad.addColorStop(0.55, '#ff0055');
    sunGrad.addColorStop(1, '#7a00ff');
    ctx.fillStyle = sunGrad;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 42;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Horizontal cyberpunk cutouts across the lower half of the sun
    ctx.fillStyle = '#05040c';
    for (let s = 0; s < 8; s += 1) {
      const sliceY = sunY + s * (sunR * 0.13);
      const sliceH = 3 + s * 2.2;
      ctx.fillRect(sunX - sunR * 1.2, sliceY, sunR * 2.4, sliceH);
    }
    ctx.restore();

    // 3D Scrolling Wireframe Mountain Canyon
    const cols = 28;
    const rows = 20;
    const scroll = (t * 6.5) % 1;

    for (let r = rows; r >= 1; r -= 1) {
      const z = r - scroll;
      if (z <= 0.25) continue;
      const fov1 = (scale * 2.6) / z;
      const fov2 = (scale * 2.6) / (z + 1);

      ctx.strokeStyle = r % 2 === 0 ? '#00f0ff' : '#ff0055';
      ctx.lineWidth = Math.min(3, 5.2 / z);
      ctx.beginPath();

      for (let c = -cols / 2; c <= cols / 2; c += 1) {
        const worldZ = Math.floor(t * 6.5) + r;
        const canyonWall = Math.max(0, Math.abs(c) - 2.2);
        const h1 =
          Math.pow(canyonWall, 1.42) * 0.14 +
          Math.sin(worldZ * 0.45 + c * 0.8) * (canyonWall > 0 ? 0.32 : 0.04);

        const sx = sunX + c * 0.55 * fov1;
        const sy = horizonY + (1.25 - h1) * fov1;

        if (c === -cols / 2) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);

        // Longitudinal rib lines
        if (r < rows && c % 2 === 0) {
          const nextWorldZ = worldZ + 1;
          const h2 =
            Math.pow(canyonWall, 1.42) * 0.14 +
            Math.sin(nextWorldZ * 0.45 + c * 0.8) * (canyonWall > 0 ? 0.32 : 0.04);
          const nx = sunX + c * 0.55 * fov2;
          const ny = horizonY + (1.25 - h2) * fov2;
          ctx.moveTo(sx, sy);
          ctx.lineTo(nx, ny);
          ctx.moveTo(sx, sy);
        }
      }
      ctx.stroke();
    }

    // Lightning bolts striking canyon peaks
    if (Math.sin(t * 23) > 0.45) {
      const boltX = sunX + (Math.random() < 0.5 ? -1 : 1) * scale * (0.8 + Math.random() * 0.9);
      ctx.strokeStyle = '#fcee09';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = '#fcee09';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(boltX, 0);
      let bx = boltX;
      for (let y = 0; y < horizonY + 80; y += 28) {
        bx += (Math.random() - 0.5) * 44;
        ctx.lineTo(bx, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // Real-time Horizontal Slice Glitch Post-Processor
  function applyGlitchSlices(t) {
    const isExiting = container.classList.contains('is-exiting');
    const burst = isExiting || Math.sin(t * 17) > 0.62 || Math.random() < 0.24;
    if (!burst) return;

    const sliceCount = isExiting ? 9 : 4;
    for (let i = 0; i < sliceCount; i += 1) {
      const sy = Math.random() * height;
      const sh = 6 + Math.random() * 38;
      const shift = (Math.random() - 0.5) * (isExiting ? 90 : 36);
      ctx.drawImage(
        canvas,
        0,
        sy * dpr,
        width * dpr,
        sh * dpr,
        shift,
        sy,
        width,
        sh
      );

      if (Math.random() < 0.55) {
        ctx.fillStyle =
          Math.random() < 0.5
            ? 'rgba(0, 240, 255, 0.22)'
            : 'rgba(255, 0, 85, 0.24)';
        ctx.fillRect(0, sy, width, Math.min(8, sh * 0.35));
      }
    }
  }

  function frame(now) {
    if (stopped) return;
    const t = (now - startTime) * 0.001;

    // Motion trail clear
    ctx.fillStyle = 'rgba(5, 4, 12, 0.36)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.5;
    const scale = Math.min(width, height) * 0.28;

    if (sceneIndex === 0) {
      renderOniKatana(t, cx, cy, scale);
    } else if (sceneIndex === 1) {
      renderHyperWarp(t, cx, cy, scale);
    } else if (sceneIndex === 2) {
      renderBlackwallVortex(t, cx, cy, scale);
    } else if (sceneIndex === 3) {
      renderTesseractMeltdown(t, cx, cy, scale);
    } else {
      renderSynthCanyon(t, cx, cy, scale);
    }

    applyGlitchSlices(t);

    if (hexEl && Math.random() < 0.45) {
      const h1 = Math.floor((Math.sin(t * 13) * 0.5 + 0.5) * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0');
      const h2 = Math.floor((Math.cos(t * 19) * 0.5 + 0.5) * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0');
      hexEl.textContent = `0x${h1} // 0x${h2}`;
    }

    rafId = requestAnimationFrame(frame);
  }

  // Initial solid fill before first trail frame
  ctx.fillStyle = '#05040c';
  ctx.fillRect(0, 0, width, height);
  rafId = requestAnimationFrame(frame);

  return {
    getScene: () => CYBER_SCENES[sceneIndex],
    nextScene: () => {
      sceneIndex = (sceneIndex + 1) % CYBER_SCENES.length;
      ctx.fillStyle = '#05040c';
      ctx.fillRect(0, 0, width, height);
      updateHudMeta();
      return CYBER_SCENES[sceneIndex];
    },
    stop: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    },
  };
}
