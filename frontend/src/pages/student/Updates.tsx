import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Pin, CheckCheck } from 'lucide-react';
import { getNews, markNewsRead, markAllNewsRead } from '../../services/news.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { toast } from 'sonner';

const FILTERS = ['All', 'maintenance', 'wifi', 'grounds', 'notice'];

export default function Updates() {
  usePageTitle('Residence Updates');
  const [filter, setFilter] = useState('All');
  const qc = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news', filter],
    queryFn:  () => getNews(filter === 'All' ? undefined : filter),
  });

  // Mark items as read when they appear (1.2s after render — gives the user a beat to actually see them)
  useEffect(() => {
    const unread = news.filter(n => !n.read && !seenRef.current.has(n.id));
    if (unread.length === 0) return;
    const timer = setTimeout(() => {
      unread.forEach(n => {
        seenRef.current.add(n.id);
        markNewsRead(n.id).catch(() => {});
      });
      qc.invalidateQueries({ queryKey: ['news'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }, 1200);
    return () => clearTimeout(timer);
  }, [news, qc]);

  const markAll = useMutation({
    mutationFn: markAllNewsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['news'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('All notifications marked as read');
    },
  });

  const unreadCount = news.filter(n => !n.read).length;

  return (
    <div className="space-y-5 appear">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Residence Updates</h1>
          <p className="page-sub">
            Notices and announcements from management
            {unreadCount > 0 && (
              <span style={{ color: 'var(--rose)', marginLeft: 8 }}>· {unreadCount} unread</span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAll.mutate()} disabled={markAll.isPending} className="btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }}>
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: filter === f ? 600 : 400,
            background: filter === f ? 'var(--cyan)' : 'var(--hover)',
            color: filter === f ? '#0f0f12' : 'var(--text3)',
            border: `1px solid ${filter === f ? 'var(--cyan)' : 'var(--border2)'}`,
            cursor: 'pointer',
            transition: 'all .18s',
            textTransform: 'capitalize',
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* News list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading
          ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 10 }} />)
          : news.length === 0
            ? (
              <div className="card empty-state">
                <Newspaper size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No updates in this category</p>
                <p>Check back later for news from management</p>
              </div>
            )
            : news.map(item => (
              <div key={item.id} className="card-sm hover-lift" style={{
                padding: '18px 20px',
                position: 'relative',
                borderColor: !item.read ? 'rgba(232,25,122,.30)' : item.pinned ? 'rgba(0,204,204,.25)' : 'var(--border)',
                background: !item.read
                  ? 'linear-gradient(135deg, rgba(232,25,122,.05), var(--bg2))'
                  : item.pinned
                    ? 'linear-gradient(135deg, rgba(0,204,204,.04), var(--bg2))'
                    : 'var(--bg2)',
                opacity: item.read ? .92 : 1,
              }}>
                {!item.read && (
                  <span aria-label="Unread" style={{
                    position: 'absolute', top: 14, left: -3,
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--rose)',
                    boxShadow: '0 0 12px rgba(232,25,122,.7)',
                  }}/>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '2px 9px',
                      borderRadius: 20, background: item.tagColor + '22', color: item.tagColor,
                      textTransform: 'uppercase', letterSpacing: '.05em', border: `1px solid ${item.tagColor}33`,
                    }}>
                      {item.tag}
                    </span>
                    {item.pinned && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--cyan)' }}>
                        <Pin size={9} /> Pinned
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{item.date}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: '-.01em' }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{item.body}</p>
                {item.author && (
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 12 }}>— {item.author.name}</p>
                )}
              </div>
            ))
        }
      </div>
    </div>
  );
}
