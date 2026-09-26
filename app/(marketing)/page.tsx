import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'AgroMAS | Riego de precisión con satélite e IA',
  description:
    'Plataforma AgTech para decisiones de riego: monitoreo Sentinel-2, balance hídrico FAO-56, clima georreferenciado y agentes de inteligencia artificial.',
};

export default function MarketingHomePage() {
  return <LandingPage />;
}
