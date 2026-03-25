import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNews, createNews, togglePin, deleteNews } from '../../services/news.service';
import type { NewsItem } from '../../types';

const typeColor: Record<string, string> = {
  ANNOUNCEMENT: 'text-blue-400 border-blue-500/30',
  MAINTENANCE:  'text-orange-400 border-orange-500/30',
  EVENT:        'text-purple-400 border-purple-500/30',
  EMERGENCY:    'text-red-400 border-red-500/30',
};

const today = new Date().toISOString().split('T')[0];
const BLANK = {
  title: '', body: '', type: 'ANNOUNCEMENT',
  tag: 'Info', tagColor: '#00CCCC', date: today, pinned: false,
};

export default function AdminNews() {
  const qc = useQueryClient();
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(BLANK);
  const [filterType, setFilterType] = useState('ALL');

  const { data: news = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ['news'],
    queryFn: () => getNews(),
  });

  const filtered = filterType === 'ALL' ? news : news.filter(n => n.type === filterType);

  const createMut = useMutation({
    mutationFn: () => createNews(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['news'] });
      setShowForm(false);
      setForm({ ...BLANK, date: new Date().toISOString().split('T')[0] });
    },
  });

  const pinMut = useMutation({
    mutationFn: (id: string) => togglePin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNews(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news'] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">News Manager</h1>
          <p className="text-white/40 text-sm mt-1">{news.length} articles</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-rh-cyan text-rh-dark text-sm font-semibold hover:bg-rh-cyan/90"
        >
          + New Article
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'ANNOUNCEMENT', 'MAINTENANCE', 'EVENT', 'EMERGENCY'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              filterType === t
                ? 'border-rh-cyan bg-rh-cyan/10 text-rh-cyan'
                : 'border-white/10 text-white/50 hover:border-white/20'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white/4 border border-rh-cyan/30 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">New Article</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-white/40 text-xs mb-1 block">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Article headline…"
                className="input-base"
              />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-base">
                {['ANNOUNCEMENT','MAINTENANCE','EVENT','EMERGENCY'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Tag</label>
              <input type="text" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} className="input-base" placeholder="Info, Alert…" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-base" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="accent-rh-cyan w-4 h-4"
                />
                <span className="text-white/60 text-sm">Pin to top</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-white/40 text-xs mb-1 block">Body</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Write your announcement…"
                rows={4}
                className="input-base resize-none"
              />
            </div>
          </div>
          {createMut.isError && (
            <p className="text-rh-rose text-xs">{(createMut.error as Error).message}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !form.title || !form.body}
              className="px-4 py-2 rounded-lg bg-rh-cyan text-rh-dark text-sm font-semibold disabled:opacity-50"
            >
              {createMut.isPending ? 'Publishing…' : 'Publish'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...BLANK, date: new Date().toISOString().split('T')[0] }); }}
              className="px-4 py-2 rounded-lg bg-white/8 text-white/60 text-sm hover:bg-white/12"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Articles list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`bg-white/4 border rounded-xl p-4 ${n.pinned ? 'border-rh-cyan/30' : 'border-white/8'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.pinned && <span className="text-rh-cyan text-xs">📌</span>}
                    <span className="text-white font-semibold">{n.title}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${typeColor[n.type] ?? 'border-white/10 text-white/40'}`}>
                      {n.type}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mt-1 line-clamp-2">{n.body}</p>
                  <p className="text-white/25 text-xs mt-2">{n.date}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => pinMut.mutate(n.id)}
                    disabled={pinMut.isPending}
                    title={n.pinned ? 'Unpin' : 'Pin'}
                    className="text-xs px-2.5 py-1 rounded bg-white/8 text-white/50 hover:bg-rh-cyan/10 hover:text-rh-cyan"
                  >
                    {n.pinned ? '📌' : '📍'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${n.title}"?`)) deleteMut.mutate(n.id);
                    }}
                    disabled={deleteMut.isPending}
                    className="text-xs px-2.5 py-1 rounded bg-white/8 text-rh-rose/70 hover:bg-rh-rose/10 hover:text-rh-rose"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-white/30">No articles found</p>
          )}
        </div>
      )}
    </div>
  );
}
