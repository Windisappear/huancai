import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test('register, test top-up, generate, download and sync on another device', async ({ page, browser }) => {
  const username = `e2e_${randomUUID().slice(0, 10).replace(/-/g, '')}`; const password = 'Local-test-pass-2026';
  await page.goto('/'); await expect(page.getByRole('heading', { name: '图片创作' })).toBeVisible();
  await page.screenshot({ path: 'test-results/studio-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '登录 / 注册', exact: true }).click();
  await page.getByRole('button', { name: '创建新账户', exact: true }).click();
  await page.getByLabel('账号', { exact: true }).fill(username); await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '注册并继续' }).click(); await expect(page.getByText('保存你的账户恢复码')).toBeVisible();
  const recovery = await page.locator('.recovery-code').innerText(); expect(recovery.length).toBeGreaterThan(20);
  await page.getByRole('button', { name: '我已保存' }).click();
  await page.getByRole('button', { name: '钱包', exact: true }).click();
  await page.getByRole('button', { name: '确认测试充值' }).click(); await expect(page.locator('.big-balance')).toHaveText('¥10.00');
  await page.getByRole('button', { name: '创作', exact: true }).click();
  await page.getByLabel('生成模型').selectOption('demo'); // Never use a paid model in UI regression tests.
  await page.getByLabel('画面描述').fill('测试画面，柔和光线');
  await expect(page.getByRole('button', { name: '生成图片', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '生成图片', exact: true }).click();
  await expect(page.locator('.status.succeeded')).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: 'test-results/studio-result.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('link', { name: '下载图片' }).first().click(); const download = await downloadPromise; expect(download.suggestedFilename()).toContain('1024x1024');
  const other = await browser.newContext({ baseURL: 'http://localhost:3000' }); const second = await other.newPage();
  await second.goto('/'); await second.getByRole('button', { name: '登录 / 注册', exact: true }).click(); await second.getByLabel('账号', { exact: true }).fill(username); await second.getByLabel('密码', { exact: true }).fill(password); await second.getByRole('button', { name: '登录', exact: true }).click();
  await expect(second.locator('.status.succeeded')).toBeVisible(); await expect(second.locator('.balance-pill')).toContainText('¥9.90');
  // Recovery rotates the code and invalidates the other device's session.
  const res = await page.request.post('/api/auth/recover', { headers: { Origin: 'http://localhost:3000' }, data: { username, password: 'Changed-test-pass-2026', recoveryCode: recovery } }); expect(res.ok()).toBe(true);
  const me = await second.request.get('/api/me'); expect((await me.json()).user).toBeNull();
  const reuse = await page.request.post('/api/auth/recover', { headers: { Origin: 'http://localhost:3000' }, data: { username, password, recoveryCode: recovery } }); expect(reuse.status()).toBe(400);
  await other.close();
});
test('mobile workspace has no horizontal overflow and core controls are reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.getByRole('heading', { name: '图片创作' })).toBeVisible(); await page.getByLabel('画面描述').fill('移动端测试');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/studio-mobile.png', fullPage: true });
});
