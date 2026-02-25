// ─── Status & Priority Configuration (v3) ───

export const STATUS_ORDER = ['Requested', 'Planning', 'Dev', 'Beta', 'Live'];

export const statusConfig = {
  Requested: { color: '#8B91A0', bg: 'rgba(139,145,160,0.08)', border: 'rgba(139,145,160,0.19)', label: 'Requested', dotted: true },
  Planning:  { color: '#F6C244', bg: 'rgba(246,194,68,0.08)',  border: 'rgba(246,194,68,0.19)',  label: 'Planning',  dotted: false },
  Dev:       { color: '#5AA2FF', bg: 'rgba(90,162,255,0.08)',  border: 'rgba(90,162,255,0.19)',  label: 'Dev',       dotted: false },
  Beta:      { color: '#D14B06', bg: 'rgba(209,75,6,0.08)',    border: 'rgba(209,75,6,0.19)',    label: 'Beta',      dotted: false },
  Live:      { color: '#90E35E', bg: 'rgba(144,227,94,0.08)',  border: 'rgba(144,227,94,0.19)',  label: 'Live',      dotted: false },
};

// Maps DB status values → v3 short names
export const DB_STATUS_TO_SHORT = {
  'Requested':       'Requested',
  'In Planning':     'Planning',
  'In Development':  'Dev',
  'In Beta Testing': 'Beta',
  'Live':            'Live',
};

export const SHORT_TO_DB_STATUS = Object.fromEntries(
  Object.entries(DB_STATUS_TO_SHORT).map(([k, v]) => [v, k])
);

export const priorityConfig = {
  'Leadership Priority': { icon: '🔺', color: '#CF0E0F', label: 'Leadership Priority' },
  'High Demand':         { icon: '🔥', color: '#F6C244', label: 'High Demand' },
};

// ─── Utilities ───

export function normalizeStatus(status) {
  return DB_STATUS_TO_SHORT[status] || status;
}

export function getStatusConfig(status) {
  const short = normalizeStatus(status);
  return statusConfig[short] || statusConfig.Requested;
}

export function getMilestoneRange(project) {
  const si = STATUS_ORDER.indexOf(project.startMilestone);
  const ei = STATUS_ORDER.indexOf(project.endMilestone);
  if (si === -1 || ei === -1 || si >= ei) return [project.startMilestone, project.endMilestone];
  return STATUS_ORDER.slice(si, ei + 1);
}

export function getTotalTasks(project) {
  if (!project.taskGroups) return 0;
  return project.taskGroups.reduce((s, g) => s + g.tasks.length, 0);
}

export function getCompletedTasks(project) {
  if (!project.taskGroups) return 0;
  return project.taskGroups.reduce((s, g) => s + g.tasks.filter(t => t.done).length, 0);
}

export function getGroupCompleted(group) {
  return group.tasks.filter(t => t.done).length;
}

export function buildProgressBlocks(project) {
  const range = getMilestoneRange(project);
  const blocks = [];

  // Start cap
  blocks.push({ type: 'cap', milestone: range[0], position: 'start' });

  let prevMilestone = null;
  project.taskGroups.forEach((group, gi) => {
    const ms = group.milestone;
    if (ms !== prevMilestone && prevMilestone !== null) {
      blocks.push({ type: 'divider', milestone: ms, groupIndex: gi });
    }
    prevMilestone = ms;
    const color = statusConfig[ms]?.color || '#8B91A0';
    group.tasks.forEach((task) => {
      blocks.push({ type: 'task', done: task.done, color, milestone: ms, groupIndex: gi });
    });
  });

  return blocks;
}

// ─── Current-phase helpers ───

export function getCurrentPhase(project) {
  return normalizeStatus(project.status);
}

export function getCurrentPhaseGroups(project) {
  const phase = getCurrentPhase(project);
  if (!project.taskGroups) return [];
  return project.taskGroups.filter(g => g.milestone === phase);
}

export function getPhaseTotalTasks(project) {
  return getCurrentPhaseGroups(project).reduce((s, g) => s + g.tasks.length, 0);
}

export function getPhaseCompletedTasks(project) {
  return getCurrentPhaseGroups(project).reduce((s, g) => s + g.tasks.filter(t => t.done).length, 0);
}

export function buildPhaseProgressBlocks(project) {
  const phase = getCurrentPhase(project);
  const groups = getCurrentPhaseGroups(project);
  const color = statusConfig[phase]?.color || '#8B91A0';
  const blocks = [];

  blocks.push({ type: 'cap', milestone: phase, position: 'start' });

  groups.forEach((group, gi) => {
    const originalIndex = project.taskGroups.indexOf(group);
    group.tasks.forEach((task) => {
      blocks.push({ type: 'task', done: task.done, color, milestone: phase, groupIndex: originalIndex });
    });
  });

  return blocks;
}

// Re-export centralized date formatting
export { formatDate } from '../utils/dateUtils';
