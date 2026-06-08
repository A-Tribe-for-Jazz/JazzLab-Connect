import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Play, RefreshCw, UserPlus, Building, Microscope, Users,
  AlertTriangle, CheckCircle2, ChevronRight,
  Mail, Shield, Building2, Loader2, AlertCircle, X
} from 'lucide-react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { hasAnyStudentData } from '../../lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { runAssignmentAlgorithm } from '../../lib/algorithm';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalStudents: number;
  orgCount: number;
  labCount: number;
  flaggedCount: number;
  assignedCount: number;
}

interface PipelineOrg {
  id: string;
  name: string;
  studentCount: number;
  picksPct: number;
  status: 'Ready' | 'Incomplete';
}

interface Organization {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const { isDark }: any = useOutletContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { count: orgCount },
        labsRes,
        { data: assignData },
        { data: orgsData },
        { data: studentsData },
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('labs').select('id, min_age, max_age'),
        supabase.from('assignments').select('id, pick_number'),
        supabase.from('organizations').select('id, name'),
        supabase.from('students').select(`
          *,
          preferences (lab_id)
        `),
      ]);

      const labsData = labsRes.data || [];
      const labCount = labsData.length;
      const flagged = (assignData || []).filter(a => a.pick_number === null).length;
      const realStudents = (studentsData || []).filter(hasAnyStudentData);

      const formattedPipeline: PipelineOrg[] = (orgsData || []).map((org: any) => {
        const orgStudents = realStudents.filter(s => s.organization_id === org.id);
        const sCount = orgStudents.length;
        const picksComplete = orgStudents.filter(s => {
          const studentAge = s.age !== '' && s.age != null ? Number(s.age) : null;
          const eligibleLabs = labsData.filter((lab: any) => {
            if (lab.min_age == null) return true;
            return studentAge !== null && studentAge >= lab.min_age && studentAge <= (lab.max_age ?? 999);
          });
          const eligibleCount = eligibleLabs.length;
          const requiredCount = eligibleCount;
          const selectedCount = s.preferences?.length || 0;
          return requiredCount > 0 && selectedCount >= requiredCount;
        }).length;
        return {
          id: org.id,
          name: org.name,
          studentCount: sCount,
          picksPct: sCount > 0 ? Math.round((picksComplete / sCount) * 100) : 0,
          status: sCount > 0 && picksComplete === sCount ? 'Ready' : 'Incomplete',
        };
      });

      setPipeline(formattedPipeline);
      setStats({
        totalStudents: realStudents.length,
        orgCount: orgCount || 0,
        labCount: labCount || 0,
        flaggedCount: flagged,
        assignedCount: (assignData || []).length,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={cn(
      'pb-0 transition-all duration-700',
      isDark ? 'bg-black' : 'bg-white'
    )}>
      <div className="max-w-7xl mx-auto px-8 pt-16 space-y-16 partner-enter">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-1">
            <h1 className={cn('text-3xl font-black tracking-tighter transition-colors duration-700', isDark ? 'text-white' : 'text-slate-900')}>
              A Tribe for Jazz
            </h1>
            <p className={cn('font-medium italic transition-colors duration-700', isDark ? 'text-slate-500' : 'text-slate-400')}>
              Jazz Lab Summer Experience &bull; Master Admin Portal
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Invite — outline style matching "Share Access" */}
            <Button
              onClick={() => setInviteOpen(true)}
              variant="outline"
              className={cn(
                'rounded-xl h-12 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border',
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'bg-white border-slate-200/60 text-slate-600 hover:border-slate-300 hover:shadow-md'
              )}
            >
              <UserPlus size={16} className="mr-2 text-slate-400" /> Invite User
            </Button>

            {/* Run Assignments — sky style matching "Add Student" */}
            <Button
              onClick={() => navigate('/admin/assignments')}
              className={cn(
                'rounded-xl h-12 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border min-w-[195px] justify-center',
                isDark
                  ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50'
                  : 'bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
              )}
            >
              <Play size={16} className="mr-2" fill="currentColor" />
              Run Assignments
            </Button>
          </div>
        </header>

        {/* ── OrbitStat Grid — identical to Partner Overview ───────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 py-12">
          <OrbitStat
            label="Total Students"
            value={loading ? '—' : (stats?.totalStudents ?? 0)}
            color="border-blue-500"
            bgColor={isDark ? 'bg-blue-500/5' : 'bg-blue-50/50'}
            to="/admin/partners"
            isDark={isDark}
          />
          <OrbitStat
            label="Partner Orgs"
            value={loading ? '—' : (stats?.orgCount ?? 0)}
            color="border-indigo-500"
            bgColor={isDark ? 'bg-indigo-500/5' : 'bg-indigo-50/50'}
            to="/admin/partners"
            isDark={isDark}
          />
          <OrbitStat
            label="Total Labs"
            value={loading ? '—' : (stats?.labCount ?? 0)}
            color="border-emerald-500"
            bgColor={isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/50'}
            to="/admin/labs"
            isDark={isDark}
          />
          <OrbitStat
            label="Flagged Conflicts"
            value={loading ? '—' : (stats?.flaggedCount ?? 0)}
            color="border-rose-500"
            bgColor={isDark ? 'bg-rose-500/5' : 'bg-rose-50/50'}
            isWarning={(stats?.flaggedCount ?? 0) > 0}
            to="/admin/assignments"
            isDark={isDark}
          />
        </div>

      </div>

      {/* ── Invite Modal — same Dialog pattern as ShareAccessModal ──────────── */}
      <InviteModal isDark={isDark} open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

// ── OrbitStat — exact copy of Partner Overview's OrbitStat ───────────────────
function OrbitStat({ label, value, color, bgColor, isWarning, isSuccess, to, isDark }: any) {
  return (
    <Link to={to} className="flex flex-col items-center gap-8 group cursor-pointer no-underline hover:opacity-100">
      <div className={cn(
        'size-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 relative',
        color,
        bgColor,
        isDark ? 'group-hover:brightness-125 shadow-2xl shadow-blue-900/10' : 'group-hover:brightness-95 shadow-sm'
      )}>
        <span className={cn('text-4xl font-light tracking-tighter transition-colors duration-700', isDark ? 'text-white' : 'text-slate-900')}>
          {value}
        </span>

        {isWarning && value > 0 && (
          <div className={cn('absolute inset-0 rounded-full border-2 animate-ping opacity-40', color)} />
        )}

        {isSuccess && (
          <div className="absolute -top-1 -right-1 size-4 rounded-full bg-white flex items-center justify-center shadow-lg z-10">
            <CheckCircle2 className="text-emerald-500" size={12} />
          </div>
        )}
      </div>
      <div className={cn('text-xs font-black uppercase tracking-widest text-center !opacity-100 relative z-20 transition-colors duration-700', isDark ? 'text-slate-500' : 'text-slate-600')}>
        {label}
      </div>
    </Link>
  );
}

// ── Invite Modal — matches Add Partner popup in Organizations page ─────────────
interface Lab {
  id: string;
  name: string;
}

function InviteModal({ isDark, open, onOpenChange }: { isDark: boolean; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'partner', organizationId: '', labId: '' });

  useEffect(() => {
    supabase.from('organizations').select('id, name').order('name').then(({ data }) => {
      if (data) setOrgs(data);
    });
    supabase.from('labs').select('id, name').order('name').then(({ data }) => {
      if (data) setLabs(data);
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setError(null);
        setSent(false);
        setForm({ fullName: '', email: '', role: 'partner', organizationId: '', labId: '' });
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
      if (!token) throw new Error('Authentication session not found. Please log in again.');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email: form.email.trim(),
          role: form.role,
          fullName: form.fullName.trim(),
          organizationId: form.role === 'partner' ? form.organizationId : undefined,
          labId: form.role === 'educator' ? form.labId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send secure invitation.');
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'partner') return 'Partner';
    if (role === 'educator') return 'Educator / Instructor';
    if (role === 'master_admin') return 'Master Admin';
    return 'Select role';
  };

  const getOrgLabel = (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    return org ? org.name : 'Select organization...';
  };

  const getLabLabel = (labId: string) => {
    const lab = labs.find(l => l.id === labId);
    return lab ? lab.name : 'Select lab...';
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
            <div>
              <DialogTitle className="text-xl font-black tracking-tight leading-none">Invite User</DialogTitle>
              <DialogDescription className={cn(
                'text-[11px] font-medium mt-1 leading-normal',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                Send a secure invitation to a new user. They will receive an email link to establish their credentials.
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

        {sent ? (
          <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center space-y-5 min-h-[280px] animate-in fade-in zoom-in-95 duration-300">
            <div className={cn(
              'size-16 rounded-full flex items-center justify-center',
              isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
            )}>
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black tracking-tight">Invite Sent</h3>
              <p className={cn(
                'text-sm max-w-xs mx-auto leading-relaxed',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                An invitation has been sent to <strong className={isDark ? 'text-white' : 'text-slate-900'}>{form.email}</strong>. They'll receive an email with a link to set up their account.
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className={cn(
                'rounded-xl h-10 px-8 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border mt-2',
                isDark
                  ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50'
                  : 'bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
              )}
            >
              Done
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            {/* Left Column: Name + Role */}
            <div className="space-y-4">
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
                <Label className={labelCls}>Role</Label>
                <div className="relative group">
                  <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                  <Select
                    value={form.role}
                    onValueChange={val => setForm({ ...form, role: val || '', organizationId: '', labId: '' })}
                  >
                    <SelectTrigger className={inputCls}>
                      <span>{getRoleLabel(form.role)}</span>
                    </SelectTrigger>
                    <SelectContent className={cn(
                      'rounded-xl border shadow-2xl p-1',
                      isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                    )}>
                      <SelectItem value="partner" className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">Partner</SelectItem>
                      <SelectItem value="educator" className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">Educator / Instructor</SelectItem>
                      <SelectItem value="master_admin" className={cn('font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer', isDark ? 'text-rose-400' : 'text-rose-600')}>Master Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right Column: Email + Organization / Lab / Spacer */}
            <div className="space-y-4">
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

              {form.role === 'partner' ? (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Organization</Label>
                  <div className="relative group">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                    <Select
                      value={form.organizationId}
                      onValueChange={val => setForm({ ...form, organizationId: val || '' })}
                      required={form.role === 'partner'}
                    >
                      <SelectTrigger className={inputCls}>
                        <span>{getOrgLabel(form.organizationId)}</span>
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border shadow-2xl p-1 max-h-60 overflow-y-auto',
                        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                      )}>
                        {orgs.map(org => (
                          <SelectItem key={org.id} value={org.id} className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : form.role === 'educator' ? (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Select Lab</Label>
                  <div className="relative group">
                    <Microscope size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                    <Select
                      value={form.labId}
                      onValueChange={val => setForm({ ...form, labId: val || '' })}
                      required={form.role === 'educator'}
                    >
                      <SelectTrigger className={inputCls}>
                        <span>{getLabLabel(form.labId)}</span>
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border shadow-2xl p-1 max-h-60 overflow-y-auto',
                        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                      )}>
                        {labs.map(lab => (
                          <SelectItem key={lab.id} value={lab.id} className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Scope / Access</Label>
                  <div className="relative group">
                    <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors z-10 pointer-events-none" />
                    <Input
                      disabled
                      value="Full System Access (Master Admin)"
                      className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
                    />
                  </div>
                </div>
              )}

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
            </div>

          </div>

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
        )}
      </DialogContent>
    </Dialog>
  );
}


