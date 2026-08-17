import React from 'react';
import { Loader2 } from 'lucide-react';

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

      {/* KPIs Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm min-h-[140px]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-200" />
              <div className="h-4 w-24 rounded-full bg-slate-200" />
            </div>
            <div className="space-y-2 mt-4">
              <div className="h-8 w-16 rounded-xl bg-slate-200" />
              <div className="h-3 w-32 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Two columns: Map Skeleton and Priority Alerts Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Map Skeleton */}
        <div className="lg:col-span-2 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
        </div>

        {/* Alerts Skeleton */}
        <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm min-h-[400px]">
          <div className="h-6 w-48 rounded-xl bg-slate-200 mb-2" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div className="h-5 w-32 rounded-xl bg-slate-200" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-slate-200" />
                <div className="h-3 w-4/5 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
