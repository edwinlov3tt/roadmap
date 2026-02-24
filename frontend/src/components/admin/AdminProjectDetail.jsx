import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  X, Pencil, Check, ExternalLink, Calendar, Clock, CheckCircle,
  LayoutList, FileText, Image, Settings, Info
} from 'lucide-react';
import { StatusPill } from '../ui/StatusPill';
import { PriorityBadge } from '../ui/PriorityBadge';
import { MilestoneProgressBar } from '../ui/MilestoneProgressBar';
import { AdminTaskGroupEditor } from './AdminTaskGroupEditor';
import { AdminMilestoneEditor } from './AdminMilestoneEditor';
import { AdminUpdateList } from './AdminUpdateList';
import { AdminImageManager } from './AdminImageManager';
import { getStatusConfig, getTotalTasks, getCompletedTasks, formatDate, DB_STATUS_TO_SHORT, SHORT_TO_DB_STATUS } from '../../constants/statusConfig';

const API_BASE = window.location.origin + '/roadmap';

const DB_STATUSES = ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live'];
const PRIORITIES = ['none', 'Leadership Priority', 'High Demand'];

const tabs = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'tasks', label: 'Tasks', icon: LayoutList },
  { id: 'updates', label: 'Updates', icon: FileText },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Inline editable text field
