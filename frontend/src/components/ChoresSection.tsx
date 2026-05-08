import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Camera, Clock, AlertTriangle, ListChecks, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getChores, claimChore, unclaimChore } from '../services/chore.service';
import { useAuth } from '../contexts/AuthContext';
import { Chore } from '../types/domain.types';
import ChoreProofModal from './ChoreProofModal';

/**
 * Reusable Chores list. Lives on the Wallet page (collapsed by default)
 * since chores feed into the same earn-credits loop as voucher tasks.
 *
 * Collapses by default — students click the header to expand. The header
 * still surfaces urgent state (rejected proof, pending review) so they
 * don't miss anything when collapsed.
 */
export default function ChoresSection({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [proofChore, setProofChore] = useState<Chore | null>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: chores = [], isLoading } = useQuery<Chore[]>({
    queryKey: ['chores'],
    queryFn:  () => getChores(),
  });

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

  const rejected = chores.filter(c => c.claimedById === user?.id && c.proofStatus === 'REJECTED').length;
  const pending  = chores.filter(c => c.doneById    === user?.id && c.proofStatus === 'PENDING' ).length;
  const claimed  = chores.filter(c => c.claimedById === user?.id && c.proofStatus !== 'APPROVED').length;
  const available = chores.filter(c => !c.claimedById).length;

  return (
    <div className="card-sm" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 18px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'rgba(0,204,204,.12)', border: '1px solid rgba(0,204,204,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ListChecks size={18} style={{ color: 'var(--cyan)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Weekly chores</p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {chores.length === 0
              ? 'No chores configured yet'
              : `${available} open · ${claimed} mine · earn credits per chore`}
          </p>
        </div>

        {rejected > 0 && (
          <span style={{
            padding: '3px 9px', borderRadius: 999,
            fontSize: 10, fontWeight: 700, color: '#f87171',
            background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
            fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
          }}>{rejected} rejected</span>
        )}
        {pending > 0 && (
          <span style={{
            padding: '3px 9px', borderRadius: 999,
            fontSize: 10, fontWeight: 700, color: 'var(--rose)',
            background: 'rgba(232,25,122,.10)', border: '1px solid rgba(232,25,122,.3)',
            fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
          }}>{pending} pending</span>
        )}

        <ChevronDown size={16} style={{
          color: 'var(--text3)',
          transition: 'transform .2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 18px 18px 18px', borderTop: '1px solid var(--border)' }}>
          {isLoading ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--cyan)' }} />
            </div>
          ) : chores.length === 0 ? (
            <p style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
              No chores available right now. Check back later.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {chores.map(chore => (
                <ChoreCard key={chore.id} chore={chore} userId={user!.id}
                  onClaim={() => claim(chore.id)}
                  onUnclaim={() => unclaim(chore.id)}
                  onComplete={() => setProofChore(chore)}
                  loading={claiming}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ChoreProofModal chore={proofChore} onClose={() => setProofChore(null)} />
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

  // Per-chore reward (set by admin); fall back to 20 for legacy chores
  const reward = (chore as Chore & { creditReward?: number }).creditReward ?? 20;

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
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              {chore.frequency} · <span style={{ color: 'var(--cyan)' }}>{reward} 🪙</span>
            </p>
            {chore.description && (
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, lineHeight: 1.5 }}>{chore.description}</p>
            )}

            {isPending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--rose)' }}>
                <Clock size={11} />
                <span>Awaiting admin review · +{reward} 🪙 unlocks on approval</span>
              </div>
            )}
            {isApproved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#4ade80' }}>
                <CheckCircle2 size={11} />
                <span>Approved · +{reward} 🪙 added</span>
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
          {isApproved && <span className="badge badge-cyan" style={{ borderColor: '#4ade80', color: '#4ade80' }}>Done</span>}
          {isPending  && <span className="badge badge-rose">Pending</span>}
          {!isApproved && !isPending && isMine && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onComplete} style={{
                padding: '6px 12px', background: 'rgba(232,25,122,.10)', color: 'var(--rose)',
                border: '1px solid rgba(232,25,122,.25)', borderRadius: 6, fontSize: 12,
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <Camera size={12} /> {isRejected ? 'Resubmit' : 'Submit proof'}
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
