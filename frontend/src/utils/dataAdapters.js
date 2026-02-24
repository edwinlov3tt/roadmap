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
 * Flatten taskGroups into tasks array
 * Each taskGroup becomes a task with its tasks as subtasks
 */
function flattenTaskGroups(taskGroups, projectStart, projectEnd) {
  if (!taskGroups || taskGroups.length === 0) return [];

  const tasks = [];

  taskGroups.forEach((group, groupIndex) => {
    const subtasks = group.tasks || [];

    // HOURS: prefer group.estimatedHours > sum of subtask hours > synthetic (subtasks.length * 8)
    const subtaskHoursSum = subtasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const estimatedHours = group.estimatedHours || (subtaskHoursSum > 0 ? subtaskHoursSum : subtasks.length * 8);

    const daySpan = Math.max(1, Math.ceil(estimatedHours / 8)); // At least 1 day

    // DATES: prefer group.startDate/endDate > synthetic (evenly distributed across project range)
    let startDate, endDate;
    if (group.startDate && group.endDate) {
      // Normalize to YYYY-MM-DD (API may return full ISO timestamps)
      startDate = String(group.startDate).split('T')[0];
      endDate = String(group.endDate).split('T')[0];
    } else {
      // Synthetic: each group spans its allocated slice of the project timeline
      const syntheticStart = calculateGroupStartDate(
        projectStart,
        projectEnd,
        groupIndex,
        taskGroups.length
      );
      // End date = start of next group - 1 day (or project end for last group)
      let syntheticEnd;
      if (groupIndex < taskGroups.length - 1) {
        syntheticEnd = addDays(
          calculateGroupStartDate(projectStart, projectEnd, groupIndex + 1, taskGroups.length),
          -1
        );
      } else {
        syntheticEnd = projectEnd ? new Date(projectEnd) : addDays(syntheticStart, daySpan - 1);
      }
      startDate = dateStr(syntheticStart);
      endDate = dateStr(syntheticEnd);
    }

    tasks.push({
      id: `task-${group.name}-${groupIndex}`,
      name: group.name,
      status: inferTaskStatus(subtasks),
      hours: estimatedHours,
      startDate,
      endDate,
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
