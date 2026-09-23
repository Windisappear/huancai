import { FAMILIES, MODELS, RATIOS, getModel, sizeLabel, sanitizeDraft } from './models.js';
import { buildRequest, normalizeBaseUrl, generateImage, materializeImage, fileToReference, checkConnection, redact, safeImageUrl } from './api.js';
import { loadConfig, saveConfig, forgetKey, loadDraft, saveDraft, listTasks, putTask, deleteTask, storageEstimate } from './storage.js';
import { icon, hydrateIcons } from './icons.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const date = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const bytes = value => value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`;
const state = { config: loadConfig(), draft: loadDraft(), refs: [], tasks: [], active: null, page: 'studio', uploading: false, deleting: null, preview: null, storageReady: false };
const blobUrls = new Map();
const statusLabels = { running: '正在生成', saving: '正在保存', succeeded: '已完成', partial: '部分完成', failed: '生成失败', cancelled: '已停止等待', interrupted: '等待已中断' };
let toastTimer;
let connectionController;

function blobUrl(blob) {
  if (!blobUrls.has(blob)) blobUrls.set(blob, URL.createObjectURL(blob));
  return blobUrls.get(blob);
}
function imageSource(image) { return image.blob ? blobUrl(image.blob) : safeImageUrl(image.url) || ''; }
function releaseUnusedUrls() {
  const used = new Set(state.refs.map(ref => ref.blob));
  state.tasks.forEach(task => { task.images.forEach(img => { if (img.blob) used.add(img.blob); }); task.references.forEach(ref => used.add(ref.blob)); });
  for (const [blob, url] of blobUrls) if (!used.has(blob)) { URL.revokeObjectURL(url); blobUrls.delete(blob); }
}
function notify(message) {
  $('#toast span').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6000);
}
function showError(message = '') { $('#generationError').textContent = message; $('#generationError').hidden = !message; }
function openDialog(id) { const dialog = $(`#${id}`); if (!dialog.open) dialog.showModal(); }
function setPage(page) {
  state.page = page === 'history' ? 'history' : 'studio';
  $('#studioPage').hidden = state.page !== 'studio';
  $('#historyPage').hidden = state.page !== 'history';
  $$('.nav-item[data-page]').forEach(button => { button.classList.toggle('active', button.dataset.page === state.page); if (button.dataset.page === state.page) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  if (location.hash !== `#${state.page}`) history.replaceState(null, '', `#${state.page}`);
  if (state.page === 'history') { renderHistory(); updateStorageUsage(); }
}
function renderConnection() {
  $('#connectionLabel').textContent = state.config.apiKey ? 'API 已配置' : '配置 API Key';
  $('.connection-pill').classList.toggle('configured', !!state.config.apiKey);
}
function readDraft() {
  state.draft.prompt = $('#prompt').value;
  state.draft.quality = $('#quality').value;
  state.draft.resolution = $('#resolution').value;
  saveDraft(state.draft);
  $('#charCount').textContent = `${state.draft.prompt.length} / 4000`;
}
function renderControls() {
  const model = getModel(state.draft.modelId);
  $('#familyTabs').innerHTML = FAMILIES.map(family => `<button type="button" data-family="${family.id}" class="${family.id === model.family ? 'active' : ''}" aria-pressed="${family.id === model.family}">${family.name}</button>`).join('');
  $('#model').innerHTML = MODELS.filter(item => item.family === model.family).map(item => `<option value="${item.id}" ${item.id === model.id ? 'selected' : ''}>${item.name}</option>`).join('');
  $('#modelNote').textContent = model.family === 'image' ? '细节刻画与文字排版 · 图生图需渠道支持' : model.family === 'banana' ? '自然编辑与多图融合 · Gemini 原生接口' : '中文理解与视觉创作 · 原生约 2K 输出';
  $$('[data-mode]').forEach(button => { button.classList.toggle('selected', button.dataset.mode === state.draft.mode); button.setAttribute('aria-pressed', String(button.dataset.mode === state.draft.mode)); });
  $('#referenceField').hidden = state.draft.mode !== 'reference';
  $('#prompt').value = state.draft.prompt;
  $('#prompt').placeholder = state.draft.mode === 'text' ? '描述你想看到的画面，试着加入主体、光线、构图和风格…' : '描述你希望对参考图片做出的改变，以及需要保留的内容…';
  $('#charCount').textContent = `${state.draft.prompt.length} / 4000`;
  $('#ratioOptions').innerHTML = RATIOS.map(ratio => {
    const [w, h] = ratio.split(':').map(Number);
    return `<button type="button" data-ratio="${ratio}" class="${ratio === state.draft.ratio ? 'selected' : ''}" aria-pressed="${ratio === state.draft.ratio}" aria-label="画面比例 ${ratio}"><span class="ratio-icon" style="width:${w >= h ? 22 : Math.round(22 * w / h)}px;height:${h >= w ? 22 : Math.round(22 * h / w)}px"></span>${ratio}</button>`;
  }).join('');
  $('#sizeHint').textContent = sizeLabel(state.draft).replace('x', ' × ');
  $('#qualityField').hidden = model.family !== 'image';
  $('#quality').value = state.draft.quality;
  $('#resolutionField').hidden = model.family !== 'banana';
  $('#resolution').value = model.pro ? state.draft.resolution : '1K';
  $('#resolution').disabled = !model.pro;
  $('#resolutionNote').textContent = model.pro ? '实际清晰度以渠道返回为准。' : '此 Flash Image 渠道固定约 1K。';
  $('#countValue').textContent = state.draft.count;
  $('#minusCount').disabled = state.draft.count <= 1;
  $('#plusCount').disabled = state.draft.count >= 4;
  $('#batchCount').textContent = `${state.draft.count} 张`;
  $('#batchHint').textContent = state.draft.count > 1 ? '逐张生成，完成即保存' : '准备好，把想象变成画面';
  $('#creationFields').disabled = !!state.active;
  $('#generateButton').disabled = !!state.active || state.uploading || !state.storageReady;
  $('#generateButton span').textContent = state.active ? '正在生成…' : state.uploading ? '正在读取图片…' : !state.storageReady ? '正在打开本地图库…' : '开始生成';
  $('#cancelButton').hidden = !state.active;
  $('#cancelButton').disabled = !!state.active?.controller.signal.aborted;
  renderReferences();
  saveDraft(state.draft);
}
function renderReferences() {
  $('#referenceCount').textContent = `${state.refs.length} / 6`;
  $('#referenceList').innerHTML = state.refs.map((ref, index) => `<div class="reference"><img src="${blobUrl(ref.blob)}" alt="${escapeHtml(ref.name)}"><button type="button" data-remove-ref="${index}" aria-label="移除参考图 ${index + 1}">${icon('x')}</button></div>`).join('');
  $('#uploadZone').disabled = state.refs.length >= 6 || state.uploading;
}
function renderProgress() {
  const el = $('#generationProgress');
  el.hidden = !state.active;
  if (!state.active) return;
  const task = state.tasks.find(item => item.id === state.active.id);
  const elapsed = Math.floor((Date.now() - task.createdAt) / 1000);
  const text = state.active.controller.signal.aborted ? '正在停止等待并保存已有结果…' : task.status === 'saving' ? '正在保存图片…' : `正在生成第 ${Math.min(task.completed + 1, task.count)} / ${task.count} 张`;
  el.innerHTML = `${icon('loader', 'spin')}<div>${text}<small>已完成 ${task.images.length} 张 · 已等待 ${elapsed} 秒 · 请保持页面打开</small></div>`;
}
function taskCard(task) {
  const active = state.active?.id === task.id;
  const hasRemote = task.images.some(img => !img.blob);
  const saveMessage = task.persistError ? '本地保存失败，请立即下载或重新保存' : hasRemote ? '有图片待保存 · 临时链接可能过期' : '已保存到当前浏览器';
  const images = task.images.length ? `<div class="image-grid ${task.images.length > 1 ? 'multi' : ''}">${task.images.map((img, index) => `<div class="image-tile"><button class="image-open" data-preview="${task.id}" data-index="${index}" aria-label="查看大图 ${index + 1}"><img src="${escapeHtml(imageSource(img))}" alt="${escapeHtml(task.prompt)}" loading="lazy" referrerpolicy="no-referrer"></button><button class="download-float" data-download="${task.id}" data-index="${index}" aria-label="下载图片 ${index + 1}">${icon('download')}</button></div>`).join('')}</div>` : `<div class="pending-image">${icon(active ? 'loader' : 'help', active ? 'spin' : '')}<span>${statusLabels[task.status] || '等待确认'}</span></div>`;
  return `<article class="result-card" data-task="${task.id}"><div class="result-meta"><span class="model-dot"></span>${escapeHtml(task.modelName)}<span class="status ${task.status}">${statusLabels[task.status] || '等待确认'}</span></div>${images}<div class="result-footer"><p title="${escapeHtml(task.prompt)}">${escapeHtml(task.prompt)}</p><div class="meta-line">${escapeHtml(task.ratio)} · ${escapeHtml(sizeLabel(task))} · ${date(task.createdAt)}</div>${task.references.length ? `<div class="history-references"><span>参考图</span>${task.references.map(ref => `<img src="${blobUrl(ref.blob)}" alt="${escapeHtml(ref.name)}" loading="lazy">`).join('')}</div>` : ''}${task.error ? `<div class="task-error">${escapeHtml(task.error)}</div>` : ''}${task.images.length ? `<div class="save-note ${task.persistError || hasRemote ? 'warning' : ''}">${icon(task.persistError || hasRemote ? 'help' : 'hard-drive')}${saveMessage}</div>` : ''}<div class="result-actions"><button class="text-button" data-reuse="${task.id}" ${state.active ? 'disabled' : ''}>${icon('refresh')}复用参数</button>${task.images[0]?.blob ? `<button class="text-button" data-reference="${task.id}" data-index="0" ${state.active ? 'disabled' : ''}>${icon('image-plus')}图生图</button>` : ''}${task.persistError || hasRemote ? `<button class="text-button" data-retry-save="${task.id}" ${active ? 'disabled' : ''}>${icon('hard-drive')}重新保存</button>` : ''}<button class="text-button danger delete-action" data-delete="${task.id}" aria-label="删除这次创作" ${active ? 'disabled' : ''}>${icon('trash')}</button></div></div></article>`;
}
function renderResults() {
  const tasks = state.tasks.slice(0, 6);
  $('#emptyCanvas').hidden = tasks.length > 0;
  $('#results').hidden = !tasks.length;
  $('#results').innerHTML = tasks.map(taskCard).join('');
  $('#canvasCount').textContent = tasks.length ? `最近 ${tasks.length} 次创作` : '等待灵感';
  renderProgress();
  if (state.page === 'history') renderHistory();
}
function renderHistory() {
  const query = $('#historySearch').value.trim().toLowerCase();
  const family = $('#historyFilter').value;
  const tasks = state.tasks.filter(task => (!query || task.prompt.toLowerCase().includes(query)) && (family === 'all' || getModel(task.modelId)?.family === family));
  $('#historyCount').textContent = state.tasks.reduce((count, task) => count + task.images.length, 0);
  $('#historyResults').innerHTML = tasks.map(taskCard).join('');
  $('#emptyHistory').hidden = tasks.length > 0;
  $('#emptyHistory h2').textContent = state.tasks.length ? '没有匹配的作品' : '还没有创作记录';
  $('#emptyHistory p').textContent = state.tasks.length ? '换一个关键词或模型筛选试试。' : '完成第一张作品后，会自动出现在这里。';
}
async function updateStorageUsage() {
  const estimate = await storageEstimate();
  $('#storageUsage').textContent = `${estimate?.usage ? `本地已用 ${bytes(estimate.usage)}。` : ''}图片与参考图保存在当前浏览器，清除网站数据会删除作品，请及时下载。`;
}
async function persist(task) {
  try {
    const record = { ...task };
    delete record.persistError;
    await putTask(record);
    task.persistError = '';
    return true;
  } catch (error) { task.persistError = error.message; return false; }
}

async function addFiles(files) {
  if (state.active || state.uploading) return;
  const incoming = Array.from(files);
  if (!incoming.length) return;
  if (incoming.length + state.refs.length > 6) { notify('最多上传 6 张参考图，请减少后重试。'); return; }
  if (incoming.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) { notify('只支持 PNG、JPG 和 WebP 图片。'); return; }
  if (incoming.some(file => file.size > 10 * 1024 * 1024 || !file.size)) { notify('每张参考图必须大于 0 且不超过 10 MB。'); return; }
  if ([...incoming, ...state.refs.map(ref => ref.blob)].reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) { notify('参考图总大小不能超过 20 MB，请压缩或减少图片。'); return; }
  state.uploading = true;
  renderControls();
  try {
    const refs = [];
    for (const file of incoming) {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 50_000_000) { bitmap.close(); throw new Error('参考图像素过大，请缩小到 5000 万像素以内。'); }
      bitmap.close();
      refs.push({ id: uid(), name: file.name || '粘贴的参考图.png', blob: file });
    }
    state.refs.push(...refs);
    state.draft.mode = 'reference';
  } catch (error) { notify(error.message.startsWith('参考图') ? error.message : '无法读取图片，请确认文件是有效的 PNG、JPG 或 WebP。'); }
  finally { state.uploading = false; renderControls(); }
}

async function generate(event) {
  event?.preventDefault();
  if (state.active || state.uploading || !state.storageReady) return;
  readDraft();
  showError();
  if (!state.config.apiKey) { openSettings(); return; }
  if (state.draft.mode === 'reference' && !state.refs.length) { showError('请先上传至少一张参考图片。'); $('#uploadZone').focus(); return; }
  const draft = { ...state.draft };
  const references = draft.mode === 'reference' ? [...state.refs] : [];
  try { buildRequest(draft, references.map(() => ({ base64: '', mimeType: 'image/png' }))); normalizeBaseUrl(state.config.baseUrl); }
  catch (error) { showError(error.message); return; }
  const task = { ...draft, id: uid(), modelName: getModel(draft.modelId).name, createdAt: Date.now(), status: 'running', completed: 0, images: [], references, error: '' };
  const controller = new AbortController();
  const config = { ...state.config };
  state.active = { id: task.id, controller };
  // Verify durable storage before submitting a billable request.
  if (!await persist(task)) { state.active = null; showError(task.persistError); renderControls(); return; }
  state.tasks.unshift(task);
  setPage('studio');
  renderControls();
  renderResults();
  if (matchMedia('(max-width: 760px)').matches) $('.canvas-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const ticker = setInterval(renderProgress, 1000);
  try {
    const encoded = await Promise.all(references.map(ref => fileToReference(ref.blob)));
    for (let index = 0; index < draft.count; index++) {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      task.status = 'running';
      renderProgress();
      const images = await generateImage(config, draft, encoded, controller.signal);
      task.status = 'saving';
      renderProgress();
      for (const image of images) {
        let saved;
        try {
          const blob = await materializeImage(image, controller.signal);
          const bitmap = await createImageBitmap(blob);
          saved = { id: uid(), blob, width: bitmap.width, height: bitmap.height, revisedPrompt: image.revisedPrompt || '' };
          bitmap.close();
        } catch (error) {
          if (image.url) saved = { id: uid(), url: image.url, saveError: '图片链接无法跨域读取，尚未保存在本地。', revisedPrompt: image.revisedPrompt || '' };
          else throw new Error('上游已响应，但图片数据无法解码。请核对中转站记录后再重试。');
        }
        task.images.push(saved);
        await persist(task);
      }
      task.completed++;
      await persist(task);
      renderResults();
      if (task.persistError) throw new Error('已收到图片，但本地存储失败，已停止后续生成。请立即下载已有结果。');
    }
    task.status = 'succeeded';
    notify(`已完成 ${task.images.length} 张作品${task.images.some(img => !img.blob) ? '，部分图片待本地保存' : '，并保存到本地图库'}。`);
  } catch (error) {
    const aborted = error.name === 'AbortError';
    task.status = task.images.length ? 'partial' : aborted ? 'cancelled' : 'failed';
    task.error = aborted ? '已停止等待。上游可能仍会生成和计费；请核对中转站记录后再重试。' : redact(error.message, config.apiKey);
    showError(task.error);
  } finally {
    clearInterval(ticker);
    await persist(task);
    if (task.persistError) showError(`${task.persistError} 当前图片仍在页面中，请立即下载。`);
    state.active = null;
    renderControls();
    renderResults();
  }
}

function openSettings() {
  $('#baseUrl').value = state.config.baseUrl;
  $('#apiKey').value = state.config.apiKey;
  $('#apiKey').type = 'password';
  $('#toggleKey').setAttribute('aria-label', '显示 API Key');
  $('#rememberKey').checked = state.config.remember;
  $('#timeout').value = String(state.config.timeout);
  $('#connectionResult').hidden = true;
  openDialog('settingsDialog');
}
function configFromForm() { return { baseUrl: normalizeBaseUrl($('#baseUrl').value), apiKey: $('#apiKey').value.trim(), remember: $('#rememberKey').checked, timeout: Number($('#timeout').value) }; }
function settingsMessage(message, error = false) { $('#connectionResult').textContent = message; $('#connectionResult').hidden = false; $('#connectionResult').classList.toggle('error', error); }
async function testConnection() {
  if (!$('#settingsForm').reportValidity()) return;
  const button = $('#testConnection');
  button.disabled = true;
  connectionController?.abort();
  connectionController = new AbortController();
  const timer = setTimeout(() => connectionController?.abort(), 20000);
  settingsMessage('正在检查模型列表，不会发起生图请求…');
  let config;
  try {
    config = configFromForm();
    const ids = await checkConnection(config, connectionController.signal);
    const matched = MODELS.filter(model => ids.includes(model.id));
    settingsMessage(`连接成功，模型列表包含 ${matched.length} 个已接入型号。${matched.length ? '保存后即可开始创作，实际生成以渠道响应为准。' : '暂未找到已接入型号，请检查 Key 所属分组。'}`);
  } catch (error) { settingsMessage(error.name === 'AbortError' ? '连接检查已超时或取消。' : error instanceof TypeError ? '无法连接，请检查网络、接口地址及中转站 CORS 设置。' : redact(error.message, config?.apiKey), true); }
  finally { clearTimeout(timer); button.disabled = false; }
}

function findTask(id) { return state.tasks.find(task => task.id === id); }
function reuseTask(task) {
  if (state.active) return;
  state.draft = sanitizeDraft(task);
  state.refs = task.references.map(ref => ({ ...ref }));
  renderControls();
  setPage('studio');
  $('#prompt').focus();
  notify('已恢复提示词、模型、参数和参考图。');
}
function useImageAsReference(task, index) {
  if (state.active) return;
  const image = task.images[index];
  if (!image?.blob) { notify('请先将这张图片保存到本地图库。'); return; }
  state.draft = sanitizeDraft({ ...task, mode: 'reference', prompt: '', count: 1 });
  state.refs = [{ id: uid(), name: '上一张作品.png', blob: image.blob }];
  $('#previewDialog').close();
  renderControls();
  setPage('studio');
  $('#prompt').focus();
  notify('已添加为参考图，请描述希望做出的修改。');
}
function downloadImage(task, index) {
  const image = task.images[index];
  if (!image) return;
  const anchor = document.createElement('a');
  anchor.href = imageSource(image);
  if (image.blob) {
    const ext = image.blob.type.includes('jpeg') ? 'jpg' : image.blob.type.includes('webp') ? 'webp' : 'png';
    anchor.download = `幻彩-${task.modelName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '-')}-${task.id.slice(0, 8)}-${index + 1}.${ext}`;
  } else { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; notify('已打开原图链接，请在新页面保存；该图片尚未存入本地图库。'); }
  document.body.append(anchor); anchor.click(); anchor.remove();
}
function previewImage(task, index) {
  const image = task.images[index];
  if (!image) return;
  state.preview = { taskId: task.id, index };
  $('#previewTitle').textContent = `${task.modelName} · ${index + 1} / ${task.images.length}`;
  $('#previewBody').innerHTML = `<img class="preview-image" src="${escapeHtml(imageSource(image))}" alt="${escapeHtml(task.prompt)}" referrerpolicy="no-referrer"><p class="preview-details">${image.width ? `${image.width} × ${image.height} · ` : ''}${date(task.createdAt)} · ${image.blob ? task.persistError ? '尚未持久保存' : '已保存到本地图库' : '临时图片链接 · 尚未保存'}</p><p class="preview-copy">${escapeHtml(task.prompt)}</p>${image.revisedPrompt ? `<details><summary>模型调整后的提示词</summary><p class="preview-copy">${escapeHtml(image.revisedPrompt)}</p></details>` : ''}<div class="preview-actions"><button class="primary" data-download="${task.id}" data-index="${index}">${icon('download')}${image.blob ? '下载原图' : '打开原图'}</button><button class="secondary" data-reference="${task.id}" data-index="${index}" ${!image.blob || state.active ? 'disabled' : ''}>${icon('image-plus')}继续图生图</button><button class="text-button" data-copy="${task.id}">${icon('copy')}复制提示词</button></div>`;
  openDialog('previewDialog');
}
async function retrySave(task, button) {
  button.disabled = true;
  try {
    for (const image of task.images) {
      if (image.blob) continue;
      const blob = await materializeImage(image);
      const bitmap = await createImageBitmap(blob);
      Object.assign(image, { blob, width: bitmap.width, height: bitmap.height });
      bitmap.close(); delete image.url; delete image.saveError;
      await persist(task);
    }
    if (!await persist(task)) throw new Error(task.persistError);
    notify('图片已保存到本地图库。');
  } catch (error) { notify(error instanceof TypeError ? '图片地址仍不允许跨域读取，请打开原图手动下载。' : error.message); }
  finally { renderResults(); }
}

hydrateIcons();
renderControls();
renderConnection();
setPage(location.hash.slice(1));
window.addEventListener('hashchange', () => setPage(location.hash.slice(1)));
$('#creationForm').addEventListener('submit', generate);
$('#prompt').addEventListener('input', readDraft);
$('#quality').addEventListener('change', readDraft);
$('#resolution').addEventListener('change', () => { readDraft(); renderControls(); });
$('#model').addEventListener('change', event => { readDraft(); state.draft.modelId = event.target.value; renderControls(); });
$('#clearPrompt').addEventListener('click', () => { $('#prompt').value = ''; readDraft(); $('#prompt').focus(); });
$('#minusCount').addEventListener('click', () => { state.draft.count = Math.max(1, state.draft.count - 1); renderControls(); });
$('#plusCount').addEventListener('click', () => { state.draft.count = Math.min(4, state.draft.count + 1); renderControls(); });
$('#uploadZone').addEventListener('click', () => $('#referenceInput').click());
$('#referenceInput').addEventListener('change', event => { void addFiles(event.target.files); event.target.value = ''; });
$('#uploadZone').addEventListener('dragover', event => { event.preventDefault(); $('#uploadZone').classList.add('dragover'); });
$('#uploadZone').addEventListener('dragleave', () => $('#uploadZone').classList.remove('dragover'));
$('#uploadZone').addEventListener('drop', event => { event.preventDefault(); $('#uploadZone').classList.remove('dragover'); void addFiles(event.dataTransfer.files); });
document.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
document.addEventListener('drop', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
document.addEventListener('paste', event => { if (state.page === 'studio' && !document.querySelector('dialog[open]') && event.clipboardData.files.length) { event.preventDefault(); void addFiles(event.clipboardData.files); } });
$('#cancelButton').addEventListener('click', () => { state.active?.controller.abort(); renderControls(); renderProgress(); });
$('#historySearch').addEventListener('input', renderHistory);
$('#historyFilter').addEventListener('change', renderHistory);
$('#toast button').addEventListener('click', () => { $('#toast').hidden = true; });
$('#toggleKey').addEventListener('click', () => { const input = $('#apiKey'); input.type = input.type === 'password' ? 'text' : 'password'; $('#toggleKey').setAttribute('aria-label', input.type === 'password' ? '显示 API Key' : '隐藏 API Key'); });
$('#settingsForm').addEventListener('submit', event => {
  event.preventDefault();
  try { const config = configFromForm(); saveConfig(config); state.config = config; renderConnection(); $('#settingsDialog').close(); notify('API 设置已保存，可以开始创作。'); }
  catch (error) { settingsMessage(error.message, true); }
});
$('#settingsDialog').addEventListener('close', () => { connectionController?.abort(); $('#apiKey').value = ''; });
$('#testConnection').addEventListener('click', testConnection);
$('#forgetKey').addEventListener('click', () => {
  try { forgetKey(); state.config.apiKey = ''; $('#apiKey').value = ''; renderConnection(); settingsMessage('已清除本地保存的 API Key。当前正在进行的请求不受影响。'); }
  catch { settingsMessage('无法访问浏览器存储，请检查网站权限。', true); }
});
$('#confirmDelete').addEventListener('click', async () => {
  const id = state.deleting;
  if (!id || state.active?.id === id) return;
  $('#confirmDelete').disabled = true;
  try { await deleteTask(id); state.tasks = state.tasks.filter(task => task.id !== id); if (state.preview?.taskId === id) $('#previewDialog').close(); releaseUnusedUrls(); renderResults(); updateStorageUsage(); $('#confirmDialog').close(); notify('已删除这次创作。'); }
  catch (error) { notify(error.message); }
  finally { $('#confirmDelete').disabled = false; state.deleting = null; }
});
document.addEventListener('click', async event => {
  const button = event.target.closest('button, a[data-page]');
  if (!button || button.disabled) return;
  const data = button.dataset;
  if (data.close !== undefined) button.closest('dialog')?.close();
  else if (data.page) setPage(data.page);
  else if (data.action === 'settings') openSettings();
  else if (data.action === 'help') openDialog('helpDialog');
  else if (data.mode && !state.active) { readDraft(); state.draft.mode = data.mode; renderControls(); }
  else if (data.family && !state.active) { readDraft(); state.draft.modelId = MODELS.find(model => model.family === data.family).id; renderControls(); }
  else if (data.ratio && !state.active) { readDraft(); state.draft.ratio = data.ratio; renderControls(); }
  else if (data.prompt && !state.active) { state.draft.prompt = data.prompt; renderControls(); $('#prompt').focus(); }
  else if (data.removeRef !== undefined && !state.active) { state.refs.splice(Number(data.removeRef), 1); renderReferences(); releaseUnusedUrls(); }
  else if (data.reuse) { const task = findTask(data.reuse); if (task) reuseTask(task); }
  else if (data.preview) { const task = findTask(data.preview); if (task) previewImage(task, Number(data.index)); }
  else if (data.reference) { const task = findTask(data.reference); if (task) useImageAsReference(task, Number(data.index)); }
  else if (data.download) { const task = findTask(data.download); if (task) downloadImage(task, Number(data.index)); }
  else if (data.delete) { state.deleting = data.delete; openDialog('confirmDialog'); }
  else if (data.retrySave) { const task = findTask(data.retrySave); if (task) await retrySave(task, button); }
  else if (data.copy) { try { await navigator.clipboard.writeText(findTask(data.copy).prompt); notify('提示词已复制。'); } catch { notify('无法访问剪贴板，请选中提示词后手动复制。'); } }
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && state.page === 'studio' && !document.querySelector('dialog[open]')) { event.preventDefault(); if ($('#creationForm').reportValidity()) void generate(); }
});
window.addEventListener('beforeunload', event => { if (state.active || state.tasks.some(task => task.persistError)) { event.preventDefault(); event.returnValue = ''; } });

try {
  state.tasks = await listTasks();
  // A synchronous HTTP generation cannot be resumed after the waiting page closes.
  for (const task of state.tasks) if (['running', 'saving'].includes(task.status)) {
    task.status = 'interrupted';
    task.error = '此页面没有收到完整结果。若另一页面仍在生成，请返回原页面；否则先核对中转站记录，避免重复计费。';
  }
  state.storageReady = true;
  renderControls();
  renderResults();
} catch (error) {
  $('#storageAlert').textContent = error.message;
  $('#storageAlert').hidden = false;
  $('#generateButton span').textContent = '本地图库不可用';
}
