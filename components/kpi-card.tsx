'use client';

import React, { ReactNode } from 'react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: ReactNode;
  icon: ReactNode;
  iconBgColor?: string; // e.g. "bg-water-50 text-water-600 border border-water-200/60"
  badge?: ReactNode;
  className?: string;
}

export function KpiCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  iconBgColor = 'bg-water-50 text-water-600 border border-water-200/60',
  badge,
  className = '',
}: KpiCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-soft text-slate-900 flex items-center justify-between gap-4 ${className}`}
    >
      {/* Subtle Ambient Background Tint Glow */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-slate-100/60 blur-xl" />

      {/* Main Content (Left Area) */}
      <div className="flex-1 min-w-0">
        {/* Header: Title */}
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
            {title}
          </p>
          {badge}
        </div>

        {/* Hero Value & Unit */}
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-black tracking-tight text-slate-950 font-sans leading-none">
            {value}
          </span>
          {unit && (
            <span className="rounded-lg bg-slate-100/90 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">
              {unit}
            </span>
          )}
        </div>

        {/* Subtitle / Contextual Note */}
        {subtitle && (
          <p className="mt-2 text-xs font-semibold text-slate-500 leading-tight truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Area: Creative Integrated Hero Icon Badge */}
      <div
        className={`relative z-10 flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl shadow-2xs transition-transform duration-200 ${iconBgColor}`}
      >
        {icon}
      </div>
    </div>
  );
}
