import api from './api';
import { ApiResponse } from '../types/api.types';

export type NotificationType =
  | 'INVOICE' | 'CONTRACT' | 'CHORE_APPROVED' | 'CHORE_REJECTED'
  | 'MAINTENANCE' | 'APPLICATION' | 'ACCOUNT' | 'ANNOUNCEMENT' | 'GENERAL';

export interface AppNotification {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string | null;
  link:      string | null;
  read:      boolean;
  readAt:    string | null;
  createdAt: string;
}

/** Recent notifications, newest first (server caps at 50). */
export async function getNotifications(): Promise<AppNotification[]> {
  const res = await api.get<ApiResponse<AppNotification[]>>('/notifications');
  return res.data.data;
}

/** Unread count — drives the bell badge. Cheap; safe to poll. */
export async function getUnreadCount(): Promise<number> {
  const res = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return res.data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const res = await api.patch<ApiResponse<{ count: number }>>('/notifications/read-all');
  return res.data.data;
}
