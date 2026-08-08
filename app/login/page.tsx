"use client";

import Link from 'next/link';
import { 
  Sprout, Droplets, Waves, MessageSquareText, ShieldCheck, 
  Satellite, ArrowUpRight, CheckCircle2 
} from 'lucide-react';
import AuthForm from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {/* LEFT COLUMN: AgTech Showcase & Thesis Brand Value */}
      <section className="hidden lg:flex flex-1 flex-col justify-between p-12 relative bg-[linear-gradient(135deg,#070d14_0%,#0b1520_45%,#081711_100%)] border-r border-white/10 overflow-hidden">
        
        {/* Background Grids and Radial Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(34,197,94,0.14),transparent_40%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.12),transparent_35%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Plataforma AgTech</p>
              <h1 className="text-xl font-bold text-white tracking-tight">AgroMAS</h1>
            </div>
          </Link>
        </div>

        {/* Center Pillars Showcase */}
        <div className="relative z-10 my-auto py-8 max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Riego Inteligente con Modelo FAO-56 y MAS
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Decisiones de riego agronómicas impulsadas por satélite e IA.
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            Elimina el uso de sensores de suelo físicos invasivos. Gestiona el balance de agua por parcela, anticipa el estrés hídrico y optimiza el consumo energético de tus equipos de bombeo.
          </p>

          {/* Key Value Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400">
                <Satellite className="h-4 w-4" />
                <span className="font-bold text-xs">Monitoreo Sentinel-2</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Índices de vigor y NDVI calibrados en tiempo real por pasada orbital.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <Waves className="h-4 w-4" />
                <span className="font-bold text-xs">Balance Hídrico Dinámico</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Curvas de agotamiento $D_r$ referenciadas a umbrales $RAW$ y $TAW$.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400">
                <MessageSquareText className="h-4 w-4" />
                <span className="font-bold text-xs">Canal WhatsApp RAG</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Alertas operativas de bombeo directo en el teléfono del regador.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-1.5">
              <div className="flex items-center gap-2 text-crop-400">
                <Droplets className="h-4 w-4" />
                <span className="font-bold text-xs">+23% Ahorro de Agua</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Reducción directa de combustible diésel y horas de marcha de motor.
              </p>
            </div>

          </div>
        </div>

        {/* Footer info / Testimonial */}
        <div className="relative z-10 border-t border-white/10 pt-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Infraestructura Segura &bull; Tesis de Grado PFI</span>
          </div>
          <span>AgroMAS &copy; 2026</span>
        </div>

      </section>

      {/* RIGHT COLUMN: Auth Form Interface */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-slate-950">
        
        {/* Mobile Header */}
        <div className="w-full max-w-md lg:hidden flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold text-white">AgroMAS</span>
          </div>
          <Link href="/" className="text-xs text-emerald-400 font-semibold hover:underline">
            Ir al Tablero &rarr;
          </Link>
        </div>

        {/* Auth Form Component */}
        <AuthForm />

      </section>

    </main>
  );
}
