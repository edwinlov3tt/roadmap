import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';

export const TimelineView = ({ projects, onProjectClick }) => {
  // Timeline view implementation coming soon
  return (
    <div className="h-screen flex flex-col bg-base p-6">
      <div className="mb-6">
        <h1 className="text-display font-semibold text-text-hi">Project Timeline</h1>
        <p className="text-text-muted mt-1">Track milestone progress across all projects</p>
      </div>

      {/* Coming Soon */}
      <div className="flex-1 flex items-center justify-center">
        <GlassPanel className="p-12 text-center max-w-lg">
          <AlertCircle className="w-12 h-12 text-text-subtle mx-auto mb-4" />
          <h2 className="text-h2 font-semibold text-text-hi mb-2">Timeline View Coming Soon</h2>
          <p className="text-text-muted">
            The animated timeline view with milestone tracking and blocker visualization
            will be available in the next update.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
};