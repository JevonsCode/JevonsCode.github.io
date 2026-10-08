'use strict';

// Help dialogs use text nodes so translations never become executable markup.
function helpTextElement(tag, message, className) {
  const element = document.createElement(tag);
  element.textContent = t(message);
  if (className) element.className = className;
  return element;
}
function helpContent() {
  const content = document.createElement('div');
  content.className = 'modal-content';
  return content;
}
function showMoments() {
  composeCover();
  const wrap = helpContent();
  wrap.append(helpTextElement('p', '按居中裁切模拟。点击任意小图，查看展开效果。', 'preview-caption'));
  const post = document.createElement('div');
  post.className = 'moments-post';
  post.append(helpTextElement('div', '我', 'avatar'));
  const body = document.createElement('div');
  body.className = 'moments-body';
  body.append(helpTextElement('strong', '我的朋友圈'), helpTextElement('p', '把喜欢的瞬间，都放在这里。'));
  const grid = document.createElement('div');
  grid.className = 'moments-grid';
  for (let i = 0; i < 9; i++) {
    const button = document.createElement('button');
    button.setAttribute('aria-label', t('打开第 {index} 张长图', {index: i + 1}));
    const image = canvas(300, 300);
    paintTile(image, i);
    button.append(image);
    button.onclick = () => showStory(i, true);
    grid.append(button);
  }
  body.append(grid, helpTextElement('div', '刚刚 · 仅自己可见（模拟）', 'moments-time'));
  post.append(body);
  wrap.append(post);
  const note = helpTextElement('p', '微信实际裁切可能随版本变化，建议先发一条「仅自己可见」测试。', 'preview-caption');
  note.style.marginTop = '22px';
  wrap.append(note);
  showModal(t('朋友圈预览'), wrap);
}
function showHelp() {
  const wrap = helpContent();
  const sections = [
    ['h3', '1. 选一张大图做封面'],
    ['p', '上传图片后，单指拖动、双指缩放，轻点格子添加照片。拆图会扣除格间缝隙遮住的内容；可展开「格子间距」手动校准。示例仅供体验，导出前可换成自己的照片。'],
    ['h3', '2. 点一格，放入更多照片'],
    ['p', '在封面上方或下方添加照片，不再限制 6 张。右下角的预览按钮可随时打开长图。单指上下浏览，双指移动或缩放选中照片；电脑可用鼠标拖动。拖动照片的排序手柄，可调整顺序，也可把照片移到封面的另一侧。列表里的「调整」可改变取景和画框高度，画框外的部分会裁切。'],
    ['h3', '留白和填图'],
    ['p', '白色尽量留在底部。上方不足时，默认用相邻照片补齐，保持封面居中；你也可以为上下空缺分别选择另一张图片，再单独调整它的取景。填图不会改变长图尺寸。'],
    ['h3', '3. 导出，再发朋友圈'],
    ['p', '下载压缩包并解压，保存 01–09 共 9 张图片，按编号依次选择发布。手机也可在长图预览里逐张下载。照片很多时，导出会适当降低整张图的分辨率，保留照片比例和全部内容。'],
    ['div', '第一次使用，请先选择「仅自己可见」试发。朋友圈的缩略图由微信裁切，不同版本可能有差异。', 'callout'],
    ['h3', '想做人物溢出？'],
    ['p', '切换「溢出拼贴」，可选择仅第一排、仅第 2、3 格，或自行点选格子。留白可按上、下、左、右四边单独设置，设为 0% 即不留白；也可快捷选择仅一个方向。四边留白、当前图层的图片及位置只影响本次选中的格子，各格会记住自己的设置。首次切换溢出模式时，会自动载入人物和文字两个透明图层。可以一次添加多张图片，上传后显示缩略图和文件名；各图层可单独调整、隐藏、排序和删除。在预览上方选择当前图层即可拖动或缩放，真实格缝依然保留。更换封面只替换背景，人物、文字和其他图层的大小、位置、显示状态与覆盖范围均保留；不需要的图层可以手动删除。'],
    ['h3', '误触了怎么办？'],
    ['p', '下载按钮旁的「锁定」可防止误改，锁定后仍能浏览和下载，解锁后继续编辑。「撤销」「重做」和步骤记录可找回之前的调整。本次打开期间保留最近 40 条记录；重新打开时恢复已保存的作品，步骤记录重新开始。'],
    ['h3', '图片和草稿存在哪里？'],
    ['p', '照片不会上传到服务器。作品自动保存在当前设备的浏览器中，重新打开会恢复最近成功保存的草稿。清除网站数据会删除草稿；重要作品请另行导出保存。']
  ];
  sections.forEach(([tag, message, className]) => wrap.append(helpTextElement(tag, message, className)));
  showModal(t('用 3 步，做一组拼图'), wrap);
}
function helpLink(label, url) {
  const link = helpTextElement('a', label);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  return link;
}
function showCompat() {
  const wrap = helpContent();
  const sections = [
    ['h3', '缩略图是 A，点开看到 A ＋ B'],
    ['p', '每个九宫格小图，实际上都是一张长图。我们把 A 放在正中央，把 B 等照片放在上下，利用朋友圈长图缩略图的居中裁切形成九宫格。'],
    ['div', '普通朋友圈图片没有可供这个工具设置的独立封面，因此不能保证「显示 A，点开后 A 消失、完全变成 B」。', 'callout'],
    ['h3', '溢出的是画面内部的白边'],
    ['p', '人物可以跨越各格里的白边，但不能覆盖微信本身的格子间隙，也不能出现在九宫格的外面。'],
    ['h3', '格子间距怎么算？'],
    ['p', '默认按小图宽 90、间距 4 的比例预览。拆图会跳过缝隙对应的画面，人物也会被真实格缝遮挡。可在「格子间距」里填写同一张微信截图中的小图宽度和缝隙宽度。']
  ];
  sections.forEach(([tag, message, className]) => wrap.append(helpTextElement(tag, message, className)));
  const examples = document.createElement('p');
  examples.append(
    document.createTextNode(t('公开仿微信组件的默认间距并不一致，例如 ')),
    helpLink('NineGridView（3dp）', 'https://github.com/jeasonlzy/NineGridView'),
    document.createTextNode(t('、')),
    helpLink('BGAPhotoPicker（4dp）', 'https://github.com/bingoogolapple/BGAPhotoPicker-Android'),
    document.createTextNode(t('。这些是参考实现，不是微信官方统一规格。'))
  );
  wrap.append(examples, helpTextElement('h3', '先试发一次'), helpTextElement('p', '当前预览按居中裁切模拟，没有经过你的手机微信真机验证。先用「仅自己可见」发 9 张图片，检查顺序、裁切和清晰度。'));
  const reference = document.createElement('p');
  const link = helpLink('WechatLongPic 开源项目', 'https://github.com/paul-zz/WechatLongPic');
  link.style.textDecoration = 'underline';
  reference.append(document.createTextNode(t('实现参考：')), link, document.createTextNode(t('。这是公开实践，不是微信的兼容承诺。')));
  wrap.append(reference);
  showModal(t('关于微信的显示方式'), wrap);
}
