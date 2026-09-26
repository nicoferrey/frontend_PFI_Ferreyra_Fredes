'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Outfit } from 'next/font/google';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';

const kickerFont = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
});

export const CONTACT_EMAIL = 'nicoferreyra.work@gmail.com';

export const LANDING_NAV = [
  { id: 'producto', label: 'Producto' },
  { id: 'precios', label: 'Precios' },
  { id: 'nosotros', label: 'Quiénes somos' },
  { id: 'faq', label: 'FAQ' },
] as const;

export function navHref(id: string, absolute = false) {
  return absolute ? `/#${id}` : `#${id}`;
}

export function SectionKicker({
  children,
  tone = 'crop',
}: {
  children: React.ReactNode;
  tone?: 'crop' | 'water' | 'slate';
}) {
  const toneClass =
    tone === 'water'
      ? 'border-water-600/20 bg-water-50/90 text-water-800'
      : tone === 'slate'
        ? 'border-slate-300/80 bg-slate-50/90 text-slate-600'
        : 'border-crop-600/20 bg-crop-50/90 text-crop-800';

  return (
    <p
      className={`${kickerFont.className} inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] ${toneClass}`}
    >
      {children}
    </p>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <div className={`${compact ? 'h-10 w-10' : 'h-11 w-11'} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20 transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-emerald-500/40 group-hover:rotate-3`}>
        <Logo className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-white transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3`} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">Plataforma AgTech</p>
        <span className={`${compact ? 'text-xl' : 'text-2xl'} font-black tracking-tight text-slate-950 leading-none`}>
          Agro<span className="bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 bg-clip-text text-transparent">MAS</span>
        </span>
      </div>
    </Link>
  );
}

export function CtaButtons({
  isAuthenticated,
  size = 'md',
}: {
  isAuthenticated: boolean;
  size?: 'sm' | 'md';
}) {
  const padding = size === 'sm' ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-xs sm:text-sm';

  if (isAuthenticated) {
    return (
      <Link
        href="/dashboard"
        className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 font-bold text-white shadow-md shadow-crop-900/15 transition hover:scale-[1.02] ${padding}`}
      >
        Ir al tablero
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/login"
        className={`inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white font-bold text-slate-800 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 ${padding}`}
      >
        Iniciar sesión
      </Link>
      <Link
        href="/login?mode=signup"
        className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 font-bold text-white shadow-md shadow-crop-900/15 transition hover:scale-[1.02] ${padding}`}
      >
        Crear cuenta
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function LandingHeader({ absoluteNav = false }: { absoluteNav?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const authed = mounted && !isLoading && isAuthenticated;

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="landing-nav-enter mx-auto flex max-w-6xl items-center justify-between rounded-[24px] border border-white/80 bg-white/80 px-4 py-3 shadow-soft backdrop-blur-md sm:px-5">
          <BrandMark compact />

          <nav className="hidden items-center gap-1 lg:flex">
            {LANDING_NAV.map((link) => (
              <Link
                key={link.id}
                href={navHref(link.id, absoluteNav)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-crop-50 hover:text-crop-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <CtaButtons isAuthenticated={authed} size="sm" />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="landing-drawer-backdrop absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="landing-drawer-enter absolute inset-y-0 right-0 flex w-[300px] flex-col gap-6 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-950">Menú</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {LANDING_NAV.map((link) => (
                <Link
                  key={link.id}
                  href={navHref(link.id, absoluteNav)}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-crop-50 hover:text-crop-800"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <CtaButtons isAuthenticated={authed} />
          </aside>
        </div>
      )}
    </>
  );
}

export function LandingFooter({ absoluteNav = false }: { absoluteNav?: boolean }) {
  return (
    <footer className="border-t border-slate-200/70 bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between">
        <div className="max-w-sm space-y-3">
          <BrandMark compact />
          <p className="text-sm leading-relaxed text-slate-500">
            Plataforma inteligente de riego. Satélite, FAO-56 y agentes MAS para establecimientos de Argentina.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center text-sm font-extrabold text-crop-700 transition hover:text-crop-800"
          >
            Escribinos
          </a>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Sitio</p>
            <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-slate-600">
              {LANDING_NAV.map((link) => (
                <Link key={link.id} href={navHref(link.id, absoluteNav)} className="hover:text-crop-700">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Plataforma</p>
            <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-slate-600">
              <Link href="/login" className="hover:text-crop-700">Iniciar sesión</Link>
              <Link href="/login?mode=signup" className="hover:text-crop-700">Crear cuenta</Link>
              <Link href="/dashboard" className="hover:text-crop-700">Tablero</Link>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Legal</p>
            <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-slate-600">
              <Link href="/legal/terminos" className="hover:text-crop-700">Términos y condiciones</Link>
              <Link href="/legal/privacidad" className="hover:text-crop-700">Política de privacidad</Link>
              <Link href="/legal/cookies" className="hover:text-crop-700">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200/70 py-4 text-center text-xs font-medium text-slate-400">
        © 2026 AgroMAS. Todos los derechos reservados.
      </div>
    </footer>
  );
}
