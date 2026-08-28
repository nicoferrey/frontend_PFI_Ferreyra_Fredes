"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth-guard';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

const OnboardingWizard = dynamic(
  () => import('@/components/onboarding-wizard'),
  { ssr: false }
);

function OnboardingContent() {
  const { user, fields } = useAuth();
  const router = useRouter();

  const activeRole = fields[0]?.user_role_in_farm || user?.role || 'admin';
  const isOperator = activeRole === 'operator';

  useEffect(() => {
    if (isOperator) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOperator, router]);

  if (isOperator) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center font-sans relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md bg-slate-900 border border-white/10 p-8 rounded-[32px] shadow-2xl space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/15 text-rose-400 border border-rose-500/20 mx-auto shadow-lg shadow-rose-500/10">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Acceso Restringido</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu rol actual es <strong className="text-amber-400 font-bold">Operador de Riego</strong>. La delimitación de lotes y modificación de la estructura del establecimiento está reservada únicamente para el <strong className="text-white">Dueño / Administrador</strong>.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.replace('/')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 text-xs font-bold shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Dashboard</span>
            </button>
          </div>
          
          <p className="text-[10px] text-slate-500 italic">Redirigiendo automáticamente en 3 segundos...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <OnboardingWizard />
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  );
}
