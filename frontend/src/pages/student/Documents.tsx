import { useQuery } from '@tanstack/react-query';
import { FileText, Download, FileCheck, FileClock } from 'lucide-react';
import { getMyDocuments } from '../../services/document.service';
import { ResidentDocument } from '../../types/domain.types';
import { usePageTitle } from '../../hooks/usePageTitle';

const STATUS_BADGE: Record<string, string> = {
  Paid:    'badge-cyan',
  Overdue: 'badge-rose',
  Signed:  'badge-cyan',
  Pending: 'badge-gray',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  INVOICE:  <FileClock  size={16} />,
  CONTRACT: <FileCheck  size={16} />,
  LETTER:   <FileText   size={16} />,
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  INVOICE:  { bg: 'rgba(232,25,122,.1)',  color: 'var(--rose)' },
  CONTRACT: { bg: 'rgba(0,204,204,.1)',   color: 'var(--cyan)' },
  LETTER:   { bg: 'var(--bg3)',           color: 'var(--text2)' },
};

export default function Documents() {
  usePageTitle('Documents');
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn:  getMyDocuments,
  });

  const invoices  = docs.filter(d => d.type === 'INVOICE');
  const contracts = docs.filter(d => d.type === 'CONTRACT');
  const letters   = docs.filter(d => d.type === 'LETTER');

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title">Documents</h1>
        <p className="page-sub">Your invoices, contracts, and official letters</p>
      </div>

      {isLoading
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />)}
          </div>
        : docs.length === 0
          ? (
            <div className="card empty-state">
              <FileText size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No documents yet</p>
              <p>Documents from management will appear here</p>
            </div>
          )
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { label: 'Invoices', items: invoices },
                { label: 'Contracts', items: contracts },
                { label: 'Letters', items: letters },
              ].filter(g => g.items.length > 0).map(group => (
                <div key={group.label}>
                  <p className="micro-label" style={{ marginBottom: 10 }}>{group.label}</p>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {group.items.map(doc => <DocRow key={doc.id} doc={doc} />)}
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}

function DocRow({ doc }: { doc: ResidentDocument }) {
  const ts = TYPE_STYLE[doc.type] ?? { bg: 'var(--bg3)', color: 'var(--text2)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }} className="last:border-0">
      <div style={{ width: 36, height: 36, borderRadius: 8, background: ts.bg, color: ts.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {TYPE_ICON[doc.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{doc.type.charAt(0) + doc.type.slice(1).toLowerCase()}</p>
          <span style={{ color: 'var(--text4)', fontSize: 12 }}>—</span>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{doc.period}</p>
        </div>
        {doc.amount && doc.amount !== '—' && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{doc.amount}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className={`badge ${STATUS_BADGE[doc.status] ?? 'badge-gray'}`}>{doc.status}</span>
        {doc.fileUrl && (
          <a href={doc.fileUrl} download
            style={{ padding: 6, borderRadius: 6, background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text2)', display: 'flex', transition: 'all .18s' }}>
            <Download size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
