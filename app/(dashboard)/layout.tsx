"use client";

import React, { useState, useEffect } from 'react';
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
  MapPinned,
  X
} from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { DashboardProvider } from './context';
import { Logo } from '@/components/logo';
import { ProtectedRoute } from '@/components/auth-guard';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const renderNavContent = () => (
    <>
      <div>
        {/* Logo & Brand (Clickable link to Dashboard /) */}
        <Link href="/" className="group flex items-center gap-3.5 border-b border-slate-200/80 pb-5 cursor-pointer">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-crop-500 to-water-500 text-white shadow-lg shadow-crop-500/20 transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-crop-500/40 group-hover:rotate-3 animate-in fade-in zoom-in-75 duration-700">
            <Logo className="h-6 w-6 text-white transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-2xl font-black tracking-tight text-slate-950 leading-none font-sans">
              Agro<span className="bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 bg-clip-text text-transparent">MAS</span>
            </span>
            <p className="mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              PLATAFORMA INTELIGENTE
            </p>
          </div>
        </Link>

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
    </>
  );

  return (
    <ProtectedRoute>
      <DashboardProvider>
        <main className="min-h-screen bg-[linear-gradient(180deg,#f7f6f1_0%,#eef2eb_100%)] text-slate-900 overflow-x-hidden">
          {/* Mobile Overlay & Sidebar Drawer */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-[1000] xl:hidden">
              <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <aside className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col justify-between p-5 overflow-y-auto animate-in slide-in-from-left duration-300">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors z-50"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
                {renderNavContent()}
              </aside>
            </div>
          )}

          <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4 lg:p-6 w-full">
            
            {/* DESKTOP SIDEBAR NAVIGATION */}
            <aside className="hidden w-[280px] shrink-0 sticky top-4 lg:top-6 h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex-col rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur xl:flex justify-between overflow-y-auto">
              {renderNavContent()}
            </aside>

            {/* MAIN CONTENT AREA */}
            <section className="flex min-w-0 flex-1 flex-col gap-6">
              
              {/* Top Bar with dynamic Breadcrumbs & Mobile Toggle */}
              <Topbar 
                breadcrumbs={[
                  { label: 'Inicio', href: '/' },
                  { label: breadcrumbLabels[pathname] || 'Dashboard', active: true }
                ]}
                showSidebarToggle={true}
                onToggleSidebar={() => setIsMobileMenuOpen(true)}
              />

              {children}
            </section>

          </div>
        </main>
      </DashboardProvider>
    </ProtectedRoute>
  );
}
