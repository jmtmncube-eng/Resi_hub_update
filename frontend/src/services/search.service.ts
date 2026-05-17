import api from './api';
import { ApiResponse } from '../types/api.types';

export interface SearchResults {
  residents: { id: string; name: string; email: string; role: string }[];
  rooms:     { id: string; number: string; block: string; type: string; status: string }[];
  invoices:  { id: string; userId: string; userName: string; period: string; amount: string | null; status: string }[];
  tickets:   { id: string; category: string; location: string; status: string; studentName: string }[];
}

/** Global admin search across residents, rooms, invoices and tickets. */
export async function globalSearch(q: string, residenceId?: string): Promise<SearchResults> {
  const res = await api.get<ApiResponse<SearchResults>>('/admin/search', {
    params: { q, ...(residenceId ? { residenceId } : {}) },
  });
  return res.data.data;
}

export type ExportType = 'accounts' | 'invoices' | 'tickets';

/** Filters that page state can pass through to the export — only the
 *  relevant ones per type are honoured server-side. */
export interface DownloadCsvFilters {
  residenceId?: string;
  q?:           string;
  role?:        string;
  status?:      string;
  priority?:    string;
  proof?:       string;
}

/** Fetch a CSV export (auth-scoped) and trigger a browser download. */
export async function downloadCsv(type: ExportType, filters: DownloadCsvFilters = {}): Promise<void> {
  // Strip out undefined/empty values so the URL stays clean.
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== '') params[k] = String(v);
  }
  const res = await api.get(`/admin/export/${type}`, {
    params,
    responseType: 'blob',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `resihub-${type}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
