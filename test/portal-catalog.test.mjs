import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergePagesCatalog, resolvePageHref, hashSeed } from '../portal/data/pages-catalog.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('resolvePageHref routes external Pages to live Punycode origin on localhost and relative paths on production', () => {
  assert.equal(
    resolvePageHref('fuli', { hostname: '127.0.0.1', localSubpath: false }),
    'https://xn--8ovp9s.xn--m8txu.com/fuli/'
  );
  assert.equal(
    resolvePageHref('jianxiang', { hostname: '127.0.0.1', localSubpath: true }),
    '/jianxiang/'
  );
  assert.equal(
    resolvePageHref('fuli', { hostname: 'xn--8ovp9s.xn--m8txu.com', localSubpath: false }),
    '/fuli/'
  );
  assert.equal(
    resolvePageHref('phonebridge', { hostname: '有点.意思.com', localSubpath: false }),
    '/phonebridge/'
  );
});

test('mergePagesCatalog excludes self repo, auto-discovers brand-new GitHub Pages repos, and places Vault items last', () => {
  const manifest = [
    { slug: 'fuli', pageTitle: 'FULI', pushedAt: '2026-11-01T09:00:00Z' },
    { slug: '__temporary__', pageTitle: 'UA Test', pushedAt: '2022-04-13T12:00:00Z' },
  ];
  const liveGithub = [
    { name: 'JevonsCode.github.io', has_pages: true, archived: false },
    { name: 'future-3d-playground', has_pages: true, archived: false, topics: ['webgl'], pushed_at: '2026-11-02T00:00:00Z' },
    { name: 'archived-old-page', has_pages: true, archived: true },
    { name: 'non-pages-repo', has_pages: false, archived: false },
  ];

  const merged = mergePagesCatalog(manifest, liveGithub, { hostname: '127.0.0.1' });
  assert.equal(merged.length, 3);
  assert.equal(merged[0].slug, 'fuli');
  assert.equal(merged[1].slug, 'future-3d-playground');
  assert.equal(merged[1].tag, '3D');
  assert.equal(merged[1].artKey, 'procedural');
  assert.equal(merged[2].slug, '__temporary__');
  assert.equal(merged[2].vault, true);
  assert.deepEqual(
    merged.map((m) => m.indexCode),
    ['01', '02', '03']
  );
});

test('generated pages-manifest.json contains all verified live Pages entries', async () => {
  const raw = await readFile(resolve(ROOT, 'portal/data/pages-manifest.json'), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.domain, '有点.意思.com');
  assert.ok(Array.isArray(parsed.items));
  assert.ok(parsed.items.length >= 18, `Expected at least 18 live Pages, got ${parsed.items.length}`);
  assert.ok(parsed.items.some((i) => i.slug === 'fuli'));
  assert.ok(parsed.items.some((i) => i.slug === 'jianxiang' && i.localSubpath === true));
  assert.ok(!parsed.items.some((i) => i.slug.toLowerCase() === 'jevonscode.github.io'));
});

test('flagship entries expose authentic brand logos, accents, and dual Website + GitHub URLs', () => {
  const manifest = [
    { slug: 'fuli', repoUrl: 'https://github.com/JevonsCode/fuli' },
    { slug: 'DingDongBuddy', repoUrl: 'https://github.com/JevonsCode/DingDongBuddy' },
    { slug: 'phonebridge', repoUrl: 'https://github.com/JevonsCode/phonebridge' },
    { slug: 'fuli-avatar', repoUrl: 'https://github.com/JevonsCode/fuli-avatar' },
  ];
  const merged = mergePagesCatalog(manifest, [], { hostname: '有点.意思.com' });
  for (const item of merged) {
    assert.ok(item.logo, `${item.slug} should include official brand logo`);
    assert.equal(item.href, `/${item.slug}/`);
    assert.equal(item.repoUrl, `https://github.com/JevonsCode/${item.slug}`);
  }
  assert.equal(merged.find((i) => i.slug === 'fuli').accent, '#0F6B55');
  assert.equal(merged.find((i) => i.slug === 'DingDongBuddy').accent, '#2F6F8F');
  assert.equal(merged.find((i) => i.slug === 'phonebridge').accent, '#1967D2');
});

test('hashSeed is deterministic and non-negative', () => {
  assert.equal(hashSeed('fuli'), hashSeed('fuli'));
  assert.notEqual(hashSeed('fuli'), hashSeed('phonebridge'));
  assert.ok(hashSeed('any-slug') >= 0);
});

test('fuli and DingDongBuddy are marked as hot/recommended with bilingual blurbs', () => {
  const manifest = [
    { slug: 'fuli', repoUrl: 'https://github.com/JevonsCode/fuli' },
    { slug: 'DingDongBuddy', repoUrl: 'https://github.com/JevonsCode/DingDongBuddy' },
    { slug: 'phonebridge', repoUrl: 'https://github.com/JevonsCode/phonebridge' },
  ];
  const merged = mergePagesCatalog(manifest, [], { hostname: '有点.意思.com' });
  const fuli = merged.find((i) => i.slug === 'fuli');
  const dingdong = merged.find((i) => i.slug === 'DingDongBuddy');
  const phonebridge = merged.find((i) => i.slug === 'phonebridge');

  assert.equal(fuli.hot, true);
  assert.equal(dingdong.hot, true);
  assert.equal(phonebridge.hot, false);

  assert.ok(fuli.blurb?.zh && fuli.blurb?.en);
  assert.ok(dingdong.blurb?.zh && dingdong.blurb?.en);
});

