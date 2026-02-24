import React from 'react';

/**
 * Navigation arrow button for week navigation
 * Direction: 'left' or 'right'
 */
export const NavArrow = ({ direction, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-[30px] h-[30px] rounded-lg border border-stroke-outer bg-transparent text-text-subtle cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-white/5 hover:text-text-hi"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === 'left' ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 6 15 12 9 18" />
        )}
      </svg>
    </button>
  );
};
