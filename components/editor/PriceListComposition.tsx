import { useMemo, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { FALLBACK_CHART_HEIGHT, getPricePanelCompositionLayout, type Size } from '@/utils/pricePanelLayout';

type PriceListCompositionProps = {
  chart: ReactNode;
  children: ReactNode;
  showChart: boolean;
};

/**
 * Fixed composition shell for Price List mode:
 * top = image/markers area, bottom = attached price chart.
 * Measures itself and applies explicit heights so the chart cannot collapse to 0.
 */
export function PriceListComposition({ chart, children, showChart }: PriceListCompositionProps) {
  const [compositionSize, setCompositionSize] = useState<Size>({ width: 0, height: 0 });

  const layout = useMemo(
    () =>
      getPricePanelCompositionLayout(compositionSize, null, {
        hasChart: showChart,
      }),
    [compositionSize, showChart],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width <= 0 || height <= 0) {
      return;
    }

    setCompositionSize((current) => {
      if (current.width === width && current.height === height) {
        return current;
      }

      return { width, height };
    });
  };

  const hasMeasuredSize = compositionSize.width > 0 && compositionSize.height > 0;
  const chartHeight = showChart ? (layout.chartHeight > 0 ? layout.chartHeight : FALLBACK_CHART_HEIGHT) : 0;
  const imageAreaHeight = showChart && hasMeasuredSize ? layout.imageAreaSize.height : undefined;

  return (
    <View onLayout={handleLayout} style={styles.composition}>
      <View
        style={[
          styles.imageArea,
          imageAreaHeight != null ? { height: imageAreaHeight, flexGrow: 0, flexShrink: 0 } : styles.imageAreaFlex,
        ]}>
        {children}
      </View>
      {showChart && chartHeight > 0 ? (
        <View style={[styles.chartArea, { height: chartHeight, flexGrow: 0, flexShrink: 0 }]}>{chart}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  composition: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.photoStageBackground,
  },
  imageArea: {
    overflow: 'hidden',
    minHeight: 0,
    backgroundColor: theme.colors.photoStageBackground,
  },
  imageAreaFlex: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  chartArea: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexGrow: 0,
    flexShrink: 0,
  },
});
