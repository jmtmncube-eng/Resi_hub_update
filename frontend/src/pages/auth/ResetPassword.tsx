import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { resetPassword } from '../../services/auth.service';
import { ROUTES } from '../../constants/routes';

const schema = z.object({
  password:        z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type Form = z.infer<typeof schema>;

/**
 * Step 2 of password reset — user lands here from the email link with a
 * `?token=...` query param. We validate + set the new password, then bounce
 * them to /login. If there's no token in the URL we show an explanatory
 * error rather than letting them fill in a doomed form.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token    = params.get('token') ?? '';

  const [showPw,        setShowPw]        = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [serverError,   setServerError]   = useState('');
  const [done,          setDone]          = useState(false);

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setServerError('');
    try {
      await resetPassword(token, data.password);
      setDone(true);
      toast.success('Password updated.');
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setServerError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div className="glass-card appear" style={{ width: '100%', maxWidth: 420, padding: '36px 36px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--cyan), var(--rose))' }}/>

        {!token ? (
          <div style={{ textAlign: 'center', padding: '8px 4px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
              Missing reset token
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              The reset link looks incomplete. Request a new one and use the link from the email.
            </p>
            <Link to={ROUTES.FORGOT_PASSWORD} className="btn-primary" style={{ marginTop: 20, justifyContent: 'center', padding: '10px 18px', textDecoration: 'none', display: 'inline-flex' }}>
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(74,222,128,.12)', marginBottom: 16 }}>
              <CheckCircle2 size={28} style={{ color: '#4ade80' }}/>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
              Password updated
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 8 }}>
                Set a new password
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>
                Choose a strong password — at least 6 characters. After this, sign in with your new password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="input-base"
                    style={{ paddingRight: 40, ...(errors.password ? { borderColor: '#ef4444' } : {}) }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}>
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ marginTop: 4, fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="field-label">Confirm new password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="input-base"
                    style={{ paddingRight: 40, ...(errors.confirmPassword ? { borderColor: '#ef4444' } : {}) }}
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}>
                    {showConfirmPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p style={{ marginTop: 4, fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {serverError && (
                <div style={{ background: 'rgba(232,25,122,.1)', border: '1px solid rgba(232,25,122,.25)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, color: '#E8197A' }}>{serverError}</p>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 22px', marginTop: 4 }}>
                {isSubmitting ? <Loader2 size={15} className="animate-spin"/> : <KeyRound size={15}/>}
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <Link to={ROUTES.LOGIN} style={{ fontSize: 13, color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14}/> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
