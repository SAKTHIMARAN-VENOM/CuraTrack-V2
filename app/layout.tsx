// Minimal root layout required by Next.js App Router.
// The frontend team should replace this with their own layout,
// including any <html>, <body>, fonts, and global CSS imports.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
