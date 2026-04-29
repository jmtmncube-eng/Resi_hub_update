import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Loader2 } from 'lucide-react';
import { getWallet, getVouchers, getLeaderboard, redeemVoucher } from '../../services/wallet.service';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const TX_ICON: Record<string, string>   = { EARN: '⬆', REDEEM: '🎟', ADJUST: '⚙' };
const TX_COLOR: Record<string, string>  = { EARN: '#4ade80', REDEEM: 'var(--rose)', ADJUST: 'var(--cyan)' };
const TX_BG: Record<string, string>     = { EARN: 'rgba(74,222,128,.1)', REDEEM: 'rgba(232,25,122,.1)', ADJUST: 'rgba(0,204,204,.1)' };

export default function Wallet() {
  const [tab, setTab] = useState<'balance'|'shop'|'leaderboard'>('balance');
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: wallet, isLoading: wLoading } = useQuery({ queryKey: ['wallet'], queryFn: getWallet });
  const { data: vouchers = [] }               = useQuery({ queryKey: ['vouchers'], queryFn: getVouchers });
  const { data: leaderboard = [] }            = useQuery({ queryKey: ['leaderboard'], queryFn: getLeaderboard });

  const { mutate: redeem, isPending: redeeming, variables: redeemId } = useMutation({
    mutationFn: redeemVoucher,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });

  const tabs = [
    { key: 'balance',     label: 'History'       },
    { key: 'shop',        label: 'Voucher Shop'   },
    { key: 'leaderboard', label: 'Leaderboard'    },
  ] as const;

  return (
    <div className="space-y-5 appear">

      {/* Page header */}
      <div>
        <h1 className="page-title">Wallet & Credits</h1>
        <p className="page-sub">Earn credits, redeem vouchers, climb the leaderboard</p>
      </div>

      {/* Balance hero — KPI card */}
      {!wLoading && wallet && (
        <div style={{ background: 'linear-gradient(135deg, rgba(0,204,204,.12) 0%, var(--bg2) 100%)', border: '1px solid rgba(0,204,204,.2)', borderRadius: 14, padding: '28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--cyan)' }} />
          <p className="micro-label" style={{ marginBottom: 8, color: 'var(--text3)' }}>Your balance</p>
          <p style={{ fontSize: 52, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '-.03em', lineHeight: 1.1 }}>{wallet.credits}</p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>credits 🪙</p>
        </div>
      )}
      {wLoading && <div className="skeleton" style={{ height: 130, borderRadius: 14 }} />}

      {/* Tab switcher */}
      <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2 }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 16px',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: tab === key ? 600 : 400,
            background: tab === key ? 'var(--bg2)' : 'transparent',
            color: tab === key ? 'var(--text)' : 'var(--text3)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all .18s',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Transaction history */}
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

      {/* Voucher shop */}
      {tab === 'shop' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vouchers.map(v => {
            const canAfford  = (wallet?.credits ?? 0) >= v.cost;
            const isRedeeming = redeeming && redeemId === v.id;
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
                    onClick={() => redeem(v.id)}
                    disabled={!canAfford || isRedeeming || v.stock < 1}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: 12 }}>
                    {isRedeeming && <Loader2 size={11} className="animate-spin" />}
                    {v.stock < 1 ? 'Out of stock' : !canAfford ? 'Not enough' : 'Redeem'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
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
                width: 20, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, flexShrink: 0,
                color: i === 0 ? '#facc15' : i === 1 ? 'var(--text3)' : i === 2 ? '#fb923c' : 'var(--text4)',
              }}>
                {i + 1}
              </span>
              <div className="avatar avatar-cyan" style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700 }}>
                {entry.user.name.slice(0,2).toUpperCase()}
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
    </div>
  );
}
