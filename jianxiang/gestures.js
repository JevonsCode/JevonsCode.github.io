'use strict';

let coverGestureUntil = 0;

// Pointer gestures share the same normalized transforms as sliders and export.
// Pinch keeps the image point under the fingers fixed, rather than zooming around its center.
function attachImageGestures(element, options) {
  const points = new Map();
  let start = null, tapCandidate = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function begin() {
    const image = options.image();
    if (!image || !points.size) { start = null; return; }
    const box = options.frameRect?.() || element.getBoundingClientRect();
    const positions = [...points.values()];
    const midpoint = positions.length > 1 ? {x:(positions[0].x+positions[1].x)/2,y:(positions[0].y+positions[1].y)/2} : positions[0];
    const transform = options.read();
    const kind = options.kind?.() || 'crop';
    const scale = (kind === 'overlay' ? box.width / image.width : Math.max(box.width / image.width, box.height / image.height)) * transform.zoom;
    const width = image.width * scale, height = image.height * scale;
    const left = kind === 'overlay' ? transform.x * box.width - width / 2 : (box.width - width) / 2 + transform.x * (width - box.width) / 2;
    const top = kind === 'overlay' ? transform.y * box.height - height / 2 : (box.height - height) / 2 + transform.y * (height - box.height) / 2;
    start = {box, transform, kind, width, height, left, top, midpoint, count:positions.length,
      distance:positions.length>1 ? Math.hypot(positions[0].x-positions[1].x,positions[0].y-positions[1].y) : 0,
      anchorX:(midpoint.x-box.left-left)/width,anchorY:(midpoint.y-box.top-top)/height};
  }
  element.addEventListener('pointerdown', event => {
    if (options.scrollWithOneFinger && event.pointerType === 'touch') return;
    if (event.button !== 0 || !options.image()) return;
    if(!points.size)tapCandidate={id:event.pointerId,target:event.target,x:event.clientX,y:event.clientY};else tapCandidate=null;
    points.set(event.pointerId, {x:event.clientX,y:event.clientY});
    const captureTarget=event.target instanceof Element?event.target:element;
    captureTarget.setPointerCapture(event.pointerId);
    if (points.size > 1) options.onGesture?.();
    begin();
  });
  element.addEventListener('pointermove', event => {
    if (options.scrollWithOneFinger && event.pointerType === 'touch') return;
    if (!points.has(event.pointerId) || !start) return;
    if(tapCandidate&&Math.hypot(event.clientX-tapCandidate.x,event.clientY-tapCandidate.y)>4)tapCandidate=null;
    points.set(event.pointerId, {x:event.clientX,y:event.clientY});
    move();
  });
  function move() {
    const positions = [...points.values()];
    if (positions.length !== start.count) { begin(); return; }
    const midpoint = positions.length>1 ? {x:(positions[0].x+positions[1].x)/2,y:(positions[0].y+positions[1].y)/2} : positions[0];
    const dx=midpoint.x-start.midpoint.x,dy=midpoint.y-start.midpoint.y;
    let zoom=start.transform.zoom;
    if (positions.length>1 && start.distance>0) {
      const distance=Math.hypot(positions[0].x-positions[1].x,positions[0].y-positions[1].y);
      const [min,max]=options.zoomRange?.()||[1,4];
      zoom=clamp(start.transform.zoom*distance/start.distance,min,max);
    }
    if (Math.hypot(dx,dy)>3 || positions.length>1) { options.onGesture?.(); element.classList.add('dragging'); }
    const factor=zoom/start.transform.zoom;
    const width=start.width*factor,height=start.height*factor;
    const left=positions.length>1 ? midpoint.x-start.box.left-start.anchorX*width : start.left+dx;
    const top=positions.length>1 ? midpoint.y-start.box.top-start.anchorY*height : start.top+dy;
    let x,y;
    if (start.kind==='overlay') {
      x=clamp((left+width/2)/start.box.width,0,1);
      y=clamp((top+height/2)/start.box.height,0,1);
    } else {
      x=width-start.box.width>.1 ? clamp(2*(left+(width-start.box.width)/2)/(width-start.box.width),-1,1) : 0;
      y=height-start.box.height>.1 ? clamp(2*(top+(height-start.box.height)/2)/(height-start.box.height),-1,1) : 0;
    }
    options.write({zoom,x,y});
  }
  function end(event) {
    if (options.scrollWithOneFinger && event.pointerType === 'touch') return;
    const tapped=event.type==='pointerup'&&tapCandidate?.id===event.pointerId?tapCandidate.target:null;
    tapCandidate=null;
    points.delete(event.pointerId);
    if (points.size) begin();
    else { start=null; element.classList.remove('dragging'); }
    if(tapped)options.onTap?.(tapped);
  }
  element.addEventListener('pointerup',end);
  element.addEventListener('pointercancel',end);
  element.addEventListener('lostpointercapture',end);
  if (options.scrollWithOneFinger) {
    let firstTouch=null,scrolling=false;
    const insideTouches=event=>[...event.touches].filter(touch=>element.contains(touch.target));
    const syncTouches=event=>{
      points.clear();
      for(const touch of insideTouches(event))points.set(touch.identifier,{x:touch.clientX,y:touch.clientY});
    };
    const clearTouchGesture=()=>{points.clear();start=null;element.classList.remove('dragging');};
    element.addEventListener('touchstart',event=>{
      const touches=insideTouches(event);
      if(touches.length===1){
        const touch=touches[0];firstTouch={x:touch.clientX,y:touch.clientY};scrolling=false;
        clearTouchGesture();return;
      }
      if(touches.length<2||scrolling||!options.image()||!event.cancelable)return;
      // Claim only a two-finger gesture, before the browser starts scrolling.
      event.preventDefault();syncTouches(event);begin();
    },{passive:false});
    element.addEventListener('touchmove',event=>{
      const touches=insideTouches(event);
      if(touches.length<2){
        const touch=touches[0];
        if(touch&&firstTouch&&Math.hypot(touch.clientX-firstTouch.x,touch.clientY-firstTouch.y)>8)scrolling=true;
        return;
      }
      if(!start||scrolling||!event.cancelable){clearTouchGesture();return;}
      event.preventDefault();syncTouches(event);move();
    },{passive:false});
    element.addEventListener('touchend',event=>{
      const touches=insideTouches(event);
      if(touches.length<2){clearTouchGesture();firstTouch=null;scrolling=touches.length>0;}
      else if(start){syncTouches(event);begin();}
    });
    element.addEventListener('touchcancel',()=>{clearTouchGesture();firstTouch=null;scrolling=false;});
  }
  element.addEventListener('wheel',event=>{
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const transform=options.read(),[min,max]=options.zoomRange?.()||[1,4];
    options.write({...transform,zoom:clamp(transform.zoom*Math.exp(-event.deltaY*.01),min,max)});
    options.onGesture?.();
  },{passive:false});
}

