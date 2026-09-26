'use client';

import Link from 'next/link';

type LegalConsentProps = {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  marketing: boolean;
  onMarketingChange: (value: boolean) => void;
  showError?: boolean;
  tone?: 'light' | 'dark';
};

export function LegalConsent({
  accepted,
  onAcceptedChange,
  marketing,
  onMarketingChange,
  showError = false,
  tone = 'light',
}: LegalConsentProps) {
  const text = tone === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const hover = tone === 'dark' ? 'group-hover:text-white' : 'group-hover:text-slate-900';
  const errorColor = tone === 'dark' ? 'text-rose-300' : 'text-rose-600';
  const link = tone === 'dark' ? 'text-emerald-300 hover:text-emerald-200' : 'text-crop-700 hover:text-crop-800';

  return (
    <div className="space-y-2 pt-1">
      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-md border-slate-300 accent-emerald-600"
        />
        <span className={`text-[11px] leading-relaxed font-medium ${text} ${hover}`}>
          Acepto los{' '}
          <Link href="/legal/terminos" target="_blank" className={`font-bold underline underline-offset-2 ${link}`}>
            Términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/legal/privacidad" target="_blank" className={`font-bold underline underline-offset-2 ${link}`}>
            Política de privacidad
          </Link>
          . Confirmo que soy mayor de 18 años.
        </span>
      </label>
      {showError && !accepted && (
        <p className={`text-[10px] font-semibold ${errorColor} pl-7`}>
          Tenés que aceptar los términos y la privacidad para crear la cuenta.
        </p>
      )}
      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => onMarketingChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-md border-slate-300 accent-emerald-600"
        />
        <span className={`text-[11px] leading-relaxed font-medium ${text} ${hover}`}>
          Quiero recibir novedades, consejos de riego y comunicaciones comerciales por email o WhatsApp (opcional).
        </span>
      </label>
    </div>
  );
}
