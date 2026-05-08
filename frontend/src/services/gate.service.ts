import api from './api';

export interface GateScanResult {
  action: 'ENTRY' | 'EXIT';
  pass: {
    id:           string;
    visitorName:  string;
    visitorPhone: string;
    purpose:      string;
    date:         string;
    timeFrom:     string;
    timeTo:       string;
    qrCode:       string;
    status:       'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    checkedInAt:  string | null;
  };
  host: {
    id:    string;
    name:  string;
    email: string;
    room:  { number: string; block: string } | null;
  };
}

export async function gateScan(qrCode: string): Promise<GateScanResult> {
  // Public endpoint — no auth header needed; api.ts attaches one if present
  // but the backend route is anonymous either way.
  const res = await api.post<{ success: boolean; data: GateScanResult }>('/gate/scan', { qrCode });
  return res.data.data;
}
