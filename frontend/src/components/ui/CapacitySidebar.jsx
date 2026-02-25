import React, { useMemo } from 'react';
import { BandwidthMeter } from './BandwidthMeter';
import { parseDate, isSameDay } from '../../utils/dateUtils';

const DAY_CAPACITY = 8; // hours per day
const WEEK_CAPACITY = 40; // hours per week (5 weekdays × 8h)
const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Extract project date range and total hours from either format:
 * - Raw API format: { taskGroups: [...], startDate, endDate }
 * - Timeline format: { tasks: [{ hours, startDate, endDate }], color }
 */
function getProjectInfo(project) {
  // Timeline format (has tasks with hours/dates)
  if (project.tasks && project.tasks.length > 0) {
    // Drill into group children for accurate hour totals
    const allItems = project.tasks.flatMap(t =>
      t.isGroup && t.children?.length > 0 ? t.children : [t]
    );
    const totalHours = allItems.reduce((s, t) => s + (t.hours || 0), 0);
    const dates = allItems
      .filter(t => t.startDate && t.endDate)
      .flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)]);
    if (dates.length === 0) return null;
    const projStart = new Date(Math.min(...dates));
    const projEnd = new Date(Math.max(...dates));
    return { totalHours, projStart, projEnd, color: project.color };
  }

  // Raw API format (has taskGroups)
  if (project.taskGroups && project.startDate && project.endDate) {
    const totalTasks = project.taskGroups.reduce((sum, grp) => sum + (grp.tasks?.length || 0), 0);
    const totalHours = totalTasks * 8;
    return {
      totalHours,
      projStart: new Date(project.startDate),
      projEnd: new Date(project.endDate),
      color: getProjectColor(project.status),
    };
  }

  return null;
}

/**
 * Capacity sidebar showing weekly overview, daily breakdown, and project hours
 */
export const CapacitySidebar = ({ weekDays, projects }) => {
  // Calculate daily hours by distributing project tasks across their date ranges
  const dailyHours = useMemo(() => {
    const dayMap = {};
    weekDays.forEach(day => {
      dayMap[dateStr(day)] = { date: day, hours: 0, projects: new Set() };
    });

    projects.forEach(project => {
      const info = getProjectInfo(project);
      if (!info) return;

      const { totalHours, projStart, projEnd } = info;
      const daysDiff = Math.ceil((projEnd - projStart) / (1000 * 60 * 60 * 24)) + 1;
      const hoursPerDay = totalHours / daysDiff;

      weekDays.forEach(day => {
        if (day >= projStart && day <= projEnd) {
          const ds = dateStr(day);
          if (dayMap[ds]) {
            dayMap[ds].hours += hoursPerDay;
            dayMap[ds].projects.add(project.id);
          }
        }
      });
    });

    return weekDays.map(day => dayMap[dateStr(day)]);
  }, [weekDays, projects]);

  const weekdayHours = dailyHours.filter((_, i) => i >= 1 && i <= 5);
  const weekdayTotal = weekdayHours.reduce((s, d) => s + d.hours, 0);

  // Project breakdown: total hours per project for this week
  const projectHours = useMemo(() => {
    const map = {};
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    projects.forEach(project => {
      const info = getProjectInfo(project);
      if (!info) return;

      const { totalHours, projStart, projEnd, color } = info;

      if (projEnd >= weekStart && projStart <= weekEnd) {
        const daysDiff = Math.ceil((projEnd - projStart) / (1000 * 60 * 60 * 24)) + 1;
        const hoursThisWeek = Math.min(totalHours, (totalHours / daysDiff) * 7);

        map[project.id] = {
          name: project.name,
          color,
          hours: Math.round(hoursThisWeek * 10) / 10,
        };
      }
    });

    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [weekDays, projects]);

  return (
    <div className="w-80 flex-shrink-0 glass-panel p-5 flex flex-col gap-5 h-fit sticky top-4 self-start">
      <div className="text-base font-bold text-text-hi">Capacity Overview</div>

      <BandwidthMeter used={weekdayTotal} total={WEEK_CAPACITY} label="THIS WEEK" />

      {/* Daily Breakdown */}
      <div className="border-t border-stroke-outer pt-4">
        <div className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3">
          Daily Breakdown
        </div>
        {dailyHours.map((d, i) => {
          const isWeekend = i === 0 || i === 6;
          const pct = Math.min((d.hours / DAY_CAPACITY) * 100, 100);

          const getColor = () => {
            if (pct > 90) return '#FF5C5C';
            if (pct > 75) return '#F6C244';
            return '#5AA2FF';
          };

          const color = getColor();
          const isToday = isSameDay(d.date, new Date());

          return (
            <div
              key={i}
              className="flex items-center gap-2.5 mb-2"
              style={{ opacity: isWeekend ? 0.35 : 1 }}
            >
              <span
                className={`text-xs w-9 flex-shrink-0 ${isToday ? 'font-bold text-info' : 'font-semibold text-text-subtle'}`}
              >
                {dayNames[d.date.getDay()]}
              </span>
              <div className="flex-1 h-1.5 rounded-sm bg-white/5">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isWeekend ? '#8B91A0' : color,
                  }}
                />
              </div>
              <span className="text-xs text-text-subtle w-8 text-right tabular-nums font-medium">
                {d.hours > 0 ? `${Math.round(d.hours)}h` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* By Project */}
      {projectHours.length > 0 && (
        <div className="border-t border-stroke-outer pt-4">
          <div className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3">
            By Project
          </div>
          {projectHours.map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-1 h-6 rounded-sm flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-muted font-medium truncate">{p.name}</div>
              </div>
              <span className="text-sm font-bold text-text-hi flex-shrink-0">{p.hours}h</span>
            </div>
          ))}
        </div>
      )}

      {/* Utilization warning */}
      {weekdayTotal > WEEK_CAPACITY * 0.85 && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-[11px] text-danger leading-relaxed">
          ⚠️ At <strong>{((weekdayTotal / WEEK_CAPACITY) * 100).toFixed(0)}%</strong> capacity.
          Consider deferring non-critical tasks.
        </div>
      )}
    </div>
  );
};

// Helper to get project color based on status
function getProjectColor(status) {
  const colors = {
    'live': '#21C37A',
    'beta': '#5AA2FF',
    'dev': '#F6C244',
    'planning': '#8B91A0',
    'paused': '#FF5C5C',
  };
  return colors[status?.toLowerCase()] || '#8B91A0';
}
