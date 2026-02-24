import React, { useState } from 'react';
import axios from 'axios';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { StatusPill } from '../ui/StatusPill';
import { formatDate } from '../../constants/statusConfig';

const API_BASE = window.location.origin + '/roadmap';

const UPDATE_STATUSES = ['Requested', 'In Planning', 'In Development', 'In Beta Testing', 'Live', 'Completed'];

export const AdminUpdateList = ({ project, updates, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState(project.status || 'In Development');
  const [notes, setNotes] = useState('');
  const [updateDate, setUpdateDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) { setError('Notes are required'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`${API_BASE}/api/projects/${project.id}/updates`, {
        status,
        notes: notes.trim(),
        update_date: updateDate || undefined,
      });
      setNotes('');
      setUpdateDate('');
      setShowForm(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error adding update:', err);
      setError(err.response?.data?.error || 'Failed to add update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Add Update Button / Form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/80 transition-colors rounded-xl py-2.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Update
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-text-subtle uppercase tracking-wider">New Update</h4>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="text-[11px] text-text-subtle hover:text-text-muted transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold text-text-subtle uppercase tracking-wider mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-glass w-full text-sm"
                >
                  {UPDATE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] font-semibold text-text-subtle uppercase tracking-wider mb-1">Date (optional)</label>
                <input
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="input-glass w-full text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-semibold text-text-subtle uppercase tracking-wider mb-1">
                Notes
                <span className="text-text-subtle/50 normal-case tracking-normal ml-1">(AI will clean into bullet points)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-glass w-full text-sm min-h-[80px] resize-y"
                placeholder="What changed? Write freely — AI will format into clean bullet points."
                autoFocus
              />
            </div>

            {error && (
              <div className="p-2 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/80 disabled:opacity-50 transition-colors px-4 py-2 rounded-lg"
              >
                {submitting ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Fider Import Button */}
      {project.fider_tag_id && (
        <FiderImportSection projectId={project.id} fiderTagId={project.fider_tag_id} onRefresh={onRefresh} />
      )}

      {/* Update History */}
      {(!updates || updates.length === 0) ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-text-subtle mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-subtle mb-1">No updates yet</p>
          <p className="text-xs text-text-subtle/60">Post your first update above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(update => (
            <div key={update.id} className="glass-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <StatusPill status={update.status} />
                <span className="text-xs text-text-subtle">
                  {formatDate(update.update_date || update.created_at)}
                </span>
              </div>
              {update.notes && (
                <ul className="space-y-1">
                  {(Array.isArray(update.notes) ? update.notes : [update.notes]).map((note, i) => (
                    <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                      <span className="text-text-subtle mt-1.5 text-[6px]">●</span>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Fider Import Section ───
const FiderImportSection = ({ projectId, fiderTagId, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/fider-completed/${fiderTagId}`);
      setPosts(res.data);
    } catch (err) {
      console.error('Error loading Fider posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = () => {
    if (!expanded) loadPosts();
    setExpanded(!expanded);
  };

  const importPost = async (post) => {
    setImporting(post.id);
    try {
      await axios.post(`${API_BASE}/api/import-fider-post`, {
        projectId,
        fiderPostId: post.id,
      });
      // Remove from list
      setPosts(prev => prev.filter(p => p.id !== post.id));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error importing post:', err);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] text-info hover:text-info/80 border border-info/20 hover:border-info/30 bg-info/5 hover:bg-info/10 rounded-lg py-2 transition-all cursor-pointer"
      >
        {expanded ? 'Hide Fider Posts' : 'Import from Fider'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="text-center py-4">
              <div className="size-5 border-2 border-elevation-3 border-t-info rounded-full animate-spin mx-auto" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-xs text-text-subtle/60 text-center py-3">No completed Fider posts to import</p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-muted font-medium truncate">{post.title}</p>
                  {post.description && (
                    <p className="text-xs text-text-subtle mt-0.5 line-clamp-2">{post.description}</p>
                  )}
                </div>
                <button
                  onClick={() => importPost(post)}
                  disabled={importing === post.id}
                  className="text-[11px] font-semibold text-info hover:text-info/80 px-2.5 py-1 rounded-md bg-info/10 border border-info/20 hover:bg-info/15 transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  {importing === post.id ? 'Importing...' : 'Import'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
