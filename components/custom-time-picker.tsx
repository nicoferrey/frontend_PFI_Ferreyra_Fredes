'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, Check } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // HH:mm format (e.g. "12:00" or "08:30")
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const QUICK_PRESETS = [
  { label: '06:00', value: '06:00' },
  { label: '08:00', value: '08:00' },
  { label: '10:00', value: '10:00' },
  { label: '12:00', value: '12:00' },
  { label: '14:00', value: '14:00' },
  { label: '16:00', value: '16:00' },
  { label: '18:00', value: '18:00' },
  { label: '20:00', value: '20:00' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export function CustomTimePicker({
  value,
  onChange,
  className = '',
  placeholder = 'Seleccionar hora',
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse HH and mm
  const [selectedHour, selectedMinute] = useMemo(() => {
    if (!value || !value.includes(':')) return ['12', '00'];
    const parts = value.split(':');
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return [h, m];
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format nice 12-hour display string for button (e.g., 08:30 a. m. / 02:00 p. m.)
  const formattedLabel = useMemo(() => {
    if (!value) return placeholder;
    const hNum = parseInt(selectedHour, 10);
    if (isNaN(hNum)) return value;

    const period = hNum >= 12 ? 'p. m.' : 'a. m.';
    const h12 = hNum % 12 === 0 ? 12 : hNum % 12;
    const h12Str = String(h12).padStart(2, '0');
    return `${h12Str}:${selectedMinute} ${period}`;
  }, [selectedHour, selectedMinute, value, placeholder]);

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${selectedMinute}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${selectedHour}:${m}`);
  };

  const handleSelectNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    onChange(`${hh}:${mm}`);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-3.5 shadow-sm transition-all duration-150 ${
          isOpen
            ? 'border-water-500 ring-2 ring-water-500/20'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Clock className="h-3.5 w-3.5 text-water-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900">{formattedLabel}</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider">
          {value || '12:00'}
        </span>
      </button>

      {/* Modern Popover Time Picker */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[200] w-[280px] rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 origin-top-left text-slate-900">
          
          {/* Header */}
          <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Clock className="h-3.5 w-3.5 text-water-600" />
              <span>Seleccionar Hora</span>
            </div>
            <span className="rounded-lg bg-water-50 border border-water-200/80 px-2 py-0.5 text-xs font-black text-water-700">
              {value}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Horarios Frecuentes</p>
            <div className="grid grid-cols-4 gap-1">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    onChange(preset.value);
                  }}
                  className={`rounded-lg py-1 text-[11px] font-extrabold transition ${
                    value === preset.value
                      ? 'bg-water-600 text-white shadow-xs'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hour & Minute Selectors */}
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
            {/* Hours Column */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hora (00-23)</p>
              <div className="h-32 overflow-y-auto pr-1 space-y-1 scrollbar-thin [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {HOURS.map((h) => {
                  const isSelected = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{h}:00</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Minutos</p>
              <div className="space-y-1">
                {MINUTES.map((m) => {
                  const isSelected = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? 'bg-water-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>:{m} min</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
            <button
              type="button"
              onClick={handleSelectNow}
              className="font-extrabold text-water-600 hover:text-water-700 transition"
            >
              Hora Actual
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
