'use client';

import React from 'react';
import { ModalPortal } from '@/components/modal-portal';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Trash2,
  X
} from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'error';

export interface CustomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string | React.ReactNode;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  isLoading?: boolean;
  isConfirm?: boolean;
}

export function CustomDialog({
  isOpen,
  onClose,
  title,
  description,
  variant = 'info',
  confirmText,
  cancelText = 'Cancelar',
  onConfirm,
  isLoading = false,
  isConfirm = false,
}: CustomDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="h-6 w-6 text-rose-600" />,
          iconBg: 'bg-rose-100 ring-4 ring-rose-50',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
          defaultConfirmText: 'Eliminar',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
          iconBg: 'bg-amber-100 ring-4 ring-amber-50',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
          defaultConfirmText: 'Continuar',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-6 w-6 text-rose-600" />,
          iconBg: 'bg-rose-100 ring-4 ring-rose-50',
          confirmBtn: 'bg-slate-900 hover:bg-slate-800 text-white',
          defaultConfirmText: 'Entendido',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
          iconBg: 'bg-emerald-100 ring-4 ring-emerald-50',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
          defaultConfirmText: 'Aceptar',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-6 w-6 text-sky-600" />,
          iconBg: 'bg-sky-100 ring-4 ring-sky-50',
          confirmBtn: 'bg-slate-900 hover:bg-slate-800 text-white',
          defaultConfirmText: 'Aceptar',
        };
    }
  };

  const style = getVariantStyles();
  const effectiveConfirmText = confirmText || style.defaultConfirmText;

  const handleConfirmClick = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-2xl animate-scale-in text-slate-900">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBg} transition-transform`}>
            {style.icon}
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              {title}
            </h3>
            <div className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              {typeof description === 'string' ? (
                <p>{description}</p>
              ) : (
                description
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition -mr-1 -mt-1"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          {isConfirm && (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={isConfirm ? handleConfirmClick : onClose}
            disabled={isLoading}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold shadow-md transition duration-150 disabled:opacity-50 ${style.confirmBtn}`}
          >
            {isLoading ? 'Procesando...' : effectiveConfirmText}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
