import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import { copyFeedbackEmail, submitFeedback } from '@/services/feedback.service';
import type { FeedbackType } from '@/types/settings';

type FeedbackSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'suggestion', 'other'];

export function FeedbackSheet({ visible, onClose }: FeedbackSheetProps) {
  const { t } = useTranslation();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setFeedbackType('bug');
    setMessage('');
    setIsSending(false);
    setStatusMessage(null);
    setIsError(false);
  }, [visible]);

  const handleSendFeedback = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      Alert.alert('Please enter a message before sending');
      return;
    }

    if (isSending) {
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const result = await submitFeedback({
        type: feedbackType,
        message: trimmedMessage,
      });

      if (result.ok) {
        setMessage('');
        onClose();
        return;
      }

      if (result.reason === 'no_mail_app') {
        Alert.alert(
          'No email app found. Please send your feedback to pinprice.app@gmail.com directly.',
          undefined,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Copy Email',
              onPress: () => {
                void copyFeedbackEmail();
              },
            },
          ],
        );
        return;
      }

      setIsError(true);
      setStatusMessage(t('settings.feedbackFailed'));
    } catch {
      setIsError(true);
      setStatusMessage(t('settings.feedbackFailed'));
    } finally {
      setIsSending(false);
    }
  };

  const canSend = !isSending;

  return (
    <BottomSheetOverlay
      footer={
        <View style={styles.feedbackFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={() => {
              void handleSendFeedback();
            }}
            style={[styles.feedbackSendButton, !canSend && styles.feedbackSendButtonDisabled]}>
            <Text style={styles.feedbackSendText}>
              {isSending ? t('settings.feedbackSending') : t('settings.feedbackSend')}
            </Text>
          </Pressable>

          {statusMessage ? (
            <Text style={[styles.feedbackStatus, isError && styles.feedbackStatusError]}>{statusMessage}</Text>
          ) : null}
        </View>
      }
      onClose={onClose}
      title={t('settings.contact')}
      visible={visible}>
      <View style={styles.feedbackForm}>
        <View style={styles.feedbackTypeRow}>
          {FEEDBACK_TYPES.map((type) => {
            const isActive = type === feedbackType;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isActive ? { selected: true } : undefined}
                key={type}
                onPress={() => setFeedbackType(type)}
                style={[styles.feedbackTypeButton, isActive && styles.feedbackTypeButtonActive]}>
                <Text style={[styles.feedbackTypeText, isActive && styles.feedbackTypeTextActive]}>
                  {t(`settings.feedbackType.${type}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          multiline
          onChangeText={setMessage}
          placeholder={t('settings.feedbackMessagePlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.feedbackInput}
          value={message}
        />
      </View>
    </BottomSheetOverlay>
  );
}
