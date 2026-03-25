import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOccupancy, AdminRoom } from '../../services/admin.service';

const typeColor: Record<string, string> = {
  SINGLE:  'text-blue-400 border-blue-500/30',
  DOUBLE:  'text-green-400 border-green-500/30',
  STUDIO:  'text-orange-400 border-orange-500/30',
};

export default function AdminOccupancy() {
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
    <div className="text-rh-rose text-sm p-6">Failed to load occupancy data. Is the backend running?</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Occupancy</h1>
          <p className="text-white/40 text-sm mt-1">
            {occupied} occupied · {vacant} vacant
          </p>
        </div>

        {/* Block filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedBlock('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              selectedBlock === ''
                ? 'border-rh-cyan bg-rh-cyan/10 text-rh-cyan'
                : 'border-white/10 text-white/50 hover:border-white/20'
            }`}
          >
            All
          </button>
          {blocks.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBlock(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                selectedBlock === b
                  ? 'border-rh-cyan bg-rh-cyan/10 text-rh-cyan'
                  : 'border-white/10 text-white/50 hover:border-white/20'
              }`}
            >
              Block {b}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rh-cyan/30 border border-rh-cyan/50" />
          Occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white/8 border border-white/10" />
          Vacant
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {rooms.map(room => {
            const isOccupied = room.status === 'OCCUPIED';
            const resident   = room.allocation?.user;
            return (
              <div
                key={room.id}
                className={`rounded-xl p-3 border transition-all ${
                  isOccupied
                    ? 'bg-rh-cyan/8 border-rh-cyan/30'
                    : 'bg-white/4 border-white/8 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-mono font-semibold text-sm">{room.number}</span>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${typeColor[room.type] ?? 'text-white/40 border-white/10'}`}>
                    {room.type.charAt(0)}
                  </span>
                </div>
                <p className="text-white/30 text-xs">Blk {room.block}</p>
                {resident ? (
                  <p className="text-rh-cyan text-xs mt-2 truncate">{resident.name}</p>
                ) : (
                  <p className="text-white/20 text-xs mt-2">
                    {room.status === 'RESERVED' ? 'Reserved' : 'Vacant'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rooms.length === 0 && !isLoading && (
        <div className="text-center py-16 text-white/30">No rooms found</div>
      )}
    </div>
  );
}
