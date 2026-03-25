import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_HOME } from '../../constants/routes';
import { AxiosError } from 'axios';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Active Student',   email: 'sarah@campus.edu',   password: 'pass123'  },
  { label: 'Pending Student',  email: 'aisha@campus.edu',   password: 'pass123'  },
  { label: 'Admin',            email: 'admin@resihub.co',   password: 'admin123' },
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState('');

  // If already logged in, redirect
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
      // Let AuthProvider state settle, then navigate
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
    <div className="min-h-screen bg-rh-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-rh-cyan tracking-tight mb-1">ResiHub</h1>
          <p className="text-white/50 text-sm">Student Accommodation Platform</p>
        </div>

        {/* Card */}
        <div className="bg-rh-bg2 border border-white/7 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@campus.edu"
                className={`w-full bg-white/4 border rounded-lg px-3.5 py-2.5 text-white text-sm font-mono placeholder-white/20 outline-none transition-colors ${
                  errors.email
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-white/10 focus:border-rh-cyan focus:bg-rh-cyan/5'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full bg-white/4 border rounded-lg px-3.5 py-2.5 pr-10 text-white text-sm font-mono placeholder-white/20 outline-none transition-colors ${
                    errors.password
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-white/10 focus:border-rh-cyan focus:bg-rh-cyan/5'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                <p className="text-sm text-red-400">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rh-cyan text-rh-bg font-semibold py-2.5 rounded-lg text-sm hover:bg-rh-cyan/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-rh-bg2 border border-white/7 rounded-2xl p-4">
          <p className="text-xs text-white/40 font-mono mb-3 uppercase tracking-wider">Demo accounts</p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map(({ label, email, password }) => (
              <button
                key={email}
                onClick={() => fillDemo(email, password)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 hover:bg-white/6 transition-colors text-left group"
              >
                <div>
                  <p className="text-sm font-medium text-white/80 group-hover:text-white">{label}</p>
                  <p className="text-xs font-mono text-white/35">{email}</p>
                </div>
                <span className="text-xs text-rh-cyan/60 group-hover:text-rh-cyan">Fill →</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
