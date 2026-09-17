import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { demoMode } from './core';
import { parseLocalKeys } from './provider-secrets';

export type RelayConfig = { baseUrl: string; apiKey: string };

function normalizeBaseUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('中转地址必须使用 HTTPS');
  const pathname = url.pathname.replace(/\/$/, '');
  url.pathname = pathname.endsWith('/v1') ? pathname : `${pathname}/v1`;
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function fromLocalFile(): RelayConfig | null {
  if (!demoMode()) return null;
  const configPath = path.resolve(/* turbopackIgnore: true */ process.env.RELAY_CONFIG_FILE || 'api key.txt');
  if (!existsSync(/* turbopackIgnore: true */ configPath)) return null;
  const lines = readFileSync(/* turbopackIgnore: true */ configPath, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const baseUrl = lines.find(line => /^https?:\/\//i.test(line));
  const apiKey = parseLocalKeys(lines.join('\n')).RELAY_API_KEY || (lines.filter(line => /^sk-[A-Za-z0-9_-]+$/.test(line)).length === 1 ? lines.find(line => /^sk-/.test(line)) : undefined);
  return baseUrl && apiKey ? { baseUrl: normalizeBaseUrl(baseUrl), apiKey } : null;
}

export function relayConfig(): RelayConfig | null {
  const apiKey = process.env.RELAY_API_KEY?.trim();
  const baseUrl = process.env.RELAY_BASE_URL?.trim();
  if (apiKey && baseUrl) return { baseUrl: normalizeBaseUrl(baseUrl), apiKey };
  return fromLocalFile();
}

export const relayImageModel = () => process.env.RELAY_IMAGE_MODEL?.trim() || 'gpt-image-2';
