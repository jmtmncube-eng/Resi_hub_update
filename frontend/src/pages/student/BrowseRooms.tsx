import { useState } from 'react';
import { useQuery }  from '@tanstack/react-query';
import { getAvailableRooms, AvailableRoom } from '../../services/application.service';

const typeLabel: Record<string, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  STUDIO: 'Studio',
};

const typeIcon: Record<string, string> = {
  SINGLE: '🛏️',
  DOUBLE: '🛏️🛏️',
  STUDIO: '🏠',
};

const typeDesc: Record<string, string> = {
  SINGLE: 'Private single-occupancy room',
  DOUBLE: 'Shared double-occupancy room',
  STUDIO: 'Self-contained studio unit',
};

const TYPE_FILTERS = ['All', 'SINGLE', 'DOUBLE', 'STUDIO'] as const;

export default function BrowseRooms() {
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [blockFilter, setBlockFilter] = useState<string>('All');

  const { data: rooms = [], isLoading, isError } = useQuery<AvailableRoom[]>({
    queryKey: ['available-rooms'],
    queryFn:  () => getAvailableRooms(),
    refetchInterval: 60_000,
  });

  const blocks = ['All', ...Array.from(new Set(rooms.map(r => r.block))).sort()];

  const filtered = rooms.filter(r => {
    if (typeFilter  !== 'All' && r.type  !== typeFilter)  return false;
    if (blockFilter !== 'All' && r.block !== blockFilter) return false;
    return true;
  });

  if (isError) return (
    <div className="text-rh-rose text-sm p-6">Failed to load rooms. Is the backend running?</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Browse Rooms</h1>
        <p className="text-white/40 text-sm mt-1">
          {rooms.length} available room{rooms.length !== 1 ? 's' : ''} — contact admin to request one
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Type filter */}
        <div className="flex gap-1 bg-white/4 border border-white/8 rounded-lg p-1">
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-rh-cyan text-rh-dark'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {t === 'All' ? 'All Types' : typeLabel[t]}
            </button>
          ))}
        </div>

        {/* Block filter */}
        {blocks.length > 2 && (
          <div className="flex gap-1 bg-white/4 border border-white/8 rounded-lg p-1">
            {blocks.map(b => (
              <button
                key={b}
                onClick={() => setBlockFilter(b)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  blockFilter === b
                    ? 'bg-rh-cyan text-rh-dark'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {b === 'All' ? 'All Blocks' : `Block ${b}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Room grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🏚️</p>
          <p className="text-white font-semibold">No rooms match your filters</p>
          <p className="text-white/40 text-sm mt-1">Try changing the type or block filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(room => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
        <span className="text-xl flex-shrink-0">ℹ️</span>
        <div>
          <p className="text-yellow-400 font-semibold text-sm">How room allocation works</p>
          <p className="text-yellow-400/70 text-xs mt-0.5">
            Room assignments are handled by the residence admin. Browse available rooms and contact the office to express interest. You will receive confirmation once a room is allocated to you.
          </p>
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: AvailableRoom }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 hover:border-rh-cyan/30 hover:bg-white/6 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{typeIcon[room.type] ?? '🛏️'}</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-green-500/30 text-green-400 bg-green-500/8">
          Vacant
        </span>
      </div>

      <p className="text-white font-bold text-lg">Room {room.number}</p>
      <p className="text-white/50 text-sm">Block {room.block}</p>

      <div className="mt-2 text-xs text-white/40">{typeDesc[room.type]}</div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-white/30 text-xs">Monthly Rent</p>
          <p className="text-rh-cyan font-bold font-mono text-lg">
            R{Number(room.price).toLocaleString()}
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/6 text-white/50 border border-white/8">
          {typeLabel[room.type]}
        </span>
      </div>
    </div>
  );
}
