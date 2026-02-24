import React, { useMemo } from 'react';
import { BandwidthMeter } from '../ui/BandwidthMeter';
import { CapacitySidebar } from '../ui/CapacitySidebar';
import { parseDate, isSameDay } from '../../utils/dateUtils';

const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_CAPACITY = 8;
const HOUR_HEIGHT = 64;

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekDays(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const mon = addDays(d, -((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatHour(h) {
  const hour = Math.floor(h);
  const min = h % 1 === 0.5 ? '30' : '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${min} ${ampm}`;
}

// Project color palette for time blocks
const blockColors = [
  '#5AA2FF', '#21C37A', '#F6C244', '#D14B06', '#A78BFA',
  '#F472B6', '#38BDF8', '#FB923C', '#4ADE80', '#E879F9',
];

/**
 * Generate synthetic time blocks from project task data.
 * Distributes tasks across the week as realistic work blocks.
 */
function generateTimeBlocks(projects, weekDays) {
  if (!projects || !weekDays?.length) return [];

  const blocks = [];
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  // Collect active tasks from all projects
  const activeTasks = [];
  projects.forEach((project, pIdx) => {
    const color = blockColors[pIdx % blockColors.length];
    (project.tasks || []).forEach((task) => {
      if (task.status === 'Done') return;
      const start = parseDate(task.startDate);
      const end = parseDate(task.endDate);
      // Only include tasks that overlap this week
      if (end >= weekStart && start <= weekEnd) {
        activeTasks.push({
          taskId: task.id,
          taskName: task.name,
          projectName: project.name,
          color,
          hours: task.hours,
          subtasks: task.subtasks || [],
          status: task.status,
        });
      }
    });
  });

  // Distribute tasks across weekdays (Mon-Fri)
  const weekdaySlots = weekDays
    .map((d, i) => ({ date: d, dateStr: dateStr(d), dayIdx: i }))
    .filter((d) => d.date.getDay() !== 0 && d.date.getDay() !== 6);

  let currentHour = 9; // Start at 9 AM
  let dayIdx = 0;

  activeTasks.forEach((task) => {
    let remainingHours = Math.min(task.hours, 16); // Cap at 16h per task for display
    let blockNum = 0;

    while (remainingHours > 0 && dayIdx < weekdaySlots.length) {
      const slot = weekdaySlots[dayIdx];
      const blockHours = Math.min(remainingHours, 18 - currentHour, 3); // Max 3h blocks, end by 6PM

      if (blockHours >= 0.5) {
        blocks.push({
          taskId: task.taskId,
          date: slot.dateStr,
          startHour: currentHour,
          endHour: currentHour + blockHours,
          label: `${task.projectName} – ${task.taskName}`,
          projectName: task.projectName,
          color: task.color,
          subtasks: blockNum === 0 ? task.subtasks : [],
          status: task.status,
        });
        remainingHours -= blockHours;
        currentHour += blockHours + 0.5; // 30min gap between blocks
        blockNum++;
      }

      // Move to next day if past 5:30 PM
      if (currentHour >= 17.5) {
        dayIdx++;
        currentHour = 9;
      }
    }
  });

  return blocks;
}

/**
 * CalendarView - Day-by-day time block scheduling view
 */
export const CalendarView = React.memo(({ selectedDay, onSelectDay, projects, weekDays, searchTerm = '' }) => {
  const today = new Date();
  const currentDay = selectedDay || today;
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM
  const weekDaysForStrip = getWeekDays(currentDay);

  // Generate time blocks from project data
  const allBlocks = useMemo(
    () => generateTimeBlocks(projects, weekDays || weekDaysForStrip),
    [projects, weekDays, weekDaysForStrip]
  );

  // Filter blocks by search term
  const filteredBlocks = useMemo(() => {
    if (!searchTerm?.trim()) return allBlocks;
    const term = searchTerm.toLowerCase();
    return allBlocks.filter(b => b.label.toLowerCase().includes(term));
  }, [allBlocks, searchTerm]);

  const dayBlocks = filteredBlocks.filter((b) => b.date === dateStr(currentDay));
  const dayUsedHours = dayBlocks.reduce((s, b) => s + (b.endHour - b.startHour), 0);

  // Calculate hours per day for the week strip
  const dayHoursMap = useMemo(() => {
    const map = {};
    filteredBlocks.forEach((b) => {
      map[b.date] = (map[b.date] || 0) + (b.endHour - b.startHour);
    });
    return map;
  }, [filteredBlocks]);

  // Current time for the indicator
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;

  return (
    <div className="flex gap-6 items-start">
    <div className="flex-1 min-w-0 flex flex-col gap-0">
      {/* Week day selector strip */}
      <div className="flex gap-1 pb-3 border-b border-stroke-outer mb-0">
        {weekDaysForStrip.map((d, i) => {
          const isSelected = isSameDay(d, currentDay);
          const isToday = isSameDay(d, today);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const ds = dateStr(d);
          const dayHours = dayHoursMap[ds] || 0;

          return (
            <button
              key={i}
              onClick={() => onSelectDay(d)}
              className={`flex-1 p-2.5 px-1 rounded-lg border transition-all duration-150 flex flex-col items-center gap-1
                ${isSelected ? 'border-info/40 bg-info/8' : 'border-transparent hover:bg-white/5'}
                ${isWeekend ? 'opacity-40' : 'opacity-100'}
              `}
            >
              <span className={`text-[9px] font-semibold uppercase tracking-wide ${isToday ? 'text-info' : 'text-text-subtle'}`}>
                {dayNames[d.getDay()]}
              </span>
              <span
                className={`text-lg font-medium w-8 h-8 flex items-center justify-center rounded-full
                  ${isToday ? 'font-bold text-info bg-info/15' : isSelected ? 'text-text-hi' : 'text-text-muted'}
                `}
              >
                {d.getDate()}
              </span>
              {dayHours > 0 && (
                <span className="text-[9px] font-medium" style={{ color: dayHours >= DAY_CAPACITY ? '#F6C244' : '#8B91A0' }}>
                  {dayHours.toFixed(1)}h
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day header */}
      <div className="py-3.5 flex items-center justify-between">
        <div>
          <span className="text-lg font-semibold text-text-hi">
            {monthNames[currentDay.getMonth()]} {currentDay.getDate()}, {currentDay.getFullYear()}
          </span>
          {isSameDay(currentDay, today) && (
            <span className="ml-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-info/12 border border-info/25 text-info uppercase tracking-wide">
              Today
            </span>
          )}
        </div>
        <BandwidthMeter
          used={dayUsedHours}
          total={DAY_CAPACITY}
          label="Day capacity"
          compact
        />
      </div>

      {/* Time grid */}
      <div
        className="relative flex-1 rounded-xl overflow-hidden border border-stroke-outer"
        style={{
          minHeight: `${hours.length * HOUR_HEIGHT}px`,
          backgroundColor: 'rgba(29,29,33,0.5)',
        }}
      >
        {/* Hour lines */}
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-start"
            style={{
              top: `${i * HOUR_HEIGHT}px`,
              height: `${HOUR_HEIGHT}px`,
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}
          >
            <span
              className="flex-shrink-0 tabular-nums text-right"
              style={{
                width: '76px',
                padding: '6px 12px 0 0',
                fontSize: '10px',
                color: '#8B91A0',
              }}
            >
              {formatHour(h)}
            </span>
          </div>
        ))}

        {/* Current time indicator */}
        {isSameDay(currentDay, today) && nowHour >= 8 && nowHour <= 19 && (
          <>
            <div
              className="absolute z-[10]"
              style={{
                top: `${(nowHour - 8) * HOUR_HEIGHT}px`,
                left: '68px',
                right: 0,
                height: '2px',
                backgroundColor: '#CF0E0F',
                boxShadow: '0 0 8px rgba(207,14,15,0.4)',
              }}
            />
            <div
              className="absolute z-[11]"
              style={{
                top: `${(nowHour - 8) * HOUR_HEIGHT - 4}px`,
                left: '64px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#CF0E0F',
              }}
            />
          </>
        )}

        {/* Time blocks */}
        {dayBlocks.map((block, i) => {
          const topPx = (block.startHour - 8) * HOUR_HEIGHT;
          const heightPx = (block.endHour - block.startHour) * HOUR_HEIGHT;
          const duration = block.endHour - block.startHour;
          const color = block.color;
          const subtaskDone = block.subtasks?.filter((s) => s.done).length || 0;
          const subtaskTotal = block.subtasks?.length || 0;

          return (
            <div
              key={i}
              className="absolute cursor-pointer transition-all duration-150 overflow-hidden flex flex-col gap-0.5 group"
              style={{
                top: `${topPx + 2}px`,
                left: '84px',
                right: '12px',
                height: `${heightPx - 4}px`,
                borderRadius: '10px',
                backgroundColor: `${color}15`,
                border: `1px solid ${color}35`,
                padding: '8px 12px',
                zIndex: 5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${color}25`;
                e.currentTarget.style.borderColor = `${color}60`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${color}15`;
                e.currentTarget.style.borderColor = `${color}35`;
              }}
            >
              {/* Accent bar */}
              <div
                className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm"
                style={{ backgroundColor: color }}
              />

              {/* Header: label + duration */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text-hi truncate">
                  {block.label}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="text-[10px] font-semibold rounded px-1.5 py-px"
                    style={{ backgroundColor: `${color}25`, color }}
                  >
                    {duration.toFixed(duration % 1 ? 1 : 0)}h
                  </span>
                  <span className="text-[10px] text-text-subtle">
                    {formatHour(block.startHour)} – {formatHour(block.endHour)}
                  </span>
                </div>
              </div>

              {/* Subtask progress */}
              {subtaskTotal > 0 && heightPx > 60 && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex gap-0.5">
                    {block.subtasks.map((st, si) => (
                      <div
                        key={si}
                        className="rounded-sm"
                        style={{
                          width: '14px',
                          height: '3px',
                          backgroundColor: st.done ? color : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-text-subtle">
                    {subtaskDone}/{subtaskTotal}
                  </span>
                </div>
              )}

              {/* Project name + status */}
              {heightPx > 50 && (
                <div className="flex items-center gap-1 mt-auto">
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-text-subtle">{block.projectName}</span>
                  {block.status && (
                    <span className="ml-auto text-[9px] font-medium text-text-subtle">
                      {block.status}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {dayBlocks.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-text-subtle text-sm">
            <div className="text-3xl mb-2 opacity-30">📅</div>
            No time blocks scheduled
          </div>
        )}
      </div>
    </div>

    {/* Capacity Sidebar */}
    <CapacitySidebar weekDays={weekDays || weekDaysForStrip} projects={projects || []} />
    </div>
  );
});
