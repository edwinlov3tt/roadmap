import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ExternalLink, ChevronDown, ChevronUp, Search, Filter, SortAsc } from 'lucide-react';
import { formatDate as formatDateUtil } from '../utils/dateUtils';

const API_BASE = window.location.origin + '/roadmap';

const PublicViewExecutive = () => {
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUpdates, setExpandedUpdates] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('last_updated');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/public/projects`);
      setAllProjects(response.data);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort projects
  useEffect(() => {
    let filteredProjects = [...allProjects];

    // Apply search filter
    if (searchTerm) {
      filteredProjects = filteredProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.fider_tag_name && project.fider_tag_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredProjects = filteredProjects.filter(project => project.status === statusFilter);
    }

    // Apply sorting
    filteredProjects.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'last_updated':
          return new Date(b.last_updated_at) - new Date(a.last_updated_at);
        case 'update_count':
          return parseInt(b.update_count) - parseInt(a.update_count);
        default:
          return 0;
      }
    });

    setProjects(filteredProjects);
  }, [allProjects, searchTerm, statusFilter, sortBy]);

  const fetchUpdates = async (projectId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/public/projects/${projectId}/updates`);
      setUpdates(response.data);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    fetchUpdates(project.id);
  };

  const formatDate = (d) => formatDateUtil(d) || 'No date';

  const toggleUpdateExpansion = (updateId) => {
    setExpandedUpdates(prev => ({
      ...prev,
      [updateId]: !prev[updateId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Project Roadmap
            </h1>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Executive overview of project status, development progress, and strategic initiatives across all product lines.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Projects Available</h2>
            <p className="text-gray-600">Project data will appear here once configured.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Executive Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Portfolio Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{allProjects.filter(p => p.status === 'Live').length}</div>
                  <div className="text-sm text-green-700 font-medium">Live Projects</div>
                  <div className="text-xs text-green-600 mt-1">Production Ready</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">{allProjects.filter(p => p.status === 'In Beta Testing').length}</div>
                  <div className="text-sm text-orange-700 font-medium">In Beta Testing</div>
                  <div className="text-xs text-orange-600 mt-1">User Validation</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{allProjects.filter(p => p.status === 'In Development').length}</div>
                  <div className="text-sm text-red-700 font-medium">In Development</div>
                  <div className="text-xs text-red-600 mt-1">Active Development</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-600">{allProjects.reduce((sum, p) => sum + parseInt(p.update_count), 0)}</div>
                  <div className="text-sm text-gray-700 font-medium">Total Updates</div>
                  <div className="text-xs text-gray-600 mt-1">This Quarter</div>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search projects, descriptions, or tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none"
                    >
                      <option value="all">All Status</option>
                      <option value="Live">Live</option>
                      <option value="In Beta Testing">In Beta Testing</option>
                      <option value="In Development">In Development</option>
                    </select>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <div className="relative">
                    <SortAsc className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none"
                    >
                      <option value="last_updated">Last Updated</option>
                      <option value="name">Name A-Z</option>
                      <option value="status">Status</option>
                      <option value="update_count">Update Count</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Results Count */}
              <div className="mt-4 text-sm text-gray-600">
                Showing {projects.length} of {allProjects.length} projects
                {searchTerm && ` matching "${searchTerm}"`}
                {statusFilter !== 'all' && ` with status "${statusFilter}"`}
              </div>
            </div>

            {/* Project Cards */}
            {projects.length === 0 && allProjects.length > 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Projects Found</h2>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {projects.map(project => (
                <div key={project.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                          {project.current_version && (
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">v{project.current_version}</span>
                          )}
                        </div>
                        {project.fider_tag_name && (
                          <div
                            className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: `#${project.fider_tag_color}20`,
                              color: `#${project.fider_tag_color}`,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: `#${project.fider_tag_color}40`
                            }}
                          >
                            {project.fider_tag_name}
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        project.status === 'Live' ? 'bg-green-100 text-green-800 border border-green-200' :
                        project.status === 'In Beta Testing' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {project.status}
                      </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Project Purpose</h4>
                        <p className="text-gray-700 leading-relaxed text-sm">{project.description}</p>
                      </div>
                    )}

                    {/* Next Steps */}
                    {project.next_steps && (
                      <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">Next Steps</h4>
                        <p className="text-gray-700 text-sm">{project.next_steps}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Updated {formatDate(project.last_updated_at)}</span>
                        </div>
                        <span className="text-red-600 font-medium">{project.update_count} updates</span>
                      </div>
                      {project.project_url && (
                        <a
                          href={project.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Project
                        </a>
                      )}
                    </div>

                    {/* Updates Button */}
                    {parseInt(project.update_count) > 0 && (
                      <button
                        onClick={() => handleProjectSelect(project)}
                        className="w-full mt-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-sm font-medium border border-red-200"
                      >
                        View Recent Updates ({project.update_count})
                      </button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Updates Modal/Overlay */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{selectedProject.name} - Recent Updates</h3>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96 p-6">
              {updates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No updates available for this project.</p>
              ) : (
                <div className="space-y-4">
                  {updates.map(update => (
                    <div key={update.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          update.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          update.status === 'In Progress' ? 'bg-red-100 text-red-800' :
                          update.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {update.status}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(update.created_at)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {Array.isArray(update.notes) ? update.notes.map((note, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-red-600 mr-2 mt-1">•</span>
                            <span className="text-gray-700">{note}</span>
                          </div>
                        )) : (
                          <div className="flex items-start">
                            <span className="text-red-600 mr-2 mt-1">•</span>
                            <span className="text-gray-700">{update.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicViewExecutive;