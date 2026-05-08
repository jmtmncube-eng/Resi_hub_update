import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Users, Home, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { getAvailableRooms, selectRoom, AvailableRoom } from '../../services/application.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ROUTES } from '../../constants/routes';
import { Modal } from '../../components/Modal';

const typeLabel: Record<string, string> = {
  SINGLE: 'Single', DOUBLE: 'Double', TRIPLE: 'Triple', QUAD: 'Quad', STUDIO: 'Studio',
};

const typeIcon: Record<string, string> = {
  SINGLE: '🛏️', DOUBLE: '👯', TRIPLE: '🛏️🛏️🛏️', QUAD: '🏘️', STUDIO: '🏠',
};

const typeDesc: Record<string, string> = {
  SINGLE: 'Private single-occupancy room',
  DOUBLE: 'Shared double-occupancy room — 2 students',
  TRIPLE: 'Shared triple — 3 students',
  QUAD:   'Shared quad — 4 students',
  STUDIO: 'Self-contained studio unit',
};

const TYPE_FILTERS = ['All', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'STUDIO'] as const;

export default function BrowseRooms() {
  usePageTitle('Browse Rooms');
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter]   = useState<string>('All');
  const [blockFilter, setBlockFilter] = useState<string>('All');
  const [confirming, setConfirming]   = useState<AvailableRoom | null>(null);

  const { data: rooms = [], isLoading, isError } = useQuery<AvailableRoom[]>({
    queryKey: ['available-rooms'],
    queryFn:  () => getAvailableRooms(),
    refetchInterval: 30_000,
  });

  const blocks = ['All', ...Array.from(new Set(rooms.map(r => r.block))).sort()];
  const filtered = rooms.filter(r => {
    if (typeFilter  !== 'All' && r.type  !== typeFilter)  return false;
    if (blockFilter !== 'All' && r.block !== blockFilter) return false;
    return true;
  });

  const reserve = useMutation({
    mutationFn: (roomId: string) => selectRoom(roomId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['available-rooms'] });
      qc.invalidateQueries({ queryKey: ['application-status'] });
      toast.success('Room reserved! Admin will confirm your move-in.');
      setConfirming(null);
      navigate(ROUTES.APPLICATION);
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to reserve that room');
    },
  });

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>
      Failed to load rooms. Is the backend running?
    </p>
  );

  return (
    <div className="space-y-5 appear">
      {/* Header */}
      <div>
        <h1 className="page-title">Browse Rooms</h1>
        <p className="page-sub">
          {rooms.length} room{rooms.length !== 1 ? 's' : ''} with open slots — pick the one you'd like
        </p>
      </div>

      {/* Banner — how this works */}
      <div style={{
        padding: '14px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(0,204,204,.08), var(--bg2))',
        border: '1px solid rgba(0,204,204,.22)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <Sparkles size={16} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Pick a room to reserve it
          </p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, lineHeight: 1.5 }}>
            Choose any room with open slots. Reserving puts you in line — admin will confirm your move-in shortly.
            Shared rooms (Double/Triple/Quad) show how many slots are still available.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="press-soft"
              style={{
                padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: typeFilter === t ? 600 : 400,
                background: typeFilter === t ? 'var(--bg2)' : 'transparent',
                color: typeFilter === t ? 'var(--text)' : 'var(--text3)',
                cursor: 'pointer',
              }}
            >
              {t === 'All' ? 'All' : typeLabel[t]}
            </button>
          ))}
        </div>
        {blocks.length > 2 && (
          <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
            {blocks.map(b => (
              <button
                key={b}
                onClick={() => setBlockFilter(b)}
                className="press-soft"
                style={{
                  padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: blockFilter === b ? 600 : 400,
                  background: blockFilter === b ? 'var(--bg2)' : 'transparent',
                  color: blockFilter === b ? 'var(--text)' : 'var(--text3)',
                  cursor: 'pointer',
                }}
              >
                {b === 'All' ? 'All blocks' : `Blk ${b}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Home size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No rooms match your filters</p>
          <p>Try changing the type or block filter</p>
        </div>
      ) : (
        <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(room => (
            <RoomCard key={room.id} room={room} onPick={() => setConfirming(room)} />
          ))}
        </div>
      )}

      {/* Confirm modal */}
      <Modal open={!!confirming} onClose={() => setConfirming(null)} maxWidth={420}>
        {confirming && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Reserve this room?</p>
              <button onClick={() => setConfirming(null)} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{
              padding: '14px 16px', marginBottom: 16, borderRadius: 10,
              background: 'var(--bg3)', border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                Room {confirming.number} · Block {confirming.block}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                {typeLabel[confirming.type]} · {typeDesc[confirming.type]}
              </p>
              <p style={{ fontSize: 13, color: 'var(--cyan)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 8 }}>
                R{Number(confirming.price).toLocaleString()} / month
              </p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                {confirming.vacantSlots} of {confirming.capacity} slot{confirming.capacity !== 1 ? 's' : ''} available
              </p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.5 }}>
              Reserving puts you in line for this room. Admin confirms your move-in once you're ready.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => reserve.mutate(confirming.id)}
                disabled={reserve.isPending}
                className="btn-primary press-soft"
                style={{ flex: 1, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {reserve.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Reserving…</>
                  : <><CheckCircle2 size={13} /> Reserve</>}
              </button>
              <button onClick={() => setConfirming(null)} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function RoomCard({ room, onPick }: { room: AvailableRoom; onPick: () => void }) {
  const isShared = room.capacity > 1;
  return (
    <button
      onClick={onPick}
      className="card-sm hover-lift press-soft"
      style={{
        padding: '16px 18px',
        textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer',
        borderColor: 'var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 22 }}>{typeIcon[room.type] ?? '🛏️'}</span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          padding: '2px 9px', borderRadius: 999,
          background: 'rgba(74,222,128,.12)', color: '#4ade80',
          border: '1px solid rgba(74,222,128,.3)',
        }}>
          {room.vacantSlots}/{room.capacity} open
        </span>
      </div>
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Room {room.number}</p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
          Block {room.block} · {typeLabel[room.type]}
        </p>
      </div>
      {isShared && (
        <p style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={11} />
          {room.occupied > 0
            ? `${room.occupied} ${room.occupied === 1 ? 'tenant' : 'tenants'} already there`
            : 'Be the first one in'}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>
          R{Number(room.price).toLocaleString()}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ month</span>
      </div>
    </button>
  );
}
