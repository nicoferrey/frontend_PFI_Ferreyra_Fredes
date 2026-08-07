"use client";

import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Droplets, Leaf, TimerReset, Waves } from 'lucide-react';

const soilWaterData = [
  { day: 'Lun', depletion: 18, current: 74, raw: 28, taw: 100 },
  { day: 'Mar', depletion: 24, current: 70, raw: 28, taw: 100 },
  { day: 'Mie', depletion: 31, current: 63, raw: 28, taw: 100 },
  { day: 'Jue', depletion: 36, current: 58, raw: 28, taw: 100 },
  { day: 'Vie', depletion: 42, current: 52, raw: 28, taw: 100 },
  { day: 'Sab', depletion: 49, current: 45, raw: 28, taw: 100 },
  { day: 'Dom', depletion: 55, current: 38, raw: 28, taw: 100 },
];

const recommendations = [
  {
    title: 'Sugerencia del Agente de Riego',
    text: 'Aplicar 15 mm de riego en las próximas 24 h para evitar ingresar en zona de estrés.',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-50',
  },
  {
    title: 'Ventana operativa ideal',
    text: 'Programar la lámina entre 05:00 y 07:00, cuando la ET0 baja y mejora la eficiencia.',
    tone: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-50',
  },
  {
    title: 'Lectura MAS',
    text: 'El lote mantiene respuesta positiva en NDVI, pero el agotamiento avanza más rápido que la recarga.',
    tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-50',
  },
];

const impactMetrics = [
  { label: 'Agua ahorrada', value: '18.6 m³', icon: Droplets, accent: 'from-cyan-500 to-sky-600' },
  { label: 'Combustible evitado', value: '4.8 L', icon: Waves, accent: 'from-emerald-500 to-crop-600' },
  { label: 'Ahorro energético', value: '12.4 kWh', icon: TimerReset, accent: 'from-amber-400 to-orange-500' },
  { label: 'Eficiencia de riego', value: '91%', icon: Leaf, accent: 'from-lime-400 to-emerald-500' },
];

const scaleOptions = ['7 días', '14 días', '30 días'];

export function Fao56LotDetail() {
  const [scale, setScale] = useState('7 días');

  const chartData = useMemo(() => {
    const factor = scale === '7 días' ? 1 : scale === '14 días' ? 0.92 : 0.85;

    return soilWaterData.map((entry, index) => ({
      ...entry,
      current: Math.max(22, Math.round(entry.current * factor - index * 1.5)),
      depletion: Math.min(70, Math.round(entry.depletion * (scale === '30 días' ? 1.15 : 1))),
    }));
  }, [scale]);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
      <article className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="border-b border-white/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Vista detallada del lote</p>
              <h3 className="mt-1 text-2xl font-semibold">Curva de agotamiento hídrico FAO-56</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Lectura comparada entre disponibilidad actual, umbral RAW y capacidad de campo TAW para anticipar estrés.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {scaleOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => setScale(item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    scale === item ? 'bg-white text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),linear-gradient(180deg,rgba(12,18,28,1),rgba(8,12,18,1))] p-5">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-300">
              <span>TAW = capacidad de campo</span>
              <span>RAW = inicio de estrés</span>
            </div>

            <div className="h-[340px] rounded-[24px] border border-white/10 bg-black/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="currentWaterFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} tickLine={false} />
                  <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 16,
                      color: '#e2e8f0',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <ReferenceLine y={28} stroke="#f59e0b" strokeDasharray="6 6" strokeWidth={2} label={{ value: 'RAW', fill: '#fbbf24', position: 'insideTopRight' }} />
                  <ReferenceLine y={100} stroke="#60a5fa" strokeDasharray="8 8" strokeWidth={2} label={{ value: 'TAW', fill: '#93c5fd', position: 'insideTopRight' }} />
                  <Area type="monotone" dataKey="current" stroke="#22c55e" fill="url(#currentWaterFill)" strokeWidth={3} name="Agua actual" />
                  <Line type="monotone" dataKey="depletion" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Agotamiento" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Nivel actual</p>
                <p className="mt-2 text-2xl font-semibold text-white">38%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Umbral RAW</p>
                <p className="mt-2 text-2xl font-semibold text-amber-300">28%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">TAW</p>
                <p className="mt-2 text-2xl font-semibold text-sky-300">100%</p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Agente de riego</p>
              <h4 className="mt-1 text-xl font-semibold text-white">Recomendaciones operativas</h4>
            </div>

            {recommendations.map((item) => (
              <article key={item.title} className={`rounded-3xl border p-4 ${item.tone}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-white/10 p-2">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold">{item.title}</h5>
                    <p className="mt-2 text-sm leading-6 text-inherit/90">{item.text}</p>
                  </div>
                </div>
              </article>
            ))}

            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-cyan-50">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Estado técnico</p>
              <p className="mt-2 text-sm leading-6">
                El lote mantiene margen operativo, pero la pendiente de agotamiento indica que conviene intervenir antes de la próxima lectura satelital.
              </p>
            </div>
          </aside>
        </div>
      </article>

      <section className="rounded-[28px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Impacto energético e hídrico</p>
            <h3 className="mt-1 text-2xl font-semibold">Métricas acumuladas</h3>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">Comparado vs. método tradicional</span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {impactMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article key={metric.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.accent} text-white shadow-lg shadow-black/20`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{metric.label}</p>
                    <p className="text-xl font-semibold text-white">{metric.value}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.92))] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Eficiencia de riego</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-semibold text-white">91%</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                El esquema de riego guiado por FAO-56 y MAS supera el método tradicional por una mejora neta de 23 puntos.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300">
              +23% eficiencia
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}