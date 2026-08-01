import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type View as RNView } from 'react-native';
import type { RefObject } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EDITOR_FLOATING_MAIN_BAR_HEIGHT } from '@/components/editor/EditorFloatingControls';
import type { CoachAnchorRect } from '@/components/editor/EditorCoachMark';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorContextualTipId } from '@/types/tips';

type EditorContextualTipProps = {
  tipId: EditorContextualTipId;
  title: string;
  canvasRef: RefObject<RNView | null>;
  alignButtonRef: RefObject<RNView | null>;
  /** Canvas-local tag bounds for Tip A (multi-select). */
  tagRect: CoachAnchorRect | null;
  measureToken: number;
  onGotIt: () => void;
};

const DEFAULT_HOLE_PADDING = 4;
const TAG_HOLE_PADDING = 4;
const ARROW_SIZE = 10;
const CARD_MAX_WIDTH = 320;
const CARD_GAP = 10;
const DIM_COLOR = 'rgba(0, 0, 0, 0.55)';
/** Match coach: sharp rect cutouts so ring + hole + dim share one pixel box. */
const HOLE_RADIUS = 0;
/** Title + Got it — first-frame fallback until onLayout. */
const ESTIMATED_CARD_HEIGHT = 96;

type HoleRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function roundRect(rect: HoleRect): HoleRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}

function expandHole(
  anchor: HoleRect,
  padding: number,
  rootWidth: number,
  rootHeight: number,
): HoleRect {
  const x = Math.max(0, anchor.x - padding);
  const y = Math.max(0, anchor.y - padding);
  const right = Math.min(rootWidth, anchor.x + anchor.width + padding);
  const bottom = Math.min(rootHeight, anchor.y + anchor.height + padding);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function measureInWindow(ref: RefObject<RNView | null>): Promise<CoachAnchorRect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
        resolve(null);
        return;
      }

      resolve({ x, y, width, height });
    });
  });
}

/**
 * Post-coach discovery spotlight — same dim/hole/ring/arrow pattern as EditorCoachMark.
 * Single hole only (never merges nearby targets).
 */
