import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const HERO_IMAGE =
  '/banner.webp';

export default function LoginPage() {
  const { user, profile, requiresPasswordSetup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteExpired] = useState(() => {
    const hash = window.location.hash;
    return hash.includes('otp_expired') || hash.includes('Invite+token+has+expired');
  });

  // Recovery flow state (for expired invite)
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);

  console.log('LoginPage state: user =', user?.email, 'profile =', profile?.full_name, 'requiresPasswordSetup =', requiresPasswordSetup);

  if (user && profile) {
    if (requiresPasswordSetup) {
      console.log('LoginPage redirecting to /password-setup');
      return <Navigate to="/password-setup" replace />;
    }
    console.log('LoginPage redirecting to dashboard based on role:', profile.role);
    if (profile.role === 'master_admin') return <Navigate to="/admin/dashboard" replace />;
    if (profile.role === 'partner') return <Navigate to="/partner/dashboard" replace />;
    if (profile.role === 'educator') return <Navigate to="/educator/roster" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectTo = `${isLocal ? window.location.origin : 'https://jazzlabconnect.com'}/set-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo,
      });
      if (error) throw error;
      setRecoverySent(true);
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to send setup link.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center px-8 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto h-full">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary" size={18} />
            <span className="font-black text-sm tracking-tight text-slate-900">Jazz Lab Connect</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sign In</span>
        </div>
      </header>

      {/* Main Content — fills remaining space */}
      <main className="flex-1 min-h-0 flex items-center justify-center px-6">
        <div className="w-full max-w-5xl">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[480px]">
            {/* Left — Form */}
            <div className="flex flex-col items-center justify-center px-10 py-12 md:px-14">
              <div className="w-full max-w-sm space-y-8">
                {/* Header Block */}
                <div className="space-y-3 text-center">
                  <div className="flex justify-center">
                    <img src="/atfj-logo.png" alt="A Tribe for Jazz" className="h-16 w-auto" />
                  </div>
                  <div className="space-y-0.5">
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900">
                      {inviteExpired ? 'Set Up Your Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-sm font-medium italic text-slate-400">
                      {inviteExpired
                        ? 'Request a new setup link to create your password.'
                        : 'Sign in to your Jazz Lab Connect account.'}
                    </p>
                  </div>
                </div>

                {inviteExpired ? (
                  /* ── Expired Invite Recovery Flow ──────────────────────── */
                  <div className="space-y-5">
                    {/* Warning notice */}
                    <div className="p-3.5 rounded-xl border border-amber-200/60 bg-amber-50/50 text-[12px] font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-300">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                      <div className="text-left">
                        <p className="font-bold text-amber-900">Invite Link Expired</p>
                        <p className="mt-0.5 text-slate-500">
                          Your invitation link has expired or has already been used. Enter your email address below and we will send you a new secure link to set up your password.
                        </p>
                      </div>
                    </div>

                    {recoverySent ? (
                      /* Success state */
                      <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center animate-in fade-in zoom-in duration-300">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-600 shadow-sm">
                          <CheckCircle2 size={22} />
                        </div>
                        <div className="space-y-1">
                          <h2 className="text-sm font-bold text-slate-900">Setup Link Sent!</h2>
                          <p className="text-[12px] font-semibold text-slate-500 leading-relaxed max-w-[280px]">
                            Please check your email for a new password setup link and follow the instructions.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Recovery email form */
                      <form onSubmit={handleRecovery} className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Email Address
                          </Label>
                          <div className="relative group">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              value={recoveryEmail}
                              onChange={(e) => setRecoveryEmail(e.target.value)}
                              className="pl-10 h-9 border border-slate-200 rounded-xl font-semibold text-[13px] transition-all bg-transparent focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01] focus-visible:ring-0"
                              required
                            />
                          </div>
                        </div>

                        {recoveryError && (
                          <p className="text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in text-rose-500 bg-rose-50 border border-rose-100">
                            <AlertCircle size={14} className="shrink-0" /> {recoveryError}
                          </p>
                        )}

                        <Button
                          type="submit"
                          disabled={recoveryLoading}
                          className="w-full rounded-xl h-10 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                        >
                          {recoveryLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Send Password Setup Link'
                          )}
                        </Button>
                      </form>
                    )}

                    {/* Link back to normal sign in */}
                    <div className="text-center">
                      <a
                        href="/signin"
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Already have a password? Sign in instead →
                      </a>
                    </div>
                  </div>
                ) : (
                  /* ── Normal Login Form ─────────────────────────────────── */
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Email Address
                        </Label>
                        <div className="relative group">
                          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-9 border border-slate-200 rounded-xl font-semibold text-[13px] transition-all bg-transparent focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01] focus-visible:ring-0"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Password
                          </Label>
                        </div>
                        <div className="relative group">
                          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 h-9 border border-slate-200 rounded-xl font-semibold text-[13px] transition-all bg-transparent focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01] focus-visible:ring-0"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in text-rose-500 bg-rose-50 border border-rose-100">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl h-10 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Sign In'
                      )}
                    </Button>

                  </form>
                )}
              </div>
            </div>

            {/* Right — Hero Image */}
            <div className="relative hidden md:block">
              <img
                src={HERO_IMAGE}
                alt="A Tribe for Jazz Summer Arts Program"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.85]"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-4 text-center border-t border-slate-100 bg-white">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
          &copy; 2026 A Tribe for Jazz.
        </p>
      </footer>
    </div>
  );
}
