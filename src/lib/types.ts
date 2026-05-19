export type Platform = 'tiktok' | 'douyin';

export interface ParsedVideo {
  platform: Platform;
  videoId: string;
  /** Direct, watermark-free mp4 URL ready to fetch. */
  downloadUrl: string;
  /** Optional thumbnail URL. */
  cover?: string;
  /** Optional caption / description. */
  title?: string;
  /** Author display name, if known. */
  author?: string;
  /** Headers that must be sent when fetching downloadUrl. */
  downloadHeaders?: Record<string, string>;
}

export class ParseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ParseError';
  }
}
