import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const HERO_IMAGE =
  'https://images.squarespace-cdn.com/content/v1/60beb127277b425865c6f3b4/fa62e73c-8f4c-4c26-b2ee-57fecc16ea21/_MOR0343.jpg';

export default function LoginPage() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && profile) {
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

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center px-8 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto h-full">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary" size={18} />
            <span className="font-black text-sm tracking-tight text-slate-900">JazzLab Connect</span>
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
                      Welcome Back
                    </h1>
                    <p className="text-sm font-medium italic text-slate-400">
                      Sign in to your JazzLab Connect account.
                    </p>
                  </div>
                </div>

                {/* Login Form */}
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
                        <Link
                          to="/forgot-password"
                          className="text-[10px] font-bold uppercase tracking-wider text-sky-500 hover:text-sky-600 transition-colors"
                        >
                          Forgot Password?
                        </Link>
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
