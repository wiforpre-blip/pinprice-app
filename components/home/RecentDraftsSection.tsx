import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import type { EditorDraft } from '@/types/draft';

const THUMB_SIZE = 48;
const PREVIEW_LIMIT = 3;

type RecentDraftsSectionProps = {
  drafts: EditorDraft[];
  formatDisplayTitle: (draft: EditorDraft) => string;
  formatUpdatedAt: (iso: string) => string;
  onPressDraft: (draft: EditorDraft) => void;
  title: string;
  viewAllLabel: string;
};

function RecentDraftThumbnail({ uri }: { uri: string }) {
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) {
    return (
      <View style={[styles.thumb, styles.thumbFallback]}>
        <MaterialIcons color={theme.colors.textMuted} name="image-not-supported" size={22} />
      </View>
    );
  }

  return (
    <Image
      contentFit="cover"
      onError={() => setHasFailed(true)}
      source={{ uri }}
      style={styles.thumb}
    />
  );
}

export function RecentDraftsSection({
  drafts,
  formatDisplayTitle,
  formatUpdatedAt,
  onPressDraft,
  title,
  viewAllLabel,
}: RecentDraftsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleDrafts = showAll || drafts.length <= PREVIEW_LIMIT ? drafts : drafts.slice(0, PREVIEW_LIMIT);
  const canExpand = drafts.length > PREVIEW_LIMIT && !showAll;

  if (drafts.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            if (canExpand) {
              setShowAll(true);
            }
          }}
          style={({ pressed }) => [styles.viewAllButton, pressed && styles.viewAllPressed]}>
          <Text style={styles.viewAllLabel}>{`${viewAllLabel} >`}</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {visibleDrafts.map((draft, index) => {
          const displayTitle = formatDisplayTitle(draft);
          const updatedAtLabel = formatUpdatedAt(draft.updatedAt);
          const showUpdatedAt = Boolean(updatedAtLabel) && updatedAtLabel !== displayTitle;
          const isLast = index === visibleDrafts.length - 1;

          return (
            <Pressable
              accessibilityRole="button"
              key={draft.id}
              onPress={() => onPressDraft(draft)}
              style={({ pressed }) => [
                styles.row,
                isLast && styles.rowLast,
                pressed && styles.rowPressed,
              ]}>
              <RecentDraftThumbnail uri={draft.imageUri} />
              <View style={styles.textBlock}>
                <Text numberOfLines={1} style={styles.displayTitle}>
                  {displayTitle}
                </Text>
                {showUpdatedAt ? <Text style={styles.updatedAt}>{updatedAtLabel}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  viewAllButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: theme.spacing.sm,
  },
  viewAllPressed: {
    opacity: 0.7,
  },
  viewAllLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  list: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: theme.colors.background,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.photoMockBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  displayTitle: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  updatedAt: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
});