export function EditorContextualTip({
  tipId,
  title,
  canvasRef,
  alignButtonRef,
  tagRect,
  measureToken,
  onGotIt,
}: EditorContextualTipProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rootRef = useRef<RNView | null>(null);
  const [anchor, setAnchor] = useState<CoachAnchorRect | null>(null);
  const [rootSize, setRootSize] = useState({ width: 0, height: 0 });
  const [cardMeasuredHeight, setCardMeasuredHeight] = useState(0);
  const cardHeight = cardMeasuredHeight > 0 ? cardMeasuredHeight : ESTIMATED_CARD_HEIGHT;
  const isTagTip = tipId === 'multi-select';
  const gotItLabel = t('editor.tips.gotIt');

  const handleRootLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRootSize({ width, height });
  }, []);

  const handleCardWrapLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight <= 0) {
      return;
    }

    setCardMeasuredHeight((current) => (Math.abs(current - nextHeight) < 0.5 ? current : nextHeight));
  }, []);

  useEffect(() => {
    setCardMeasuredHeight(0);
  }, [tipId, title]);

  useEffect(() => {
    let cancelled = false;
    let frameId = 0;

    const run = async () => {
      await new Promise<void>((resolve) => {
        frameId = requestAnimationFrame(() => resolve());
      });

      if (cancelled) {
        return;
      }

      const targetRef = isTagTip ? canvasRef : alignButtonRef;
      const [rootRect, targetRect] = await Promise.all([
        measureInWindow(rootRef),
        measureInWindow(targetRef),
      ]);

      if (cancelled || !rootRect || !targetRect) {
        return;
      }

      const localX = targetRect.x - rootRect.x;
      const localY = targetRect.y - rootRect.y;

      if (isTagTip) {
        if (!tagRect) {
          return;
        }

        setAnchor(
          roundRect({
            x: localX + tagRect.x,
            y: localY + tagRect.y,
            width: tagRect.width,
            height: tagRect.height,
          }),
        );
        return;
      }

      setAnchor(
        roundRect({
          x: localX,
          y: localY,
          width: targetRect.width,
          height: targetRect.height,
        }),
      );
    };

    void run();

    return () => {
      cancelled = true;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [alignButtonRef, canvasRef, isTagTip, measureToken, tagRect]);

  const hole = useMemo(() => {
    if (!anchor || rootSize.width <= 0 || rootSize.height <= 0) {
      return null;
    }

    const padding = isTagTip ? TAG_HOLE_PADDING : DEFAULT_HOLE_PADDING;
    return expandHole(anchor, padding, rootSize.width, rootSize.height);
  }, [anchor, isTagTip, rootSize.height, rootSize.width]);

  const cardLayout = useMemo(() => {
    const containerWidth = rootSize.width || 0;
    const containerHeight = rootSize.height || 0;
    const cardWidth = Math.min(CARD_MAX_WIDTH, Math.max(0, containerWidth - theme.spacing.lg * 2));
    const minTop = Math.max(insets.top, theme.spacing.xl);

    if (!hole || containerWidth <= 0) {
      const bottomReserve =
        insets.bottom + theme.spacing.lg + EDITOR_FLOATING_MAIN_BAR_HEIGHT + theme.spacing.sm;
      const maxTop = Math.max(minTop, containerHeight - cardHeight - bottomReserve);
      return {
        left: Math.max(theme.spacing.lg, (containerWidth - cardWidth) / 2),
        top: clamp(containerHeight * 0.28, minTop, maxTop),
        width: cardWidth,
        arrowPointsUp: false,
      };
    }

    const left = Math.max(
      theme.spacing.lg,
      Math.min(hole.x + hole.width / 2 - cardWidth / 2, containerWidth - cardWidth - theme.spacing.lg),
    );

    if (isTagTip) {
      // Keep card clear of the tag hole and the floating main bar.
      const bottomReserve =
        insets.bottom + theme.spacing.lg + EDITOR_FLOATING_MAIN_BAR_HEIGHT + theme.spacing.sm;
      const maxTop = Math.max(minTop, containerHeight - cardHeight - bottomReserve);
      const preferredAbove = hole.y - cardHeight - CARD_GAP;
      const preferredBelow = hole.y + hole.height + CARD_GAP;
      const fitsAbove = preferredAbove >= minTop;
      const fitsBelow = preferredBelow <= maxTop;
      const tagNearTop = hole.y < minTop + cardHeight + CARD_GAP;

      if (fitsBelow && (tagNearTop || !fitsAbove)) {
        return { left, top: preferredBelow, width: cardWidth, arrowPointsUp: true };
      }

      if (fitsAbove) {
        return { left, top: preferredAbove, width: cardWidth, arrowPointsUp: false };
      }

      const spaceAbove = hole.y - minTop;
      const spaceBelow = maxTop - (hole.y + hole.height);
      const useBelow = spaceBelow >= spaceAbove;
      return {
        left,
        top: clamp(useBelow ? preferredBelow : preferredAbove, minTop, maxTop),
        width: cardWidth,
        arrowPointsUp: useBelow,
      };
    }

    // Align button (bottom chrome): card above the hole, arrow points down at the button.
    // Do not clamp into the hole — keep a hard gap above the spotlight.
    const preferredTop = hole.y - cardHeight - CARD_GAP;
    const maxTopAboveHole = Math.max(minTop, hole.y - cardHeight - CARD_GAP);
    const top = clamp(preferredTop, minTop, maxTopAboveHole);
    return {
      left: Math.max(
        theme.spacing.lg,
        Math.min(hole.x + hole.width / 2 - 28, containerWidth - cardWidth - theme.spacing.lg),
      ),
      top,
      width: cardWidth,
      arrowPointsUp: false,
    };
  }, [cardHeight, hole, insets.bottom, insets.top, isTagTip, rootSize.height, rootSize.width]);

  const arrowLeft = useMemo(() => {
    if (!hole) {
      return Math.max(0, cardLayout.width / 2 - ARROW_SIZE);
    }

    const holeCenterX = hole.x + hole.width / 2;
    return Math.max(16, Math.min(holeCenterX - cardLayout.left - ARROW_SIZE, cardLayout.width - 32));
  }, [cardLayout.left, cardLayout.width, hole]);

  return (
    <View
      collapsable={false}
      onLayout={handleRootLayout}
      pointerEvents="box-none"
      ref={rootRef}
      style={styles.root}>
      {/* Four dim strips — hole is empty so long-press / Align tap pass through. */}
      {hole ? (
        <>
          <View pointerEvents="auto" style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} />
          <View
            pointerEvents="auto"
            style={[styles.dim, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]}
          />
          <View
            pointerEvents="auto"
            style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.height }]}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.dim,
              { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                top: hole.y,
                left: hole.x,
                width: hole.width,
                height: hole.height,
                borderRadius: HOLE_RADIUS,
              },
            ]}
          />
        </>
      ) : (
        <View pointerEvents="auto" style={[styles.dim, StyleSheet.absoluteFillObject]} />
      )}

      <View
        onLayout={handleCardWrapLayout}
        pointerEvents="box-none"
        style={[
          styles.cardWrap,
          {
            left: cardLayout.left,
            top: cardLayout.top,
            width: cardLayout.width,
          },
        ]}>
        {cardLayout.arrowPointsUp ? (
          <View style={[styles.arrowUp, { marginLeft: arrowLeft }]} />
        ) : null}

        <View accessibilityRole="summary" style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.footer}>
            <Pressable
              accessibilityLabel={gotItLabel}
              accessibilityRole="button"
              onPress={onGotIt}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonLabel}>{gotItLabel}</Text>
            </Pressable>
          </View>
        </View>

        {!cardLayout.arrowPointsUp ? (
          <View style={[styles.arrowDown, { marginLeft: arrowLeft }]} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  dim: {
    position: 'absolute',
    backgroundColor: DIM_COLOR,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  cardWrap: {
    position: 'absolute',
  },
  card: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  title: {
    ...theme.typography.tag,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.white,
    fontWeight: '700',
  },
  footer: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
  },
  primaryButtonLabel: {
    ...theme.typography.caption,
    color: theme.colors.accentText,
    fontWeight: '700',
  },
  arrowDown: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1A1A1A',
  },
  arrowUp: {
    width: 0,
    height: 0,
    marginBottom: -1,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1A1A1A',
  },
});
