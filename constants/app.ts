import Constants from 'expo-constants';

/** Public privacy policy URL. Empty string shows a placeholder in Help until set. */
export const PRIVACY_POLICY_URL =
  'https://docs.google.com/document/d/1-0lO17kDl1RoZXQj-uGtK91985GECHOEyOz0XbKHxiU/edit?usp=sharing';

/**
 * Settings footer label for closed-test debugging.
 * Prefers native version/build; falls back to Expo app config.
 */
export function getAppVersionLabel(): string {
  const version =
    Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'unknown';

  const buildFromConfig =
    Constants.expoConfig?.android?.versionCode != null
      ? String(Constants.expoConfig.android.versionCode)
      : (Constants.expoConfig?.ios?.buildNumber ?? null);

  const build = Constants.nativeBuildVersion ?? buildFromConfig;

  if (build) {
    return `Version ${version} (build ${build})`;
  }

  return `Version ${version}`;
}
