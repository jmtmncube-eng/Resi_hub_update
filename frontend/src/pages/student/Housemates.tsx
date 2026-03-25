import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckCircle2, Loader2 } from 'lucide-react';
import { getHousemates } from '../../services/housemate.service';
import { getChores, claimChore, unclaimChore, completeChore } from '../../services/chore.service';
import { useAuth } from '../../contexts/AuthContext';
import { Chore } from '../../types/domain.types';

export default function Housemates() {
  const [tab, setTab] = useState<'mates'|'chores'>('mates');
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: hmData, isLoading: hmLoading } = useQuery({
    queryKey: ['housemates'],
    queryFn:  getHousemates,
  });

  const { data: chores = [], isLoading: cLoading } = useQuery<Chore[]>({
    queryKey: ['chores'],
    queryFn:  () => getChores(),
  });

  const { mutate: claim, isPending: claiming } = useMutation({
    mutationFn: claimChore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores'] }),
  });

  const { mutate: unclaim } = useMutation({
    mutationFn: unclaimChore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores'] }),
  });

  const { mutate: complete } = useMutation({
    mutationFn: (id: string) => completeChore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chores'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="text-xl font-semibold text-white">Housemates</h1>
        <p className="text-sm text-white/40 mt-0.5">Your block community and shared chores</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-rh-bg3 rounded-xl p-1 w-fit">
        {(['mates', 'chores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-rh-bg2 text-white shadow-sm' : 'text-white/40 hover:text-white'
            }`}>
            {t === 'mates' ? 'Housemates' : 'Chore Board'}
          </button>
        ))}
      </div>

      {/* Housemates tab */}
      {tab === 'mates' && (
        <div>
          {hmLoading
            ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-rh-bg2 rounded-xl animate-pulse" />)}
              </div>
            : !hmData?.housemates?.length
              ? (
                <div className="bg-rh-bg2 border border-white/7 rounded-2xl py-12 text-center">
                  <Users size={28} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No other residents in your block</p>
                </div>
              )
              : (
                <>
                  <p className="text-sm text-white/40 mb-3">{hmData.block} · {hmData.housemates.length} resident{hmData.housemates.length !== 1 ? 's' : ''}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hmData.housemates.map(hm => (
                      <div key={hm.id} className="bg-rh-bg2 border border-white/7 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-rh-cyan/15 flex items-center justify-center text-rh-cyan font-bold text-sm flex-shrink-0">
                          {hm.name.slice(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{hm.name}</p>
                          <p className="text-xs text-white/40 truncate">Room {hm.room.number} · {hm.room.type}</p>
                          {hm.program && <p className="text-xs text-white/30 truncate mt-0.5">{hm.program}</p>}
                          {hm.bio && <p className="text-xs text-white/25 mt-1 line-clamp-2">{hm.bio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
          }
        </div>
      )}

      {/* Chore board tab */}
      {tab === 'chores' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-white/30 font-mono mb-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rh-cyan inline-block" /> Claim +5 🪙</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Complete +20 🪙</span>
          </div>
          {cLoading
            ? [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-rh-bg2 rounded-xl animate-pulse" />)
            : chores.map(chore => <ChoreCard key={chore.id} chore={chore} userId={user!.id}
                onClaim={() => claim(chore.id)}
                onUnclaim={() => unclaim(chore.id)}
                onComplete={() => complete(chore.id)}
                loading={claiming}
              />)
          }
        </div>
      )}
    </div>
  );
}

function ChoreCard({ chore, userId, onClaim, onUnclaim, onComplete, loading }: {
  chore: Chore; userId: string;
  onClaim: () => void; onUnclaim: () => void; onComplete: () => void; loading: boolean;
}) {
  const isMine  = chore.claimedById === userId;
  const isDone  = !!chore.doneById;
  const claimed = !!chore.claimedById;

  return (
    <div className={`bg-rh-bg2 border rounded-xl p-4 transition-colors ${
      isDone ? 'border-green-500/20 opacity-60' : isMine ? 'border-rh-cyan/20' : 'border-white/7'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{chore.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{chore.name}</p>
            <p className="text-xs text-white/40 mt-0.5">{chore.frequency}</p>
            <p className="text-xs text-white/30 mt-1">{chore.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {isDone && (
            <span className="flex items-center gap-1 text-[11px] text-green-400 font-mono">
              <CheckCircle2 size={12} /> Done
            </span>
          )}
          {!isDone && isMine && (
            <div className="flex gap-1.5">
              <button onClick={onComplete}
                className="px-2.5 py-1 bg-green-500/15 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/25 transition-colors">
                Mark done
              </button>
              <button onClick={onUnclaim}
                className="px-2.5 py-1 bg-white/5 text-white/40 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors">
                Unclaim
              </button>
            </div>
          )}
          {!isDone && !claimed && (
            <button onClick={onClaim} disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 bg-rh-cyan/15 text-rh-cyan text-xs font-medium rounded-lg hover:bg-rh-cyan/25 disabled:opacity-50 transition-colors">
              {loading && <Loader2 size={11} className="animate-spin" />}
              Claim +5🪙
            </button>
          )}
          {!isDone && claimed && !isMine && (
            <span className="text-[11px] font-mono text-white/30 px-2 py-0.5 bg-white/5 rounded-full">Claimed</span>
          )}
        </div>
      </div>
    </div>
  );
}
