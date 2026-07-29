import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type View as RNView } from 'react-native';
import type { RefObject } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EDITOR_FLOATING_MAIN_BAR_HEIGHT } from '@/components/editor/EditorFloatingControls';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { ImageDisplayRect } from '@/types/tag';
import { getEditorCoachProgress, type EditorCoachStepId } from '@/types/tips';

export type CoachAnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type EditorCoachMarkProps = {
  stepId: EditorCoachStepId;
  styleButtonRef: RefObject<RNView | null>;
  exportButtonRef: RefObject<RNView | null>;
  saveButtonRef?: RefObject<RNView | null>;
  canvasRef: RefObject<RNView | null>;
  /** Contained image bounds inside the canvas (place-tag spotlight). */
  imageRect: ImageDisplayRect | null;
  /** Tag bounds in canvas-local coordinates (edit-price / drag-tag). */
  tagRect: CoachAnchorRect | null;
  measureToken: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
};

const HOLE_PADDING = 6;
const TAG_HOLE_PADDING = 10;
const TAG_HOLE_RADIUS = 12;
const ARROW_SIZE = 10;
const CARD_MAX_WIDTH = 320;
const CARD_GAP = 10;
const DIM_COLOR = 'rgba(0, 0, 0, 0.55)';
/** Keep ring sharp to match the rectangular spotlight cutout. */
const HOLE_RADIUS = 0;

/** First-frame fallback only — real height comes from onLayout. */
function estimateCardHeight(hasBody: boolean): number {
  return hasBody ? 158 : 112;
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

function getCopyKeys(stepId: EditorCoachStepId): { titleKey: string; bodyKey: string | null } {
  switch (stepId) {
    case 'place-tag':
      return { titleKey: 'editor.coach.placeTagTitle', bodyKey: null };
    case 'edit-price':
      return { titleKey: 'editor.coach.editPriceTitle', bodyKey: 'editor.coach.editPriceBody' };
    case 'drag-tag':
      return { titleKey: 'editor.coach.dragTagTitle', bodyKey: null };
    case 'style-button':
      return { titleKey: 'editor.coach.styleButtonTitle', bodyKey: null };
    case 'export':
      return { titleKey: 'editor.coach.exportTitle', bodyKey: 'editor.coach.exportBody' };
    default:
      return { titleKey: 'editor.coach.placeTagTitle', bodyKey: null };
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function RoundedHoleCorners({
  hole,
  radius,
}: {
  hole: { x: number; y: number; width: number; height: number };
  radius: number;
}) {
  if (radius <= 0) {
    return null;
  }

  const diameter = radius * 2;
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.roundedCornerDim,
          {
            width: diameter,
            height: diameter,
            borderRadius: radius,
            top: hole.y - radius,
            left: hole.x - radius,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.roundedCornerDim,
          {
            width: diameter,
            height: diameter,
            borderRadius: radius,
            top: hole.y - radius,
            left: hole.x + hole.width - radius,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.roundedCornerDim,
          {
            width: diameter,
            height: diameter,
            borderRadius: radius,
            top: hole.y + hole.height - radius,
            left: hole.x - radius,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.roundedCornerDim,
          {
            width: diameter,
            height: diameter,
            borderRadius: radius,
            top: hole.y + hole.height - radius,
            left: hole.x + hole.width - radius,
          },
        ]}
      />
    </>
  );
}

/**
 * Renders dim overlay with two rectangular cutouts (holes) that don't overlap.
 * Splits the screen into horizontal bands and carves out each hole in its band.
 * When holes overlap vertically, merges them into one bounding rect.
 */
function DualCutoutDim({
  hole,
  secondaryHole,
  primaryHoleRadius,
}: {
  hole: { x: number; y: number; width: number; height: number };
  secondaryHole: { x: number; y: number; width: number; height: number };
  primaryHoleRadius?: number;
}) {
  const top = hole.y < secondaryHole.y ? hole : secondaryHole;
  const bottom = hole.y < secondaryHole.y ? secondaryHole : hole;

  const topEnd = top.y + top.height;
  const overlaps = topEnd > bottom.y;

  if (overlaps) {
    const merged = {
      x: Math.min(top.x, bottom.x),
      y: top.y,
      width: Math.max(top.x + top.width, bottom.x + bottom.width) - Math.min(top.x, bottom.x),
      height: Math.max(topEnd, bottom.y + bottom.height) - top.y,
    };
    return (
      <>
        <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: merged.y }]} />
        <View pointerEvents="none" style={[styles.dim, { top: merged.y + merged.height, left: 0, right: 0, bottom: 0 }]} />
        <View pointerEvents="none" style={[styles.dim, { top: merged.y, left: 0, width: merged.x, height: merged.height }]} />
        <View pointerEvents="none" style={[styles.dim, { top: merged.y, left: merged.x + merged.width, right: 0, height: merged.height }]} />
      </>
    );
  }

  const gapHeight = bottom.y - topEnd;
  return (
    <>
      {/* Above top hole */}
      <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: top.y }]} />
      {/* Left of top hole */}
      <View pointerEvents="none" style={[styles.dim, { top: top.y, left: 0, width: top.x, height: top.height }]} />
      {/* Right of top hole */}
      <View pointerEvents="none" style={[styles.dim, { top: top.y, left: top.x + top.width, right: 0, height: top.height }]} />
      {/* Between holes */}
      <View pointerEvents="none" style={[styles.dim, { top: topEnd, left: 0, right: 0, height: gapHeight }]} />
      {/* Left of bottom hole */}
      <View pointerEvents="none" style={[styles.dim, { top: bottom.y, left: 0, width: bottom.x, height: bottom.height }]} />
      {/* Right of bottom hole */}
      <View pointerEvents="none" style={[styles.dim, { top: bottom.y, left: bottom.x + bottom.width, right: 0, height: bottom.height }]} />
      {/* Below bottom hole */}
      <View pointerEvents="none" style={[styles.dim, { top: bottom.y + bottom.height, left: 0, right: 0, bottom: 0 }]} />
      <RoundedHoleCorners hole={hole} radius={primaryHoleRadius ?? 0} />
    </>
  );
}

