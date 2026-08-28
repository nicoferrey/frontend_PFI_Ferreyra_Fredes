"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sprout, Droplets, Waves, MessageSquareText, ShieldCheck, 
  Satellite, ArrowUpRight, CheckCircle2, Loader2 
} from 'lucide-react';
import AuthForm from '@/components/auth-form';
import { Logo } from '@/components/logo';
import { useAuth } from '@/lib/auth-context';
import { CloudLoading } from '@/components/auth-guard';

const TAGLINES = [
  "Decisiones agronómicas de precisión impulsadas por satélite e IA.",
  "Balance hídrico diario y estimación de humedad FAO-56 por parcela.",
  "Monitoreo orbital Sentinel-2 con índices de vigor y NDVI en tiempo real.",
  "Recomendaciones inteligentes de riego con Agentes IA de AgroMAS."
];

function TypewriterTagline() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);

  useEffect(() => {
    if (subIndex === TAGLINES[index].length + 1 && !reverse) {
      const timeout = setTimeout(() => {
        setReverse(true);
      }, 2500);
      return () => clearTimeout(timeout);
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % TAGLINES.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 25 : 55);

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse]);

  return (
    <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight min-h-[5.5rem] flex items-center">
      <span>
        {TAGLINES[index].substring(0, subIndex)}
        <span className="inline-block w-[3px] h-7 xl:h-8 ml-1 bg-emerald-400 align-middle animate-pulse" />
      </span>
    </h2>
  );
}

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <CloudLoading text="Cargando plataforma..." />;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f6f1_0%,#eef2eb_100%)] text-slate-900 flex items-center justify-center p-3 sm:p-4 lg:p-6 font-sans">
      
      {/* UNIFIED EXPANDED MASTER DARK CONTAINER */}
      <main className="w-full max-w-[1560px] min-h-[calc(100vh-1.5rem)] lg:min-h-[calc(100vh-3rem)] mx-auto bg-slate-950 text-slate-100 rounded-[36px] border border-white/10 shadow-2xl shadow-slate-950/20 p-6 md:p-10 lg:p-12 relative overflow-hidden flex flex-col justify-between">
        
        {/* Background Grids and Radial Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(34,197,94,0.18),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_40%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center flex-1 my-auto">
          
          {/* LEFT COLUMN: AgTech Showcase & Brand Value (7 cols) */}
          <section className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between space-y-6 py-2">
            
            {/* Brand Header */}
            <div>
              <Link href="/" className="flex items-center gap-3.5 group w-fit">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition duration-300">
                  <Logo className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Plataforma AgTech</p>
                  <h1 className="text-2xl font-black text-white tracking-tight">Agro<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">MAS</span></h1>
                </div>
              </Link>
            </div>

            {/* Center Showcase with Typewriter */}
            <div className="space-y-5 max-w-3xl">
              
              {/* Typewriter Tagline Headline */}
              <TypewriterTagline />

              <p className="text-slate-300 text-sm xl:text-base leading-relaxed font-normal max-w-2xl">
                Optimiza las decisiones de riego en tu establecimiento combinando modelos agronómicos internacionales, pasadas satelitales y asistentes conversacionales con Inteligencia Artificial.
              </p>

              {/* 4 Real Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md space-y-1.5 hover:border-sky-500/30 transition">
                  <div className="flex items-center gap-2 text-sky-400">
                    <Satellite className="h-4 w-4 shrink-0" />
                    <span className="font-bold text-xs xl:text-sm">Monitoreo Satelital Sentinel-2</span>
                  </div>
                  <p className="text-[11px] xl:text-xs text-slate-400 leading-relaxed">
                    Índices NDVI, NDWI y zonificación de vigor vegetal actualizados por pasadas orbitales.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md space-y-1.5 hover:border-emerald-500/30 transition">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Waves className="h-4 w-4 shrink-0" />
                    <span className="font-bold text-xs xl:text-sm">Balance Hídrico FAO-56</span>
                  </div>
                  <p className="text-[11px] xl:text-xs text-slate-400 leading-relaxed">
                    Cálculo diario de evapotranspiración ET₀, humedad del suelo y necesidad de riego.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md space-y-1.5 hover:border-amber-500/30 transition">
                  <div className="flex items-center gap-2 text-amber-400">
                    <MessageSquareText className="h-4 w-4 shrink-0" />
                    <span className="font-bold text-xs xl:text-sm">Asistente IA Multi-Agente (MAS)</span>
                  </div>
                  <p className="text-[11px] xl:text-xs text-slate-400 leading-relaxed">
                    Agentes especializados de riego, suelo y clima para consultas agronómicas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md space-y-1.5 hover:border-cyan-500/30 transition">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Droplets className="h-4 w-4 shrink-0" />
                    <span className="font-bold text-xs xl:text-sm">Estaciones y Clima Histórico</span>
                  </div>
                  <p className="text-[11px] xl:text-xs text-slate-400 leading-relaxed">
                    Comparativa climática e integración con estaciones INTA EEAVI y fuentes meteorológicas.
                  </p>
                </div>

              </div>
            </div>

          </section>

          {/* RIGHT COLUMN: Embedded Light Auth Card (5 cols) */}
          <section className="lg:col-span-5 xl:col-span-5 flex justify-center w-full">
            
            <div className="w-full max-w-xl bg-white text-slate-900 rounded-[32px] p-6 sm:p-8 xl:p-10 shadow-2xl border border-slate-200/80">
              {/* Mobile Brand Header */}
              <div className="w-full lg:hidden flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10">
                    <Logo className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-600">PLATAFORMA</p>
                    <span className="text-lg font-black text-slate-950">AgroMAS</span>
                  </div>
                </div>
                <Link href="/" className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1">
                  Tablero &rarr;
                </Link>
              </div>

              {/* Auth Form Component */}
              <AuthForm />
            </div>

          </section>

        </div>

      </main>

    </div>
  );
}
