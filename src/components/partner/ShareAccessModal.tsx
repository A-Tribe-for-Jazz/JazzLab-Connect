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
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';

interface ShareAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export default function ShareAccessModal({ open, onOpenChange, organizationId: _organizationId }: ShareAccessModalProps) {
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
      // In a real app, this would be an Edge Function call to avoid exposing admin keys
      // For this implementation, we assume the user has permission to invite
      // or we're using a simulated invite flow that creates a profile.
      
      // 1. Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('A user with this email already has access.');
      }

      // 2. Mocking the invite process for now as Supabase Auth Admin requires service role
      // In production: await supabase.auth.admin.inviteUserByEmail(email, { data: { organization_id: organizationId } })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setEmail('');
        setFullName('');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <UserPlus size={24} />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Share Access</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium leading-relaxed">
            Invite a colleague from your school to help manage student registrations. They will receive a temporary password via email.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-200">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-lg font-bold text-slate-900">Invite Sent!</p>
            <p className="text-sm text-slate-500 text-center">Your colleague will be able to log in and set their password immediately.</p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Colleague's Full Name</Label>
                <Input 
                  id="fullName"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-xl border-slate-200 focus:ring-primary focus:border-primary h-11 font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="jane@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border-slate-200 focus:ring-primary focus:border-primary h-11 font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-lg flex items-center gap-2 animate-in fade-in">
                <AlertCircle size={14} /> {error}
              </p>
            )}

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full rounded-xl h-11 font-bold shadow-lg shadow-primary/20"
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

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
