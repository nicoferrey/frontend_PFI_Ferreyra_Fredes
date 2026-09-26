export const COOKIE_CONSENT_KEY = 'agromas_cookie_consent';

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export const UNDECIDED_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  decidedAt: '',
};

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (!parsed.decidedAt) return null;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      decidedAt: String(parsed.decidedAt),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent: Omit<CookieConsent, 'necessary' | 'decidedAt'> & { decidedAt?: string }): CookieConsent {
  const next: CookieConsent = {
    necessary: true,
    analytics: Boolean(consent.analytics),
    marketing: Boolean(consent.marketing),
    decidedAt: consent.decidedAt || new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('agromas-cookie-consent', { detail: next }));
  return next;
}
