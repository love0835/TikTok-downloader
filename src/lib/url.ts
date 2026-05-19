import type { Platform } from './types';

const TIKTOK_HOSTS = [
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
];

const DOUYIN_HOSTS = [
  'douyin.com',
  'www.douyin.com',
  'v.douyin.com',
  'iesdouyin.com',
  'www.iesdouyin.com',
];

const URL_REGEX = /https?:\/\/[^\s'"<>()]+/i;

export function extractUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(URL_REGEX);
  return match ? match[0] : null;
}

export function detectPlatform(url: string): Platform | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (TIKTOK_HOSTS.some(h => host === h || host.endsWith('.' + h))) return 'tiktok';
  if (DOUYIN_HOSTS.some(h => host === h || host.endsWith('.' + h))) return 'douyin';
  return null;
}
