'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
}

export function ModalPortal({ isOpen, onClose, children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Escape' || e.key === 'Esc') && onClose) {
          e.stopPropagation();
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in outline-none"
    >
      {children}
    </div>,
    document.body
  );
}
