import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import type { TagTextOutline } from '@/constants/tagPresets';

type TagOutlinedTextProps = {
  children: string;
  color: string;
  outline: TagTextOutline | null;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

const NO_TEXT_SHADOW: TextStyle = {
  textShadowColor: 'transparent',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 0,
};

function withoutTextShadow(style: StyleProp<TextStyle>): TextStyle | undefined {
  const flat = StyleSheet.flatten(style);
  if (!flat) {
    return undefined;
  }

  const {
    textShadowColor: _c,
    textShadowOffset: _o,
    textShadowRadius: _r,
    ...rest
  } = flat;

  return rest;
}

/**
 * Soft dark halo standing in for a hard outline — same radius formula as the
 * inline-edit fallback in TagOverlay (`Math.max(3, outline.width + 1)`), so
 * display and edit modes look consistent with each other.
 */
function getOutlineHaloStyle(outline: TagTextOutline): TextStyle {
  return {
    textShadowColor: outline.color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: Math.max(3, outline.width + 1),
  };
}

/**
 * Renders text with a color, optionally with a soft dark halo standing in for
 * a hard outline — a single RN `<Text>` using native `textShadow`.
 *
 * Two previous approaches were tried and reverted:
 * 1. Stacking several offset `<Text>` copies to fake a stroke — broke on
 *    curvy/diacritic-heavy Thai glyphs, reading as broken/overlapping black
 *    shadow instead of one clean ring.
 * 2. A hidden `<Text>` measured via `onLayout`/`onTextLayout` and redrawn with
 *    `react-native-svg` for a true vector stroke — RN `Text` and SVG `Text`
 *    use different text engines/font metrics, so glyphs occasionally
 *    mismatched on real devices (garbled/missing characters), and
 *    re-measuring caused visible flicker between fallback/SVG states while a
 *    tag was being dragged.
 *
 * This is intentionally a soft approximation, not a crisp outline: one real
 * `<Text>`, one glyph run, one font engine — nothing to mismatch, nothing to
 * flicker while dragging.
 */
export function TagOutlinedText({
  children,
  color,
  outline,
  style,
  numberOfLines,
}: TagOutlinedTextProps) {
  const baseStyle = withoutTextShadow(style);
  const shadowStyle =
    outline != null && outline.width > 0 ? getOutlineHaloStyle(outline) : NO_TEXT_SHADOW;

  return (
    <Text numberOfLines={numberOfLines} style={[baseStyle, shadowStyle, { color }]}>
      {children}
    </Text>
  );
}
