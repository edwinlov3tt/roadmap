import React from 'react';

/**
 * Tab button for view switching
 * Shows active state with blue border and background
 */
export const TabBtn = ({ active, label, icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition-all duration-150
        ${active ? 'border-info/30 bg-info/10 text-info font-semibold' : 'border-transparent text-text-subtle font-medium hover:bg-white/5'}
      `}
      style={{ fontSize: '13px' }}
    >
      {icon}
      {label}
    </button>
  );
};
