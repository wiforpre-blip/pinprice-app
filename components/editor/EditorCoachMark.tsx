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
  tagTypesSectionRef: RefObject<RNView | null>;
  sizeSectionRef: RefObject<RNView | null>;
  canvasRef: RefObject<RNView | null>;
  /** Contained image bounds inside the canvas (place-tag spotlight). */
  imageRect: ImageDisplayRect | null;
  measureToken: number;
  canGoBack: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
};

const HOLE_PADDING = 6;
const ARROW_SIZE = 10;
const CARD_MAX_WIDTH = 320;
const CARD_GAP = 10;
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
    case 'style-button':
      return { titleKey: 'editor.coach.styleButtonTitle', bodyKey: 'editor.coach.styleButtonBody' };
    case 'style-types':
      return { titleKey: 'editor.coach.styleTypesTitle', bodyKey: 'editor.coach.styleTypesBody' };
    case 'style-size':
      return { titleKey: 'editor.coach.styleSizeTitle', bodyKey: 'editor.coach.styleSizeBody' };
    case 'place-tag':
      return { titleKey: 'editor.coach.placeTagTitle', bodyKey: null };
    default:
      return { titleKey: 'editor.coach.styleButtonTitle', bodyKey: 'editor.coach.styleButtonBody' };
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function EditorCoachMark({
  stepId,
  styleButtonRef,
  tagTypesSectionRef,
  sizeSectionRef,
  canvasRef,
  imageRect,
  measureToken,
  canGoBack,
  onBack,
  onNext,
  onSkip,
}: EditorCoachMarkProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rootRef = useRef<RNView | null>(null);
  const [anchor, setAnchor] = useState<CoachAnchorRect | null>(null);
  const [rootSize, setRootSize] = useState({ width: 0, height: 0 });
  const [cardMeasuredHeight, setCardMeasuredHeight] = useState(0);
  const progress = getEditorCoachProgress(stepId);
  const { titleKey, bodyKey } = getCopyKeys(stepId);
  const body = bodyKey ? t(bodyKey) : '';
  const isLastStep = stepId === 'place-tag';
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

      const targetRef =
        stepId === 'style-button'
          ? styleButtonRef
          : stepId === 'style-types'
            ? tagTypesSectionRef
            : stepId === 'style-size'
              ? sizeSectionRef
              : canvasRef;

      const [rootRect, targetRect] = await Promise.all([
        measureInWindow(rootRef),
        measureInWindow(targetRef),
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
        setAnchor({
          x: localX + imageRect.x,
          y: localY + imageRect.y,
          width: imageRect.width,
          height: imageRect.height,
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
    imageRect,
    measureToken,
    sizeSectionRef,
    stepId,
    styleButtonRef,
    tagTypesSectionRef,
  ]);

  const hole = useMemo(() => {
    if (!anchor || rootSize.width <= 0 || rootSize.height <= 0) {
      return null;
    }

    const x = Math.max(0, anchor.x - HOLE_PADDING);
    const y = Math.max(0, anchor.y - HOLE_PADDING);
    const right = Math.min(rootSize.width, anchor.x + anchor.width + HOLE_PADDING);
    const bottom = Math.min(rootSize.height, anchor.y + anchor.height + HOLE_PADDING);

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y),
    };
  }, [anchor, rootSize.height, rootSize.width]);

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

    // Step 4: place the card BELOW the image hole when possible so the tap area stays clear.
    // Falls back to maxTop (just above floating bar) on short screens.
    if (stepId === 'place-tag') {
      const left = Math.max(
        theme.spacing.lg,
        Math.min(hole.x + hole.width / 2 - cardWidth / 2, containerWidth - cardWidth - theme.spacing.lg),
      );
      const preferredTop = hole.y + hole.height + CARD_GAP;
      return {
        left,
        top: clamp(preferredTop, minTop, maxTop),
        width: cardWidth,
        arrowPointsUp: true,
      };
    }

    // Steps 1–3: place directly above the spotlight using measured card height.
    const preferredTop = hole.y - cardHeight - CARD_GAP;
    const top = clamp(preferredTop, minTop, maxTop);

    if (stepId === 'style-button') {
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
    }

    const left = Math.max(
      theme.spacing.lg,
      Math.min(hole.x + hole.width / 2 - cardWidth / 2, containerWidth - cardWidth - theme.spacing.lg),
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

  return (
    <View
      collapsable={false}
      onLayout={handleRootLayout}
      pointerEvents="box-none"
      ref={rootRef}
      style={styles.root}>
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
              <Pressable accessibilityRole="button" onPress={onNext} style={styles.primaryButton}>
                <Text style={styles.primaryButtonLabel}>
                  {isLastStep ? t('editor.coach.gotIt') : t('editor.coach.next')}
                </Text>
              </Pressable>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
