import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View, type KeyboardEvent } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { ImageDisplayRect, PriceTag, TagType } from '@/types/tag';
import { formatPriceText } from '@/utils/priceText';

type CanvasSize = {
  width: number;
  height: number;
};

type TagEditorProps = {
  canvasSize: CanvasSize;
  defaultText: string;
  imageRect: ImageDisplayRect;
  isNewTag: boolean;
  tag: PriceTag | null;
  visible: boolean;
  onCancel: () => void;
  onDelete: (tagId: string) => void;
  onDraftTextChange: (text: string) => void;
  onDraftTypeChange: (type: TagType) => void;
  onSave: (tagId: string, text: string, type: TagType) => void;
};

const POPOVER_GAP = theme.spacing.sm;
const POPOVER_HEIGHT = 224;
const POPOVER_MIN_WIDTH = 220;
const POPOVER_MAX_WIDTH = 280;
const TAG_HEIGHT_OFFSET = 40;
const DEFAULT_PRICE_TEXT = 'THB ';
const DEFAULT_SOLD_TEXT = 'SOLD';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPopoverPosition(tag: PriceTag, imageRect: ImageDisplayRect, canvasSize: CanvasSize, popoverWidth: number, keyboardInset: number) {
  const anchorX = imageRect.x + tag.x * imageRect.width;
  const anchorY = imageRect.y + tag.y * imageRect.height;
  const maxLeft = Math.max(POPOVER_GAP, canvasSize.width - popoverWidth - POPOVER_GAP);
  const left = clamp(anchorX, POPOVER_GAP, maxLeft);
  const belowTop = anchorY + TAG_HEIGHT_OFFSET;
  const aboveTop = anchorY - POPOVER_HEIGHT - POPOVER_GAP;
  const visibleBottom = Math.max(POPOVER_HEIGHT + POPOVER_GAP * 2, canvasSize.height - keyboardInset);
  const preferredTop = belowTop + POPOVER_HEIGHT > visibleBottom ? Math.max(POPOVER_GAP, aboveTop) : belowTop;
  const maxTop = Math.max(POPOVER_GAP, visibleBottom - POPOVER_HEIGHT - POPOVER_GAP);
  const top = clamp(preferredTop, POPOVER_GAP, maxTop);

  return { left, top };
}

function getDefaultTextForType(type: TagType) {
  return type === 'sold' ? DEFAULT_SOLD_TEXT : DEFAULT_PRICE_TEXT;
}

function shouldSwapDefaultText(text: string, previousType: TagType) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return true;
  }

  if (previousType === 'sold') {
    return trimmedText.toUpperCase() === DEFAULT_SOLD_TEXT;
  }

  return trimmedText === DEFAULT_PRICE_TEXT.trim();
}

function getNextTextForTypeChange(text: string, previousType: TagType, nextType: TagType) {
  if (nextType === 'sold') {
    return DEFAULT_SOLD_TEXT;
  }

  return shouldSwapDefaultText(text, previousType) ? DEFAULT_PRICE_TEXT : text;
}

export function TagEditor({
  canvasSize,
  defaultText,
  imageRect,
  isNewTag,
  tag,
  visible,
  onCancel,
  onDelete,
  onDraftTextChange,
  onDraftTypeChange,
  onSave,
}: TagEditorProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(defaultText);
  const [type, setType] = useState<TagType>('price');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const popoverWidth = Math.min(POPOVER_MAX_WIDTH, Math.max(POPOVER_MIN_WIDTH, canvasSize.width - theme.spacing.lg * 2));

  useEffect(() => {
    if (visible && tag) {
      setText(tag.text);
      setType(tag.type);
    }
  }, [tag, visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardInset(event.endCoordinates.height + POPOVER_GAP);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const saveTag = () => {
    if (!tag) {
      return;
    }

    onSave(tag.id, text.trim() ? text : getDefaultTextForType(type), type);
  };

  const changeType = (nextType: TagType) => {
    if (nextType === type) {
      return;
    }

    const nextText = getNextTextForTypeChange(text, type, nextType);

    setType(nextType);
    setText(nextText);
    onDraftTypeChange(nextType);
    onDraftTextChange(nextText);
  };

  const deleteTag = () => {
    if (!tag) {
      return;
    }

    onDelete(tag.id);
  };

  if (!visible || !tag) {
    return null;
  }

  const popoverPosition = getPopoverPosition(tag, imageRect, canvasSize, popoverWidth, keyboardInset);

  return (
    <View style={[styles.popover, popoverPosition, { width: popoverWidth }]}>
      <Text style={styles.title}>{isNewTag ? t('tag.newTag') : t('tag.editTag')}</Text>

      <View style={styles.typeControl}>
        <Pressable
          accessibilityRole="button"
          onPress={() => changeType('price')}
          style={[styles.typeButton, type === 'price' && styles.activeTypeButton]}>
          <Text style={[styles.typeButtonText, type === 'price' && styles.activeTypeButtonText]}>{t('tag.price')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => changeType('sold')}
          style={[styles.typeButton, type === 'sold' && styles.activeTypeButton]}>
          <Text style={[styles.typeButtonText, type === 'sold' && styles.activeTypeButtonText]}>{t('tag.sold')}</Text>
        </Pressable>
      </View>

      <TextInput
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        onChangeText={(nextText) => {
          const formattedText = type === 'price' ? formatPriceText(nextText) : nextText;

          setText(formattedText);
          onDraftTextChange(formattedText);
        }}
        keyboardType={type === 'price' ? 'number-pad' : 'default'}
        placeholder={getDefaultTextForType(type)}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="done"
        style={styles.input}
        value={text}
      />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={saveTag}
          style={[styles.button, styles.saveButton]}>
          <Text style={[styles.buttonText, styles.saveButtonText]}>{t('tag.save')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.button, styles.cancelButton]}>
          <Text style={[styles.buttonText, styles.cancelButtonText]}>{t('tag.cancel')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={deleteTag} style={[styles.button, styles.deleteButton]}>
          <Text style={[styles.buttonText, styles.deleteButtonText]}>{t('tag.delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    zIndex: 4,
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  input: {
    minHeight: 44,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    ...theme.typography.body,
  },
  typeControl: {
    minHeight: 44,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  activeTypeButton: {
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  typeButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activeTypeButtonText: {
    color: theme.buttons.primary.color,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  button: {
    minHeight: 44,
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  buttonText: {
    ...theme.typography.caption,
  },
  saveButton: {
    backgroundColor: theme.buttons.primary.backgroundColor,
    borderColor: theme.buttons.primary.borderColor,
  },
  saveButtonText: {
    color: theme.buttons.primary.color,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.sold,
  },
  deleteButtonText: {
    color: theme.colors.sold,
  },
});
