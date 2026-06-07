import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Share2, Lock, AlertCircle } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ShareAccessModal from '../../components/partner/ShareAccessModal';
import { cn } from '@/lib/utils';
import { getThemeClasses } from '../../lib/theme';

interface StepConfig {
  number: number;
  title: string;
  to: string;
  getSubtitle: (stats: Stats, isFinalized: boolean) => string;
}

interface Stats {
  target: number;
  count: number;
  missingDemo: number;
  missingPicks: number;
  fullyReady: number;
  staffCount: number;
  staffMissingInfo: number;
}

const STEPS: StepConfig[] = [
  {
    number: 1,
    title: 'Student Data',
    to: '/partner/students',
    getSubtitle: (s, _) => {
      if (s.count === 0) return 'No students enrolled. Add students and fill out demographics.';
      if (s.missingDemo > 0) return `${s.missingDemo} student${s.missingDemo !== 1 ? 's' : ''} missing demographic details.`;
      return 'All demographics completed successfully!';
    }
  },
  {
    number: 2,
    title: 'Lab Preferences',
    to: '/partner/lab-picks',
    getSubtitle: (s, _) => {
      if (s.count === 0) return 'Add students first.';
      if (s.missingDemo > 0) return 'Complete demographics first.';
      if (s.missingPicks > 0) return `${s.missingPicks} student${s.missingPicks !== 1 ? 's' : ''} missing lab selections.`;
      return 'All lab preferences completed!';
    }
  },
  {
    number: 3,
    title: 'Staff Data',
    to: '/partner/staff',
    getSubtitle: (s, _) => {
      if (s.staffCount === 0) return 'No staff added yet. Add your staff with their name, title, and email.';
      if (s.staffMissingInfo > 0) return `${s.staffMissingInfo} staff member${s.staffMissingInfo !== 1 ? 's' : ''} missing profile details.`;
      return 'All staff profiles completed!';
    }
  },
  {
    number: 4,
    title: 'Schedules',
    to: '/partner/schedule',
    getSubtitle: (_, finalized) => {
      if (finalized) return 'Schedules are finalized! Click to view and download/print.';
      return 'Waiting for the admin to finalize assignments and publish schedules.';
    }
  }
];

type StepStatus = 'pending' | 'in_progress' | 'completed';

