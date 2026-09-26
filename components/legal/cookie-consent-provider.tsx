'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CookieConsent,
  UNDECIDED_CONSENT,
  readCookieConsent,
  writeCookieConsent,
} from '@/lib/cookie-consent';

type CookieConsentContextValue = {
  consent: CookieConsent;
  hasDecided: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (next: { analytics: boolean; marketing: boolean }) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent>(UNDECIDED_CONSENT);
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    setConsent(readCookieConsent() ?? UNDECIDED_CONSENT);
    setHydrated(true);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail;
      if (detail) setConsent(detail);
    };
    window.addEventListener('agromas-cookie-consent', onChange);
    return () => window.removeEventListener('agromas-cookie-consent', onChange);
  }, []);

  const persist = useCallback((analytics: boolean, marketing: boolean) => {
    const next = writeCookieConsent({ analytics, marketing });
    setConsent(next);
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecided: hydrated && Boolean(consent.decidedAt),
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      acceptAll: () => persist(true, true),
      rejectOptional: () => persist(false, false),
      savePreferences: ({ analytics, marketing }) => persist(analytics, marketing),
    }),
    [consent, hydrated, persist, preferencesOpen]
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return ctx;
}
