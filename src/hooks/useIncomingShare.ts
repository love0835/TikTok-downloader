import { useEffect } from 'react';

import { extractUrl } from '../lib/url';

interface ShareIntentResult {
  hasShareIntent: boolean;
  shareIntent: {
    text?: string | null;
    webUrl?: string | null;
  };
  resetShareIntent: () => void;
}

const NOOP_RESULT: ShareIntentResult = {
  hasShareIntent: false,
  shareIntent: {},
  resetShareIntent: () => {},
};

// expo-share-intent ships a native module; loading it inside Expo Go (which
// doesn't bundle the module) would crash. Fall back to a no-op hook so the
// rest of the app — paste-from-clipboard etc. — still works in Expo Go.
let useShareIntentHook: (opts?: { resetOnBackground?: boolean }) => ShareIntentResult;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-share-intent');
  useShareIntentHook = mod?.useShareIntent ?? (() => NOOP_RESULT);
} catch {
  useShareIntentHook = () => NOOP_RESULT;
}

/**
 * Calls `onShare(url)` whenever the OS share sheet hands us a TikTok / Douyin
 * link. No-op when the share-intent native module isn't available.
 */
export function useIncomingShare(onShare: (url: string) => void) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentHook({
    resetOnBackground: true,
  });

  const webUrl = shareIntent?.webUrl ?? null;
  const text = shareIntent?.text ?? null;

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = extractUrl(webUrl || text || '');
    if (url) onShare(url);
    resetShareIntent();
  }, [hasShareIntent, webUrl, text, resetShareIntent, onShare]);
}
