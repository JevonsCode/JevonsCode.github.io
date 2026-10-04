'use strict';

let cropEditorRequest = 0;
const clampCrop = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));

function renderPaddingControls(cell, geometry) {
  let visible = false;
  for (const side of ['top', 'bottom']) {
    const region = geometry.padding[side];
    const area = $('#'+side+'FillArea');
    const content = $('#'+side+'FillContent');
    const fill = paddingPhoto(cell, side);
    const show = region.h > 0 || !!cell.fill?.[side];
    area.hidden = !show;
    visible ||= show;
    content.replaceChildren();
    $('#'+side+'FillSize').textContent = region.h ? `高 ${region.h} px` : '当前无需填补';
    if (fill) {
      const row = document.createElement('div');
      row.className = 'fill-photo';
      const img = document.createElement('img');
      img.src = fill.photo.thumb;
      img.alt = '';
      const label = document.createElement('span');
      label.className = 'fill-photo-label';
      const title = document.createElement('strong');
      title.textContent = fill.automatic ? '自动使用相邻照片' : fill.photo.name;
      const caption = document.createElement('small');
      caption.textContent = fill.automatic ? '可换成另一张，单独调整取景' : '只填补空缺，不改变长图高度';
      label.append(title, caption);
      const edit = document.createElement('button');
      edit.className = 'photo-adjust';
      edit.textContent = '调整';
      edit.disabled = region.h <= 0;
      edit.setAttribute('aria-label', `调整${side === 'top' ? '上方' : '底部'}填充图片`);
      edit.onclick = () => openPhotoEditor(state.selected, side, null, true);
      row.append(img, label, edit);
      content.append(row);
      if (!fill.automatic) {
        const clear = document.createElement('button');
        clear.className = 'text-btn fill-clear';
        clear.textContent = side === 'top' ? '恢复使用相邻照片' : '恢复底部留白';
        clear.onclick = () => {
          if (cell.fill[side].src) URL.revokeObjectURL(cell.fill[side].src);
          cell.fill[side] = null;
          cell.fillEdits[side] = null;
          state.dirty = true;
          renderStory();
        };
        content.append(clear);
      }
    } else {
      const note = document.createElement('p');
      note.className = 'fill-empty';
      note.textContent = '保留底色，或选一张照片填满。';
      content.append(note);
    }
  }
  $('#paddingEditor').hidden = !visible;
}

function bindPaddingInputs() {
  for (const side of ['top', 'bottom']) {
    $('#'+side+'FillInput').onchange = async (event) => {
      const input = event.target;
      const file = input.files[0];
      if (!file) return;
      const cell = state.cells[state.selected];
      importStatus(1);
      try {
        const photo = await readPhoto(file);
        if (cell.fill[side]?.src) URL.revokeObjectURL(cell.fill[side].src);
        cell.fill[side] = photo;
        cell.fillEdits[side] = null;
        state.dirty = true;
        renderStory();
        toast('已添加填充图片，可点「调整」修改取景。');
      } catch (error) {
        toast(error.message);
      } finally {
        importStatus(-1);
        input.value = '';
      }
    };
  }
}

