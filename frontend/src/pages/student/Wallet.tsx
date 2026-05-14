import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';
import {
  getWallet, getVouchers, getLeaderboard, redeemVoucher,
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

/* ── Main component ──────────────────────────────────────────────── */
export default function Wallet() {
  usePageTitle('Wallet & Rewards');
  const [tab, setTab] = useState<'balance' | 'shop' | 'leaderboard'>('balance');
  const { user } = useAuth();
  const qc = useQueryClient();

  // Confirm-before-redeem state
  const [confirmVoucher, setConfirmVoucher] = useState<Voucher | null>(null);

  const { data: wallet, isLoading: wLoading } = useQuery({ queryKey: ['wallet'],      queryFn: getWallet });
  const { data: vouchers = [] }               = useQuery({ queryKey: ['vouchers'],    queryFn: getVouchers });
  const { data: leaderboard = [] }            = useQuery({ queryKey: ['leaderboard'], queryFn: getLeaderboard });

  const shopVouchers = vouchers.filter(v => v.isActive);

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

  const tabs = [
    { key: 'balance',     label: 'History'      },
    { key: 'shop',        label: 'Voucher Shop' },
    { key: 'leaderboard', label: 'Leaderboard'  },
  ] as const;

  return (
    <div className="space-y-5 appear">

      {/* Page header */}
      <div>
        <h1 className="page-title">Wallet & Rewards</h1>
        <p className="page-sub">Do chores to earn credits, then spend them in the reward shop</p>
      </div>

      {/* ── EARN — chores feed credits into the wallet ─────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 4, height: 14, background: 'var(--cyan)', borderRadius: 2 }} />
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>
            Earn credits
          </h2>
        </div>
        {/* Chores — collapsible; sits above the balance + reward shop so the
            earn → spend flow reads top-to-bottom. Chores are the single
            do-task-earn-reward mechanism (the old "task vouchers" parallel
            flow was retired — two systems for the same thing was confusing). */}
        <ChoresSection />
      </div>

      {/* ── SPEND — balance + reward shop ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 14, background: 'var(--rose)', borderRadius: 2 }} />
        <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>
          Spend &amp; redeem
        </h2>
      </div>

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
