import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { getHousemates } from '../../services/housemate.service';
import { usePageTitle } from '../../hooks/usePageTitle';

/**
 * Housemates page — lists everyone living in the same block.
 * Chores were moved out of this page and live on the Wallet page now,
 * grouped with the other earn-credits flows (vouchers + tasks).
 */
export default function Housemates() {
  usePageTitle('Housemates');
  const { data, isLoading } = useQuery({ queryKey: ['housemates'], queryFn: getHousemates });

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title">Housemates</h1>
        <p className="page-sub">The other residents in your block</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 112, borderRadius: 10 }} />)}
        </div>
      ) : !data?.housemates?.length ? (
        <div className="card empty-state">
          <Users size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No other residents in your block</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            You're the first one in. New move-ins will appear here as they're allocated.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
            {data.block} · {data.housemates.length} resident{data.housemates.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.housemates.map(hm => (
              <div key={hm.id} className="card-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
                <div className="avatar avatar-cyan" style={{ width: 40, height: 40, fontSize: 13, fontWeight: 700 }}>
                  {hm.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hm.name}</p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Room {hm.room.number} · {hm.room.type}</p>
                  {hm.program && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hm.program}</p>
                  )}
                  {hm.bio && (
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hm.bio}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
