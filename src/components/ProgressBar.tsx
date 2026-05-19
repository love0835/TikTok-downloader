import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

interface Props {
  /** 0..1, or undefined for an indeterminate bar. */
  value?: number;
}

export function ProgressBar({ value }: Props) {
  const clamped = value === undefined ? undefined : Math.max(0, Math.min(1, value));
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          clamped === undefined
            ? styles.indeterminate
            : { width: `${clamped * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  indeterminate: {
    width: '40%',
  },
});
