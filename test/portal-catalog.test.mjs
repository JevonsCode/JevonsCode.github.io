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
