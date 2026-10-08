/*
 * One complete, immutable app shell per release. Bump CACHE_VERSION whenever
 * any precached file changes. Installation downloads the whole shell before
 * this worker can become active; a failed download leaves the old release in
 * charge. In particular, never replace cached files one at a time on requests.
 *
 * Everything is relative to this registration, so /jianxiang/ does not touch
 * the parent site's service worker, pages, or caches.
 */
'use strict';

const CACHE_VERSION = '2026-10-08.2';
const APP_SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `jianxiang-shell:${encodeURIComponent(APP_SCOPE.pathname)}:`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const SHELL_FILES = [
  'index.html',
  'style.css',
  'i18n.js',
  'i18n-ui.js',
  'i18n-app.js',
  'i18n-editors.js',
  'i18n-overflow.js',
  'i18n-help.js',
  'i18n-pwa.js',
  'help.js',
  'share.js',
  'gestures.js',
  'photo-editor.js',
  'overflow-editor.js',
  'long-editor.js',
  'app.js',
  'project-history.js',
  'project-storage.js',
  'workspace-ui.js',
  'saved-projects.js',
  'i18n-projects.js',
  'bug-report.js',
  'i18n-feedback.js',
  'story-drag.js',
  'i18n-story-updates.js',
  'i18n-workspace.js',
  'pwa.js',
  'manifest.webmanifest',
  'assets/cover-57979.jpg',
  'assets/overflow-background.png',
  'assets/overflow-person.png',
  'assets/overflow-title.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png'
];
const SHELL_URLS = SHELL_FILES.map(path => new URL(path, APP_SCOPE).href);
const SHELL_BY_PATH = new Map(SHELL_URLS.map(href => [new URL(href).pathname, href]));
const INDEX_URL = new URL('index.html', APP_SCOPE).href;

async function shellIsComplete() {
  if (!await caches.has(CACHE_NAME)) return false;
  const cache = await caches.open(CACHE_NAME);
  const entries = await Promise.all(SHELL_URLS.map(url => cache.match(url)));
  return entries.every(response => response && response.ok);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Also prevents an accidentally reused version from overwriting an active
    // release. Publishing new bytes always requires a new CACHE_VERSION.
    if (await shellIsComplete()) return;
    const existed = await caches.has(CACHE_NAME);
    const cache = await caches.open(CACHE_NAME);
    try {
      // addAll commits the batch atomically. Reload bypasses stale HTTP cache;
      // same-origin rejects redirects to unrelated hosts and opaque responses.
      await cache.addAll(SHELL_URLS.map(url => new Request(url, {
        cache: 'reload', mode: 'same-origin', credentials: 'same-origin'
      })));
    } catch (error) {
      if (!existed) await caches.delete(CACHE_NAME);
      throw error;
    }
    // Deliberately no skipWaiting: an open editing session keeps its release.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previousCaches = (await caches.keys()).filter(name =>
      name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
    );
    // Normal updates activate only after old windows close. An explicit update
    // is accepted only for a single app window (see the message handler).
    await Promise.all(previousCaches.map(name => caches.delete(name)));
    // Cache leftovers cannot tell us whether this is a first installation:
    // unregistering an old worker does not remove its caches. Always claim so
    // a fresh install becomes usable offline immediately, including when a
    // broader parent-site worker previously controlled this app's page.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== APP_SCOPE.origin) return;

  let shellURL;
  if (request.mode === 'navigate') {
    // Language/share parameters do not create duplicate navigation caches.
    // Unknown paths are left to the server, rather than becoming fake app pages.
    if (url.pathname !== APP_SCOPE.pathname && url.pathname !== new URL(INDEX_URL).pathname) return;
    shellURL = INDEX_URL;
  } else {
    shellURL = SHELL_BY_PATH.get(url.pathname);
  }
  if (!shellURL) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(shellURL);
    if (cached) return cached;
    // Storage may be removed externally by the browser/user. Keep online use
    // possible, but do not silently patch this release with newer server files.
    // GET_OFFLINE_STATUS will report incomplete until a full install succeeds.
    return fetch(request);
  })());
});

function isAppWindow(client) {
  if (!client || !client.url) return false;
  const url = new URL(client.url);
  return url.origin === APP_SCOPE.origin && url.pathname.startsWith(APP_SCOPE.pathname);
}

self.addEventListener('message', event => {
  if (!isAppWindow(event.source)) return;
  const reply = value => event.ports[0]?.postMessage(value);
  if (event.data?.type === 'GET_OFFLINE_STATUS') {
    event.waitUntil((async () => {
      try {
        reply({ ready: await shellIsComplete(), version: CACHE_VERSION });
      } catch {
        reply({ ready: false, version: CACHE_VERSION });
      }
    })());
  } else if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil((async () => {
      // Reloading the requesting window must not swap the shell under another
      // tab's in-memory photo edits. Ask the user to close other app windows.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clients.filter(isAppWindow).length > 1) {
        reply({ accepted: false, reason: 'other-tabs' });
        return;
      }
      if (!await shellIsComplete()) {
        reply({ accepted: false, reason: 'incomplete' });
        return;
      }
      reply({ accepted: true });
      await self.skipWaiting();
    })());
  }
});
