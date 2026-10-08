'use strict';

// The image assets are immutable. History copies only editing metadata, so a
// gesture never duplicates its bitmap and deleted photos remain available to undo.
const PROJECT_HISTORY_LIMIT = 40;
const projectHistoryAssetIds = new WeakMap();
let projectHistoryAssetSerial = 0;
let projectHistorySerial = 0;
let projectHistoryEntries = [];
let projectHistoryIndex = -1;
let projectHistoryTransaction = null;
let projectHistoryPendingLabel = null;
let projectHistorySuspensionDepth = 0;
let historySuspended = false;

function cloneProjectValue(value) {
  if (Array.isArray(value)) return value.map(cloneProjectValue);
  if (!value || typeof value !== 'object') return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneProjectValue(item)]));
}

function captureProjectSnapshot() {
  const snapshot = {version: 1};
  for (const key of ['cover', 'coverAsset', 'isDefaultCover', 'defaultsInitialized', 'overflowBackground',
    'mode', 'gridGap', 'thumbWidth', 'zoom', 'x', 'y', 'paper', 'cells', 'overlayLayers', 'overflowCells']) {
    snapshot[key] = cloneProjectValue(state[key]);
  }
  snapshot.coverUploadDetails = typeof coverUploadDetails === 'undefined'
    ? null : cloneProjectValue(coverUploadDetails);
  snapshot.selection = {
    selected: state.selected,
    dragLayer: state.dragLayer,
    activeOverlayId: state.activeOverlayId,
    overflowSelection: [...state.overflowSelection]
  };
  return snapshot;
}

function historySuspend(callback) {
  projectHistorySuspensionDepth++;
  let result;
  try { result = callback(); }
  catch (error) { projectHistorySuspensionDepth--; throw error; }
  if (result && typeof result.then === 'function') {
    return Promise.resolve(result).finally(() => { projectHistorySuspensionDepth--; });
  }
  projectHistorySuspensionDepth--;
  return result;
}

function applyProjectSnapshot(snapshot, options = {}) {
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.cells) || snapshot.cells.length !== 9
    || !Array.isArray(snapshot.overflowCells) || snapshot.overflowCells.length !== 9
    || !Array.isArray(snapshot.overlayLayers)) {
    throw new Error('Invalid project snapshot');
  }
  return historySuspend(() => {
    const copy = cloneProjectValue(snapshot);
    for (const key of ['cover', 'coverAsset', 'isDefaultCover', 'defaultsInitialized', 'overflowBackground',
      'mode', 'gridGap', 'thumbWidth', 'zoom', 'x', 'y', 'paper', 'cells', 'overlayLayers', 'overflowCells']) {
      if (Object.hasOwn(copy, key)) state[key] = copy[key];
    }
    const selection = copy.selection || {};
    state.selected = Number.isInteger(selection.selected) && selection.selected >= 0 && selection.selected < 9
      ? selection.selected : Math.min(8, Math.max(0, state.selected || 0));
    state.dragLayer = selection.dragLayer === 'overlay' ? 'overlay' : 'cover';
    state.activeOverlayId = state.overlayLayers.some(layer => layer.id === selection.activeOverlayId)
      ? selection.activeOverlayId : state.overlayLayers.at(-1)?.id || null;
    state.overflowSelection = Array.isArray(selection.overflowSelection)
      ? [...new Set(selection.overflowSelection.filter(index => Number.isInteger(index) && index >= 0 && index < 9))]
      : Array.from({length: 9}, (_, index) => index);
    state.coverRevision = (state.coverRevision || 0) + 1;
    state.dirty = true;
    if (typeof coverUploadDetails !== 'undefined') coverUploadDetails = copy.coverUploadDetails || null;
    // IDs keep increasing even after undo, preventing collisions on a new branch.
    if (typeof overflowLayerSerial !== 'undefined') {
      for (const layer of state.overlayLayers) {
        const match = /^layer-(\d+)$/.exec(layer.id);
        if (match) overflowLayerSerial = Math.max(overflowLayerSerial, Number(match[1]));
      }
    }
    if (typeof layerSelectionRevision !== 'undefined') layerSelectionRevision++;
    if (options.refresh !== false && typeof refreshProjectUI === 'function') refreshProjectUI();
    return true;
  });
}

function projectSnapshotFingerprint(snapshot) {
  function valueKey(value) {
    if (Array.isArray(value)) return value.map(valueKey);
    if (!value || typeof value !== 'object') return value;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      if (!projectHistoryAssetIds.has(value)) projectHistoryAssetIds.set(value, ++projectHistoryAssetSerial);
      return {asset: projectHistoryAssetIds.get(value)};
    }
    const result = {};
    // Thumbnails are derived display assets, not independent editing changes.
    for (const key of Object.keys(value).sort()) if (key !== 'thumb') result[key] = valueKey(value[key]);
    return result;
  }
  const {selection, ...content} = snapshot;
  return JSON.stringify(valueKey(content));
}

