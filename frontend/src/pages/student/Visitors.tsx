import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QrCode, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { getMyPasses, createPass, cancelPass } from '../../services/visitor.service';
import { VisitorPass } from '../../types/domain.types';
import { usePageTitle } from '../../hooks/usePageTitle';
import ConfirmModal from '../../components/ConfirmModal';
import { Modal } from '../../components/Modal';
import { format } from 'date-fns';

const formSchema = z.object({
  visitorName:  z.string().min(2, 'Name required'),
  visitorPhone: z.string().min(7, 'Phone required'),
  date:         z.string().min(1, 'Date required'),
  timeFrom:     z.string().min(1, 'Start time required'),
  timeTo:       z.string().min(1, 'End time required'),
  purpose:      z.string().min(2, 'Purpose required'),
});
type FormData = z.infer<typeof formSchema>;

const STATUS_BADGE: Record<string, string> = {
  UPCOMING:  'badge-cyan',
  ACTIVE:    'badge-cyan',
  EXPIRED:   'badge-gray',
  CANCELLED: 'badge-rose',
};

export default function Visitors() {
  usePageTitle('Visitor Passes');
  const [showForm,       setShowForm]       = useState(false);
  const [qrPass,         setQrPass]         = useState<VisitorPass | null>(null);
  const [cancelTarget,   setCancelTarget]   = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: passes = [], isLoading } = useQuery({
    queryKey: ['visitors'],
    queryFn:  getMyPasses,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { timeFrom: '09:00', timeTo: '18:00' },
  });

  const { mutate: invite, isPending } = useMutation({
    mutationFn: createPass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] });
      reset();
      setShowForm(false);
      toast.success('Visitor pass created!');
    },
    onError: () => toast.error('Failed to create visitor pass.'),
  });

  const { mutate: cancel, isPending: cancelling } = useMutation({
    mutationFn: cancelPass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] });
      setCancelTarget(null);
      toast.success('Visitor pass cancelled.');
    },
    onError: () => toast.error('Failed to cancel pass.'),
  });

  return (
    <div className="space-y-5 appear">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page-title">Visitor Passes</h1>
          <p className="page-sub">Invite and manage your guests</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-ghost' : 'btn-primary'}
          style={{ flexShrink: 0, padding: '9px 16px', fontSize: 13 }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Invite Guest'}
        </button>
      </div>

      {/* Invite form */}
      {showForm && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 20 }}>
            New Visitor Pass
          </h2>
          <form onSubmit={handleSubmit(d => invite(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Visitor Name" error={errors.visitorName?.message}>
                <input {...register('visitorName')} placeholder="Full name" className="input-base" />
              </Field>
              <Field label="Phone Number" error={errors.visitorPhone?.message}>
                <input {...register('visitorPhone')} placeholder="+27 ..." className="input-base" />
              </Field>
              <Field label="Visit Date" error={errors.date?.message}>
                <input {...register('date')} type="date" className="input-base" />
              </Field>
              <Field label="Purpose" error={errors.purpose?.message}>
                <input {...register('purpose')} placeholder="e.g. Study session" className="input-base" />
              </Field>
              <Field label="From" error={errors.timeFrom?.message}>
                <input {...register('timeFrom')} type="time" className="input-base" />
              </Field>
              <Field label="To" error={errors.timeTo?.message}>
                <input {...register('timeTo')} type="time" className="input-base" />
              </Field>
            </div>
            <div>
              <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Generate Pass
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Modal — body-portalled so it always covers the viewport,
          regardless of any transform-stacking-context ancestors. */}
      <Modal open={!!qrPass} onClose={() => setQrPass(null)} maxWidth={380}>
        {qrPass && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Visitor pass</h3>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                  Show this at the gate
                </p>
              </div>
              <button
                onClick={() => setQrPass(null)}
                aria-label="Close"
                className="press-soft"
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 6, borderRadius: 8 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* QR code — big, white, centered with padding */}
            <div style={{
              background: '#fff', borderRadius: 14, padding: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
              boxShadow: '0 0 0 1px var(--border), 0 1px 0 var(--shadow)',
            }}>
              <QRCodeSVG value={qrPass.qrCode} size={220} level="M" />
            </div>

            {/* Visitor info — centered & generously spaced */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>
                {qrPass.visitorName}
              </p>
              <span style={{
                display: 'inline-block',
                padding: '3px 12px', borderRadius: 999,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
                background: 'var(--bg3)', color: 'var(--text2)',
                border: '1px solid var(--border)',
                letterSpacing: '.05em', textTransform: 'uppercase',
              }}>
                {qrPass.qrCode}
              </span>
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--text2)',
                marginTop: 6,
              }}>
                {format(new Date(qrPass.date), 'EEE, dd MMM yyyy')}
              </p>
              <p style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--cyan)',
                fontWeight: 600,
              }}>
                {qrPass.timeFrom} – {qrPass.timeTo}
              </p>
            </div>
          </>
        )}
      </Modal>

      {/* Pass list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading
          ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 10 }} />)
          : passes.length === 0
            ? (
              <div className="card empty-state">
                <QrCode size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No visitor passes yet</p>
                <p>Invite a guest to get started</p>
              </div>
            )
            : passes.map(pass => (
              <div key={pass.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                <div className="avatar avatar-rose" style={{ width: 40, height: 40, fontSize: 13, fontWeight: 700 }}>
                  {pass.visitorName.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pass.visitorName}</p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {format(new Date(pass.date), 'dd MMM yyyy')} · {pass.timeFrom}–{pass.timeTo}
                  </p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{pass.purpose}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className={`badge ${STATUS_BADGE[pass.status] || 'badge-gray'}`}>{pass.status}</span>
                  <button onClick={() => setQrPass(pass)} style={{ padding: 6, borderRadius: 6, background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', display: 'flex' }}>
                    <QrCode size={13} />
                  </button>
                  {pass.status === 'UPCOMING' && (
                    <button onClick={() => setCancelTarget(pass.id)} style={{ padding: 6, borderRadius: 6, background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--rose)', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
        }
      </div>
      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel visitor pass"
        message="This will cancel the pass and the visitor won't be able to enter. Are you sure?"
        confirmLabel="Cancel Pass"
        danger
        loading={cancelling}
        onConfirm={() => cancelTarget && cancel(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error && <p style={{ marginTop: 4, fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>{error}</p>}
    </div>
  );
}
