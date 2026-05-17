import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadCsv, ExportType } from '../services/search.service';
import { useResidence } from '../contexts/ResidenceContext';

/** Page-state filters mirrored into the CSV download. Optional — when
 *  omitted, the export falls back to "everything in the selected
 *  residence". Each page passes whichever of these are relevant. */
export interface ExportFilters {
  q?:        string;  // free-text search (all types)
  role?:     string;  // accounts only
  status?:   string;  // tickets (OPEN_GROUP / RESOLVED / CLOSED / ALL) — also accepts proof bucket via `proof`
  priority?: string;  // tickets only
  proof?:    string;  // invoices: 'awaiting' | 'acknowledged' | 'overdue'
}

/**
 * "Export CSV" button — fetches an auth-scoped CSV for one of the admin
 * tables (accounts / invoices / tickets) and triggers a browser
 * download. Respects the currently-selected residence AND any
 * page-state filters passed in (search, role tab, status tab, priority,
 * invoice proof-state) so the exported row count matches what the
 * admin sees on screen.
 */
export function ExportCsvButton({ type, label = 'Export CSV', filters }: {
  type: ExportType;
  label?: string;
  filters?: ExportFilters;
}) {
  const { selectedId: residenceId } = useResidence();
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await downloadCsv(type, { residenceId: residenceId ?? undefined, ...(filters ?? {}) });
    } catch {
      toast.error('Export failed — please try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="btn-ghost press-soft"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', fontSize: 12, fontWeight: 600,
      }}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
      {label}
    </button>
  );
}