const EditableField = ({ value, displayValue, onSave, type = 'text', className = '', displayClassName = '', placeholder = '' }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const save = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  if (editing) {
    if (type === 'textarea') {
      return (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input-glass text-sm min-h-[60px] resize-y"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
          />
          <div className="flex gap-1.5">
            <button onClick={save} className="text-xs text-success hover:text-success/80 transition-colors px-2 py-1 rounded bg-success/10">Save</button>
            <button onClick={cancel} className="text-xs text-text-subtle hover:text-text-muted transition-colors px-2 py-1 rounded bg-white/5">Cancel</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`input-glass text-sm ${className}`}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
        />
        <button onClick={save} className="p-1 rounded hover:bg-white/10 text-success transition-colors">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="p-1 rounded hover:bg-white/10 text-text-subtle transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <span
      onClick={() => { setDraft(value || ''); setEditing(true); }}
      className={`group cursor-pointer inline-flex items-center gap-1.5 hover:bg-white/5 rounded px-1 -mx-1 transition-colors ${displayClassName}`}
      title="Click to edit"
    >
      {(displayValue || value) || <span className="text-text-subtle italic">{placeholder || 'Click to set'}</span>}
      <Pencil className="w-3 h-3 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </span>
  );
};

// Dropdown selector for status/priority
const DropdownField = ({ value, options, onSelect, renderOption }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="cursor-pointer hover:opacity-80 transition-opacity">
        {renderOption ? renderOption(value) : value}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[1001]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-[1002] glass-panel border border-white/10 rounded-lg overflow-hidden min-w-[180px] py-1">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onSelect(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors ${
                  opt === value ? 'text-text-hi bg-white/5' : 'text-text-muted'
                }`}
              >
                {renderOption ? renderOption(opt) : opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const AdminProjectDetail = ({ project, fiderTags, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [taskGroups, setTaskGroups] = useState([]);

  const total = getTotalTasks(project);
  const completed = getCompletedTasks(project);
  const cfg = getStatusConfig(project.status);
  const statusColor = cfg.color;

  useEffect(() => {
    fetchUpdates();
    fetchTaskGroups();
  }, [project.id]);

  const fetchUpdates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/public/projects/${project.id}/updates`);
      setUpdates(res.data);
    } catch (err) {
      console.error('Error fetching updates:', err);
    }
  };

  const fetchTaskGroups = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/projects/${project.id}/task-groups`);
      setTaskGroups(res.data);
    } catch (err) {
      console.error('Error fetching task groups:', err);
    }
  };

  const updateField = async (field, value) => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/api/projects/${project.id}`, { [field]: value });
      await onRefresh();
    } catch (err) {
      console.error('Error updating project:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/projects/${project.id}`);
      onClose();
    } catch (err) {
      console.error('Error deleting project:', err);
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1100px] max-h-[90vh] flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08]"
        style={{
          backgroundColor: 'rgba(37,37,41,0.97)',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}
      >
        {/* Colored top line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
          style={{ background: `linear-gradient(90deg, transparent 5%, ${statusColor} 50%, transparent 95%)` }}
        />

        {/* Header */}
        <div className="p-5 pb-0 flex-shrink-0">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg border border-white/[0.08] bg-white/5 text-zinc-500 flex items-center justify-center text-sm hover:bg-white/10 hover:text-white transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Saving indicator */}
          {saving && (
            <div className="absolute top-3.5 right-14 text-xs text-text-subtle flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-white/20 border-t-info rounded-full animate-spin" />
              Saving...
            </div>
          )}

          {/* Badges row — clickable status and priority */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <DropdownField
              value={project.status}
              options={DB_STATUSES}
              onSelect={(val) => updateField('status', val)}
              renderOption={(status) => <StatusPill status={status} />}
            />
            <DropdownField
              value={project.priority || 'none'}
              options={PRIORITIES}
              onSelect={(val) => updateField('priority', val)}
              renderOption={(pri) => (
                pri && pri !== 'none'
                  ? <PriorityBadge priority={pri} />
                  : <span className="text-xs text-text-subtle bg-white/5 border border-white/10 rounded px-2 py-0.5">No Priority</span>
              )}
            />
            <EditableField
              value={project.current_version}
              onSave={(val) => updateField('current_version', val)}
              displayClassName="text-xs text-zinc-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
              placeholder="Version"
            />
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

          {/* Title (inline editable) */}
          <h2 className="text-xl font-semibold text-white mb-1.5 leading-7">
            <EditableField
              value={project.name}
              onSave={(val) => updateField('name', val)}
              placeholder="Project name"
            />
          </h2>

          {/* Description (inline editable) */}
          <div className="text-[13px] text-zinc-300 leading-5 mb-3">
            <EditableField
              value={project.description}
              onSave={(val) => updateField('description', val)}
              type="textarea"
              placeholder="Add a description..."
            />
          </div>

          {/* Progress bar */}
          {project.taskGroups && project.taskGroups.length > 0 && (
            <MilestoneProgressBar project={project} />
          )}

          {/* Tab bar */}
          <div className="flex gap-0 mt-4 border-b border-white/[0.06] -mx-5 px-5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'text-text-hi border-info'
                      : 'text-text-subtle border-transparent hover:text-text-muted hover:border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0 custom-scrollbar">
          {activeTab === 'overview' && (
            <OverviewTab project={project} updateField={updateField} fiderTags={fiderTags} />
          )}
          {activeTab === 'tasks' && (
            <TasksTab project={project} onRefresh={() => { onRefresh(); fetchTaskGroups(); }} />
          )}
          {activeTab === 'updates' && (
            <AdminUpdateList project={project} updates={updates} onRefresh={() => { onRefresh(); fetchUpdates(); }} />
          )}
          {activeTab === 'images' && (
            <AdminImageManager projectId={project.id} onSaved={onRefresh} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab project={project} updateField={updateField} onDelete={deleteProject} fiderTags={fiderTags} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Overview Tab ───
const OverviewTab = ({ project, updateField, fiderTags }) => {
  const total = getTotalTasks(project);
  const completed = getCompletedTasks(project);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Quick Stats */}
      <div className="col-span-2 flex gap-4">
        <StatCard label="Tasks" value={`${completed}/${total}`} sub={`${pct}% complete`} />
        <StatCard label="Task Groups" value={project.taskGroups?.length || 0} />
        <StatCard label="Status" value={project.status} color={getStatusConfig(project.status).color} />
        <StatCard label="Updates" value={project.update_count || 0} />
      </div>

      {/* Project Details */}
      <div className="glass-panel p-4 col-span-2">
        <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3">Project Details</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <DetailRow label="Project URL">
            <EditableField
              value={project.project_url}
              onSave={(val) => updateField('project_url', val)}
              type="url"
              placeholder="https://..."
            />
          </DetailRow>
          <DetailRow label="Version">
            <EditableField
              value={project.current_version}
              onSave={(val) => updateField('current_version', val)}
              placeholder="e.g. v1.0.0"
            />
          </DetailRow>
          <DetailRow label="Start Date">
            <EditableField
              value={project.start_date ? project.start_date.split('T')[0] : ''}
              displayValue={formatDate(project.start_date)}
              onSave={(val) => updateField('start_date', val)}
              type="date"
              placeholder="Set start date"
            />
          </DetailRow>
          <DetailRow label="End Date">
            <EditableField
              value={project.end_date ? project.end_date.split('T')[0] : ''}
              displayValue={formatDate(project.end_date)}
              onSave={(val) => updateField('end_date', val)}
              type="date"
              placeholder="Set end date"
            />
          </DetailRow>
          <DetailRow label="Launched Date">
            <EditableField
              value={project.launched_date}
              onSave={(val) => updateField('launched_date', val)}
              placeholder="e.g. August 2025"
            />
          </DetailRow>
          <DetailRow label="Fider Tag">
            {project.fider_tag_name ? (
              <span className="text-sm text-text-muted">{project.fider_tag_name}</span>
            ) : (
              <span className="text-sm text-text-subtle italic">Not linked</span>
            )}
          </DetailRow>
        </div>
      </div>

      {/* Next Steps */}
      <div className="glass-panel p-4 col-span-2">
        <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3">Next Steps</h3>
        <EditableField
          value={project.next_steps}
          onSave={(val) => updateField('next_steps', val)}
          type="textarea"
          placeholder="Describe what's coming next..."
        />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, color }) => (
  <div className="glass-panel p-3 px-4 flex-1">
    <div className="text-[10px] font-bold text-text-subtle uppercase tracking-wider mb-1">{label}</div>
    <div className="text-lg font-bold text-text-hi" style={color ? { color } : undefined}>{value}</div>
    {sub && <div className="text-[11px] text-text-subtle mt-0.5">{sub}</div>}
  </div>
);

const DetailRow = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1">{label}</div>
    <div className="text-sm text-text-muted">{children}</div>
  </div>
);

