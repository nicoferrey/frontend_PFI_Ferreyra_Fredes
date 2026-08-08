"use client";

import dynamic from 'next/dynamic';

const OnboardingWizard = dynamic(
  () => import('../../components/onboarding-wizard'),
  { ssr: false }
);

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <OnboardingWizard />
    </main>
  );
}
