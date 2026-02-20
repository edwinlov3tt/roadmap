import React from 'react';
import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const BlockedChip = ({ blockedBy, className }) => {
  return (
    <span className={clsx(
      'inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-micro',
      'bg-[#CF0E0F]/15 text-[#FF6B6B] border border-[#CF0E0F]/30',
      'font-medium',
      className
    )}>
      <AlertCircle className="size-3" />
      <span>BLOCKED BY • {blockedBy}</span>
    </span>
  );
};