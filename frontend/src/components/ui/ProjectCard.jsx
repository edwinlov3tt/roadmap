import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Calendar, Clock, CheckCircle } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import { MilestoneProgressBar } from './MilestoneProgressBar';
import { GlassPanel } from './GlassPanel';
import { useReducedMotion, getMotionProps } from '../../hooks/useReducedMotion';
import { formatDate } from '../../constants/statusConfig';

export const ProjectCard = React.forwardRef(({ project, onClick, view = 'board' }, ref) => {
  const prefersReducedMotion = useReducedMotion();

  const handleCardClick = () => {
    onClick(project, null);
  };

  const handleMilestoneClick = (groupIndex) => {
    onClick(project, groupIndex);
  };

  return (
    <motion.div
      ref={ref}
      {...getMotionProps(prefersReducedMotion, {
        layout: true,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.2 },
      })}
    >
      <GlassPanel hover onClick={handleCardClick} className="h-full flex flex-col">
        <div className="p-4 flex flex-col gap-2.5 flex-1">
          {/* Row 1: Status + Priority (left) | Version + View Project (right) */}
          <div className="flex items-center justify-between gap-2 flex-wrap" style={{ rowGap: '6px' }}>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
              <StatusPill status={project.status} />
              {project.priority && project.priority !== 'none' && (
                <PriorityBadge priority={project.priority} />
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
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
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-zinc-300 px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all no-underline whitespace-nowrap"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Project
                </a>
              )}
            </div>
          </div>

          {/* Row 2: Title */}
          <h3 className="text-sm font-medium text-white m-0 leading-[22px] overflow-hidden text-ellipsis whitespace-nowrap">
            {project.name}
          </h3>

          {/* Row 3: Description (2-line clamp) */}
          <p className="text-[13px] text-zinc-300 leading-5 m-0 line-clamp-2">
            {project.description || 'No description available'}
          </p>

          {/* Row 4: Milestone Progress Bar */}
          {project.taskGroups && project.taskGroups.length > 0 && (
            <MilestoneProgressBar
              project={project}
              onMilestoneClick={handleMilestoneClick}
            />
          )}

          {/* Row 5: Date footer */}
          {(project.startDate || project.endDate) && (
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1.5 border-t border-white/[0.04] mt-auto">
              {project.startDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(project.startDate)}
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
      </GlassPanel>
    </motion.div>
  );
});
