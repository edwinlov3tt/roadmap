import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronDown, X } from 'lucide-react';
import { ProjectCard } from '../ui/ProjectCard';
import { KPIChip } from '../ui/KPIChip';
import { GlassPanel } from '../ui/GlassPanel';
import { clsx } from 'clsx';
import { useReducedMotion, getMotionProps } from '../../hooks/useReducedMotion';

const statusColumns = [
  { id: 'Live', label: 'Live', color: '#21C37A' },
  { id: 'In Beta Testing', label: 'In Beta', color: '#5AA2FF' },
  { id: 'In Development', label: 'In Development', color: '#F6C244' },
  { id: 'In Planning', label: 'In Planning', color: '#CF0E0F' },
  { id: 'Requested', label: 'Requested', color: '#6B7280', dotted: true }
];

export const BoardView = ({ projects, onProjectClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState(projects);
  const [focusedStatus, setFocusedStatus] = useState(null);
  const prefersReducedMotion = useReducedMotion();

  // Calculate KPIs
  const kpis = {
    live: projects.filter(p => p.status === 'Live').length,
    beta: projects.filter(p => p.status === 'In Beta Testing').length,
    dev: projects.filter(p => p.status === 'In Development').length,
    planning: projects.filter(p => p.status === 'In Planning').length,
    requested: projects.filter(p => p.status === 'Requested').length
  };

  // Filter projects
  useEffect(() => {
    let filtered = [...projects];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(p => p.fider_tag_name === selectedTag);
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, selectedTag]);

  // Group projects by status
  const projectsByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = filteredProjects.filter(p => p.status === column.id);
    return acc;
  }, {});

  // Focus status function for KPI chip clicks - toggles focus mode
  const focusStatus = (status) => {
    if (focusedStatus === status) {
      // If already focused on this status, clear focus
      setFocusedStatus(null);
    } else {
      // Focus on this status
      setFocusedStatus(status);
    }
    setSelectedTag(null); // Clear tag filter
    setSearchTerm(''); // Clear search
  };

  return (
    <div className="h-screen flex flex-col bg-base">
      {/* Compact Toolbar */}
      <div className="border-b border-stroke-outer bg-elevation-1">
        <div className="h-16 flex items-center justify-between px-6">
          {/* Title - Left 22px */}
          <div className="pl-4">
            <h1 className="text-h2 font-semibold text-text-hi">Project Roadmap</h1>
          </div>

          {/* Right Side - Search + KPI Chips */}
          <div className="flex items-center gap-4">
            {/* KPI Strip as Small Glass Chips */}
            <div className="flex items-center gap-2">
              {focusedStatus && (
                <button
                  onClick={() => setFocusedStatus(null)}
                  className="glass-panel px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer border border-white/20"
                >
                  <X className="size-3 text-text-muted" />
                  <span className="text-micro text-text-subtle">Clear</span>
                </button>
              )}
              <button
                onClick={() => focusStatus('Live')}
                className={clsx(
                  "glass-panel px-3 py-1.5 flex items-center gap-2 transition-all duration-200 cursor-pointer",
                  focusedStatus === 'Live'
                    ? "ring-2 ring-success/50 bg-success/10"
                    : focusedStatus
                      ? "opacity-40 hover:opacity-70"
                      : "hover:bg-white/10"
                )}
              >
                <span className="size-2 rounded-full bg-success"></span>
                <span className="text-small font-medium text-text-hi">{kpis.live}</span>
                <span className="text-micro text-text-subtle uppercase tracking-wider">Live</span>
              </button>
              <button
                onClick={() => focusStatus('In Beta Testing')}
                className={clsx(
                  "glass-panel px-3 py-1.5 flex items-center gap-2 transition-all duration-200 cursor-pointer",
                  focusedStatus === 'In Beta Testing'
                    ? "ring-2 ring-info/50 bg-info/10"
                    : focusedStatus
                      ? "opacity-40 hover:opacity-70"
                      : "hover:bg-white/10"
                )}
              >
                <span className="size-2 rounded-full bg-info"></span>
                <span className="text-small font-medium text-text-hi">{kpis.beta}</span>
                <span className="text-micro text-text-subtle uppercase tracking-wider">Beta</span>
              </button>
              <button
                onClick={() => focusStatus('In Development')}
                className={clsx(
                  "glass-panel px-3 py-1.5 flex items-center gap-2 transition-all duration-200 cursor-pointer",
                  focusedStatus === 'In Development'
                    ? "ring-2 ring-warn/50 bg-warn/10"
                    : focusedStatus
                      ? "opacity-40 hover:opacity-70"
                      : "hover:bg-white/10"
                )}
              >
                <span className="size-2 rounded-full bg-warn"></span>
                <span className="text-small font-medium text-text-hi">{kpis.dev}</span>
                <span className="text-micro text-text-subtle uppercase tracking-wider">Dev</span>
              </button>
              <button
                onClick={() => focusStatus('In Planning')}
                className={clsx(
                  "glass-panel px-3 py-1.5 flex items-center gap-2 transition-all duration-200 cursor-pointer",
                  focusedStatus === 'In Planning'
                    ? "ring-2 ring-accent/50 bg-accent/10"
                    : focusedStatus
                      ? "opacity-40 hover:opacity-70"
                      : "hover:bg-white/10"
                )}
              >
                <span className="size-2 rounded-full bg-accent"></span>
                <span className="text-small font-medium text-text-hi">{kpis.planning}</span>
                <span className="text-micro text-text-subtle uppercase tracking-wider">Planning</span>
              </button>
              <button
                onClick={() => focusStatus('Requested')}
                className={clsx(
                  "glass-panel px-3 py-1.5 flex items-center gap-2 transition-all duration-200 cursor-pointer",
                  focusedStatus === 'Requested'
                    ? "ring-2 ring-zinc-500/50 bg-zinc-500/10"
                    : focusedStatus
                      ? "opacity-40 hover:opacity-70"
                      : "hover:bg-white/10"
                )}
              >
                <span className="size-2 rounded-full border border-dashed border-zinc-400"></span>
                <span className="text-small font-medium text-text-hi">{kpis.requested}</span>
                <span className="text-micro text-text-subtle uppercase tracking-wider">Requested</span>
              </button>
            </div>

            {/* Search - Right 420px width */}
            <div className="flex items-center gap-3">
              <div className="w-[420px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-glass pl-10 w-full"
                />
              </div>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="px-3 py-2 rounded-sm glass-panel text-text-muted hover:text-text-hi flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="text-small">Tag: {selectedTag}</span>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex-1 overflow-hidden pt-8 pl-6 md:pt-10 md:pl-8">
        <div className="w-full h-full overflow-hidden">
          <motion.div
            id="boardScroller"
            className={clsx(
              "gap-7 min-w-0 h-full pb-6 pr-6",
              focusedStatus
                ? "flex justify-center items-start"
                : "grid grid-flow-col auto-cols-[minmax(420px,1fr)] overflow-x-auto snap-x snap-mandatory"
            )}
            layout
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <AnimatePresence mode="popLayout">
              {statusColumns
                .filter(column => !focusedStatus || column.id === focusedStatus)
                .map((column) => {
                  const columnProjects = projectsByStatus[column.id] || [];
                  const isFocused = focusedStatus === column.id;

                  return (
                    <motion.section
                      key={column.id}
                      data-status={column.id}
                      className={clsx(
                        "flex flex-col h-full snap-start",
                        isFocused ? "w-full max-w-2xl" : "min-w-[420px]"
                      )}
                      initial={{ opacity: 0, scale: 0.95, x: 50 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -50 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      layout
                    >
                      {/* Sticky Column Header */}
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
                        {/* Progress indicator */}
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
                      <div className={clsx(
                        "flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0",
                        isFocused ? "grid grid-cols-1 md:grid-cols-2 gap-4 content-start" : "space-y-4"
                      )}>
                        <AnimatePresence mode="popLayout">
                          {columnProjects.map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              onClick={() => onProjectClick(project)}
                              view="board"
                            />
                          ))}
                        </AnimatePresence>

                        {/* Empty State */}
                        {columnProjects.length === 0 && (
                          <GlassPanel className={clsx("p-8 text-center", isFocused && "md:col-span-2")}>
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
};