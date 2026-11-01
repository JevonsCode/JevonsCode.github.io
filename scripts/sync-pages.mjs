#!/usr/bin/env node
// Syncs all live GitHub Pages repositories of JevonsCode + verified root subpaths into portal/data/pages-manifest.json.

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTAL_OWNER, PORTAL_REPO, ORIGIN_PUNYCODE } from '../portal/data/pages-catalog.js';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = resolve(ROOT_DIR, 'portal/data/pages-manifest.json');
const LOCAL_SUBPATHS = ['jianxiang', 'postmessagetest'];

async function fetchPageTitle(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return { reachable: false, pageTitle: '' };
    const html = await resp.text();
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = match ? match[1].replace(/\s+/g, ' ').trim() : '';
    return { reachable: true, pageTitle };
  } catch {
    return { reachable: false, pageTitle: '' };
  }
}

async function fetchGithubPagesRepos() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ydys-portal-sync',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repos = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = `https://api.github.com/users/${PORTAL_OWNER}/repos?per_page=100&page=${page}&sort=pushed`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      throw new Error(`GitHub API HTTP ${resp.status}`);
    }
    const batch = await resp.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  return repos.filter(
    (repo) => repo && repo.has_pages && !repo.archived && repo.name.toLowerCase() !== PORTAL_REPO.toLowerCase()
  );
}

async function main() {
  const pagesRepos = await fetchGithubPagesRepos();

  const repoEntries = await Promise.all(
    pagesRepos.map(async (repo) => {
      const probe = await fetchPageTitle(`${ORIGIN_PUNYCODE}/${repo.name}/`);
      return {
        slug: repo.name,
        pageTitle: probe.pageTitle,
        reachable: probe.reachable,
        language: repo.language || '',
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        stars: repo.stargazers_count || 0,
        pushedAt: repo.pushed_at || '',
        repoUrl: repo.html_url,
        localSubpath: false,
      };
    })
  );

  const subpathEntries = [];
  for (const sub of LOCAL_SUBPATHS) {
    if (!existsSync(resolve(ROOT_DIR, sub, 'index.html'))) continue;
    const probe = await fetchPageTitle(`${ORIGIN_PUNYCODE}/${sub}/`);
    subpathEntries.push({
      slug: sub,
      pageTitle: probe.pageTitle,
      reachable: true,
      language: 'JavaScript',
      topics: [],
      stars: 0,
      pushedAt: '2026-10-08T20:47:01Z',
      repoUrl: `https://github.com/${PORTAL_OWNER}/${PORTAL_REPO}/tree/master/${sub}`,
      localSubpath: true,
    });
  }

  const items = [...repoEntries.filter((e) => e.reachable), ...subpathEntries].sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );

  await mkdir(dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        owner: PORTAL_OWNER,
        domain: '有点.意思.com',
        syncedAt: new Date().toISOString(),
        count: items.length,
        items,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`Synced ${items.length} live Pages entries -> ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
