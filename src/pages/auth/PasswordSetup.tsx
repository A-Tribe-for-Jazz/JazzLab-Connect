import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Lock, Loader2, AlertCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const HERO_IMAGE =
  '/banner.webp';

export default function PasswordSetup() {
  const { completePasswordSetup, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.full_name && profile.full_name !== 'Invited User') {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

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

      // 2. Update name and password_set status in public profiles table
      if (profile?.id) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ 
            full_name: fullName.trim(),
            password_set: true
          })
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

  if (loading || success) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white animate-in fade-in duration-500">
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-sky-400" size={48} />
          <div className="absolute inset-0 blur-xl bg-sky-400/20 animate-pulse" />
        </div>
        <h2 className="text-xl font-black tracking-tight">
          {success ? 'Setup Complete!' : 'Updating Details...'}
        </h2>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mt-2 animate-pulse">
          {success ? 'Preparing your workspace... Please wait...' : 'Please wait...'}
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col justify-between">
      {/* Header — mirrors Login portal header with new title */}
      <header className="shrink-0 h-14 flex items-center px-8 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto h-full">
          <div className="flex items-center gap-3">
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
                            disabled={loading}
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
                            disabled={loading}
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
                            disabled={loading}
                            className="pl-10 h-9 border border-slate-200 rounded-xl font-semibold text-[13px] transition-all bg-transparent focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01] focus-visible:ring-0"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mandatory Checkbox */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        id="agree-checkbox"
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        disabled={loading}
                        className="mt-0.5 size-4 rounded border-slate-200 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        required
                      />
                      <label htmlFor="agree-checkbox" className="text-[11px] font-semibold text-slate-500 leading-normal cursor-pointer select-none">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="text-sky-500 hover:text-sky-600 underline font-bold"
                        >
                          Terms of Service
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => setShowPrivacy(true)}
                          className="text-sky-500 hover:text-sky-600 underline font-bold"
                        >
                          Privacy Policy
                        </button>
                        , and acknowledge that all student and staff data will be handled in strict confidence.
                      </label>
                    </div>

                    {error && (
                      <p className="text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in text-rose-500 bg-rose-50 border border-rose-100">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || !agreed}
                      className={cn(
                        "w-full rounded-xl h-10 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border",
                        agreed
                          ? "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                          : "bg-slate-55 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                      )}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Please wait....
                        </span>
                      ) : (
                        'Set Password & Continue'
                      )}
                    </Button>
                  </form>
                )}


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

      {/* Terms of Use Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl p-6 bg-white border border-slate-200 text-slate-900 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="border-b border-slate-150 pb-4 relative shrink-0">
            <DialogTitle className="text-lg font-black tracking-tight leading-none text-slate-900">
              Terms of Use
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-1 py-4 text-[12px] font-semibold text-slate-655 space-y-4 leading-relaxed">
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">1. Authorized Access Only</h4>
              <p>
                Access to the Jazz Lab Connect portal is strictly restricted to authorized partners, educators, and administrative personnel affiliated with A Tribe for Jazz. Shared credentials or account transfers are strictly prohibited.
              </p>
            </section>
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">2. Data Submission Requirements</h4>
              <p>
                Users are responsible for ensuring that all student demographics, Lab preferences, and staff details submitted are accurate, complete, and updated in real time.
              </p>
            </section>
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">3. Permitted Use Cases</h4>
              <p>
                This platform must be used solely to manage student registration, lab preferences, and schedules for the 2026 Jazz Lab Summer Experience. Any unauthorized data extraction, scraping, or utilization is strictly prohibited.
              </p>
            </section>
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">4. Security & Liability</h4>
              <p>
                You are fully responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
              </p>
            </section>
          </div>
          <div className="border-t border-slate-150 pt-4 flex justify-end shrink-0">
            <Button
              onClick={() => setShowTerms(false)}
              className="rounded-xl h-9 px-4 font-semibold tracking-wide text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl p-6 bg-white border border-slate-200 text-slate-900 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="border-b border-slate-150 pb-4 relative shrink-0">
            <DialogTitle className="text-lg font-black tracking-tight leading-none text-slate-900">
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-1 py-4 text-[12px] font-semibold text-slate-655 space-y-4 leading-relaxed">
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">1. Data We Collect</h4>
              <p>
                We collect partner and staff details (names, titles, email addresses, and phone numbers), student demographic details (first and last name, age, last grade completed, home zip code, race/ethnicity, gender, and first language), student program hours (where applicable), and student lab preferences.
              </p>
            </section>
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">2. How We Use Information</h4>
              <p>
                All submitted data is processed exclusively to calculate eligible lab placements, generate schedules, manage session check-ins, and compile anonymized program metrics.
              </p>
            </section>
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">3. Information Sharing Restrictions</h4>
              <p>
                Jazz Lab Connect does not sell, rent, or share personally identifiable information of students or staff with third parties. Data access is strictly restricted to authorized program coordinators.
              </p>
            </section>
            <section className="space-y-1">
              <h4 className="font-bold text-slate-800 text-[13px]">4. Security & Safeguards</h4>
              <p>
                User credentials, profiles, and student records are fully secured using industry-standard SSL/TLS transit protocols and AES-256 database encryption at rest.
              </p>
            </section>
          </div>
          <div className="border-t border-slate-150 pt-4 flex justify-end shrink-0">
            <Button
              onClick={() => setShowPrivacy(false)}
              className="rounded-xl h-9 px-4 font-semibold tracking-wide text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
