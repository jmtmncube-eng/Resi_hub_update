import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_HOME } from '../../constants/routes';
import { AxiosError } from 'axios';
import IsometricScene from '../../components/IsometricScene';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Admin',           email: 'admin@resihub.co', password: 'admin123' },
  { label: 'Active Student',  email: 'sarah@campus.edu', password: 'pass123'  },
  { label: 'Pending Student', email: 'aisha@campus.edu', password: 'pass123'  },
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

  function fillDemo(email: string, password: string) {
    setValue('email',    email);
    setValue('password', password);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>

      {/* ── Left panel: Isometric scene (desktop only) ────── */}
      <div className="hidden lg:flex" style={{
        flex: 1,
        background: 'linear-gradient(160deg, #06080f 0%, #0a1220 45%, #08101a 100%)',
        borderRight: '1px solid rgba(0,204,204,.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Radial ambient glow behind the scene */}
        <div style={{
          position: 'absolute',
          top: '35%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,204,204,.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}/>
        <div style={{
          position: 'absolute',
          top: '65%', left: '30%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(232,25,122,.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}/>
        {/* Scene */}
        <IsometricScene />
      </div>

      {/* ── Right panel: Login form ───────────────────────── */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }} className="lg:w-[480px] lg:flex-none">

        <div style={{ width: '100%', maxWidth: 420 }} className="appear">

          {/* Mobile-only brand header */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{
              fontSize: 30, fontWeight: 800, color: 'var(--cyan)',
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
          <div className="modal-card" style={{ marginBottom: 12 }}>

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
                Enter your credentials to continue
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

          {/* Demo accounts */}
          <div className="card-sm">
            <p className="micro-label" style={{ marginBottom: 12 }}>Quick demo — click to fill</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DEMO_ACCOUNTS.map(({ label, email, password }) => (
                <button
                  key={email}
                  onClick={() => fillDemo(email, password)}
                  style={{
                    width: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px', borderRadius: 8,
                    background: 'var(--hover)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'all .18s', textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,204,204,.3)';
                    (e.currentTarget as HTMLButtonElement).style.background  = 'rgba(0,204,204,.06)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLButtonElement).style.background  = 'var(--hover)';
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 1 }}>{label}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{email}</p>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)' }}>Fill →</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
