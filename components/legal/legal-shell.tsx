'use client';

import type { ReactNode } from 'react';
import { LandingFooter, LandingHeader, SectionKicker } from '@/components/landing/landing-chrome';
import { Reveal } from '@/components/landing/reveal';

export function LegalShell({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen text-slate-900 font-sans">
      <LandingHeader absoluteNav />
      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
        <Reveal className="max-w-2xl space-y-3">
          <SectionKicker>{kicker}</SectionKicker>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="text-sm text-slate-600">Última actualización: {updated}</p>
        </Reveal>
        <div className="space-y-4">{children}</div>
      </main>
      <LandingFooter absoluteNav />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft sm:p-8">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">{title}</h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
      </section>
    </Reveal>
  );
}

export function LegalIntro({ children }: { children: ReactNode }) {
  return (
    <Reveal>
      <div className="rounded-[28px] border border-white/80 bg-white p-6 text-sm leading-relaxed text-slate-600 shadow-soft sm:p-8">
        {children}
      </div>
    </Reveal>
  );
}
