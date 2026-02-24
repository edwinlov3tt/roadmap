import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const DB_STATUSES = ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live'];
const PRIORITIES = ['none', 'Leadership Priority', 'High Demand'];

export const AdminProjectForm = ({ project, fiderTags = [], onSubmit, onClose }) => {
  const isEdit = !!project;
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'Requested',
    priority: project?.priority || 'none',
    current_version: project?.current_version || '',
    project_url: project?.project_url || '',
    fider_tag_id: project?.fider_tag_id || '',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    date_label: project?.date_label || project?.dateLabel || 'Target Launch',
    start_milestone: project?.start_milestone || project?.startMilestone || 'Requested',
    end_milestone: project?.end_milestone || project?.endMilestone || 'Live',
    launched_date: project?.launched_date || '',
    next_steps: project?.next_steps || '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        fider_tag_id: form.fider_tag_id || null,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] max-h-[88vh] flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08]"
        style={{
          backgroundColor: 'rgba(37,37,41,0.97)',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}
      >
        {/* Colored top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60 bg-gradient-to-r from-transparent via-accent to-transparent" />

        {/* Header */}
        <div className="p-5 pb-4 border-b border-white/[0.06] flex-shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? 'Edit Project' : 'New Project'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/5 text-zinc-500 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 min-h-0 custom-scrollbar">
          <div className="space-y-4">
            {/* Name */}
            <FormField label="Project Name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="input-glass w-full text-sm"
                placeholder="My Project"
              />
            </FormField>

            {/* Description */}
            <FormField label="Description" required>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="input-glass w-full text-sm min-h-[80px] resize-y"
                placeholder="What does this project do?"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className="input-glass w-full text-sm"
                >
                  {DB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>

              {/* Priority */}
              <FormField label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => update('priority', e.target.value)}
                  className="input-glass w-full text-sm"
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p === 'none' ? 'None' : p}</option>)}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Version */}
              <FormField label="Version">
                <input
                  type="text"
                  value={form.current_version}
                  onChange={(e) => update('current_version', e.target.value)}
                  className="input-glass w-full text-sm"
                  placeholder="v1.0.0"
                />
              </FormField>

              {/* Project URL */}
              <FormField label="Project URL">
                <input
                  type="url"
                  value={form.project_url}
                  onChange={(e) => update('project_url', e.target.value)}
                  className="input-glass w-full text-sm"
                  placeholder="https://..."
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <FormField label="Start Date">
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update('start_date', e.target.value)}
                  className="input-glass w-full text-sm"
                />
              </FormField>

              {/* End Date */}
              <FormField label="End Date">
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => update('end_date', e.target.value)}
                  className="input-glass w-full text-sm"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Fider Tag */}
              <FormField label="Fider Tag">
                <select
                  value={form.fider_tag_id}
                  onChange={(e) => update('fider_tag_id', e.target.value)}
                  className="input-glass w-full text-sm"
                >
                  <option value="">None</option>
                  {fiderTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </FormField>

              {/* Launched Date */}
              <FormField label="Launched Date">
                <input
                  type="text"
                  value={form.launched_date}
                  onChange={(e) => update('launched_date', e.target.value)}
                  className="input-glass w-full text-sm"
                  placeholder="e.g. August 2025"
                />
              </FormField>
            </div>

            {/* Next Steps */}
            <FormField label="Next Steps">
              <textarea
                value={form.next_steps}
                onChange={(e) => update('next_steps', e.target.value)}
                className="input-glass w-full text-sm min-h-[60px] resize-y"
                placeholder="What's planned next?"
              />
            </FormField>

            {/* Error */}
            {error && (
              <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-text-subtle hover:text-text-muted transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm font-semibold text-white bg-accent hover:bg-accent/80 transition-colors px-5 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const FormField = ({ label, required, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
      {label}
      {required && <span className="text-accent ml-0.5">*</span>}
    </label>
    {children}
  </div>
);
