import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : '@playwright/test');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true });
const page = await context.newPage();
const failures = [];
const consoleErrors = [];
page.on('pageerror', error => consoleErrors.push(error.message));
page.on('dialog', dialog => dialog.accept());
await mkdir('test-results', { recursive: true });
const report = [];
const log = text => { report.push(text); console.log(`PASS ${text}`); };
let imageData;
let behavior = 'success';
let calls = [];
let remoteAllowed = false;
let remoteHeaders;
await context.route('https://mock-relay.example/**', async route => {
  const request = route.request();
  if (request.url().endsWith('/models')) return route.fulfill({ json: { data: [{ id: 'gpt-image-2' }, { id: 'gemini-3-pro-image-preview' }] } });
  const body = request.postDataJSON();
  calls.push({ url: request.url(), body, headers: request.headers() });
  if (behavior === 'partial' && calls.length % 2 === 0) return route.fulfill({ status: 429, json: { error: { message: 'test rate limit' } } });
  if (behavior === 'failure') return route.fulfill({ status: 401, json: { error: { message: 'invalid test-browser-key <img src=x onerror=alert(1)>' } } });
  if (behavior === 'slow') { await new Promise(resolve => setTimeout(resolve, 1500)); try { return await route.fulfill({ json: { data: [{ b64_json: imageData }] } }); } catch { return; } }
  if (behavior === 'remote') return route.fulfill({ json: { data: [{ url: 'https://mock-cdn.example/result.png' }] } });
  if (request.url().includes('generateContent')) return route.fulfill({ json: { candidates: [{ content: { parts: [{ text: 'Created image' }, { inlineData: { mimeType: 'image/png', data: imageData } }] }, finishReason: 'STOP' }] } });
  return route.fulfill({ json: { data: [{ b64_json: imageData, revised_prompt: '测试生成图片' }] } });
});
await context.route('https://mock-cdn.example/**', async route => {
  remoteHeaders = route.request().headers();
  if (!remoteAllowed && route.request().resourceType() === 'fetch') return route.abort('failed');
  return route.fulfill({ contentType: 'image/png', body: Buffer.from(imageData, 'base64') });
});

const waitReady = () => page.waitForFunction(() => !document.querySelector('#generateButton').disabled);
const generate = async prompt => {
  const previousId = await page.locator('#results .result-card').count() ? await page.locator('#results .result-card').first().getAttribute('data-task') : null;
  await page.locator('#prompt').fill(prompt);
  await page.locator('#generateButton').click();
  await page.waitForFunction(previous => {
    const first = document.querySelector('#results .result-card');
    return first && first.dataset.task !== previous && document.querySelector('#cancelButton').hidden && !document.querySelector('#generateButton').disabled;
  }, previousId);
};
const topCard = () => page.locator('#results .result-card').first();

