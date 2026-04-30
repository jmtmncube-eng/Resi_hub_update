import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getHousemates } from '../../services/housemate.service';
import { getChores, claimChore, unclaimChore, completeChore } from '../../services/chore.service';
import { useAuth } from '../../contexts/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Chore } from '../../types/domain.types';

export default function Housemates() {
  usePageTitle('Housemates');
  const [tab, setTab] = useState<'mates'|'chores'>('mates');
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: hmData, isLoading: hmLoading } = useQuery({ queryKey: ['housemates'], queryFn: getHousemates });
  const { data: chores = [], isLoading: cLoading } = useQuery<Chore[]>({ queryKey: ['chores'], queryFn: () => getChores() });

  const { mutate: claim, isPending: claiming } = useMutation({
    mutationFn: claimChore,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chores'] }); toast.success('Chore claimed! +5 🪙'); },
    onError:   () => toast.error('Failed to claim chore.'),
  });
  const { mutate: unclaim } = useMutation({
    mutationFn: unclaimChore,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chores'] }); toast.success('Chore unclaimed.'); },
    onError:   () => toast.error('Failed to unclaim chore.'),
  });
  const { mutate: complete } = useMutation({
    mutationFn: (id: string) => completeChore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chores'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Chore completed! +20 🪙');
    },
    onError: () => toast.error('Failed to complete chore.'),
  });

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title">Housemates</h1>
        <p className="page-sub">Your block community and shared chores</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2 }}>
        {(['mates', 'chores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 7, fontSize: 13,
            fontWeight: tab === t ? 600 : 400,
            background: tab === t ? 'var(--bg2)' : 'transparent',
            color: tab === t ? 'var(--text)' : 'var(--text3)',
            border: 'none', cursor: 'pointer', transition: 'all .18s',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {t === 'mates' ? 'Housemates' : 'Chore Board'}
          </button>
        ))}
      </div>

      {/* Housemates tab */}
      {tab === 'mates' && (
        <div>
          {hmLoading
            ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 112, borderRadius: 10 }} />)}
              </div>
            : !hmData?.housemates?.length
              ? (
                <div className="card empty-state">
                  <Users size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No other residents in your block</p>
                </div>
              )
              : (
                <>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                    {hmData.block} · {hmData.housemates.length} resident{hmData.housemates.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hmData.housemates.map(hm => (
                      <div key={hm.id} className="card-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
                        <div className="avatar avatar-cyan" style={{ width: 40, height: 40, fontSize: 13, fontWeight: 700 }}>
                          {hm.name.slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hm.name}</p>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Room {hm.room.number} · {hm.room.type}</p>
                          {hm.program && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hm.program}</p>}
                          {hm.bio && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hm.bio}</p>}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }} />
              Claim +5 🪙
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Complete +20 🪙
            </span>
          </div>
          {cLoading
            ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)
            : chores.map(chore => (
              <ChoreCard key={chore.id} chore={chore} userId={user!.id}
                onClaim={() => claim(chore.id)}
                onUnclaim={() => unclaim(chore.id)}
                onComplete={() => complete(chore.id)}
                loading={claiming}
              />
            ))
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
    <div className="card-sm" style={{
      padding: '14px 16px',
      borderColor: isDone ? 'rgba(74,222,128,.2)' : isMine ? 'rgba(0,204,204,.2)' : 'var(--border)',
      opacity: isDone ? .7 : 1,
      transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 20, marginTop: 1 }}>{chore.icon}</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{chore.name}</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{chore.frequency}</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, lineHeight: 1.5 }}>{chore.description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {isDone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#4ade80' }}>
              <CheckCircle2 size={12} /> Done
            </span>
          )}
          {!isDone && isMine && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onComplete} style={{ padding: '5px 10px', background: 'rgba(74,222,128,.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,.2)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                Mark done
              </button>
              <button onClick={onUnclaim} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                Unclaim
              </button>
            </div>
          )}
          {!isDone && !claimed && (
            <button onClick={onClaim} disabled={loading} className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}>
              {loading && <Loader2 size={11} className="animate-spin" />}
              Claim +5🪙
            </button>
          )}
          {!isDone && claimed && !isMine && (
            <span className="badge badge-gray">Claimed</span>
          )}
        </div>
      </div>
    </div>
  );
}
