import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Loader2, Check, X, FileCheck2, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import {
  listSubmittedApplications, decideApplication,
  AdminApplicationRow, ApplicationDocType,
} from '../services/application.service';
import { isPdfUrl } from '../utils/fileKind';

const DOC_LABEL: Record<ApplicationDocType, string> = {
  ID_DOC:             'ID document',
  PROOF_REGISTRATION: 'Proof of registration',
  PROOF_FUNDING:      'Proof of funding',
  SIGNATURE:          'Signature',
};

interface Props {
  applicantId: string;
  onClose: () => void;
}

export default function ApplicationReviewModal({ applicantId, onClose }: Props) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn:  listSubmittedApplications,
  });
  const applicant: AdminApplicationRow | undefined = applications?.find(a => a.id === applicantId);

  const decide = useMutation({
    mutationFn: (decision: 'APPROVED' | 'REJECTED') =>
      decideApplication(applicantId, decision, note),
    onSuccess: (_d, decision) => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-applications'] });
      toast.success(decision === 'APPROVED' ? 'Application approved' : 'Application rejected');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to record decision');
    },
  });

  return (
    <Modal open={true} onClose={onClose} maxWidth={700}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Review application</p>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }}>
          <X size={14} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--cyan)' }} />
        </div>
      ) : !applicant ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
          <p style={{ fontSize: 13 }}>No submitted application found for this user.</p>
          <p style={{ fontSize: 11, marginTop: 6 }}>They may not have completed the upload form yet.</p>
        </div>
      ) : (
        <>
          {/* Applicant summary */}
          <div className="card-sm" style={{ padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{applicant.name}</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {applicant.email}
              {applicant.phone && ` · ${applicant.phone}`}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--text2)' }}>
              {applicant.idNumber && (
                <span><span style={{ color: 'var(--text3)' }}>ID:</span>{' '}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{applicant.idNumber}</span></span>
              )}
              {applicant.university && <span><span style={{ color: 'var(--text3)' }}>Uni:</span> {applicant.university}</span>}
              {applicant.program    && <span><span style={{ color: 'var(--text3)' }}>Program:</span> {applicant.program}</span>}
              {applicant.year       && <span><span style={{ color: 'var(--text3)' }}>Year:</span> {applicant.year}</span>}
            </div>
            {applicant.applicationSubmittedAt && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 8 }}>
                Submitted {new Date(applicant.applicationSubmittedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Documents grid */}
          <p className="micro-label" style={{ marginBottom: 8 }}>Submitted documents</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
            {(['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] as ApplicationDocType[]).map(t => {
              const d = applicant.documents.find(x => x.type === t);
              return (
                <div key={t} style={{
                  border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
                  background: 'var(--bg3)',
                }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{DOC_LABEL[t]}</span>
                    {d?.fileUrl && (
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" title="Open full size"
                         style={{ color: 'var(--cyan)', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  {!d ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--rose)', fontSize: 11 }}>missing</div>
                  ) : isPdfUrl(d.fileUrl) ? (
                    <a href={d.fileUrl ?? undefined} target="_blank" rel="noreferrer"
                       style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 14, color: 'var(--text)', textDecoration: 'none' }}>
                      <FileCheck2 size={16} style={{ color: 'var(--cyan)' }} />
                      <span style={{ fontSize: 11 }}>Open PDF</span>
                    </a>
                  ) : d.fileUrl ? (
                    <img src={d.fileUrl} alt={DOC_LABEL[t]}
                         style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                         onClick={() => window.open(d.fileUrl!, '_blank')} />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Reviewer note */}
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Reviewer note (optional)</label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Reason for rejection / message to the applicant"
              className="input-base"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => decide.mutate('REJECTED')} disabled={decide.isPending}
                    className="press-soft"
                    style={{
                      flex: 1, padding: '11px 0', borderRadius: 8,
                      background: 'rgba(232,25,122,.1)', color: 'var(--rose)',
                      border: '1px solid rgba(232,25,122,.3)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
              {decide.isPending && decide.variables === 'REJECTED' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              Reject
            </button>
            <button onClick={() => decide.mutate('APPROVED')} disabled={decide.isPending}
                    className="btn-primary press-soft"
                    style={{ flex: 2, padding: '11px 0', fontSize: 13, justifyContent: 'center' }}>
              {decide.isPending && decide.variables === 'APPROVED' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Approve & make Active
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
