"use client";

import React from 'react';
import Link from 'next/link';
import { Map } from 'lucide-react';
import { Fao56LotDetail } from '@/components/fao56-lot-detail';
import { useDashboard, kpis } from './context';

export default function DashboardHome() {
  const { lotsData } = useDashboard();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-soft backdrop-blur md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tablero general</p>
            <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Monitoreo agroclimático y balance de lotes</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/map"
              className="flex items-center gap-2 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 px-4 py-2.5 text-xs font-bold shadow-md transition"
            >
              <Map className="h-4 w-4 text-emerald-400" />
              Ir al Mapa de Lotes
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.title}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.delta}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Overview FAO-56 section */}
      <section className="rounded-[30px] border border-slate-200/70 bg-slate-100/60 p-4 shadow-soft backdrop-blur md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Vista consolidada</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Balance hídrico global de la explotación</h3>
          </div>
        </div>
        <Fao56LotDetail />
      </section>
    </div>
  );
}
