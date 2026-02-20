import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ExternalLink, Clock } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { BlockedChip } from './BlockedChip';
import { GlassPanel } from './GlassPanel';
import { clsx } from 'clsx';
import { useReducedMotion, getMotionProps } from '../../hooks/useReducedMotion';

export const ProjectCard = ({
  project,
  onClick,
  view = 'board'
}) => {
  const prefersReducedMotion = useReducedMotion();
  // Only show image if explicitly provided and not empty
  const hasImage = project.images && project.images.length > 0 && project.images[0]?.src;
  const primaryImage = hasImage ? project.images[0] : null;

  // Debug logging
  if (project.name === "Geo Coder") {
    console.log("Geo Coder project:", project);
    console.log("Has image?", hasImage);
    console.log("Primary image:", primaryImage);
  }

  // Check if project is blocked (using next_steps structure)
  const blockedStep = Array.isArray(project.next_steps)
    ? project.next_steps.find(step => step.blocking)
    : null;

  const nextStep = Array.isArray(project.next_steps) && project.next_steps.length > 0
    ? (project.next_steps.find(step => !step.blocking) || project.next_steps[0])
    : typeof project.next_steps === 'string'
      ? project.next_steps
      : null;

  return (
    <motion.div
      {...getMotionProps(prefersReducedMotion, {
        layout: true,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.2 }
      })}
    >
      <GlassPanel
        hover
        onClick={onClick}
        className="h-full flex flex-col"
      >
        {/* Optional compact image chip */}
        {primaryImage && (
          <div className="relative h-40 overflow-hidden rounded-t-2xl">
            <img
              src={primaryImage.src}
              alt={primaryImage.alt || project.name}
              className="w-full h-full object-cover opacity-90"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40" />
          </div>
        )}

        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Header: Title + Status, Version right */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-small font-medium text-white line-clamp-1 flex-1">
              {project.name}
            </h3>
            {project.current_version && (
              <span className="text-micro text-zinc-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 flex-shrink-0">
                v{project.current_version}
              </span>
            )}
          </div>

          {/* Status + Fider tag row (inline with divider) */}
          <div className="flex items-center gap-2">
            {/* Status pill (left) */}
            <StatusPill status={project.status} />

            {/* Divider */}
            {project.fider_tag_name && (
              <span className="h-4 w-px bg-white/10 mx-1"></span>
            )}

            {/* Fider tag (right) */}
            {project.fider_tag_name && (
              <a
                href={`https://feedback.edwinlovett.com/?tags=${project.fider_tag_name.toLowerCase().replace(/\s+/g, '-')}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor: `#${project.fider_tag_color}15`,
                  borderColor: `#${project.fider_tag_color}30`,
                  color: `#${project.fider_tag_color}`,
                  border: `1px solid #${project.fider_tag_color}30`
                }}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: `#${project.fider_tag_color}`,
                    filter: `drop-shadow(0 0 4px #${project.fider_tag_color})`
                  }}
                />
                {project.fider_tag_name}
              </a>
            )}

            {/* Blocked chip */}
            {blockedStep && (
              <>
                <span className="h-4 w-px bg-white/10 mx-1"></span>
                <BlockedChip
                  blockedBy={typeof blockedStep === 'object' ? blockedStep.title : blockedStep}
                />
              </>
            )}
          </div>

          {/* Purpose (main focus) */}
          <p className="text-small text-zinc-300 line-clamp-3 leading-relaxed">
            {project.description || 'No description available'}
          </p>

          {/* Next Step (focal callout) */}
          {nextStep && (
            <button
              className="group flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClick(project);
              }}
            >
              <span className="text-small text-zinc-200 line-clamp-1">
                Next: {typeof nextStep === 'object' ? nextStep.title : nextStep}
              </span>
              <ChevronRight className="size-4 text-[#CF0E0F] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </button>
          )}

          {/* Footer meta */}
          <div className="flex items-center justify-between text-micro text-zinc-400 pt-1 mt-auto">
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>
                {project.last_updated_at || project.updated_at
                  ? new Date(project.last_updated_at || project.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'No updates'}
              </span>
            </div>
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-[13px] text-zinc-300 hover:text-white transition-colors"
              >
                <ExternalLink className="size-4" />
                <span>View Project</span>
              </a>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
};