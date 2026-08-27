"use client";

import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/auth-guard';

const OnboardingWizard = dynamic(
  () => import('@/components/onboarding-wizard'),
  { ssr: false }
);

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-100">
        <OnboardingWizard />
      </main>
    </ProtectedRoute>
  );
}
