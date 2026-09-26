import type { Metadata } from 'next';
import Script from 'next/script';
import { AuthProvider } from '@/lib/auth-context';
import { CookieConsentProvider } from '@/components/legal/cookie-consent-provider';
import { CookieBanner } from '@/components/legal/cookie-banner';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgroMAS | Riego de precisión con satélite e IA',
  description: 'Plataforma AgTech para monitoreo satelital, balance hídrico FAO-56 y recomendaciones de riego con agentes de inteligencia artificial.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      </head>
      <body>
        <AuthProvider>
          <CookieConsentProvider>
            {children}
            <CookieBanner />
          </CookieConsentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}