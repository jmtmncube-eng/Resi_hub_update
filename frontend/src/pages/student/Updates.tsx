import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, Pin } from 'lucide-react';
import { getNews } from '../../services/news.service';

const FILTERS = ['All', 'maintenance', 'wifi', 'grounds', 'notice'];

export default function Updates() {
  const [filter, setFilter] = useState('All');

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news', filter],
    queryFn:  () => getNews(filter === 'All' ? undefined : filter),
  });

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title">Residence Updates</h1>
        <p className="page-sub">Notices and announcements from management</p>
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
              <div key={item.id} className="card-sm" style={{
                padding: '18px 20px',
                borderColor: item.pinned ? 'rgba(0,204,204,.25)' : 'var(--border)',
                background: item.pinned ? 'linear-gradient(135deg, rgba(0,204,204,.04), var(--bg2))' : 'var(--bg2)',
              }}>
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
