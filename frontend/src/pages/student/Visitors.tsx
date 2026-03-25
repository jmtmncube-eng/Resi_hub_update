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

const STATUS_STYLE: Record<string, string> = {
  UPCOMING:  'bg-rh-cyan/15 text-rh-cyan',
  ACTIVE:    'bg-green-500/15 text-green-400',
  EXPIRED:   'bg-white/5 text-white/30',
  CANCELLED: 'bg-red-500/10 text-red-400',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Visitor Passes</h1>
          <p className="text-sm text-white/40 mt-0.5">Invite and manage your guests</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-rh-cyan text-rh-bg text-sm font-semibold rounded-lg hover:bg-rh-cyan/90 transition-colors">
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Invite Guest'}
        </button>
      </div>

      {/* Invite form */}
      {showForm && (
        <div className="bg-rh-bg2 border border-white/7 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">New Visitor Pass</h2>
          <form onSubmit={handleSubmit(d => invite(d))} className="space-y-4">
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
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-rh-cyan text-rh-bg text-sm font-semibold rounded-lg hover:bg-rh-cyan/90 disabled:opacity-60 transition-colors">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Generate Pass
            </button>
          </form>
        </div>
      )}

      {/* QR Modal */}
      {qrPass && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setQrPass(null)}>
          <div className="bg-rh-bg2 border border-white/10 rounded-2xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Visitor QR Code</h3>
              <button onClick={() => setQrPass(null)} className="text-white/40 hover:text-white"><X size={16} /></button>
            </div>
            <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-4">
              <QRCodeSVG value={qrPass.qrCode} size={180} />
            </div>
            <p className="text-sm font-semibold text-white text-center">{qrPass.visitorName}</p>
            <p className="text-xs text-white/40 font-mono text-center mt-1">{qrPass.qrCode}</p>
            <p className="text-xs text-white/40 text-center mt-1">
              {format(new Date(qrPass.date), 'dd MMM yyyy')} · {qrPass.timeFrom}–{qrPass.timeTo}
            </p>
          </div>
        </div>
      )}

      {/* Pass list */}
      <div className="space-y-3">
        {isLoading
          ? [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-rh-bg2 rounded-xl animate-pulse" />)
          : passes.length === 0
            ? (
              <div className="bg-rh-bg2 border border-white/7 rounded-2xl py-12 text-center">
                <QrCode size={28} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No visitor passes yet</p>
              </div>
            )
            : passes.map(pass => (
              <div key={pass.id} className="bg-rh-bg2 border border-white/7 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rh-rose/15 flex items-center justify-center text-rh-rose font-bold text-sm flex-shrink-0">
                  {pass.visitorName.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{pass.visitorName}</p>
                  <p className="text-xs text-white/40 font-mono">
                    {format(new Date(pass.date), 'dd MMM yyyy')} · {pass.timeFrom}–{pass.timeTo}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{pass.purpose}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${STATUS_STYLE[pass.status]}`}>
                    {pass.status}
                  </span>
                  <button onClick={() => setQrPass(pass)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <QrCode size={14} />
                  </button>
                  {(pass.status === 'UPCOMING') && (
                    <button onClick={() => cancel(pass.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
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
      <label className="block text-sm text-white/60 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
