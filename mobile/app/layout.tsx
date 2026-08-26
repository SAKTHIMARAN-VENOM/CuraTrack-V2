import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { BottomNavBar } from '@/components/BottomNavBar';

export const metadata: Metadata = {
  title: 'CuraTrack Clinical - Modern Health & Vitals Management',
  description: 'Precision healthcare management app for tracking vitals, appointments, medications, lab reports, and emergency SOS.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CuraTrack',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-primary/20 selection:text-primary bg-background text-on-background">
        <AppProvider>
          <div className="mobile-shell">
            <div className="flex-1 flex flex-col min-h-[100dvh]">
              {children}
              <BottomNavBar />
            </div>
          </div>
        </AppProvider>
        <Analytics />
      </body>
    </html>
  );
}
