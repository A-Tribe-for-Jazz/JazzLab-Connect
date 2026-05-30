import React, { useState, useEffect } from 'react';
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
import { UserPlus, Mail, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  isDark?: boolean;
}

export default function ShareAccessModal({ open, onOpenChange, organizationId, isDark = false }: ShareAccessModalProps) {
  const [form, setForm] = useState({ fullName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setError(null);
        setForm({ fullName: '', email: '' });
      }, 300);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Authentication session not found. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: form.email.trim(),
          role: 'partner',
          organizationId: organizationId,
          fullName: form.fullName.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send secure invitation.');
      }

      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = cn(
    'pl-10 h-10 border transition-all rounded-xl font-semibold text-[13px] w-full text-left flex items-center bg-transparent',
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/50 focus-visible:bg-sky-500/[0.02]'
      : 'border-slate-200 focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01]'
  );
  const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'sm:max-w-[760px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl',
          isDark ? 'bg-[#020617] text-white shadow-black' : 'bg-white text-slate-900'
        )}
      >
        <DialogHeader className={cn(
          'p-6 md:p-8 border-b relative',
          isDark ? 'border-white/5' : 'border-slate-100'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-md',
              isDark
                ? 'bg-sky-500/10 border-sky-500/25 text-sky-400 shadow-sky-950/20'
                : 'bg-sky-50 border-sky-100 text-sky-700 shadow-sky-100'
            )}>
              <UserPlus size={22} className="stroke-[2]" />
            </div>
            <div className="flex-1 min-w-0 pr-12">
              <DialogTitle className="text-xl font-black tracking-tight leading-none">Share Access</DialogTitle>
              <DialogDescription className={cn(
                'text-[11px] font-medium mt-1 leading-normal',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                Invite a colleague from your organization to help manage student registrations. They will receive an email link to establish their credentials.
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'absolute top-6 right-6 size-9 rounded-xl flex items-center justify-center border transition-all duration-200 z-50',
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            <X size={16} className="stroke-[2.5]" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-1.5">
              <Label className={labelCls}>Full Name</Label>
              <div className="relative group">
                <UserPlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <Input
                  required
                  placeholder="Albert Einstein"
                  className={inputCls}
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Email Address</Label>
              <div className="relative group">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <Input
                  required
                  type="email"
                  placeholder="name@example.com"
                  className={inputCls}
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className={cn(
              'text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in',
              isDark
                ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                : 'text-rose-500 bg-rose-50 border border-rose-100'
            )}>
              <AlertCircle size={14} className="shrink-0" /> {error}
            </p>
          )}

          <DialogFooter className={cn(
            'pt-4 border-t gap-2 bg-transparent',
            isDark ? 'border-white/5' : 'border-slate-100'
          )}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 border border-transparent',
                isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border',
                isDark
                  ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50'
                  : 'bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
              )}
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
