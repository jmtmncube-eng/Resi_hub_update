import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, FileText, Loader2, PenLine, Eye, AlertCircle } from 'lucide-react';
import { getMyDocuments } from '../services/document.service';
import { ResidentDocument } from '../types/domain.types';
import ContractSignModal from './ContractSignModal';

/**
 * Lease + official letters card — lives on the Profile page.
 * The lease/contract moved here from the old "Documents & Invoices" page
 * so all of a resident's *personal* paperwork (compliance docs, lease,
 * letters) sits in one place; the Invoices page is purely billing now.
 */
export default function LeaseDocsCard() {
  const [contractDoc, setContractDoc] = useState<ResidentDocument | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn:  getMyDocuments,
  });

  const contracts = docs.filter(d => d.type === 'CONTRACT');
  const letters   = docs.filter(d => d.type === 'LETTER');

  // Nothing to show — skip the card entirely rather than render an empty shell.
  if (!isLoading && contracts.length === 0 && letters.length === 0) return null;

  return (
    <div className="card-sm" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(0,204,204,.12)', border: '1px solid rgba(0,204,204,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileCheck size={18} style={{ color: 'var(--cyan)' }} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Lease &amp; letters</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {isLoading ? 'Loading…' : 'Your lease agreement and official correspondence'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--cyan)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contracts.map(c => {
            const needsSign = c.status === 'Pending' || c.status === 'Unsigned';
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 9,
                background: needsSign ? 'rgba(245,158,11,.06)' : 'var(--bg3)',
                border: `1px solid ${needsSign ? 'rgba(245,158,11,.25)' : 'var(--border)'}`,
              }}>
                <FileCheck size={15} style={{ color: needsSign ? '#f59e0b' : 'var(--cyan)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Lease agreement</p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                    {c.period} · {c.status}
                  </p>
                </div>
                <button
                  onClick={() => setContractDoc(c)}
                  className={needsSign ? 'btn-primary press-soft' : 'btn-ghost press-soft'}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12 }}
                >
                  {needsSign ? <><PenLine size={12} /> Review &amp; sign</> : <><Eye size={12} /> View</>}
                </button>
              </div>
            );
          })}

          {letters.map(l => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 9,
              background: 'var(--bg3)', border: '1px solid var(--border)',
            }}>
              <FileText size={15} style={{ color: 'var(--text2)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {l.period} letter
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                  Official correspondence · {l.status}
                </p>
              </div>
              {l.fileUrl ? (
                <a href={l.fileUrl} target="_blank" rel="noreferrer"
                   className="btn-ghost press-soft"
                   style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12 }}>
                  <Eye size={12} /> Open
                </a>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text4)' }}>
                  <AlertCircle size={11} /> No file
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <ContractSignModal doc={contractDoc} onClose={() => setContractDoc(null)} />
    </div>
  );
}
