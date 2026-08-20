import React, { ReactNode } from 'react';
import Link from 'next/link';

export interface HeaderButtonProps {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'crop' | 'outline';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function HeaderButton({
  href,
  onClick,
  icon,
  trailingIcon,
  children,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: HeaderButtonProps) {
  let variantStyles = '';
  let iconBoxStyles = '';
  let trailingStyles = '';

  if (variant === 'primary') {
    variantStyles =
      'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white shadow-md shadow-slate-900/15 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/25 active:scale-[0.98]';
    iconBoxStyles = 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950';
    trailingStyles = 'text-slate-400 group-hover:text-emerald-400';
  } else if (variant === 'crop') {
    variantStyles =
      'bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 text-white shadow-md shadow-crop-900/15 hover:scale-[1.02] hover:shadow-lg transition duration-200 active:scale-[0.98]';
    iconBoxStyles = 'bg-white/20 text-white group-hover:bg-white group-hover:text-crop-800';
    trailingStyles = 'text-white/80 group-hover:text-white';
  } else if (variant === 'secondary') {
    variantStyles =
      'bg-white text-slate-800 border border-slate-200/90 shadow-xs hover:bg-slate-50 hover:border-slate-300 hover:scale-[1.01] active:scale-[0.99]';
    iconBoxStyles = 'bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700';
    trailingStyles = 'text-slate-400 group-hover:text-slate-700';
  } else {
    variantStyles =
      'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-white hover:scale-[1.01] active:scale-[0.99]';
    iconBoxStyles = 'bg-slate-200/60 text-slate-600';
    trailingStyles = 'text-slate-400';
  }

  const content = (
    <>
      {icon && (
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-xl transition duration-200 ${iconBoxStyles}`}
        >
          {icon}
        </div>
      )}
      <span>{children}</span>
      {trailingIcon && (
        <div className={`transition-transform group-hover:translate-x-0.5 ${trailingStyles}`}>
          {trailingIcon}
        </div>
      )}
    </>
  );

  const baseClasses = `group relative inline-flex items-center justify-center gap-2.5 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${variantStyles} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={baseClasses}>
      {content}
    </button>
  );
}
