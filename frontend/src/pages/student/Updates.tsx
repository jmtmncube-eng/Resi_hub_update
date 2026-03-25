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
        <h1 className="text-xl font-semibold text-white">Residence Updates</h1>
        <p className="text-sm text-white/40 mt-0.5">Notices and announcements from management</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-rh-cyan text-rh-bg'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/8'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* News list */}
      <div className="space-y-3">
        {isLoading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-rh-bg2 rounded-xl animate-pulse" />)
          : news.length === 0
            ? (
              <div className="bg-rh-bg2 border border-white/7 rounded-2xl py-12 text-center">
                <Newspaper size={28} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No updates in this category</p>
              </div>
            )
            : news.map(item => (
              <div key={item.id} className={`bg-rh-bg2 border rounded-xl p-5 transition-colors ${
                item.pinned ? 'border-rh-cyan/20' : 'border-white/7'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-medium"
                      style={{ background: item.tagColor + '20', color: item.tagColor }}>
                      {item.tag}
                    </span>
                    {item.pinned && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-rh-cyan">
                        <Pin size={10} /> Pinned
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/30 font-mono flex-shrink-0">{item.date}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{item.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{item.body}</p>
                {item.author && (
                  <p className="text-xs text-white/25 font-mono mt-3">— {item.author.name}</p>
                )}
              </div>
            ))
        }
      </div>
    </div>
  );
}
