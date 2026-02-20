import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Calendar, User, AlertCircle } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { GlassPanel } from './GlassPanel';
import { clsx } from 'clsx';

export const ProjectDetailSheet = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-elevation-1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-elevation-1 border-b border-stroke-outer">
          <div className="p-6">
            {/* Title row with X button */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-h1 font-semibold text-text-hi">
                {project.name}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-sm hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {/* Tags and View Project button row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StatusPill status={project.status} />

                {/* Divider and Fider tag */}
                {project.fider_tag_name && (
                  <>
                    <span className="h-4 w-px bg-white/10 mx-1"></span>
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
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor: `#${project.fider_tag_color}`,
                        }}
                      />
                      {project.fider_tag_name}
                    </a>
                  </>
                )}

                {project.current_version && (
                  <span className="text-small text-text-muted">
                    v{project.current_version}
                  </span>
                )}
              </div>

              {/* View Project Button */}
              {project.project_url && (
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/80 hover:bg-accent backdrop-blur-md border border-accent/30 text-white transition-all duration-200 hover:shadow-[0_4px_16px_rgba(207,14,15,0.3)]"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Project
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-120px)]">
          {/* Screenshot - Full view above Purpose */}
          {project.images && project.images.length > 0 && (
            <div className="relative">
              <img
                src={project.images[0].src}
                alt={project.images[0].alt || `${project.name} screenshot`}
                className="w-full rounded-2xl object-cover opacity-90 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                style={{ aspectRatio: '16/9' }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/20 rounded-2xl" />
            </div>
          )}

          {/* Description */}
          {project.description && (
            <GlassPanel className="p-6">
              <h3 className="text-h3 font-semibold text-text-hi mb-3">Purpose</h3>
              <p className="text-text-muted leading-relaxed">
                {project.description}
              </p>
            </GlassPanel>
          )}

          {/* Next Steps */}
          {project.next_steps && (
            <GlassPanel className="p-6">
              <h3 className="text-h3 font-semibold text-text-hi mb-3">Next Steps</h3>
              <div className="space-y-2">
                {typeof project.next_steps === 'string' ? (
                  <p className="text-text-muted">{project.next_steps}</p>
                ) : Array.isArray(project.next_steps) ? (
                  project.next_steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span className="text-text-muted">
                        {typeof step === 'object' ? step.title : step}
                      </span>
                    </div>
                  ))
                ) : null}
              </div>
            </GlassPanel>
          )}

          {/* Recent Updates */}
          {project.updates && project.updates.length > 0 && (
            <GlassPanel className="p-6">
              <h3 className="text-h3 font-semibold text-text-hi mb-3">Recent Updates</h3>
              <div className="space-y-4">
                {project.updates.slice(0, 5).map((update, index) => (
                  <div key={update.id || index} className="border-l-2 border-elevation-3 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3 h-3 text-text-subtle" />
                      <span className="text-micro text-text-subtle">
                        {new Date(update.created_at || update.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="text-small text-text-muted">
                      {Array.isArray(update.notes)
                        ? update.notes.map((note, i) => (
                            <div key={i}>{note}</div>
                          ))
                        : update.notes}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* Project Info */}
          <GlassPanel className="p-6 mb-8">
            <h3 className="text-h3 font-semibold text-text-hi mb-3">Project Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-small text-text-subtle">Launch Date</span>
                <span className="text-small text-text-muted">{project.launched_date || 'TBA'}</span>
              </div>
              {project.update_count !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-small text-text-subtle">Total Updates</span>
                  <span className="text-small text-text-muted">{project.update_count}</span>
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
      </motion.div>
    </motion.div>
  );
};