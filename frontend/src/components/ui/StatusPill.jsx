import React from 'react';
import { clsx } from 'clsx';
import { getStatusConfig, normalizeStatus } from '../../constants/statusConfig';

export const StatusPill = ({ status, className }) => {
  const config = getStatusConfig(status);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs',
        config.dotted ? 'border border-dashed border-zinc-500' : 'border',
        className
      )}
      style={{
        backgroundColor: config.bg,
        borderColor: config.dotted ? undefined : config.border,
      }}
    >
      <span
        className={clsx(
          'w-2 h-2 rounded-full flex-shrink-0',
          config.dotted && 'border border-dashed border-zinc-400 bg-transparent'
        )}
        style={config.dotted ? {} : {
          backgroundColor: config.color,
          filter: `drop-shadow(0 0 6px ${config.color})`
        }}
      />
      <span style={{ color: config.color, fontWeight: 500 }}>{config.label}</span>
    </span>
  );
};
