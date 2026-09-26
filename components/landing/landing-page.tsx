'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronDown,
  CloudRain,
  Droplets,
  Globe2,
  Layers,
  MapPinned,
  MessageSquareText,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  Waves,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { Reveal } from '@/components/landing/reveal';
import {
  LandingFooter,
  LandingHeader,
  SectionKicker,
} from '@/components/landing/landing-chrome';

const LandingHeroMap = dynamic(
  () => import('@/components/landing/landing-hero-map').then((mod) => mod.LandingHeroMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[240px] w-full items-center justify-center rounded-2xl bg-slate-900 sm:h-[280px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cargando mapa…</span>
      </div>
    ),
  }
);

const FEATURES = [
  {
    icon: Satellite,
    title: 'Monitoreo Sentinel-2',
    description:
      'Índices NDVI, NDWI y zonificación de vigor vegetal actualizados por pasadas orbitales, sin sensores extra en el lote.',
    iconBox: 'from-sky-500 to-cyan-400',
  },
  {
    icon: Waves,
    title: 'Balance hídrico FAO-56',
    description:
      'Cálculo diario de ET₀, humedad del suelo y necesidad de riego con un modelo agronómico internacional, trazable y auditable.',
    iconBox: 'from-emerald-500 to-crop-400',
  },
  {
    icon: BrainCircuit,
    title: 'Asistente IA multi-agente',
    description:
      'Agentes especializados de riego, suelo y clima que explican la recomendación y priorizan qué lote atender primero.',
    iconBox: 'from-amber-400 to-orange-500',
  },
  {
    icon: CloudRain,
    title: 'Clima georreferenciado',
    description:
      'Consenso entre Open-Meteo y NASA POWER para no decidir con una sola fuente meteorológica.',
    iconBox: 'from-cyan-400 to-water-500',
  },
  {
    icon: Users,
    title: 'Equipo y multi-campo',
    description:
      'Invitá agrónomos y operadores, asigná roles y administrá varios establecimientos desde el mismo tablero.',
    iconBox: 'from-crop-500 to-emerald-500',
  },
  {
    icon: MessageSquareText,
    title: 'Alertas operativas',
    description:
      'Estrés hídrico, caída de NDVI, heladas y ventanas de riego llegan al tablero y por WhatsApp cuando importa.',
    iconBox: 'from-water-500 to-sky-500',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Delimitá tu campo',
    description: 'Cargá el establecimiento, dibujá lotes y definí cultivo, suelo y sistema de riego.',
  },
  {
    step: '02',
    title: 'El modelo calcula solo',
    description: 'Satélite, clima y FAO-56 se sincronizan todos los días. Los agentes validan y explican el resultado.',
  },
  {
    step: '03',
    title: 'Regá con prioridad',
    description: 'El tablero te dice qué lote atender, cuánta lámina aplicar y en qué ventana energética conviene.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Pasamos de regar “por costumbre” a tener una lámina diaria por lote. En la campaña de maíz ahorramos dos riegos enteros sin perder rendimiento.',
    name: 'Mariana López',
    role: 'Administradora · Establecimiento El Juncal',
    place: 'Valle Inferior, Río Negro',
    initials: 'ML',
    accent: 'from-emerald-500 to-cyan-500',
  },
  {
    quote:
      'El NDVI y el balance se ven en el mismo mapa. Mis operadores entienden la prioridad del día sin que yo esté encima del teléfono.',
    name: 'Diego Herrera',
    role: 'Ingeniero agrónomo asesor',
    place: 'Alto Valle, Río Negro',
    initials: 'DH',
    accent: 'from-sky-500 to-water-600',
  },
  {
    quote:
      'Las alertas de estrés hídrico nos llegaron dos días antes de que el lote se pusiera crítico. Eso, en pera, es la diferencia entre calidad y descarte.',
    name: 'Carolina Méndez',
    role: 'Encargada de riego · Cooperativa Sur',
    place: 'Valle Medio, Río Negro',
    initials: 'CM',
    accent: 'from-crop-500 to-amber-400',
  },
];

const PLANS = [
  {
    id: 'semilla',
    name: 'Semilla',
    description: 'Para probar el tablero con tu primer establecimiento.',
    monthly: 0,
    yearly: 0,
    cta: 'Empezar gratis',
    href: '/login?mode=signup',
    featured: false,
    features: [
      '1 establecimiento',
      'Hasta 3 lotes',
      'Tablero y mapa de lotes',
      'Balance FAO-56 en modo demo',
      'Asistente IA básico',
    ],
  },
  {
    id: 'productor',
    name: 'Productor',
    description: 'La operación diaria de un campo que decide con datos.',
    monthly: 49,
    yearly: 39,
    cta: 'Elegir Productor',
    href: '/login?mode=signup',
    featured: true,
    features: [
      'Hasta 20 lotes',
      'Sentinel-2 NDVI / NDWI real',
      'Balance FAO-56 calibrado',
      'Alertas WhatsApp',
      'Historial, reportes y equipo',
    ],
  },
  {
    id: 'cooperativa',
    name: 'Cooperativa',
    description: 'Varios campos, roles y un mismo criterio agronómico.',
    monthly: 129,
    yearly: 99,
    cta: 'Hablar con el equipo',
    href: '/login?mode=signup',
    featured: false,
    features: [
      'Multi-establecimiento',
      'Lotes y usuarios ilimitados',
      'Agentes MAS completos',
      'Comparativa climática avanzada',
      'Soporte prioritario',
    ],
  },
];

