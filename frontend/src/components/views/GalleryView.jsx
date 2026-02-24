import React from 'react';
import { motion } from 'framer-motion';
import { Image } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';

export const GalleryView = ({ projects, onProjectClick }) => {
  // Gallery view implementation coming soon
  return (
    <div className="h-screen flex flex-col bg-base p-6">
      <div className="mb-6">
        <h1 className="text-display font-semibold text-text-hi">Project Gallery</h1>
        <p className="text-text-muted mt-1">Visual showcase of all projects</p>
      </div>

      {/* Coming Soon */}
      <div className="flex-1 flex items-center justify-center">
        <GlassPanel className="p-12 text-center max-w-lg">
          <Image className="w-12 h-12 text-text-subtle mx-auto mb-4" />
          <h2 className="text-h2 font-semibold text-text-hi mb-2">Gallery View Coming Soon</h2>
          <p className="text-text-muted">
            The image-forward masonry gallery layout will be available in the next update.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
};