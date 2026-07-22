import { Pressable, StyleSheet, Text } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import type { PanelMarker as PanelMarkerType } from '@/types/pricePanel';
import type { ImageDisplayRect } from '@/types/tag';

type PanelMarkerProps = {
  imageRect: ImageDisplayRect;
  isSelected: boolean;
  marker: PanelMarkerType;
  number: number;
  onPress: (markerId: string) => void;
};

const MARKER_SIZE = 34;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PanelMarker({ imageRect, isSelected, marker, number, onPress }: PanelMarkerProps) {
  const rawLeft = imageRect.x + marker.x * imageRect.width - MARKER_SIZE / 2;
  const rawTop = imageRect.y + marker.y * imageRect.height - MARKER_SIZE / 2;
  const left = clamp(rawLeft, imageRect.x, imageRect.x + imageRect.width - MARKER_SIZE);
  const top = clamp(rawTop, imageRect.y, imageRect.y + imageRect.height - MARKER_SIZE);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select price marker ${number}`}
      onPress={() => onPress(marker.id)}
      style={[styles.marker, isSelected && styles.selectedMarker, { left, top }]}>
      <Text style={styles.markerText}>{number}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    zIndex: 3,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
    borderColor: theme.colors.priceTagBorder,
    backgroundColor: theme.colors.priceTagBackground,
    ...theme.shadows.tag,
  },
  selectedMarker: {
    borderColor: theme.colors.sold,
    borderWidth: 3,
  },
  markerText: {
    ...theme.typography.caption,
    color: theme.colors.priceTagText,
    textAlign: 'center',
  },
});