test('locale and prefix variants provide expected wordplay options', async () => {
  const { PREFIX_VARIANTS, t } = await import('../portal/i18n/locale.js');
  assert.ok(PREFIX_VARIANTS.length >= 6);
  assert.ok(PREFIX_VARIANTS.some((p) => p.prefix === '有点'));
  assert.ok(PREFIX_VARIANTS.some((p) => p.prefix === '差点'));
  assert.ok(PREFIX_VARIANTS.some((p) => p.prefix === '意思'));
  assert.equal(t('site'), '官网 ↗');
});

test('07 3d-solar-system is standard span and 08 astron-solar-system is wide 3D solar system', () => {
  const manifest = [
    { slug: '3d-solar-system' },
    { slug: 'astron-solar-system' },
  ];
  const merged = mergePagesCatalog(manifest, [], { hostname: '有点.意思.com' });
  const s07 = merged.find((i) => i.slug === '3d-solar-system');
  const s08 = merged.find((i) => i.slug === 'astron-solar-system');
  assert.equal(s07.span, 'standard');
  assert.equal(s08.span, 'wide');
  assert.equal(s08.tag, '3D');
  assert.ok(s08.blurb?.zh.includes('3D'));
});

test('ydys-badge.js UMD module exports cyberpunk badge API with strict fixed geometry', async () => {
  const mod = await import('../ydys-badge.js');
  const badge = mod.default?.PORTAL_URL ? mod.default : globalThis.YdysCyberBadge;
  assert.equal(badge.PORTAL_URL, 'https://xn--8ovp9s.xn--m8txu.com/');
  assert.equal(badge.LABEL, '有点.意思.com');
  assert.equal(typeof badge.mount, 'function');
  assert.equal(typeof badge.mountAll, 'function');
  assert.ok(badge.CSS_TEXT.includes('contain: strict !important;'));
  assert.ok(badge.CSS_TEXT.includes('width: 100px !important;'));
  assert.ok(badge.CSS_TEXT.includes('transform: none !important;'));
});

test('cyber-loader exposes 8 distinct cosmic cyberpunk scenes with zero Chinese or progress bar text', async () => {
  const { CYBER_SCENES, pickNextCyberSceneIndex } = await import('../portal/stage/cyber-loader.js');
  assert.equal(CYBER_SCENES.length, 8);
  const ids = CYBER_SCENES.map((s) => s.id);
  assert.ok(ids.includes('three-body-chaos'));
  assert.ok(ids.includes('gargantua-quasar'));
  assert.ok(ids.includes('meteor-apocalypse'));
  assert.ok(ids.includes('ringed-gas-giant'));
  for (const scene of CYBER_SCENES) {
    assert.equal(/[\u4e00-\u9fa5]/.test(scene.code + scene.sub), false);
    assert.equal((scene.code + scene.sub).includes('有点'), false);
  }
  const idx1 = pickNextCyberSceneIndex();
  const idx2 = pickNextCyberSceneIndex(idx1);
  assert.ok(Number.isInteger(idx1) && idx1 >= 0 && idx1 < CYBER_SCENES.length);
  assert.notEqual(idx1, idx2);
});

test('signal-glitch generates random 20s-44s Cyberpunk signal drop intervals', async () => {
  const { randomSignalDelayMs } = await import('../portal/stage/signal-glitch.js');
  for (let i = 0; i < 25; i += 1) {
    const ms = randomSignalDelayMs(20000, 44000);
    assert.ok(ms >= 20000 && ms <= 44000);
  }
});

test('SEO and AIEO files (robots.txt, sitemap.xml, llms.txt, llms-full.txt, index.html JSON-LD) cover FULI, DingDong, and PhoneBridge', async () => {
  const robots = await readFile(resolve(ROOT, 'robots.txt'), 'utf8');
  const sitemap = await readFile(resolve(ROOT, 'sitemap.xml'), 'utf8');
  const llms = await readFile(resolve(ROOT, 'llms.txt'), 'utf8');
  const llmsFull = await readFile(resolve(ROOT, 'llms-full.txt'), 'utf8');
  const indexHtml = await readFile(resolve(ROOT, 'index.html'), 'utf8');
  const badgeJs = await readFile(resolve(ROOT, 'ydys-badge.js'), 'utf8');

  assert.equal(badgeJs.includes("setAttribute('title'"), false);
  assert.ok(robots.includes('GPTBot') && robots.includes('ClaudeBot') && robots.includes('PerplexityBot'));
  assert.ok(robots.includes('Sitemap: https://xn--8ovp9s.xn--m8txu.com/sitemap.xml'));

  for (const doc of [sitemap, llms, llmsFull, indexHtml]) {
    assert.ok(doc.includes('https://xn--8ovp9s.xn--m8txu.com/fuli/'));
    assert.ok(doc.includes('https://xn--8ovp9s.xn--m8txu.com/DingDongBuddy/'));
    assert.ok(doc.includes('https://xn--8ovp9s.xn--m8txu.com/phonebridge/'));
  }
  assert.ok(indexHtml.includes('application/ld+json'));
  assert.ok(indexHtml.includes('id="seo-crawler-atlas"'));
  assert.ok(indexHtml.includes('name="google-site-verification" content="sf45w9Le0FvwqCVQNc9X71cIVdKBVpd2hQWJOJLPPjc"'));
  assert.ok(indexHtml.includes('z9inempyr4'));
  assert.ok(badgeJs.includes('z9inempyr4'));
  assert.ok(indexHtml.includes('G-MFGEX5L3X8'));
  assert.ok(badgeJs.includes('G-MFGEX5L3X8'));
});

