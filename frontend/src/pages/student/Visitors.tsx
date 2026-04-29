import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QrCode, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getMyPasses, createPass, cancelPass } from '../../services/visitor.service';
import { VisitorPass } from '../../types/domain.types';
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
  const [showForm, setShowForm] = useState(false);
  const [qrPass,   setQrPass]  = useState<VisitorPass | null>(null);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visitors'] }); reset(); setShowForm(false); },
  });

  const { mutate: cancel } = useMutation({
    mutationFn: cancelPass,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitors'] }),
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

      {/* QR Modal */}
      {qrPass && (
        <div className="modal-overlay" onClick={() => setQrPass(null)}>
          <div className="modal-card" style={{ maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Visitor QR Code</h3>
              <button onClick={() => setQrPass(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <QRCodeSVG value={qrPass.qrCode} size={180} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>{qrPass.visitorName}</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>{qrPass.qrCode}</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>
              {format(new Date(qrPass.date), 'dd MMM yyyy')} · {qrPass.timeFrom}–{qrPass.timeTo}
            </p>
          </div>
        </div>
      )}

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
                    <button onClick={() => cancel(pass.id)} style={{ padding: 6, borderRadius: 6, background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--rose)', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
        }
      </div>
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
