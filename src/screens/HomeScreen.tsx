import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { VideoCard } from '../components/VideoCard';
import { downloadVideo } from '../lib/download';
import { ParseError, parseVideo } from '../lib/parser';
import type { ParsedVideo } from '../lib/types';
import { colors, radius, spacing } from '../theme';
import { useIncomingShare } from '../hooks/useIncomingShare';

type Status =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'parsed'; video: ParsedVideo }
  | { kind: 'downloading'; video: ParsedVideo; ratio?: number; bytesWritten: number; totalBytes: number }
  | { kind: 'done'; video: ParsedVideo }
  | { kind: 'error'; message: string };

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function HomeScreen() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const isBusy = status.kind === 'parsing' || status.kind === 'downloading';

  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) setUrl(text);
    } catch {
      /* ignore */
    }
  }, []);

  const handleParse = useCallback(async () => {
    if (!url.trim() || isBusy) return;
    setStatus({ kind: 'parsing' });
    try {
      const video = await parseVideo(url);
      setStatus({ kind: 'parsed', video });
    } catch (err) {
      const message =
        err instanceof ParseError ? err.message :
        err instanceof Error ? err.message :
        '解析失敗，請稍後重試。';
      setStatus({ kind: 'error', message });
    }
  }, [url, isBusy]);

  const handleDownload = useCallback(async () => {
    if (status.kind !== 'parsed') return;
    const { video } = status;
    setStatus({ kind: 'downloading', video, bytesWritten: 0, totalBytes: 0 });
    try {
      await downloadVideo(video, {
        saveToGallery: true,
        onProgress: p => {
          setStatus({
            kind: 'downloading',
            video,
            bytesWritten: p.bytesWritten,
            totalBytes: p.totalBytes,
            ratio: p.ratio,
          });
        },
      });
      setStatus({ kind: 'done', video });
      Alert.alert('完成', '影片已儲存到相簿。');
    } catch (err) {
      const message = err instanceof Error ? err.message : '下載失敗。';
      setStatus({ kind: 'error', message });
    }
  }, [status]);

  const handleReset = useCallback(() => {
    setUrl('');
    setStatus({ kind: 'idle' });
  }, []);

  // Listen for shared URLs coming from the OS share sheet.
  useIncomingShare(sharedUrl => {
    setUrl(sharedUrl);
    setStatus({ kind: 'idle' });
  });

  // When the user finishes a download, auto-clear after a short delay so the
  // form is ready for the next link.
  useEffect(() => {
    if (status.kind !== 'done') return;
    const t = setTimeout(() => {
      handleReset();
    }, 1800);
    return () => clearTimeout(t);
  }, [status, handleReset]);

  const ctaTitle = useMemo(() => {
    switch (status.kind) {
      case 'parsing':
        return '解析中…';
      case 'parsed':
        return '下載並儲存到相簿';
      case 'downloading':
        return status.ratio !== undefined
          ? `下載中… ${Math.round(status.ratio * 100)}%`
          : '下載中…';
      case 'done':
        return '已儲存 ✓';
      default:
        return '解析連結';
    }
  }, [status]);

  const onPressCta = () => {
    if (status.kind === 'parsed') return handleDownload();
    if (status.kind === 'done') return handleReset();
    return handleParse();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>TikTok / 抖音</Text>
            <Text style={styles.brandAccent}>下載器</Text>
            <Text style={styles.subtitle}>
              貼上影片連結，一鍵存進你的相簿。
            </Text>
          </View>

          <View style={styles.inputCard}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://www.tiktok.com/... 或 https://v.douyin.com/..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
              style={styles.input}
              editable={!isBusy}
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                onPress={handlePaste}
                style={styles.ghostBtn}
                disabled={isBusy}
              >
                <Text style={styles.ghostBtnText}>從剪貼簿貼上</Text>
              </TouchableOpacity>
              {url.length > 0 && !isBusy ? (
                <TouchableOpacity onPress={() => setUrl('')} style={styles.ghostBtn}>
                  <Text style={styles.ghostBtnText}>清除</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <PrimaryButton
            title={ctaTitle}
            onPress={onPressCta}
            loading={status.kind === 'parsing' || status.kind === 'downloading'}
            disabled={!url.trim() && status.kind === 'idle'}
          />

          {status.kind === 'downloading' && (
            <View style={styles.progressBox}>
              <ProgressBar value={status.ratio} />
              <Text style={styles.progressText}>
                {formatBytes(status.bytesWritten)}
                {status.totalBytes > 0 ? ` / ${formatBytes(status.totalBytes)}` : ''}
              </Text>
            </View>
          )}

          {status.kind === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>出了點問題</Text>
              <Text style={styles.errorText}>{status.message}</Text>
            </View>
          )}

          {(status.kind === 'parsed' ||
            status.kind === 'downloading' ||
            status.kind === 'done') && (
            <VideoCard
              video={status.kind === 'done' ? status.video : status.video}
            />
          )}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>使用方式</Text>
            <Text style={styles.tipsText}>
              1. 在 TikTok / 抖音 App 點「分享 → 複製連結」{'\n'}
              2. 回到本 App，貼上連結後按「解析」{'\n'}
              3. 確認影片後按「下載」即會存到相簿{'\n'}
              4. 你也可以在原 App 用「分享 → TikTok 下載器」直接帶入連結
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginTop: spacing.md,
  },
  brand: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  brandAccent: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
    marginTop: -4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  inputCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ghostBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  ghostBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  progressBox: {
    gap: spacing.sm,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '700',
  },
  errorText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  tipsBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tipsTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  tipsText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