export default function PartnerDashboard() {
  const { profile } = useAuth();
  const { isDark, bgFlavor, activeCampDayId }: any = useOutletContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({});
  const [stats, setStats] = useState<Stats>({
    target: 50,
    count: 0,
    missingDemo: 0,
    missingPicks: 0,
    fullyReady: 0,
    staffCount: 0,
    staffMissingInfo: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      const saved: Record<number, StepStatus> = {};
      [1, 2, 3, 4].forEach(num => {
        const val = localStorage.getItem(`step_status_${profile.id}_${activeCampDayId || 'default'}_${num}`) as StepStatus;
        if (val === 'in_progress' || val === 'completed') {
          saved[num] = val;
        } else {
          saved[num] = 'pending';
        }
      });
      setStepStatuses(saved);

      // Scroll to the first incomplete (pending or in_progress) step card
      let firstIncomplete = 1;
      let foundIncomplete = false;
      for (let num = 1; num <= 4; num++) {
        if (saved[num] !== 'completed') {
          firstIncomplete = num;
          foundIncomplete = true;
          break;
        }
      }

      if (foundIncomplete) {
        setTimeout(() => {
          const stepEl = document.getElementById(`step-card-${firstIncomplete}`);
          if (stepEl) {
            stepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  }, [profile, activeCampDayId]);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData();

      const channelStudents = supabase
        .channel(`dashboard-students-org-${profile.organization_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'students' },
          (payload) => {
            const newRecord = payload.new as any;
            const oldRecord = payload.old as any;
            const recordOrgId = newRecord?.organization_id || oldRecord?.organization_id;
            if (recordOrgId === profile.organization_id) fetchData();
          }
        )
        .subscribe();

      const channelPrefs = supabase
        .channel(`dashboard-prefs-org-${profile.organization_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'preferences' }, () => fetchData())
        .subscribe();

      return () => {
        supabase.removeChannel(channelStudents);
        supabase.removeChannel(channelPrefs);
      };
    } else if (profile) {
      setLoading(false);
    }
  }, [profile, activeCampDayId]);

  const fetchData = async () => {
    try {
      const orgId = profile!.organization_id;

      const { data: orgData } = await supabase
        .from('organizations').select('name').eq('id', orgId).single();
      setOrganization(orgData);

      // Fetch labs to calculate correct age-based eligibility
      const { data: labsData } = await supabase
        .from('labs')
        .select('id, min_age, max_age');

      const { data: stData, error: stError } = await supabase
        .from('students')
        .select('id, first_name, last_name, age, camp_day_id, preferences (lab_id)')
        .eq('organization_id', orgId);

      if (stError) throw stError;

      const realStudents = (stData || [])
        .filter(s => s.first_name?.trim() || s.last_name?.trim())
        .filter(s => !activeCampDayId || s.camp_day_id === activeCampDayId);
      const count = realStudents.length;
      const missingDemo = realStudents.filter(
        s => !s.first_name?.trim() || !s.last_name?.trim() || s.age === null || s.age === undefined || s.age === ''
      ).length;
      const coreComplete = realStudents.filter(
        s => s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== ''
      );
      
      const missingPicks = coreComplete.filter(s => {
        const studentAge = s.age !== '' && s.age != null ? Number(s.age) : null;
        const eligibleLabs = (labsData || []).filter(lab => {
          if (lab.min_age == null || studentAge == null) return true;
          return studentAge >= lab.min_age && studentAge <= (lab.max_age ?? 999);
        });
        const eligibleCount = eligibleLabs.length;
        const requiredCount = Math.min(5, eligibleCount);
        const selectedCount = s.preferences?.length || 0;
        return requiredCount > 0 && selectedCount < requiredCount;
      }).length;

      const fullyReady = realStudents.filter(s => {
        const hasCore = s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== '';
        if (!hasCore) return false;
        
        const studentAge = s.age !== '' && s.age != null ? Number(s.age) : null;
        const eligibleLabs = (labsData || []).filter(lab => {
          if (lab.min_age == null || studentAge == null) return true;
          return studentAge >= lab.min_age && studentAge <= (lab.max_age ?? 999);
        });
        const eligibleCount = eligibleLabs.length;
        const requiredCount = Math.min(5, eligibleCount);
        const selectedCount = s.preferences?.length || 0;
        return requiredCount > 0 && selectedCount >= requiredCount;
      }).length;

      const { data: staffData } = await supabase
        .from('staff_members')
        .select('id, name, title, email, cell')
        .eq('organization_id', orgId);

      const realStaff = (staffData || []).filter(s => s.name?.trim() || s.title?.trim() || s.email?.trim() || s.cell?.trim());
      const staffCount = realStaff.length;
      const staffMissingInfo = realStaff.filter(
        s => !s.name?.trim() || !s.title?.trim() || !s.email?.trim()
      ).length;

      setStats({ target: 50, count, missingDemo, missingPicks, fullyReady, staffCount, staffMissingInfo });

      const studentIds = realStudents.map(s => s.id);
      let assignmentsFinalized = false;
      if (studentIds.length > 0) {
        const { count: assignmentsCount } = await supabase
          .from('assignments').select('*', { count: 'exact', head: true }).in('student_id', studentIds);
        assignmentsFinalized = (assignmentsCount || 0) > 0;
      }
      setIsFinalized(assignmentsFinalized);

      if (!orgData) setOrganization({ name: 'Creative Youth Alliance' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepNum: number): StepStatus => {
    return stepStatuses[stepNum] || 'pending';
  };

  const isStepLocked = (stepNum: number): boolean => {
    if (stepNum === 1) return false;
    const prevStatus = getStepStatus(stepNum - 1);
    return prevStatus !== 'completed';
  };

  const handleStartStep = (stepNum: number, to: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const current = getStepStatus(stepNum);
    if (current === 'pending') {
      const next = { ...stepStatuses, [stepNum]: 'in_progress' as StepStatus };
      setStepStatuses(next);
      if (profile?.id) localStorage.setItem(`step_status_${profile.id}_${activeCampDayId || 'default'}_${stepNum}`, 'in_progress');
    }
    navigate(to);
  };

  const handleMarkComplete = (stepNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = { ...stepStatuses, [stepNum]: 'completed' as StepStatus };
    setStepStatuses(next);
    if (profile?.id) localStorage.setItem(`step_status_${profile.id}_${activeCampDayId || 'default'}_${stepNum}`, 'completed');

    // Automatically scroll to place the next step box in the middle of the viewport
    const nextStepNum = stepNum + 1;
    setTimeout(() => {
      const nextStepEl = document.getElementById(`step-card-${nextStepNum}`);
      if (nextStepEl) {
        nextStepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleMarkIncomplete = (stepNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = { ...stepStatuses, [stepNum]: 'pending' as StepStatus };
    setStepStatuses(next);
    if (profile?.id) localStorage.setItem(`step_status_${profile.id}_${activeCampDayId || 'default'}_${stepNum}`, 'pending');
  };

  const handleCardClick = (stepNum: number, to: string) => {
    const current = getStepStatus(stepNum);
    if (current === 'pending') {
      const next = { ...stepStatuses, [stepNum]: 'in_progress' as StepStatus };
      setStepStatuses(next);
      if (profile?.id) localStorage.setItem(`step_status_${profile.id}_${activeCampDayId || 'default'}_${stepNum}`, 'in_progress');
    }
    navigate(to);
  };

  const getChecklistItems = (stepNum: number, status: StepStatus) => {
    if (stepNum === 1) return [
      { text: <>Enroll at least <strong>1 student</strong> in your roster</>, done: stats.count > 0 },
      { text: <>Complete demographic profiles (<u><strong>Age, Grade, Zip, Gender, Ethnicity, Language</strong></u>)</>, done: stats.count > 0 && stats.missingDemo === 0 },
      { text: <>Declare Demographics phase <u><strong>Finished</strong></u></>, done: status === 'completed' },
    ];
    if (stepNum === 2) return [
      { text: <>Complete the <strong>Demographics roster setup</strong> (Step 1)</>, done: stats.count > 0 && stats.missingDemo === 0 },
      { text: <>Select <strong>all eligible labs</strong> for every student</>, done: stats.count > 0 && stats.missingPicks === 0 },
      { text: <>Declare Preferences phase <u><strong>Finished</strong></u></>, done: status === 'completed' },
    ];
    if (stepNum === 3) return [
      { text: <>Add at least <strong>1 staff member</strong></>, done: stats.staffCount > 0 },
      { text: <>Complete all staff profiles (<u><strong>Name, Title, Email</strong></u>)</>, done: stats.staffCount > 0 && stats.staffMissingInfo === 0 },
      { text: <>Declare Staff phase <u><strong>Finished</strong></u></>, done: status === 'completed' },
    ];
    if (stepNum === 4) return [
      { text: <>Wait for the admin to <strong>finalize assignments</strong> and publish schedules</>, done: isFinalized },
      { text: <>Review, download, and print <strong>student schedules</strong></>, done: status === 'completed' },
    ];
    return [];
  };

  const completedCount = STEPS.filter(s => getStepStatus(s.number) === 'completed').length;
  const allComplete = completedCount === STEPS.length;



  const theme = getThemeClasses(isDark, bgFlavor);

  return (
    <div className={cn(
      'pb-20 transition-all duration-700 min-h-[calc(100dvh-5rem)]',
      theme.bg
    )}>
      <div className="w-full px-8 pt-16 space-y-12 partner-enter">



        {/* ── Banner Header ────────────────────────────────────────────────── */}
        <div className={cn(
          'p-8 rounded-3xl border grid grid-cols-1 lg:grid-cols-3 gap-8 w-full transition-all duration-500 shadow-sm relative overflow-hidden',
          isDark
            ? 'bg-[#0f172a]/40 border-slate-800'
            : 'bg-sky-50/30 border-slate-200/60'
        )}>
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

          <div className="lg:col-span-2 space-y-4 relative z-10">
            <h1 className={cn('text-3xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              Welcome back, {profile?.full_name || 'Partner'}
            </h1>
            <p className={cn('text-sm font-medium leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-650')}>
              Please <strong className="underline text-sky-500 dark:text-sky-400">select your Camp Day</strong> from the options at the top-left. Then, <strong className="underline">follow the steps below</strong> to provide student demographics, lab preferences, and staff details — mark each step as complete once all information is filled.
            </p>
          </div>

          <div className={cn(
            'flex flex-col justify-between gap-6 p-6 rounded-2xl border transition-all duration-350 relative z-10',
            isDark
              ? 'bg-[#0f172a]/60 border-slate-800/85 hover:border-slate-800'
              : 'bg-white border-slate-200/80 hover:border-slate-350 shadow-xs'
          )}>
             <div className="space-y-2">
              <span className={cn('text-[10px] font-black uppercase tracking-wider', isDark ? 'text-sky-400/90' : 'text-sky-700/90')}>
                Collaborative Setup
              </span>
              <p className={cn('text-xs font-semibold leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>
                Invite other team members or administrators to access this portal to view or edit data.
              </p>
            </div>
            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              className={cn(
                'rounded-xl h-10 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border w-full md:w-auto justify-center',
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'bg-white border-slate-200/60 text-slate-655 hover:border-slate-350 hover:shadow hover:bg-slate-50'
              )}>
              <Share2 size={16} className="mr-2 text-slate-400 shrink-0" /> Share Access
            </Button>
          </div>
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto relative space-y-12 py-6">
          {/* All absolute overlays in one wrapper so space-y-12 never shifts them */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {/* Dashed vertical path line */}
            <div
              className="absolute left-[128px] top-[8px] bottom-[-16px] w-[2px] -translate-x-1/2"
              style={{
                backgroundImage: isDark
                  ? 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 6px, transparent 6px, transparent 12px)'
                  : 'repeating-linear-gradient(to bottom, rgb(203,213,225) 0px, rgb(203,213,225) 6px, transparent 6px, transparent 12px)',
              }}
            />

            {/* Start label */}
            <div className="absolute left-[128px] top-[8px] -translate-x-1/2 -translate-y-full flex flex-col items-center pb-1.5">
              <span className={cn('text-[9px] font-black uppercase tracking-widest', isDark ? 'text-white/20' : 'text-slate-300')}>
                Start
              </span>
            </div>
            {/* Start dot — centered exactly on the line's top tip */}
            <div className={cn(
              'absolute left-[128px] top-[8px] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full',
              isDark ? 'bg-white/25' : 'bg-slate-300'
            )} />

            {/* Finish dot — centered exactly on the line's bottom tip */}
            <div className={cn(
              'absolute left-[128px] bottom-[-16px] -translate-x-1/2 translate-y-1/2 size-2 rounded-full transition-colors duration-700',
            allComplete ? 'bg-emerald-500' : isDark ? 'bg-white/25' : 'bg-slate-300'
            )} />
            {/* Finish label */}
            <div className="absolute left-[128px] bottom-[-16px] -translate-x-1/2 translate-y-full flex flex-col items-center pt-1.5">
              <span className={cn(
                'text-[9px] font-black uppercase tracking-widest transition-colors duration-700',
                allComplete ? 'text-emerald-500' : isDark ? 'text-white/20' : 'text-slate-300'
              )}>
                Finish
              </span>
            </div>
          </div>

          {STEPS.map((step) => {
            const status = getStepStatus(step.number);
            const checklist = getChecklistItems(step.number, status);
            const locked = isStepLocked(step.number);

            return (
              <div
                key={step.number}
                id={`step-card-${step.number}`}
                className={cn(
                  'relative z-10 flex items-center group transition-all duration-300 pl-16 mb-6 last:mb-0',
                  locked ? 'pointer-events-none' : 'opacity-100'
                )}
              >
                {/* Step content */}
                <div className={cn(
                  'flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-2xl border transition-all duration-300 w-full',
                  status === 'completed'
                    ? isDark ? 'bg-[#051a10] border-emerald-500/15' : 'bg-[#f0fbf5] border-emerald-100 shadow-xs'
                    : status === 'in_progress'
                      ? isDark ? 'bg-[#181206] border-amber-500/20' : 'bg-[#fdfbf2] border-amber-150 shadow-xs'
                      : isDark ? cn(theme.cardBg, "border-white/5") : 'bg-white border-slate-200/80 shadow-xs'
                )}>
                  {/* Inner content wrapper to apply layout but not card opacity directly (so watermark remains visible) */}
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      {/* Large watermark number */}
                      <div className="flex flex-col items-center shrink-0 w-20">
                        <span className={cn(
                          'text-[10px] font-black uppercase tracking-widest select-none transition-colors duration-500 -mb-2',
                          status === 'completed'
                            ? isDark ? 'text-emerald-500/40' : 'text-emerald-500/30'
                            : status === 'in_progress'
                              ? isDark ? 'text-amber-500/80' : 'text-amber-500/70'
                              : isDark ? 'text-white/25' : 'text-slate-900/[0.25]'
                        )}>
                          Step
                        </span>
                        <span className={cn(
                          'text-8xl font-black italic tracking-tighter leading-none select-none transition-colors duration-500',
                          status === 'completed'
                            ? isDark ? 'text-emerald-500/30' : 'text-emerald-500/20'
                            : status === 'in_progress'
                              ? isDark ? 'text-amber-500/70' : 'text-amber-500/60'
                              : isDark ? 'text-white/[0.12]' : 'text-slate-900/[0.12]'
                        )}>
                          0{step.number}
                        </span>
                      </div>

                      <div className={cn('space-y-3 flex-1 min-w-0', locked && 'opacity-40')}>
                        {status === 'pending' && step.number === 4 && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-550 mb-1">
                            <Lock size={10} /> Pending Finalization
                          </div>
                        )}

                        <h3 className={cn('text-lg font-black tracking-tight',
                          status === 'completed'
                            ? isDark ? 'text-emerald-400' : 'text-emerald-800'
                            : isDark ? 'text-white' : 'text-slate-900'
                        )}>
                          {step.title}
                        </h3>

                        <p className={cn('text-sm font-semibold leading-relaxed max-w-xl', isDark ? 'text-slate-400' : 'text-slate-500')}>
                          {step.getSubtitle(stats, isFinalized)}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className={cn(
                      'flex items-center gap-4 shrink-0 pl-24 md:pl-0 mt-4 md:mt-0',
                      locked && 'opacity-40'
                    )}>
                      <div className="flex items-center gap-3">
                        {!locked && status === 'pending' && (
                          <button
                            onClick={e => handleStartStep(step.number, step.to, e)}
                            className={cn(
                              'rounded-xl h-10 w-44 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center justify-center',
                              isDark
                                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300'
                                : 'bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
                            )}>
                            <span>Start Step</span>
                          </button>
                        )}

                        {!locked && status === 'in_progress' && (
                          <>
                            <button
                              onClick={e => handleStartStep(step.number, step.to, e)}
                              className={cn(
                                'rounded-xl h-10 w-44 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center justify-center',
                                isDark
                                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                                  : 'bg-white border-slate-200/60 text-slate-655 hover:border-slate-350 hover:bg-slate-50 hover:text-slate-900'
                              )}>
                              View/Edit
                            </button>
                            <button
                              onClick={e => handleMarkComplete(step.number, e)}
                              className={cn(
                                'rounded-xl h-10 w-44 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center justify-center',
                                isDark
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                                  : 'bg-emerald-50 border-emerald-200/60 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                              )}>
                              <span>Mark as Complete</span>
                            </button>
                          </>
                        )}

                        {!locked && status === 'completed' && (
                          <>
                            <button
                              onClick={e => handleStartStep(step.number, step.to, e)}
                              className={cn(
                                'rounded-xl h-10 w-44 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center justify-center',
                                isDark
                                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                                  : 'bg-white border-slate-200/60 text-slate-655 hover:border-slate-350 hover:bg-slate-50 hover:text-slate-900'
                              )}>
                              View/Edit
                            </button>
                            <div className={cn(
                              'rounded-xl h-10 w-44 font-semibold tracking-wide text-[13px] border flex items-center justify-center select-none shadow-sm',
                              isDark
                                ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                                : 'bg-emerald-50/50 border-emerald-200/60 text-emerald-700'
                            )}>
                              Finished
                            </div>
                          </>
                        )}
                      </div>

                      {/* Status Indicator Icon */}
                      <div className="flex items-center justify-center shrink-0 pl-4 border-l border-slate-200 dark:border-white/10">
                        {locked ? (
                          <div className={cn(
                            'size-10 rounded-full border transition-all duration-300 flex items-center justify-center',
                            isDark ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'
                          )}>
                            <Lock size={16} />
                          </div>
                        ) : status === 'completed' ? (
                          <div className={cn(
                            'size-10 rounded-full border transition-all duration-300 flex items-center justify-center',
                            isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          )}>
                            <Check size={20} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className={cn(
                            'size-10 rounded-full border transition-all duration-300 flex items-center justify-center',
                            status === 'in_progress'
                              ? isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' : 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse'
                              : isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'
                          )}>
                            <AlertCircle size={20} strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {profile?.organization_id && (
        <ShareAccessModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          organizationId={profile.organization_id}
          isDark={isDark}
        />
      )}
    </div>
  );
}
