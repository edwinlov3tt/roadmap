import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Calendar, Tag, FileText, Loader, ExternalLink, Download, Settings, Trash2, Edit, Upload, Key, RefreshCw, Copy, Check, Book } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { ImageUpload, ImageGallery } from './ui/ImageUpload';

const API_BASE = window.location.origin + '/roadmap';

const AdminView = () => {
  const [projects, setProjects] = useState([]);
  const [fiderTags, setFiderTags] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showNewUpdate, setShowNewUpdate] = useState(false);
  const [showFiderImport, setShowFiderImport] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [completedPosts, setCompletedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jsonImportData, setJsonImportData] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [projectImages, setProjectImages] = useState([]);

  const [newProject, setNewProject] = useState({
    name: '',
    current_version: '',
    next_steps: '',
    launched_date: '',
    project_url: '',
    fider_tag_id: '',
    description: '',
    status: 'Requested'
  });

  const [newUpdate, setNewUpdate] = useState({
    status: 'In Progress',
    notes: '',
    update_date: ''
  });

  const [editProject, setEditProject] = useState({
    name: '',
    current_version: '',
    next_steps: '',
    launched_date: '',
    project_url: '',
    fider_tag_id: '',
    description: '',
    status: 'Requested'
  });

  // API Token management state
  const [apiTokens, setApiTokens] = useState([]);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState(null);
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchProjects(),
      fetchFiderTags()
    ]).finally(() => setLoading(false));
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/projects`);
      setProjects(response.data);
      if (response.data.length > 0) {
        // Fetch the first project with its updates and images
        const firstProjectResponse = await axios.get(`${API_BASE}/api/projects/${response.data[0].id}`);
        setCurrentProject(firstProjectResponse.data);
        setProjectImages(firstProjectResponse.data.images || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchFiderTags = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/fider-tags`);
      setFiderTags(response.data);
    } catch (error) {
      console.error('Error fetching Fider tags:', error);
    }
  };

  const fetchCompletedPosts = async (tagId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/fider-completed/${tagId}`);
      setCompletedPosts(response.data);
    } catch (error) {
      console.error('Error fetching completed posts:', error);
    }
  };

  // Statuses that don't require a version number
  const versionOptionalStatuses = ['Requested', 'In Planning', 'In Development'];

  const handleCreateProject = async () => {
    const versionRequired = !versionOptionalStatuses.includes(newProject.status);
    if (!newProject.name || !newProject.description || (versionRequired && !newProject.current_version)) return;

    try {
      const response = await axios.post(`${API_BASE}/api/projects`, newProject);
      setProjects([response.data, ...projects]);
      setCurrentProject(response.data);
      setNewProject({ name: '', current_version: '', next_steps: '', launched_date: '', project_url: '', fider_tag_id: '', description: '', status: 'Requested' });
      setShowNewProject(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    }
  };

  const handleEditProject = () => {
    if (!currentProject) return;

    // Populate edit form with current project data
    setEditProject({
      name: currentProject.name || '',
      current_version: currentProject.current_version || '',
      next_steps: currentProject.next_steps || '',
      launched_date: currentProject.launched_date || '',
      project_url: currentProject.project_url || '',
      fider_tag_id: currentProject.fider_tag_id || '',
      description: currentProject.description || '',
      status: currentProject.status || 'Requested'
    });
    setShowEditProject(true);
  };

  const handleUpdateProject = async () => {
    const versionRequired = !versionOptionalStatuses.includes(editProject.status);
    if (!editProject.name || !editProject.description || !currentProject || (versionRequired && !editProject.current_version)) return;

    try {
      const response = await axios.put(`${API_BASE}/api/projects/${currentProject.id}`, editProject);

      // Update projects list
      const updatedProjects = projects.map(p =>
        p.id === currentProject.id ? { ...p, ...response.data } : p
      );
      setProjects(updatedProjects);

      // Update current project
      const updatedProjectResponse = await axios.get(`${API_BASE}/api/projects/${currentProject.id}`);
      setCurrentProject(updatedProjectResponse.data);

      setShowEditProject(false);
      alert('Project updated successfully!');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/api/projects/${projectId}`, {
        headers: { 'x-admin-email': 'edwin@edwinlovett.com' }
      });

      // Remove project from state
      setProjects(projects.filter(p => p.id !== projectId));

      // If this was the current project, clear it
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(null);
      }

      alert('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project');
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.notes.trim() || !currentProject) return;

    setIsProcessingAI(true);
    try {
      const response = await axios.post(`${API_BASE}/api/projects/${currentProject.id}/updates`, newUpdate);
      
      // Refresh the current project to get updated data
      const updatedProject = await axios.get(`${API_BASE}/api/projects/${currentProject.id}`);
      setCurrentProject(updatedProject.data);
      
      // Refresh projects list
      fetchProjects();
      
      setNewUpdate({ status: 'In Progress', notes: '', update_date: '' });
      setShowNewUpdate(false);
    } catch (error) {
      console.error('Error adding update:', error);
      alert('Error adding update');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleImportFiderPost = async (postId) => {
    try {
      await axios.post(`${API_BASE}/api/import-fider-post`, {
        projectId: currentProject.id,
        fiderPostId: postId,
        status: 'Completed'
      });
      
      // Refresh the current project
      const updatedProject = await axios.get(`${API_BASE}/api/projects/${currentProject.id}`);
      setCurrentProject(updatedProject.data);
      
      // Refresh projects list
      fetchProjects();
      
      alert('Fider post imported successfully!');
      setShowFiderImport(false);
    } catch (error) {
      console.error('Error importing Fider post:', error);
      alert('Error importing Fider post');
    }
  };

  const handleBulkJsonImport = async () => {
    if (!jsonImportData.trim()) return;

    try {
      const projectsData = JSON.parse(jsonImportData);

      if (!Array.isArray(projectsData)) {
        alert('JSON must be an array of projects');
        return;
      }

      const results = {
        successful: [],
        failed: [],
        total: projectsData.length
      };

      // Import each project sequentially
      for (const projectData of projectsData) {
        try {
          // Validate required fields - version is optional for early-stage statuses
          const projectStatus = projectData.status && ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live'].includes(projectData.status)
            ? projectData.status
            : 'Requested';
          const needsVersion = !['Requested', 'In Planning', 'In Development'].includes(projectStatus);

          if (!projectData.name || !projectData.description || (needsVersion && !projectData.current_version)) {
            results.failed.push({
              project: projectData,
              error: needsVersion
                ? 'Missing required fields (name, current_version, description)'
                : 'Missing required fields (name, description)'
            });
            continue;
          }

          // Set defaults for optional fields
          const project = {
            name: projectData.name,
            current_version: projectData.current_version || '',
            description: projectData.description,
            next_steps: projectData.next_steps || '',
            launched_date: projectData.launched_date || '',
            project_url: projectData.project_url || '',
            fider_tag_id: projectData.fider_tag_id || '',
            status: projectData.status && ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live'].includes(projectData.status)
              ? projectData.status
              : 'Requested'
          };

          const response = await axios.post(`${API_BASE}/api/projects`, project);
          results.successful.push(response.data);

        } catch (error) {
          results.failed.push({
            project: projectData,
            error: error.response?.data?.error || error.message
          });
        }
      }

      setImportResults(results);

      // Refresh projects list
      fetchProjects();

      // If all successful, close modal
      if (results.failed.length === 0) {
        setTimeout(() => {
          setShowJsonImport(false);
          setJsonImportData('');
          setImportResults(null);
        }, 2000);
      }

    } catch (error) {
      alert('Invalid JSON format. Please check your data.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // API Token management functions
  const fetchApiTokens = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/tokens`);
      setApiTokens(response.data.tokens);
    } catch (error) {
      console.error('Error fetching API tokens:', error);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) return;
    try {
      const response = await axios.post(`${API_BASE}/api/admin/tokens`, { name: newTokenName });
      setNewlyCreatedToken(response.data.token);
      setNewTokenName('');
      fetchApiTokens();
    } catch (error) {
      console.error('Error creating token:', error);
      alert('Failed to create token');
    }
  };

  const handleDeleteToken = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the API key "${name}"? Any integrations using this key will stop working.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/admin/tokens/${id}`);
      fetchApiTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
      alert('Failed to delete token');
    }
  };

  const handleRegenerateToken = async (id, name) => {
    if (!confirm(`Are you sure you want to regenerate the API key "${name}"? The old key will stop working immediately.`)) return;
    try {
      const response = await axios.post(`${API_BASE}/api/admin/tokens/${id}/regenerate`);
      setNewlyCreatedToken(response.data.token);
      fetchApiTokens();
    } catch (error) {
      console.error('Error regenerating token:', error);
      alert('Failed to regenerate token');
    }
  };

  const copyToClipboard = async (text, tokenId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTokenId(tokenId);
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const statusColors = {
    'In Progress': 'bg-warn/10 text-warn border-warn/30',
    'Completed': 'bg-success/10 text-success border-success/30',
    'On Hold': 'bg-text-subtle/10 text-text-subtle border-text-subtle/30',
    'Planning': 'bg-info/10 text-info border-info/30',
    'Testing': 'bg-accent/10 text-accent border-accent/30'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text-muted">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-elevation-1 border-b border-stroke-outer">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-h1 font-bold text-text-hi">Roadmap Admin</h1>
              <p className="text-text-muted">Manage project updates and import from Fider</p>
            </div>
            <div className="flex items-center gap-3">
              {projects.length > 0 && (
                <select
                  value={currentProject?.id || ''}
                  onChange={async (e) => {
                    const projectId = parseInt(e.target.value);
                    try {
                      const response = await axios.get(`${API_BASE}/api/projects/${projectId}`);
                      setCurrentProject(response.data);
                      setProjectImages(response.data.images || []);
                    } catch (error) {
                      console.error('Error fetching project details:', error);
                    }
                  }}
                  className="bg-elevation-2 border border-stroke-outer rounded-lg px-3 py-2 text-text-hi focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} {project.current_version ? `v${project.current_version}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <a
                href={`${API_BASE}/api/docs`}
                target="_blank"
                rel="noreferrer"
                className="bg-info/10 hover:bg-info/20 text-info border border-info/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Book className="w-4 h-4" />
                API Docs
              </a>
              <button
                onClick={() => {
                  setShowApiKeys(true);
                  fetchApiTokens();
                }}
                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Key className="w-4 h-4" />
                API Keys
              </button>
              <button
                onClick={() => setShowJsonImport(true)}
                className="bg-success/10 hover:bg-success/20 text-success border border-success/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Bulk Import
              </button>
              <button
                onClick={() => setShowNewProject(true)}
                className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-text-subtle mx-auto mb-4" />
            <h2 className="text-h2 font-semibold text-text-hi mb-2">No Projects Yet</h2>
            <p className="text-text-muted mb-6">Create your first project to start tracking changes</p>
            <button
              onClick={() => setShowNewProject(true)}
              className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Project Info & Controls */}
            <div className="lg:col-span-1">
              <GlassPanel className="p-6 sticky top-8">
                <h2 className="text-h3 font-semibold text-text-hi mb-4">Project Overview</h2>
                {currentProject && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-small font-medium text-text-subtle">Project Name</label>
                      <p className="text-text-hi font-medium">{currentProject.name}</p>
                    </div>
                    <div>
                      <label className="text-small font-medium text-text-subtle">Current Version</label>
                      <p className="text-text-hi">{currentProject.current_version || '—'}</p>
                    </div>
                    <div>
                      <label className="text-small font-medium text-text-subtle">Fider Tag</label>
                      {currentProject.fider_tag_name ? (
                        <div
                          className="inline-block px-2 py-1 rounded text-small font-medium mt-1"
                          style={{
                            backgroundColor: `#${currentProject.fider_tag_color}20`,
                            color: `#${currentProject.fider_tag_color}`
                          }}
                        >
                          {currentProject.fider_tag_name}
                        </div>
                      ) : (
                        <p className="text-text-muted text-small">No tag linked</p>
                      )}
                    </div>
                    <div>
                      <label className="text-small font-medium text-text-subtle">Updates</label>
                      <p className="text-text-hi">{currentProject.update_count || 0}</p>
                    </div>
                    {currentProject.project_url && (
                      <div>
                        <label className="text-small font-medium text-text-subtle">Project Link</label>
                        <a
                          href={currentProject.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-red-400 flex items-center gap-1 text-small"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Visit Project
                        </a>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-4 mt-6">
                  <button
                    onClick={() => setShowNewUpdate(true)}
                    className="w-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Update
                  </button>

                  <button
                    onClick={handleEditProject}
                    className="w-full bg-info/10 hover:bg-info/20 text-info border border-info/30 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Project
                  </button>

                  <button
                    onClick={() => handleDeleteProject(currentProject.id)}
                    className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </button>

                  {currentProject?.fider_tag_id && (
                    <button
                      onClick={() => {
                        fetchCompletedPosts(currentProject.fider_tag_id);
                        setShowFiderImport(true);
                      }}
                      className="w-full bg-info/10 hover:bg-info/20 text-info border border-info/30 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Import from Fider
                    </button>
                  )}

                  <a
                    href="/roadmap"
                    target="_blank"
                    className="w-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-hi border border-white/10 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Public Site
                  </a>
                </div>
              </GlassPanel>

              {/* Image Management Section */}
              {currentProject && (
                <div className="mt-6">
                  <GlassPanel className="p-6">
                    <h3 className="text-h3 font-semibold text-text-hi mb-4">Project Images</h3>

                    <div className="space-y-4">
                      <ImageUpload
                        projectId={currentProject.id}
                        apiBase={API_BASE}
                        onUploadSuccess={(newImage) => {
                          setProjectImages([...projectImages, newImage]);
                        }}
                      />

                      <ImageGallery
                        images={projectImages}
                        apiBase={API_BASE}
                        onDeleteImage={(imageId) => {
                          setProjectImages(projectImages.filter(img => img.id !== imageId));
                        }}
                      />
                    </div>
                  </GlassPanel>
                </div>
              )}
            </div>

            {/* Updates List */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                <h2 className="text-h3 font-semibold text-text-hi">Recent Updates</h2>
                {currentProject?.updates?.length > 0 ? (
                  currentProject.updates.map(update => (
                    <GlassPanel key={update.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-small font-medium border ${statusColors[update.status]}`}>
                            {update.status}
                          </span>
                          {update.fider_post_title && (
                            <span className="text-small text-info bg-info/10 border border-info/30 px-2 py-1 rounded">
                              From Fider: {update.fider_post_title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-small text-text-muted">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(update.created_at)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          // Bulletproof notes handling - never fails
                          console.log('AdminView - Processing update:', update.id, update.notes);

                          let notes = [];
                          if (Array.isArray(update.notes)) {
                            // Already an array, use directly
                            notes = update.notes.map(note => String(note));
                          } else if (typeof update.notes === 'string') {
                            // String - try to parse, fallback to single item
                            try {
                              const parsed = JSON.parse(update.notes);
                              notes = Array.isArray(parsed) ? parsed.map(note => String(note)) : [String(update.notes)];
                            } catch {
                              notes = [String(update.notes)];
                            }
                          } else {
                            // Unknown type, convert to string
                            notes = [String(update.notes || 'No notes available')];
                          }

                          console.log('AdminView - Final notes:', notes);
                          return notes;
                        })().map((note, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-accent mr-2 mt-1">•</span>
                            <span className="text-text-muted">{note}</span>
                          </div>
                        ))}
                      </div>
                    </GlassPanel>
                  ))
                ) : (
                  <GlassPanel className="text-center py-12">
                    <Tag className="w-12 h-12 text-text-subtle mx-auto mb-3" />
                    <p className="text-text-muted">No updates yet for this project</p>
                  </GlassPanel>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-hi mb-4">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="input-glass"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">
                  Current Version {versionOptionalStatuses.includes(newProject.status) ? '(optional)' : '*'}
                </label>
                <input
                  type="text"
                  value={newProject.current_version}
                  onChange={(e) => setNewProject({ ...newProject, current_version: e.target.value })}
                  className="input-glass"
                  placeholder={versionOptionalStatuses.includes(newProject.status) ? "e.g., 1.0 (optional)" : "e.g., 1.0, 0.9, beta"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project Description *</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="input-glass"
                  rows="3"
                  placeholder="Executive summary of project purpose and goals..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project Status *</label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  className="input-glass"
                >
                  <option value="Requested">Requested</option>
                  <option value="In Planning">In Planning</option>
                  <option value="In Development">In Development</option>
                  <option value="In Beta Testing">In Beta Testing</option>
                  <option value="Live">Live</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Link to Fider Tag</label>
                <select
                  value={newProject.fider_tag_id}
                  onChange={(e) => setNewProject({ ...newProject, fider_tag_id: e.target.value })}
                  className="input-glass"
                >
                  <option value="">Select a tag (optional)</option>
                  {fiderTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Launched Date</label>
                <input
                  type="text"
                  value={newProject.launched_date}
                  onChange={(e) => setNewProject({ ...newProject, launched_date: e.target.value })}
                  className="input-glass"
                  placeholder="e.g., August 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project URL</label>
                <input
                  type="url"
                  value={newProject.project_url}
                  onChange={(e) => setNewProject({ ...newProject, project_url: e.target.value })}
                  className="input-glass"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewProject(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProject.name || !newProject.description || (!versionOptionalStatuses.includes(newProject.status) && !newProject.current_version)}
                className="btn-primary flex-1"
              >
                Create Project
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-hi mb-4">Edit Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project Name *</label>
                <input
                  type="text"
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                  className="input-glass"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">
                  Current Version {versionOptionalStatuses.includes(editProject.status) ? '(optional)' : '*'}
                </label>
                <input
                  type="text"
                  value={editProject.current_version}
                  onChange={(e) => setEditProject({ ...editProject, current_version: e.target.value })}
                  className="input-glass"
                  placeholder={versionOptionalStatuses.includes(editProject.status) ? "e.g., 1.0 (optional)" : "e.g., 1.0, 0.9, beta"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project Description *</label>
                <textarea
                  value={editProject.description}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                  className="input-glass"
                  rows="3"
                  placeholder="Executive summary of project purpose and goals..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project Status *</label>
                <select
                  value={editProject.status}
                  onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
                  className="input-glass"
                >
                  <option value="Requested">Requested</option>
                  <option value="In Planning">In Planning</option>
                  <option value="In Development">In Development</option>
                  <option value="In Beta Testing">In Beta Testing</option>
                  <option value="Live">Live</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Next Steps</label>
                <textarea
                  value={editProject.next_steps}
                  onChange={(e) => setEditProject({ ...editProject, next_steps: e.target.value })}
                  className="input-glass"
                  rows="2"
                  placeholder="What's coming next for this project..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Link to Fider Tag</label>
                <select
                  value={editProject.fider_tag_id}
                  onChange={(e) => setEditProject({ ...editProject, fider_tag_id: e.target.value })}
                  className="input-glass"
                >
                  <option value="">Select a tag (optional)</option>
                  {fiderTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Launched Date</label>
                <input
                  type="text"
                  value={editProject.launched_date}
                  onChange={(e) => setEditProject({ ...editProject, launched_date: e.target.value })}
                  className="input-glass"
                  placeholder="e.g., August 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Project URL</label>
                <input
                  type="url"
                  value={editProject.project_url}
                  onChange={(e) => setEditProject({ ...editProject, project_url: e.target.value })}
                  className="input-glass"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditProject(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProject}
                disabled={!editProject.name || !editProject.description || (!versionOptionalStatuses.includes(editProject.status) && !editProject.current_version)}
                className="btn-primary flex-1"
              >
                Update Project
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* New Update Modal */}
      {showNewUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-hi mb-4">Add Update</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Status</label>
                <select
                  value={newUpdate.status}
                  onChange={(e) => setNewUpdate({ ...newUpdate, status: e.target.value })}
                  className="input-glass"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Planning">Planning</option>
                  <option value="Testing">Testing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Update Date (Optional)</label>
                <input
                  type="date"
                  value={newUpdate.update_date}
                  onChange={(e) => setNewUpdate({ ...newUpdate, update_date: e.target.value })}
                  className="input-glass"
                />
                <p className="text-xs text-text-subtle mt-1">Leave blank to use current date and time</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-subtle mb-1">Notes</label>
                <textarea
                  value={newUpdate.notes}
                  onChange={(e) => setNewUpdate({ ...newUpdate, notes: e.target.value })}
                  className="input-glass"
                  rows="4"
                  placeholder="Describe what was changed, added, or planned..."
                />
                <p className="text-xs text-text-subtle mt-1">AI will clean up and organize your notes into bullet points</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setNewUpdate({ status: 'In Progress', notes: '', update_date: '' });
                  setShowNewUpdate(false);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUpdate}
                disabled={!newUpdate.notes.trim() || isProcessingAI}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isProcessingAI ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Add Update'
                )}
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Bulk JSON Import Modal */}
      {showJsonImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-hi mb-4">Bulk Import Projects from JSON</h3>

            <div className="mb-4">
              <p className="text-text-muted mb-2">
                Paste your JSON data below. The JSON should be an array of project objects with the following structure:
              </p>
              <div className="bg-elevation-2 border border-stroke-outer p-3 rounded text-sm font-mono text-text-hi">
                {JSON.stringify([
                  {
                    "name": "Project Name",
                    "current_version": "1.0",
                    "description": "Project description",
                    "status": "Requested | In Planning | In Development | In Beta Testing | Live",
                    "next_steps": "Optional next steps",
                    "launched_date": "Optional launch date",
                    "project_url": "Optional project URL",
                    "fider_tag_id": "Optional Fider tag ID (number)"
                  }
                ], null, 2)}
              </div>
              <p className="text-sm text-text-subtle mt-2">
                Required fields: <strong className="text-text-muted">name</strong>, <strong className="text-text-muted">description</strong>. Version is optional for Requested, In Planning, and In Development statuses.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-subtle mb-2">JSON Data</label>
              <textarea
                value={jsonImportData}
                onChange={(e) => setJsonImportData(e.target.value)}
                className="input-glass h-64 font-mono text-sm"
                placeholder="Paste your JSON data here..."
              />
            </div>

            {importResults && (
              <div className="mb-4 p-4 bg-elevation-2 border border-stroke-outer rounded-lg">
                <h4 className="font-semibold mb-2 text-text-hi">Import Results</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span className="text-text-hi">{importResults.successful.length} projects imported successfully</span>
                  </div>
                  {importResults.failed.length > 0 && (
                    <div className="text-danger">
                      <div className="flex items-center gap-2">
                        <span>✗</span>
                        <span>{importResults.failed.length} projects failed to import</span>
                      </div>
                      <ul className="ml-6 mt-1 text-sm text-text-muted">
                        {importResults.failed.map((failure, index) => (
                          <li key={index}>
                            {failure.project.name || 'Unnamed project'}: {failure.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJsonImport(false);
                  setJsonImportData('');
                  setImportResults(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkJsonImport}
                disabled={!jsonImportData.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Projects
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Fider Import Modal */}
      {showFiderImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold text-text-hi mb-4">Import from Fider</h3>
            <p className="text-text-muted mb-4">Select completed posts to import as roadmap updates:</p>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {completedPosts.length > 0 ? (
                completedPosts.map(post => (
                  <GlassPanel key={post.id} className="p-4" hover>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-text-hi mb-1">{post.title}</h4>
                        {post.description && (
                          <p className="text-sm text-text-muted line-clamp-2">{post.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-subtle">
                          <span>By {post.author_name}</span>
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleImportFiderPost(post.id)}
                        className="ml-4 bg-info/10 hover:bg-info/20 text-info border border-info/30 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Import
                      </button>
                    </div>
                  </GlassPanel>
                ))
              ) : (
                <p className="text-text-muted text-center py-8">No completed posts found for this project's tag</p>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowFiderImport(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* API Keys Management Modal */}
      {showApiKeys && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-text-hi">API Keys</h3>
                <p className="text-text-muted text-sm">Manage API keys for external integrations</p>
              </div>
              <a
                href={`${API_BASE}/api/docs`}
                target="_blank"
                rel="noreferrer"
                className="text-info hover:text-info/80 text-sm flex items-center gap-1"
              >
                <Book className="w-4 h-4" />
                View API Docs
              </a>
            </div>

            {/* Newly Created Token Alert */}
            {newlyCreatedToken && (
              <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-success mb-1">
                      {newlyCreatedToken.name ? `API Key "${newlyCreatedToken.name}" Created` : 'API Key Regenerated'}
                    </h4>
                    <p className="text-sm text-text-muted mb-2">
                      Copy this token now. You won't be able to see it again!
                    </p>
                    <code className="block p-2 bg-black/30 rounded text-xs text-text-hi font-mono break-all">
                      {newlyCreatedToken.token}
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedToken.token, 'new')}
                    className="ml-4 p-2 hover:bg-white/10 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedTokenId === 'new' ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <Copy className="w-5 h-5 text-text-muted" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setNewlyCreatedToken(null)}
                  className="mt-3 text-sm text-text-subtle hover:text-text-muted"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Create New Token */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-subtle mb-2">Create New API Key</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="e.g., CI/CD Pipeline, Zapier Integration"
                  className="input-glass flex-1"
                />
                <button
                  onClick={handleCreateToken}
                  disabled={!newTokenName.trim()}
                  className="btn-primary px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </button>
              </div>
            </div>

            {/* Existing Tokens */}
            <div>
              <h4 className="text-sm font-medium text-text-subtle mb-3">Existing API Keys</h4>
              {apiTokens.length === 0 ? (
                <p className="text-text-muted text-center py-8">No API keys yet. Create one above.</p>
              ) : (
                <div className="space-y-3">
                  {apiTokens.map(token => (
                    <GlassPanel key={token.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Key className="w-4 h-4 text-purple-400" />
                            <span className="font-medium text-text-hi">{token.name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-text-subtle">
                            <code className="bg-black/30 px-2 py-0.5 rounded font-mono">
                              {token.token_masked}
                            </code>
                            <span>Created: {formatDate(token.created_at)}</span>
                            {token.last_used_at && (
                              <span className="text-success">Last used: {formatDate(token.last_used_at)}</span>
                            )}
                            {!token.last_used_at && (
                              <span className="text-text-subtle">Never used</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRegenerateToken(token.id, token.name)}
                            className="p-2 hover:bg-white/10 rounded transition-colors"
                            title="Regenerate token"
                          >
                            <RefreshCw className="w-4 h-4 text-warn" />
                          </button>
                          <button
                            onClick={() => handleDeleteToken(token.id, token.name)}
                            className="p-2 hover:bg-white/10 rounded transition-colors"
                            title="Delete token"
                          >
                            <Trash2 className="w-4 h-4 text-danger" />
                          </button>
                        </div>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowApiKeys(false);
                  setNewlyCreatedToken(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};

export default AdminView;