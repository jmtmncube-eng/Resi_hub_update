import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Loader2 } from 'lucide-react';
import { getWallet, getVouchers, getLeaderboard, redeemVoucher } from '../../services/wallet.service';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const TX_COLOR: Record<string, string> = {
  EARN:   'text-green-400',
  REDEEM: 'text-rh-rose',
  ADJUST: 'text-rh-cyan',
};

export default function Wallet() {
  const [tab, setTab] = useState<'balance'|'shop'|'leaderboard'>('balance');
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: wallet, isLoading: wLoading } = useQuery({ queryKey: ['wallet'], queryFn: getWallet });
  const { data: vouchers = [] } = useQuery({ queryKey: ['vouchers'], queryFn: getVouchers });
  const { data: leaderboard = [] } = useQuery({ queryKey: ['leaderboard'], queryFn: getLeaderboard });

  const { mutate: redeem, isPending: redeeming, variables: redeemId } = useMutation({
    mutationFn: redeemVoucher,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="text-xl font-semibold text-white">Wallet & Credits</h1>
        <p className="text-sm text-white/40 mt-0.5">Earn credits, redeem vouchers, climb the leaderboard</p>
      </div>

      {/* Balance hero */}
      {!wLoading && wallet && (
        <div className="bg-gradient-to-br from-rh-cyan/15 to-rh-bg2 border border-rh-cyan/20 rounded-2xl p-6 text-center">
          <p className="text-white/50 text-sm mb-1">Your balance</p>
          <p className="text-5xl font-bold text-rh-cyan mb-1">{wallet.credits}</p>
          <p className="text-white/40 text-sm font-mono">credits 🪙</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-rh-bg3 rounded-xl p-1 w-fit">
        {(['balance', 'shop', 'leaderboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-rh-bg2 text-white shadow-sm' : 'text-white/40 hover:text-white'
            }`}>
            {t === 'balance' ? 'History' : t === 'shop' ? 'Voucher Shop' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* Transaction history */}
      {tab === 'balance' && (
        <div className="bg-rh-bg2 border border-white/7 rounded-2xl divide-y divide-white/5">
          {wLoading
            ? [...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse bg-white/3 m-3 rounded-lg" />)
            : !wallet?.transactions?.length
              ? <p className="text-white/30 text-sm py-8 text-center">No transactions yet</p>
              : wallet.transactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                    tx.type === 'EARN' ? 'bg-green-500/10' : tx.type === 'REDEEM' ? 'bg-rh-rose/10' : 'bg-rh-cyan/10'
                  }`}>
                    {tx.type === 'EARN' ? '⬆' : tx.type === 'REDEEM' ? '🎟' : '⚙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{tx.note}</p>
                    <p className="text-xs text-white/30 font-mono">
                      {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <span className={`text-sm font-bold font-mono flex-shrink-0 ${TX_COLOR[tx.type]}`}>
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
            const canAfford = (wallet?.credits ?? 0) >= v.cost;
            const isRedeeming = redeeming && redeemId === v.id;
            return (
              <div key={v.id} className={`bg-rh-bg2 border rounded-xl p-4 ${
                canAfford ? 'border-white/7' : 'border-white/4 opacity-60'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-2xl">{v.icon}</span>
                  <span className="text-xs font-mono text-white/30">{v.stock} left</span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{v.name}</p>
                <p className="text-xs text-white/40 mb-3">{v.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-rh-cyan font-bold text-sm font-mono">{v.cost} 🪙</span>
                  <button
                    onClick={() => redeem(v.id)}
                    disabled={!canAfford || isRedeeming || v.stock < 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rh-cyan/15 text-rh-cyan text-xs font-semibold rounded-lg hover:bg-rh-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
        <div className="bg-rh-bg2 border border-white/7 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/7 flex items-center gap-2">
            <Trophy size={15} className="text-rh-cyan" />
            <span className="text-sm font-semibold text-white">Block Credits Leaderboard</span>
          </div>
          {leaderboard.map((entry, i) => (
            <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${
              entry.user.id === user?.id ? 'bg-rh-cyan/5' : ''
            }`}>
              <span className={`w-6 text-center text-sm font-bold font-mono flex-shrink-0 ${
                i === 0 ? 'text-yellow-400' : i === 1 ? 'text-white/50' : i === 2 ? 'text-orange-400' : 'text-white/25'
              }`}>
                {i + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-rh-cyan/15 flex items-center justify-center text-rh-cyan text-xs font-bold flex-shrink-0">
                {entry.user.name.slice(0,2).toUpperCase()}
              </div>
              <span className="flex-1 text-sm text-white">{entry.user.name}</span>
              {entry.user.id === user?.id && (
                <span className="text-[10px] font-mono text-rh-cyan bg-rh-cyan/10 px-1.5 py-0.5 rounded">You</span>
              )}
              <span className="text-sm font-bold font-mono text-rh-cyan">{entry.credits} 🪙</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
