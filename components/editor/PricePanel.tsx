import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import type { PanelMarker } from '@/types/pricePanel';

type PricePanelProps = {
  markers: PanelMarker[];
  onDeleteMarker: (markerId: string) => void;
  onEditMarker: (markerId: string) => void;
  placeholder: string;
  selectedMarkerId: string | null;
};

const NARROW_PANEL_WIDTH = 280;
const GRID_GAP = theme.spacing.xs;

export function PricePanel({ markers, onDeleteMarker, onEditMarker, placeholder, selectedMarkerId }: PricePanelProps) {
  const [panelWidth, setPanelWidth] = useState(0);
  const columns = panelWidth > 0 && panelWidth < NARROW_PANEL_WIDTH ? 1 : 2;
  const cellWidth = panelWidth > 0 ? (panelWidth - GRID_GAP * (columns - 1)) / columns : undefined;

  const handlePanelLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (nextWidth > 0 && nextWidth !== panelWidth) {
      setPanelWidth(nextWidth);
    }
  };

  return (
    <View style={styles.panel}>
      <ScrollView contentContainerStyle={styles.rows} keyboardShouldPersistTaps="handled">
        <View onLayout={handlePanelLayout} style={[styles.grid, { gap: GRID_GAP }]}>
          {markers.map((marker, index) => {
            const isSelected = marker.id === selectedMarkerId;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isSelected ? { selected: true } : undefined}
                key={marker.id}
                onPress={() => onEditMarker(marker.id)}
                style={[styles.cell, cellWidth ? { width: cellWidth } : styles.cellFallback, isSelected && styles.selectedCell]}>
                <View style={[styles.badge, isSelected && styles.selectedBadge]}>
                  <Text style={[styles.badgeText, isSelected && styles.selectedBadgeText]}>{index + 1}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.priceText, !marker.priceText && styles.placeholderText]}>
                  {marker.priceText || placeholder}
                </Text>
                {isSelected ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete price marker"
                    hitSlop={6}
                    onPress={(event) => {
                      event.stopPropagation();
                      onDeleteMarker(marker.id);
                    }}
                    style={styles.deleteButton}>
                    <MaterialIcons color={theme.colors.sold} name="delete-outline" size={18} />
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  rows: {
    flexGrow: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  cellFallback: {
    width: '48%',
  },
  selectedCell: {
    borderColor: theme.colors.sold,
    backgroundColor: theme.colors.photoMockBackground,
  },
  badge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.priceTagBorder,
    backgroundColor: theme.colors.priceTagBackground,
  },
  selectedBadge: {
    borderColor: theme.colors.sold,
    backgroundColor: theme.colors.sold,
  },
  badgeText: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.priceTagText,
  },
  selectedBadgeText: {
    color: theme.buttons.primary.color,
  },
  priceText: {
    flex: 1,
    minWidth: 0,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  placeholderText: {
    color: theme.colors.textMuted,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
});
