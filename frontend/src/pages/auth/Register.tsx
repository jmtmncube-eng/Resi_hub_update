import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../constants/routes';
import { AxiosError } from 'axios';
import IsometricScene from '../../components/IsometricScene';

const registerSchema = z.object({
  name:            z.string().min(2, 'Full name is required'),
  email:           z.string().email('Enter a valid email'),
  password:        z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  university:      z.string().optional(),
  program:         z.string().optional(),
  year:            z.string().optional(),
  phone:           z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser, user } = useAuth();
  const navigate = useNavigate();
  const [showPw,       setShowPw]       = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [serverError,  setServerError]  = useState('');

  if (user) {
    navigate(ROUTES.APPLICATION, { replace: true });
  }

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterForm) {
    setServerError('');
    try {
      await registerUser({
        name:       data.name,
        email:      data.email,
        password:   data.password,
        university: data.university || undefined,
        program:    data.program    || undefined,
        year:       data.year ? parseInt(data.year) : undefined,
        phone:      data.phone      || undefined,
      });
      toast.success('Account created! Welcome to ResiHub 🎉');
      navigate(ROUTES.APPLICATION, { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setServerError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <style>{`
        @media (max-width: 767px) { .rh-scene-panel { display: none !important; } }
        @media (min-width: 768px) { .rh-scene-panel { display: flex !important; } .rh-mobile-brand { display: none !important; } }
      `}</style>

      {/* ── Left panel: Isometric scene ────────────────────────── */}
      <div className="rh-scene-panel" style={{
        flex: 1,
        background: 'linear-gradient(160deg, #06080f 0%, #0a1220 45%, #08101a 100%)',
        borderRight: '1px solid rgba(0,204,204,.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '35%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,204,204,.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}/>
        <IsometricScene />
      </div>

      {/* ── Right panel: Register form ─────────────────────────── */}
      <div style={{
        flexShrink: 0,
        width: '100%',
        maxWidth: 520,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        background: 'linear-gradient(160deg, #0f0810 0%, #1c0d18 45%, #120f14 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Rose glow orbs */}
        <div style={{
          position: 'absolute', top: '20%', right: '15%',
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(232,25,122,.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}/>
        <div style={{
          position: 'absolute', bottom: '15%', left: '10%',
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(232,25,122,.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }} className="appear">

          {/* Mobile brand */}
          <div className="rh-mobile-brand" style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--rose)', letterSpacing: '-.03em', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>
              ResiHub
            </h1>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(232,25,122,.15)', border: '1px solid rgba(232,25,122,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={18} color="var(--rose)" />
              </div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 2 }}>
                  Create your account
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>
                  Already have one?{' '}
                  <Link to={ROUTES.LOGIN} style={{ color: 'var(--rose)', textDecoration: 'none', fontWeight: 500 }}>
                    Sign in →
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="modal-card" style={{ padding: '24px 24px 20px' }}>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Row: Name */}
              <div>
                <label className="field-label">Full Name</label>
                <input {...register('name')} placeholder="Your full name" className="input-base"
                  style={errors.name ? { borderColor: '#ef4444' } : {}} />
                {errors.name && <Err msg={errors.name.message!} />}
              </div>

              {/* Row: Email */}
              <div>
                <label className="field-label">Email Address</label>
                <input {...register('email')} type="email" autoComplete="email" placeholder="you@campus.edu" className="input-base"
                  style={errors.email ? { borderColor: '#ef4444' } : {}} />
                {errors.email && <Err msg={errors.email.message!} />}
              </div>

              {/* Row: Password + Confirm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="field-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input {...register('password')} type={showPw ? 'text' : 'password'}
                      autoComplete="new-password" placeholder="Min 6 chars" className="input-base"
                      style={{ paddingRight: 36, ...(errors.password ? { borderColor: '#ef4444' } : {}) }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}>
                      {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                  {errors.password && <Err msg={errors.password.message!} />}
                </div>
                <div>
                  <label className="field-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input {...register('confirmPassword')} type={showConfirmPw ? 'text' : 'password'}
                      autoComplete="new-password" placeholder="Repeat password" className="input-base"
                      style={{ paddingRight: 36, ...(errors.confirmPassword ? { borderColor: '#ef4444' } : {}) }} />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}>
                      {showConfirmPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                  {errors.confirmPassword && <Err msg={errors.confirmPassword.message!} />}
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', letterSpacing: '.06em' }}>OPTIONAL INFO</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {/* Row: University + Programme */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="field-label">University</label>
                  <input {...register('university')} placeholder="e.g. UCT" className="input-base" />
                </div>
                <div>
                  <label className="field-label">Programme</label>
                  <input {...register('program')} placeholder="e.g. BSc CS" className="input-base" />
                </div>
              </div>

              {/* Row: Year + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="field-label">Year of Study</label>
                  <select {...register('year')} className="input-base">
                    <option value="">Select year</option>
                    {[1,2,3,4,5,6,7].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Phone (optional)</label>
                  <input {...register('phone')} placeholder="+27 ..." className="input-base" />
                </div>
              </div>

              {/* Server error */}
              {serverError && (
                <div style={{ background: 'rgba(232,25,122,.1)', border: '1px solid rgba(232,25,122,.25)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, color: '#E8197A' }}>{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-rose"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 22px', marginTop: 4, fontSize: 14 }}
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin"/>}
                {isSubmitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            By creating an account you agree to our Terms of Service.<br/>
            Your application starts as <span style={{ color: 'var(--rose)' }}>Pending</span> — admin will allocate a room.
          </p>
        </div>
      </div>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <p style={{ marginTop: 4, fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
      {msg}
    </p>
  );
}
