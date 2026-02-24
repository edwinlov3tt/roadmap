import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Calendar, Clock, CheckCircle } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import { MilestoneProgressBar } from './MilestoneProgressBar';
import { TaskGroup } from './TaskGroup';
import { getStatusConfig, getTotalTasks, getCompletedTasks, formatDate } from '../../constants/statusConfig';

export const ProjectModal = ({ project, onClose, initialGroupIndex }) => {
  const [openGroups, setOpenGroups] = useState({});
  const groupRefs = useRef({});
  const scrollRef = useRef(null);
  const hasScrolled = useRef(false);

  // Reset state when project changes
  useEffect(() => {
    if (!project) {
      hasScrolled.current = false;
      return;
    }
    const initial = {};
    if (project.taskGroups) {
      project.taskGroups.forEach((_, i) => {
        initial[i] = initialGroupIndex != null ? i === initialGroupIndex : false;
      });
    }
    setOpenGroups(initial);
    hasScrolled.current = false;
  }, [project, initialGroupIndex]);

  // Scroll to target group
  useEffect(() => {
    if (initialGroupIndex != null && !hasScrolled.current && groupRefs.current[initialGroupIndex] && scrollRef.current) {
      setTimeout(() => {
        const el = groupRefs.current[initialGroupIndex];
        if (el && scrollRef.current) {
          scrollRef.current.scrollTo({
            top: el.offsetTop - scrollRef.current.offsetTop - 8,
            behavior: 'smooth',
          });
          hasScrolled.current = true;
        }
      }, 150);
    }
  }, [openGroups, initialGroupIndex]);

  if (!project) return null;

  const total = getTotalTasks(project);
  const completed = getCompletedTasks(project);
  const cfg = getStatusConfig(project.status);
  const statusColor = cfg.color;

  const toggleGroup = (idx) => {
    setOpenGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const allOpen = project.taskGroups && Object.values(openGroups).length > 0 && Object.values(openGroups).every(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[600px] max-h-[88vh] flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08]"
        style={{
          backgroundColor: 'rgba(37,37,41,0.95)',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}
      >
        {/* Colored top line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent 5%, ${statusColor} 50%, transparent 95%)`,
          }}
        />

        {/* ─── Fixed Header ─── */}
        <div className="p-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg border border-white/[0.08] bg-white/5 text-zinc-500 flex items-center justify-center text-sm hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            ✕
          </button>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <StatusPill status={project.status} />
            {project.priority && project.priority !== 'none' && (
              <PriorityBadge priority={project.priority} />
            )}
            {project.current_version && (
              <span className="text-xs text-zinc-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                v{project.current_version}
              </span>
            )}
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-300 px-2.5 py-[3px] rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all no-underline whitespace-nowrap"
              >
                <ExternalLink className="w-3 h-3" />
                View Project
              </a>
            )}
          </div>

          {/* Title + description */}
          <h2 className="text-xl font-semibold text-white mb-1.5 leading-7">{project.name}</h2>
          <p className="text-[13px] text-zinc-300 leading-5 mb-3.5">{project.description}</p>

          {/* Progress bar */}
          {project.taskGroups && project.taskGroups.length > 0 && (
            <MilestoneProgressBar project={project} />
          )}

          {/* Date footer */}
          {(project.startDate || project.endDate) && (
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-3 pt-2.5 border-t border-white/[0.04]">
              {project.startDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Start: {formatDate(project.startDate)}
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center gap-1">
                  {project.status === 'Live' ? (
                    <CheckCircle className="w-3 h-3 text-[#21C37A]" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  <span style={{ color: project.status === 'Live' ? '#21C37A' : undefined }}>
                    {project.dateLabel}: {formatDate(project.endDate)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Scrollable Task Groups ─── */}
        {project.taskGroups && project.taskGroups.length > 0 && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 px-6 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Task Breakdown
              </span>
              <button
                onClick={() => {
                  const next = {};
                  project.taskGroups.forEach((_, i) => { next[i] = !allOpen; });
                  setOpenGroups(next);
                }}
                className="text-[11px] text-zinc-500 bg-transparent border border-white/[0.06] rounded-md px-2 py-[3px] cursor-pointer hover:border-white/15 hover:text-zinc-300 transition-all"
              >
                {allOpen ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {project.taskGroups.map((group, i) => (
              <TaskGroup
                key={i}
                group={group}
                isOpen={!!openGroups[i]}
                onToggle={() => toggleGroup(i)}
                groupRef={(el) => { groupRefs.current[i] = el; }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
