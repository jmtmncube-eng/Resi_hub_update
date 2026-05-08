import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, Loader2, Upload, CheckCircle, Clock, XCircle,
  Eye, Key, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getWallet, getVouchers, getLeaderboard,
  redeemVoucher, submitTaskProof,
} from '../../services/wallet.service';
import { useAuth } from '../../contexts/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { format } from 'date-fns';
import type { Voucher } from '../../types/domain.types';
import ConfirmModal from '../../components/ConfirmModal';
import ChoresSection from '../../components/ChoresSection';

const TX_ICON: Record<string, string>   = { EARN: '⬆', REDEEM: '🎟', ADJUST: '⚙' };
const TX_COLOR: Record<string, string>  = { EARN: '#4ade80', REDEEM: 'var(--rose)', ADJUST: 'var(--cyan)' };
const TX_BG: Record<string, string>     = { EARN: 'rgba(74,222,128,.1)', REDEEM: 'rgba(232,25,122,.1)', ADJUST: 'rgba(0,204,204,.1)' };

/* ── Claim status badge ──────────────────────────────────────────── */
function ClaimBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING:  { label: 'Under Review', color: '#a78bfa', icon: <Clock    size={10} /> },
    APPROVED: { label: 'Approved',     color: 'var(--cyan)', icon: <CheckCircle size={10} /> },
    REJECTED: { label: 'Rejected',     color: 'var(--rose)', icon: <XCircle    size={10} /> },
  };
  const m = map[status];
  if (!m) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, color: m.color,
      fontFamily: "'IBM Plex Mono', monospace",
      background: `${m.color}18`, border: `1px solid ${m.color}40`,
      borderRadius: 20, padding: '2px 8px',
    }}>
      {m.icon} {m.label}
    </span>
  );
}

/* ── Task voucher card ───────────────────────────────────────────── */
interface TaskCardProps {
  v:           Voucher;
  expanded:    boolean;
  onExpand:    () => void;
  onCollapse:  () => void;
  proof:       string | null;        // base64 preview
  onPickProof: () => void;
  onClearProof: () => void;
  submitting:  boolean;
  onSubmit:    () => void;
}

