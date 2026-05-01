import { useState } from 'react';
import {
  LayoutDashboard, Wrench, Newspaper, Users, QrCode, Wallet as WalletIcon,
  User as UserIcon, FileText, Building2, Ticket, Megaphone, Gift, BookUser,
  CreditCard, Sparkles, ArrowRight, ChevronLeft, X, ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { completeOnboarding } from '../services/profile.service';
import { useAuth } from '../contexts/AuthContext';

/**
 * First-time welcome tour. Shown to any user where `user.onboardedAt` is null.
 * The user's role determines which feature highlights appear. After they
 * finish (or skip), we fire `POST /profile/onboarding` and update the auth
 * context so the tour never reappears.
 */

type StepIcon = { icon: LucideIcon; label: string; sub: string; tint: 'cyan' | 'rose' };

interface Step {
  title: string;
  body:  string;
  icons: StepIcon[];
}

// ── Per-role tour content ────────────────────────────────────────

const STUDENT_STEPS: Step[] = [
  {
    title: 'Welcome to ResiHub',
    body:  'Your residence, distilled. One place for rent, maintenance, neighbours, and the perks of living here.',
    icons: [
      { icon: LayoutDashboard, label: 'Dashboard',   sub: 'Today at a glance',     tint: 'cyan' },
      { icon: WalletIcon,      label: 'Wallet',      sub: 'Earn credits, redeem',  tint: 'cyan' },
      { icon: Newspaper,       label: 'Updates',     sub: 'Notices that matter',   tint: 'rose' },
    ],
  },
  {
    title: 'Day-to-day',
    body:  'Log a leaky tap, scan in a visitor, or pay your rent — all without leaving the app.',
    icons: [
      { icon: Wrench,   label: 'Maintenance', sub: 'Report issues',            tint: 'cyan' },
      { icon: QrCode,   label: 'Visitors',    sub: 'Generate QR passes',       tint: 'cyan' },
      { icon: FileText, label: 'Documents',   sub: 'Invoices & lease docs',    tint: 'rose' },
    ],
  },
  {
    title: 'Your community',
    body:  'Help out around the residence to earn credits, and trade them for vouchers and treats.',
    icons: [
      { icon: Users,      label: 'Housemates', sub: 'Chores & residents', tint: 'cyan' },
      { icon: Gift,       label: 'Rewards',    sub: 'Redeem credits',     tint: 'rose' },
      { icon: UserIcon,   label: 'Profile',    sub: 'Your details',       tint: 'cyan' },
    ],
  },
];

const PENDING_STEPS: Step[] = [
  {
    title: 'Welcome to ResiHub',
    body:  'You\'re one step away from move-in. Track your application here while we get your room ready.',
    icons: [
      { icon: ClipboardList, label: 'My application', sub: 'See your status',  tint: 'cyan' },
      { icon: Building2,     label: 'Browse rooms',   sub: 'Pick a room',      tint: 'cyan' },
      { icon: Newspaper,     label: 'Updates',        sub: 'Stay in the loop', tint: 'rose' },
    ],
  },
];

const ADMIN_STEPS: Step[] = [
  {
    title: 'Welcome, Admin',
    body:  'Run the residence from one calm console — every lever you need, with sensible defaults.',
    icons: [
      { icon: LayoutDashboard, label: 'Overview',  sub: 'KPIs & approvals',  tint: 'cyan' },
      { icon: Building2,       label: 'Residence', sub: 'Rooms · allocations · info', tint: 'cyan' },
      { icon: BookUser,        label: 'Accounts',  sub: 'Approve & manage students',  tint: 'rose' },
    ],
  },
  {
    title: 'Day-to-day operations',
    body:  'Tickets, payments, visitors — everything triaged and ready for one-click action.',
    icons: [
      { icon: Ticket,     label: 'Tickets',  sub: 'Maintenance queue',  tint: 'cyan' },
      { icon: CreditCard, label: 'Payments', sub: 'Rent invoices',      tint: 'cyan' },
      { icon: QrCode,     label: 'Visitors', sub: 'Pass log & search',  tint: 'rose' },
    ],
  },
  {
    title: 'Engage your residents',
    body:  'Post announcements, run reward programmes, and keep the residence buzzing.',
    icons: [
      { icon: Megaphone, label: 'News',    sub: 'Announce things',   tint: 'cyan' },
      { icon: Gift,      label: 'Rewards', sub: 'Vouchers & claims', tint: 'rose' },
    ],
  },
];

function stepsForRole(role?: string): Step[] {
  if (role === 'ADMIN')           return ADMIN_STEPS;
  if (role === 'PENDING_STUDENT') return PENDING_STEPS;
  return STUDENT_STEPS;
}

// ── Component ─────────────────────────────────────────────────────

export function WelcomeTour() {
  const { user, updateUser } = useAuth();
  const [idx, setIdx]        = useState(0);
  const [closing, setClosing] = useState(false);

  const steps = stepsForRole(user?.role);
  const step  = steps[idx];
  const isLast = idx === steps.length - 1;

  const finishMut = useMutation({
    mutationFn: completeOnboarding,
    onSettled:  (data) => {
      // Even on network error, update locally so the tour doesn't loop
      updateUser({ onboardedAt: data?.onboardedAt ?? new Date().toISOString() });
      setClosing(true);
    },
  });

  if (!user || user.onboardedAt) return null;
  if (closing) return null;

  const next = () => {
    if (isLast) finishMut.mutate();
    else setIdx(i => i + 1);
  };

  const skip = () => finishMut.mutate();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tour-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(8,8,12,.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        animation: 'fadeUp .35s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* Skip button */}
      <button
        onClick={skip}
        aria-label="Skip welcome tour"
        style={{
          position: 'absolute', top: 20, right: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px',
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 999,
          color: 'rgba(255,255,255,.65)',
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          cursor: 'pointer',
        }}
      >
        Skip <X size={11} />
      </button>

      <div
        className="appear"
        style={{
          width: '100%', maxWidth: 540,
          background: 'linear-gradient(160deg, rgba(0,204,204,.05) 0%, var(--bg2) 60%, var(--bg2) 100%)',
          border: '1px solid var(--border2)',
          borderRadius: 18,
          boxShadow: '0 30px 90px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04) inset',
          padding: '28px 28px 24px',
        }}
      >
        {/* Top sparkle badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999,
          background: 'rgba(0,204,204,.10)',
          border: '1px solid rgba(0,204,204,.25)',
          fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase',
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--cyan)',
          marginBottom: 18,
        }}>
          <Sparkles size={11} />
          Step {idx + 1} of {steps.length}
        </div>

        {/* Title + body */}
        <h2 id="welcome-tour-title" style={{
          fontSize: 26, fontWeight: 700, color: 'var(--text)',
          letterSpacing: '-.02em', marginBottom: 8,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          {step.title}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 24 }}>
          {step.body}
        </p>

        {/* Icon grid — the showcase */}
        <div className="stagger" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${step.icons.length}, 1fr)`,
          gap: 10,
          marginBottom: 24,
        }}>
          {step.icons.map((tile, i) => {
            const Icon = tile.icon;
            const c = tile.tint === 'cyan' ? 'var(--cyan)' : 'var(--rose)';
            return (
              <div
                key={i}
                className="hover-lift"
                style={{
                  padding: '16px 12px',
                  borderRadius: 12,
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${c}1f`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                  border: `1px solid ${c}33`,
                }}>
                  <Icon size={18} style={{ color: c }} />
                </div>
                <p style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  marginBottom: 2,
                }}>{tile.label}</p>
                <p style={{
                  fontSize: 10, color: 'var(--text3)',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>{tile.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Step dots + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {steps.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === idx ? 22 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === idx ? 'var(--cyan)' : 'var(--border2)',
                  transition: 'all .25s cubic-bezier(.4,0,.2,1)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {idx > 0 && (
              <button
                onClick={() => setIdx(i => i - 1)}
                className="btn-ghost press-soft"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', fontSize: 12 }}
              >
                <ChevronLeft size={12} /> Back
              </button>
            )}
            <button
              onClick={next}
              disabled={finishMut.isPending}
              className="btn-primary press-soft"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13 }}
            >
              {isLast ? 'Get started' : 'Next'} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
