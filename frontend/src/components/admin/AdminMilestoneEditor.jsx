import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { formatDate } from '../../constants/statusConfig';

const API_BASE = window.location.origin + '/roadmap';

const DEFAULT_ICONS = ['◆', '🚀', '🎯', '✅', '⭐', '🔧', '📦', '🏁'];

export const AdminMilestoneEditor = ({ projectId, onSaved }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/public/projects/${projectId}/milestones`);
      setMilestones(res.data);
      setDirty(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = milestones.map(m => ({
        name: m.name,
        targetDate: m.targetDate || null,
        icon: m.icon || '◆',
      }));
      const res = await axios.put(`${API_BASE}/api/projects/${projectId}/milestones`, { milestones: payload });
      setMilestones(res.data);
      setDirty(false);
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error saving milestones:', err);
      setError('Failed to save milestones');
    } finally {
      setSaving(false);
    }
  };

  const update = (fn) => {
    setMilestones(prev => fn(JSON.parse(JSON.stringify(prev))));
    setDirty(true);
  };

  const addMilestone = () => {
    update(ms => [...ms, { name: '', targetDate: '', icon: '◆' }]);
  };

  const removeMilestone = (i) => {
    update(ms => ms.filter((_, idx) => idx !== i));
  };

  const updateMilestone = (i, field, value) => {
    update(ms => { ms[i][field] = value; return ms; });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="size-6 border-2 border-elevation-3 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {milestones.length} Milestone{milestones.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={fetchMilestones}
              className="flex items-center gap-1.5 text-[11px] text-text-subtle hover:text-text-muted transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
            >
              <RotateCcw className="w-3 h-3" />
              Discard
            </button>
          )}
          <button
            onClick={saveAll}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger mb-3">
          {error}
        </div>
      )}

      {/* Milestone list */}
      {milestones.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-text-subtle/60 mb-2">No milestones defined</p>
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2.5 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-colors"
            >
              {/* Icon picker */}
              <select
                value={m.icon || '◆'}
                onChange={(e) => updateMilestone(i, 'icon', e.target.value)}
                className="bg-transparent border border-white/[0.06] rounded px-1 py-0.5 text-sm cursor-pointer hover:border-white/15 outline-none transition-colors"
              >
                {DEFAULT_ICONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>

              {/* Name */}
              <input
                type="text"
                value={m.name}
                onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                className="flex-1 bg-transparent text-sm text-white border-none outline-none focus:bg-white/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
                placeholder="Milestone name"
              />

              {/* Target date */}
              <input
                type="date"
                value={m.targetDate ? m.targetDate.split('T')[0] : ''}
                onChange={(e) => updateMilestone(i, 'targetDate', e.target.value || null)}
                className="bg-transparent border border-white/[0.06] rounded px-1.5 py-0.5 text-zinc-400 text-[11px] focus:border-white/15 outline-none transition-colors"
              />

              {/* Delete */}
              <button
                onClick={() => removeMilestone(i)}
                className="p-1 rounded hover:bg-danger/20 text-zinc-600 hover:text-danger transition-colors"
                title="Remove milestone"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add milestone */}
      <button
        onClick={addMilestone}
        className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-text-subtle hover:text-text-muted border border-dashed border-white/[0.08] hover:border-white/15 rounded-lg py-2.5 transition-all hover:bg-white/[0.02] cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Milestone
      </button>
    </div>
  );
};
