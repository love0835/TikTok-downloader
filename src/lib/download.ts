import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import type { ParsedVideo } from './types';

export interface DownloadProgress {
  totalBytes: number;
  bytesWritten: number;
  /** 0..1, or undefined if total is not yet known. */
  ratio?: number;
}

export interface DownloadResult {
  /** Local cache uri (file://...) of the downloaded mp4. */
  localUri: string;
  /** MediaLibrary asset id if it was saved to the gallery. */
  assetId?: string;
}

function sanitizeForFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
}

function buildFilename(video: ParsedVideo): string {
  const slug = sanitizeForFilename(video.author || video.videoId || 'video');
  const id = video.videoId || Date.now().toString();
  return `${video.platform}_${slug}_${id}.mp4`;
}

export async function downloadVideo(
  video: ParsedVideo,
  options: {
    onProgress?: (p: DownloadProgress) => void;
    saveToGallery?: boolean;
  } = {},
): Promise<DownloadResult> {
  const { onProgress, saveToGallery = true } = options;

  const filename = buildFilename(video);
  const target = (FileSystem.cacheDirectory ?? '') + filename;

  const resumable = FileSystem.createDownloadResumable(
    video.downloadUrl,
    target,
    { headers: video.downloadHeaders },
    progress => {
      if (!onProgress) return;
      const total = progress.totalBytesExpectedToWrite;
      const written = progress.totalBytesWritten;
      onProgress({
        totalBytes: total,
        bytesWritten: written,
        ratio: total > 0 ? written / total : undefined,
      });
    },
  );

  const result = await resumable.downloadAsync();
  if (!result?.uri) {
    throw new Error('下載失敗，沒有取得本地檔案路徑。');
  }

  let assetId: string | undefined;
  if (saveToGallery) {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) {
      throw new Error('沒有相簿寫入權限，請到系統設定開啟後重試。');
    }
    const asset = await MediaLibrary.createAssetAsync(result.uri);
    assetId = asset.id;
  }

  return { localUri: result.uri, assetId };
}
