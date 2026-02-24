import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

export const ImageUpload = ({ projectId, onUploadSuccess, apiBase }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    await uploadImage(file);
  };

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('alt', file.name);

      const response = await fetch(`${apiBase}/api/projects/${projectId}/images`, {
        method: 'POST',
        body: formData,
        headers: {
          'x-admin-email': 'edwin@edwinlovett.com'
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      onUploadSuccess?.(result);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <GlassPanel
      className={`p-6 border-2 border-dashed transition-all duration-200 ${
        dragOver
          ? 'border-accent/50 bg-accent/5'
          : 'border-white/20 hover:border-white/30'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="text-center">
        <div className="mb-4">
          {uploading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          ) : (
            <ImageIcon className="w-12 h-12 text-text-subtle mx-auto" />
          )}
        </div>

        <h3 className="text-h3 font-medium text-text-hi mb-2">
          {uploading ? 'Uploading...' : 'Upload Project Image'}
        </h3>

        <p className="text-text-muted mb-4">
          Drag and drop an image here, or click to select
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary flex items-center gap-2 mx-auto"
        >
          <Upload className="w-4 h-4" />
          Choose Image
        </button>

        <p className="text-micro text-text-subtle mt-3">
          Supports PNG, JPG, GIF up to 5MB
        </p>
      </div>
    </GlassPanel>
  );
};

export const ImageGallery = ({ images = [], onDeleteImage, apiBase }) => {
  if (!images || images.length === 0) {
    return (
      <GlassPanel className="p-6 text-center">
        <ImageIcon className="w-8 h-8 text-text-subtle mx-auto mb-2" />
        <p className="text-text-muted">No images uploaded yet</p>
      </GlassPanel>
    );
  }

  const handleDelete = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/projects/${images[0].project_id}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-email': 'edwin@edwinlovett.com'
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      onDeleteImage?.(imageId);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  return (
    <div className="space-y-4">
      {images.map((image) => (
        <GlassPanel key={image.id} className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-elevation-2 flex-shrink-0">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-hi font-medium truncate">{image.alt}</p>
              <p className="text-text-subtle text-small">Order: {image.sort_order}</p>
            </div>
            <button
              onClick={() => handleDelete(image.id)}
              className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
};