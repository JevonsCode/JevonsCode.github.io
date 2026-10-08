'use strict';

// Only the current project is kept, locally in this browser. Images are stored
// separately so moving a slider does not encode/copy every photograph again.
const ProjectStorage = (() => {
  const DB_NAME = 'jianxiang-projects-v1';
  const PROJECT_ID = 'current';
  const MARKER = '__jianxiangAsset';
  const objectIds = new WeakMap();
  const sourceIds = new Map();
  const blobs = new Map();
  const restoredImages = new Map();
  const restoredURLs = new Map();
  let dbPromise = null, initialization = null, initialized = false, restoreFailed = false;
  let timer = null, running = null, revision = 0, writtenRevision = 0;
  let waiters = [];
  let status = {status: 'loading', savedAt: null, error: null};

  function announce(next, error = null, savedAt = status.savedAt) {
    status = {status: next, savedAt, error: error?.name || null};
    document.dispatchEvent(new CustomEvent('projectsavechange', {detail: {...status}}));
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Storage request failed'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('Storage transaction failed'));
    });
  }

  function database() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('IndexedDB is unavailable')); return; }
      let settled = false;
      const request = indexedDB.open(DB_NAME, 1);
      const timeout = setTimeout(() => finish(new Error('Storage did not open')), 4000);
      function finish(error, db) {
        if (settled) { db?.close(); return; }
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error); else resolve(db);
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', {keyPath: 'id'});
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', {keyPath: 'id'});
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        finish(null, db);
      };
      request.onerror = () => finish(request.error || new Error('Storage is unavailable'));
      request.onblocked = () => finish(new Error('Storage is blocked'));
    }).catch(error => { dbPromise = null; throw error; });
    return dbPromise;
  }

  function rememberBlob(blob, object = null, src = null) {
    let id = (object && objectIds.get(object)) || (src && sourceIds.get(src)) || objectIds.get(blob);
    if (!id) id = 'asset-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
    if (object) objectIds.set(object, id);
    objectIds.set(blob, id);
    if (src) sourceIds.set(src, id);
    blobs.set(id, blob);
    return id;
  }

  async function sourceAsset(src, object = null) {
    const known = (object && objectIds.get(object)) || sourceIds.get(src);
    if (known && blobs.has(known)) return known;
    const sourceBlob = object && typeof assetBlobs !== 'undefined' ? assetBlobs.get(object) : null;
    if (sourceBlob) return rememberBlob(sourceBlob, object, src);
    if (!src) throw new Error('Image has no recoverable source');
    const response = await fetch(src);
    if (!response.ok) throw new Error('Image source could not be saved');
    return rememberBlob(await response.blob(), object, src);
  }

  async function encode(value, used) {
    if (value == null) return value;
    let id, representation;
    if (value instanceof Blob) {
      id = rememberBlob(value); representation = 'blob';
    } else if (value instanceof HTMLImageElement) {
      id = await sourceAsset(value.currentSrc || value.src, value); representation = 'image';
    } else if (value instanceof HTMLCanvasElement) {
      // Compatibility for a project loaded before all assets became immutable images.
      id = objectIds.get(value);
      if (!id || !blobs.has(id)) {
        const blob = await new Promise((resolve, reject) => value.toBlob(result => result ? resolve(result) : reject(new Error('Image could not be saved')), 'image/png'));
        id = rememberBlob(blob, value);
      }
      representation = 'image';
    } else if (typeof value === 'string' && value.startsWith('blob:')) {
      id = await sourceAsset(value); representation = 'url';
    }
    if (id) { used.add(id); return {[MARKER]: id, representation}; }
    if (Array.isArray(value)) {
      const result = [];
      for (const item of value) result.push(await encode(item, used));
      return result;
    }
    if (typeof value === 'object') {
      const result = {};
      for (const [key, item] of Object.entries(value)) result[key] = await encode(item, used);
      return result;
    }
    return value;
  }

  function assetURL(id) {
    if (!blobs.has(id)) throw new Error('A saved image is missing');
    if (!restoredURLs.has(id)) {
      const url = URL.createObjectURL(blobs.get(id));
      restoredURLs.set(id, url); sourceIds.set(url, id);
    }
    return restoredURLs.get(id);
  }

  async function decode(value) {
    if (value == null || typeof value !== 'object') return value;
    if (typeof value[MARKER] === 'string') {
      const id = value[MARKER], blob = blobs.get(id);
      if (!blob) throw new Error('A saved image is missing');
      if (value.representation === 'blob') return blob;
      const url = assetURL(id);
      if (value.representation === 'url') return url;
      if (value.representation !== 'image') throw new Error('Saved image format is invalid');
      if (!restoredImages.has(id)) {
        const img = await loadImage(url);
        objectIds.set(img, id);
        if (typeof assetBlobs !== 'undefined') assetBlobs.set(img, blob);
        restoredImages.set(id, img);
      }
      return restoredImages.get(id);
    }
    if (Array.isArray(value)) {
      const result = [];
      for (const item of value) result.push(await decode(item));
      return result;
    }
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = await decode(item);
    return result;
  }

  function settleWaiters(success, through = Infinity) {
    const remaining = [];
    for (const waiter of waiters) {
      if (waiter.revision <= through) waiter.resolve(success); else remaining.push(waiter);
    }
    waiters = remaining;
  }

  async function write(snapshot) {
    const used = new Set();
    const encoded = await encode(snapshot, used);
    const db = await database();
    const transaction = db.transaction(['projects', 'assets'], 'readwrite');
    const done = transactionDone(transaction);
    const assets = transaction.objectStore('assets');
    const projects = transaction.objectStore('projects');
    const savedAt = Date.now();
    try {
      // Read keys, not Blob bodies: another open tab may have replaced the
      // draft since our last commit. The new record must never point at an
      // image that tab removed, even when this tab only changed a slider.
      for (const id of used) {
        const request = assets.getKey(id);
        request.onsuccess = () => {
          if (request.result !== undefined) return;
          try { assets.put({id, blob: blobs.get(id)}); }
          catch { transaction.abort(); }
        };
      }
      const previous = projects.get(PROJECT_ID);
      previous.onsuccess = () => {
        try {
          for (const id of previous.result?.assetIds || []) if (!used.has(id)) assets.delete(id);
        } catch { transaction.abort(); }
      };
      projects.put({id: PROJECT_ID, version: 1, savedAt, assetIds: [...used], snapshot: encoded});
    } catch (error) {
      // A synchronous failure (for example cloning or quota) must also roll
      // back deletions, leaving the previous complete project recoverable.
      try { transaction.abort(); } catch {}
      await done.catch(() => {});
      throw error;
    }
    await done; // Report success only after metadata AND every image have committed.
    // Old history entries still own their image sources; only the current draft
    // needs to keep an extra Blob cache here. Undo can save old sources again.
    for (const id of blobs.keys()) if (!used.has(id)) blobs.delete(id);
    for (const [src, id] of sourceIds) if (!used.has(id)) sourceIds.delete(src);
    for (const id of restoredImages.keys()) if (!used.has(id)) restoredImages.delete(id);
    return savedAt;
  }

  function drain() {
    clearTimeout(timer); timer = null;
    if (running) return running;
    if (!initialized || revision <= writtenRevision) return Promise.resolve(true);
    if (state.importing > 0) {
      timer = setTimeout(drain, 200);
      return Promise.resolve(false);
    }
    running = (async () => {
      while (writtenRevision < revision) {
        if (state.importing > 0) { timer = setTimeout(drain, 200); break; }
        const savingRevision = revision;
        announce('saving');
        try {
          const savedAt = await write(captureProjectSnapshot());
          writtenRevision = savingRevision;
          status.savedAt = savedAt;
          settleWaiters(true, savingRevision);
          if (writtenRevision === revision) announce('saved', null, savedAt);
        } catch (error) {
          announce('error', error);
          settleWaiters(false);
          // A quota/permission failure must not create an endless retry loop.
          // The next edit or background event can try again.
          return false;
        }
      }
      return writtenRevision === revision;
    })().finally(() => { running = null; });
    return running;
  }

  function save(options = {}) {
    if (!initialized) return Promise.resolve(false);
    revision++;
    const promise = new Promise(resolve => waiters.push({revision, resolve}));
    clearTimeout(timer);
    if (options.immediate) drain(); else timer = setTimeout(drain, 350);
    return promise;
  }

  async function restore() {
    const db = await database();
    const project = await requestResult(db.transaction('projects').objectStore('projects').get(PROJECT_ID));
    if (!project) return {restored: false, available: true, savedAt: null};
    if (project.version !== 1 || !Array.isArray(project.assetIds) || project.snapshot?.version !== 1 || !Array.isArray(project.snapshot.cells) || project.snapshot.cells.length !== 9 || !Array.isArray(project.snapshot.overlayLayers)) {
      throw new Error('Saved project format is invalid');
    }
    const transaction = db.transaction('assets');
    const records = await Promise.all(project.assetIds.map(id => requestResult(transaction.objectStore('assets').get(id))));
    for (const record of records) {
      if (!record || !(record.blob instanceof Blob)) throw new Error('A saved image is missing');
      blobs.set(record.id, record.blob); objectIds.set(record.blob, record.id);
    }
    const snapshot = await decode(project.snapshot);
    applyProjectSnapshot(snapshot);
    return {restored: true, available: true, savedAt: project.savedAt};
  }

  function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      announce('loading');
      let result;
      try {
        result = await restore();
        announce(result.restored ? 'saved' : 'ready', null, result.savedAt);
      } catch (error) {
        restoreFailed = true;
        announce(dbPromise ? 'error' : 'unavailable', error);
        result = {restored: false, available: !!dbPromise, savedAt: null};
      }
      initialized = true;
      document.addEventListener('historychange', event => {
        if (event.detail?.reason === 'init') return;
        restoreFailed = false;
        save();
      });
      const saveOnBackground = () => { if (!restoreFailed) save({immediate: true}); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveOnBackground(); });
      document.addEventListener('freeze', saveOnBackground);
      window.addEventListener('pagehide', saveOnBackground);
      return result;
    })();
    return initialization;
  }

  return {initialize, save, getStatus: () => ({...status})};
})();

function initializeProjectStorage() { return ProjectStorage.initialize(); }
function saveProjectDraft(options) { return ProjectStorage.save(options); }
function getProjectSaveStatus() { return ProjectStorage.getStatus(); }
