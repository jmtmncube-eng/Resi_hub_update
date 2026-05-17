import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, CheckCircle2, XCircle, ExternalLink, Loader2, FileCheck, ChevronRight } from 'lucide-react';
import {
  listDocsAwaitingReview,
  decideDocument,
  ApplicationDocType,
  PendingDocReview,
} from '../../services/application.service';
import { usePageTitle } from '../../hooks/usePageTitle';

const DOC_LABEL: Record<ApplicationDocType, string> = {
  ID_DOC:             'ID document',
  PROOF_REGISTRATION: 'Proof of registration',
  PROOF_FUNDING:      'Proof of funding',
  SIGNATURE:          'Signature',
};

/**
 * Admin Compliance — central queue of every compliance doc currently
 * Submitted (awaiting verdict). Covers BOTH pending applicants on their
 * first submission AND active students who re-uploaded after a previous
 * doc was rejected or expired. Per-doc Approve / Reject; rejection
 * requires a reason which is emailed + in-app-notified to the student.
 */
export default function AdminCompliance() {
  usePageTitle('Compliance review');
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: docs, isLoading } = useQuery({
    queryKey: ['admin-compliance-queue'],
    queryFn:  listDocsAwaitingReview,
  });

  const [rejecting, setRejecting] = useState<{ doc: PendingDocReview; reason: string } | null>(null);

  const decide = useMutation({
    mutationFn: ({ docId, decision, note }: { docId: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      decideDocument(docId, decision, note),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-compliance-queue'] });
      toast.success(vars.decision === 'APPROVED' ? 'Document approved' : 'Document rejected — student notified');
      setRejecting(null);
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      toast.error(message || 'Could not save verdict');
    },
  });

  const items = docs ?? [];

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title">Compliance review</h1>
        <p className="page-sub">
          Documents waiting for a verdict — IDs, proofs of registration, proofs of funding, signatures.
          Approve when valid; reject with a reason so the student knows what to re-upload.
        </p>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--cyan)' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
          <FileCheck size={36} style={{ color: '#4ade80', marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Queue is empty</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>
            No compliance docs are awaiting review right now.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {items.length} document{items.length === 1 ? '' : 's'} awaiting review
          </div>
          {items.map((doc, i) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/admin/accounts/${doc.user.id}#compliance`)}
              role="link"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/admin/accounts/${doc.user.id}#compliance`);
                }
              }}
              style={{
                display: 'grid',
                // Fixed action-column widths so empty/full cells never push
                // alignment — same principle as the accounts table.
                gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) 110px 130px 130px 16px',
                alignItems: 'center', gap: 14,
                padding: '14px 18px',
                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }}
              className="hover-lift"
            >
              {/* Who */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.user.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.user.email}
                  <span className="badge badge-cyan" style={{ marginLeft: 8, fontSize: 9, padding: '2px 6px' }}>
                    {doc.user.role === 'PENDING_STUDENT' ? 'Applicant' : doc.user.role === 'ACTIVE_STUDENT' ? 'Resident' : doc.user.role}
                  </span>
                </p>
              </div>

              {/* What */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>
                  {DOC_LABEL[doc.type]}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Action buttons — stopPropagation so the row click only fires
                  when the admin actually clicks empty space (not a button). */}
              <div onClick={e => e.stopPropagation()}>
                {doc.fileUrl ? (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                     className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ExternalLink size={12} /> Open
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text4)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={12} /> No file
                  </span>
                )}
              </div>

              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => decide.mutate({ docId: doc.id, decision: 'APPROVED' })}
                  disabled={decide.isPending}
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={12} /> Approve
                </button>
              </div>

              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setRejecting({ doc, reason: '' })}
                  disabled={decide.isPending}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px', fontSize: 12,
                    borderColor: 'rgba(232,25,122,.35)', color: 'var(--rose)',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <XCircle size={12} /> Reject
                </button>
              </div>

              {/* Right-edge chevron — affordance that the row navigates */}
              <ChevronRight size={14} style={{ color: 'var(--text4)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Reject modal — captures a reason which is emailed to the student */}
      {rejecting && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }} onClick={() => !decide.isPending && setRejecting(null)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, padding: '22px 24px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Reject {DOC_LABEL[rejecting.doc.type]}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
              {rejecting.doc.user.name} will be emailed + notified in-app with this reason and told to re-upload from their profile.
            </p>
            <label className="field-label">Reason</label>
            <textarea
              autoFocus
              rows={3}
              className="input-base"
              value={rejecting.reason}
              onChange={e => setRejecting({ ...rejecting, reason: e.target.value })}
              placeholder="e.g. Photo is blurry — please re-upload a sharper scan of both sides of the ID."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                className="btn-secondary"
                onClick={() => setRejecting(null)}
                disabled={decide.isPending}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => decide.mutate({ docId: rejecting.doc.id, decision: 'REJECTED', note: rejecting.reason.trim() })}
                disabled={decide.isPending || !rejecting.reason.trim()}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                {decide.isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Reject + notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
