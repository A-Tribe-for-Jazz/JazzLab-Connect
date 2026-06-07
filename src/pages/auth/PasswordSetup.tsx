import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Loader2, AlertCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const HERO_IMAGE =
  'https://images.squarespace-cdn.com/content/v1/60beb127277b425865c6f3b4/fa62e73c-8f4c-4c26-b2ee-57fecc16ea21/_MOR0343.jpg';

export default function PasswordSetup() {
  const { completePasswordSetup, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.full_name && profile.full_name !== 'Invited User') {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      // 1. Update password in auth system
      const { error: authErr } = await supabase.auth.updateUser({ password });
      if (authErr) throw authErr;

      // 2. Update name in public profiles table
      if (profile?.id) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('id', profile.id);
        if (profileErr) throw profileErr;
      }

      setSuccess(true);
      setTimeout(() => {
        completePasswordSetup();
        if (profile?.role === 'master_admin') navigate('/admin/dashboard');
        else if (profile?.role === 'educator') navigate('/educator/roster');
        else navigate('/partner/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col justify-between">
      {/* Header — mirrors Login portal header with ATFJ logo and new title */}
      <header className="shrink-0 h-14 flex items-center px-8 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto h-full">
          <div className="flex items-center gap-3">
            <img src="/atfj-logo.png" alt="A Tribe for Jazz Logo" className="h-7 w-auto" />
            <span className="font-black text-sm tracking-tight text-slate-900">Jazz Lab Summer Experience - 2026</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Setup</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex items-center justify-center px-6">
        <div className="w-full max-w-5xl">
          {/* Card structure mirrors Login Page */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[480px]">
            {/* Left — Form */}
            <div className="flex flex-col items-center justify-center px-10 py-10 md:px-14">
              <div className="w-full max-w-sm space-y-6">
                {/* Header Block */}
                <div className="space-y-3 text-center">
                  <div className="flex justify-center">
                    <img src="/atfj-logo.png" alt="A Tribe for Jazz" className="h-14 w-auto" />
                  </div>
                  <div className="space-y-0.5">
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900">
                      {success ? 'Setup Complete' : 'Secure Your Account'}
                    </h1>
                    <p className="text-sm font-medium italic text-slate-400">
                      {success
                        ? 'Redirecting to your dashboard...'
                        : "Set your name and password."}
                    </p>
                  </div>
                </div>

                {/* Form / Success State */}
                {success ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center animate-in fade-in duration-700">
                    <Loader2 size={24} className="text-emerald-500 animate-spin" />
                    <p className="text-xs font-bold text-emerald-600">Preparing Workspace...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSetup} className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Full Name
                        </Label>
                        <div className="relative group">
                          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Albert Einstein"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-10 h-9 border border-slate-200 rounded-xl font-semibold text-[13px] transition-all bg-transparent focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01] focus-visible:ring-0"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          New Password
                        </Label>
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

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Confirm Password
                        </Label>
                        <div className="relative group">
                          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        'Set Password & Continue'
                      )}
                    </Button>
                  </form>
                )}

                {/* Encryption Security Badge */}
                <div className="p-3 rounded-xl border border-sky-500/10 bg-sky-500/[0.02] flex items-start gap-2.5 select-none">
                  <ShieldCheck size={16} className="text-sky-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-sky-900 uppercase tracking-wider">End-to-End Encryption</p>
                    <p className="text-[10px] font-semibold text-slate-500 leading-normal">
                      Protected by secure end-to-end encryption to safeguard your credentials and organizational data.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Right — Hero Image matching Login screen */}
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
