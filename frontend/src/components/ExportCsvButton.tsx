import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadCsv, ExportType } from '../services/search.service';
import { useResidence } from '../contexts/ResidenceContext';

/**
 * "Export CSV" button — fetches an auth-scoped CSV for one of the admin
 * tables (accounts / invoices / tickets) and triggers a browser
 * download. Respects the currently-selected residence filter.
 */
export function ExportCsvButton({ type, label = 'Export CSV' }: {
  type: ExportType;
  label?: string;
}) {
  const { selectedId: residenceId } = useResidence();
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await downloadCsv(type, residenceId ?? undefined);
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
