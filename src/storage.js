import { DEFAULT_CONFIG, sanitizeDraft } from './models.js';
const CONFIG_KEY = 'huancai.config.v1';
const KEY_KEY = 'huancai.key.v1';
const DRAFT_KEY = 'huancai.draft.v1';
let database;
const safeRead = (storage, key) => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };
export function loadConfig() {
  try {
    const config = safeRead(localStorage, CONFIG_KEY) || {};
    return { ...DEFAULT_CONFIG, ...config, apiKey: (config.remember ? localStorage.getItem(KEY_KEY) : sessionStorage.getItem(KEY_KEY)) || '' };
  } catch { return { ...DEFAULT_CONFIG }; }
}
export function saveConfig(config) {
  const { apiKey, ...publicConfig } = config;
  localStorage.removeItem(KEY_KEY);
  sessionStorage.removeItem(KEY_KEY);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(publicConfig));
  (config.remember ? localStorage : sessionStorage).setItem(KEY_KEY, apiKey);
}
export function forgetKey() { localStorage.removeItem(KEY_KEY); sessionStorage.removeItem(KEY_KEY); }
export function loadDraft() { try { return sanitizeDraft(safeRead(localStorage, DRAFT_KEY) || {}); } catch { return sanitizeDraft(); } }
export function saveDraft(draft) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(sanitizeDraft(draft))); } catch { /* Generation and image saving are independent of draft preferences. */ } }

export function openDatabase() {
  if (database) return Promise.resolve(database);
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('此浏览器无法使用本地图库，请使用正常模式的 Chrome、Edge 或 Firefox。')); return; }
    const request = indexedDB.open('huancai-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tasks', { keyPath: 'id' });
    request.onsuccess = () => { database = request.result; database.onversionchange = () => { database.close(); database = null; }; resolve(database); };
    request.onerror = () => reject(new Error('无法打开本地图库，请检查浏览器存储权限。'));
    request.onblocked = () => reject(new Error('本地图库正在被其他页面更新，请关闭其他幻彩页面后重试。'));
  });
}
async function transact(mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', mode);
    const request = operation(tx.objectStore('tasks'));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = tx.onabort = () => reject(new Error(tx.error?.name === 'QuotaExceededError' ? '浏览器存储空间不足，请先下载图片，再删除不需要的记录。' : '本地图库保存失败，请立即下载当前图片。'));
  });
}
export const listTasks = () => transact('readonly', store => store.getAll()).then(tasks => tasks.sort((a, b) => b.createdAt - a.createdAt));
export const putTask = task => transact('readwrite', store => store.put(task));
export const deleteTask = id => transact('readwrite', store => store.delete(id));
export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  try { return await navigator.storage.estimate(); } catch { return null; }
}
