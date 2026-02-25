import React from 'react';
import {
  statusConfig,
  buildProgressBlocks,
  buildPhaseProgressBlocks,
  getTotalTasks,
  getCompletedTasks,
  getPhaseTotalTasks,
  getPhaseCompletedTasks,
  getCurrentPhase,
} from '../../constants/statusConfig';

export const MilestoneProgressBar = ({ project, onMilestoneClick, compact, currentPhaseOnly }) => {
  // Use current-phase filtering if requested and there are tasks in this phase
  const phaseTotal = currentPhaseOnly ? getPhaseTotalTasks(project) : 0;
  const usePhase = currentPhaseOnly && phaseTotal > 0;

  const blocks = usePhase ? buildPhaseProgressBlocks(project) : buildProgressBlocks(project);
  const total = usePhase ? phaseTotal : getTotalTasks(project);
  const completed = usePhase ? getPhaseCompletedTasks(project) : getCompletedTasks(project);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const phase = usePhase ? getCurrentPhase(project) : null;

  // Dynamic task width: use flex to fill space, with min-width for visibility
  const taskCount = blocks.filter(b => b.type === 'task').length;
  const minTaskWidth = taskCount > 20 ? 6 : taskCount > 15 ? 8 : 12;

  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'} w-full`}>
      {/* Task count + percentage */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-zinc-500">
          {completed}/{total} tasks
        </span>
        {phase && (
          <span className="text-[10px] text-zinc-600 ml-1">
            {phase} phase
          </span>
        )}
        <span
          className="text-xs font-semibold"
          style={{ color: pct === 100 ? '#21C37A' : '#F7F8FA' }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress blocks */}
      <div className="flex items-center w-full">
        {blocks.map((block, i) => {
          if (block.type === 'cap') {
            const cfg = statusConfig[block.milestone];
            const clr = cfg?.color || '#8B91A0';
            return (
              <div key={`cap-${i}`} className="flex items-center flex-shrink-0 gap-1 pr-1.5">
                <div
                  className="w-[3px] h-4 rounded-sm"
                  style={{ backgroundColor: clr }}
                />
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: clr }}
                >
                  {block.milestone}
                </span>
              </div>
            );
          }

          if (block.type === 'divider') {
            const cfg = statusConfig[block.milestone];
            const clr = cfg?.color || '#8B91A0';
            const clickable = !!onMilestoneClick;
            return (
              <div
                key={`d-${i}`}
                onClick={clickable ? (e) => { e.stopPropagation(); onMilestoneClick(block.groupIndex); } : undefined}
                title={`→ ${block.milestone}`}
                className={`flex items-center flex-shrink-0 mx-1 gap-[3px] py-0.5 ${clickable ? 'cursor-pointer' : ''}`}
              >
                <div
                  className="w-[3px] h-4 rounded-sm transition-transform duration-150"
                  style={{ backgroundColor: clr }}
                />
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: clr }}
                >
                  {block.milestone}
                </span>
              </div>
            );
          }

          // Task rectangle
          return (
            <div
              key={`t-${i}`}
              onClick={onMilestoneClick ? (e) => { e.stopPropagation(); onMilestoneClick(block.groupIndex); } : undefined}
              className={`flex-1 h-2.5 mx-[0.5px] rounded-sm transition-colors duration-300 ${onMilestoneClick ? 'cursor-pointer' : ''}`}
              style={{
                backgroundColor: block.done ? block.color : 'rgba(255,255,255,0.06)',
                minWidth: `${minTaskWidth}px`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