try {
  await page.goto('http://127.0.0.1:4173');
  await waitReady();
  imageData = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#b9cdf4'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#1c1f23'; ctx.fillRect(16, 16, 32, 32); return canvas.toDataURL('image/png').split(',')[1]; });
  await page.screenshot({ path: 'test-results/desktop-empty.png', fullPage: true });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: 'test-results/mobile-empty.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1080 });
  log('desktop/mobile layouts at 375, 768, 1024, 1440 px have no horizontal overflow');

  await page.locator('.connection-pill').click();
  await page.locator('#baseUrl').fill('https://mock-relay.example/v1');
  await page.locator('#apiKey').fill('test-browser-key');
  await page.locator('#testConnection').click();
  await page.waitForFunction(() => document.querySelector('#connectionResult').textContent.includes('连接成功'));
  await page.locator('#settingsForm button[type=submit]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('huancai.key.v1')), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('huancai.key.v1')), 'test-browser-key');
  log('connection check, /v1 normalization, and session-only API key');

  await generate('测试：海边建筑与光影');
  assert.match(await topCard().textContent(), /已完成/);
  assert.match(await topCard().textContent(), /已保存到当前浏览器/);
  assert.equal(calls.at(-1).body.model, 'gpt-image-2');
  assert.equal(calls.at(-1).headers.authorization, 'Bearer test-browser-key');
  const imageLoaded = await topCard().locator('.image-open img').evaluate(img => img.complete && img.naturalWidth === 64);
  assert.ok(imageLoaded);
  log('GPT Image text generation produces an actual decoded image and saves it');

  await topCard().locator('[data-preview]').click();
  assert.equal(await page.locator('#previewDialog').evaluate(dialog => dialog.open), true);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#previewBody [data-download]').click();
  const download = await downloadPromise;
  assert.ok(download.suggestedFilename().endsWith('.png'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#previewDialog').evaluate(dialog => dialog.open), false);
  await page.reload(); await waitReady();
  assert.match(await topCard().textContent(), /测试：海边建筑与光影/);
  assert.ok(await topCard().locator('.image-open img').evaluate(img => img.src.startsWith('blob:') && img.naturalWidth === 64));
  log('preview, native download, Escape focus flow, and IndexedDB image persistence after reload');

  await topCard().locator('[data-reference]').click();
  assert.equal(await page.locator('#referenceList .reference').count(), 1);
  await generate('保持建筑不变，改成落日时分');
  assert.ok(calls.at(-1).body.image[0].startsWith('data:image/png;base64,'));
  log('GPT Image reference generation from an existing result');

  await page.locator('[data-family=banana]').click();
  await page.locator('#model').selectOption('gemini-3-pro-image-preview');
  await page.locator('#resolution').selectOption('2K');
  await page.locator('[data-ratio="16:9"]').click();
  await generate('保留主体，变成水彩画');
  assert.equal(calls.at(-1).body.contents[0].parts.length, 2);
  assert.equal(calls.at(-1).body.generationConfig.imageConfig.imageSize, '2K');
  assert.equal(calls.at(-1).body.generationConfig.imageConfig.aspectRatio, '16:9');
  assert.ok(calls.at(-1).url.includes('gemini-3-pro-image-preview:generateContent'));
  log('Nano Banana Pro sends native Gemini reference parts, resolution and aspect ratio');

  await page.locator('[data-family=seedream]').click();
  await page.locator('#model').selectOption('doubao-seedream-5-0-260128');
  await page.locator('#referenceInput').setInputFiles({ name: 'second.png', mimeType: 'image/png', buffer: Buffer.from(imageData, 'base64') });
  await page.waitForFunction(() => document.querySelectorAll('#referenceList .reference').length === 2);
  await generate('融合两张参考图，细腻插画');
  assert.equal(calls.at(-1).body.model, 'doubao-seedream-5-0-260128');
  assert.equal(calls.at(-1).body.image.length, 2);
  assert.equal(calls.at(-1).body.size, '2560x1440');
  await page.reload(); await waitReady();
  await topCard().locator('[data-reuse]').click();
  assert.equal(await page.locator('#referenceList .reference').count(), 2);
  assert.equal(await page.locator('#model').inputValue(), 'doubao-seedream-5-0-260128');
  assert.equal(await page.locator('#prompt').inputValue(), '融合两张参考图，细腻插画');
  log('Seedream multi-reference generation; persisted references and parameters can be reused');

  await page.locator('[data-mode=text]').click();
  await page.locator('#plusCount').click();
  behavior = 'partial'; calls = [];
  await generate('批量测试：保留已生成结果');
  assert.equal(calls.length, 2);
  assert.match(await topCard().textContent(), /部分完成/);
  assert.equal(await topCard().locator('.image-tile').count(), 1);
  assert.equal(calls[0].body.image, undefined);
  log('batch partial failure retains the completed image and does not retry the failed billable request');

  await page.locator('#minusCount').click(); behavior = 'failure'; calls = [];
  await generate('错误处理测试');
  assert.equal(calls.length, 1);
  assert.match(await topCard().textContent(), /401/);
  assert.ok(!(await topCard().textContent()).includes('test-browser-key'));
  assert.equal(await topCard().locator('.task-error img').count(), 0);
  log('authentication errors are visible, escaped, and redact API keys');

  behavior = 'slow'; calls = [];
  await page.locator('#prompt').fill('取消等待测试');
  await page.locator('#generateButton').click();
  await page.waitForFunction(() => !document.querySelector('#cancelButton').hidden);
  await page.locator('#cancelButton').click();
  await page.locator('#cancelButton').waitFor({ state: 'hidden' });
  assert.match(await topCard().textContent(), /已停止等待/);
  assert.match(await topCard().textContent(), /可能仍会生成和计费/);
  log('stopping a generation aborts the wait and reports upstream billing uncertainty');

  behavior = 'remote';
  await generate('URL 返回及本地保存测试');
  assert.match(await topCard().textContent(), /待保存/);
  assert.equal(remoteHeaders.authorization, undefined);
  remoteAllowed = true;
  await topCard().locator('[data-retry-save]').click();
  await page.waitForFunction(() => document.querySelector('#results .result-card .save-note').textContent.includes('已保存到当前浏览器'));
  assert.equal(remoteHeaders.authorization, undefined);
  await page.reload(); await waitReady();
  assert.ok(await topCard().locator('.image-open img').evaluate(img => img.src.startsWith('blob:')));
  log('URL-only output is marked unsaved on CORS failure, can be saved later, and never receives credentials');

  await page.locator('.nav-item[data-page=history]').click();
  await page.locator('#historySearch').fill('URL 返回');
  assert.equal(await page.locator('#historyResults .result-card').count(), 1);
  await page.locator('#historyResults [data-delete]').click();
  await page.locator('#confirmDelete').click();
  await page.waitForFunction(() => document.querySelector('#confirmDialog').open === false);
  assert.equal(await page.locator('#historyResults .result-card').count(), 0);
  await page.locator('#historySearch').fill('');
  await page.screenshot({ path: 'test-results/history.png', fullPage: true });
  log('local gallery search and confirmed deletion work');

  await page.locator('.connection-pill').click();
  await page.locator('#rememberKey').check();
  await page.locator('#settingsForm button[type=submit]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('huancai.key.v1')), 'test-browser-key');
  await page.locator('.connection-pill').click();
  await page.locator('#forgetKey').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('huancai.key.v1')), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('huancai.key.v1')), null);
  const records = await page.evaluate(async () => { const { listTasks } = await import('/src/storage.js'); return JSON.stringify(await listTasks()); });
  assert.ok(!records.includes('test-browser-key'));
  await page.screenshot({ path: 'test-results/settings.png', fullPage: true });
  await page.keyboard.press('Escape');
  log('explicit remember/forget behavior and no keys in IndexedDB history');

  assert.deepEqual(consoleErrors, []);
  log('no uncaught browser JavaScript errors');
} catch (error) {
  failures.push(error.stack);
  await page.screenshot({ path: 'test-results/failure.png', fullPage: true });
  console.error(error.stack);
} finally {
  await writeFile('test-results/report.json', JSON.stringify({ passed: report, failures, consoleErrors }, null, 2));
  await context.close(); await browser.close();
  if (failures.length) process.exitCode = 1;
}
