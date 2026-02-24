import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { CapacitySidebar } from '../ui/CapacitySidebar';
import { parseDate, formatDateShort, isSameDay } from '../../utils/dateUtils';

const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const LABEL_W = 'w-[320px]';

// Helper functions
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Alias centralized utilities
const formatShortDate = formatDateShort;

// Status indicator dot
function StatusDot({ status, size = 8 }) {
  const colors = {
    Done: '#21C37A',
    'In Progress': '#5AA2FF',
    Todo: '#8B91A0',
  };
  return (
    <span
      className="inline-block flex-shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: colors[status] || '#8B91A0',
      }}
    />
  );
}

// Status config with short display labels
const statusConfig = {
  Requested:        { label: 'Requested', color: '#8B91A0', bg: 'rgba(139,145,160,0.08)', border: 'rgba(139,145,160,0.19)' },
  'In Planning':    { label: 'Planning',  color: '#F6C244', bg: 'rgba(246,194,68,0.08)',  border: 'rgba(246,194,68,0.19)' },
  'In Development': { label: 'Dev',       color: '#5AA2FF', bg: 'rgba(90,162,255,0.08)',  border: 'rgba(90,162,255,0.19)' },
  'In Beta Testing':{ label: 'Beta',      color: '#D14B06', bg: 'rgba(209,75,6,0.08)',    border: 'rgba(209,75,6,0.19)' },
  Live:             { label: 'Live',      color: '#90E35E', bg: 'rgba(144,227,94,0.08)',  border: 'rgba(144,227,94,0.19)' },
};

// Day separator grid lines (behind content)
function GridLines({ days, totalDays }) {
  return (
    <div className="w-full h-full relative">
      {days.map((d, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{
            left: `${(i / totalDays) * 100}%`,
            width: '1px',
            backgroundColor: d.getDay() === 1
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(255,255,255,0.02)',
          }}
        />
      ))}
    </div>
  );
}

// Today line rendered as a separate top-level overlay (above everything)
function TodayLine({ days, totalDays, today }) {
  const todayIdx = days.findIndex((d) => isSameDay(d, today));
  if (todayIdx === -1) return null;
  return (
    <div
      className="absolute top-0 bottom-0"
      style={{
        left: `${((todayIdx + 0.5) / totalDays) * 100}%`,
        width: '2px',
        marginLeft: '-1px',
        background: 'linear-gradient(180deg, rgba(90,162,255,0.45) 0%, rgba(90,162,255,0.18) 100%)',
        boxShadow: '0 0 6px rgba(90,162,255,0.1)',
      }}
    />
  );
}

/**
 * TimelineView - Gantt chart showing projects and tasks over time
 */
