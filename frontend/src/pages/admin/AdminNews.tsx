import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper } from 'lucide-react';
import { getNews, createNews, togglePin, deleteNews } from '../../services/news.service';
import type { NewsItem } from '../../types';

const TYPE_COLOR: Record<string, string> = {
  ANNOUNCEMENT: '#60a5fa',
  MAINTENANCE:  '#fb923c',
  EVENT:        '#a78bfa',
  EMERGENCY:    'var(--rose)',
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
    <div className="space-y-6 appear">

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page-title">News Manager</h1>
          <p className="page-sub">{news.length} articles</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
          + New Article
        </button>
      </div>

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['ALL', 'ANNOUNCEMENT', 'MAINTENANCE', 'EVENT', 'EMERGENCY'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: filterType === t ? 600 : 400,
              background: filterType === t ? 'var(--cyan)' : 'var(--hover)',
              color: filterType === t ? '#0f0f12' : 'var(--text3)',
              border: `1px solid ${filterType === t ? 'var(--cyan)' : 'var(--border2)'}`,
              cursor: 'pointer', transition: 'all .18s', textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ padding: '20px 24px', borderColor: 'rgba(0,204,204,.25)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>New Article</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Article headline…"
                className="input-base"
              />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-base">
                {['ANNOUNCEMENT','MAINTENANCE','EVENT','EMERGENCY'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Tag</label>
              <input type="text" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} className="input-base" placeholder="Info, Alert…" />
            </div>
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-base" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  style={{ accentColor: 'var(--cyan)', width: 15, height: 15 }}
                />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Pin to top</span>
              </label>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Body</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Write your announcement…"
                rows={4}
                className="input-base"
                style={{ resize: 'none' }}
              />
            </div>
          </div>
          {createMut.isError && (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--rose)', marginBottom: 10 }}>{(createMut.error as Error).message}</p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !form.title || !form.body}
              className="btn-primary"
              style={{ padding: '9px 20px', fontSize: 13 }}
            >
              {createMut.isPending ? 'Publishing…' : 'Publish'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...BLANK, date: new Date().toISOString().split('T')[0] }); }}
              className="btn-ghost"
              style={{ padding: '9px 16px', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Articles list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Newspaper size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No articles found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(n => (
            <div
              key={n.id}
              className="card-sm"
              style={{
                padding: '16px 18px',
                borderColor: n.pinned ? 'rgba(0,204,204,.25)' : 'var(--border)',
                background: n.pinned ? 'linear-gradient(135deg, rgba(0,204,204,.04), var(--bg2))' : 'var(--bg2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    {n.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{n.title}</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                      padding: '2px 8px', borderRadius: 20,
                      color: TYPE_COLOR[n.type] ?? 'var(--text3)',
                      background: (TYPE_COLOR[n.type] ?? '#888') + '1a',
                      border: `1px solid ${(TYPE_COLOR[n.type] ?? '#888')}33`,
                    }}>
                      {n.type}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{n.body}</p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', marginTop: 8 }}>{n.date}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => pinMut.mutate(n.id)}
                    disabled={pinMut.isPending}
                    title={n.pinned ? 'Unpin' : 'Pin'}
                    className="btn-ghost"
                    style={{ padding: '5px 10px', fontSize: 13 }}
                  >
                    {n.pinned ? '📌' : '📍'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${n.title}"?`)) deleteMut.mutate(n.id);
                    }}
                    disabled={deleteMut.isPending}
                    style={{
                      padding: '5px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                      background: 'rgba(232,25,122,.08)', border: '1px solid rgba(232,25,122,.2)',
                      color: 'var(--rose)', transition: 'all .18s',
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
