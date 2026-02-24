import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export const KPIChip = ({ label, value, tone, onClick, active = false }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'kpi-chip cursor-pointer',
        active && 'ring-2 ring-accent ring-offset-2 ring-offset-base'
      )}
      onClick={onClick}
    >
      <div className={clsx(
        'kpi-value',
        tone === 'accent' && 'text-accent',
        tone === 'success' && 'text-success',
        tone === 'warn' && 'text-warn',
        tone === 'info' && 'text-info'
      )}>
        {value}
      </div>
      <div className="kpi-label">{label}</div>
    </motion.div>
  );
};