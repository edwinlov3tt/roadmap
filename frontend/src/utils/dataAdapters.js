/**
 * Data transformation utilities for converting API data to view-specific formats
 */

// Helper to get consistent project colors
const projectColors = ['#5AA2FF', '#CF0E0F', '#F6C244', '#D14B06', '#90E35E', '#A78BFA'];

function getProjectColor(projectId) {
  const idx = projectId % projectColors.length;
  return projectColors[idx];
}

// Helper to add days to a date
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Helper to format date as YYYY-MM-DD
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Infer task status from subtasks
function inferTaskStatus(subtasks) {
  if (!subtasks || subtasks.length === 0) return 'Todo';
  const doneCount = subtasks.filter(s => s.done).length;
  if (doneCount === 0) return 'Todo';
  if (doneCount === subtasks.length) return 'Done';
  return 'In Progress';
}

// Calculate start date for a task group based on its position
function calculateGroupStartDate(projectStart, projectEnd, groupIndex, totalGroups) {
  if (!projectStart || !projectEnd) {
    // Default to current date if no project dates
    return new Date();
  }

  const start = new Date(projectStart);
  const end = new Date(projectEnd);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Distribute groups evenly across project timeline
  const daysPerGroup = totalDays / totalGroups;
  const startDay = Math.floor(groupIndex * daysPerGroup);

  return addDays(start, startDay);
}

/**
 * Convert projects from API format (with taskGroups) to Timeline format (with tasks)
 *
 * API format:
 * {
 *   id, name, status, priority, startDate, endDate,
 *   taskGroups: [
 *     { name, milestone, tasks: [{ id, name, done }] }
 *   ]
 * }
 *
 * Timeline format:
 * {
 *   id, name, status, color,
 *   tasks: [
 *     { id, name, status, hours, startDate, endDate, subtasks: [{ name, done }] }
 *   ],
 *   milestones: []
 * }
 */
export function projectsToTimelineFormat(projects) {
  return projects.map(proj => {
    // Each taskGroup becomes a task with subtasks
    const tasks = flattenTaskGroups(
      proj.taskGroups || [],
      proj.startDate,
      proj.endDate
    );

    return {
      id: proj.id,
      name: proj.name,
      status: proj.status,
      color: getProjectColor(proj.id),
      tasks,
      milestones: proj.milestones || [],
    };
  });
}

/**
 * Flatten taskGroups into a three-level structure:
 * Each taskGroup becomes a group entry with isGroup=true and a children array
 * of individually-scheduled tasks.
 */
function flattenTaskGroups(taskGroups, projectStart, projectEnd) {
  if (!taskGroups || taskGroups.length === 0) return [];

  const tasks = [];

  taskGroups.forEach((group, groupIndex) => {
    const subtasks = group.tasks || [];

    // Build children with individual dates
    const children = subtasks.map((task, taskIndex) => {
      const taskHours = task.estimatedHours || 8; // default 1 day
      const daySpan = Math.max(1, Math.ceil(taskHours / 8));

      let taskStart, taskEnd;
      if (task.startDate) {
        // Task has an explicit start date — derive end from hours
        taskStart = String(task.startDate).split('T')[0];
        taskEnd = dateStr(addDays(new Date(taskStart + 'T00:00:00'), daySpan - 1));
      } else if (group.startDate && group.endDate) {
        // Distribute within group date range
        const gStart = new Date(String(group.startDate).split('T')[0] + 'T00:00:00');
        const gEnd = new Date(String(group.endDate).split('T')[0] + 'T00:00:00');
        const gDays = Math.max(1, Math.ceil((gEnd - gStart) / (1000 * 60 * 60 * 24)));
        const perTask = gDays / Math.max(1, subtasks.length);
        const offset = Math.floor(taskIndex * perTask);
        taskStart = dateStr(addDays(gStart, offset));
        taskEnd = dateStr(addDays(gStart, Math.min(offset + daySpan - 1, gDays)));
      } else {
        // Fallback: distribute across project timeline
        const synStart = calculateGroupStartDate(projectStart, projectEnd, groupIndex, taskGroups.length);
        const offset = taskIndex * daySpan;
        taskStart = dateStr(addDays(synStart, offset));
        taskEnd = dateStr(addDays(synStart, offset + daySpan - 1));
      }

      return {
        id: `task-${group.name}-${groupIndex}-${taskIndex}`,
        name: task.name,
        status: task.done ? 'Done' : 'Todo',
        hours: taskHours,
        startDate: taskStart,
        endDate: taskEnd,
        isGroup: false,
      };
    });

    // Group-level hours
    const subtaskHoursSum = subtasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const estimatedHours = group.estimatedHours || (subtaskHoursSum > 0 ? subtaskHoursSum : Math.max(subtasks.length * 8, 8));

    // Group-level dates: explicit > derived from children > synthetic
    let groupStart, groupEnd;
    if (group.startDate && group.endDate) {
      groupStart = String(group.startDate).split('T')[0];
      groupEnd = String(group.endDate).split('T')[0];
    } else if (children.length > 0) {
      // Derive from children's date extremes
      groupStart = children.reduce((min, c) => (c.startDate < min ? c.startDate : min), children[0].startDate);
      groupEnd = children.reduce((max, c) => (c.endDate > max ? c.endDate : max), children[0].endDate);
    } else {
      // Synthetic fallback for empty groups
      const synStart = calculateGroupStartDate(projectStart, projectEnd, groupIndex, taskGroups.length);
      const daySpan = Math.max(1, Math.ceil(estimatedHours / 8));
      let synEnd;
      if (groupIndex < taskGroups.length - 1) {
        synEnd = addDays(calculateGroupStartDate(projectStart, projectEnd, groupIndex + 1, taskGroups.length), -1);
      } else {
        synEnd = projectEnd ? new Date(projectEnd) : addDays(synStart, daySpan - 1);
      }
      groupStart = dateStr(synStart);
      groupEnd = dateStr(synEnd);
    }

    tasks.push({
      id: `group-${group.name}-${groupIndex}`,
      name: group.name,
      status: inferTaskStatus(subtasks),
      hours: estimatedHours,
      startDate: groupStart,
      endDate: groupEnd,
      isGroup: true,
      children,
      // Backward compat: keep subtasks array for components that still use it
      subtasks: subtasks.map(t => ({ name: t.name, done: t.done })),
    });
  });

  return tasks;
}

/**
 * Get week days (Mon-Sun) for a given date
 */
export function getWeekDays(baseDate = new Date()) {
  const d = new Date(baseDate);
  const day = d.getDay();
  // Get Monday of the week (day 0 = Sun, so we need to adjust)
  const mon = addDays(d, -((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