function syncDragLayers() {
  $('#dragLayers').hidden = state.mode !== 'overflow';
  if (!activeOverflowFigure()) state.dragLayer = 'cover';
  $('.canvas-caption span:last-child').textContent=state.mode==='overflow'&&state.dragLayer==='overlay'?t('拖动当前图层 · 双指缩放'):t('单指拖动 · 双指缩放 · 轻点选格');
  for (const button of $$('[data-drag-layer]')) {
    const active = button.dataset.dragLayer === state.dragLayer;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
    if (button.dataset.dragLayer === 'overlay') button.disabled = !activeOverflowFigure();
  }
}

function bindCoverGestures() {
  const overlay = () => state.mode === 'overflow' && state.dragLayer === 'overlay' && activeOverflowFigure();
  $$('[data-drag-layer]').forEach(button=>button.onclick=()=>{state.dragLayer=button.dataset.dragLayer;syncDragLayers();});
  attachImageGestures($('#coverGrid'), {
    image:()=>overlay() ? activeOverflowFigure().image : state.cover,
    kind:()=>overlay() ? 'overlay' : 'crop',
    zoomRange:()=>overlay() ? [.05,2] : [1,4],
    read:()=>overlay() ? {zoom:activeOverflowFigure().scale,x:activeOverflowFigure().x,y:activeOverflowFigure().y} : {zoom:state.zoom,x:state.x,y:state.y},
    write:transform=>{
      if(overlay()) {
        writeOverflowGesture(transform);
      } else {
        state.zoom=transform.zoom;state.x=transform.x;state.y=transform.y;
        $('#zoom').value=Math.round(transform.zoom*100);$('#zoomValue').textContent=Math.round(transform.zoom*100)+'%';$('#posX').value=Math.round(transform.x*100);$('#posY').value=Math.round(transform.y*100);
      }
      requestRender();
    },
    onGesture:()=>{coverGestureUntil=Date.now()+450;},
    onTap:target=>{if(overlay()){coverGestureUntil=Date.now()+450;return;}const cell=target.closest('.cover-cell');if(!cell)return;coverGestureUntil=Date.now()+450;selectCell(Number(cell.dataset.index));if(innerWidth<=620)$('.story').scrollIntoView({behavior:'smooth',block:'start'});}
  });
}
