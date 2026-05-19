import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { ParsedVideo } from '../lib/types';

const PLATFORM_LABEL: Record<ParsedVideo['platform'], string> = {
  tiktok: 'TikTok',
  douyin: '抖音',
};

interface Props {
  video: ParsedVideo;
}

export function VideoCard({ video }: Props) {
  return (
    <View style={styles.card}>
      {video.cover ? (
        <Image source={{ uri: video.cover }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverPlaceholderText}>無縮圖</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{PLATFORM_LABEL[video.platform]}</Text>
        </View>
        {video.title ? (
          <Text style={styles.title} numberOfLines={3}>
            {video.title}
          </Text>
        ) : null}
        {video.author ? (
          <Text style={styles.author} numberOfLines={1}>
            @{video.author}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 320,
    backgroundColor: '#000',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    color: colors.textMuted,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  author: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
