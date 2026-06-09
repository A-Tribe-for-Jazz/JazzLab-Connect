import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PasswordSetup() {
  const { completePasswordSetup, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        completePasswordSetup();
        if (profile?.role === 'master_admin') navigate('/admin/dashboard');
        else if (profile?.role === 'educator') navigate('/educator/roster');
        else navigate('/partner/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header — mirrors AdminLayout PortalHeader */}
      <header className="sticky top-0 z-50 h-16 flex items-center px-8 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto h-full">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary" size={20} />
            <span className="font-black text-sm tracking-tight text-slate-900">JazzLab Connect</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Setup</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md space-y-16 partner-enter">

          {/* Header Block */}
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className={cn(
                "size-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 relative",
                success
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-sky-500 bg-sky-50/50"
              )}>
                {success ? (
                  <CheckCircle2 size={48} className="text-emerald-500" />
                ) : (
                  <Lock size={48} className="text-sky-600 font-light" strokeWidth={1.5} />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-900">
                {success ? 'Security Setup Complete' : 'Secure Your Account'}
              </h1>
              <p className="font-medium italic text-slate-400">
                {success
                  ? 'Redirecting to your dashboard...'
                  : 'Set a permanent password to protect your organization\'s data.'}
              </p>
            </div>
          </div>

          {/* Form / Success State */}
          {success ? (
            <div className="flex justify-center animate-in fade-in duration-700">
              <Loader2 size={24} className="text-emerald-500 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSetup} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
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
                      className="pl-10 h-10 border border-slate-200 rounded-xl font-semibold text-[13px] transition-all bg-transparent focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01] focus-visible:ring-0"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
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
                      className="pl-10 h-10 border border-slate-200 rounded-xl font-semibold text-[13px] transition-all bg-transparent focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01] focus-visible:ring-0"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in text-rose-500 bg-rose-50 border border-rose-100">
                  <AlertCircle size={14} className="shrink-0" /> {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl h-12 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Set Password & Continue'
                )}
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* Footer — mirrors AdminLayout footer */}
      <footer className="py-6 text-center border-t border-slate-100 bg-white">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
          &copy; 2026 A Tribe for Jazz.
        </p>
      </footer>
    </div>
  );
}
