import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 size-[600px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -ml-40 -mb-40 size-[500px] rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8">
          <div className="space-y-3 text-center">
             <div className="size-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-900 mx-auto shadow-inner">
                <ShieldCheck size={32} />
             </div>
             <h1 className="text-3xl font-black tracking-tight text-slate-900">Secure Your Account</h1>
             <p className="text-slate-500 font-medium leading-relaxed">
               Welcome to the JazzLab Partner Portal. Please set a permanent password to secure your school's data.
             </p>
          </div>

          {success ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95">
              <div className="size-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-100">
                <CheckCircle2 size={40} />
              </div>
              <p className="text-xl font-black text-slate-900 tracking-tight">Security Setup Complete</p>
              <p className="text-sm text-slate-500 text-center font-medium italic">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSetup} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <Input 
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium text-lg"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <Input 
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12 h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium text-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3 animate-shake">
                   <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                   <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:translate-y-[-2px] active:scale-95"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Establish Secure Connection'
                )}
              </Button>
            </form>
          )}

          <div className="pt-4 flex items-center justify-center gap-6 opacity-40 grayscale">
             <img src="/atfj-logo.png" alt="ATFJ" className="h-8 w-auto" />
             <div className="w-px h-4 bg-slate-200" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enterprise Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}

