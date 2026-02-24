import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Image } from 'lucide-react';

const API_BASE = window.location.origin + '/roadmap';

export const AdminImageManager = ({ projectId, onSaved }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, [projectId]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/projects/${projectId}/images`);
      setImages(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('alt', file.name);

      await axios.post(`${API_BASE}/api/projects/${projectId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchImages();
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm('Delete this image?')) return;
    try {
      await axios.delete(`${API_BASE}/api/projects/${projectId}/images/${imageId}`);
      await fetchImages();
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Failed to delete image');
    }
  };

  const handleUpdateAlt = async (imageId, alt) => {
    try {
      await axios.put(`${API_BASE}/api/projects/${projectId}/images/${imageId}`, { alt });
      setImages(prev => prev.map(img => img.id === imageId ? { ...img, alt } : img));
    } catch (err) {
      console.error('Error updating image:', err);
    }
  };

  const handleReorder = async (imageId, direction) => {
    const idx = images.findIndex(img => img.id === imageId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    // Swap sort orders
    const currentOrder = images[idx].sort_order;
    const swapOrder = images[swapIdx].sort_order;

    try {
      await Promise.all([
        axios.put(`${API_BASE}/api/projects/${projectId}/images/${images[idx].id}`, { sort_order: swapOrder }),
        axios.put(`${API_BASE}/api/projects/${projectId}/images/${images[swapIdx].id}`, { sort_order: currentOrder }),
      ]);
      await fetchImages();
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 border-2 border-elevation-3 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="w-full mb-4 border-2 border-dashed border-white/[0.08] hover:border-white/15 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.02] transition-all"
      >
        {uploading ? (
          <>
            <div className="size-8 border-2 border-elevation-3 border-t-accent rounded-full animate-spin" />
            <span className="text-xs text-text-subtle">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-text-subtle opacity-50" />
            <span className="text-xs text-text-subtle">Click to upload an image</span>
            <span className="text-[10px] text-text-subtle/50">PNG, JPG, GIF, WebP</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger mb-3">
          {error}
        </div>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <div className="text-center py-8">
          <Image className="w-10 h-10 text-text-subtle mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-subtle mb-1">No images yet</p>
          <p className="text-xs text-text-subtle/60">Upload screenshots or mockups above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img, i) => (
            <ImageCard
              key={img.id}
              image={img}
              index={i}
              total={images.length}
              onDelete={() => handleDelete(img.id)}
              onUpdateAlt={(alt) => handleUpdateAlt(img.id, alt)}
              onMoveUp={() => handleReorder(img.id, -1)}
              onMoveDown={() => handleReorder(img.id, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Single Image Card ───
const ImageCard = ({ image, index, total, onDelete, onUpdateAlt, onMoveUp, onMoveDown }) => {
  const [editingAlt, setEditingAlt] = useState(false);
  const [altDraft, setAltDraft] = useState(image.alt || '');

  const saveAlt = () => {
    if (altDraft !== image.alt) onUpdateAlt(altDraft);
    setEditingAlt(false);
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Image preview */}
      <div className="relative aspect-video bg-black/30 flex items-center justify-center">
        <img
          src={`${API_BASE}${image.src}`}
          alt={image.alt}
          className="max-w-full max-h-full object-contain"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* Controls */}
      <div className="p-3 flex items-center gap-2">
        {/* Reorder */}
        <div className="flex flex-col gap-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Alt text */}
        <div className="flex-1 min-w-0">
          {editingAlt ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={altDraft}
                onChange={(e) => setAltDraft(e.target.value)}
                className="flex-1 input-glass text-xs"
                placeholder="Alt text..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveAlt();
                  if (e.key === 'Escape') setEditingAlt(false);
                }}
              />
              <button onClick={saveAlt} className="p-1 rounded hover:bg-white/10 text-success transition-colors">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingAlt(false)} className="p-1 rounded hover:bg-white/10 text-text-subtle transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAltDraft(image.alt || ''); setEditingAlt(true); }}
              className="group flex items-center gap-1 text-xs text-text-muted hover:text-text-hi transition-colors truncate max-w-full"
              title="Edit alt text"
            >
              <span className="truncate">{image.alt || 'No alt text'}</span>
              <Pencil className="w-2.5 h-2.5 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          )}
        </div>

        {/* Order indicator */}
        <span className="text-[10px] text-zinc-600 tabular-nums">#{index + 1}</span>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-danger/20 text-zinc-600 hover:text-danger transition-colors"
          title="Delete image"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
