import React from 'react';
import { priorityConfig } from '../../constants/statusConfig';

export const PriorityBadge = ({ priority }) => {
  const cfg = priorityConfig[priority];
  if (!cfg) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: `${cfg.color}15`,
        border: `1px solid ${cfg.color}30`,
        color: cfg.color,
      }}
    >
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
};
