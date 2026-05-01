import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckCircle2, Loader2, Camera, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getHousemates } from '../../services/housemate.service';
import { getChores, claimChore, unclaimChore } from '../../services/chore.service';
import { useAuth } from '../../contexts/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Chore } from '../../types/domain.types';
import ChoreProofModal from '../../components/ChoreProofModal';

export default function Housemates() {
  usePageTitle('Housemates & Chores');
  const [tab, setTab] = useState<'mates'|'chores'>('mates');
  const [proofChore, setProofChore] = useState<Chore | null>(null);
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

  // Rejected chores still claimed by this student — surface them at the top
  const rejectedChores = chores.filter(
    c => c.claimedById === user?.id && c.proofStatus === 'REJECTED',
  );

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title">Housemates & Chores</h1>
        <p className="page-sub">Your block community and shared chores</p>
      </div>

      {/* ── Rejected-proof flag — student needs to resubmit ─────── */}
      {rejectedChores.length > 0 && (
        <div
          role="alert"
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(239,68,68,.12) 0%, rgba(239,68,68,.04) 100%)',
            border: '1px solid rgba(239,68,68,.32)',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(239,68,68,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={17} style={{ color: '#f87171' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
              {rejectedChores.length} chore{rejectedChores.length > 1 ? 's' : ''} need{rejectedChores.length === 1 ? 's' : ''} a new proof
            </p>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>
              Admin rejected your proof. Open the Chore Board to see the note and resubmit a clearer photo, or unclaim the chore if you can't redo it.
            </p>
            {tab !== 'chores' && (
              <button
                onClick={() => setTab('chores')}
                className="press-soft"
                style={{
                  marginTop: 10,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,.4)',
                  background: 'rgba(239,68,68,.10)',
                  color: '#f87171',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                See chores →
              </button>
            )}
          </div>
        </div>
      )}

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

      <ChoreProofModal chore={proofChore} onClose={() => setProofChore(null)} />

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
              Complete +20 🪙 (admin-approved)
            </span>
          </div>
          {cLoading
            ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)
            : chores.map(chore => (
              <ChoreCard key={chore.id} chore={chore} userId={user!.id}
                onClaim={() => claim(chore.id)}
                onUnclaim={() => unclaim(chore.id)}
                onComplete={() => setProofChore(chore)}
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
  const isMine     = chore.claimedById === userId;
  const isMineDone = chore.doneById === userId;
  const proofState = chore.proofStatus ?? null;
  const isPending  = proofState === 'PENDING' && isMineDone;
  const isApproved = proofState === 'APPROVED';
  const isRejected = proofState === 'REJECTED';
  const claimed    = !!chore.claimedById;
  const dimmed     = isApproved;

  // Border color reflects state
  const borderColor =
    isApproved ? 'rgba(74,222,128,.25)' :
    isPending  ? 'rgba(232,25,122,.25)' :
    isRejected ? 'rgba(239,68,68,.30)'  :
    isMine     ? 'rgba(0,204,204,.20)'  :
    'var(--border)';

  return (
    <div className="card-sm hover-lift" style={{
      padding: '14px 16px',
      borderColor,
      opacity: dimmed ? .65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 20, marginTop: 1 }}>{chore.icon}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{chore.name}</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{chore.frequency}</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, lineHeight: 1.5 }}>{chore.description}</p>

            {/* Proof state strip */}
            {isPending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--rose)' }}>
                <Clock size={11} />
                <span>Awaiting admin review · +20 🪙 unlocks on approval</span>
              </div>
            )}
            {isApproved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#4ade80' }}>
                <CheckCircle2 size={11} />
                <span>Approved · +20 🪙 added</span>
              </div>
            )}
            {isRejected && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#f87171' }}>
                <AlertTriangle size={11} style={{ marginTop: 1 }} />
                <span>Rejected{chore.adminNote ? ` — ${chore.adminNote}` : ''}. You can resubmit.</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {isApproved && (
            <span className="badge badge-cyan" style={{ borderColor: '#4ade80', color: '#4ade80' }}>Done</span>
          )}
          {isPending && (
            <span className="badge badge-rose">Pending</span>
          )}
          {!isApproved && !isPending && isMine && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onComplete} style={{
                padding: '6px 12px', background: 'rgba(232,25,122,.10)', color: 'var(--rose)',
                border: '1px solid rgba(232,25,122,.25)', borderRadius: 6, fontSize: 12,
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                display: 'inline-flex', alignItems: 'center', gap: 5,
                transition: 'all .22s cubic-bezier(.4,0,.2,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,25,122,.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,25,122,.10)'; }}>
                <Camera size={12} /> {isRejected ? 'Resubmit proof' : 'Submit proof'}
              </button>
              {!isRejected && (
                <button onClick={onUnclaim} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                  Unclaim
                </button>
              )}
            </div>
          )}
          {!isApproved && !isPending && !isMine && !claimed && (
            <button onClick={onClaim} disabled={loading} className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}>
              {loading && <Loader2 size={11} className="animate-spin" />}
              Claim +5🪙
            </button>
          )}
          {!isApproved && !isPending && claimed && !isMine && (
            <span className="badge badge-gray">Claimed</span>
          )}
        </div>
      </div>
    </div>
  );
}
