import { useState, useEffect, useRef } from 'react';
import { Send, Clock, Trash2, Plus, Image as ImageIcon, Edit2, CheckCircle, Loader2, AlertCircle, Radio, MessageSquare, X } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type SendTo = 'bot' | 'channel' | 'both';
type PostStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

interface BroadcastPost {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  image_key: string | null;
  send_to: SendTo;
  status: PostStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';

const STATUS_BADGE: Record<PostStatus, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-600' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
  sending:   { label: 'Sending…',  cls: 'bg-yellow-100 text-yellow-700 animate-pulse' },
  sent:      { label: 'Sent ✓',    cls: 'bg-green-100 text-green-700' },
  failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700' },
};

const SEND_TO_OPTIONS: { value: SendTo; label: string; icon: string }[] = [
  { value: 'bot',     label: 'Bot Only (All Users)',    icon: '🤖' },
  { value: 'channel', label: 'Channel Only',            icon: '📢' },
  { value: 'both',    label: 'Bot + Channel',           icon: '📡' },
];

export default function AdminBroadcast() {
  const [posts, setPosts] = useState<BroadcastPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<BroadcastPost | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendTo, setSendTo] = useState<SendTo>('bot');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/broadcast`, { headers: { 'x-telegram-init-data': initData } });
      const d = await r.json();
      setPosts(d.posts || []);
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  // Auto-refresh every 10s if any post is 'sending'
  useEffect(() => {
    const hasLive = posts.some(p => p.status === 'sending');
    if (!hasLive) return;
    const t = setTimeout(() => fetchPosts(), 10_000);
    return () => clearTimeout(t);
  }, [posts]);

  const openCreateForm = () => {
    setEditPost(null);
    setTitle(''); setBody(''); setSendTo('bot');
    setScheduleEnabled(false); setScheduledAt('');
    setImageFile(null); setImagePreview(null);
    setUploadedImageUrl(null); setUploadedImageKey(null);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (post: BroadcastPost) => {
    setEditPost(post);
    setTitle(post.title || '');
    setBody(post.body);
    setSendTo(post.send_to);
    setScheduleEnabled(!!post.scheduled_at);
    setScheduledAt(post.scheduled_at ? post.scheduled_at.slice(0, 16) : '');
    setImagePreview(post.image_url || null);
    setUploadedImageUrl(post.image_url || null);
    setUploadedImageKey(post.image_key || null);
    setImageFile(null);
    setError('');
    setShowForm(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    setError('');
    try {
      // 1. Get presigned URL
      const pr = await fetch(`${API_URL}/broadcast/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!pr.ok) throw new Error('Presign failed');
      const { uploadUrl, publicUrl, key } = await pr.json();
      // 2. Upload directly to R2
      const up = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!up.ok) throw new Error('Upload to R2 failed');
      setUploadedImageUrl(publicUrl);
      setUploadedImageKey(key);
    } catch (err: any) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadedImageUrl(null);
    setUploadedImageKey(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!body.trim()) { setError('Post message is required'); return; }
    if (scheduleEnabled && !scheduledAt) { setError('Please pick a scheduled date/time'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        title, body,
        image_url: uploadedImageUrl,
        image_key: uploadedImageKey,
        send_to: sendTo,
        scheduled_at: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
      };
      const url = editPost ? `${API_URL}/broadcast/${editPost.id}` : `${API_URL}/broadcast`;
      const method = editPost ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Save failed'); return; }
      setShowForm(false);
      fetchPosts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (postId: string) => {
    setSending(postId); setError('');
    try {
      const r = await fetch(`${API_URL}/broadcast/${postId}/send`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData },
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Send failed'); return; }
      // Optimistically update status
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'sending' } : p));
      setTimeout(() => fetchPosts(), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await fetch(`${API_URL}/broadcast/${postId}`, {
        method: 'DELETE',
        headers: { 'x-telegram-init-data': initData },
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-800">
            {editPost ? '✏️ Edit Post' : '📢 New Broadcast'}
          </h2>
          <button onClick={() => setShowForm(false)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">

          {/* Title */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekend Bonus!"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 mb-2">Image (optional)</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="preview" className="w-full h-44 object-cover rounded-xl" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                    <Loader2 size={28} className="text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-yellow-400 hover:text-yellow-500 transition-colors"
              >
                <ImageIcon size={28} className="mb-2" />
                <span className="text-sm font-semibold">Tap to upload image</span>
                <span className="text-xs">JPG, PNG, WebP, GIF</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>

          {/* Message Body */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 mb-2">
              Message <span className="text-red-500">*</span>
              <span className="ml-2 font-normal text-slate-400">(supports *bold* _italic_)</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement here…"
              rows={5}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />
            <div className="text-right text-xs text-slate-400 mt-1">{body.length} chars</div>
          </div>

          {/* Send To */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 mb-3">Send To</label>
            <div className="space-y-2">
              {SEND_TO_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSendTo(opt.value)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                    sendTo === opt.value
                      ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span>{opt.label}</span>
                  {sendTo === opt.value && <CheckCircle size={16} className="ml-auto text-yellow-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-500 flex items-center space-x-1.5">
                <Clock size={14} />
                <span>Schedule Post</span>
              </label>
              <button
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${scheduleEnabled ? 'bg-yellow-400' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${scheduleEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            {scheduleEnabled && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            )}
            {!scheduleEnabled && (
              <p className="text-xs text-slate-400">Post will be saved as draft. Press "Send Now" to broadcast.</p>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 py-3.5 rounded-xl bg-yellow-400 text-slate-900 font-black text-sm flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{scheduleEnabled ? '📅 Schedule' : '💾 Save Draft'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center space-x-2">
            <Radio className="text-yellow-500" size={22} />
            <span>Broadcast</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Send posts to all users &amp; channel</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center space-x-2 bg-yellow-400 text-slate-900 font-black text-sm px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
        >
          <Plus size={16} />
          <span>New Post</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-16">
          <Loader2 size={32} className="animate-spin text-yellow-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 text-slate-400 space-y-3">
          <MessageSquare size={48} strokeWidth={1.5} />
          <p className="font-semibold text-sm">No posts yet</p>
          <button onClick={openCreateForm} className="text-yellow-600 font-bold text-sm underline">Create your first post →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const badge = STATUS_BADGE[post.status];
            const isSendable = post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed';
            const isEditable = post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed';
            const isSending = sending === post.id;

            return (
              <div key={post.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Post image preview */}
                {post.image_url && (
                  <img src={post.image_url} alt="post" className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      {post.title && (
                        <p className="font-black text-slate-800 text-sm truncate">{post.title}</p>
                      )}
                      <p className="text-slate-600 text-sm line-clamp-2 mt-0.5">{post.body}</p>
                    </div>
                    <span className={`ml-2 shrink-0 text-[10px] font-black px-2 py-1 rounded-lg ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mb-3">
                    <span>
                      {post.send_to === 'bot' ? '🤖 Bot' : post.send_to === 'channel' ? '📢 Channel' : '📡 Bot+Channel'}
                    </span>
                    {post.scheduled_at && post.status === 'scheduled' && (
                      <span>📅 {fmtDate(post.scheduled_at)}</span>
                    )}
                    {post.status === 'sent' && (
                      <span className="text-green-600">✅ {post.sent_count} sent · {post.failed_count} failed · {fmtDate(post.sent_at)}</span>
                    )}
                    {!post.scheduled_at && post.status === 'draft' && (
                      <span>Created {fmtDate(post.created_at)}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2">
                    {isSendable && (
                      <button
                        onClick={() => handleSend(post.id)}
                        disabled={isSending}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-green-500 text-white font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
                      >
                        {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        <span>{isSending ? 'Sending…' : 'Send Now'}</span>
                      </button>
                    )}
                    {isEditable && (
                      <button
                        onClick={() => openEditForm(post)}
                        className="flex items-center justify-center space-x-1.5 bg-slate-100 text-slate-600 font-bold text-xs px-3 py-2.5 rounded-xl active:scale-95"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center justify-center bg-red-50 text-red-500 px-3 py-2.5 rounded-xl active:scale-95"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
