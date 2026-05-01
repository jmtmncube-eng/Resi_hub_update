import api from './api';
import { ApiResponse } from '../types/api.types';
import { WalletData, Voucher, LeaderboardEntry } from '../types/domain.types';

export async function getWallet(): Promise<WalletData> {
  const res = await api.get<ApiResponse<WalletData>>('/wallet');
  return res.data.data;
}

export async function getVouchers(): Promise<Voucher[]> {
  const res = await api.get<ApiResponse<Voucher[]>>('/wallet/vouchers');
  return res.data.data;
}

export async function redeemVoucher(voucherId: string): Promise<{ message: string }> {
  const res = await api.post<ApiResponse<{ message: string }>>(`/wallet/redeem/${voucherId}`);
  return res.data.data;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await api.get<ApiResponse<LeaderboardEntry[]>>('/wallet/leaderboard');
  return res.data.data;
}

export async function submitTaskProof(voucherId: string, proofUrl: string): Promise<{ message: string }> {
  const res = await api.post<ApiResponse<{ message: string }>>(`/wallet/task-proof/${voucherId}`, { proofUrl });
  return res.data.data;
}
