'use strict';

// Feedback is a manual GitHub Issue. No photos, filenames, source URLs, or
// application state leave this browser until the user submits the GitHub form.
const BugFeedback = (() => {
  const ISSUE_URL = 'https://github.com/JevonsCode/JevonsCode.github.io/issues/new';
  const recentErrors = [];
  let bound = false;

  function projectState() {
    try { return typeof state === 'undefined' ? null : state; } catch { return null; }
  }
  function optional(callback, fallback = null) {
    try { return callback() ?? fallback; } catch { return fallback; }
  }
  function number(value) { return Number.isFinite(value) ? Math.round(value * 10000) / 10000 : null; }
  function safeText(value, limit = 400) {
    let text;
    try { text = typeof value === 'string' ? value : String(value ?? ''); } catch { text = '[unavailable]'; }
    const current = projectState(), filenames = [];
    if (current?.coverAsset?.name && !current.isDefaultCover) filenames.push(current.coverAsset.name);
    for (const layer of current?.overlayLayers || []) if (!layer.nameKey && layer.name) filenames.push(layer.name);
    for (const cell of current?.cells || []) for (const photo of [...(cell.top || []), ...(cell.bottom || []), cell.fill?.top, cell.fill?.bottom]) {
      if (photo?.name && !photo.nameKey) filenames.push(photo.name);
    }
    for (const filename of filenames) text = text.split(filename).join('[photo]');
    text = text.replace(/(?:blob|data):[^\s)\]>]+/gi, '[image source]')
      .replace(/https?:\/\/[^\s)\]>]+/gi, value => {
        try {
          const url = new URL(value);
          // Stack locations from this app are useful without any query/hash.
          return url.origin === location.origin && /\.(?:js|html)(?::\d+){0,2}$/.test(url.pathname)
            ? url.origin + url.pathname : '[url]';
        } catch { return '[url]'; }
      })
      .replace(/[^\s/\\:<>"']+\.(?:jpe?g|png|webp|heic)(?:\b|$)/gi, '[photo]')
      .replace(/(?:[a-z]:\\|\/Users\/|\/home\/)[^\n]+/gi, '[local path]');
    return text.slice(0, limit);
  }
  function recordError(kind, error, detail = {}) {
    const name = optional(() => error?.name, null);
    const message = optional(() => error?.message, error);
    const stack = optional(() => error?.stack, '');
    recentErrors.push({
      at: new Date().toISOString(), kind, name: safeText(name || 'Error', 80),
      message: safeText(message || 'Unknown error'),
      stack: safeText(stack, 1000).split('\n').slice(0, 6).join('\n'),
      line: number(detail.line), column: number(detail.column), resource: detail.resource || null
    });
    if (recentErrors.length > 20) recentErrors.shift();
  }
  // Register immediately, including failures that happen during startup.
  window.addEventListener('error', event => {
    if (event.target && event.target !== window) {
      recordError('resource', new Error('A resource did not load'), {resource: event.target.tagName?.toLowerCase() || 'unknown'});
    } else recordError('error', event.error || event.message, {line: event.lineno, column: event.colno});
  }, true);
  window.addEventListener('unhandledrejection', event => recordError('unhandledrejection', event.reason));

  function imageStatus(image) {
    if (!image) return {present: false, ready: false, encodedAvailable: false};
    const naturalWidth = number(image.naturalWidth ?? image.width), naturalHeight = number(image.naturalHeight ?? image.height);
    const source = optional(() => image.currentSrc || image.src, '');
    const encodedBlob = optional(() => typeof assetBlobs !== 'undefined' && assetBlobs.has(image), false);
    return {
      present: true, type: image.tagName?.toLowerCase() || 'unknown',
      complete: typeof image.complete === 'boolean' ? image.complete : null,
      ready: naturalWidth > 0 && naturalHeight > 0 && image.complete !== false,
      naturalWidth, naturalHeight, width: number(image.width), height: number(image.height),
      encodedAvailable: !!(encodedBlob || source && !source.startsWith('blob:')), retainedBlob: !!encodedBlob, sourcePresent: !!source,
      sourceKind: source.startsWith('blob:') ? 'local-blob' : source.startsWith('data:') ? 'local-data' : source ? 'asset' : 'none'
    };
  }
  function transform(value) {
    return value ? {x: number(value.x), y: number(value.y), scale: number(value.scale ?? value.zoom)} : null;
  }
  function photoStatus(photo) {
    if (!photo) return null;
    return {image: imageStatus(photo.img), crop: photo.edit ? {
      zoom: number(photo.edit.zoom), x: number(photo.edit.x), y: number(photo.edit.y), frame: number(photo.edit.frame)
    } : null};
  }
  function snapshot() {
    const current = projectState() || {}, history = optional(() => historyState(), {entries: [], current: -1});
    const save = optional(() => getProjectSaveStatus(), {});
    const activeProject = optional(() => getActiveProject(), {});
    const diagnostics = optional(() => overflowLayerDiagnostics(), []);
    const extraLayers = Array.isArray(diagnostics) ? diagnostics : Array.isArray(diagnostics?.layers) ? diagnostics.layers : [];
    const release = document.querySelector('meta[name="app-release"]')?.content ||
      optional(() => typeof APP_RELEASE === 'undefined' ? null : APP_RELEASE) ||
      optional(() => window.JIANXIANG_RELEASE || window.app?.release, 'unknown');
    const offline = optional(() => ({supported: appPWA.supported, ready: appPWA.ready,
      hasController: !!navigator.serviceWorker?.controller, waitingUpdate: !!appPWA.registration?.waiting}), null);
    return {
      schema: 'jianxiang-feedback-v1', generatedAt: new Date().toISOString(),
      app: {release: safeText(release, 80), url: location.origin + location.pathname, language: optional(() => I18n.language, document.documentElement.lang)},
      browser: {userAgent: safeText(navigator.userAgent, 600), platform: safeText(navigator.platform, 100),
        online: navigator.onLine, standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
        viewport: {width: innerWidth, height: innerHeight, visualWidth: number(window.visualViewport?.width), visualHeight: number(window.visualViewport?.height)},
        devicePixelRatio: number(devicePixelRatio), visibility: document.visibilityState},
      editing: {mode: current.mode || null, locked: !!current.locked, importing: current.importing || 0, restoring: !!current.restoring,
        selectedTile: Number.isInteger(current.selected) ? current.selected + 1 : null, dragLayer: current.dragLayer || null,
        activeOverlayIndex: (current.overlayLayers || []).findIndex(layer => layer.id === current.activeOverlayId),
        selectedOverflowTiles: (current.overflowSelection || []).map(index => index + 1),
        cover: {image: imageStatus(current.cover), default: !!current.isDefaultCover, zoom: number(current.zoom), x: number(current.x), y: number(current.y)},
        gridGap: number(current.gridGap), thumbnailWidth: number(current.thumbWidth), defaultsInitialized: !!current.defaultsInitialized,
        overflowBackground: imageStatus(current.overflowBackground),
        overflowTiles: (current.overflowCells || []).map((cell, index) => ({tile: index + 1, enabled: !!cell.enabled,
          insets: Object.fromEntries(['top', 'right', 'bottom', 'left'].map(edge => [edge, number(cell.insets?.[edge])]))})),
        overlays: (current.overlayLayers || []).map((layer, index) => {
          const diagnostic = extraLayers.find(item => item.id === layer.id || item.index === index) || {};
          return {index, kind: layer.kind === 'default' ? 'default' : 'upload',
            defaultName: layer.kind === 'default' && ['呐喊人物 · 默认', 'DEATH SCREAMING · 默认文字'].includes(layer.nameKey) ? layer.nameKey : null,
            visible: !!layer.visible, loading: !!layer.loading, image: imageStatus(layer.image),
            transforms: Array.from({length: 9}, (_, tile) => transform(layer.cells?.[tile])),
            condition: ['hidden','loading','unavailable','empty','disabled','outside','ready'].includes(diagnostic.condition) ? diagnostic.condition : null,
            contentBounds: diagnostic.contentBounds ? Object.fromEntries(['x','y','w','h'].map(key => [key, number(diagnostic.contentBounds[key])])) : null,
            tileVisibility: Array.from({length: 9}, (_, tile) => {
              const item = diagnostic.cells?.[tile];
              return item ? {tile: tile + 1, enabled: !!item.enabled, intersectsTile: !!item.intersectsTile,
                effectiveBounds: item.effectiveBounds ? Object.fromEntries(['x','y','w','h'].map(key => [key, number(item.effectiveBounds[key])])) : null} : null;
            }),
            recovery: {attempts: number(diagnostic.recoveryAttempts ?? diagnostic.attempts), error: typeof diagnostic.error === 'string' ? safeText(diagnostic.error) : null}};
        }),
        photos: (current.cells || []).map((cell, index) => ({tile: index + 1, above: (cell.top || []).map(photoStatus), below: (cell.bottom || []).map(photoStatus),
          filler: {above: photoStatus(cell.fill?.top), below: photoStatus(cell.fill?.bottom)}}))},
      storage: {status: safeText(save.status || 'unknown', 60), savedAt: save.savedAt || null,
        error: typeof save.error === 'string' ? safeText(save.error, 100) : null,
        namedProject: !!(activeProject.id || activeProject.projectId)},
      history: {current: history.current, length: history.entries?.length || 0,
        recent: (history.entries || []).slice(Math.max(0, history.current - 9), history.current + 1).map(entry => ({label: safeText(entry.labelKey, 100), at: entry.createdAt || null}))},
      offline,
      recentErrors: recentErrors.slice(-10).map(entry => ({...entry, message: safeText(entry.message), stack: safeText(entry.stack, 1000)}))
    };
  }

  function issueBody(report, description) {
    const editing = report.editing, compact = {
      version: report.app.release, language: report.app.language, page: report.app.url,
      browser: report.browser.userAgent, viewport: report.browser.viewport, dpr: report.browser.devicePixelRatio,
      online: report.browser.online, standalone: report.browser.standalone,
      mode: editing.mode, locked: editing.locked, selectedTile: editing.selectedTile, dragLayer: editing.dragLayer,
      cover: editing.cover, background: editing.overflowBackground,
      storage: report.storage, offline: report.offline,
      photos: editing.photos.map(cell => [cell.above.length, cell.below.length]),
      overflow: editing.overflowTiles.map(cell => [cell.enabled, ...['top','right','bottom','left'].map(edge => cell.insets[edge])]),
      overlayCount: editing.overlays.length,
      overlays: editing.overlays.slice(0, 8).map(layer => ({index: layer.index, kind: layer.kind, visible: layer.visible,
        loading: layer.loading, condition: layer.condition, image: layer.image,
        transforms: layer.transforms.map(value => value && [value.x,value.y,value.scale])})),
      history: report.history.recent.map(entry => entry.label),
      errors: report.recentErrors.slice(-3).map(entry => ({kind: entry.kind, name: entry.name, message: entry.message.slice(0, 160)}))
    };
    let body = `## ${t('遇到了什么问题？')}\n${description.trim().slice(0, 1200) || t('请补充操作步骤和预期结果。')}\n\n## ${t('诊断摘要')}\n\`\`\`json\n${JSON.stringify(compact)}\n\`\`\`\n\n${t('如需更完整的诊断，可下载报告后附到这个 Issue。报告不含照片内容和上传文件名。')}`;
    // Keep the URL comfortable for mobile browsers. The full local JSON always
    // retains every tile, photograph state, and overlay transform.
    while (encodeURIComponent(body).length > 7200 && compact.overlays.length > 1) {
      compact.overlays.pop();
      body = `## ${t('遇到了什么问题？')}\n${description.trim().slice(0, 1200) || t('请补充操作步骤和预期结果。')}\n\n## ${t('诊断摘要')}\n\`\`\`json\n${JSON.stringify(compact)}\n\`\`\`\n\n${t('如需更完整的诊断，可下载报告后附到这个 Issue。报告不含照片内容和上传文件名。')}`;
    }
    if (encodeURIComponent(body).length > 7200) {
      compact.browser = compact.browser.slice(0, 180);compact.errors = [];compact.history = [];compact.overlays = [];
      body = `## ${t('遇到了什么问题？')}\n${description.trim().slice(0, 500) || t('请补充操作步骤和预期结果。')}\n\n## ${t('诊断摘要')}\n\`\`\`json\n${JSON.stringify(compact)}\n\`\`\`\n\n${t('如需更完整的诊断，可下载报告后附到这个 Issue。报告不含照片内容和上传文件名。')}`;
    }
    return body;
  }
  function issueURL(report, description = '') {
    const url = new URL(ISSUE_URL);
    url.searchParams.set('title', `[Jianxiang ${report.app.release}] ${t('问题反馈')}`);
    url.searchParams.set('body', issueBody(report, description));
    return url.href;
  }
  function translate(element, key) { element.dataset.i18n = key;element.textContent = t(key);return element; }
  function diagnosticSummary(report) {
    const count = report.editing.photos.reduce((sum, cell) => sum + cell.above.length + cell.below.length, 0);
    return `${t('版本')} ${report.app.release} · ${t('{count} 层', {count: report.editing.overlays.length})} · ${t('{count} 张照片', {count})}`;
  }
  function show() {
    if (projectState()?.busy) return;
    let report = snapshot();
    const content = document.createElement('div');content.className = 'modal-content feedback-dialog';
    const intro = translate(document.createElement('p'), '报告包含设备、编辑参数和最近错误，不含照片内容、上传文件名和私人链接参数。');intro.className = 'hint';
    const label = translate(document.createElement('label'), '遇到了什么问题？');label.htmlFor = 'bugDescription';
    const input = document.createElement('textarea');input.id = 'bugDescription';input.rows = 4;input.maxLength = 1200;
    input.placeholder = t('例如：锁定后仍能拖动缩放条。请描述操作步骤。');input.dataset.i18nPlaceholder = '例如：锁定后仍能拖动缩放条。请描述操作步骤。';
    input.style.cssText = 'display:block;width:100%;box-sizing:border-box;resize:vertical;min-height:100px;margin:10px 0 18px;padding:12px;border:1px solid #dedee3;border-radius:10px;font:inherit;color:inherit;background:var(--surface,#fff)';
    const details = document.createElement('details');details.className = 'feedback-diagnostics';
    const summary = translate(document.createElement('summary'), '查看诊断摘要');
    const status = document.createElement('p');status.className = 'hint';status.id = 'bugReportSummary';status.textContent = diagnosticSummary(report);
    const pre = document.createElement('pre');pre.id = 'bugReportDetails';pre.textContent = JSON.stringify(report, null, 2);
    pre.style.cssText = 'max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.6;background:#f6f6f8;padding:12px;border-radius:8px';
    details.append(summary, status, pre);
    const note = translate(document.createElement('p'), '反馈会打开 GitHub，需要登录并点击提交。开发者可在仓库 Issues 中查看；提交前仍可编辑内容。');note.className = 'hint';
    const actions = document.createElement('div');actions.className = 'modal-actions';actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px';
    const save = translate(document.createElement('button'), '下载诊断报告');save.className = 'btn secondary';save.type = 'button';save.id = 'downloadBugReport';
    const open = translate(document.createElement('a'), '到 GitHub 提交反馈');open.className = 'btn primary';open.id = 'submitBugReport';open.target = '_blank';open.rel = 'noopener noreferrer';open.href = issueURL(report);
    input.addEventListener('input', () => {open.href = issueURL(report, input.value);});
    open.addEventListener('click', () => {report = snapshot();open.href = issueURL(report, input.value);status.textContent = diagnosticSummary(report);pre.textContent = JSON.stringify(report, null, 2);});
    save.onclick = () => {
      report = snapshot();pre.textContent = JSON.stringify(report, null, 2);status.textContent = diagnosticSummary(report);
      const file = {...report, description: input.value.trim()};
      download(new Blob([JSON.stringify(file, null, 2)], {type: 'application/json'}), `jianxiang-diagnostics-${new Date().toISOString().slice(0, 10)}.json`);
      toast(t('诊断报告已下载到本机，尚未上传。'));
    };
    actions.append(save, open);content.append(intro, label, input, details, note, actions);
    showModal(t('问题反馈'), content);
  }
  function bind() {
    const button = document.getElementById('bugReportBtn');if (button) button.onclick = show;
    if (bound) return;bound = true;
    document.addEventListener('languagechange', () => {
      const input = document.getElementById('bugDescription');if (!input) return;
      document.getElementById('modalTitle').textContent = t('问题反馈');
      input.placeholder = t('例如：锁定后仍能拖动缩放条。请描述操作步骤。');
      document.getElementById('bugReportSummary').textContent = diagnosticSummary(snapshot());
      document.getElementById('submitBugReport').href = issueURL(snapshot(), input.value);
    });
  }
  return {snapshot, show, bind, issueURL};
})();

function bindBugReport() { BugFeedback.bind(); }
function showBugReport() { BugFeedback.show(); }
function createBugReport() { return BugFeedback.snapshot(); }
