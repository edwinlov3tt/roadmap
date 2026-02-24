import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { statusConfig, getGroupCompleted } from '../../constants/statusConfig';

export const TaskGroup = ({ group, isOpen, onToggle, onTaskToggle, groupRef }) => {
  const completed = getGroupCompleted(group);
  const total = group.tasks.length;
  const milestoneColor = statusConfig[group.milestone]?.color || '#8B91A0';

  return (
    <div ref={groupRef} className="mb-1">
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-2.5 px-3 rounded-[10px] border transition-all duration-150 cursor-pointer font-inherit text-inherit ${
          isOpen
            ? 'border-white/[0.08] bg-white/[0.03]'
            : 'border-white/[0.04] bg-transparent hover:bg-white/[0.02]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <CircularProgress completed={completed} total={total} size={26} strokeWidth={2.5} />
          <span className="text-[13px] font-medium text-white">{group.name}</span>
          <span
            className="text-[9px] font-semibold uppercase tracking-wide rounded-full px-[7px] py-[1px]"
            style={{
              color: milestoneColor,
              backgroundColor: `${milestoneColor}12`,
              border: `1px solid ${milestoneColor}25`,
            }}
          >
            → {group.milestone}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 tabular-nums">
            {completed}/{total}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Tasks */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-12 pt-1.5 pb-2">
              {group.tasks.map((task, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 py-[5px] px-2 rounded-md hover:bg-white/[0.03] transition-colors duration-100"
                >
                  <div
                    onClick={onTaskToggle ? (e) => { e.stopPropagation(); onTaskToggle(i); } : undefined}
                    className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${onTaskToggle ? 'cursor-pointer hover:ring-1 hover:ring-white/20' : ''}`}
                    style={{
                      backgroundColor: task.done ? milestoneColor : 'transparent',
                      border: task.done ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    {task.done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[13px] leading-5 ${
                      task.done ? 'text-zinc-500 line-through opacity-50' : 'text-zinc-300'
                    }`}
                  >
                    {task.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
