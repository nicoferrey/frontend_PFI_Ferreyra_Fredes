"use client";

import React from 'react';
import { Bot } from 'lucide-react';

export default function DashboardAssistantPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-crop-700">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Asistente Inteligente MAS (Multi-Agent System)</h2>
            <p className="text-xs text-slate-500">Agente autónomo de riego y optimización energética para agricultura de precisión.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="text-xs font-bold text-crop-700 uppercase">Agente FAO-56</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">Balance Hídrico Dinámico</p>
            <p className="mt-2 text-xs text-slate-500">Calcula Dr, AU y AFD integrando Kc satelital con ET0 de estaciones locales.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="text-xs font-bold text-water-700 uppercase">Agente Sentinel-2</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">NDVI & Vigor Vegetativo</p>
            <p className="mt-2 text-xs text-slate-500">Procesa imágenes multiespectrales cada 5 días para ajuste del coeficiente de cultivo.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className="text-xs font-bold text-amber-700 uppercase">Agente de Bombeo</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">Tarifa Eléctrica & Eficiencia</p>
            <p className="mt-2 text-xs text-slate-500">Programa ventanas de riego nocturnas (01:00 a 07:00 hs) para reducir costo energético.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
