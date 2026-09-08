'use client';

import React from 'react';

export function TableSkeleton({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {/* Table Header Skeleton */}
      <div className="flex items-center gap-4 py-3 border-b border-slate-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={`th-${i}`}
            className="h-3 bg-slate-200/80 rounded-md flex-1"
            style={{ maxWidth: i === 0 ? '140px' : '100px' }}
          />
        ))}
      </div>

      {/* Table Rows Skeleton */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`tr-${rowIdx}`}
          className="flex items-center gap-4 py-3.5 border-b border-slate-100/70"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={`td-${rowIdx}-${colIdx}`}
              className="h-3.5 bg-slate-100 rounded-md flex-1"
              style={{
                maxWidth: colIdx === 0 ? '160px' : colIdx === 1 ? '80px' : '90px',
                opacity: 1 - rowIdx * 0.12,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MobileCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`mobile-card-skel-${i}`}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-slate-200 rounded-xl" />
            <div className="h-5 w-16 bg-slate-200 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="h-2.5 w-12 bg-slate-100 rounded" />
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
            </div>
            <div className="space-y-1">
              <div className="h-2.5 w-12 bg-slate-100 rounded" />
              <div className="h-3.5 w-20 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="h-7 w-full bg-slate-50 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = '300px' }: { height?: string }) {
  return (
    <div
      className="w-full flex flex-col justify-between p-4 animate-pulse rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.95))]"
      style={{ height }}
    >
      {/* Top Legend Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-28 bg-white/10 rounded-full" />
          <div className="h-3 w-28 bg-white/10 rounded-full" />
        </div>
        <div className="h-3 w-36 bg-white/5 rounded-full" />
      </div>

      {/* Chart Grid Lines & Wave Skeleton */}
      <div className="flex-1 my-4 flex items-end justify-between gap-2 px-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const heights = [40, 55, 70, 60, 85, 75, 50, 65, 80, 70, 90, 85];
          return (
            <div
              key={`bar-skel-${i}`}
              className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-500/20 via-emerald-500/10 to-transparent transition-all"
              style={{ height: `${heights[i % heights.length]}%` }}
            />
          );
        })}
      </div>

      {/* Bottom X-Axis labels skeleton */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`lbl-skel-${i}`} className="h-2.5 w-10 bg-white/10 rounded" />
        ))}
      </div>
    </div>
  );
}
