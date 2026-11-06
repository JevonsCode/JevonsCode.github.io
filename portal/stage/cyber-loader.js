// Procedural Multi-Scene 3D Cyberpunk Cosmos Overdrive Canvas Loader
// Supports BOTH Fullscreen (`is-fullscreen`) and Regional Stage (`is-regional` / `is-compact`) modes.
// Features crazy Cyberpunk Cosmic phenomena: Three-Body Chaos, Gargantua Black Hole & Quasar Jets,
// Cyber Meteor Apocalypse & Planetary Shield, Ringed Gas Giant & Moons, Magnetar Supernova,
// Dyson Swarm Megastructure, Colliding Spiral Galaxies, and Oni Katana Star-Warp.

const DECK_KEY = 'ydys.cyber.cosmos.deck.v3';
const LAST_KEY = 'ydys.cyber.cosmos.last.v3';

export const CYBER_SCENES = [
  {
    id: 'three-body-chaos',
    code: '0x01 // THREE_BODY_CHAOS',
    sub: 'TRISOLARAN_GRAVITY_SYZYGY // ORBITAL_COLLAPSE',
    accent: '#ff0055',
    secondary: '#00f0ff',
  },
  {
    id: 'gargantua-quasar',
    code: '0x02 // GARGANTUA_QUASAR_HOLE',
    sub: 'RELATIVISTIC_ACCRETION_DISK // GAMMA_JETS',
    accent: '#fcee09',
    secondary: '#ff0055',
  },
  {
    id: 'meteor-apocalypse',
    code: '0x03 // CYBER_METEOR_STORM',
    sub: 'BOLIDE_SWARM_IMPACT // PLANETARY_SHIELD_BREACH',
    accent: '#00f0ff',
    secondary: '#fcee09',
  },
  {
    id: 'ringed-gas-giant',
    code: '0x04 // RINGED_EXOPLANET_X9',
    sub: '4X_ASTEROID_RINGS // ORBITAL_MOON_LASERS',
    accent: '#b829ff',
    secondary: '#00f0ff',
  },
  {
    id: 'magnetar-supernova',
    code: '0x05 // MAGNETAR_SUPERNOVA',
    sub: '1000HZ_PULSAR_BEAMS // SHOCKWAVE_SHELLS',
    accent: '#00ff66',
    secondary: '#ff0055',
  },
  {
    id: 'dyson-swarm',
    code: '0x06 // DYSON_SWARM_CORE',
    sub: 'STELLAR_CAGE_HARVESTER // SOLAR_FLARE_ARCS',
    accent: '#fcee09',
    secondary: '#00f0ff',
  },
  {
    id: 'galactic-collision',
    code: '0x07 // GALACTIC_COLLISION',
    sub: 'TWIN_SPIRAL_TIDAL_CRASH // STARBURST_NOVA',
    accent: '#ff0055',
    secondary: '#00f0ff',
  },
  {
    id: 'oni-star-warp',
    code: '0x08 // ONI_KATANA_STARWARP',
    sub: 'MECHA_SAMURAI_MASK // HYPERDRIVE_BLADES',
    accent: '#00f0ff',
    secondary: '#ff0055',
  },
];

