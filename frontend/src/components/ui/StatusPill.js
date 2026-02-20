import React from 'react';
import { clsx } from 'clsx';

const statusConfig = {
  'Live': {
    color: '#21C37A',
    label: 'Live',
    dotted: false
  },
  'In Beta Testing': {
    color: '#5AA2FF',
    label: 'In Beta',
    dotted: false
  },
  'In Development': {
    color: '#F6C244',
    label: 'In Dev',
    dotted: false
  },
  'In Planning': {
    color: '#CF0E0F', // Red for planning phase
    label: 'In Planning',
    dotted: false
  },
  'Requested': {
    color: '#6B7280', // Gray for requested
    label: 'Requested',
    dotted: true
  }
};

export const StatusPill = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig['In Development'];

  return (
    <span className={clsx(
      'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-micro',
      'bg-white/5',
      config.dotted ? 'border border-dashed border-zinc-500' : 'border border-white/10',
      className
    )}>
      <span
        className={clsx(
          'size-2.5 rounded-full',
          config.dotted && 'border border-dashed border-zinc-400 bg-transparent'
        )}
        style={config.dotted ? {} : {
          backgroundColor: config.color,
          filter: `drop-shadow(0 0 6px ${config.color})`
        }}
      />
      <span className="text-white">{config.label}</span>
    </span>
  );
};