import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOccupancy, AdminRoom } from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';

const typeColor: Record<string, { color: string; bg: string }> = {
  SINGLE:  { color: '#60a5fa', bg: 'rgba(96,165,250,.12)' },
  DOUBLE:  { color: '#4ade80', bg: 'rgba(74,222,128,.12)' },
  STUDIO:  { color: '#fb923c', bg: 'rgba(251,146,60,.12)'  },
};

export default function AdminOccupancy() {
  usePageTitle('Occupancy · Admin');
  const [selectedBlock, setSelectedBlock] = useState<string>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-occupancy', selectedBlock],
    queryFn: () => getOccupancy(selectedBlock || undefined),
  });

  const rooms: AdminRoom[] = data?.rooms ?? [];
  const blocks: string[]   = data?.blocks ?? [];

  const occupied = rooms.filter(r => r.status === 'OCCUPIED').length;
  const vacant   = rooms.filter(r => r.status === 'VACANT').length;

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load occupancy data. Is the backend running?</p>
  );

  return (
    <div className="space-y-6 appear">

      {/* Header + block filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page-title">Occupancy</h1>
          <p className="page-sub">{occupied} occupied · {vacant} vacant</p>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['', ...blocks]).map(b => (
            <button
              key={b || 'all'}
              onClick={() => setSelectedBlock(b)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: selectedBlock === b ? 600 : 400,
                background: selectedBlock === b ? 'var(--cyan)' : 'var(--hover)',
                color: selectedBlock === b ? '#0f0f12' : 'var(--text3)',
                border: `1px solid ${selectedBlock === b ? 'var(--cyan)' : 'var(--border2)'}`,
                cursor: 'pointer', transition: 'all .18s',
              }}
            >
              {b ? `Block ${b}` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(0,204,204,.3)', border: '1px solid rgba(0,204,204,.5)', display: 'inline-block' }} />
          Occupied
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'inline-block' }} />
          Vacant
        </span>
      </div>

      {/* Room grid */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="card empty-state" style={{ padding: '40px 24px' }}>
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No rooms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {rooms.map(room => {
            const isOccupied = room.status === 'OCCUPIED';
            const resident   = room.allocation?.user;
            const tc = typeColor[room.type] ?? { color: 'var(--text3)', bg: 'var(--bg3)' };
            return (
              <div
                key={room.id}
                style={{
                  borderRadius: 12, padding: '12px', border: '1px solid',
                  borderColor: isOccupied ? 'rgba(0,204,204,.3)' : 'var(--border)',
                  background: isOccupied ? 'rgba(0,204,204,.06)' : 'var(--bg3)',
                  transition: 'all .18s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{room.number}</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    padding: '1px 6px', borderRadius: 4,
                    background: tc.bg, color: tc.color,
                    border: `1px solid ${tc.color}33`,
                  }}>
                    {room.type.charAt(0)}
                  </span>
                </div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>Blk {room.block}</p>
                {resident ? (
                  <p style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resident.name}</p>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>
                    {room.status === 'RESERVED' ? 'Reserved' : 'Vacant'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
