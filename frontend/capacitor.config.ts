import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.curatrack.app',
  appName: 'CuraTrack',
  webDir: 'out',
  server: {
    // url: 'https://cura-track-v2.vercel.app/login',
    cleartext: true,
    allowNavigation: [
      '*.google.com',
      '*.googleapis.com',
      '*.supabase.co',
      'cura-track-v2.vercel.app'
    ]
  }
};

export default config;