export function EditorCoachMark({
  stepId,
  styleButtonRef,
  exportButtonRef,
  saveButtonRef,
  canvasRef,
  imageRect,
  tagRect,
  measureToken,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onSkip,
}: EditorCoachMarkProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rootRef = useRef<RNView | null>(null);
  const [anchor, setAnchor] = useState<CoachAnchorRect | null>(null);
  const [secondaryAnchor, setSecondaryAnchor] = useState<CoachAnchorRect | null>(null);
  const [rootSize, setRootSize] = useState({ width: 0, height: 0 });
  const [cardMeasuredHeight, setCardMeasuredHeight] = useState(0);
  const progress = getEditorCoachProgress(stepId);
  const { titleKey, bodyKey } = getCopyKeys(stepId);
  const body = bodyKey ? t(bodyKey) : '';
  const isLastStep = stepId === 'export';
  const showNext = canGoNext || isLastStep;
  const cardHeight =
    cardMeasuredHeight > 0 ? cardMeasuredHeight : estimateCardHeight(Boolean(body));

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
    let cancelled = false;
    let frameId = 0;

    const run = async () => {
      // Wait one frame for picker / canvas layout — keep previous anchor until this succeeds.
      await new Promise<void>((resolve) => {
        frameId = requestAnimationFrame(() => resolve());
      });

      if (cancelled) {
        return;
      }

      const needsCanvas =
        stepId === 'place-tag' || stepId === 'edit-price' || stepId === 'drag-tag';

      const targetRef =
        stepId === 'style-button'
          ? styleButtonRef
          : stepId === 'export'
            ? exportButtonRef
            : canvasRef;

      const [rootRect, targetRect, saveRect] = await Promise.all([
        measureInWindow(rootRef),
        measureInWindow(targetRef),
        stepId === 'edit-price' && saveButtonRef ? measureInWindow(saveButtonRef) : Promise.resolve(null),
      ]);

      if (cancelled) {
        return;
      }

      if (!rootRect || !targetRect) {
        return;
      }

      const localX = targetRect.x - rootRect.x;
      const localY = targetRect.y - rootRect.y;

      if (stepId === 'place-tag' && imageRect) {
        setSecondaryAnchor(null);
        setAnchor({
          x: localX + imageRect.x,
          y: localY + imageRect.y,
          width: imageRect.width,
          height: imageRect.height,
        });
        return;
      }

      if ((stepId === 'edit-price' || stepId === 'drag-tag') && tagRect) {
        setAnchor({
          x: localX + tagRect.x,
          y: localY + tagRect.y,
          width: tagRect.width,
          height: tagRect.height,
        });

        // Step 2: also spotlight the dock Save button.
        if (stepId === 'edit-price' && saveRect) {
          setSecondaryAnchor({
            x: saveRect.x - rootRect.x,
            y: saveRect.y - rootRect.y,
            width: saveRect.width,
            height: saveRect.height,
          });
        } else {
          setSecondaryAnchor(null);
        }
        return;
      }

      setSecondaryAnchor(null);

      if (needsCanvas && !imageRect && !tagRect) {
        setAnchor({
          x: localX,
          y: localY,
          width: targetRect.width,
          height: targetRect.height,
        });
        return;
      }

      setAnchor({
        x: localX,
        y: localY,
        width: targetRect.width,
        height: targetRect.height,
      });
    };

    void run();

    return () => {
      cancelled = true;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [
    canvasRef,
    exportButtonRef,
    imageRect,
    measureToken,
    saveButtonRef,
    stepId,
    styleButtonRef,
    tagRect,
  ]);

  const hole = useMemo(() => {
    if (!anchor || rootSize.width <= 0 || rootSize.height <= 0) {
      return null;
    }

    const padding = stepId === 'drag-tag' || stepId === 'edit-price' ? TAG_HOLE_PADDING : HOLE_PADDING;
    const x = Math.max(0, anchor.x - padding);
    const y = Math.max(0, anchor.y - padding);
    const right = Math.min(rootSize.width, anchor.x + anchor.width + padding);
    const bottom = Math.min(rootSize.height, anchor.y + anchor.height + padding);

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y),
    };
  }, [anchor, rootSize.height, rootSize.width, stepId]);

  const secondaryHole = useMemo(() => {
    if (!secondaryAnchor || rootSize.width <= 0 || rootSize.height <= 0) {
      return null;
    }

    const x = Math.max(0, secondaryAnchor.x - TAG_HOLE_PADDING);
    const y = Math.max(0, secondaryAnchor.y - TAG_HOLE_PADDING);
    const right = Math.min(rootSize.width, secondaryAnchor.x + secondaryAnchor.width + TAG_HOLE_PADDING);
    const bottom = Math.min(rootSize.height, secondaryAnchor.y + secondaryAnchor.height + TAG_HOLE_PADDING);

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y),
    };
  }, [rootSize.height, rootSize.width, secondaryAnchor]);

  const cardLayout = useMemo(() => {
    const containerWidth = rootSize.width || 0;
    const containerHeight = rootSize.height || 0;
    const cardWidth = Math.min(CARD_MAX_WIDTH, Math.max(0, containerWidth - theme.spacing.lg * 2));
    const minTop = Math.max(insets.top, theme.spacing.xl);
    const bottomReserve =
      insets.bottom + theme.spacing.lg + EDITOR_FLOATING_MAIN_BAR_HEIGHT + theme.spacing.sm;
    const maxTop = Math.max(minTop, containerHeight - cardHeight - bottomReserve);

    if (!hole || containerWidth <= 0) {
      return {
        left: Math.max(theme.spacing.lg, (containerWidth - cardWidth) / 2),
        top: clamp(containerHeight * 0.28, minTop, maxTop),
        width: cardWidth,
        arrowPointsUp: false,
      };
    }

    // Canvas / tag steps: keep the card clear of the spotlight when possible.
    if (stepId === 'place-tag' || stepId === 'edit-price' || stepId === 'drag-tag') {
      const left = Math.max(
        theme.spacing.lg,
        Math.min(hole.x + hole.width / 2 - cardWidth / 2, containerWidth - cardWidth - theme.spacing.lg),
      );

      // Prefer above the hole for edit/drag so the dock and tag stay free.
      if (stepId === 'edit-price' || stepId === 'drag-tag') {
        const preferredTop = hole.y - cardHeight - CARD_GAP;
        const top = clamp(preferredTop, minTop, maxTop);
        const fitsAbove = preferredTop >= minTop;
        return {
          left,
          top,
          width: cardWidth,
          arrowPointsUp: !fitsAbove,
        };
      }

      const preferredTop = hole.y + hole.height + CARD_GAP;
      return {
        left,
        top: clamp(preferredTop, minTop, maxTop),
        width: cardWidth,
        arrowPointsUp: true,
      };
    }

    // Style / Export: place directly above the spotlight.
    const preferredTop = hole.y - cardHeight - CARD_GAP;
    const top = clamp(preferredTop, minTop, maxTop);
    const left = Math.max(
      theme.spacing.lg,
      Math.min(hole.x + hole.width / 2 - 28, containerWidth - cardWidth - theme.spacing.lg),
    );
    return {
      left,
      top,
      width: cardWidth,
      arrowPointsUp: false,
    };
  }, [cardHeight, hole, insets.bottom, insets.top, rootSize.height, rootSize.width, stepId]);

  const arrowLeft = useMemo(() => {
    if (!hole) {
      return Math.max(0, cardLayout.width / 2 - ARROW_SIZE);
    }

    const holeCenterX = hole.x + hole.width / 2;
    return Math.max(16, Math.min(holeCenterX - cardLayout.left - ARROW_SIZE, cardLayout.width - 32));
  }, [cardLayout.left, cardLayout.width, hole]);

  // Step 2: keep visual rings on tag + Save, but let empty-image taps pass through
  // so the normal dismiss/save path can advance the tutorial.
  const dimPointerEvents = stepId === 'edit-price' ? 'none' : 'auto';
  const usePassThroughDim = stepId === 'edit-price';
  const tagHoleRadius = stepId === 'edit-price' || stepId === 'drag-tag' ? TAG_HOLE_RADIUS : HOLE_RADIUS;

  return (
    <View
      collapsable={false}
      onLayout={handleRootLayout}
      pointerEvents="box-none"
      ref={rootRef}
      style={styles.root}>
      {usePassThroughDim && hole && secondaryHole ? (
        <DualCutoutDim hole={hole} secondaryHole={secondaryHole} primaryHoleRadius={TAG_HOLE_RADIUS} />
      ) : usePassThroughDim && hole ? (
        <>
          <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} />
          <View pointerEvents="none" style={[styles.dim, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.height }]} />
          <View pointerEvents="none" style={[styles.dim, { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height }]} />
          <RoundedHoleCorners hole={hole} radius={TAG_HOLE_RADIUS} />
        </>
      ) : usePassThroughDim ? (
        <View pointerEvents="none" style={[styles.dim, StyleSheet.absoluteFillObject]} />
      ) : hole ? (
        <>
          <View pointerEvents={dimPointerEvents} style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} />
          <View
            pointerEvents={dimPointerEvents}
            style={[styles.dim, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]}
          />
          <View
            pointerEvents={dimPointerEvents}
            style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.height }]}
          />
          <View
            pointerEvents={dimPointerEvents}
            style={[
              styles.dim,
              { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height },
            ]}
          />
          <RoundedHoleCorners hole={hole} radius={tagHoleRadius} />
        </>
      ) : (
        <View pointerEvents={dimPointerEvents} style={[styles.dim, StyleSheet.absoluteFillObject]} />
      )}

      {hole ? (
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              top: hole.y,
              left: hole.x,
              width: hole.width,
              height: hole.height,
              borderRadius: tagHoleRadius,
            },
          ]}
        />
      ) : null}

      {secondaryHole ? (
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              top: secondaryHole.y,
              left: secondaryHole.x,
              width: secondaryHole.width,
              height: secondaryHole.height,
              borderRadius: HOLE_RADIUS,
            },
          ]}
        />
      ) : null}

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
          <Text style={styles.stepLabel}>
            {t('editor.coach.stepLabel')} {progress.step} / {progress.total}
          </Text>
          <Text style={styles.title}>{t(titleKey)}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}

          <View style={styles.footer}>
            <View style={styles.dots}>
              {Array.from({ length: progress.total }, (_, index) => {
                const isActive = index === progress.step - 1;
                return (
                  <View
                    key={`coach-dot-${index}`}
                    style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
                  />
                );
              })}
            </View>

            <View style={styles.actions}>
              {canGoBack ? (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={onBack} style={styles.textButton}>
                  <Text style={styles.textButtonLabel}>{t('editor.coach.back')}</Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={onSkip} style={styles.textButton}>
                  <Text style={styles.textButtonLabel}>{t('editor.coach.skip')}</Text>
                </Pressable>
              )}
              {showNext ? (
                <Pressable accessibilityRole="button" onPress={onNext} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonLabel}>
                    {isLastStep ? t('editor.coach.gotIt') : t('editor.coach.next')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
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
  roundedCornerDim: {
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
  stepLabel: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  title: {
    ...theme.typography.tag,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.white,
    fontWeight: '700',
  },
  body: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.72)',
    fontWeight: '500',
  },
  footer: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  textButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  textButtonLabel: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 36,
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
