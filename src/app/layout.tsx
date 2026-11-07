import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AQUABEAT v12.0 — Unlimited God-Mode Music',
  description: 'Zero-key unlimited music. YouTube Direct + Studio 320kbps. Full songs, infinite scroll, 2000 features.',
};

export const viewport: Viewport = {
  themeColor: '#050508',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
