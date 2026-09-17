import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { demoMode } from './core';

// Only explicitly labelled sections are recognized. Never select another account's key.
export function parseLocalKeys(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  let section = '';
  for (const line of contents.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const text = line.trim();
    if (/^toapis\s*[:：]?$/i.test(text)) section = 'POOL_TOAPIS_1_KEY';
    else if (/^多元探索\s*[:：]?$/.test(text)) section = 'POOL_DUOYUAN_1_KEY';
    else if (/^image2\s*[:：]?$/i.test(text)) section = 'RELAY_API_KEY';
    else {
      const key = text.match(/(?:^|[\s:：])(sk-[A-Za-z0-9_-]+)/)?.[1];
      if (key && section) { result[section] = key; section = ''; }
    }
  }
  return result;
}

export function providerSecret(name: string): string | undefined {
  // Admin configuration cannot be used to exfiltrate unrelated environment variables.
  if (!/^POOL_[A-Z0-9_]+_KEY$/.test(name) && name !== 'RELAY_API_KEY') return undefined;
  const env = process.env[name]?.trim();
  if (env) return env;
  if (!demoMode()) return undefined;
  const file = path.resolve(/* turbopackIgnore: true */ process.env.RELAY_CONFIG_FILE || 'api key.txt');
  return existsSync(/* turbopackIgnore: true */ file) ? parseLocalKeys(readFileSync(/* turbopackIgnore: true */ file, 'utf8'))[name] : undefined;
}

export function safeProviderBase(value: string) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) throw new Error('供应商地址必须是不含密钥、查询参数的 HTTPS 地址');
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || !host.includes('.') || /^\d+(\.\d+){3}$/.test(host) || host.includes(':')) throw new Error('请使用供应商公网域名');
  return u.toString().replace(/\/+$/, '');
}