export function pickNextCyberSceneIndex(excludeIndex = -1) {
  const total = CYBER_SCENES.length;
  let last = excludeIndex;
  let deck = [];

  try {
    if (last < 0) {
      const rawLast = sessionStorage.getItem(LAST_KEY);
      if (rawLast !== null) last = parseInt(rawLast, 10);
    }
    const rawDeck = sessionStorage.getItem(DECK_KEY);
    if (rawDeck) {
      const parsed = JSON.parse(rawDeck);
      if (Array.isArray(parsed)) {
        deck = parsed.filter((n) => Number.isInteger(n) && n >= 0 && n < total);
      }
    }
  } catch {
    // Ignore storage errors
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

  let chosen = deck.shift();
  if (chosen === excludeIndex && deck.length > 0) {
    const next = deck.shift();
    deck.push(chosen);
    chosen = next;
  }

  try {
    sessionStorage.setItem(LAST_KEY, String(chosen));
    sessionStorage.setItem(DECK_KEY, JSON.stringify(deck));
  } catch {
    // Ignore storage errors
  }

  return chosen;
}

function rotate3D(pt, rx, ry, rz) {
  let [x, y, z] = pt;
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  x = x1;
  z = z1;

  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y2 = y * cx - z * sx;
  const z2 = y * sx + z * cx;
  y = y2;
  z = z2;

  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  const x3 = x * cz - y * sz;
  const y3 = x * sz + y * cz;
  return [x3, y3, z];
}

function createOniMesh() {
  const verts = [
    [0, -1.15, 0.35], [-0.55, -0.95, 0.25], [0.55, -0.95, 0.25],
    [-1.15, -1.85, -0.15], [1.15, -1.85, -0.15], [-0.32, -1.35, 0.15],
    [0.32, -1.35, 0.15], [0, -1.55, 0.05], [0, -0.45, 0.72],
    [-0.48, -0.52, 0.62], [0.48, -0.52, 0.62], [-0.95, -0.32, 0.28],
    [0.95, -0.32, 0.28], [-0.22, -0.22, 0.76], [0.22, -0.22, 0.76],
    [0, -0.1, 0.88], [-0.88, 0.28, 0.35], [0.88, 0.28, 0.35],
    [-0.58, 0.45, 0.68], [0.58, 0.45, 0.68], [-0.42, 0.88, 0.78],
    [0.42, 0.88, 0.78], [0, 0.52, 0.82], [-0.36, 1.12, 0.48],
    [0.36, 1.12, 0.48], [0, 1.28, 0.56], [-1.18, -0.65, -0.45],
    [1.18, -0.65, -0.45], [-0.92, 0.65, -0.38], [0.92, 0.65, -0.38],
  ];
  const edges = [
    [0, 1], [0, 2], [0, 7], [1, 5], [2, 6], [5, 7], [6, 7],
    [1, 3], [5, 3], [2, 4], [6, 4], [3, 26], [4, 27],
    [0, 8], [1, 9], [2, 10], [8, 9], [8, 10], [9, 11], [10, 12],
    [9, 13], [10, 14], [13, 11], [14, 12], [13, 15], [14, 15], [8, 15],
    [11, 16], [12, 17], [13, 18], [14, 19], [15, 22],
    [16, 18], [17, 19], [18, 22], [19, 22],
    [18, 20], [22, 20], [19, 21], [22, 21],
    [16, 23], [17, 24], [20, 23], [21, 24], [23, 25], [24, 25], [22, 25],
    [11, 26], [12, 27], [16, 28], [17, 29], [26, 28], [27, 29], [23, 28], [24, 29],
  ];
  const visorTriangles = [
    [9, 11, 13], [10, 12, 14], [18, 20, 22], [19, 21, 22],
  ];
  return { verts, edges, visorTriangles };
}

// Helper to draw a 3D wireframe sphere / planet
function drawWireSphere(ctx, cx, cy, radius, rx, ry, rz, latLines, lonLines, color, lineWidth = 1.4) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  // Latitude rings
  for (let i = 1; i < latLines; i += 1) {
    const phi = (i / latLines) * Math.PI;
    const y0 = Math.cos(phi);
    const r0 = Math.sin(phi);
    const steps = 28;
    for (let s = 0; s <= steps; s += 1) {
      const theta = (s / steps) * Math.PI * 2;
      const [x, y, z] = rotate3D([r0 * Math.cos(theta), y0, r0 * Math.sin(theta)], rx, ry, rz);
      const fov = 3.6 / (3.6 - z * 0.65);
      const sx = cx + x * radius * fov;
      const sy = cy + y * radius * fov;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
  }

  // Longitude meridians
  for (let j = 0; j < lonLines; j += 1) {
    const theta = (j / lonLines) * Math.PI * 2;
    const steps = 28;
    for (let s = 0; s <= steps; s += 1) {
      const phi = (s / steps) * Math.PI;
      const [x, y, z] = rotate3D(
        [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)],
        rx,
        ry,
        rz
      );
      const fov = 3.6 / (3.6 - z * 0.65);
      const sx = cx + x * radius * fov;
      const sy = cy + y * radius * fov;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
  }
  ctx.stroke();
}

export function mountCyberLoader(container, options = {}) {
  if (!container) return { stop: () => {}, nextScene: () => {}, getSceneIndex: () => 0 };

  const canvas = container.querySelector('.cyber-stage-canvas');
  const codeEl = container.querySelector('.cyber-hud-code');
  const subEl = container.querySelector('.cyber-hud-sub');
  const hexEl = container.querySelector('.cyber-hud-hex');
  if (!canvas) return { stop: () => {}, nextScene: () => {}, getSceneIndex: () => 0 };

  const ctx = canvas.getContext('2d');
  let sceneIndex =
    typeof options.sceneIndex === 'number'
      ? options.sceneIndex
      : pickNextCyberSceneIndex(options.excludeIndex ?? -1);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let stopped = false;
  const startTime = performance.now();

  let pointerX = 0;
  let pointerY = 0;

  // --- Shared & Per-Scene State ---
  const bgStars = Array.from({ length: 140 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: 0.8 + Math.random() * 2.2,
    blink: Math.random() * Math.PI * 2,
    color: ['#00f0ff', '#ff0055', '#fcee09', '#ffffff'][Math.floor(Math.random() * 4)],
  }));

  // Scene 0: Three-Body Chaotic Gravitational System (3 Suns + 1 Trisolaris Planet)
  const threeBodies = [
    { x: -0.95, y: -0.45, z: 0.2, vx: 0.45, vy: -0.68, vz: 0.35, m: 1.35, color: '#00f0ff', r: 0.26, trail: [] },
    { x: 0.98, y: 0.35, z: -0.25, vx: -0.52, vy: 0.58, vz: -0.28, m: 1.42, color: '#ff0055', r: 0.28, trail: [] },
    { x: 0.05, y: 0.85, z: 0.35, vx: 0.12, vy: -0.15, vz: -0.48, m: 1.28, color: '#fcee09', r: 0.24, trail: [] },
  ];
  const trisolaris = {
    x: 0.18,
    y: -0.12,
    z: 0,
    vx: -0.82,
    vy: 0.64,
    vz: 0.52,
    trail: [],
    shockwaves: [],
  };

  // Scene 1: Gargantua Black Hole Accretion Disk Particles
  const accretionDisk = Array.from({ length: 340 }, (_, i) => ({
    radius: 0.52 + Math.pow(Math.random(), 1.5) * 2.15,
    angle: Math.random() * Math.PI * 2,
    speed: 1.8 + Math.random() * 3.8,
    yOffset: (Math.random() - 0.5) * 0.08,
    color: i % 3 === 0 ? '#ff0055' : i % 3 === 1 ? '#fcee09' : '#00f0ff',
  }));

  // Scene 2: Crazy Cyber Meteor Shower Swarm & Impact Explosions
  const meteors = Array.from({ length: 56 }, () => ({
    x: (Math.random() - 0.2) * 2.6,
    y: (Math.random() - 0.8) * 2.6,
    z: Math.random() * 3 + 0.3,
    speed: 1.8 + Math.random() * 2.8,
    len: 0.28 + Math.random() * 0.55,
    color: ['#00f0ff', '#ff0055', '#fcee09', '#00ff66', '#b829ff'][Math.floor(Math.random() * 5)],
    width: 1.5 + Math.random() * 3.2,
  }));
  const shieldImpacts = [];

  // Scene 3: Ringed Exoplanet Asteroid Particles & Moons
  const ringAsteroids = Array.from({ length: 280 }, (_, i) => {
    const band = i % 3;
    const baseR = band === 0 ? 1.35 : band === 1 ? 1.78 : 2.22;
    return {
      r: baseR + (Math.random() - 0.5) * 0.22,
      a: Math.random() * Math.PI * 2,
      spd: (band % 2 === 0 ? 1 : -1) * (0.65 + (2.5 - baseR) * 0.55),
      color: band === 0 ? '#00f0ff' : band === 1 ? '#ff0055' : '#fcee09',
      size: 1.2 + Math.random() * 2.6,
    };
  });

  // Scene 6: Colliding Twin Spiral Galaxies
  const galaxyStars = Array.from({ length: 380 }, (_, i) => {
    const galaxy = i < 190 ? 0 : 1;
    const arm = i % 3;
    const dist = 0.08 + Math.pow(Math.random(), 1.25) * 1.45;
    const angle = dist * 4.2 + (arm * Math.PI * 2) / 3 + (Math.random() - 0.5) * 0.45;
    return {
      galaxy,
      dist,
      angle,
      z: (Math.random() - 0.5) * 0.16,
      color:
        galaxy === 0
          ? i % 4 === 0
            ? '#ffffff'
            : '#00f0ff'
          : i % 4 === 0
            ? '#fcee09'
            : '#ff0055',
    };
  });

  // Scene 7: Oni Mesh & Slashes
  const oniMesh = createOniMesh();
  const slashes = [];
  let lastSlashAt = 0;

  function updateHudMeta() {
    const meta = CYBER_SCENES[sceneIndex] || CYBER_SCENES[0];
    container.dataset.cyberScene = meta.id;
    if (codeEl) codeEl.textContent = meta.code;
    if (subEl) subEl.textContent = meta.sub;
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(280, rect.width || window.innerWidth);
    height = Math.max(220, rect.height || window.innerHeight);
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

  function drawStarfield(t) {
    for (const st of bgStars) {
      const alpha = 0.25 + 0.75 * Math.abs(Math.sin(t * 3.5 + st.blink));
      ctx.fillStyle = st.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(st.x * width, st.y * height, st.size, st.size);
    }
    ctx.globalAlpha = 1;
  }

  // =========================================================================
  // SCENE 0: THREE-BODY CHAOS (疯狂赛博三体运动 & 行星撕裂)
  // =========================================================================
  function renderThreeBodyChaos(t, cx, cy, scale) {
    drawStarfield(t);

    // Step chaotic N-body gravitational physics (sub-stepped for fierce whips)
    const dt = 0.016;
    const G = 1.95;
    for (let step = 0; step < 3; step += 1) {
      for (let i = 0; i < 3; i += 1) {
        let ax = -threeBodies[i].x * 0.85; // Central containment well so suns never escape screen
        let ay = -threeBodies[i].y * 0.85;
        let az = -threeBodies[i].z * 0.85;
        for (let j = 0; j < 3; j += 1) {
          if (i === j) continue;
          const dx = threeBodies[j].x - threeBodies[i].x;
          const dy = threeBodies[j].y - threeBodies[i].y;
          const dz = threeBodies[j].z - threeBodies[i].z;
          const distSq = dx * dx + dy * dy + dz * dz + 0.14;
          const dist = Math.sqrt(distSq);
          const f = (G * threeBodies[j].m) / distSq;
          ax += (dx / dist) * f;
          ay += (dy / dist) * f;
          az += (dz / dist) * f;
        }
        threeBodies[i].vx = (threeBodies[i].vx + ax * dt) * 0.996;
        threeBodies[i].vy = (threeBodies[i].vy + ay * dt) * 0.996;
        threeBodies[i].vz = (threeBodies[i].vz + az * dt) * 0.996;
      }

      for (const b of threeBodies) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
      }

      // Trisolaris planet whipped by all 3 suns
      let pax = -trisolaris.x * 1.1;
      let pay = -trisolaris.y * 1.1;
      let paz = -trisolaris.z * 1.1;
      for (const b of threeBodies) {
        const dx = b.x - trisolaris.x;
        const dy = b.y - trisolaris.y;
        const dz = b.z - trisolaris.z;
        const distSq = dx * dx + dy * dy + dz * dz + 0.09;
        const dist = Math.sqrt(distSq);
        const f = (G * b.m * 1.25) / distSq;
        pax += (dx / dist) * f;
        pay += (dy / dist) * f;
        paz += (dz / dist) * f;
      }
      trisolaris.vx = Math.max(-3.4, Math.min(3.4, (trisolaris.vx + pax * dt) * 0.992));
      trisolaris.vy = Math.max(-3.4, Math.min(3.4, (trisolaris.vy + pay * dt) * 0.992));
      trisolaris.vz = Math.max(-3.4, Math.min(3.4, (trisolaris.vz + paz * dt) * 0.992));
      trisolaris.x += trisolaris.vx * dt;
      trisolaris.y += trisolaris.vy * dt;
      trisolaris.z += trisolaris.vz * dt;
    }

    const camRx = pointerY * 0.45 + Math.sin(t * 0.6) * 0.2;
    const camRy = pointerX * 0.45 + t * 0.35;

    const project = (pt) => {
      const [x, y, z] = rotate3D(pt, camRx, camRy, 0);
      const fov = 3.8 / (3.8 - z);
      return [cx + x * scale * fov, cy + y * scale * fov, fov, z];
    };

    // Record orbital ribbon trails
    for (const b of threeBodies) {
      b.trail.push([b.x, b.y, b.z]);
      if (b.trail.length > 55) b.trail.shift();
    }
    trisolaris.trail.push([trisolaris.x, trisolaris.y, trisolaris.z]);
    if (trisolaris.trail.length > 75) trisolaris.trail.shift();

    // Draw Gravitational Tension Triangle & Plasma Bridges between the 3 Suns
    const sunScreen = threeBodies.map((b) => project([b.x, b.y, b.z]));
    ctx.strokeStyle = 'rgba(252, 238, 9, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(sunScreen[0][0], sunScreen[0][1]);
    ctx.lineTo(sunScreen[1][0], sunScreen[1][1]);
    ctx.lineTo(sunScreen[2][0], sunScreen[2][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Blazing Sun Trails
    for (const b of threeBodies) {
      if (b.trail.length < 2) continue;
      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      b.trail.forEach((pt, idx) => {
        const [sx, sy] = project(pt);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Trisolaris Chaotic Planet Trail
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trisolaris.trail.forEach((pt, idx) => {
      const [sx, sy] = project(pt);
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Draw the 3 Cyber Suns (Wireframe + Glowing Corona)
    threeBodies.forEach((b, idx) => {
      const [sx, sy, fov] = sunScreen[idx];
      const sr = scale * b.r * fov;
      const grad = ctx.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr * 2.1);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, b.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 2.1, 0, Math.PI * 2);
      ctx.fill();

      drawWireSphere(ctx, sx, sy, sr * 0.85, t * 2 + idx, t * 1.5, 0, 5, 6, '#ffffff', 1.4);
    });

    // Draw Trisolaris Cyber-Planet & Tidal Lightning to Nearest Sun
    const [px, py, pfov] = project([trisolaris.x, trisolaris.y, trisolaris.z]);
    const pr = scale * 0.13 * pfov;
    drawWireSphere(ctx, px, py, pr, -t * 4, t * 3, 0, 5, 6, '#00ff66', 1.8);

    // Jagged gravitational lightning from suns to Trisolaris
    for (let i = 0; i < 3; i += 1) {
      const [sx, sy] = sunScreen[i];
      const dist = Math.hypot(sx - px, sy - py);
      if (dist < scale * 1.45) {
        ctx.strokeStyle = threeBodies[i].color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        for (let s = 1; s < 7; s += 1) {
          const u = s / 7;
          ctx.lineTo(
            sx + (px - sx) * u + (Math.random() - 0.5) * 26,
            sy + (py - sy) * u + (Math.random() - 0.5) * 26
          );
        }
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }
  }

  // =========================================================================
  // SCENE 1: GARGANTUA QUASAR BLACK HOLE (巨型赛博黑洞 & 相对论双极喷流)
  // =========================================================================
  function renderGargantuaQuasar(t, cx, cy, scale) {
    drawStarfield(t);

    const tiltX = 1.18 + pointerY * 0.25;
    const tiltZ = -0.32 + pointerX * 0.25;
    const bhRadius = scale * 0.46;

    // Relativistic Quasar Gamma-Ray Jets shooting from North & South poles
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tiltZ);
    const jetLen = Math.max(width, height) * 0.85;
    for (const dir of [-1, 1]) {
      const jetGrad = ctx.createLinearGradient(0, 0, 0, dir * jetLen);
      jetGrad.addColorStop(0, '#ffffff');
      jetGrad.addColorStop(0.18, '#00f0ff');
      jetGrad.addColorStop(0.55, 'rgba(255, 0, 85, 0.55)');
      jetGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(-bhRadius * 0.22, 0);
      ctx.lineTo(-bhRadius * 1.35, dir * jetLen);
      ctx.lineTo(bhRadius * 1.35, dir * jetLen);
      ctx.lineTo(bhRadius * 0.22, 0);
      ctx.closePath();
      ctx.fill();

      // Helical lightning spiraling up the Quasar Jet
      ctx.strokeStyle = '#fcee09';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 0; y <= jetLen; y += 18) {
        const wave = Math.sin(y * 0.04 - t * 18) * (12 + y * 0.08);
        if (y === 0) ctx.moveTo(wave, dir * y);
        else ctx.lineTo(wave, dir * y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Gravitational Lensing Upper & Lower Halo Rings (Interstellar Gargantua style)
    for (let ring = 1; ring <= 5; ring += 1) {
      const r = bhRadius * (1.08 + ring * 0.14);
      ctx.strokeStyle = ring % 2 === 0 ? '#00f0ff' : '#ff0055';
      ctx.lineWidth = 2.6 - ring * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3D Swirling Relativistic Accretion Disk (with gravitational lensing warp for back-half particles)
    for (const p of accretionDisk) {
      const a = p.angle + t * (p.speed / p.radius);
      const x0 = Math.cos(a) * p.radius;
      const z0 = Math.sin(a) * p.radius;
      const y0 = p.yOffset;

      let [rx, ry, rz] = rotate3D([x0, y0, z0], tiltX, 0, tiltZ);
      // Gravitational lensing: bend back-side disk particles upward & downward around the shadow!
      if (rz < 0) {
        const bend = Math.exp(-Math.abs(rx) * 1.2) * 0.65;
        ry += (ry >= 0 ? 1 : -1) * bend;
      }

      const fov = 3.8 / (3.8 - rz * 0.55);
      const sx = cx + rx * scale * fov;
      const sy = cy + ry * scale * fov;

      const tailA = a - 0.16;
      let [tx, ty, tz] = rotate3D(
        [Math.cos(tailA) * p.radius, y0, Math.sin(tailA) * p.radius],
        tiltX,
        0,
        tiltZ
      );
      if (tz < 0) {
        const bend = Math.exp(-Math.abs(tx) * 1.2) * 0.65;
        ty += (ty >= 0 ? 1 : -1) * bend;
      }
      const tfov = 3.8 / (3.8 - tz * 0.55);

      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.4, 3.2 * fov);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(cx + tx * scale * tfov, cy + ty * scale * tfov);
      ctx.stroke();
    }

    // Event Horizon Abyss Core + Photon Sphere Ring
    ctx.fillStyle = '#030208';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 36;
    ctx.beginPath();
    ctx.arc(cx, cy, bhRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fcee09';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, bhRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // =========================================================================
  // SCENE 2: CYBER METEOR APOCALYPSE (狂暴赛博流星雨火风暴 & 行星护盾撞击)
  // =========================================================================
  function renderMeteorApocalypse(t, cx, cy, scale) {
    drawStarfield(t);

    // Target Cyber-Planet in lower-right quadrant with Hexagonal Geodesic Shield
    const planetX = cx + scale * 0.62 + pointerX * 30;
    const planetY = cy + scale * 0.34 + pointerY * 25;
    const planetR = scale * 0.68;

    drawWireSphere(ctx, planetX, planetY, planetR, t * 0.8, -t * 1.2, 0.3, 8, 10, '#00f0ff', 1.5);
    drawWireSphere(
      ctx,
      planetX - 4,
      planetY,
      planetR,
      t * 0.8,
      -t * 1.2,
      0.3,
      8,
      10,
      'rgba(255, 0, 85, 0.55)',
      1.2
    );

    // Hyper-Velocity Diagonal Meteor Swarm
    const dirX = 0.78;
    const dirY = 0.62;

    for (const m of meteors) {
      m.x += dirX * m.speed * 0.024;
      m.y += dirY * m.speed * 0.024;

      const sx = cx + m.x * scale * 1.6;
      const sy = cy + m.y * scale * 1.6;

      // Check impact against Planetary Shield!
      const distToPlanet = Math.hypot(sx - planetX, sy - planetY);
      if (distToPlanet < planetR * 1.08) {
        shieldImpacts.push({
          x: sx,
          y: sy,
          color: m.color,
          born: t,
        });
        m.x = -1.8 + (Math.random() - 0.5) * 1.6;
        m.y = -1.6 + (Math.random() - 0.5) * 1.4;
        continue;
      }

      if (sx > width + 200 || sy > height + 200) {
        m.x = -1.8 + (Math.random() - 0.5) * 2.2;
        m.y = -1.6 + (Math.random() - 0.5) * 1.8;
      }

      const tailLen = m.len * scale * 1.35;
      const tx = sx - dirX * tailLen;
      const ty = sy - dirY * tailLen;

      const grad = ctx.createLinearGradient(sx, sy, tx, ty);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, m.color);
      grad.addColorStop(1, 'transparent');

      ctx.strokeStyle = grad;
      ctx.lineWidth = m.width;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Glowing Meteor Bolide Head
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(sx, sy, m.width * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Render Planetary Shield Impact Shockwaves & Shatter Shards
    for (let i = shieldImpacts.length - 1; i >= 0; i -= 1) {
      const imp = shieldImpacts[i];
      const age = t - imp.born;
      if (age > 0.42) {
        shieldImpacts.splice(i, 1);
        continue;
      }
      const p = 1 - age / 0.42;
      const ringR = (1 - p) * scale * 0.55 + 8;
      ctx.strokeStyle = imp.color;
      ctx.lineWidth = 3.2 * p;
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Hexagonal shield flash at impact point
      ctx.strokeStyle = '#fcee09';
      ctx.lineWidth = 2 * p;
      ctx.beginPath();
      for (let s = 0; s < 6; s += 1) {
        const a = (s / 6) * Math.PI * 2 + age * 6;
        const hx = imp.x + Math.cos(a) * ringR * 0.65;
        const hy = imp.y + Math.sin(a) * ringR * 0.65;
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // =========================================================================
  // SCENE 3: RINGED GAS GIANT EXOPLANET & MOONS (超级巨行星四重星环 & 卫星群)
  // =========================================================================
  function renderRingedGasGiant(t, cx, cy, scale) {
    drawStarfield(t);

    const rx = 1.05 + pointerY * 0.35;
    const ry = t * 0.55 + pointerX * 0.45;
    const rz = -0.38;
    const planetR = scale * 0.68;

    // Chromatic RGB Wireframe Gas Giant Planet
    drawWireSphere(ctx, cx - 4, cy, planetR, rx, ry, rz, 9, 12, 'rgba(0, 240, 255, 0.72)', 1.5);
    drawWireSphere(ctx, cx + 4, cy, planetR, rx, ry, rz, 9, 12, 'rgba(255, 0, 85, 0.72)', 1.5);
    drawWireSphere(ctx, cx, cy, planetR, rx, ry, rz, 9, 12, '#fcee09', 1.8);

    // 4 Concentric Counter-Rotating Asteroid Rings
    for (const ast of ringAsteroids) {
      const a = ast.a + t * ast.spd;
      const [x, y, z] = rotate3D([Math.cos(a) * ast.r, 0, Math.sin(a) * ast.r], rx, 0, rz);
      const fov = 3.8 / (3.8 - z * 0.5);
      const sx = cx + x * scale * fov;
      const sy = cy + y * scale * fov;

      ctx.fillStyle = ast.color;
      ctx.fillRect(sx - ast.size * 0.5, sy - ast.size * 0.5, ast.size, ast.size);
    }

    // 4 Orbiting Cyber-Moons firing telemetry lasers to the Gas Giant
    for (let m = 0; m < 4; m += 1) {
      const orbitR = 1.55 + m * 0.38;
      const ma = t * (1.4 - m * 0.22) + m * 1.7;
      const [mx, my, mz] = rotate3D(
        [Math.cos(ma) * orbitR, Math.sin(ma * 2) * 0.28, Math.sin(ma) * orbitR],
        rx,
        0,
        rz
      );
      const fov = 3.8 / (3.8 - mz * 0.5);
      const sx = cx + mx * scale * fov;
      const sy = cy + my * scale * fov;
      const mr = (12 + m * 3) * fov;

      ctx.strokeStyle = m % 2 === 0 ? '#00f0ff' : '#ff0055';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, mr, 0, Math.PI * 2);
      ctx.stroke();

      // Orbital laser lock to planet core
      if (Math.sin(t * 9 + m * 2) > 0.1) {
        ctx.strokeStyle = 'rgba(252, 238, 9, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
    }
  }

  // =========================================================================
  // SCENE 4: MAGNETAR SUPERNOVA COLLAPSE (千赫兹脉冲磁星 & 超新星冲击波壳层)
  // =========================================================================
  function renderMagnetarSupernova(t, cx, cy, scale) {
    drawStarfield(t);

    // Dual Lighthouse Relativistic Pulsar Beams sweeping at high speed
    const beamAngle = t * 5.8;
    const beamLen = Math.max(width, height) * 0.95;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(beamAngle);
    for (const dir of [-1, 1]) {
      const grad = ctx.createLinearGradient(0, 0, dir * beamLen, 0);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#00ff66');
      grad.addColorStop(0.6, 'rgba(0, 240, 255, 0.45)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(dir * beamLen, -beamLen * 0.22);
      ctx.lineTo(dir * beamLen, beamLen * 0.22);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Expanding 3D Supernova Remnant Shockwave Shells
    for (let s = 0; s < 3; s += 1) {
      const phase = ((t * 0.85 + s / 3) % 1);
      const shellR = (0.28 + phase * 1.65) * scale;
      const color = s === 0 ? '#ff0055' : s === 1 ? '#00f0ff' : '#fcee09';
      ctx.globalAlpha = 1 - phase * 0.78;
      drawWireSphere(
        ctx,
        cx,
        cy,
        shellR,
        t * (1.2 + s * 0.4) + pointerY * 0.5,
        t * (1.5 - s * 0.3) + pointerX * 0.5,
        s,
        6,
        8,
        color,
        2.2 * (1 - phase * 0.5)
      );
    }
    ctx.globalAlpha = 1;

    // Intense Magnetar Core
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 38;
    ctx.beginPath();
    ctx.arc(cx, cy, scale * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // =========================================================================
  // SCENE 5: DYSON SWARM MEGASPHERE (赛博戴森球恒星反应堆 & 日冕耀斑电弧)
  // =========================================================================
  function renderDysonSwarm(t, cx, cy, scale) {
    drawStarfield(t);

    // Central Raging Cyber-Sun
    const sunR = scale * 0.46;
    const sunGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, sunR * 1.8);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.35, '#fcee09');
    sunGrad.addColorStop(0.7, '#ff0055');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, sunR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 6 Interlocking 3D Dyson Gimbal Megastructure Rings
    for (let ring = 0; ring < 6; ring += 1) {
      const r = scale * (0.72 + ring * 0.19);
      const rx = t * (0.8 + ring * 0.22) * (ring % 2 === 0 ? 1 : -1) + pointerY * 0.5;
      const ry = t * (0.65 + ring * 0.18) + pointerX * 0.5;
      const rz = ring * 0.52;

      ctx.strokeStyle = ring % 3 === 0 ? '#00f0ff' : ring % 3 === 1 ? '#fcee09' : '#ff0055';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      const segs = 32;
      for (let s = 0; s <= segs; s += 1) {
        const a = (s / segs) * Math.PI * 2;
        const [x, y, z] = rotate3D([Math.cos(a), Math.sin(a), 0], rx, ry, rz);
        const fov = 3.8 / (3.8 - z * 0.6);
        const sx = cx + x * r * fov;
        const sy = cy + y * r * fov;
        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);

        // Energy harvester nodes along ring
        if (s % 4 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
        }
      }
      ctx.stroke();
    }
  }

  // =========================================================================
  // SCENE 6: GALACTIC COLLISION SPIRAL (双星系碰撞引力潮汐涡旋)
  // =========================================================================
  function renderGalacticCollision(t, cx, cy, scale) {
    // Two Galaxy Centers orbiting and colliding in 3D
    const sep = 0.58 * Math.cos(t * 0.95);
    const gCenters = [
      [-sep, -0.22 * Math.sin(t * 0.95), 0],
      [sep, 0.22 * Math.sin(t * 0.95), 0],
    ];

    const rx = 0.78 + pointerY * 0.35;
    const ry = pointerX * 0.45 + Math.sin(t * 0.5) * 0.25;

    for (const st of galaxyStars) {
      const gc = gCenters[st.galaxy];
      const spin = st.angle + t * (1.4 / (st.dist + 0.25)) * (st.galaxy === 0 ? 1 : -1);
      const px = gc[0] + Math.cos(spin) * st.dist;
      const py = gc[1] + st.z;
      const pz = gc[2] + Math.sin(spin) * st.dist;

      const [x, y, z] = rotate3D([px, py, pz], rx, ry, t * 0.22);
      const fov = 3.8 / (3.8 - z * 0.65);
      const sx = cx + x * scale * fov;
      const sy = cy + y * scale * fov;

      const tailSpin = spin - 0.14 * (st.galaxy === 0 ? 1 : -1);
      const [tx, ty, tz] = rotate3D(
        [gc[0] + Math.cos(tailSpin) * st.dist, py, gc[2] + Math.sin(tailSpin) * st.dist],
        rx,
        ry,
        t * 0.22
      );
      const tfov = 3.8 / (3.8 - tz * 0.65);

      ctx.strokeStyle = st.color;
      ctx.lineWidth = Math.max(1.3, 2.8 * fov);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(cx + tx * scale * tfov, cy + ty * scale * tfov);
      ctx.stroke();
    }

    // Glowing Galactic Nuclei & Tidal Bridge
    const n0 = rotate3D(gCenters[0], rx, ry, t * 0.22);
    const n1 = rotate3D(gCenters[1], rx, ry, t * 0.22);
    const s0 = [cx + n0[0] * scale, cy + n0[1] * scale];
    const s1 = [cx + n1[0] * scale, cy + n1[1] * scale];

    ctx.strokeStyle = '#fcee09';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(s0[0], s0[1]);
    for (let i = 1; i < 8; i += 1) {
      const u = i / 8;
      ctx.lineTo(
        s0[0] + (s1[0] - s0[0]) * u + (Math.random() - 0.5) * 32,
        s0[1] + (s1[1] - s0[1]) * u + (Math.random() - 0.5) * 32
      );
    }
    ctx.lineTo(s1[0], s1[1]);
    ctx.stroke();

    for (const [idx, sc] of [s0, s1].entries()) {
      ctx.fillStyle = idx === 0 ? '#00f0ff' : '#ff0055';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 32;
      ctx.beginPath();
      ctx.arc(sc[0], sc[1], scale * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // =========================================================================
  // SCENE 7: ONI KATANA STAR-WARP (赛博鬼面武士 & 星际折跃刀光)
  // =========================================================================
  function renderOniStarWarp(t, cx, cy, scale) {
    drawStarfield(t);

    if (t - lastSlashAt > 0.24) {
      lastSlashAt = t;
      slashes.push({
        x: cx + (Math.random() - 0.5) * width * 0.35,
        y: cy + (Math.random() - 0.5) * height * 0.35,
        angle: (Math.random() - 0.5) * 1.5 + (Math.random() < 0.5 ? 0.45 : -0.45),
        born: t,
        color: Math.random() < 0.5 ? '#00f0ff' : '#ff0055',
      });
    }

    const ry = Math.sin(t * 1.9) * 0.58 + pointerX * 0.55;
    const rx = Math.cos(t * 1.4) * 0.24 + pointerY * 0.38;
    const projected = oniMesh.verts.map((v) => {
      const [x, y, z] = rotate3D(v, rx, ry, Math.sin(t * 0.9) * 0.12);
      const fov = 3.4 / (3.4 - z);
      return [cx + x * scale * fov, cy + y * scale * fov];
    });

    for (const pass of [
      { dx: -5, color: 'rgba(0, 240, 255, 0.78)', lw: 1.8 },
      { dx: 5, color: 'rgba(255, 0, 85, 0.78)', lw: 1.8 },
      { dx: 0, color: '#fcee09', lw: 2.2 },
    ]) {
      ctx.strokeStyle = pass.color;
      ctx.lineWidth = pass.lw;
      ctx.beginPath();
      for (const [a, b] of oniMesh.edges) {
        ctx.moveTo(projected[a][0] + pass.dx, projected[a][1]);
        ctx.lineTo(projected[b][0] + pass.dx, projected[b][1]);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 0, 85, 0.82)';
    for (const [a, b, c] of oniMesh.visorTriangles) {
      ctx.beginPath();
      ctx.moveTo(projected[a][0], projected[a][1]);
      ctx.lineTo(projected[b][0], projected[b][1]);
      ctx.lineTo(projected[c][0], projected[c][1]);
      ctx.closePath();
      ctx.fill();
    }

    for (let i = slashes.length - 1; i >= 0; i -= 1) {
      const s = slashes[i];
      const age = t - s.born;
      if (age > 0.32) {
        slashes.splice(i, 1);
        continue;
      }
      const p = 1 - age / 0.32;
      const len = Math.max(width, height) * 1.2;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 9 * p;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  function applyGlitchSlices(t) {
    const isExiting = container.classList.contains('is-exiting');
    const burst = isExiting || Math.sin(t * 17) > 0.65 || Math.random() < 0.22;
    if (!burst) return;

    const sliceCount = isExiting ? 9 : 4;
    for (let i = 0; i < sliceCount; i += 1) {
      const sy = Math.random() * height;
      const sh = 6 + Math.random() * 34;
      const shift = (Math.random() - 0.5) * (isExiting ? 90 : 34);
      ctx.drawImage(canvas, 0, sy * dpr, width * dpr, sh * dpr, shift, sy, width, sh);
    }
  }

  function frame(now) {
    if (stopped) return;
    const t = (now - startTime) * 0.001;

    ctx.fillStyle = 'rgba(5, 4, 12, 0.34)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.5;
    const scale = Math.min(width, height) * 0.3;

    switch (sceneIndex) {
      case 0:
        renderThreeBodyChaos(t, cx, cy, scale);
        break;
      case 1:
        renderGargantuaQuasar(t, cx, cy, scale);
        break;
      case 2:
        renderMeteorApocalypse(t, cx, cy, scale);
        break;
      case 3:
        renderRingedGasGiant(t, cx, cy, scale);
        break;
      case 4:
        renderMagnetarSupernova(t, cx, cy, scale);
        break;
      case 5:
        renderDysonSwarm(t, cx, cy, scale);
        break;
      case 6:
        renderGalacticCollision(t, cx, cy, scale);
        break;
      default:
        renderOniStarWarp(t, cx, cy, scale);
        break;
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

  ctx.fillStyle = '#05040c';
  ctx.fillRect(0, 0, width, height);
  rafId = requestAnimationFrame(frame);

  return {
    getSceneIndex: () => sceneIndex,
    getScene: () => CYBER_SCENES[sceneIndex],
    resize,
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
