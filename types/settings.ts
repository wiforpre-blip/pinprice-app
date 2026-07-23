export type Language = 'th' | 'en';

export type CurrencyCode = 'THB' | 'SGD' | 'MYR' | 'JPY';

export type FeedbackType = 'bug' | 'suggestion' | 'other';

export type FeedbackPayload = {
  type: FeedbackType;
  message: string;
};
