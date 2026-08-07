import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.curatrack.app',
  appName: 'CuraTrack',
  webDir: 'out',
  server: {
    // url: 'https://moblie-ui-curatrack.vercel.app/login',
    cleartext: true,
    allowNavigation: [
      '*.google.com',
      '*.googleapis.com',
      '*.supabase.co',
      'moblie-ui-curatrack.vercel.app'
    ]
  }
};

export default config;

