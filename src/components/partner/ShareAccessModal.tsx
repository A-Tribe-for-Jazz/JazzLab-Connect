import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  isDark?: boolean;
}

export default function ShareAccessModal({ open, onOpenChange, organizationId, isDark = false }: ShareAccessModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Get the session JWT token to authorize the Edge Function call
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Authentication session not found. Please log in again.');
      }

      // 2. Call the deployed invite-user Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          role: 'partner',
          organizationId: organizationId,
          fullName: fullName.trim()
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send secure invitation.');
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setEmail('');
        setFullName('');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[425px] rounded-3xl border-none shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-500",
        isDark 
          ? "bg-slate-950/90 backdrop-blur-xl text-white ring-1 ring-white/10" 
          : "bg-white ring-1 ring-slate-100"
      )}>
        <DialogHeader>
          <div className={cn(
            "size-12 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-500",
            isDark ? "bg-sky-500/10 text-sky-400" : "bg-sky-50 text-blue-600"
          )}>
            <UserPlus size={24} />
          </div>
          <DialogTitle className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Share Access
          </DialogTitle>
          <DialogDescription className={cn("font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-500")}>
            Invite a colleague from your school to help manage student registrations. They will receive a temporary password via email.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className={cn(
              "size-16 rounded-full flex items-center justify-center shadow-lg transition-all",
              isDark 
                ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10" 
                : "bg-emerald-50 text-emerald-500 shadow-emerald-200"
            )}>
              <CheckCircle2 size={32} />
            </div>
            <p className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Invite Sent!</p>
            <p className={cn("text-sm text-center font-medium max-w-[280px]", isDark ? "text-slate-400" : "text-slate-500")}>
              Your colleague will be able to log in and set their password immediately.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className={cn("text-[10px] font-black uppercase tracking-widest pl-1", isDark ? "text-slate-500" : "text-slate-400")}>
                  Colleague's Full Name
                </Label>
                <Input 
                  id="fullName"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={cn(
                    "rounded-xl h-11 font-medium transition-all duration-300 border-2 outline-none",
                    isDark 
                      ? "bg-white/[0.02] border-white/5 text-white placeholder:text-slate-700 hover:border-sky-500/30 focus-visible:border-sky-500/50 focus-visible:bg-white/[0.04] focus-visible:ring-0" 
                      : "bg-slate-50 border-slate-200/60 text-slate-900 placeholder:text-slate-300 hover:border-sky-500/30 focus-visible:border-sky-500/50 focus-visible:bg-white focus-visible:ring-0"
                  )}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className={cn("text-[10px] font-black uppercase tracking-widest pl-1", isDark ? "text-slate-500" : "text-slate-400")}>
                  Email Address
                </Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="jane@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "rounded-xl h-11 font-medium transition-all duration-300 border-2 outline-none",
                    isDark 
                      ? "bg-white/[0.02] border-white/5 text-white placeholder:text-slate-700 hover:border-sky-500/30 focus-visible:border-sky-500/50 focus-visible:bg-white/[0.04] focus-visible:ring-0" 
                      : "bg-slate-50 border-slate-200/60 text-slate-900 placeholder:text-slate-300 hover:border-sky-500/30 focus-visible:border-sky-500/50 focus-visible:bg-white focus-visible:ring-0"
                  )}
                  required
                />
              </div>
            </div>

            {error && (
              <p className={cn(
                "text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in transition-colors duration-500",
                isDark 
                  ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" 
                  : "text-rose-500 bg-rose-50 border border-rose-100"
              )}>
                <AlertCircle size={14} className="shrink-0" /> {error}
              </p>
            )}

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className={cn(
                  "w-full rounded-xl h-11 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border",
                  isDark 
                    ? "bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50" 
                    : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                )}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  'Send Secure Invitation'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
