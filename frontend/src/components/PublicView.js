import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnimatePresence } from 'framer-motion';
import { BoardView } from './views/BoardView';
import { ProjectDetailSheet } from './ui/ProjectDetailSheet';

const API_BASE = window.location.origin + '/roadmap';

export const PublicView = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/public/projects`);

      // Enhanced projects with mock data for now (will be replaced with real data)
      const enhancedProjects = response.data.map(project => ({
        ...project,
        // Keep existing images from API response
        next_steps_list: [], // Will be populated from project_next_steps table
        ideas: [], // Will be populated from project_ideas table
        timeline: [ // Default timeline for now
          { phase: 'Plan', done: true },
          { phase: 'Build', current: project.status === 'In Development' },
          { phase: 'Test', current: project.status === 'In Beta Testing' },
          { phase: 'Launch', done: project.status === 'Live' }
        ]
      }));

      setProjects(enhancedProjects);
      setError(null);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId) => {
    try {
      const [projectRes, updatesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/public/projects`),
        axios.get(`${API_BASE}/api/public/projects/${projectId}/updates`)
      ]);

      const project = projectRes.data.find(p => p.id === projectId);
      if (project) {
        setSelectedProject({
          ...project,
          updates: updatesRes.data
        });
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const handleProjectClick = (project) => {
    fetchProjectDetails(project.id);
  };

  const handleCloseDetail = () => {
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 border-4 border-elevation-3 border-t-accent rounded-full animate-spin mb-4" />
          <p className="text-text-muted">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger mb-4">{error}</p>
          <button
            onClick={fetchProjects}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BoardView
        projects={projects}
        onProjectClick={handleProjectClick}
      />

      {/* Project Detail Sheet */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailSheet
            project={selectedProject}
            onClose={handleCloseDetail}
          />
        )}
      </AnimatePresence>
    </>
  );
};