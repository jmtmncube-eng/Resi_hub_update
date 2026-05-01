import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, FileCheck, FileClock, PenLine, Eye } from 'lucide-react';
import { getMyDocuments } from '../../services/document.service';
import { ResidentDocument } from '../../types/domain.types';
import { usePageTitle } from '../../hooks/usePageTitle';
import InvoiceModal from '../../components/InvoiceModal';
import ContractSignModal from '../../components/ContractSignModal';

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
  const [invoiceDoc,  setInvoiceDoc]  = useState<ResidentDocument | null>(null);
  const [contractDoc, setContractDoc] = useState<ResidentDocument | null>(null);

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
                { label: 'Invoices',   items: invoices,  note: 'Click to view and download your rent invoices.' },
                { label: 'Contracts',  items: contracts, note: 'Review and sign your lease agreement digitally.' },
                { label: 'Letters',    items: letters,   note: 'Official correspondence from management.' },
              ].filter(g => g.items.length > 0).map(group => (
                <div key={group.label}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                    <p className="micro-label">{group.label}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)' }}>{group.note}</p>
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {group.items.map(doc => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        onOpen={() => {
                          if (doc.type === 'INVOICE')   setInvoiceDoc(doc);
                          if (doc.type === 'CONTRACT')  setContractDoc(doc);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {/* Modals */}
      <InvoiceModal      doc={invoiceDoc}  onClose={() => setInvoiceDoc(null)}  />
      <ContractSignModal doc={contractDoc} onClose={() => setContractDoc(null)} />
    </div>
  );
}

function DocRow({ doc, onOpen }: { doc: ResidentDocument; onOpen: () => void }) {
  const ts = TYPE_STYLE[doc.type] ?? { bg: 'var(--bg3)', color: 'var(--text2)' };
  const needsSign = doc.type === 'CONTRACT' && doc.status === 'Pending';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer', transition: 'background .15s',
      }}
      className="last:border-0"
      onClick={onOpen}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: ts.bg, color: ts.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {TYPE_ICON[doc.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
            {doc.type === 'INVOICE' ? 'Rent Invoice' : doc.type === 'CONTRACT' ? 'Lease Agreement' : 'Official Letter'}
          </p>
          <span style={{ color: 'var(--text4)', fontSize: 12 }}>—</span>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{doc.period}</p>
        </div>
        {doc.amount && doc.amount !== '—' && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{doc.amount}</p>
        )}
        {doc.signedAt && doc.signedByName && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--cyan)', marginTop: 2 }}>
            ✓ Signed by {doc.signedByName}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className={`badge ${STATUS_BADGE[doc.status] ?? 'badge-gray'}`}>{doc.status}</span>
        {needsSign ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--rose)', fontWeight: 500 }}>
            <PenLine size={12} /> Sign
          </span>
        ) : doc.type === 'INVOICE' ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)' }}>
            <Download size={13} />
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)' }}>
            <Eye size={13} />
          </span>
        )}
      </div>
    </div>
  );
}
