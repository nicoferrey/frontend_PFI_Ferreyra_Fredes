'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cookie, Settings2, X } from 'lucide-react';
import { useCookieConsent } from '@/components/legal/cookie-consent-provider';

export function CookieBanner() {
  const pathname = usePathname();
  const {
    consent,
    hasDecided,
    preferencesOpen,
    openPreferences,
    closePreferences,
    acceptAll,
    rejectOptional,
    savePreferences,
  } = useCookieConsent();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const onLegalPage = pathname?.startsWith('/legal') ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (onLegalPage && preferencesOpen) {
      closePreferences();
    }
  }, [onLegalPage, preferencesOpen, closePreferences]);

  useEffect(() => {
    setAnalytics(consent.analytics);
    setMarketing(consent.marketing);
  }, [consent.analytics, consent.marketing, preferencesOpen]);

  if (!mounted || onLegalPage) return null;

  const showBanner = !hasDecided && !preferencesOpen;
  if (!showBanner && !preferencesOpen) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] w-[min(100%-2rem,22rem)] sm:bottom-6 sm:right-6">
      {showBanner && (
        <div className="pointer-events-auto flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-md">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-crop-50 text-crop-700">
              <Cookie className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-950">Usamos cookies</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Las necesarias mantienen tu sesión. Si aceptás, también podemos usar medición y comunicaciones.{' '}
                <Link href="/legal/cookies" className="font-bold text-crop-700 underline underline-offset-2">
                  Política de cookies
                </Link>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-2xl bg-slate-950 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-slate-800"
            >
              Aceptar todas
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={rejectOptional}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={openPreferences}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:border-slate-300"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configurar
              </button>
            </div>
          </div>
        </div>
      )}

      {preferencesOpen && (
        <div className="pointer-events-auto rounded-[24px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-950">Preferencias de cookies</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Las cookies necesarias no se pueden desactivar.
              </p>
            </div>
            <button
              type="button"
              onClick={closePreferences}
              className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-950">Necesarias</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">Sesión, seguridad y tu elección.</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Siempre on
                </span>
              </div>
            </div>
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-extrabold text-slate-950">Analíticas</p>
                <p className="mt-0.5 text-[11px] text-slate-600">Uso agregado del sitio y del tablero.</p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
            </label>
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-extrabold text-slate-950">Marketing</p>
                <p className="mt-0.5 text-[11px] text-slate-600">Campañas y mensajes del producto.</p>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/legal/cookies"
              className="text-center text-[11px] font-bold text-crop-700 underline underline-offset-2"
            >
              Más información
            </Link>
            <button
              type="button"
              onClick={() => savePreferences({ analytics, marketing })}
              className="rounded-2xl bg-slate-950 px-3 py-2 text-[11px] font-bold text-white"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={rejectOptional}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700"
            >
              Solo necesarias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
