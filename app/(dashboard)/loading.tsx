import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      {/* Subheader Skeleton */}
      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-full bg-slate-200" />
            <div className="h-8 w-64 rounded-xl bg-slate-200" />
          </div>
          <div className="h-10 w-40 rounded-2xl bg-slate-200" />
        </div>
      </div>

      {/* Map Skeleton (Dark Slate Satellite Style) */}
      <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 p-6 min-h-[420px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded-full bg-slate-800" />
            <div className="h-6 w-60 rounded-xl bg-slate-800" />
          </div>
          <div className="h-6 w-36 rounded-full bg-white/10" />
        </div>
        <div className="flex-1 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.95))] min-h-[300px] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)]" />
          <div className="flex flex-col items-center gap-2 text-slate-500 z-10">
            <div className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Cargando visor satelital...</span>
          </div>
        </div>
      </div>

      {/* KPIs Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-soft min-h-[110px]">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="h-7 w-20 rounded-xl bg-slate-200" />
              <div className="h-3 w-32 rounded-full bg-slate-100" />
            </div>
            <div className="h-12 w-12 rounded-2xl bg-slate-100 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