export const TimelineView = React.memo(({ weekDays, projects, onProjectClick, searchTerm = '' }) => {
  const [expandedProjects, setExpandedProjects] = useState({});
  const [archivedExpanded, setArchivedExpanded] = useState({});
  const [hoveredTask, setHoveredTask] = useState(null);
  const today = new Date();

  // Extend timeline range: show 2 full weeks
  const timelineStart = weekDays[0];
  const timelineEnd = addDays(weekDays[0], 13);
  const totalDays = 14;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));

  const toggleProject = (id) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleArchive = (id) => {
    setArchivedExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter projects by search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(term));
  }, [projects, searchTerm]);

  // Expand/collapse all
  const allExpanded = filteredProjects.length > 0 && filteredProjects.every(p => expandedProjects[p.id]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedProjects({});
    } else {
      const next = { ...expandedProjects };
      filteredProjects.forEach(p => { next[p.id] = true; });
      setExpandedProjects(next);
    }
  };

  // Calculate task bar position (left % and width %)
  function getTaskBar(task) {
    const start = parseDate(task.startDate);
    const end = parseDate(task.endDate);
    const clampStart = start < timelineStart ? timelineStart : start;
    const clampEnd = end > timelineEnd ? timelineEnd : end;
    const leftPct = ((clampStart - timelineStart) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    const widthPct = (((clampEnd - clampStart) / (1000 * 60 * 60 * 24) + 1) / totalDays) * 100;
    const visibleDays = (clampEnd - clampStart) / (1000 * 60 * 60 * 24) + 1;
    return {
      left: `${leftPct}%`,
      width: `${Math.max(widthPct, 2)}%`,
      widthPct: Math.max(widthPct, 2),
      visibleDays,
      offScreen: end < timelineStart,
    };
  }

  return (
    <div className="flex gap-4 flex-1 items-start">
      {/* Main timeline area */}
      <div className="flex-1 min-w-0 flex flex-col gap-0 overflow-hidden">
        {/* Day header columns */}
        <div className="flex mb-0.5">
          <div className={`${LABEL_W} flex-shrink-0 flex items-end px-4 pb-2`}>
            {filteredProjects.length > 0 && (
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-[11px] text-text-subtle hover:text-text-muted transition-colors"
              >
                <ChevronDown
                  size={12}
                  className="transition-transform duration-200"
                  style={{ transform: allExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
                <span>{allExpanded ? 'Collapse all' : 'Expand all'}</span>
              </button>
            )}
          </div>
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={i}
                className="flex-1 text-center py-2 border-b border-stroke-outer relative"
                style={{
                  fontSize: '12px',
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#5AA2FF' : isWeekend ? 'rgba(139,145,160,0.4)' : '#8B91A0',
                }}
              >
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                  {dayNames[d.getDay()]}
                </div>
                <div style={{ fontSize: isToday ? '15px' : '14px' }}>{d.getDate()}</div>
                {isToday && (
                  <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-5 h-0.5 bg-info rounded-sm" />
                )}
              </div>
            );
          })}
        </div>

        {/* Project rows - wrapped in relative for shared grid overlay */}
        <div className="flex flex-col relative">
          {/* Day separator grid lines (behind content) */}
          <div className="absolute top-0 bottom-0 left-[320px] right-0 pointer-events-none z-[1]">
            <GridLines days={days} totalDays={totalDays} />
          </div>
          {/* Today line - floats above everything including archive */}
          <div className="absolute top-0 bottom-0 left-[320px] right-0 pointer-events-none z-[10]">
            <TodayLine days={days} totalDays={totalDays} today={today} />
          </div>

          {filteredProjects.map((project) => {
            const isExpanded = expandedProjects[project.id];
            const allTasks = project.tasks || [];
            const activeTasks = allTasks.filter((t) => t.status !== 'Done');
            const doneTasks = allTasks.filter((t) => t.status === 'Done');
            const totalTasks = allTasks.length;
            const doneCount = doneTasks.length;
            const totalHours = allTasks.reduce((s, t) => s + (t.hours || 0), 0);
            const sc = statusConfig[project.status];
            const isArchiveOpen = archivedExpanded[project.id];

            return (
              <div key={project.id}>
                {/* Project header row */}
                <div
                  className="flex items-center cursor-pointer transition-colors duration-150 border-b border-stroke-outer hover:bg-white/[0.02]"
                  onClick={() => toggleProject(project.id)}
                >
                  {/* Left label */}
                  <div className={`${LABEL_W} flex-shrink-0 py-2.5 px-4 flex items-center gap-2.5`}>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="#8B91A0"
                      className="flex-shrink-0 transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M2.5 1L7.5 5L2.5 9Z" />
                    </svg>
                    <div
                      className="w-[3px] h-[18px] rounded-sm flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-semibold text-text-hi truncate"
                        style={{ fontSize: '13px' }}
                      >
                        {project.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#B0B6C2', marginTop: '1px' }}>
                        {doneCount}/{totalTasks} tasks · {totalHours}h total
                      </div>
                    </div>
                    {sc && (
                      <span
                        className="ml-auto flex-shrink-0 uppercase"
                        style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          backgroundColor: sc.bg,
                          border: `1px solid ${sc.border}`,
                          color: sc.color,
                          letterSpacing: '0.3px',
                        }}
                      >
                        {sc.label}
                      </span>
                    )}
                  </div>

                  {/* Gantt area - project summary bar */}
                  <div className="flex-1 relative" style={{ height: '40px' }}>
                    {/* Summary bar spanning all tasks */}
                    {totalTasks > 0 && (() => {
                      const allStarts = allTasks.map((t) => parseDate(t.startDate));
                      const allEnds = allTasks.map((t) => parseDate(t.endDate));
                      const earliest = new Date(Math.min(...allStarts));
                      const latest = new Date(Math.max(...allEnds));
                      const bar = getTaskBar({
                        startDate: dateStr(earliest),
                        endDate: dateStr(latest),
                      });
                      const progress = totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0;

                      // Date goes inside the bar when wide enough, outside when narrow
                      const dateInside = bar.widthPct >= 30;
                      const endDateStr = formatShortDate(dateStr(latest));

                      return (
                        <>
                          <div
                            className="absolute"
                            style={{
                              top: '10px',
                              height: '22px',
                              left: bar.left,
                              minWidth: progress > 15 ? '54px' : undefined,
                              width: bar.width,
                              borderRadius: '6px',
                              backgroundColor: `${project.color}20`,
                              border: `1px solid ${project.color}40`,
                            }}
                          >
                            <div
                              className="h-full transition-all duration-[400ms]"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: `${project.color}50`,
                                borderRadius: '5px',
                              }}
                            />
                            {progress > 15 && (
                              <span
                                className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap"
                                style={{
                                  left: '8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: project.color,
                                  letterSpacing: '0.3px',
                                }}
                              >
                                {Math.round(progress)}%
                              </span>
                            )}
                            {/* End date inside bar (right-aligned) when bar is wide */}
                            {dateInside && (
                              <span
                                className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap"
                                style={{
                                  right: '8px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#B0B6C2',
                                }}
                              >
                                {endDateStr}
                              </span>
                            )}
                          </div>
                          {/* End date outside bar when bar is narrow — positioned relative to minWidth */}
                          {!dateInside && (
                            <span
                              className="absolute whitespace-nowrap"
                              style={{
                                top: '13px',
                                left: `calc(${bar.left} + ${progress > 15 ? 'max(' + bar.width + ', 54px)' : bar.width} + 8px)`,
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#B0B6C2',
                              }}
                            >
                              {endDateStr}
                            </span>
                          )}
                        </>
                      );
                    })()}

                    {/* Milestones */}
                    {project.milestones?.map((m, mi) => {
                      const md = parseDate(m.date);
                      const idx = days.findIndex((d) => isSameDay(d, md));
                      if (idx === -1) return null;
                      return (
                        <div
                          key={mi}
                          title={m.name}
                          className="absolute z-[3] cursor-default"
                          style={{
                            left: `${((idx + 0.5) / totalDays) * 100}%`,
                            top: '8px',
                            transform: 'translateX(-50%)',
                            fontSize: '12px',
                          }}
                        >
                          {m.icon || '\u25C6'}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded task rows */}
                {isExpanded && (
                  <>
                    {/* Active tasks */}
                    {activeTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={project}
                        bar={getTaskBar(task)}
                        isHovered={hoveredTask === task.id}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                      />
                    ))}

                    {/* Archive section for completed tasks - no grid lines */}
                    {doneTasks.length > 0 && (
                      <div className="relative z-[2]" style={{ backgroundColor: 'var(--color-base, #1D1D21)' }}>
                        <div
                          className="flex items-center cursor-pointer border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleArchive(project.id); }}
                        >
                          <div className={`${LABEL_W} flex-shrink-0 py-1.5 px-4 flex items-center gap-2`} style={{ paddingLeft: '44px' }}>
                            <ChevronDown
                              size={12}
                              className="text-text-subtle transition-transform duration-200 flex-shrink-0"
                              style={{ transform: isArchiveOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                            />
                            <span style={{ fontSize: '11px', color: '#8B91A0', fontWeight: 500 }}>
                              Archive ({doneTasks.length} completed)
                            </span>
                          </div>
                          <div className="flex-1" />
                        </div>

                        {isArchiveOpen && doneTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            project={project}
                            bar={getTaskBar(task)}
                            isHovered={hoveredTask === task.id}
                            onMouseEnter={() => setHoveredTask(task.id)}
                            onMouseLeave={() => setHoveredTask(null)}
                            archived
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Capacity Sidebar */}
      <CapacitySidebar weekDays={weekDays} projects={projects} />
    </div>
  );
});

/** Individual task row - extracted for reuse in active/archived sections */
function TaskRow({ task, project, bar, isHovered, onMouseEnter, onMouseLeave, archived }) {
  const subtaskDone = task.subtasks?.filter((s) => s.done).length || 0;
  const subtaskTotal = task.subtasks?.length || 0;

  return (
    <div
      className="flex items-center border-b border-white/[0.02] transition-colors duration-100"
      style={{
        backgroundColor: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        opacity: archived ? 0.4 : 1,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Task label */}
      <div className={`${LABEL_W} flex-shrink-0 py-2 px-4 flex items-center gap-2`} style={{ paddingLeft: '44px' }}>
        <StatusDot status={task.status} />
        <div className="min-w-0 flex-1">
          <div
            className="truncate"
            style={{
              fontSize: '12px',
              color: archived ? '#6B7080' : task.status === 'Done' ? '#8B91A0' : '#C7CBD1',
              textDecoration: archived ? 'line-through' : 'none',
            }}
          >
            {task.name}
          </div>
          {subtaskTotal > 0 ? (
            <div style={{ fontSize: '11px', color: '#8B91A0', marginTop: '1px' }}>
              {subtaskDone}/{subtaskTotal} subtasks · {task.hours || 0}h
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#8B91A0', marginTop: '1px' }}>
              {task.hours || 0}h estimated
            </div>
          )}
        </div>
      </div>

      {/* Gantt bar */}
      <div className="flex-1 relative" style={{ height: '36px' }}>
        <div
          className="absolute cursor-pointer transition-all duration-150 flex items-center overflow-hidden"
          style={{
            top: '10px',
            height: '16px',
            left: bar.left,
            width: bar.width,
            borderRadius: '4px',
            backgroundColor: archived ? 'rgba(139,145,160,0.12)' : task.status === 'Done' ? `${project.color}30` : `${project.color}60`,
            border: archived
              ? '1px solid rgba(139,145,160,0.15)'
              : isHovered ? `1px solid ${project.color}` : `1px solid ${project.color}40`,
            paddingLeft: '6px',
            // Diagonal strikethrough for archived tasks
            ...(archived ? {
              backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(139,145,160,0.15) 3px, rgba(139,145,160,0.15) 4px)',
            } : {}),
          }}
        >
          {/* Subtask progress inside bar */}
          {!archived && subtaskTotal > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: `${(subtaskDone / subtaskTotal) * 100}%`,
                backgroundColor: `${project.color}30`,
                borderRadius: '3px',
              }}
            />
          )}
          <span
            className="relative z-[1] truncate"
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: archived ? '#6B7080' : '#F7F8FA',
            }}
          >
            {task.hours || 0}h
          </span>
        </div>
      </div>
    </div>
  );
}
