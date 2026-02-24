import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { ProjectCard } from '../ui/ProjectCard';
import { GlassPanel } from '../ui/GlassPanel';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const statusColumns = [
  { id: 'Live', label: 'Live', color: '#90E35E' },
  { id: 'In Beta Testing', label: 'Beta', color: '#D14B06' },
  { id: 'In Development', label: 'Dev', color: '#5AA2FF' },
  { id: 'In Planning', label: 'Planning', color: '#F6C244' },
  { id: 'Requested', label: 'Requested', color: '#8B91A0', dotted: true }
];

export const BoardView = React.memo(({ projects, onProjectClick }) => {
  const prefersReducedMotion = useReducedMotion();

  // Group projects by status
  const projectsByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = projects.filter(p => p.status === column.id);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Board Columns */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="w-full h-full overflow-hidden">
          <motion.div
            id="boardScroller"
            className="gap-6 min-w-0 h-full grid grid-flow-col auto-cols-[minmax(380px,1fr)] overflow-x-auto snap-x snap-mandatory pl-1 pr-6"
            layout
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <AnimatePresence mode="popLayout">
              {statusColumns.map((column) => {
                const columnProjects = projectsByStatus[column.id] || [];

                return (
                  <motion.section
                    key={column.id}
                    data-status={column.id}
                    className="flex flex-col h-full snap-start min-w-[380px]"
                    initial={{ opacity: 0, scale: 0.95, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -50 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    layout
                  >
                      {/* Column Header */}
                      <header className="sticky top-0 z-10 bg-transparent backdrop-blur-sm pt-2 -mt-2 overflow-visible mb-6 pb-4">
                        <div className="flex items-center gap-3 mb-4">
                          <span
                            className={clsx(
                              "size-2.5 rounded-full",
                              column.dotted && "border border-dashed border-zinc-400 bg-transparent"
                            )}
                            style={column.dotted ? {} : {
                              backgroundColor: column.color,
                              filter: `drop-shadow(0 0 6px ${column.color})`
                            }}
                          />
                          <h2 className="text-zinc-200 font-medium flex-1">
                            {column.label}
                          </h2>
                          <span className="text-zinc-400 text-small">
                            {columnProjects.length}
                          </span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          {prefersReducedMotion ? (
                            <div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: column.color,
                                width: projects.length > 0
                                  ? `${(columnProjects.length / projects.length) * 100}%`
                                  : '0%'
                              }}
                            />
                          ) : (
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: column.color }}
                              initial={{ width: 0 }}
                              animate={{
                                width: projects.length > 0
                                  ? `${(columnProjects.length / projects.length) * 100}%`
                                  : '0%'
                              }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          )}
                        </div>
                      </header>

                    {/* Column Cards */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 space-y-4">
                      <AnimatePresence mode="popLayout">
                        {columnProjects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            onClick={onProjectClick}
                            view="board"
                          />
                        ))}
                      </AnimatePresence>

                      {columnProjects.length === 0 && (
                        <GlassPanel className="p-8 text-center">
                          <p className="text-zinc-400 text-small">
                            No {column.label.toLowerCase()} projects
                          </p>
                        </GlassPanel>
                      )}
                    </div>
                    </motion.section>
                  );
                })}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
});
