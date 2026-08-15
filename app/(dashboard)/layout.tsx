"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Map,
  History,
  Bot,
  Settings,
  Sprout,
  ChevronRight,
  MapPinned
} from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { DashboardProvider } from './context';

const navigationItems = [
  { label: 'Inicio / Dashboard', icon: Home, href: '/' },
  { label: 'Mapa de Lotes', icon: Map, href: '/map' },
  { label: 'Historial y Reportes', icon: History, href: '/history' },
  { label: 'Asistente IA', icon: Bot, badge: 'MAS', href: '/assistant' },
  { label: 'Configuración', icon: Settings, href: '/settings' },
];

const breadcrumbLabels: Record<string, string> = {
  '/': 'Inicio / Dashboard',
  '/map': 'Mapa de Lotes',
  '/history': 'Historial y Reportes',
  '/assistant': 'Asistente IA',
  '/settings': 'Configuración',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardProvider>
      <main className="min-h-screen bg-[linear-gradient(180deg,#f7f6f1_0%,#eef2eb_100%)] text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4 lg:p-6">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="hidden w-[280px] shrink-0 sticky top-4 lg:top-6 h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex-col rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur xl:flex justify-between overflow-y-auto">
            <div>
              
              {/* Logo & Brand */}
              <div className="flex items-center gap-3 border-b border-slate-200/80 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-crop-500 to-water-500 text-white shadow-lg shadow-crop-500/20">
                  <Sprout className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">AgroMAS</p>
                  <h1 className="text-lg font-semibold text-slate-950">Gestión inteligente</h1>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="mt-6 space-y-1.5">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-crop-50 text-crop-800 font-bold shadow-sm ring-1 ring-crop-200 dark:bg-crop-950 dark:text-crop-300'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-crop-600' : 'text-slate-400 group-hover:text-slate-700'}`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight className="h-4 w-4 text-crop-600" />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>

              {/* Wizard Link */}
              <div className="mt-6 pt-4 border-t border-slate-200/80 space-y-2">
                <Link 
                  href="/onboarding" 
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 text-white rounded-2xl py-3 px-4 text-xs font-bold shadow-md hover:shadow-lg transition duration-200"
                >
                  <MapPinned className="h-4 w-4" />
                  Configurar Campo (Wizard)
                </Link>
              </div>
            </div>

            {/* System Status */}
            <div className="space-y-3 pt-4 border-t border-slate-200/80">
              <div className="rounded-[24px] bg-slate-950 p-4 text-white shadow-lg">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-semibold">Estado del sistema</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Sentinel-2 MSI</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">Activo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Balance FAO-56</span>
                    <span className="rounded-full bg-water-500/15 px-2 py-0.5 text-[10px] text-water-300">Calibrado</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Agente de Riego</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">Monitoreando</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <section className="flex min-w-0 flex-1 flex-col gap-6">
            
            {/* Top Bar with dynamic Breadcrumbs */}
            <Topbar 
              breadcrumbs={[
                { label: 'Inicio', href: '/' },
                { label: breadcrumbLabels[pathname] || 'Dashboard', active: true }
              ]}
            />

            {children}
          </section>

        </div>
      </main>
    </DashboardProvider>
  );
}
