import React from 'react';

/**
 * Bandwidth/Capacity utilization meter
 * Shows used vs total hours with color-coded progress bar
 * Color thresholds: red >90%, yellow >75%, blue >50%, green ≤50%
 */
export const BandwidthMeter = ({ used, total, label, compact = false }) => {
  const pct = Math.min((used / total) * 100, 100);

  // Color thresholds
  const getColor = () => {
    if (pct > 90) return '#FF5C5C'; // danger
    if (pct > 75) return '#F6C244'; // warn
    if (pct > 50) return '#5AA2FF'; // info
    return '#21C37A'; // success
  };

  const color = getColor();
  const remaining = Math.max(total - used, 0);

  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {/* Header: label and used/total */}
      <div className="flex justify-between items-baseline gap-3">
        <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {used.toFixed(1)}h <span className="text-text-subtle font-medium text-xs">/ {total}h</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-sm bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-[400ms] ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Footer: percentage and remaining hours */}
      <div className="flex justify-between gap-3 text-xs text-text-subtle font-medium">
        <span>{pct.toFixed(0)}% allocated</span>
        <span style={{ color: remaining < 2 ? '#FF5C5C' : undefined }}>
          {remaining.toFixed(1)}h available
        </span>
      </div>
    </div>
  );
};
