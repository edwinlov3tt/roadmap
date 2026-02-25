import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { AnimatePresence } from 'framer-motion';
import { LayoutGrid, CalendarDays, GanttChartSquare, Search, X, Plus, Settings, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { BoardView } from './views/BoardView';
import { TimelineView } from './views/TimelineView';
import { CalendarView } from './views/CalendarView';
import { AdminProjectDetail } from './admin/AdminProjectDetail';
import { AdminProjectForm } from './admin/AdminProjectForm';
import { TabBtn } from './ui/TabBtn';
import { NavArrow } from './ui/NavArrow';
import { projectsToTimelineFormat, getWeekDays } from '../utils/dataAdapters';

const API_BASE = window.location.origin + '/roadmap';

const statusColumns = [
  { id: 'Live', label: 'Live', color: '#90E35E' },
  { id: 'In Beta Testing', label: 'Beta', color: '#D14B06' },
  { id: 'In Development', label: 'Dev', color: '#5AA2FF' },
  { id: 'In Planning', label: 'Planning', color: '#F6C244' },
  { id: 'Requested', label: 'Requested', color: '#8B91A0', dotted: true }
];

// Board context bar — same as PublicView
const BoardContextBar = React.memo(({ projects, focusedStatus, onFocusStatus, searchTerm, onSearchChange }) => {
  const kpis = useMemo(() => ({
    live: projects.filter(p => p.status === 'Live').length,
    beta: projects.filter(p => p.status === 'In Beta Testing').length,
    dev: projects.filter(p => p.status === 'In Development').length,
    planning: projects.filter(p => p.status === 'In Planning').length,
    requested: projects.filter(p => p.status === 'Requested').length
  }), [projects]);

  const focusStatus = (status) => {
    onFocusStatus(focusedStatus === status ? null : status);
    onSearchChange('');
  };

  return (
    <div className="glass-panel p-3 px-4 flex items-center justify-between mb-4 gap-4 mr-6 md:mr-7">
      <div className="flex items-center gap-2">
        {focusedStatus && (
          <button
            onClick={() => onFocusStatus(null)}
            className="glass-panel px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer border border-white/20 text-xs"
          >
            <X className="size-3 text-text-muted" />
            <span className="text-text-subtle">Clear</span>
          </button>
        )}
        {statusColumns.map(col => (
          <button
            key={col.id}
            onClick={() => focusStatus(col.id)}
            className={clsx(
              "glass-panel px-2.5 py-1.5 flex items-center gap-1.5 transition-all duration-200 cursor-pointer text-xs",
              focusedStatus === col.id
                ? "ring-2 bg-white/10"
                : focusedStatus
                  ? "opacity-40 hover:opacity-70"
                  : "hover:bg-white/10"
            )}
            style={focusedStatus === col.id ? { '--tw-ring-color': `${col.color}50` } : undefined}
          >
            <span
              className={clsx("size-2 rounded-full", col.dotted && "border border-dashed border-zinc-400 bg-transparent")}
              style={col.dotted ? {} : { backgroundColor: col.color }}
            />
            <span className="font-medium text-text-hi">
              {kpis[col.id === 'In Beta Testing' ? 'beta' : col.id === 'In Development' ? 'dev' : col.id === 'In Planning' ? 'planning' : col.id.toLowerCase()]}
            </span>
            <span className="text-text-subtle uppercase tracking-wider">{col.label}</span>
          </button>
        ))}
      </div>

      <div className="w-[320px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-glass pl-10 w-full text-sm"
        />
      </div>
    </div>
  );
});

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatWeekRange(weekDays) {
  const start = weekDays[0];
  const end = weekDays[6];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (start.getMonth() === end.getMonth()) {
    return `${monthNames[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
}

export const AdminDashboard = ({ onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiderTags, setFiderTags] = useState([]);

  // View state
  const [view, setView] = useState('board');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [boardSearch, setBoardSearch] = useState('');
  const [focusedStatus, setFocusedStatus] = useState(null);

  // Admin state
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchFiderTags();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/public/projects`);
      setProjects(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiderTags = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/fider-tags`);
      setFiderTags(res.data);
    } catch (err) {
      console.error('Error fetching Fider tags:', err);
    }
  };

  const refreshProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/public/projects`);
      setProjects(response.data);
      // Update selected project if it's open
      if (selectedProject) {
        const updated = response.data.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err) {
      console.error('Error refreshing projects:', err);
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  const handleCloseDetail = async () => {
    setSelectedProject(null);
    // Refresh projects in background after close
    try {
      const response = await axios.get(`${API_BASE}/api/public/projects`);
      setProjects(response.data);
    } catch (err) {
      console.error('Error refreshing projects:', err);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      await axios.post(`${API_BASE}/api/projects`, projectData);
      setShowCreateModal(false);
      await refreshProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  // Week navigation
  const currentWeekDays = getWeekDays(addDays(new Date(), weekOffset * 7));
  const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setWeekOffset(prev => prev + 1);
  const handleToday = () => setWeekOffset(0);

  const timelineProjects = projectsToTimelineFormat(projects);

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 border-4 border-elevation-3 border-t-accent rounded-full animate-spin mb-4" />
          <p className="text-text-muted">Loading admin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchProjects} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-base pt-6 pl-6 pr-0 md:pt-7 md:pl-7 md:pr-0 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3 pr-6 md:pr-7">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold leading-[30px] tracking-tight text-text-hi">Admin Dashboard</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded px-2 py-0.5">
              Admin
            </span>
          </div>
          <p className="text-[13px] text-text-subtle mt-1">Manage projects, tasks, and updates</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View public site */}
          <a
            href="/roadmap"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-subtle hover:text-text-muted transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public View
          </a>

          {/* New Project button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/80 transition-colors px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* View Tabs */}
          <TabBtn active={view === 'board'} label="Kanban" icon={<LayoutGrid size={14} />} onClick={() => setView('board')} />
          <TabBtn active={view === 'timeline'} label="Timeline" icon={<GanttChartSquare size={14} />} onClick={() => setView('timeline')} />
          <TabBtn active={view === 'calendar'} label="Calendar" icon={<CalendarDays size={14} />} onClick={() => setView('calendar')} />
        </div>
      </div>

      {/* Context Bar */}
      {(view === 'timeline' || view === 'calendar') ? (
        <div className="glass-panel p-3 px-4 flex items-center justify-between mb-4 mr-6 md:mr-7">
          <div className="flex items-center gap-2">
            <NavArrow direction="left" onClick={handlePrevWeek} />
            <NavArrow direction="right" onClick={handleNextWeek} />
            <span className="text-sm font-semibold text-text-hi ml-1">
              {formatWeekRange(currentWeekDays)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToday}
              className="text-xs font-semibold text-info hover:text-info/80 transition-colors px-3 py-1.5 rounded-lg bg-info/10 border border-info/20 hover:bg-info/15"
            >
              Today
            </button>
            <div className="w-px h-5 bg-white/10" />
            <div className="w-[220px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" />
              <input
                type="text"
                placeholder={view === 'timeline' ? 'Search projects...' : 'Search tasks...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-glass pl-9 w-full text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  <X className="w-3 h-3 text-text-subtle" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <BoardContextBar
          projects={projects}
          focusedStatus={focusedStatus}
          onFocusStatus={setFocusedStatus}
          searchTerm={boardSearch}
          onSearchChange={setBoardSearch}
        />
      )}

      {/* View Content */}
      <div className={`flex-1 min-h-0 ${view === 'board' ? 'overflow-hidden' : 'overflow-y-auto pr-6 md:pr-7 pb-8'}`}>
        {view === 'board' && (
          <BoardView projects={projects} onProjectClick={handleProjectClick} focusedStatus={focusedStatus} searchTerm={boardSearch} />
        )}
        {view === 'timeline' && (
          <TimelineView weekDays={currentWeekDays} projects={timelineProjects} onProjectClick={handleProjectClick} searchTerm={searchTerm} />
        )}
        {view === 'calendar' && (
          <CalendarView selectedDay={selectedDay} onSelectDay={setSelectedDay} projects={timelineProjects} weekDays={currentWeekDays} searchTerm={searchTerm} />
        )}
      </div>

      {/* Admin Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <AdminProjectDetail
            project={selectedProject}
            fiderTags={fiderTags}
            onClose={handleCloseDetail}
            onRefresh={refreshProjects}
          />
        )}
      </AnimatePresence>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <AdminProjectForm
            fiderTags={fiderTags}
            onSubmit={handleCreateProject}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center hover:bg-red-700 transition-all z-50 hover:scale-105"
        title="New Project"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
