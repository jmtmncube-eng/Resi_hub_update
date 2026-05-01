import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Home, User, X, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { ROUTES } from '../constants/routes';

const STORAGE_KEY = 'rh_onboarding_seen';

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    icon: <Building2 size={28} />,
    title: 'Welcome to ResiHub! 🎉',
    body: "Your application has been submitted and is now under review. ResiHub makes student accommodation simple — from room allocation to invoices, everything in one place.",
    accent: 'var(--cyan)',
  },
  {
    icon: <Clock size={28} />,
    title: 'How the process works',
    body: "There are 4 steps: ① Your application is logged → ② Admin reserves a room for you → ③ Your move-in date is confirmed → ④ Your account is fully activated. You can track progress on your Application page.",
    accent: '#a78bfa',
  },
  {
    icon: <User size={28} />,
    title: 'Complete your profile',
    body: "While you wait, complete your profile with your university, programme, and contact details. This helps admin process your application faster.",
    accent: '#fb923c',
  },
  {
    icon: <Home size={28} />,
    title: 'Browse available rooms',
    body: "Check out the available rooms while your application is pending. You'll see room types, block locations, and pricing. Once admin allocates a room, you'll receive a notification.",
    accent: 'var(--rose)',
  },
];

interface Props {
  onDismiss?: () => void;
}

export default function OnboardingWizard({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onDismiss?.();
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5,5,8,.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="appear"
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 20,
          padding: '32px 32px 28px',
          position: 'relative',
          boxShadow: '0 32px 80px rgba(0,0,0,.6)',
          overflow: 'hidden',
        }}
      >
        {/* Accent glow top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${current.accent}, transparent)`,
          borderRadius: '20px 20px 0 0',
        }}/>

        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200,
          background: `radial-gradient(circle, ${current.accent}18 0%, transparent 65%)`,
          pointerEvents: 'none',
        }}/>

        {/* Close */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: 'var(--text4)',
            cursor: 'pointer', padding: 6, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 4, borderRadius: 2,
                flex: i === step ? 2 : 1,
                background: i === step ? current.accent : 'var(--border2)',
                transition: 'all .3s ease',
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, marginBottom: 20,
          background: `${current.accent}18`,
          border: `1px solid ${current.accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: current.accent,
        }}>
          {current.icon}
        </div>

        {/* Content */}
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: 'var(--text)',
          letterSpacing: '-.02em', marginBottom: 12,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          {current.title}
        </h2>
        <p style={{
          fontSize: 14, color: 'var(--text2)', lineHeight: 1.75,
          marginBottom: 28, minHeight: 80,
        }}>
          {current.body}
        </p>

        {/* Progress overview (step 2 only) */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[
              { n: '①', label: 'Application submitted', done: true },
              { n: '②', label: 'Room reserved by admin', done: false },
              { n: '③', label: 'Move-in date confirmed', done: false },
              { n: '④', label: 'Account activated', done: false },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: s.done ? 'rgba(0,204,204,.15)' : 'var(--bg3)',
                  border: `1px solid ${s.done ? 'rgba(0,204,204,.3)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12,
                }}>
                  {s.done
                    ? <CheckCircle2 size={14} color="var(--cyan)" />
                    : <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{s.n.slice(1,2)}</span>
                  }
                </div>
                <span style={{
                  fontSize: 13, color: s.done ? 'var(--cyan)' : 'var(--text3)',
                  fontWeight: s.done ? 500 : 400,
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost"
            style={{ padding: '9px 16px', fontSize: 13, opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {isLast ? (
              <>
                <Link
                  to={ROUTES.ROOMS}
                  onClick={dismiss}
                  className="btn-ghost"
                  style={{ padding: '9px 16px', fontSize: 13, textDecoration: 'none' }}
                >
                  Browse Rooms
                </Link>
                <button
                  onClick={dismiss}
                  className="btn-primary"
                  style={{ padding: '9px 18px', fontSize: 13 }}
                >
                  Get Started
                </button>
              </>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Skip link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: 'none',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: 'var(--text4)', cursor: 'pointer',
            }}
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}
