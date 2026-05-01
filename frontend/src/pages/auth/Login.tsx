import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, FlaskConical } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_HOME, ROUTES } from '../../constants/routes';
import { AxiosError } from 'axios';
import IsometricScene  from '../../components/IsometricScene';
import SparkParticles  from '../../components/SparkParticles';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

// Dev-only seeded accounts. Hidden in production builds via VITE_HIDE_DEMO=1
// (set the env var when building for prod and the picker disappears entirely).
const DEMO_ACCOUNTS: Array<{ label: string; email: string; password: string; tone: 'cyan' | 'rose' }> = [
  { label: 'Admin · Jordan',      email: 'admin@resihub.co',     password: 'admin123',    tone: 'rose' },
  { label: 'Admin · Mbongeni',    email: 'mbongeni@resihub.co',  password: 'mbongeni123', tone: 'rose' },
  { label: 'Resident · Sarah',    email: 'sarah@campus.edu',     password: 'pass123',     tone: 'cyan' },
  { label: 'Resident · Thandi',   email: 'thandi@lions.edu',     password: 'lions123',    tone: 'cyan' },
  { label: 'Applicant · Aisha',   email: 'aisha@campus.edu',     password: 'pass123',     tone: 'cyan' },
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState('');

  if (user) {
    navigate(ROLE_HOME[user.role], { replace: true });
  }

  const {
    register, handleSubmit, setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  function fillDemo(email: string, password: string) {
    setValue('email',    email);
    setValue('password', password);
  }

  const showDemo = import.meta.env.VITE_HIDE_DEMO !== '1';

  async function onSubmit(data: LoginForm) {
    setServerError('');
    try {
      await login(data);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      setTimeout(() => {
        navigate(from || ROLE_HOME[user?.role ?? 'PENDING_STUDENT'], { replace: true });
      }, 0);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setServerError(
        axiosErr.response?.data?.error || 'Something went wrong. Please try again.'
      );
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <style>{`
        @media (max-width: 767px) { .rh-scene-panel { display: none !important; } }
        @media (min-width: 768px) { .rh-scene-panel { display: flex !important; } .rh-mobile-brand { display: none !important; } }
      `}</style>

      {/* ── Left panel: Isometric scene ─────────────────── */}
      <div className="rh-scene-panel" style={{
        flex: 1,
        background: 'linear-gradient(160deg, #06080f 0%, #0a1220 45%, #08101a 100%)',
        borderRight: '1px solid rgba(0,204,204,.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Radial ambient glow */}
        <div style={{
          position: 'absolute', top: '35%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,204,204,.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}/>
        <div style={{
          position: 'absolute', top: '65%', left: '30%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(232,25,122,.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}/>
        <IsometricScene />
      </div>

      {/* ── Right panel: Login form (blends from cyan-dark → rose) ───── */}
      <div style={{
        flexShrink: 0,
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        background: 'linear-gradient(160deg, #08101a 0%, #0d0a1a 35%, #150a18 70%, #100912 100%)',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '1px solid rgba(0,204,204,.05)',
      }}>
        {/* Seam blend — soft cyan→rose vertical fade along the left edge */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: 180,
          background: 'linear-gradient(90deg, rgba(0,204,204,.07) 0%, rgba(0,204,204,.02) 40%, transparent 100%)',
          pointerEvents: 'none',
        }}/>
        {/* Aurora sweep — diagonal wash bridging both colors */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 0% 30%, rgba(0,204,204,.10) 0%, transparent 55%), radial-gradient(ellipse 70% 70% at 100% 70%, rgba(232,25,122,.14) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}/>
        {/* Decorative rose glow orbs */}
        <div style={{
          position: 'absolute', top: '18%', right: '10%',
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(232,25,122,.13) 0%, transparent 65%)',
          pointerEvents: 'none',
          animation: 'blob1 14s ease-in-out infinite',
        }}/>
        <div style={{
          position: 'absolute', bottom: '12%', left: '5%',
          width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(0,204,204,.08) 0%, transparent 65%)',
          pointerEvents: 'none',
          animation: 'blob2 18s ease-in-out infinite',
        }}/>
        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }}/>
        {/* Rising sparks */}
        <SparkParticles color="#E8197A" rate={0.14} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="appear">

          {/* Mobile-only brand header */}
          <div className="rh-mobile-brand" style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{
              fontSize: 30, fontWeight: 800, color: 'var(--rose)',
              letterSpacing: '-.03em', fontFamily: "'Space Grotesk', sans-serif",
              marginBottom: 4,
            }}>
              ResiHub
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: 'var(--text3)', letterSpacing: '.06em',
            }}>
              STUDENT ACCOMMODATION PLATFORM
            </p>
          </div>

          {/* Login card */}
          <div className="glass-card" style={{ marginBottom: 12, padding: '28px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--cyan), var(--rose))' }}/>

            {/* Card header */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontSize: 22, fontWeight: 700,
                letterSpacing: '-.02em', color: 'var(--text)',
                marginBottom: 6,
              }}>
                Sign in to your account
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>
                No account?{' '}
                <Link to={ROUTES.REGISTER} style={{ color: 'var(--rose)', textDecoration: 'none', fontWeight: 500 }}>
                  Create one free →
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Email */}
              <div>
                <label className="field-label">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@campus.edu"
                  className="input-base"
                  style={errors.email ? { borderColor: '#ef4444' } : {}}
                />
                {errors.email && (
                  <p style={{ marginTop: 4, fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="field-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-base"
                    style={{
                      paddingRight: 40,
                      ...(errors.password ? { borderColor: '#ef4444' } : {}),
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      color: 'var(--text3)', cursor: 'pointer', padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ marginTop: 4, fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Server error */}
              {serverError && (
                <div style={{
                  background: 'rgba(232,25,122,.1)',
                  border: '1px solid rgba(232,25,122,.25)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <p style={{ fontSize: 13, color: '#E8197A' }}>{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 22px', marginTop: 4 }}
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin"/>}
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Dev-only demo accounts — auto-removed in production builds.
              Set VITE_HIDE_DEMO=1 at build time to drop them entirely. */}
          {showDemo && (
            <div className="card-sm" style={{
              marginTop: 14, padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(232,25,122,.04), rgba(0,204,204,.02))',
              borderColor: 'rgba(232,25,122,.18)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <FlaskConical size={11} style={{ color: 'var(--rose)' }} />
                <span className="micro-label" style={{ margin: 0 }}>
                  Dev quick-fill
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 4,
                  background: 'rgba(232,25,122,.14)', color: 'var(--rose)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase', letterSpacing: '.05em',
                }}>DEV</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                {DEMO_ACCOUNTS.map(({ label, email, password, tone }) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => fillDemo(email, password)}
                    className="press-soft"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                      padding: '7px 10px', borderRadius: 7,
                      background: 'var(--hover)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all .18s', textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.borderColor = tone === 'rose' ? 'rgba(232,25,122,.32)' : 'rgba(0,204,204,.32)';
                      el.style.background  = tone === 'rose' ? 'rgba(232,25,122,.06)' : 'rgba(0,204,204,.05)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.borderColor = 'var(--border)';
                      el.style.background  = 'var(--hover)';
                    }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: tone === 'rose' ? 'var(--rose)' : 'var(--cyan)',
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                      color: 'var(--text3)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}>
                      {email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Legal links — short acknowledgement + clickable policy & terms */}
          <p style={{
            marginTop: 16, textAlign: 'center', fontSize: 11, lineHeight: 1.6,
            color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace",
          }}>
            By signing in you agree to our{' '}
            <Link to={ROUTES.TERMS} style={{
              color: 'var(--text2)', textDecoration: 'none', fontWeight: 600,
              borderBottom: '1px solid rgba(0,204,204,.4)',
            }}>
              Terms of Use
            </Link>
            {' '}and{' '}
            <Link to={ROUTES.PRIVACY} style={{
              color: 'var(--text2)', textDecoration: 'none', fontWeight: 600,
              borderBottom: '1px solid rgba(0,204,204,.4)',
            }}>
              Privacy Policy
            </Link>
            {' '}(POPIA-compliant).
          </p>

          {/* Athera signature */}
          <div style={{
            marginTop: 14, textAlign: 'center',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, color: 'var(--text3)', letterSpacing: '.05em',
          }}>
            Built by{' '}
            <span style={{
              color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 11,
            }}>
              Athera
            </span>
            {' '}· © {new Date().getFullYear()}
          </div>

        </div>
      </div>
    </div>
  );
}
