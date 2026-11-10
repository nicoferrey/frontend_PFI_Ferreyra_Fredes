'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, ArrowUp, ArrowUpRight, BrainCircuit, Eye, MessageSquare, Sparkles } from 'lucide-react';
import { Logo } from '@/components/logo';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/landing/reveal';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function enter(local: number, from: number, span = 0.1) {
  return clamp01((local - from) / span);
}

function Hills() {
  return (
    <svg viewBox="0 0 1440 220" className="block h-36 w-full sm:h-48" preserveAspectRatio="none" aria-hidden>
      <path
        fill="#24362c"
        d="M0 150 C120 120 180 170 300 140 C430 108 480 168 620 132 C760 96 820 160 980 128 C1120 100 1240 150 1440 112 L1440 220 L0 220 Z"
      />
      <path
        fill="#1a2b23"
        d="M0 176 C160 150 260 196 420 168 C580 140 700 190 880 162 C1060 134 1200 186 1440 150 L1440 220 L0 220 Z"
      />
    </svg>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-[#0f8a82] sm:text-xs">
      {children}
    </p>
  );
}

function Place() {
  return (
    <section className="flex min-h-[100dvh] flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8 pt-16 text-center">
        <Kicker>— Un lugar, una problemática —</Kicker>
        <p className="mt-6 text-xl font-semibold uppercase tracking-[0.18em] text-[#24362c] sm:text-3xl">
          Comarca Viedma — Carmen de
        </p>
        <h1 className="mt-1 text-6xl font-black uppercase leading-none tracking-tight text-[#0f8a82] sm:text-8xl lg:text-9xl">
          Patagones
        </h1>
        <div className="mt-10 max-w-xl space-y-3 text-left sm:text-center">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#24362c] sm:text-base">
            Regar por intuición desperdicia energía...
          </p>
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#0f8a82] sm:text-base">
            Regar con datos orquestados optimiza el recurso
          </p>
        </div>
      </div>
      <Hills />
    </section>
  );
}

const SUPPORTS = [
  { index: '01', title: 'Observación visual', text: 'Lo que el cultivo muestra a simple vista.' },
  { index: '02', title: 'Experiencia previa', text: 'Lo que salió bien en otra campaña.' },
  { index: '03', title: 'Clima general', text: 'Una estimación regional, no del lote.' },
];

function Brecha() {
  return (
    <section className="bg-white px-5 py-16 sm:px-10 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0f8a82]">El problema</p>
          <h2 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none tracking-tight text-[#1c2b24] sm:text-6xl">
            La brecha informativa
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#24362c]">
            Sin medición continua, la decisión queda en tres apoyos. Ninguno dice cuánta agua pide este lote, ahora.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {SUPPORTS.map((item, index) => (
            <Reveal key={item.index} delayMs={index * 80}>
              <article className="flex h-full flex-col rounded-[28px] bg-[#f4faf8] px-6 py-6">
                <p className="text-sm font-black tracking-[0.2em] text-[#0f8a82]">{item.index}</p>
                <h3 className="mt-4 text-2xl font-black leading-tight text-[#1c2b24]">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-[#24362c]">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-4 grid overflow-hidden rounded-[28px] lg:grid-cols-2">
          <Reveal>
            <article className="h-full bg-[#1c332b] px-6 py-8 text-white sm:px-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9dcec4]">De menos</p>
              <p className="mt-3 text-3xl font-black leading-tight">Se estresa el cultivo.</p>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-white/75">Cae el rendimiento porque el agua llegó tarde o no llegó.</p>
            </article>
          </Reveal>
          <Reveal delayMs={80}>
            <article className="h-full bg-[#0f8a82] px-6 py-8 text-white sm:px-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">De más</p>
              <p className="mt-3 text-3xl font-black leading-tight">Se satura el suelo.</p>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-white/80">Se gasta agua y energía de bombeo que el lote no necesitaba.</p>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const SensorLotMap = dynamic(
  () => import('@/components/landing/landing-hero-map').then((mod) => mod.LandingHeroMap),
  {
    ssr: false,
    loading: () => <div className="h-[380px] w-full rounded-[28px] bg-[#143028] sm:h-[440px]" />,
  },
);

function SensorField() {
  return (
    <div className="w-full max-w-2xl">
      <SensorLotMap
        showPoint
        className="landing-hero-map h-[380px] w-full overflow-hidden rounded-[28px] sm:h-[440px]"
      />
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1c332b]">
        1 punto en todo el lote
      </p>
    </div>
  );
}

function FieldMini({ mode }: { mode: 'one' | 'many' }) {
  const dots = [
    [46, 40], [72, 36], [98, 32], [124, 30],
    [42, 58], [70, 54], [98, 50], [126, 46],
    [48, 76], [76, 72], [104, 68], [132, 64],
    [58, 92], [88, 88], [116, 82],
  ];
  return (
    <svg viewBox="0 0 160 120" className="h-24 w-36" aria-hidden>
      <path d="M18 28 L132 16 L146 96 L28 108 Z" fill={mode === 'one' ? '#e4d3aa' : '#d7efef'} stroke="#1c332b" strokeWidth="2" />
      {mode === 'one' ? (
        <>
          <path d="M18 28 L76 22 L70 60 L22 66 Z" fill="#f0e2bf" />
          <path d="M76 22 L132 16 L136 54 L70 60 Z" fill="#7ea86a" />
          <path d="M22 66 L70 60 L64 104 L28 108 Z" fill="#c4894a" />
          <path d="M70 60 L136 54 L146 96 L64 104 Z" fill="#2f6a45" />
          <circle cx="84" cy="62" r="4.5" fill="#fff" stroke="#1c332b" strokeWidth="1.6" />
          <circle cx="84" cy="62" r="1.6" fill="#1c332b" />
        </>
      ) : (
        dots.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#0f8a82" />)
      )}
    </svg>
  );
}

function Hardware() {
  return (
    <section className="bg-white">
      <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <div className="px-5 py-12 sm:px-10 lg:py-14 lg:pl-14 lg:pr-8">
          <Reveal>
            <h2 className="text-4xl font-black uppercase leading-none tracking-tight text-[#1c2b24] sm:text-6xl">
              El sensor físico
            </h2>
          </Reveal>
          <Reveal className="mt-8">
            <SensorField />
          </Reveal>
        </div>
        <div className="relative flex flex-col justify-center bg-[#1c332b] px-6 py-14 text-white sm:px-12 lg:py-20">
          <svg className="absolute -left-8 top-0 hidden h-full w-8 lg:block" viewBox="0 0 32 400" preserveAspectRatio="none" aria-hidden>
            <path d="M32 0 C0 80 0 140 32 200 C0 270 0 330 32 400 L32 0 Z" fill="#1c332b" />
          </svg>
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9dcec4]">Elevados costos</p>
            <p className="mt-3 text-6xl font-black tracking-tight sm:text-7xl">2.500</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/65">USD por punto de medición</p>
          </Reveal>
          <div className="my-8 h-px bg-white/20" />
          <Reveal delayMs={80}>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9dcec4]">Resultados parciales</p>
            <p className="mt-3 max-w-sm text-2xl font-black leading-tight">Un punto no representa el suelo norpatagónico.</p>
          </Reveal>
          <div className="my-8 h-px bg-white/20" />
          <Reveal delayMs={140}>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9dcec4]">Riesgo de rotura</p>
            <p className="mt-3 max-w-sm text-2xl font-black leading-tight">La maquinaria pasa por donde el sensor no puede quedarse.</p>
          </Reveal>
        </div>
      </div>
      <div className="border-t border-[#d7efef] bg-[#f4faf8]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-5 py-6 sm:px-8 lg:flex-row lg:gap-8">
          <figure className="shrink-0 text-center">
            <FieldMini mode="one" />
            <figcaption className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1c332b]">Un punto</figcaption>
          </figure>
          <Reveal className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0f8a82]">Sensores virtuales</p>
            <p className="mt-1 text-2xl font-black leading-snug text-[#1c2b24] sm:text-[1.7rem]">
              La medición se virtualiza. El lote entero pasa a ser la lectura.
            </p>
          </Reveal>
          <figure className="shrink-0 text-center">
            <FieldMini mode="many" />
            <figcaption className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f8a82]">El lote</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function Ingesta() {
  return (
    <section className="bg-white">
      <div className="px-5 pb-8 pt-16 sm:px-10 lg:pb-10 lg:pl-14 lg:pt-20">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0f8a82]">Sistema multiagente</p>
          <h2 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none tracking-tight text-[#1c2b24] sm:text-6xl">
            La ingesta
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#24362c]">
            El clima y el satélite se leen en paralelo. El agente de lote aporta el historial de suelo y de riegos. Ninguno recomienda solo.
          </p>
        </Reveal>
      </div>
      <div className="grid lg:grid-cols-2">
        <Reveal>
          <article className="h-full bg-[#1c332b] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9dcec4]">Agente climático</p>
            <h3 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">La demanda del aire</h3>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
              Toma la meteorología de la región y actualiza la serie que después entra al balance.
            </p>
            <dl className="mt-8 space-y-4 border-t border-white/15 pt-6">
              <div>
                <dt className="text-2xl font-black">ET0</dt>
                <dd className="text-sm text-white/70">Evapotranspiración de referencia</dd>
              </div>
              <div>
                <dt className="text-2xl font-black">Precipitaciones</dt>
                <dd className="text-sm text-white/70">Lo que el lote ya recibió</dd>
              </div>
              <div>
                <dt className="text-2xl font-black">NASA POWER</dt>
                <dd className="text-sm text-white/70">La fuente de esas series</dd>
              </div>
            </dl>
          </article>
        </Reveal>
        <Reveal delayMs={90}>
          <article className="h-full bg-[#0f8a82] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">Agente satelital</p>
            <h3 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">La evolución del cultivo</h3>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
              Una imagen suelta no alcanza. El índice se lee en secuencia, píxel por píxel, y de ahí sale el vigor.
            </p>
            <dl className="mt-8 space-y-4 border-t border-white/25 pt-6">
              <div>
                <dt className="text-2xl font-black">Sentinel-2 · MODIS</dt>
                <dd className="text-sm text-white/75">Imagen óptica del lote</dd>
              </div>
              <div>
                <dt className="text-2xl font-black">NDVI en secuencia</dt>
                <dd className="text-sm text-white/75">Cómo cambia el cultivo, no una foto</dd>
              </div>
              <div>
                <dt className="text-2xl font-black">Kcb</dt>
                <dd className="text-sm text-white/75">Coeficiente basal, sin un sensor en el suelo</dd>
              </div>
            </dl>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

function CloudBadge() {
  return (
    <span className="absolute -bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-[#0c6e68] text-white">
      <Logo className="h-5 w-5 text-white" />
    </span>
  );
}

function InputAgent({
  title,
  detail,
  amount,
}: {
  title: string;
  detail: string;
  amount: number;
}) {
  return (
    <div
      className="relative px-1 pb-5"
      style={{ opacity: amount, transform: `translateY(${(1 - amount) * 18}px)` }}
    >
      <div className="rounded-[22px] bg-[#128f86] px-3 py-3 text-center text-white">
        <p className="text-[10px] font-semibold tracking-[0.28em]">— Agente —</p>
        <p className="mt-1 whitespace-nowrap text-lg font-black uppercase tracking-wide sm:text-xl">{title}</p>
        <p className="whitespace-nowrap text-xs tracking-wide text-white/90">{detail}</p>
        <div className="mx-auto mt-2 h-px w-12 bg-white/80" />
      </div>
      <CloudBadge />
    </div>
  );
}

type Point = { x: number; y: number };

function curvePoint(t: number, from: Point, bend: Point, to: Point): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * bend.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * bend.y + t * t * to.y,
  };
}

const STREAMS: Array<{ from: Point; bend: Point; to: Point }> = [
  { from: { x: 18, y: 24 }, bend: { x: 32, y: 32 }, to: { x: 50, y: 36 } },
  { from: { x: 50, y: 18 }, bend: { x: 50, y: 28 }, to: { x: 50, y: 36 } },
  { from: { x: 82, y: 24 }, bend: { x: 68, y: 32 }, to: { x: 50, y: 36 } },
];

function FlowMarks({ amount }: { amount: number }) {
  if (amount < 0.04) return null;
  return (
    <>
      {STREAMS.map((stream, streamIndex) =>
        [0.34, 0.62, 0.9].map((mark) => {
          const travel = Math.min(1, amount * (0.45 + mark * 0.55));
          const point = curvePoint(travel, stream.from, stream.bend, stream.to);
          const size = 8 + mark * 8;
          return (
            <span
              key={`${streamIndex}-${mark}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0c6e68]"
              style={{ left: `${point.x}%`, top: `${point.y}%`, width: size, height: size, opacity: amount }}
            />
          );
        })
      )}
    </>
  );
}

function NetworkDiagram({ local }: { local: number }) {
  const clim = enter(local, 0.02, 0.1);
  const sat = enter(local, 0.14, 0.1);
  const lotAgent = enter(local, 0.26, 0.1);
  const wires = enter(local, 0.4, 0.14);
  const orch = enter(local, 0.56, 0.1);
  const valid = enter(local, 0.7, 0.08);
  const explain = enter(local, 0.84, 0.08);
  const routesReady = Math.min(clim, sat, lotAgent);

  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <div className="mb-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#128f86] text-white">
            <Logo className="h-7 w-7 text-white" />
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tight text-[#1c2b24] sm:text-4xl">La orquestación</h2>
        </div>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#24362c]">
          Un supervisor dirige el grafo, como en LangGraph o CrewAI. El balance se calcula una vez y nadie lo pisa.
        </p>
      </div>

      <div className="relative hidden h-[620px] lg:block">
        <div className="pointer-events-none absolute left-1/2 top-[2%] h-[58%] w-[84%] -translate-x-1/2 rounded-[50%] bg-[#d7efef]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {STREAMS.map((stream) => (
            <path
              key={`${stream.from.x}-${stream.from.y}`}
              d={`M ${stream.from.x} ${stream.from.y} Q ${stream.bend.x} ${stream.bend.y} ${stream.to.x} ${stream.to.y}`}
              fill="none"
              stroke="#0f8a82"
              strokeWidth="2.4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={routesReady * (0.28 + wires * 0.72)}
            />
          ))}
          <line x1="50" y1="52" x2="50" y2="58" stroke="#0f8a82" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={valid} />
          <line x1="50" y1="72" x2="50" y2="78" stroke="#0f8a82" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={explain} />
        </svg>
        <FlowMarks amount={wires * (1 - orch)} />
        <span
          className="absolute h-5 w-5 rounded-full bg-[#128f86]"
          style={{ left: '50%', top: '36%', opacity: wires * (1 - orch), transform: `translate(-50%, -50%) scale(${0.35 + wires * 0.9})` }}
        />
        <div
          className="absolute left-[18%] top-[6%] w-[210px]"
          style={{ opacity: clim, transform: `translate(calc(-50% + ${(1 - clim) * -40}px), ${(1 - clim) * 12}px)` }}
        >
          <InputAgent title="Climático" detail="ET₀ · NASA POWER" amount={1} />
        </div>
        <div
          className="absolute left-1/2 top-0 w-[210px]"
          style={{ opacity: sat, transform: `translate(-50%, ${(1 - sat) * -24}px)` }}
        >
          <InputAgent title="Satelital" detail="NDVI → Kcb" amount={1} />
        </div>
        <div
          className="absolute left-[82%] top-[6%] w-[210px]"
          style={{ opacity: lotAgent, transform: `translate(calc(-50% + ${(1 - lotAgent) * 40}px), ${(1 - lotAgent) * 12}px)` }}
        >
          <InputAgent title="Lote" detail="Historial · suelo · riegos" amount={1} />
        </div>
        <div
          className="absolute left-1/2 top-[34%] w-[46%]"
          style={{ opacity: orch, transform: `translate(-50%, ${(1 - orch) * 16}px) scale(${0.86 + orch * 0.14})` }}
        >
          <div className="rounded-[26px] bg-[#1c332b] px-6 py-4 text-white">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-white/70">— Agente —</p>
            <p className="mt-1 text-2xl font-black uppercase tracking-wide">Balance hídrico</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-white/75">FAO-56 · sin equipo en el lote</p>
          </div>
        </div>
        <div
          className="absolute left-1/2 top-[56%] w-[40%]"
          style={{ opacity: valid, transform: `translate(-50%, ${(1 - valid) * 14}px)` }}
        >
          <div className="rounded-[22px] bg-[#0f8a82] px-5 py-3 text-center text-white">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-white/75">— Agente —</p>
            <p className="mt-1 text-lg font-black uppercase tracking-wide">Validación</p>
            <p className="text-xs text-white/80">Audita los números antes de hablar</p>
          </div>
        </div>
        <div
          className="absolute left-1/2 top-[76%] w-[44%]"
          style={{ opacity: explain, transform: `translate(-50%, ${(1 - explain) * 14}px)` }}
        >
          <div className="rounded-[22px] border-2 border-[#128f86] bg-white/90 px-5 py-3 text-center">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#0f8a82]">— Agente —</p>
            <p className="mt-1 text-lg font-black uppercase tracking-wide text-[#1c2b24]">Explicador</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f8a82]">RAG · historial del lote · FAO · INTA</p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-md lg:hidden">
        <div className="absolute bottom-8 left-6 top-8 w-px bg-[#b7e0db]" style={{ opacity: clim }} />
        <div className="space-y-4">
          <InputAgent title="Climático" detail="ET₀ · NASA POWER" amount={clim} />
          <InputAgent title="Satelital" detail="NDVI → Kcb" amount={sat} />
          <InputAgent title="Lote" detail="Historial · suelo · riegos" amount={lotAgent} />
          <div style={{ opacity: orch, transform: `translateY(${(1 - orch) * 12}px)` }}>
            <div className="rounded-[22px] bg-[#1c332b] px-4 py-4 text-white">
              <p className="text-[10px] font-semibold tracking-[0.28em] text-white/70">— Agente —</p>
              <p className="mt-1 text-xl font-black uppercase">Balance hídrico</p>
              <p className="mt-2 text-sm uppercase tracking-wide">FAO-56 · sin equipo en el lote</p>
            </div>
          </div>
          <div style={{ opacity: valid }}>
            <div className="rounded-[22px] bg-[#0f8a82] px-4 py-4 text-center text-white">
              <p className="text-base font-black uppercase">Validación</p>
              <p className="mt-1 text-xs text-white/80">Audita los números antes de hablar</p>
            </div>
          </div>
          <div style={{ opacity: explain }}>
            <div className="rounded-[22px] border-2 border-[#128f86] bg-white px-4 py-4 text-center">
              <p className="text-base font-black uppercase text-[#1c2b24]">Explicador</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0f8a82]">
                RAG · historial del lote · FAO · INTA
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Network() {
  const ref = useRef<HTMLElement>(null);
  const [local, setLocal] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);

    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const travel = Math.max(el.offsetHeight - window.innerHeight, 1);
      const scrolled = Math.min(Math.max(-rect.top, 0), travel);
      setLocal(scrolled / travel);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      media.removeEventListener('change', apply);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (reduced) {
    return (
      <section className="bg-white py-16">
        <NetworkDiagram local={1} />
      </section>
    );
  }

  return (
    <section ref={ref} className="h-[280vh] bg-white">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <NetworkDiagram local={local} />
      </div>
    </section>
  );
}

const LOTS = [
  { name: 'Lote Norte', crop: 'Soja 2da', status: 'Normal', deficit: '-', au: '86', last: 'Sin dato' },
  { name: 'Lote Centro', crop: 'Maíz Tardío', status: 'Atencion', deficit: '-', au: '63', last: 'Sin dato' },
  { name: 'Lote Sur', crop: 'Trigo', status: 'Critico', deficit: '-', au: '38', last: 'Sin dato' },
  { name: 'Lote Este', crop: 'Girasol', status: 'Normal', deficit: '-', au: '79', last: 'Sin dato' },
];

function statusClass(status: string) {
  if (status === 'Normal') return 'bg-emerald-50 text-emerald-800 border border-emerald-200/90';
  if (status === 'Atencion') return 'bg-amber-50 text-amber-800 border border-amber-200/90';
  if (status === 'Critico') return 'bg-rose-50 text-rose-800 border border-rose-200/90';
  return 'bg-slate-100 text-slate-600';
}

function Tool() {
  return (
    <section className="bg-[#f7f6f1] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#0f8a82]">La entrega</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-none tracking-tight text-[#1c2b24] sm:text-5xl">
            El cálculo no escribe la respuesta
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#24362c]">
            Primero la validación audita los números. Después el explicador arma la frase con el historial del lote y los manuales de FAO e INTA. No inventa. Llega en la app o por WhatsApp, en menos de cinco segundos.
          </p>
        </Reveal>
        <PageHeader
          badge="Tablero General"
          title="Monitoreo Agroclimático &"
          titleAccent="Balance de Lotes"
        />

        <div className="grid min-w-0 gap-6 lg:grid-cols-12">
          <section className="flex h-full min-w-0 flex-col lg:col-span-5">
            <div className="flex flex-1 flex-col justify-between rounded-[28px] border border-slate-200/90 bg-white p-5 text-slate-900 shadow-soft">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-crop-200/80 bg-crop-50 text-crop-700">
                      <BrainCircuit className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-950 sm:text-base">Alertas Prioritarias de Agentes</h3>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Recomendaciones operativas de MAS</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 space-y-3">
                  <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4">
                    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-sky-200/90 bg-gradient-to-r from-sky-50 via-water-50/50 to-white p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-water-600 text-white">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Lote</span>
                          <h4 className="truncate text-xs font-black text-slate-950 sm:text-sm">
                            Lote Sur <span className="text-xs font-semibold text-slate-500">(Trigo)</span>
                          </h4>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-sky-200 bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-800">
                        Prioridad: Alta
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-crop-600 bg-slate-50/90 p-3">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                        Diagnóstico y Recomendación Agronómica:
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-800">
                        “El lote está en estado crítico. Conviene revisar el riego antes de seguir perdiendo agua útil.”
                      </p>
                    </div>
                    <div className="flex flex-col gap-2.5 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Ventana sugerida:</span>
                        <span className="font-mono text-xs font-extrabold text-slate-900">Sin ventana operativa validada</span>
                      </div>
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-extrabold text-white">
                        <span>Inspeccionar</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Optimización energética activa
                </span>
                <span className="text-xs font-extrabold text-slate-700">1 alerta</span>
              </div>
            </div>
          </section>

          <section className="flex h-full min-w-0 flex-col lg:col-span-7">
            <div className="flex flex-1 flex-col rounded-[30px] border border-slate-200 bg-white p-6 text-slate-900 shadow-soft">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Lista consolidada</span>
                  <h3 className="mt-0.5 text-base font-bold text-slate-900">Estado operativo por lote</h3>
                </div>
              </div>
              <div className="space-y-3 md:hidden">
                {LOTS.map((lot) => (
                  <div key={lot.name} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{lot.name}</h4>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">{lot.crop}</p>
                      </div>
                      <span className={`whitespace-nowrap rounded-lg px-2.5 py-0.5 text-[11px] font-extrabold ${statusClass(lot.status)}`}>
                        {lot.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Faltante</p>
                        <p className="text-sm font-black text-slate-950">{lot.deficit}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Disponible</p>
                        <p className="text-sm font-black text-slate-950">{lot.au}<span className="text-[10px] font-bold text-slate-400">%</span></p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Últ. Riego</p>
                        <p className="truncate text-xs font-bold text-slate-700">{lot.last}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="select-none border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Lote</th>
                      <th className="px-3 py-2.5">Cultivo</th>
                      <th className="px-3 py-2.5 text-center">Estado</th>
                      <th className="px-3 py-2.5 text-center">Agua Faltante</th>
                      <th className="px-3 py-2.5 text-center">Agua Disponible</th>
                      <th className="px-3 py-2.5 text-center">Último Riego</th>
                      <th className="px-3 py-2.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90 text-xs">
                    {LOTS.map((lot) => (
                      <tr key={lot.name}>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{lot.name}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-500">{lot.crop}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-0.5 text-[11px] font-extrabold ${statusClass(lot.status)}`}>
                            {lot.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-900">{lot.deficit}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-extrabold text-slate-950">{lot.au}</span>
                          <span className="ml-0.5 text-[11px] font-bold text-slate-400">%</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium text-slate-500">{lot.last}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
                            <Eye className="h-4 w-4 text-slate-700" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">Preguntá por el historial del lote</h2>
                <p className="text-xs text-slate-500">Lote Sur · En la app y por WhatsApp</p>
              </div>
            </div>
          </header>
          <div className="space-y-5 bg-slate-50/60 p-5" role="log" aria-label="Conversación del lote">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-800 px-4 py-2.5 text-sm text-white">
              ¿Conviene regar el Lote Sur?
            </div>
            <article className="mr-auto max-w-[90%] space-y-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white p-4 text-sm">
              <p className="text-xs font-semibold text-emerald-800">Lote Sur</p>
              <p>
                Prioridad alta. El balance publicado pide revisar el riego. No hay una ventana operativa validada, así que no estimo un horario. La respuesta sale del historial del lote, no de una frase inventada.
              </p>
            </article>
          </div>
          <form className="border-t border-slate-100 p-4" onSubmit={(event) => event.preventDefault()}>
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 p-2">
              <textarea
                rows={2}
                readOnly
                aria-label="Tu pregunta"
                placeholder="Escribí tu pregunta…"
                className="min-w-0 flex-1 resize-y rounded-xl bg-transparent px-2 py-1 text-sm outline-none"
              />
              <span className="rounded-xl bg-emerald-700 p-2.5 text-white opacity-40">
                <ArrowUp className="h-5 w-5" />
              </span>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}

export function RelatoScroll() {
  return (
    <div className="bg-white text-[#1c2b24]">
      <Place />
      <Brecha />
      <Hardware />
      <Ingesta />
      <Network />
      <Tool />
    </div>
  );
}