// ─── Tasks Tab (full editor with task groups + milestones) ───
const TasksTab = ({ project, onRefresh }) => {
  return (
    <div className="space-y-6">
      {/* Task Group Editor */}
      <AdminTaskGroupEditor
        projectId={project.id}
        onSaved={onRefresh}
      />

      {/* Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* Milestone Editor */}
      <AdminMilestoneEditor
        projectId={project.id}
        onSaved={onRefresh}
      />
    </div>
  );
};


// ─── Settings Tab ───
const SettingsTab = ({ project, updateField, onDelete, fiderTags }) => (
  <div className="space-y-5">
    <div className="glass-panel p-4">
      <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3">Advanced</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <DetailRow label="Date Label">
          <EditableField
            value={project.date_label || project.dateLabel}
            onSave={(val) => updateField('date_label', val)}
            placeholder="e.g. Target Launch"
          />
        </DetailRow>
        <DetailRow label="Start Milestone">
          <EditableField
            value={project.start_milestone || project.startMilestone}
            onSave={(val) => updateField('start_milestone', val)}
            placeholder="e.g. Requested"
          />
        </DetailRow>
        <DetailRow label="End Milestone">
          <EditableField
            value={project.end_milestone || project.endMilestone}
            onSave={(val) => updateField('end_milestone', val)}
            placeholder="e.g. Live"
          />
        </DetailRow>
        <DetailRow label="Fider Tag">
          <select
            value={project.fider_tag_id || ''}
            onChange={(e) => updateField('fider_tag_id', e.target.value || null)}
            className="input-glass text-sm w-full"
          >
            <option value="">None</option>
            {fiderTags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
        </DetailRow>
      </div>
    </div>

    <div className="glass-panel p-4 border-danger/20">
      <h3 className="text-xs font-bold text-danger uppercase tracking-wider mb-3">Danger Zone</h3>
      <p className="text-sm text-text-subtle mb-3">
        Permanently delete this project and all associated data (task groups, updates, images).
      </p>
      <button
        onClick={onDelete}
        className="text-xs font-semibold text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 hover:bg-danger/20 transition-colors"
      >
        Delete Project
      </button>
    </div>
  </div>
);

