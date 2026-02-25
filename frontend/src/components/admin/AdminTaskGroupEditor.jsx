import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Save, RotateCcw, Clock } from 'lucide-react';
import { CircularProgress } from '../ui/CircularProgress';
import { statusConfig, getGroupCompleted, STATUS_ORDER } from '../../constants/statusConfig';

const API_BASE = window.location.origin + '/roadmap';

const MILESTONES = STATUS_ORDER; // ['Requested', 'Planning', 'Dev', 'Beta', 'Live']

export const AdminTaskGroupEditor = ({ projectId, onSaved }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, [projectId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/projects/${projectId}/task-groups`);
      setGroups(res.data);
      setDirty(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching task groups:', err);
      setError('Failed to load task groups');
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = groups.map(g => ({
        name: g.name,
        milestone: g.milestone,
        startDate: g.startDate || null,
        endDate: g.endDate || null,
        estimatedHours: g.estimatedHours || null,
        tasks: g.tasks.map(t => ({
          name: t.name,
          done: t.done,
          estimatedHours: t.estimatedHours || null,
          startDate: t.startDate || null,
        })),
      }));
      const res = await axios.put(`${API_BASE}/api/projects/${projectId}/task-groups`, { taskGroups: payload });
      setGroups(res.data);
      setDirty(false);
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error saving task groups:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const update = (fn) => {
    setGroups(prev => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      return next;
    });
    setDirty(true);
  };

  // Group operations
  const addGroup = () => {
    update(gs => [...gs, { name: 'New Task Group', milestone: 'Dev', tasks: [], startDate: null, endDate: null, estimatedHours: null }]);
  };

  const removeGroup = (gi) => {
    update(gs => gs.filter((_, i) => i !== gi));
  };

  const moveGroup = (gi, dir) => {
    update(gs => {
      const ni = gi + dir;
      if (ni < 0 || ni >= gs.length) return gs;
      [gs[gi], gs[ni]] = [gs[ni], gs[gi]];
      return gs;
    });
  };

  const updateGroup = (gi, field, value) => {
    update(gs => { gs[gi][field] = value; return gs; });
  };

  // Task operations
  const addTask = (gi) => {
    update(gs => { gs[gi].tasks.push({ name: '', done: false, estimatedHours: null, startDate: null }); return gs; });
  };

  const removeTask = (gi, ti) => {
    update(gs => { gs[gi].tasks = gs[gi].tasks.filter((_, i) => i !== ti); return gs; });
  };

  const updateTask = (gi, ti, field, value) => {
    update(gs => { gs[gi].tasks[ti][field] = value; return gs; });
  };

  const toggleTask = (gi, ti) => {
    update(gs => { gs[gi].tasks[ti].done = !gs[gi].tasks[ti].done; return gs; });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 border-2 border-elevation-3 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {groups.length} Task Group{groups.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={fetchGroups}
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger mb-3">
          {error}
        </div>
      )}

      {/* Groups */}
      <div className="space-y-3">
        {groups.map((group, gi) => (
          <GroupEditor
            key={gi}
            group={group}
            index={gi}
            total={groups.length}
            onUpdateGroup={(field, val) => updateGroup(gi, field, val)}
            onRemoveGroup={() => removeGroup(gi)}
            onMoveGroup={(dir) => moveGroup(gi, dir)}
            onAddTask={() => addTask(gi)}
            onRemoveTask={(ti) => removeTask(gi, ti)}
            onUpdateTask={(ti, field, val) => updateTask(gi, ti, field, val)}
            onToggleTask={(ti) => toggleTask(gi, ti)}
          />
        ))}
      </div>

      {/* Add Group button */}
      <button
        onClick={addGroup}
        className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-text-subtle hover:text-text-muted border border-dashed border-white/[0.08] hover:border-white/15 rounded-xl py-3 transition-all hover:bg-white/[0.02] cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Task Group
      </button>
    </div>
  );
};

// ─── Single Group Editor ───
const GroupEditor = ({
  group, index, total,
  onUpdateGroup, onRemoveGroup, onMoveGroup,
  onAddTask, onRemoveTask, onUpdateTask, onToggleTask,
}) => {
  const [expanded, setExpanded] = useState(true);
  const completed = getGroupCompleted(group);
  const totalTasks = group.tasks.length;
  const milestoneColor = statusConfig[group.milestone]?.color || '#8B91A0';

  // Derive group date range from child tasks when group has no explicit dates
  const tasksWithDates = group.tasks.filter(t => t.startDate);
  const derivedStart = !group.startDate && tasksWithDates.length > 0
    ? tasksWithDates.reduce((min, t) => (!min || t.startDate < min) ? t.startDate : min, null)
    : null;
  const derivedEnd = !group.endDate && tasksWithDates.length > 0
    ? tasksWithDates.reduce((max, t) => {
        const taskStart = t.startDate?.split?.('T')?.[0] || t.startDate;
        const daySpan = Math.max(1, Math.ceil((t.estimatedHours || 8) / 8));
        const d = new Date(taskStart + 'T00:00:00');
        d.setDate(d.getDate() + daySpan - 1);
        const end = d.toISOString().split('T')[0];
        return (!max || end > max) ? end : max;
      }, null)
    : null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Group Header */}
      <div className="flex items-center gap-2 p-3 px-3.5">
        {/* Reorder arrows */}
        <div className="flex flex-col gap-0">
          <button
            onClick={() => onMoveGroup(-1)}
            disabled={index === 0}
            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => onMoveGroup(1)}
            disabled={index === total - 1}
            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Progress circle */}
        <CircularProgress completed={completed} total={totalTasks} size={26} strokeWidth={2.5} />

        {/* Name */}
        <input
          type="text"
          value={group.name}
          onChange={(e) => onUpdateGroup('name', e.target.value)}
          className="flex-1 bg-transparent text-[13px] font-medium text-white border-none outline-none focus:bg-white/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
          placeholder="Group name"
        />

        {/* Milestone select */}
        <select
          value={group.milestone}
          onChange={(e) => onUpdateGroup('milestone', e.target.value)}
          className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-[2px] bg-transparent border cursor-pointer appearance-none text-center"
          style={{
            color: milestoneColor,
            borderColor: `${milestoneColor}35`,
            backgroundColor: `${milestoneColor}10`,
          }}
        >
          {MILESTONES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Task count */}
        <span className="text-xs text-zinc-500 tabular-nums min-w-[32px] text-right">
          {completed}/{totalTasks}
        </span>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-white/10 text-zinc-500 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Delete group */}
        <button
          onClick={onRemoveGroup}
          className="p-1 rounded hover:bg-danger/20 text-zinc-600 hover:text-danger transition-colors"
          title="Delete group"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Group Meta (dates, hours) */}
      {expanded && (
        <div className="px-3.5 pb-2 flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-1 text-zinc-500">
            <span className="uppercase tracking-wider">Start</span>
            <input
              type="date"
              value={group.startDate ? group.startDate.split('T')[0] : ''}
              onChange={(e) => onUpdateGroup('startDate', e.target.value || null)}
              className="bg-transparent border border-white/[0.06] rounded px-1.5 py-0.5 text-zinc-400 text-[11px] focus:border-white/15 outline-none transition-colors"
            />
          </label>
          <label className="flex items-center gap-1 text-zinc-500">
            <span className="uppercase tracking-wider">End</span>
            <input
              type="date"
              value={group.endDate ? group.endDate.split('T')[0] : ''}
              onChange={(e) => onUpdateGroup('endDate', e.target.value || null)}
              className="bg-transparent border border-white/[0.06] rounded px-1.5 py-0.5 text-zinc-400 text-[11px] focus:border-white/15 outline-none transition-colors"
            />
          </label>
          <label className="flex items-center gap-1 text-zinc-500">
            <Clock className="w-3 h-3" />
            <input
              type="number"
              value={group.estimatedHours || ''}
              onChange={(e) => onUpdateGroup('estimatedHours', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-14 bg-transparent border border-white/[0.06] rounded px-1.5 py-0.5 text-zinc-400 text-[11px] focus:border-white/15 outline-none transition-colors"
              placeholder="hrs"
              min="0"
              step="0.25"
            />
            <span className="uppercase tracking-wider">hrs</span>
          </label>
          {/* Show derived date range when group has no explicit dates but tasks do */}
          {!group.startDate && !group.endDate && derivedStart && (
            <span className="text-[10px] text-zinc-600 italic ml-1">
              Derived: {derivedStart} → {derivedEnd}
            </span>
          )}
        </div>
      )}

      {/* Tasks */}
      {expanded && (
        <div className="border-t border-white/[0.04]">
          <div className="py-1">
            {group.tasks.map((task, ti) => (
              <TaskRow
                key={ti}
                task={task}
                milestoneColor={milestoneColor}
                groupStartDate={group.startDate}
                groupEndDate={group.endDate}
                onToggle={() => onToggleTask(ti)}
                onUpdateName={(val) => onUpdateTask(ti, 'name', val)}
                onUpdateHours={(val) => onUpdateTask(ti, 'estimatedHours', val)}
                onUpdateStartDate={(val) => onUpdateTask(ti, 'startDate', val)}
                onRemove={() => onRemoveTask(ti)}
              />
            ))}
          </div>

          {/* Add task inline */}
          <AddTaskRow onAdd={onAddTask} />
        </div>
      )}
    </div>
  );
};

// ─── Single Task Row ───
const TaskRow = ({ task, milestoneColor, groupStartDate, groupEndDate, onToggle, onUpdateName, onUpdateHours, onUpdateStartDate, onRemove }) => {
  return (
    <div className="flex items-center gap-2 px-3.5 py-[5px] hover:bg-white/[0.02] transition-colors group">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors duration-200 cursor-pointer"
        style={{
          backgroundColor: task.done ? milestoneColor : 'transparent',
          border: task.done ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
        }}
      >
        {task.done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Task name */}
      <input
        type="text"
        value={task.name}
        onChange={(e) => onUpdateName(e.target.value)}
        className={`flex-1 bg-transparent text-[13px] leading-5 border-none outline-none focus:bg-white/5 rounded px-1 -mx-1 transition-colors ${
          task.done ? 'text-zinc-500 line-through opacity-60' : 'text-zinc-300'
        }`}
        placeholder="Task name..."
      />

      {/* Start date */}
      <input
        type="date"
        value={task.startDate ? String(task.startDate).split('T')[0] : ''}
        onChange={(e) => onUpdateStartDate(e.target.value || null)}
        min={groupStartDate ? String(groupStartDate).split('T')[0] : undefined}
        max={groupEndDate ? String(groupEndDate).split('T')[0] : undefined}
        className="bg-transparent border border-white/[0.04] rounded px-1.5 py-0.5 text-[11px] text-zinc-500 focus:border-white/15 outline-none opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
      />

      {/* Hours */}
      <input
        type="number"
        value={task.estimatedHours || ''}
        onChange={(e) => onUpdateHours(e.target.value ? parseFloat(e.target.value) : null)}
        className="w-12 bg-transparent border border-white/[0.04] rounded px-1.5 py-0.5 text-[11px] text-zinc-500 text-right focus:border-white/15 outline-none opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
        placeholder="hrs"
        min="0"
        step="0.25"
      />

      {/* Delete */}
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-danger/20 text-zinc-700 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
        title="Remove task"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─── Add Task Inline ───
const AddTaskRow = ({ onAdd }) => {
  const [name, setName] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd();
    // The parent adds a blank task; we want to set the name on the newly added task
    // Instead, let's just add and the parent handles it
    setName('');
  };

  return (
    <div className="flex items-center gap-2 px-3.5 py-2 border-t border-white/[0.03]">
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        <span>Add task</span>
      </button>
    </div>
  );
};
