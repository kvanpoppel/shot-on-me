import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.shotonme.app',
  appName: 'Shot On Me',
  webDir: 'out',
  server: {
    url: 'https://www.shotonme.com',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      spinnerColor: '#D4AF37',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#D4AF37',
    },
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#000000',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#000000',
    captureInput: true,
  },
}

export default config
