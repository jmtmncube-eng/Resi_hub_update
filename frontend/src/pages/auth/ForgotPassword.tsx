import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { forgotPassword } from '../../services/auth.service';
import { ROUTES } from '../../constants/routes';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});
type Form = z.infer<typeof schema>;

/**
 * Step 1 of password reset — user enters their email, we email them a
 * single-use link. UI always shows the same "check your inbox" confirmation
 * regardless of whether the email exists (the backend enforces this too,
 * to prevent account enumeration).
 */
export default function ForgotPassword() {
  const [sent,        setSent]        = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setServerError('');
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setServerError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div className="glass-card appear" style={{ width: '100%', maxWidth: 420, padding: '36px 36px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--cyan), var(--rose))' }}/>

        {!sent ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 8 }}>
                Reset your password
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>
                Enter the email address on your ResiHub account and we'll send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

              {serverError && (
                <div style={{ background: 'rgba(232,25,122,.1)', border: '1px solid rgba(232,25,122,.25)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, color: '#E8197A' }}>{serverError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 22px', marginTop: 4 }}
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin"/> : <Mail size={15}/>}
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 4px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(74,222,128,.12)', marginBottom: 16 }}>
              <CheckCircle2 size={28} style={{ color: '#4ade80' }}/>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              If that email is registered with us, a reset link is on its way. The link expires in <b style={{ color: 'var(--text2)' }}>60 minutes</b>.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              Didn't get it? Check your spam folder, or try again.
            </p>
          </div>
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