async function openPhotoEditor(cellIndex, side, photoIndex, isFill = false) {
  if (state.importing) { toast('照片读取中，请稍等。'); return; }
  const request = ++cropEditorRequest;
  const cell = state.cells[cellIndex];
  const fill = isFill ? paddingPhoto(cell, side) : null;
  const photo = isFill ? fill?.photo : cell[side][photoIndex];
  if (!photo) return;
  let img;
  try { img = photo.img || await loadImage(photo.src); }
  catch (error) { toast(error.message); return; }
  if (request !== cropEditorRequest || state.selected !== cellIndex) return;
  let draft = isFill ? { ...fill.edit } : photoEdit(photo);
  const wrap = document.createElement('div');
  wrap.className = 'modal-content crop-editor';
  wrap.innerHTML = `
    <p class="preview-caption">单指拖动，双指缩放。画框外会裁掉，只修改当前这张图片。</p>
    <div class="crop-stage"><canvas id="cropCanvas" tabindex="0" aria-label="照片取景框，可拖动图片或使用方向键调整位置"></canvas></div>
    <div class="crop-meta"><span>画框内即最终效果</span><span id="cropFrameSize"></span></div>
    <div class="control"><label for="photoZoom">图片缩放 <output id="photoZoomValue"></output></label><input id="photoZoom" type="range" min="100" max="400" value="100"></div>
    <div class="position-controls"><div class="control"><label for="photoX">左右位置</label><input id="photoX" type="range" min="-100" max="100" value="0"></div><div class="control"><label for="photoY">上下位置</label><input id="photoY" type="range" min="-100" max="100" value="0"></div></div>
    <div class="crop-frame-control" ${isFill ? 'hidden' : ''}>
      <label for="photoFrame">画框比例</label><select id="photoFrame"><option value="original">原图比例</option><option value="1">方形 1:1</option><option value="0.75">横向 4:3</option><option value="1.3333333333333333">竖向 3:4</option><option value="0.5625">横向 16:9</option><option value="custom">自定义高度</option></select>
    </div>
    <div id="photoHeightControl" class="control" hidden><label for="photoHeight">画框高度 <output id="photoHeightValue"></output></label><input id="photoHeight" type="range" min="25" max="300" value="100"></div>
    <p class="crop-detail" id="cropDetail"></p>
    <div class="modal-actions crop-actions"><button id="resetPhotoCrop" class="text-btn">重置这张图片</button><div><button id="cancelPhotoCrop" class="btn secondary">取消</button><button id="applyPhotoCrop" class="btn primary">应用调整</button></div></div>`;
  showModal(isFill ? '调整填充图片' : '调整这张照片', wrap);
  const preview = $('#cropCanvas');
  const zoom = $('#photoZoom'), px = $('#photoX'), py = $('#photoY');
  const frameSelect = $('#photoFrame'), height = $('#photoHeight');
  function syncControls() {
    zoom.value = Math.round(draft.zoom * 100);
    px.value = Math.round(draft.x * 100); py.value = Math.round(draft.y * 100);
    const preset = [...frameSelect.options].find(option => Number(option.value) === draft.frame);
    frameSelect.value = draft.frame == null ? 'original' : preset ? preset.value : 'custom';
    height.value = Math.round(clampCrop(draft.frame || photoAspect(photo), .25, 3) * 100);
    $('#photoHeightControl').hidden = isFill || frameSelect.value !== 'custom';
  }
  function paint() {
    const geometry = layout(cell, 720, isFill ? null : {photo, edit:draft});
    const frameHeight = isFill ? geometry.padding[side].h : geometry[side].sizes[cell[side].indexOf(photo)];
    const ratio = Math.max(1, frameHeight) / 720;
    preview.width = 480;
    preview.height = Math.max(1, Math.round(480 * ratio));
    preview.style.width = Math.min(480, (innerWidth<=620?220:300) / ratio) + 'px';
    const context = preview.getContext('2d');
    context.fillStyle = state.paper;
    context.fillRect(0, 0, preview.width, preview.height);
    drawCrop(context, img, 0, 0, preview.width, preview.height, draft.zoom, draft.x, draft.y);
    $('#photoZoomValue').textContent = Math.round(draft.zoom * 100) + '%';
    $('#photoHeightValue').textContent = height.value + '% 图宽';
    $('#cropFrameSize').textContent = `720 × ${frameHeight} px`;
    $('#cropDetail').textContent = isFill ? '填充区域的大小固定，调整取景不会挤动封面。' : geometry[side].scale < 1 ? '这一侧照片较长，画框已按比例压缩；上方预览显示实际裁切范围。' : '改变画框比例会改变这张照片的高度，封面仍保持居中。';
  }
  zoom.oninput = () => { draft.zoom = Number(zoom.value) / 100; paint(); };
  px.oninput = () => { draft.x = Number(px.value) / 100; paint(); };
  py.oninput = () => { draft.y = Number(py.value) / 100; paint(); };
  frameSelect.onchange = () => {
    draft.frame = frameSelect.value === 'original' ? null : frameSelect.value === 'custom' ? Number(height.value) / 100 : Number(frameSelect.value);
    $('#photoHeightControl').hidden = frameSelect.value !== 'custom';
    paint();
  };
  height.oninput = () => { draft.frame = Number(height.value) / 100; paint(); };
  attachImageGestures(preview, {
    image:()=>img, read:()=>draft, zoomRange:()=>[1,4],
    write:transform=>{draft={...draft,...transform};zoom.value=Math.round(draft.zoom*100);px.value=Math.round(draft.x*100);py.value=Math.round(draft.y*100);paint();}
  });
  preview.onkeydown = (event) => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? .1 : .025;
    if (event.key === 'ArrowLeft') draft.x = clampCrop(draft.x - step);
    if (event.key === 'ArrowRight') draft.x = clampCrop(draft.x + step);
    if (event.key === 'ArrowUp') draft.y = clampCrop(draft.y - step);
    if (event.key === 'ArrowDown') draft.y = clampCrop(draft.y + step);
    px.value = Math.round(draft.x * 100); py.value = Math.round(draft.y * 100); paint();
  };
  $('#resetPhotoCrop').onclick = () => { draft = {zoom:1,x:0,y:0,frame:null}; syncControls(); paint(); };
  $('#cancelPhotoCrop').onclick = () => $('#modal').close();
  $('#applyPhotoCrop').onclick = () => {
    if (isFill) cell.fillEdits[side] = {...draft};
    else photo.edit = {...draft};
    state.dirty = true;
    renderStory();
    $('#modal').close();
    toast('已应用这张图片的调整。');
  };
  syncControls(); paint();
}
