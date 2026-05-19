import { IOS_UA, fetchText, safeFetch } from './http';
import { ParseError, type ParsedVideo } from './types';

const AWEME_ID_RE = /\/(?:video|note)\/(\d+)/;
const RENDER_DATA_RE =
  /<script[^>]*id="RENDER_DATA"[^>]*>([\s\S]*?)<\/script>/;
const ROUTER_DATA_RE =
  /<script[^>]*id="(?:_ROUTER_DATA|RENDER_DATA)"[^>]*>([\s\S]*?)<\/script>/;

const SHARE_HEADERS = {
  'User-Agent': IOS_UA,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Referer: 'https://www.douyin.com/',
};

interface AwemeDetail {
  aweme_id?: string;
  desc?: string;
  author?: { nickname?: string; unique_id?: string };
  video?: {
    play_addr?: { url_list?: string[] };
    play_addr_h264?: { url_list?: string[] };
    download_addr?: { url_list?: string[] };
    cover?: { url_list?: string[] };
    origin_cover?: { url_list?: string[] };
  };
}

function extractAwemeDetail(json: unknown): AwemeDetail | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, any>;

  if (root.aweme_detail) return root.aweme_detail as AwemeDetail;

  const loaderData = root.loaderData;
  if (loaderData && typeof loaderData === 'object') {
    for (const key of Object.keys(loaderData)) {
      const node = loaderData[key];
      const detail =
        node?.videoInfoRes?.item_list?.[0] ||
        node?.aweme_detail ||
        node?.aweme?.detail ||
        node?.videoInfo?.aweme_detail;
      if (detail) return detail as AwemeDetail;
    }
  }

  const itemList = root.item_list;
  if (Array.isArray(itemList) && itemList.length > 0) {
    return itemList[0] as AwemeDetail;
  }
  return null;
}

function preferNoWatermark(url: string): string {
  // Old playwm endpoints embed a watermark; the play endpoint is clean.
  return url.replace('/playwm/', '/play/').replace('playwm', 'play');
}

async function followShortLink(url: string): Promise<string> {
  // v.douyin.com/XXX → iesdouyin share URL via 302.
  const res = await safeFetch(url, {
    method: 'GET',
    headers: SHARE_HEADERS,
  });
  return res.url || url;
}

export async function parseDouyin(rawUrl: string): Promise<ParsedVideo> {
  const expandedUrl = await followShortLink(rawUrl);
  const idMatch = expandedUrl.match(AWEME_ID_RE);
  if (!idMatch) {
    throw new ParseError('無法從抖音連結解析出影片 ID。');
  }
  const awemeId = idMatch[1];

  // The iesdouyin share page is the most stable structured source.
  const shareUrl = `https://www.iesdouyin.com/share/video/${awemeId}/?region=CN&mid=&u_code=0&did=&iid=&with_sec_did=1`;
  const { text: html, status } = await fetchText(shareUrl, {
    headers: SHARE_HEADERS,
  });
  if (status >= 400) {
    throw new ParseError(`抖音分享頁面回傳 HTTP ${status}`);
  }

  let detail: AwemeDetail | null = null;
  const renderMatch = html.match(RENDER_DATA_RE) || html.match(ROUTER_DATA_RE);
  if (renderMatch) {
    const raw = renderMatch[1].trim();
    try {
      // RENDER_DATA is URL-encoded JSON; ROUTER_DATA is plain JSON.
      const decoded = raw.startsWith('{') ? raw : decodeURIComponent(raw);
      detail = extractAwemeDetail(JSON.parse(decoded));
    } catch (err) {
      throw new ParseError('抖音頁面 JSON 解析失敗。', err);
    }
  }

  if (!detail) {
    throw new ParseError('找不到抖音影片資料，連結可能失效或頁面結構已變更。');
  }

  const urlList =
    detail.video?.play_addr?.url_list ||
    detail.video?.play_addr_h264?.url_list ||
    detail.video?.download_addr?.url_list ||
    [];
  const playUrl = urlList.find(Boolean);
  if (!playUrl) {
    throw new ParseError('抖音影片解析成功，但找不到可下載的影片連結。');
  }

  return {
    platform: 'douyin',
    videoId: detail.aweme_id || awemeId,
    downloadUrl: preferNoWatermark(playUrl),
    cover:
      detail.video?.cover?.url_list?.[0] ||
      detail.video?.origin_cover?.url_list?.[0],
    title: detail.desc,
    author: detail.author?.nickname || detail.author?.unique_id,
    downloadHeaders: {
      'User-Agent': IOS_UA,
      Referer: 'https://www.douyin.com/',
    },
  };
}
