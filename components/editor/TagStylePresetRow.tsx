import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { TagOutlinedText } from '@/components/editor/TagOutlinedText';
import {
  TAG_STYLE_PRESETS,
  getStylePresetIdsForType,
  getTagTextShadowStyle,
  isTransparentTagBackground,
} from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { TagStylePresetId, TagType } from '@/types/tag';

type TagStylePresetRowProps = {
  type: TagType;
  activeStylePresetId: TagStylePresetId;
  onSelect: (stylePresetId: TagStylePresetId) => void;
  soldSampleLabel?: string;
  textSampleLabel?: string;
};

export function TagStylePresetRow({
  type,
  activeStylePresetId,
  onSelect,
  soldSampleLabel = 'SOLD',
  textSampleLabel = 'Aa',
}: TagStylePresetRowProps) {
  const isPriceStyleRow = type === 'price';
  const isSoldStyleRow = type === 'sold';
  const isTextStyleRow = type === 'text';

  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
      {getStylePresetIdsForType(type).map((stylePresetId) => {
        const preset = TAG_STYLE_PRESETS[stylePresetId];
        const isActive = stylePresetId === activeStylePresetId;
        const isFlat = isTransparentTagBackground(preset.backgroundColor);
        const borderRadius = preset.borderRadius ?? theme.radius.sm - 2;
        const borderWidth =
          preset.borderWidth ?? (isFlat && preset.borderColor === 'transparent' ? 0 : 1);
        const isPlainCross = stylePresetId === 'sold-icon-plain';

        if (isPriceStyleRow || isSoldStyleRow || isTextStyleRow) {
          const sampleLabel = isSoldStyleRow ? soldSampleLabel : isTextStyleRow ? textSampleLabel : '฿';

          return (
            <Pressable
              accessibilityLabel={preset.label}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : undefined}
              key={stylePresetId}
              onPress={() => onSelect(stylePresetId)}
              style={[styles.previewOuter, isActive && styles.activeOuter]}>
              <View
                style={[
                  styles.preview,
                  isPlainCross && styles.plainCrossPreview,
                  {
                    backgroundColor: isPlainCross || isFlat ? 'transparent' : preset.backgroundColor,
                    borderColor:
                      isPlainCross || preset.borderColor === 'transparent'
                        ? 'transparent'
                        : preset.borderColor,
                    borderWidth: isPlainCross ? 0 : borderWidth,
                    borderRadius: isPlainCross ? 0 : Math.min(borderRadius, 16),
                    ...(preset.rotateDeg
                      ? { transform: [{ rotate: `${preset.rotateDeg}deg` as const }] }
                      : null),
                    ...(!isPlainCross && preset.viewShadow
                      ? {
                          shadowColor: preset.viewShadow.shadowColor,
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.18,
                          shadowRadius: 2,
                          elevation: 1,
                        }
                      : null),
                  },
                ]}>
                {isPlainCross ? (
                  <SoldCrossIcon color={preset.color} size={18} thicknessScale={2} />
                ) : (
                  <TagOutlinedText
                    color={preset.color}
                    numberOfLines={1}
                    outline={preset.textOutline ?? null}
                    style={[
                      styles.previewText,
                      preset.textOutline ? null : getTagTextShadowStyle(preset.textShadow ?? null),
                      { fontWeight: preset.fontWeight ?? '800' },
                    ]}>
                    {sampleLabel}
                  </TagOutlinedText>
                )}
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            accessibilityLabel={preset.label}
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : undefined}
            key={stylePresetId}
            onPress={() => onSelect(stylePresetId)}
            style={[styles.swatchOuter, isActive && styles.activeOuter]}>
            <View
              style={[
                styles.swatchInner,
                {
                  backgroundColor: preset.backgroundColor,
                  borderColor:
                    preset.borderColor === 'transparent' ? theme.colors.border : preset.borderColor,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.xs,
  },
  swatchOuter: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  activeOuter: {
    borderColor: theme.colors.accent,
  },
  swatchInner: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.sm - 2,
    borderWidth: 1,
  },
  previewOuter: {
    minWidth: 48,
    minHeight: 40,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  preview: {
    minHeight: 22,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plainCrossPreview: {
    minWidth: 28,
    paddingHorizontal: 2,
  },
  previewText: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 14,
  },
});
