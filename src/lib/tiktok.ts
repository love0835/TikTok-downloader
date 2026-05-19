import { DESKTOP_UA, fetchText } from './http';
import { ParseError, type ParsedVideo } from './types';

const VIDEO_ID_RE = /\/video\/(\d+)/;
const PHOTO_ID_RE = /\/photo\/(\d+)/;
const UNIVERSAL_DATA_RE =
  /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;
const SIGI_STATE_RE = /<script[^>]*id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/;

interface ItemStruct {
  id?: string;
  desc?: string;
  author?: { uniqueId?: string; nickname?: string };
  video?: {
    playAddr?: string;
    downloadAddr?: string;
    cover?: string;
    dynamicCover?: string;
    originCover?: string;
    bitrateInfo?: Array<{ PlayAddr?: { UrlList?: string[] } }>;
  };
}

function pickItemStruct(json: unknown): ItemStruct | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, any>;

  const scoped = root['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.itemInfo?.itemStruct;
  if (scoped) return scoped as ItemStruct;

  const items = root.ItemModule;
  if (items && typeof items === 'object') {
    const first = Object.values(items)[0];
    if (first) return first as ItemStruct;
  }
  return null;
}

function pickPlayUrl(item: ItemStruct): string | null {
  const v = item.video;
  if (!v) return null;
  const bitrateUrl = v.bitrateInfo?.[0]?.PlayAddr?.UrlList?.[0];
  return v.playAddr || bitrateUrl || v.downloadAddr || null;
}

export async function parseTikTok(rawUrl: string): Promise<ParsedVideo> {
  const headers = {
    'User-Agent': DESKTOP_UA,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const { text: html, finalUrl, status } = await fetchText(rawUrl, { headers });
  if (status >= 400) {
    throw new ParseError(`TikTok responded with HTTP ${status}`);
  }

  const idMatch = finalUrl.match(VIDEO_ID_RE) || finalUrl.match(PHOTO_ID_RE);

  let item: ItemStruct | null = null;
  const universal = html.match(UNIVERSAL_DATA_RE);
  if (universal) {
    try {
      item = pickItemStruct(JSON.parse(universal[1]));
    } catch {
      /* fall through to next strategy */
    }
  }

  if (!item) {
    const sigi = html.match(SIGI_STATE_RE);
    if (sigi) {
      try {
        item = pickItemStruct(JSON.parse(sigi[1]));
      } catch {
        /* fall through */
      }
    }
  }

  if (!item) {
    throw new ParseError(
      '無法從 TikTok 頁面解析影片資訊，可能是連結失效或頁面結構已變更。',
    );
  }

  const downloadUrl = pickPlayUrl(item);
  if (!downloadUrl) {
    throw new ParseError('TikTok 影片解析成功，但找不到可下載的影片連結。');
  }

  return {
    platform: 'tiktok',
    videoId: item.id || idMatch?.[1] || '',
    downloadUrl,
    cover: item.video?.cover || item.video?.originCover,
    title: item.desc,
    author: item.author?.nickname || item.author?.uniqueId,
    // TikTok's CDN gates playback on a browser-like User-Agent + Referer.
    downloadHeaders: {
      'User-Agent': DESKTOP_UA,
      Referer: 'https://www.tiktok.com/',
    },
  };
}
