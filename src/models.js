export const FAMILIES = [
  { id: 'image', name: 'GPT Image', short: 'GPT', description: '细节刻画 · 文字排版' },
  { id: 'banana', name: 'Nano Banana', short: 'NB', description: '自然编辑 · 创意融合' },
  { id: 'seedream', name: 'Seedream', short: 'SD', description: '中文理解 · 视觉创作' },
];
export const MODELS = [
  { id: 'gpt-image-2', name: 'GPT Image 2', family: 'image' },
  { id: 'gpt-image-2-c', name: 'GPT Image 2 · C', family: 'image' },
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana', family: 'banana' },
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', family: 'banana', pro: true },
  { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2', family: 'banana' },
  { id: 'doubao-seedream-4-0-250828', name: 'Seedream 4.0', family: 'seedream' },
  { id: 'doubao-seedream-4-5-251128', name: 'Seedream 4.5', family: 'seedream' },
  { id: 'doubao-seedream-5-0-260128', name: 'Seedream 5.0', family: 'seedream' },
  { id: 'doubao-seedream-5-0-pro-260628', name: 'Seedream 5.0 Pro', family: 'seedream' },
];
export const RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16'];
export const IMAGE_SIZES = { '1:1': '1024x1024', '3:2': '1536x1024', '2:3': '1024x1536', '4:3': '1536x1152', '3:4': '1152x1536', '16:9': '1536x864', '9:16': '864x1536' };
export const SEEDREAM_SIZES = { '1:1': '2048x2048', '3:2': '2496x1664', '2:3': '1664x2496', '4:3': '2304x1728', '3:4': '1728x2304', '16:9': '2560x1440', '9:16': '1440x2560' };
export const DEFAULT_CONFIG = { baseUrl: 'https://duoyuanx.com', apiKey: '', remember: false, timeout: 300 };
export const DEFAULT_DRAFT = { modelId: 'gpt-image-2', mode: 'text', prompt: '', ratio: '1:1', quality: 'auto', resolution: '1K', count: 1 };
export const getModel = id => MODELS.find(model => model.id === id);
export const sizeLabel = draft => {
  const model = getModel(draft.modelId);
  return model?.family === 'banana' ? `${draft.ratio} · ${model.pro ? draft.resolution : '1K'}` : (model?.family === 'seedream' ? SEEDREAM_SIZES : IMAGE_SIZES)[draft.ratio];
};
export function sanitizeDraft(value = {}) {
  return {
    modelId: getModel(value.modelId) ? value.modelId : DEFAULT_DRAFT.modelId,
    mode: value.mode === 'reference' ? 'reference' : 'text',
    prompt: typeof value.prompt === 'string' ? value.prompt.slice(0, 4000) : '',
    ratio: RATIOS.includes(value.ratio) ? value.ratio : '1:1',
    quality: ['auto', 'low', 'medium', 'high'].includes(value.quality) ? value.quality : 'auto',
    resolution: ['1K', '2K', '4K'].includes(value.resolution) ? value.resolution : '1K',
    count: Math.min(4, Math.max(1, Number.parseInt(value.count, 10) || 1)),
  };
}
