import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CuraTrack V2 - Mobile Health Platform',
  description: 'AI-Powered Mobile Telemedicine, Vitals Tracking & Scheme Management UI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
