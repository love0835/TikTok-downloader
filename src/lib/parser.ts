import { parseDouyin } from './douyin';
import { parseTikTok } from './tiktok';
import { ParseError, type ParsedVideo } from './types';
import { detectPlatform, extractUrl } from './url';

export async function parseVideo(input: string): Promise<ParsedVideo> {
  const url = extractUrl(input);
  if (!url) {
    throw new ParseError('找不到有效的網址，請貼上一個 TikTok 或抖音連結。');
  }
  const platform = detectPlatform(url);
  if (platform === 'tiktok') return parseTikTok(url);
  if (platform === 'douyin') return parseDouyin(url);
  throw new ParseError('不支援的網址，目前只接受 TikTok 與抖音的連結。');
}

export { ParseError };
export type { ParsedVideo };
