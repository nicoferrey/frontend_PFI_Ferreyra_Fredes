'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  icon = <Layers className="h-3.5 w-3.5 text-crop-600" />,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-3.5 shadow-sm transition-all duration-150 ${
          isOpen
            ? 'border-crop-500 ring-2 ring-crop-500/20'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {icon}
          <span className="truncate text-xs font-bold text-slate-800">
            {selectedOption ? (
              <>
                {selectedOption.label}
                {selectedOption.sublabel && (
                  <span className="ml-1.5 font-normal text-slate-400">
                    ({selectedOption.sublabel})
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-crop-600' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] max-h-60 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 origin-top">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-crop-50 text-crop-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-[11px] font-normal text-slate-400 truncate">
                      {option.sublabel}
                    </span>
                  )}
                </div>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-crop-600 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