function historyState() {
  const unavailable = historySuspended || projectHistorySuspensionDepth > 0 || state.locked || state.restoring || state.busy || state.importing > 0;
  return {
    entries: projectHistoryEntries.map(({id, labelKey, createdAt}) => ({id, labelKey, label: labelKey, createdAt})),
    current: projectHistoryIndex,
    canUndo: !unavailable && projectHistoryIndex > 0,
    canRedo: !unavailable && projectHistoryIndex >= 0 && projectHistoryIndex < projectHistoryEntries.length - 1
  };
}

function emitHistoryChange(reason = 'checkpoint') {
  const detail = {...historyState(), reason};
  document.dispatchEvent(new CustomEvent('historychange', {detail}));
  return detail;
}

function historyInit(labelKey = '初始状态') {
  projectHistoryTransaction = null;
  projectHistoryPendingLabel = null;
  const snapshot = captureProjectSnapshot();
  projectHistoryEntries = [{id: ++projectHistorySerial, labelKey, createdAt: Date.now(), snapshot,
    fingerprint: projectSnapshotFingerprint(snapshot)}];
  projectHistoryIndex = 0;
  return emitHistoryChange('init');
}

function historyCheckpoint(labelKey = '调整作品') {
  if (historySuspended || projectHistorySuspensionDepth > 0) return false;
  if (state.importing > 0) { projectHistoryPendingLabel = labelKey; return false; }
  if (projectHistoryTransaction) {
    // Explicit begin/end gives a continuous slider or drag exactly one entry.
    if (!projectHistoryTransaction.labelKey) projectHistoryTransaction.labelKey = labelKey;
    return false;
  }
  if (projectHistoryIndex < 0) { historyInit(labelKey); return true; }
  const snapshot = captureProjectSnapshot(), fingerprint = projectSnapshotFingerprint(snapshot);
  const current = projectHistoryEntries[projectHistoryIndex];
  if (current.fingerprint === fingerprint) return false;
  projectHistoryEntries.splice(projectHistoryIndex + 1);
  projectHistoryEntries.push({id: ++projectHistorySerial, labelKey, createdAt: Date.now(), snapshot, fingerprint});
  if (projectHistoryEntries.length > PROJECT_HISTORY_LIMIT) {
    projectHistoryEntries.splice(0, projectHistoryEntries.length - PROJECT_HISTORY_LIMIT);
  }
  projectHistoryIndex = projectHistoryEntries.length - 1;
  emitHistoryChange('checkpoint');
  return true;
}

// Imports may resolve one asset at a time. Record only the completed batch,
// after the app has returned its importing counter to zero.
function historyFlushPending() {
  if (state.importing > 0 || projectHistoryPendingLabel === null) return false;
  const labelKey = projectHistoryPendingLabel;
  projectHistoryPendingLabel = null;
  return historyCheckpoint(labelKey);
}

function historyBegin(labelKey = '调整作品') {
  if (historySuspended || projectHistorySuspensionDepth > 0) return false;
  if (projectHistoryIndex < 0) historyInit();
  if (projectHistoryTransaction) { projectHistoryTransaction.depth++; return true; }
  // Capture a previously unrecorded edit before starting another gesture.
  historyCheckpoint('调整作品');
  projectHistoryTransaction = {labelKey, depth: 1};
  return true;
}

function historyEnd() {
  if (!projectHistoryTransaction) return false;
  projectHistoryTransaction.depth--;
  if (projectHistoryTransaction.depth > 0) return false;
  const {labelKey} = projectHistoryTransaction;
  projectHistoryTransaction = null;
  return historyCheckpoint(labelKey || '调整作品');
}

function historyGoTo(index) {
  if (historySuspended || projectHistorySuspensionDepth > 0 || state.locked || state.restoring || state.busy || state.importing > 0) return false;
  if (!Number.isInteger(index) || index < 0 || index >= projectHistoryEntries.length) return false;
  const target = projectHistoryEntries[index];
  if (projectHistoryTransaction) {
    const {labelKey} = projectHistoryTransaction;
    projectHistoryTransaction = null;
    historyCheckpoint(labelKey || '调整作品');
    index = projectHistoryEntries.findIndex(entry => entry.id === target.id);
    if (index < 0) return false;
  }
  if (index === projectHistoryIndex) return false;
  applyProjectSnapshot(projectHistoryEntries[index].snapshot);
  projectHistoryIndex = index;
  emitHistoryChange('restore');
  return true;
}

function historyUndo() {
  if (state.locked || state.restoring || state.busy || state.importing > 0) return false;
  if (projectHistoryTransaction) {
    projectHistoryTransaction.depth = 1;
    historyEnd();
  }
  return historyGoTo(projectHistoryIndex - 1);
}

function historyRedo() {
  if (state.locked || state.restoring || state.busy || state.importing > 0) return false;
  if (projectHistoryTransaction) {
    projectHistoryTransaction.depth = 1;
    historyEnd();
  }
  return historyGoTo(projectHistoryIndex + 1);
}
