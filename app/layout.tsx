import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgroMAS Dashboard',
  description: 'Dashboard agrotech para monitoreo satelital, balance hidrico y sostenibilidad.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}