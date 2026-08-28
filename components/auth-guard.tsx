"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

export function CloudLoading({ text = 'Verificando credenciales...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 text-white font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,197,94,0.18),transparent_50%),radial-gradient(circle_at_50%_60%,rgba(14,165,233,0.15),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Animated Floating Cloud Container with glowing aura */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing Aura */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-40 blur-xl animate-pulse" />
          
          {/* Cloud Card */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 border border-white/20 text-white shadow-2xl shadow-emerald-500/20 animate-bounce">
            <Logo className="h-11 w-11 text-emerald-400" />
          </div>

          {/* Animated Raindrops / Data pulses falling below cloud */}
          <div className="absolute -bottom-6 flex gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping delay-100" />
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping delay-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping delay-500" />
          </div>
        </div>

        {/* Loading message & spinner */}
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold tracking-wide">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            <span>{text}</span>
          </div>
          <p className="text-[11px] text-slate-500 uppercase tracking-[0.25em] font-bold">Plataforma AgTech AgroMAS</p>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <CloudLoading text="Verificando credenciales de acceso..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
