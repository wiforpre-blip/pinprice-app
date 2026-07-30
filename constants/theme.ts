export const PinPriceTheme = {
  colors: {
    primary: '#000000',
    background: '#F7F7F7',
    surface: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#647488',
    textMuted: '#8A96A3',
    border: '#E5E5E5',
    sold: '#E5484D',
    success: '#1F9D55',
    /** Brand accent — selected chrome + price accent preset. Text on accent: black only. */
    accent: '#E8FF47',
    accentText: '#000000',
    priceTagBackground: '#FFFFFF',
    priceTagBorder: '#000000',
    priceTagText: '#000000',
    /** Quantity tag palette — distinct from price/sold main tones. */
    quantityBlue: '#2F6FED',
    quantityTeal: '#0F8A7A',
    quantitySlate: '#4A5B6A',
    photoMockBackground: '#ECEFF1',
    photoMockItem: '#D8DEE4',
    photoMockItemBorder: '#CBD3DA',
    overlayBackdrop: 'rgba(0, 0, 0, 0.28)',
    white: '#FFFFFF',
    /** Selection chrome for editor tags (editor-only, never export). */
    selectionRing: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 18,
  },
  typography: {
    appName: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700' as const,
    },
    headline: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '800' as const,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
    },
    button: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '700' as const,
    },
    tag: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800' as const,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600' as const,
    },
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    tag: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  buttons: {
    height: 52,
    primary: {
      backgroundColor: '#000000',
      borderColor: '#000000',
      color: '#FFFFFF',
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E5E5',
      color: '#000000',
    },
  },
  tags: {
    price: {
      backgroundColor: '#FFFFFF',
      borderColor: '#000000',
      color: '#000000',
    },
    priceAccent: {
      backgroundColor: '#E8FF47',
      borderColor: '#E8FF47',
      color: '#000000',
    },
    sold: {
      backgroundColor: '#E5484D',
      borderColor: '#E5484D',
      color: '#FFFFFF',
    },
    soldBlack: {
      backgroundColor: '#000000',
      borderColor: '#000000',
      color: '#FFFFFF',
    },
    quantityBlue: {
      backgroundColor: '#2F6FED',
      borderColor: '#2F6FED',
      color: '#FFFFFF',
    },
    quantityTeal: {
      backgroundColor: '#0F8A7A',
      borderColor: '#0F8A7A',
      color: '#FFFFFF',
    },
    quantitySlate: {
      backgroundColor: '#4A5B6A',
      borderColor: '#4A5B6A',
      color: '#FFFFFF',
    },
    /** Default / NM — grade colors resolved in tagPresets by TagConditionValue. */
    condition: {
      backgroundColor: '#57B28B',
      borderColor: 'rgba(255, 255, 255, 0.9)',
      color: '#000000',
    },
    conditionLp: {
      backgroundColor: '#9ACD32',
      borderColor: 'rgba(255, 255, 255, 0.9)',
      color: '#000000',
    },
    conditionMp: {
      backgroundColor: '#F7E53B',
      borderColor: 'rgba(255, 255, 255, 0.9)',
      color: '#000000',
    },
    conditionHp: {
      backgroundColor: '#F5A623',
      borderColor: 'rgba(255, 255, 255, 0.9)',
      color: '#000000',
    },
    language: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF',
      color: '#000000',
    },
    text: {
      backgroundColor: '#FFFFFF',
      borderColor: '#000000',
      color: '#000000',
    },
    textWhiteBorder: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF',
      color: '#000000',
    },
    textPlain: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: '#000000',
    },
    textAccent: {
      backgroundColor: '#E8FF47',
      borderColor: '#E8FF47',
      color: '#000000',
    },
    textSoftPastel: {
      backgroundColor: '#E8D5F2',
      borderColor: '#E8D5F2',
      color: '#3D2A4A',
    },
    textMarker: {
      backgroundColor: '#FFE566',
      borderColor: '#FFE566',
      color: '#000000',
    },
    textDark: {
      backgroundColor: '#1A1A1A',
      borderColor: '#1A1A1A',
      color: '#FFFFFF',
    },
    textCaption: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: '#FFFFFF',
    },
    priceRed: {
      backgroundColor: '#E5484D',
      borderColor: '#E5484D',
      color: '#FFFFFF',
    },
    soldIconPlain: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: '#E5484D',
    },
  },
} as const;

export const Colors = {
  light: {
    text: PinPriceTheme.colors.textPrimary,
    background: PinPriceTheme.colors.background,
    tint: PinPriceTheme.colors.primary,
    icon: PinPriceTheme.colors.textSecondary,
    tabIconDefault: PinPriceTheme.colors.textSecondary,
    tabIconSelected: PinPriceTheme.colors.primary,
  },
  dark: {
    text: PinPriceTheme.colors.textPrimary,
    background: PinPriceTheme.colors.background,
    tint: PinPriceTheme.colors.primary,
    icon: PinPriceTheme.colors.textSecondary,
    tabIconDefault: PinPriceTheme.colors.textSecondary,
    tabIconSelected: PinPriceTheme.colors.primary,
  },
};

export const Fonts = {
  sans: 'system-ui',
  serif: 'serif',
  rounded: 'system-ui',
  mono: 'monospace',
};
