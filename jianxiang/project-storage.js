'use strict';

// Drafts and explicitly saved projects live only in this browser. Images are
// shared between records so saving a version does not duplicate every bitmap.
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
  let activeProject = null, operationActive = false, operationQueue = Promise.resolve();
  let savedFingerprint = null, unnamedBaselineFingerprint = null;
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

  function newID(prefix) {
    return prefix + '-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  }

  function setActiveProject(project) {
    activeProject = project ? {id: project.id, name: project.name} : null;
    document.dispatchEvent(new CustomEvent('projectidentitychange', {detail: activeProject && {...activeProject}}));
  }

  function fingerprint(snapshot) {
    return typeof projectSnapshotFingerprint === 'function'
      ? projectSnapshotFingerprint(snapshot) : JSON.stringify(snapshot);
  }

  function hasUnsavedChanges() {
    const baseline = activeProject ? savedFingerprint : unnamedBaselineFingerprint;
    return baseline === null || fingerprint(captureProjectSnapshot()) !== baseline;
  }

  function requireSavedBeforeSwitch() {
    if (!hasUnsavedChanges()) return;
    const error = new Error('Save the current project before opening another one');
    error.name = 'UnsavedProjectError';
    throw error;
  }

  function pruneMemory(used) {
    for (const id of blobs.keys()) if (!used.has(id)) blobs.delete(id);
    for (const [src, id] of sourceIds) if (!used.has(id)) sourceIds.delete(src);
    for (const id of restoredImages.keys()) if (!used.has(id)) restoredImages.delete(id);
  }

  // Each commit checks references across ALL named projects and the draft.
  // A draft change can therefore never delete a saved project's only images.
  async function persistRecords(records, used) {
    const db = await database();
    const transaction = db.transaction(['projects', 'assets'], 'readwrite');
    const done = transactionDone(transaction);
    const assets = transaction.objectStore('assets');
    const projects = transaction.objectStore('projects');
    try {
      for (const id of used) {
        if (!(blobs.get(id) instanceof Blob)) throw new Error('A project image is missing');
        const request = assets.getKey(id);
        request.onsuccess = () => {
          if (request.result !== undefined) return;
          try { assets.put({id, blob: blobs.get(id)}); }
          catch { transaction.abort(); }
        };
      }
      const previous = projects.getAll();
      previous.onsuccess = () => {
        try {
          const next = new Map(previous.result.map(record => [record.id, record]));
          for (const record of records) next.set(record.id, record);
          const referenced = new Set([...next.values()].flatMap(record => record.assetIds || []));
          const cursor = assets.openKeyCursor();
          cursor.onsuccess = () => {
            if (!cursor.result) return;
            if (!referenced.has(cursor.result.key)) assets.delete(cursor.result.key);
            cursor.result.continue();
          };
        } catch { transaction.abort(); }
      };
      for (const record of records) projects.put(record);
    } catch (error) {
      try { transaction.abort(); } catch {}
      await done.catch(() => {});
      throw error;
    }
    await done;
    pruneMemory(used);
  }

  async function prepareSnapshot(snapshot) {
    const used = new Set();
    const encoded = await encode(snapshot, used);
    return {used, encoded};
  }

  function draftRecord(prepared, savedAt = Date.now(), identity = activeProject) {
    return {id: PROJECT_ID, kind: 'draft', version: 1, savedAt,
      activeProject: identity && {...identity}, assetIds: [...prepared.used], snapshot: prepared.encoded};
  }

  async function write(snapshot) {
    const prepared = await prepareSnapshot(snapshot), savedAt = Date.now();
    await persistRecords([draftRecord(prepared, savedAt)], prepared.used);
    return savedAt;
  }

  function drain() {
    clearTimeout(timer); timer = null;
    if (running) return running;
    if (operationActive) return Promise.resolve(false);
    if (!initialized || revision <= writtenRevision) return Promise.resolve(true);
    if (state.importing > 0) {
      timer = setTimeout(drain, 200);
      return Promise.resolve(false);
    }
    running = (async () => {
      while (writtenRevision < revision) {
        if (operationActive) break;
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
    announce('saving');
    const promise = new Promise(resolve => waiters.push({revision, resolve}));
    clearTimeout(timer);
    if (options.immediate) drain(); else timer = setTimeout(drain, 350);
    return promise;
  }

  function validateRecord(project) {
    const snapshot = project?.snapshot;
    if (project?.version !== 1 || !Array.isArray(project.assetIds) || snapshot?.version !== 1
      || !Array.isArray(snapshot.cells) || snapshot.cells.length !== 9
      || !Array.isArray(snapshot.overflowCells) || snapshot.overflowCells.length !== 9
      || !Array.isArray(snapshot.overlayLayers)) throw new Error('Saved project format is invalid');
  }

  async function readRecord(id) {
    const db = await database();
    return requestResult(db.transaction('projects').objectStore('projects').get(id));
  }

  async function decodeRecord(project) {
    validateRecord(project);
    const db = await database(), transaction = db.transaction('assets');
    const records = await Promise.all(project.assetIds.map(id => requestResult(transaction.objectStore('assets').get(id))));
    for (const record of records) {
      if (!record || !(record.blob instanceof Blob)) throw new Error('A saved image is missing');
      blobs.set(record.id, record.blob); objectIds.set(record.blob, record.id);
    }
    return decode(project.snapshot);
  }

  async function restore() {
    const project = await readRecord(PROJECT_ID);
    if (!project) return {restored: false, available: true, savedAt: null, activeProject: null};
    const snapshot = await decodeRecord(project);
    applyProjectSnapshot(snapshot);
    const identity = project.activeProject;
    setActiveProject(identity && typeof identity.id === 'string' && typeof identity.name === 'string' ? identity : null);
    unnamedBaselineFingerprint = null;
    if (activeProject) {
      const saved = await readRecord(activeProject.id);
      // A missing/corrupt named version cannot prevent restoring the healthy
      // working draft. Treat it as unsaved until the next explicit Save.
      try { if (saved) savedFingerprint = fingerprint(await decodeRecord(saved)); }
      catch { savedFingerprint = null; }
    }
    return {restored: true, available: true, savedAt: project.savedAt, activeProject: activeProject && {...activeProject}};
  }

  function exclusive(work) {
    const operation = operationQueue.then(async () => {
      if (state.importing > 0) throw new Error('Photos are still importing');
      operationActive = true;
      clearTimeout(timer); timer = null;
      if (running) await running;
      try { return await work(); }
      finally {
        operationActive = false;
        if (revision > writtenRevision) timer = setTimeout(drain, 0);
      }
    });
    operationQueue = operation.catch(() => {});
    return operation;
  }

  async function flushDraft() {
    const savingRevision = revision;
    const savedAt = await write(captureProjectSnapshot());
    writtenRevision = savingRevision;
    settleWaiters(true, savingRevision);
    restoreFailed = false;
    announce('saved', null, savedAt);
    return savedAt;
  }

  function metadata(record) {
    return {id: record.id, name: record.name, savedAt: record.savedAt,
      photoCount: record.photoCount || 0, mode: record.mode || 'classic', thumbnail: record.thumbnail || null};
  }

  function snapshotMetadata(snapshot) {
    let thumbnail = snapshot.coverUploadDetails?.thumb || snapshot.coverAsset?.thumb || null;
    if (typeof imageThumbnail === 'function' && typeof cover !== 'undefined' && cover.width) {
      try { thumbnail = imageThumbnail(cover, 160); } catch {}
    }
    return {photoCount: snapshot.cells.reduce((sum, cell) => sum + cell.top.length + cell.bottom.length, 0), mode: snapshot.mode, thumbnail};
  }

  function cleanName(name) {
    const value = typeof name === 'string' ? name.trim() : '';
    return value.slice(0, 160) || (typeof t === 'function' ? t('未命名作品') : 'Untitled project');
  }

  function saveNamed(options = {}) {
    return exclusive(async () => {
      const existing = options.id ? await readRecord(options.id) : null;
      if (options.id && (!existing || existing.id === PROJECT_ID)) throw new Error('Saved project was not found');
      const id = existing?.id || newID('project'), name = cleanName(options.name || existing?.name);
      const snapshot = captureProjectSnapshot(), savingRevision = revision;
      announce('saving');
      try {
        const prepared = await prepareSnapshot(snapshot), savedAt = Date.now();
        const record = {id, kind: 'named', name, version: 1, savedAt, ...snapshotMetadata(snapshot),
          assetIds: [...prepared.used], snapshot: prepared.encoded};
        await persistRecords([record, draftRecord(prepared, savedAt, {id, name})], prepared.used);
        writtenRevision = savingRevision; settleWaiters(true, savingRevision); restoreFailed = false;
        savedFingerprint = fingerprint(snapshot);
        if (fingerprint(captureProjectSnapshot()) === savedFingerprint) state.dirty = false;
        setActiveProject({id, name}); announce('saved', null, savedAt);
        document.dispatchEvent(new CustomEvent('savedprojectschange'));
        return metadata(record);
      } catch (error) { announce('error', error); throw error; }
    });
  }

  async function listSaved() {
    const db = await database();
    const records = await requestResult(db.transaction('projects').objectStore('projects').getAll());
    return records.filter(record => record.id !== PROJECT_ID && record.kind === 'named')
      .sort((a, b) => b.savedAt - a.savedAt).map(metadata);
  }

  function applyLoadedProject(snapshot, identity) {
    applyProjectSnapshot(snapshot);
    savedFingerprint = fingerprint(snapshot);
    setActiveProject(identity);
    if (typeof historyInit === 'function') historyInit('恢复的作品');
    state.dirty = false;
  }

  function loadNamed(id) {
    return exclusive(async () => {
      requireSavedBeforeSwitch();
      const record = await readRecord(id);
      if (!record || record.id === PROJECT_ID || record.kind !== 'named') return false;
      // Decode before touching the current editor; a broken saved file must not
      // replace a healthy in-progress project.
      const snapshot = await decodeRecord(record);
      await flushDraft();
      // flushDraft prunes its memory cache, so re-encode decoded immutable
      // images when creating the replacement current draft.
      const prepared = await prepareSnapshot(snapshot), savedAt = Date.now();
      await persistRecords([draftRecord(prepared, savedAt, {id: record.id, name: record.name})], prepared.used);
      applyLoadedProject(snapshot, {id: record.id, name: record.name});
      announce('saved', null, savedAt);
      return metadata(record);
    });
  }

  const FILE_MAGIC = new TextEncoder().encode('JIANXIANG/1\n');

  function exportFile() {
    return exclusive(async () => {
      const snapshot = captureProjectSnapshot(), prepared = await prepareSnapshot(snapshot);
      const assets = [...prepared.used].map(id => ({id, type: blobs.get(id).type, size: blobs.get(id).size}));
      const manifest = {format: 'jianxiang', version: 1, name: activeProject?.name || cleanName(''),
        savedAt: Date.now(), snapshot: prepared.encoded, assets};
      const header = new TextEncoder().encode(JSON.stringify(manifest));
      const prefix = new Uint8Array(FILE_MAGIC.length + 4);
      prefix.set(FILE_MAGIC);
      new DataView(prefix.buffer).setUint32(FILE_MAGIC.length, header.length, true);
      // Blob composition keeps original image bytes intact and avoids the
      // memory/size expansion of a base64 JSON export.
      return new Blob([prefix, header, ...assets.map(asset => blobs.get(asset.id))], {type: 'application/vnd.jianxiang.project'});
    });
  }

  function validatePortableSnapshot(snapshot) {
    validateRecord({version: 1, assetIds: [], snapshot});
    const finite = value => typeof value === 'number' && Number.isFinite(value);
    const crop = edit => !edit || finite(edit.zoom ?? 1) && (edit.zoom ?? 1) >= 1 && (edit.zoom ?? 1) <= 4
      && finite(edit.x ?? 0) && Math.abs(edit.x ?? 0) <= 1 && finite(edit.y ?? 0) && Math.abs(edit.y ?? 0) <= 1;
    const image = value => value && typeof value[MARKER] === 'string' && value.representation === 'image';
    const url = value => value && typeof value[MARKER] === 'string' && value.representation === 'url';
    const photo = value => {
      if (!value || (!image(value.img) && !url(value.src))) throw new Error('Invalid project photo');
      if (!crop(value.edit)) throw new Error('Invalid photo crop');
      if (value.edit?.frame != null && (!finite(value.edit.frame) || value.edit.frame < .25 || value.edit.frame > 3)) throw new Error('Invalid photo frame');
    };
    if (!image(snapshot.cover) || !['classic', 'overflow'].includes(snapshot.mode)
      || !['zoom', 'x', 'y', 'gridGap', 'thumbWidth'].every(key => finite(snapshot[key]))
      || snapshot.zoom < 1 || snapshot.zoom > 4 || Math.abs(snapshot.x) > 1 || Math.abs(snapshot.y) > 1
      || snapshot.thumbWidth < 40 || snapshot.thumbWidth > 500 || snapshot.gridGap < 0 || snapshot.gridGap > 30
      || typeof snapshot.paper !== 'string' || !/^#[\da-f]{6}$/i.test(snapshot.paper)) throw new Error('Invalid project settings');
    if (snapshot.overflowBackground != null && !image(snapshot.overflowBackground)) throw new Error('Invalid project background');
    for (const cell of snapshot.cells) {
      for (const side of ['top', 'bottom']) {
        if (!Array.isArray(cell?.[side])) throw new Error('Invalid project photos');
        cell[side].forEach(photo);
        if (cell.fill?.[side]) photo(cell.fill[side]);
        if (!crop(cell.fillEdits?.[side])) throw new Error('Invalid fill crop');
      }
    }
    for (const cell of snapshot.overflowCells) {
      if (!cell || typeof cell.enabled !== 'boolean' || !['top', 'right', 'bottom', 'left'].every(edge => finite(cell.insets?.[edge]) && cell.insets[edge] >= 0 && cell.insets[edge] <= .4)) throw new Error('Invalid overflow settings');
    }
    for (const layer of snapshot.overlayLayers) {
      if (!image(layer.image) || !Array.isArray(layer.cells) || layer.cells.length !== 9
        || !layer.cells.every(cell => cell === null || cell && ['x', 'y', 'scale'].every(key => finite(cell[key]))
          && cell.x >= 0 && cell.x <= 1 && cell.y >= 0 && cell.y <= 1 && cell.scale >= .05 && cell.scale <= 2)) throw new Error('Invalid project layer');
    }
  }

  async function readPortableFile(file) {
    if (!(file instanceof Blob) || file.size < FILE_MAGIC.length + 4) throw new Error('Invalid project file');
    const prefixSize = FILE_MAGIC.length + 4, prefix = new Uint8Array(await file.slice(0, prefixSize).arrayBuffer());
    if (!FILE_MAGIC.every((value, index) => prefix[index] === value)) throw new Error('Invalid project file');
    const headerSize = new DataView(prefix.buffer).getUint32(FILE_MAGIC.length, true);
    if (!headerSize || headerSize > file.size - prefixSize) throw new Error('Incomplete project file');
    const manifest = JSON.parse(await file.slice(prefixSize, prefixSize + headerSize).text());
    if (manifest.format !== 'jianxiang' || manifest.version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Unsupported project file');
    let offset = prefixSize + headerSize;
    const imported = new Map(), remap = new Map();
    for (const asset of manifest.assets) {
      if (!asset || typeof asset.id !== 'string' || remap.has(asset.id) || !/^image\/(png|jpeg|webp)$/i.test(asset.type)
        || !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > file.size - offset) throw new Error('Invalid project image');
      const id = newID('asset');
      remap.set(asset.id, id);
      imported.set(id, file.slice(offset, offset + asset.size, asset.type));
      offset += asset.size;
    }
    if (offset !== file.size) throw new Error('Invalid project file length');
    function rewrite(value, depth = 0) {
      if (depth > 50) throw new Error('Invalid project structure');
      if (value == null || typeof value !== 'object') return value;
      if (typeof value[MARKER] === 'string') {
        const id = remap.get(value[MARKER]);
        if (!id || !['image', 'url', 'blob'].includes(value.representation)) throw new Error('A project image is missing');
        return {[MARKER]: id, representation: value.representation};
      }
      if (Array.isArray(value)) return value.map(item => rewrite(item, depth + 1));
      const result = {};
      for (const [key, item] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid project property');
        result[key] = rewrite(item, depth + 1);
      }
      return result;
    }
    const encoded = rewrite(manifest.snapshot);
    validatePortableSnapshot(encoded);
    for (const [id, blob] of imported) { blobs.set(id, blob); objectIds.set(blob, id); }
    let snapshot;
    try { snapshot = await decode(encoded); }
    catch (error) { for (const id of imported.keys()) blobs.delete(id); throw error; }
    // Use only decoded, embedded images. Never follow a URL or thumbnail from
    // an imported file, which may have been edited outside this application.
    async function normalizePhoto(photo) {
      if (!photo.img) photo.img = await loadImage(photo.src);
      if (!(photo.img instanceof HTMLImageElement) || photo.img.naturalWidth * photo.img.naturalHeight > 60000000) throw new Error('Invalid project image dimensions');
      photo.src = photo.img.src;
      photo.width = photo.img.naturalWidth; photo.height = photo.img.naturalHeight;
      photo.name = typeof photo.name === 'string' ? photo.name.slice(0, 300) : '';
      photo.thumb = imageThumbnail(photo.img, 144);
      const id = sourceIds.get(photo.src);
      if (id && typeof assetBlobs !== 'undefined') assetBlobs.set(photo.img, blobs.get(id));
    }
    for (const cell of snapshot.cells) for (const side of ['top', 'bottom']) {
      for (const photo of cell[side]) await normalizePhoto(photo);
      if (cell.fill?.[side]) await normalizePhoto(cell.fill[side]);
    }
    const name = cleanName(snapshot.coverAsset?.name || snapshot.coverUploadDetails?.name);
    snapshot.coverAsset = {img: snapshot.cover, name};
    await normalizePhoto(snapshot.coverAsset);
    snapshot.coverUploadDetails = {name, thumb: snapshot.coverAsset.thumb, isDefault: !!snapshot.isDefaultCover};
    const originalActiveLayer = snapshot.selection?.activeOverlayId;
    for (const [index, layer] of snapshot.overlayLayers.entries()) {
      const previousID = layer.id;
      layer.id = 'layer-' + (index + 1); layer.loading = false; layer.visible = layer.visible !== false;
      layer.name = typeof layer.name === 'string' ? layer.name.slice(0, 300) : '';
      layer.thumb = imageThumbnail(layer.image, 144, true);
      if (originalActiveLayer === previousID) snapshot.selection.activeOverlayId = layer.id;
    }
    return {snapshot, name: cleanName(manifest.name)};
  }

  function importFile(file) {
    return exclusive(async () => {
      requireSavedBeforeSwitch();
      const imported = await readPortableFile(file);
      await flushDraft();
      const snapshot = imported.snapshot, id = newID('project'), name = imported.name;
      const prepared = await prepareSnapshot(snapshot), savedAt = Date.now();
      // Save the new named project and its working draft atomically before
      // replacing the editor. A quota failure leaves the old work on screen.
      const record = {id, kind: 'named', version: 1, name, savedAt,
        photoCount: snapshot.cells.reduce((sum, cell) => sum + cell.top.length + cell.bottom.length, 0),
        mode: snapshot.mode, thumbnail: snapshot.coverAsset.thumb, assetIds: [...prepared.used], snapshot: prepared.encoded};
      await persistRecords([record, draftRecord(prepared, savedAt, {id, name})], prepared.used);
      applyLoadedProject(snapshot, {id, name});
      announce('saved', null, savedAt);
      document.dispatchEvent(new CustomEvent('savedprojectschange'));
      return metadata(record);
    });
  }

  function initialize() {
    if (initialization) return initialization;
    initialization = (async () => {
      announce('loading');
      unnamedBaselineFingerprint = fingerprint(captureProjectSnapshot());
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

  return {initialize, save, saveNamed, listSaved, loadNamed, exportFile, importFile,
    hasUnsavedChanges, getActive: () => activeProject && {...activeProject}, getStatus: () => ({...status})};
})();

function initializeProjectStorage() { return ProjectStorage.initialize(); }
function saveProjectDraft(options) { return ProjectStorage.save(options); }
function getProjectSaveStatus() { return ProjectStorage.getStatus(); }
function getActiveProject() { return ProjectStorage.getActive(); }
function hasUnsavedProjectChanges() { return ProjectStorage.hasUnsavedChanges(); }
function saveNamedProject(options) { return ProjectStorage.saveNamed(options); }
function listSavedProjects() { return ProjectStorage.listSaved(); }
function loadSavedProject(id) { return ProjectStorage.loadNamed(id); }
function exportProjectFile() { return ProjectStorage.exportFile(); }
function importProjectFile(file) { return ProjectStorage.importFile(file); }
