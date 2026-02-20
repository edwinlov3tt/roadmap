import React from 'react';
import { clsx } from 'clsx';

export const GlassPanel = ({ children, className, hover = false, onClick, ...props }) => {
  return (
    <div
      className={clsx(
        // True glassmorphism base
        'rounded-2xl bg-[#252529]/60 backdrop-blur-xl',
        'border border-white/[0.06]',
        'shadow-[0_8px_24px_rgba(0,0,0,0.25)]',
        // Inner highlight for premium feel - more subtle
        'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/[0.02] before:to-transparent before:pointer-events-none',
        'relative overflow-hidden',
        // Hover effects with smoother shadows
        hover && 'hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-all duration-200 cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};