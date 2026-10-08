'use strict';

// Reordering claims gestures only on the small handles. The photos themselves
// keep native one-finger scrolling and the editor's two-finger crop gesture.
function attachStoryReorder(container, config) {
  let drag = null, frame = null;
  const bounds = entry => entry.rect ? entry.rect() : entry.element.getBoundingClientRect();
  const scrollElement = config.scrollElement || (() => {
    for (let parent = container.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
    }
    return document.scrollingElement;
  })();
  const items = () => config.items().filter(item => item.element.isConnected);
  function findTarget() {
    if (!drag) return null;
    const zones = config.zones().map(zone => ({...zone, box: bounds(zone)}));
    if (!zones.length) return null;
    const distance = box => Math.max(box.top - drag.y, 0, drag.y - box.bottom);
    zones.sort((a, b) => distance(a.box) - distance(b.box));
    const zone = zones[0], candidates = items().filter(item => item.side === zone.side).sort((a, b) => a.index - b.index);
    const next = candidates.find(item => {
      const box = item.element.getBoundingClientRect();
      return drag.y < box.top + box.height / 2;
    });
    const index = next ? next.index : candidates.length;
    const edge = next || candidates.at(-1), box = edge ? edge.element.getBoundingClientRect() : zone.box;
    return {side: zone.side, index, left: box.left, width: box.width, y: next ? box.top : edge ? box.bottom : box.top + box.height / 2};
  }
  function paint() {
    if (!drag?.active) return;
    drag.target = findTarget();
    drag.ghost.style.transform = `translate(${Math.round(drag.x + 12)}px,${Math.round(drag.y + 12)}px)`;
    if (drag.target) {
      const target = drag.target;
      Object.assign(drag.line.style, {left: target.left + 'px', top: target.y + 'px', width: target.width + 'px'});
      drag.line.hidden = false;
    } else drag.line.hidden = true;
  }
  function scroll() {
    frame = null;
    if (!drag?.active) return;
    const viewport = scrollElement === document.scrollingElement ? {top: 0, bottom: innerHeight} : scrollElement.getBoundingClientRect();
    const margin = Math.min(90, (viewport.bottom - viewport.top) / 5);
    const dy = drag.y < viewport.top + margin ? -Math.min(20, (viewport.top + margin - drag.y) / 4) : drag.y > viewport.bottom - margin ? Math.min(20, (drag.y - viewport.bottom + margin) / 4) : 0;
    if (dy) { scrollElement.scrollTop += dy; paint(); }
    frame = requestAnimationFrame(scroll);
  }
  function start(event) {
    const handle = event.target.closest?.('[data-story-drag]');
    if (!handle || !container.contains(handle) || event.button !== 0 || config.locked?.()) return;
    const item = items().find(item => item.element.contains(handle));
    if (!item) return;
    event.preventDefault(); event.stopImmediatePropagation();
    drag = {id: event.pointerId, item, handle, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, active: false};
    handle.setPointerCapture(event.pointerId);
  }
  function move(event) {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (config.locked?.()) { finish(false); return; }
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 5) {
      drag.active = true;
      drag.ghost = document.createElement('div'); drag.ghost.className = 'story-drag-ghost';
      drag.ghost.textContent = t('移动照片');
      drag.ghost.setAttribute('aria-hidden', 'true');
      drag.line = document.createElement('div'); drag.line.className = 'story-drop-line';
      drag.line.setAttribute('aria-hidden', 'true');
      // A dialog is in the top layer; put indicators inside it so they remain visible.
      (container.closest('dialog') || document.body).append(drag.ghost, drag.line);
      drag.item.element.classList.add('story-dragging');
      drag.handle.setAttribute('aria-pressed', 'true');
      config.onStart?.(drag.item);
      frame = requestAnimationFrame(scroll);
    }
    paint();
  }
  function finish(commit) {
    if (!drag) return;
    const previous = drag; drag = null;
    cancelAnimationFrame(frame); frame = null;
    previous.ghost?.remove(); previous.line?.remove();
    previous.item.element.classList.remove('story-dragging');
    previous.handle.removeAttribute('aria-pressed');
    if (previous.handle.hasPointerCapture?.(previous.id)) previous.handle.releasePointerCapture(previous.id);
    if (previous.active) config.onEnd?.();
    if (commit && previous.active && previous.target && !config.locked?.()) {
      const {side, index} = previous.target, from = previous.item;
      // Insertion indices refer to the list before removing the source photo.
      if (side === from.side && (index === from.index || index === from.index + 1)) return;
      Promise.resolve(config.move(from.side, from.index, side, index)).catch(error => {
        if (config.onError) config.onError(error); else if (typeof toast === 'function') toast(error.message);
      });
    }
  }
  function end(event) {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    finish(event.type === 'pointerup');
  }
  const locked = () => { if (config.locked?.()) finish(false); };
  const cancel = event => { if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopPropagation(); finish(false); } };
  const preventHandleClick = event => { if (event.target.closest?.('[data-story-drag]')) { event.preventDefault(); event.stopPropagation(); } };
  container.addEventListener('pointerdown', start, true);
  container.addEventListener('pointermove', move, true);
  container.addEventListener('pointerup', end, true);
  container.addEventListener('pointercancel', end, true);
  container.addEventListener('lostpointercapture', end, true);
  container.addEventListener('click', preventHandleClick, true);
  container.addEventListener('keydown', cancel, true);
  document.addEventListener('editorlockchange', locked);
  return function destroy() {
    finish(false);
    container.removeEventListener('pointerdown', start, true);
    container.removeEventListener('pointermove', move, true);
    container.removeEventListener('pointerup', end, true);
    container.removeEventListener('pointercancel', end, true);
    container.removeEventListener('lostpointercapture', end, true);
    container.removeEventListener('click', preventHandleClick, true);
    container.removeEventListener('keydown', cancel, true);
    document.removeEventListener('editorlockchange', locked);
  };
}
