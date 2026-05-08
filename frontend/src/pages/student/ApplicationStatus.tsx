import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getApplicationStatus, ApplicationStatus as TApplicationStatus } from '../../services/application.service';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/usePageTitle';
import OnboardingWizard from '../../components/OnboardingWizard';
import ApplicationSubmitForm from '../../components/ApplicationSubmitForm';

const STEPS = [
  { key: 'submitted', label: 'Application Submitted',  desc: 'Your application is in the system.' },
  { key: 'reserved',  label: 'Room Reserved',          desc: 'Admin has assigned a room to you.' },
  { key: 'movein',    label: 'Move-in Confirmed',       desc: 'Your move-in date has been set.' },
  { key: 'active',    label: 'Resident Activated',      desc: 'Welcome — your account is now active.' },
];

function getStep(data: TApplicationStatus): number {
  if (data.role === 'ACTIVE_STUDENT') return 4;
  if (data.allocation?.moveIn)        return 3;
  if (data.allocation)                return 2;
  // Step 1 (Submitted) only counts once they've actually submitted application docs
  return data.applicationStatus === 'DRAFT' ? 0 : 1;
}

const typeLabel: Record<string, string> = {
  SINGLE: 'Single Room',
  DOUBLE: 'Double Room',
  STUDIO: 'Studio',
};

export default function ApplicationStatus() {
  usePageTitle('My Application');
  const { data, isLoading, isError } = useQuery<TApplicationStatus>({
    queryKey: ['application-status'],
    queryFn:  () => getApplicationStatus(),
    refetchInterval: 60_000,
  });

  if (isError) return (
    <div className="text-rh-rose text-sm p-6">Failed to load application status. Is the backend running?</div>
  );

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStep = getStep(data);

  return (
    <div className="space-y-6 max-w-2xl">
      <OnboardingWizard />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Application</h1>
        <p className="text-white/40 text-sm mt-1">Track your accommodation application progress</p>
      </div>

      {/* Applicant summary */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-rh-cyan/20 flex items-center justify-center text-rh-cyan text-lg font-bold flex-shrink-0">
          {data.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{data.name}</p>
          <p className="text-white/40 text-sm font-mono truncate">{data.email}</p>
          {(data.university || data.program) && (
            <p className="text-white/30 text-xs mt-0.5 truncate">
              {[data.program, data.university].filter(Boolean).join(' · ')}
              {data.year ? ` · Year ${data.year}` : ''}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-white/30 text-xs">Applied</p>
          <p className="text-white/60 text-sm font-mono">{new Date(data.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-5">Application Progress</h2>
        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const stepNum   = i + 1;
            const done   = stepNum < currentStep;
            const active = stepNum === currentStep;
            const isLast = i === STEPS.length - 1;

            return (
              <div key={step.key} className="flex gap-4">
                {/* Track */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2 transition-colors ${
                    done   ? 'bg-rh-cyan border-rh-cyan text-rh-dark'    :
                    active ? 'bg-rh-cyan/10 border-rh-cyan text-rh-cyan' :
                             'bg-white/4 border-white/15 text-white/25'
                  }`}>
                    {done ? '✓' : stepNum}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${done ? 'bg-rh-cyan/40' : 'bg-white/10'}`} />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-5 flex-1 ${isLast ? 'pb-0' : ''}`}>
                  <p className={`font-semibold text-sm ${
                    done || active ? 'text-white' : 'text-white/30'
                  }`}>
                    {step.label}
                    {active && (
                      <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded bg-rh-cyan/15 text-rh-cyan border border-rh-cyan/30">
                        Current
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-0.5 ${done || active ? 'text-white/40' : 'text-white/20'}`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Application docs — show form (DRAFT/REJECTED) or status banner (SUBMITTED/APPROVED) */}
      {(data.applicationStatus === 'DRAFT' || data.applicationStatus === 'REJECTED') && data.role === 'PENDING_STUDENT' && (
        <ApplicationSubmitForm status={data} />
      )}

      {data.applicationStatus === 'SUBMITTED' && (
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">Application under review</p>
              <p className="text-white/40 text-sm mt-1">
                Submitted {data.applicationSubmittedAt && new Date(data.applicationSubmittedAt).toLocaleDateString()}.
                Admin will review your documents within 1–2 business days.
              </p>
              <ul className="mt-3 space-y-1">
                {(['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] as const).map(t => {
                  const has = data.documents.some(d => d.type === t);
                  const label = ({
                    ID_DOC: 'ID document',
                    PROOF_REGISTRATION: 'Proof of registration',
                    PROOF_FUNDING: 'Proof of funding',
                    SIGNATURE: 'Signature',
                  } as const)[t];
                  return (
                    <li key={t} className="flex items-center gap-2 text-xs text-white/60">
                      <CheckCircle2 size={12} style={{ color: has ? '#4ade80' : 'var(--text3)' }} />
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {data.applicationStatus === 'APPROVED' && data.role === 'PENDING_STUDENT' && (
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">Application approved</p>
              <p className="text-white/40 text-sm mt-1">
                {data.allocation
                  ? 'Your room is reserved below — admin will confirm your move-in date soon.'
                  : 'Pick a room from the catalogue to reserve your spot.'}
              </p>
              {data.applicationAdminNote && (
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>
                  <strong>Note from admin:</strong> {data.applicationAdminNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {data.applicationStatus === 'REJECTED' && (
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} style={{ color: 'var(--rose)', flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-white font-semibold">Application needs changes</p>
              <p className="text-white/40 text-sm mt-1">
                Re-upload using the form above and resubmit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Room card — shown when a room is reserved */}
      {data.allocation ? (
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Your Reserved Room</h2>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-rh-cyan/10 border border-rh-cyan/20 flex items-center justify-center text-2xl flex-shrink-0">
              🏠
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">Room {data.allocation.room.number}</p>
              <p className="text-white/50 text-sm">Block {data.allocation.room.block} · {typeLabel[data.allocation.room.type] ?? data.allocation.room.type}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="bg-white/4 border border-white/8 rounded-lg px-3 py-2">
                  <p className="text-white/40 text-xs">Monthly Rent</p>
                  <p className="text-rh-cyan font-bold font-mono">R{Number(data.allocation.rent).toLocaleString()}</p>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-lg px-3 py-2">
                  <p className="text-white/40 text-xs">Status</p>
                  <p className="text-yellow-400 font-semibold text-sm capitalize">{data.allocation.status}</p>
                </div>
                {data.allocation.moveIn && (
                  <div className="bg-white/4 border border-white/8 rounded-lg px-3 py-2">
                    <p className="text-white/40 text-xs">Move-in Date</p>
                    <p className="text-white font-semibold text-sm">{new Date(data.allocation.moveIn).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : data.applicationStatus === 'APPROVED' ? (
        /* Approved but no room yet — nudge to browse rooms */
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-white font-semibold">No room assigned yet</p>
          <p className="text-white/40 text-sm mt-1 mb-4">Browse available rooms to reserve your spot.</p>
          <Link
            to={ROUTES.ROOMS}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rh-cyan/10 border border-rh-cyan/30 text-rh-cyan text-sm font-semibold hover:bg-rh-cyan/20 transition-colors"
          >
            Browse Rooms →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
