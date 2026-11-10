import type { Metadata } from 'next';
import { RelatoScroll } from '@/components/relato/relato-scroll';

export const metadata: Metadata = {
  title: 'Relato · AgroMAS',
  description: 'Recorrido visual del relato de riego en la Comarca Viedma–Patagones.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function RelatoPage() {
  return <RelatoScroll />;
}