const FAQS = [
  {
    q: '¿Necesito sensores o una estación meteorológica en el campo?',
    a: 'No. AgroMAS combina pasadas Sentinel-2, clima georreferenciado (Open-Meteo y NASA POWER) y el modelo FAO-56. Si tenés estación propia, se pueden usar esos datos como referencia y validación.',
  },
  {
    q: '¿Qué es el balance hídrico FAO-56 y por qué importa?',
    a: 'Es el estándar de la FAO para estimar evapotranspiración y agua disponible en el suelo. En lugar de “adivinar” el riego, el sistema calcula una lámina diaria trazable: ET₀, Kc, lluvia, riego y déficit por lote.',
  },
  {
    q: '¿El satélite funciona con nubes o en cualquier región?',
    a: 'Sentinel-2 cubre todo el país. Si una escena tiene mucha nubosidad, el tablero lo indica y el balance hídrico sigue operando con clima y el último NDVI válido. No está limitado al Valle Inferior.',
  },
  {
    q: '¿Puedo invitar a mi agrónomo y a los operadores?',
    a: 'Sí. Cada establecimiento tiene roles (administrador, agrónomo y operador) con permisos distintos. El operador registra riegos y lluvias; el administrador delimita lotes y gestiona el equipo.',
  },
  {
    q: '¿Cómo llegan las alertas?',
    a: 'Al tablero en tiempo real y, si cargás un WhatsApp, también al teléfono: estrés hídrico, caída de NDVI, heladas, alta demanda (ET₀) y ventanas de riego sugeridas.',
  },
  {
    q: '¿Puedo cancelar o cambiar de plan cuando quiera?',
    a: 'Sí. El plan Semilla es gratuito y permanente. Productor y Cooperativa se pueden cambiar o cancelar al cierre del período facturado, sin permanencia mínima.',
  },
];

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const authed = mounted && !isLoading && isAuthenticated;

  const prices = useMemo(
    () =>
      PLANS.map((plan) => ({
        ...plan,
        amount: yearly ? plan.yearly : plan.monthly,
      })),
    [yearly]
  );

  return (
    <div className="min-h-screen text-slate-900 font-sans">
      <LandingHeader />

      <main className="mx-auto max-w-6xl space-y-16 px-4 pb-16 pt-8 sm:px-6 lg:space-y-24 lg:pt-12">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20 sm:p-10 lg:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(34,197,94,0.18),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.14),transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="hero-enter inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Decisiones de riego trazables
              </div>
              <h1 className="hero-enter text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl" style={{ animationDelay: '90ms' }}>
                Regá menos por costumbre.{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Más por evidencia.
                </span>
              </h1>
              <p className="hero-enter max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base" style={{ animationDelay: '160ms' }}>
                AgroMAS combina satélite Sentinel-2, balance hídrico FAO-56 y un sistema multi-agente para
                decirte qué lote regar, cuándo y con qué lámina. Nacido en el Valle Inferior del Río Negro.
              </p>
              <div className="hero-enter flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: '240ms' }}>
                <Link
                  href={authed ? '/dashboard' : '/login?mode=signup'}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02]"
                >
                  {authed ? 'Abrir mi tablero' : 'Probar el tablero gratis'}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href="#producto"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Ver cómo funciona
                </a>
              </div>
              <div className="hero-enter grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-3 sm:max-w-none" style={{ animationDelay: '320ms' }}>
                {[
                  {
                    kicker: 'FAO-56',
                    detail: 'Cuánta agua le falta a cada lote, hoy',
                  },
                  {
                    kicker: 'Sentinel-2',
                    detail: 'NDVI actualizado por pasada orbital',
                  },
                  {
                    kicker: 'Agentes MAS',
                    detail: 'Prioridad y el porqué, no un puntaje',
                  },
                ].map((stat) => (
                  <div key={stat.kicker} className="rounded-2xl border border-white/10 bg-slate-900/70 px-3.5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">{stat.kicker}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400">{stat.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-enter lg:col-span-5" style={{ animationDelay: '280ms' }}>
              <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-md sm:p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Visor de lotes</p>
                    <p className="text-sm font-extrabold text-white">Establecimiento de ejemplo</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle animate-pulse" />
                    Satélite
                  </span>
                </div>
                <LandingHeroMap />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Agua útil', value: '68%', icon: Droplets, tone: 'text-emerald-300' },
                    { label: 'Próxima acción', value: 'Regar', icon: Activity, tone: 'text-cyan-300' },
                    { label: 'Lotes críticos', value: '1', icon: AlertTriangle, tone: 'text-amber-300' },
                    { label: 'Agentes', value: 'OK', icon: BrainCircuit, tone: 'text-sky-300' },
                  ].map((kpi, index) => {
                    const Icon = kpi.icon;
                    return (
                      <div key={kpi.label} className="kpi-pop rounded-2xl border border-white/10 bg-slate-950/70 p-3" style={{ animationDelay: `${700 + index * 90}ms` }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                          <Icon className={`h-3.5 w-3.5 ${kpi.tone}`} />
                        </div>
                        <p className={`mt-1 text-lg font-black ${kpi.tone}`}>{kpi.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="producto" className="scroll-mt-28 space-y-8">
          <Reveal className="max-w-2xl space-y-3">
            <SectionKicker>Producto</SectionKicker>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Todo lo que el campo necesita{' '}
              <span className="bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 bg-clip-text text-transparent">
                para decidir el riego
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              No es una IA que adivina. Es un tablero que calcula, valida y explica: satélite, clima, modelo y equipo, en el mismo lugar.
            </p>
          </Reveal>

          <Reveal>
            <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-soft">
              <div className="grid md:grid-cols-2">
                {FEATURES.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <article
                      key={feature.title}
                      className={`group relative overflow-hidden border-b border-slate-100 p-6 last:border-b-0 sm:p-8 md:border-b ${
                        index % 2 === 0 ? 'md:border-r md:border-slate-100' : ''
                      } ${index >= FEATURES.length - 2 ? 'md:border-b-0' : ''}`}
                    >
                      <span className="pointer-events-none absolute -right-1 -top-3 text-7xl font-black tracking-tight text-slate-100 transition duration-300 group-hover:text-crop-50">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="relative flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${feature.iconBox}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <h3 className="text-base font-extrabold text-slate-950 sm:text-lg">{feature.title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <div className="pt-8 lg:pt-12">
            <Reveal className="max-w-2xl space-y-3">
              <SectionKicker tone="water">Cómo funciona</SectionKicker>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Tres pasos.{' '}
                <span className="bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 bg-clip-text text-transparent">
                  Del lote a la lámina.
                </span>
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Configurás el campo una vez. El modelo, el satélite y los agentes trabajan todos los días.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
              {STEPS.map((item, index) => (
                <Reveal key={item.step} delayMs={index * 140} className="h-full">
                  <div className="relative flex h-full flex-col">
                    <p className="bg-gradient-to-br from-crop-600 via-emerald-500 to-water-600 bg-clip-text text-7xl font-black leading-none tracking-tighter text-transparent sm:text-8xl">
                      {item.step}
                    </p>
                    <div className="mt-5 h-1 w-12 rounded-full bg-gradient-to-r from-crop-500 to-water-500" />
                    <h4 className="mt-4 text-xl font-extrabold text-slate-950">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <Reveal className="max-w-2xl space-y-3">
            <SectionKicker tone="water">Testimonios</SectionKicker>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Quienes ya riegan{' '}
              <span className="bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 bg-clip-text text-transparent">
                con el tablero
              </span>
            </h2>
          </Reveal>
          <div className="grid gap-4 lg:grid-cols-3">
            {TESTIMONIALS.map((item, index) => (
              <Reveal key={item.name} delayMs={index * 120} className="h-full">
                <figure className="flex h-full flex-col justify-between rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
                  <blockquote className="text-sm leading-relaxed text-slate-700">“{item.quote}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xs font-black text-white ${item.accent}`}>
                      {item.initials}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-950">{item.name}</p>
                      <p className="text-xs font-medium text-slate-500">{item.role}</p>
                      <p className="text-[11px] font-semibold text-crop-700">{item.place}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="precios" className="scroll-mt-28 space-y-8">
          <Reveal>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl space-y-3">
                <SectionKicker>Precios</SectionKicker>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  Planes claros,{' '}
                  <span className="bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 bg-clip-text text-transparent">
                    sin letra chica
                  </span>
                </h2>
                <p className="text-sm text-slate-600">Empezá gratis. Escalás cuando el campo lo pide.</p>
              </div>
              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setYearly(false)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${yearly ? 'text-slate-500' : 'bg-slate-950 text-white'}`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setYearly(true)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${yearly ? 'bg-slate-950 text-white' : 'text-slate-500'}`}
                >
                  Anual · 20% off
                </button>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4 lg:grid-cols-3">
            {prices.map((plan, index) => (
              <Reveal key={plan.id} delayMs={index * 120} variant={plan.featured ? 'scale' : 'up'} className="h-full">
                <article
                  className={`relative flex h-full flex-col rounded-[28px] border p-6 shadow-soft ${
                    plan.featured
                      ? 'border-emerald-400/40 bg-slate-950 text-white'
                      : 'border-white/80 bg-white text-slate-900'
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-950">
                      Más elegido
                    </span>
                  )}
                  <h3 className="text-xl font-black">{plan.name}</h3>
                  <p className={`mt-1 text-sm ${plan.featured ? 'text-slate-300' : 'text-slate-600'}`}>{plan.description}</p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-4xl font-black tracking-tight">{plan.amount === 0 ? 'Gratis' : `USD ${plan.amount}`}</span>
                    {plan.amount > 0 && (
                      <span className={`mb-1 text-xs font-bold ${plan.featured ? 'text-slate-400' : 'text-slate-500'}`}>
                        /mes
                      </span>
                    )}
                  </div>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? 'text-emerald-400' : 'text-crop-600'}`} />
                        <span className={plan.featured ? 'text-slate-200' : 'text-slate-700'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={authed ? '/dashboard' : plan.href}
                    className={`mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition hover:scale-[1.02] ${
                      plan.featured
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950'
                        : 'bg-slate-950 text-white'
                    }`}
                  >
                    {authed ? 'Ir al tablero' : plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section id="nosotros" className="scroll-mt-28 overflow-hidden rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-soft sm:p-10">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <SectionKicker>Quiénes somos</SectionKicker>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Un equipo del Valle Inferior que une{' '}
                <span className="bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 bg-clip-text text-transparent">
                  agronomía e ingeniería
                </span>
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                AgroMAS nació como Proyecto Final Integrador de Nicolas Ferreyra y Luis Fredes: una plataforma
                para que el riego deje de ser una apuesta y pase a ser una decisión documentada. Trabajamos con
                datos satelitales, clima georreferenciado y la operación diaria de un
                establecimiento — no con un tablero genérico importado.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                Nuestra tesis es simple: el productor no necesita más pantallas, necesita una recomendación que
                se pueda explicar. Por eso el sistema calcula primero y recién después usa IA para priorizar y
                contar el porqué.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-xs font-black text-white">
                    NF
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-slate-950">Nicolas Ferreyra</p>
                  <p className="text-xs font-medium text-slate-500">Co-founder</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-xs font-black text-white">
                    LF
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-slate-950">Luis Fredes</p>
                  <p className="text-xs font-medium text-slate-500">Co-founder</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 lg:col-span-5">
              {[
                { icon: MapPinned, title: 'Hecho para el valle', text: 'Pensado para riego gravitacional y presurizado en producción intensiva, con el campo como unidad de decisión.' },
                { icon: ShieldCheck, title: 'Recomendación trazable', text: 'Cada lámina tiene fuentes, supuestos y validación. No hay caja negra.' },
                { icon: Globe2, title: 'Abierto a todo el país', text: 'El mismo motor sirve para cualquier lote con geometría, cultivo y fecha de siembra.' },
                { icon: Layers, title: 'Del lote al equipo', text: 'Un solo criterio para dueño, agrónomo y operador, con roles y alertas compartidas.' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delayMs={index * 90}>
                    <div className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crop-50 text-crop-700">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.text}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
        </Reveal>

        <section id="faq" className="scroll-mt-28 space-y-6">
          <Reveal className="max-w-2xl space-y-3">
            <SectionKicker tone="slate">FAQ</SectionKicker>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Preguntas frecuentes
            </h2>
          </Reveal>
          <div className="space-y-3">
            {FAQS.map((item, index) => {
              const open = openFaq === index;
              return (
                <Reveal key={item.q} delayMs={index * 70}>
                  <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-sm font-medium text-slate-800 sm:text-base">{item.q}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-crop-600 transition duration-300 ${open ? 'rotate-180' : ''}`} />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                      <div className="overflow-hidden">
                        <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <Reveal variant="scale">
          <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-slate-950 p-8 text-white sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(34,197,94,0.2),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.16),transparent_40%)]" />
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500">
                <Sprout className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">
                Empezá con un lote. El resto lo calcula AgroMAS.
              </h2>
              <p className="text-sm text-slate-300">
                Creá tu cuenta, delimitá el campo y en minutos tenés NDVI, balance hídrico y una prioridad de riego.
              </p>
            </div>
            <Link
              href={authed ? '/dashboard' : '/login?mode=signup'}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition hover:scale-[1.02]"
            >
              {authed ? 'Volver al tablero' : 'Crear cuenta gratis'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
        </Reveal>
      </main>

      <LandingFooter />
    </div>
  );
}
