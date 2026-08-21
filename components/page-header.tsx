import React, { ReactNode } from 'react';

export interface PageHeaderProps {
  badge?: string;
  title: string;
  titleAccent?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function PageHeader({
  badge,
  title,
  titleAccent,
  description,
  action,
  children,
  className = '',
  icon,
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header Card with Organic Green Background Waves */}
      <div className="relative z-10 rounded-[28px] border border-white/80 bg-gradient-to-r from-white/95 via-white/90 to-emerald-50/20 p-6 shadow-soft backdrop-blur-md">
        {/* Organic Layered Wave Curves in Background (Isolated overflow-hidden) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] select-none">
          <div className="absolute inset-y-0 right-0 w-full md:w-3/4 lg:w-3/5">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="h-full w-full opacity-80">
              <path
                d="M100,200 C250,150 350,180 600,60 L600,200 Z"
                fill="rgba(16, 185, 129, 0.05)"
              />
              <path
                d="M200,200 C320,110 440,160 600,30 L600,200 Z"
                fill="rgba(52, 211, 153, 0.09)"
              />
              <path
                d="M320,200 C420,80 500,120 600,10 L600,200 Z"
                fill="rgba(16, 185, 129, 0.12)"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-crop-600 via-emerald-600 to-water-600 text-white shadow-md">
                {icon}
              </div>
            )}
            <div className="space-y-1.5">
              {/* Badge */}
              {badge && (
                <div className="inline-flex items-center rounded-md border border-crop-600/20 bg-crop-50/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-crop-800 backdrop-blur-sm">
                  {badge}
                </div>
              )}

              {/* Title */}
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {title}
                {titleAccent && (
                  <>
                    {' '}
                    <span className="bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 bg-clip-text text-transparent">
                      {titleAccent}
                    </span>
                  </>
                )}
              </h2>

              {/* Optional description */}
              {description && (
                <p className="text-xs font-medium text-slate-500 max-w-xl leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Action controls slot */}
          {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
        </div>
      </div>

      {/* Separate Children Box (e.g. Filters / Lot Selectors) without green background waves */}
      {children && (
        <div className="relative z-10 rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur">
          {children}
        </div>
      )}
    </div>
  );
}