function TaskCard({
  v, expanded, onExpand, onCollapse,
  proof, onPickProof, onClearProof, submitting, onSubmit,
}: TaskCardProps) {
  const claim        = v.myClaim;
  const claimStatus  = claim?.status;
  const isApproved   = claimStatus === 'APPROVED';
  const isRejected   = claimStatus === 'REJECTED';
  const isPending    = claimStatus === 'PENDING';
  const canUpload    = !isPending && !isApproved;   // no claim or rejected

  return (
    <div className="card-sm" style={{ transition: 'opacity .2s' }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 26 }}>{v.icon}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {claimStatus && <ClaimBadge status={claimStatus} />}
          {!claimStatus && (
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, color: 'var(--cyan)',
              background: 'rgba(0,204,204,.08)', border: '1px solid rgba(0,204,204,.2)',
              borderRadius: 20, padding: '2px 8px',
            }}>TASK</span>
          )}
        </div>
      </div>

      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{v.name}</p>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>{v.description}</p>

      {/* Task requirement */}
      {v.taskTitle && (
        <div style={{
          background: 'rgba(0,204,204,.04)', border: '1px solid rgba(0,204,204,.12)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
        }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--cyan)', marginBottom: 3, letterSpacing: '.06em' }}>TASK REQUIRED</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{v.taskTitle}</p>
        </div>
      )}

      {/* Approved reward reveal */}
      {isApproved && (v.pin || v.imageUrl) && (
        <div style={{
          background: 'rgba(0,204,204,.06)', border: '1px solid rgba(0,204,204,.2)',
          borderRadius: 8, padding: '10px 12px', marginBottom: 12,
        }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--cyan)', marginBottom: 6, letterSpacing: '.06em' }}>YOUR REWARD</p>
          {v.pin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: v.imageUrl ? 8 : 0 }}>
              <Key size={12} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '.12em' }}>{v.pin}</span>
            </div>
          )}
          {v.imageUrl && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <ImageIcon size={12} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Voucher image</span>
              </div>
              <img src={v.imageUrl} alt="Voucher" style={{ maxWidth: '100%', borderRadius: 6, maxHeight: 160, objectFit: 'contain' }} />
            </div>
          )}
        </div>
      )}

      {/* Approved — no PIN/image (admin may not have added one) */}
      {isApproved && !v.pin && !v.imageUrl && (
        <div style={{
          background: 'rgba(0,204,204,.06)', border: '1px solid rgba(0,204,204,.2)',
          borderRadius: 8, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle size={14} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: 'var(--cyan)' }}>Your proof has been approved — contact residence admin to claim your reward.</p>
        </div>
      )}

      {/* Upload section */}
      {canUpload && (
        <>
          {!expanded ? (
            <button
              onClick={onExpand}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: isRejected ? 'rgba(232,25,122,.1)' : 'rgba(0,204,204,.08)',
                border: `1px solid ${isRejected ? 'rgba(232,25,122,.28)' : 'rgba(0,204,204,.2)'}`,
                color: isRejected ? 'var(--rose)' : 'var(--cyan)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Upload size={13} />
              {isRejected ? 'Re-upload Proof' : 'Upload Proof'}
            </button>
          ) : (
            <div style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {proof ? (
                <>
                  <img src={proof} alt="Proof preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={onClearProof}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text3)',
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Change
                    </button>
                    <button
                      onClick={onSubmit}
                      disabled={submitting}
                      className="btn-primary"
                      style={{ flex: 2, justifyContent: 'center', padding: '8px 0', fontSize: 12 }}
                    >
                      {submitting && <Loader2 size={11} className="animate-spin" />}
                      Submit Proof
                    </button>
                  </div>
                  <button onClick={onCollapse} style={{ background: 'none', border: 'none', color: 'var(--text4)', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onPickProof}
                    style={{
                      width: '100%', padding: '18px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                      background: 'var(--hover)', border: '2px dashed var(--border)', color: 'var(--text3)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    <Eye size={18} style={{ color: 'var(--text4)' }} />
                    Tap to select image
                  </button>
                  <button onClick={onCollapse} style={{ background: 'none', border: 'none', color: 'var(--text4)', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Pending — proof under review */}
      {isPending && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
          background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 8,
        }}>
          <Clock size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#a78bfa' }}>Proof submitted — awaiting admin review.</p>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function Wallet() {
  usePageTitle('Wallet & Credits');
  const [tab, setTab] = useState<'balance' | 'shop' | 'tasks' | 'leaderboard'>('balance');
  const { user } = useAuth();
  const qc = useQueryClient();

  // per-task-card state
  const [expandedTask, setExpandedTask]   = useState<string | null>(null);
  const [proofMap, setProofMap]           = useState<Record<string, string>>({});
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const pickingFor                        = useRef<string | null>(null);

  // Confirm-before-redeem state
  const [confirmVoucher, setConfirmVoucher] = useState<Voucher | null>(null);

  const { data: wallet, isLoading: wLoading } = useQuery({ queryKey: ['wallet'],      queryFn: getWallet });
  const { data: vouchers = [] }               = useQuery({ queryKey: ['vouchers'],    queryFn: getVouchers });
  const { data: leaderboard = [] }            = useQuery({ queryKey: ['leaderboard'], queryFn: getLeaderboard });

  // split vouchers
  const shopVouchers = vouchers.filter(v => !v.requiresProof && v.isActive);
  const taskVouchers = vouchers.filter(v =>  v.requiresProof && v.isActive);

  const { mutate: redeem, isPending: redeeming } = useMutation({
    mutationFn: redeemVoucher,
    onSuccess: (_, voucherId) => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      const v = shopVouchers.find(x => x.id === voucherId);
      toast.success(`${v?.icon ?? '🎟'} ${v?.name ?? 'Voucher'} redeemed! Check your inbox.`);
      setConfirmVoucher(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to redeem voucher.');
      setConfirmVoucher(null);
    },
  });

  const { mutate: doSubmitProof, isPending: submittingProof, variables: submittingFor } = useMutation({
    mutationFn: ({ voucherId, proofUrl }: { voucherId: string; proofUrl: string }) =>
      submitTaskProof(voucherId, proofUrl),
    onSuccess: (_, { voucherId }) => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      setExpandedTask(null);
      setProofMap(m => { const n = { ...m }; delete n[voucherId]; return n; });
      toast.success('Proof submitted! Awaiting admin review.');
    },
    onError: () => toast.error('Failed to submit proof. Please try again.'),
  });

  /* pick image via hidden file input */
  function openPicker(voucherId: string) {
    pickingFor.current = voucherId;
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const vid  = pickingFor.current;
    if (!file || !vid) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setProofMap(m => ({ ...m, [vid]: url }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const tabs = [
    { key: 'balance',     label: 'History'       },
    { key: 'shop',        label: 'Voucher Shop'   },
    { key: 'tasks',       label: `Tasks${taskVouchers.length ? ` (${taskVouchers.length})` : ''}` },
    { key: 'leaderboard', label: 'Leaderboard'    },
  ] as const;

  return (
    <div className="space-y-5 appear">

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />

      {/* Page header */}
      <div>
        <h1 className="page-title">Wallet & Credits</h1>
        <p className="page-sub">Earn credits from chores + tasks, redeem vouchers, climb the leaderboard</p>
      </div>

      {/* Chores — collapsible, sits above the voucher catalog so students
          see their earn-options first when they land on this page. */}
      <ChoresSection />

      {/* Balance hero */}
      {!wLoading && wallet && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,204,204,.12) 0%, var(--bg2) 100%)',
          border: '1px solid rgba(0,204,204,.2)', borderRadius: 14, padding: '28px 24px',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--cyan)' }} />
          <p className="micro-label" style={{ marginBottom: 8, color: 'var(--text3)' }}>Your balance</p>
          <p style={{ fontSize: 52, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '-.03em', lineHeight: 1.1 }}>{wallet.credits}</p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>credits 🪙</p>
        </div>
      )}
      {wLoading && <div className="skeleton" style={{ height: 130, borderRadius: 14 }} />}

      {/* Tab switcher */}
      <div style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2 }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 13,
            fontWeight: tab === key ? 600 : 400,
            background: tab === key ? 'var(--bg2)' : 'transparent',
            color: tab === key ? 'var(--text)' : 'var(--text3)',
            border: 'none', cursor: 'pointer', transition: 'all .18s',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── History ──────────────────────────────────────────────── */}
      {tab === 'balance' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {wLoading
            ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, margin: '8px 12px', borderRadius: 8 }} />)
            : !wallet?.transactions?.length
              ? <p style={{ color: 'var(--text3)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>No transactions yet</p>
              : wallet.transactions.map(tx => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }} className="last:border-0">
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: TX_BG[tx.type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {TX_ICON[tx.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.note}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                      {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: TX_COLOR[tx.type], flexShrink: 0 }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))
          }
        </div>
      )}

      {/* ── Voucher Shop ─────────────────────────────────────────── */}
      {tab === 'shop' && (
        <>
          {shopVouchers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🎟</p>
              <p style={{ fontSize: 14, color: 'var(--text3)' }}>No vouchers available right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shopVouchers.map(v => {
                const canAfford    = (wallet?.credits ?? 0) >= v.cost;
                const isConfirming = confirmVoucher?.id === v.id;
                return (
                  <div key={v.id} className="card-sm" style={{ opacity: canAfford ? 1 : .65, transition: 'opacity .2s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 26 }}>{v.icon}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{v.stock} left</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{v.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.5 }}>{v.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>{v.cost} 🪙</span>
                      <button
                        onClick={() => canAfford && v.stock > 0 && setConfirmVoucher(v)}
                        disabled={!canAfford || isConfirming || v.stock < 1}
                        className="btn-primary"
                        style={{ padding: '7px 14px', fontSize: 12 }}
                      >
                        {v.stock < 1 ? 'Out of stock' : !canAfford ? 'Not enough' : 'Redeem'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Task Vouchers ─────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <>
          {/* Explainer banner */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(0,204,204,.05)', border: '1px solid rgba(0,204,204,.15)',
            borderRadius: 10, padding: '12px 16px',
          }}>
            <CheckCircle size={15} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              Complete the task described on each card, then upload a photo as proof. Admin will review and unlock your reward (PIN or voucher image).
            </p>
          </div>

          {taskVouchers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🏆</p>
              <p style={{ fontSize: 14, color: 'var(--text3)' }}>No task vouchers available right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {taskVouchers.map(v => (
                <TaskCard
                  key={v.id}
                  v={v}
                  expanded={expandedTask === v.id}
                  onExpand={() => setExpandedTask(v.id)}
                  onCollapse={() => { setExpandedTask(null); setProofMap(m => { const n = { ...m }; delete n[v.id]; return n; }); }}
                  proof={proofMap[v.id] ?? null}
                  onPickProof={() => openPicker(v.id)}
                  onClearProof={() => setProofMap(m => { const n = { ...m }; delete n[v.id]; return n; })}
                  submitting={submittingProof && submittingFor?.voucherId === v.id}
                  onSubmit={() => {
                    const url = proofMap[v.id];
                    if (url) doSubmitProof({ voucherId: v.id, proofUrl: url });
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Leaderboard ───────────────────────────────────────────── */}
      {tab === 'leaderboard' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={15} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Block Credits Leaderboard</span>
          </div>
          {leaderboard.map((entry, i) => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px',
              borderBottom: '1px solid var(--border)',
              background: entry.user.id === user?.id ? 'rgba(0,204,204,.04)' : 'transparent',
            }} className="last:border-0">
              <span style={{
                width: 20, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                color: i === 0 ? '#facc15' : i === 1 ? 'var(--text3)' : i === 2 ? '#fb923c' : 'var(--text4)',
              }}>
                {i + 1}
              </span>
              <div className="avatar avatar-cyan" style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700 }}>
                {entry.user.name.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{entry.user.name}</span>
              {entry.user.id === user?.id && (
                <span className="badge badge-cyan" style={{ padding: '1px 6px', fontSize: 9 }}>You</span>
              )}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: 'var(--cyan)', flexShrink: 0 }}>
                {entry.credits} 🪙
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Redeem confirmation modal ────────────────────────────── */}
      <ConfirmModal
        open={!!confirmVoucher}
        title={`Redeem ${confirmVoucher?.name ?? 'Voucher'}?`}
        message={`This will spend ${confirmVoucher?.cost ?? 0} 🪙 from your balance. You currently have ${wallet?.credits ?? 0} 🪙.`}
        confirmLabel="Yes, Redeem"
        loading={redeeming}
        onConfirm={() => confirmVoucher && redeem(confirmVoucher.id)}
        onCancel={() => setConfirmVoucher(null)}
      />
    </div>
  );
}
