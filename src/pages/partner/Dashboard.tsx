import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Share2, ArrowRight, RotateCcw, Play, Lock } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ShareAccessModal from '../../components/partner/ShareAccessModal';
import { cn } from '@/lib/utils';

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
      if (s.staffCount === 0) return 'No staff added yet. Add your staff with their name, email, and cell number.';
      if (s.staffMissingInfo > 0) return `${s.staffMissingInfo} staff member${s.staffMissingInfo !== 1 ? 's' : ''} missing contact details.`;
      return 'All staff profiles completed!';
    }
  },
  {
    number: 4,
    title: 'Final Placements',
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
  const { isDark, activeCampDayId }: any = useOutletContext();
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
      const missingPicks = coreComplete.filter(s => (s.preferences?.length || 0) < 5).length;
      const fullyReady = realStudents.filter(s => {
        const hasCore = s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== '';
        const hasPicks = (s.preferences?.length || 0) === 5;
        return hasCore && hasPicks;
      }).length;

      const { data: staffData } = await supabase
        .from('staff_members')
        .select('id, name, email, cell')
        .eq('organization_id', orgId);

      const realStaff = (staffData || []).filter(s => s.name?.trim() || s.email?.trim() || s.cell?.trim());
      const staffCount = realStaff.length;
      const staffMissingInfo = realStaff.filter(
        s => !s.name?.trim() || !s.email?.trim() || !s.cell?.trim()
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
    let isProgComplete = false;
    if (stepNum === 1) isProgComplete = stats.count > 0 && stats.missingDemo === 0;
    if (stepNum === 2) isProgComplete = stats.count > 0 && stats.missingDemo === 0 && stats.missingPicks === 0;
    if (stepNum === 3) isProgComplete = stats.staffCount > 0 && stats.staffMissingInfo === 0;
    if (stepNum === 4) isProgComplete = isFinalized;
    if (isProgComplete) return 'completed';
    return stepStatuses[stepNum] || 'pending';
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
      { text: <>Complete demographic profiles (<u><strong>Age, Grade, Zip, Gender, Ethnicity</strong></u>)</>, done: stats.count > 0 && stats.missingDemo === 0 },
      { text: <>Declare Demographics phase <u><strong>Finished</strong></u></>, done: status === 'completed' },
    ];
    if (stepNum === 2) return [
      { text: <>Complete the <strong>Demographics roster setup</strong> (Step 1)</>, done: stats.count > 0 && stats.missingDemo === 0 },
      { text: <>Rank the <strong>top 5 lab preferences</strong> for every student</>, done: stats.count > 0 && stats.missingPicks === 0 },
      { text: <>Declare Preferences phase <u><strong>Finished</strong></u></>, done: status === 'completed' },
    ];
    if (stepNum === 3) return [
      { text: <>Add at least <strong>1 staff member</strong></>, done: stats.staffCount > 0 },
      { text: <>Complete all staff profiles (<u><strong>Name, Email, Cell Number</strong></u>)</>, done: stats.staffCount > 0 && stats.staffMissingInfo === 0 },
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

  if (loading) return null;

  return (
    <div className={cn(
      'pb-20 transition-all duration-700 min-h-[calc(100dvh-5rem)]',
      isDark ? 'bg-black' : 'bg-white'
    )}>
      <div className="w-full px-8 pt-16 space-y-12 partner-enter">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className={cn(
          'flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b pb-8 w-full',
          isDark ? 'border-white/5' : 'border-slate-100'
        )}>
          <div className="space-y-1.5 flex-1">
            <h1 className={cn('text-3xl font-black tracking-tighter transition-colors duration-700', isDark ? 'text-white' : 'text-slate-900')}>
              Welcome, {profile?.full_name || 'Partner'}
            </h1>
            <p className={cn('text-sm font-medium transition-colors duration-700', isDark ? 'text-slate-400' : 'text-slate-600')}>
              Please <strong className="underline text-sky-500 dark:text-sky-400">select your Camp Day</strong> from the options at the top-left. Then, <strong className="underline">follow the steps below</strong> to provide student demographics, lab preferences, and staff details — mark each step as complete once all information is filled.
            </p>
          </div>
          <div className="flex items-center justify-end w-full md:w-auto gap-3 shrink-0">
            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              className={cn(
                'rounded-xl h-12 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border w-full md:w-auto',
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'bg-white border-slate-200/60 text-slate-600 hover:border-slate-300 hover:shadow-md'
              )}>
              <Share2 size={16} className="mr-2 text-slate-400" /> Share Access
            </Button>
          </div>
        </header>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto relative space-y-12 py-6">
          {/* All absolute overlays in one wrapper so space-y-12 never shifts them */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dashed vertical path line */}
            <div
              className="absolute left-[24px] top-6 bottom-6 w-[2px] -translate-x-1/2"
              style={{
                backgroundImage: isDark
                  ? 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 6px, transparent 6px, transparent 12px)'
                  : 'repeating-linear-gradient(to bottom, rgb(203,213,225) 0px, rgb(203,213,225) 6px, transparent 6px, transparent 12px)',
              }}
            />

            {/* Start label */}
            <div className="absolute left-[24px] top-6 -translate-x-1/2 -translate-y-full flex flex-col items-center pb-1.5">
              <span className={cn('text-[9px] font-black uppercase tracking-widest', isDark ? 'text-white/20' : 'text-slate-300')}>
                Start
              </span>
            </div>
            {/* Start dot — centered exactly on the line's top tip */}
            <div className={cn(
              'absolute left-[24px] top-6 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full',
              isDark ? 'bg-white/25' : 'bg-slate-300'
            )} />

            {/* Finish dot — centered exactly on the line's bottom tip */}
            <div className={cn(
              'absolute left-[24px] bottom-6 -translate-x-1/2 translate-y-1/2 size-2 rounded-full transition-colors duration-700',
              allComplete ? 'bg-emerald-500' : isDark ? 'bg-white/25' : 'bg-slate-300'
            )} />
            {/* Finish label */}
            <div className="absolute left-[24px] bottom-6 -translate-x-1/2 translate-y-full flex flex-col items-center pt-1.5">
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

            return (
              <div
                key={step.number}
                className={cn(
                  'relative flex items-start group transition-opacity duration-300 pl-16',
                  status === 'completed' ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                )}
              >
                {/* Circle node on the line */}
                <div className="absolute left-[24px] top-[26px] -translate-x-1/2 z-10">
                  <div className={cn(
                    'size-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center shadow-md relative',
                    status === 'completed'
                      ? 'bg-emerald-500 border-emerald-450 text-white'
                      : status === 'in_progress'
                        ? 'bg-amber-500 border-amber-400 text-white'
                        : isDark ? 'bg-black border-white/20 text-slate-500' : 'bg-white border-slate-350 text-slate-400'
                  )}>
                    {status === 'completed'
                      ? <Check size={15} strokeWidth={3.5} />
                      : <span className="text-[12px] font-black">{step.number}</span>}
                    {status === 'in_progress' && (
                      <div className="absolute -inset-1.5 rounded-full border-2 border-amber-400 animate-ping opacity-60 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Step content */}
                <div className={cn(
                  'flex-1 flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 border-b',
                  isDark ? 'border-white/5' : 'border-slate-100'
                )}>
                  <div className="flex items-start gap-6 flex-1 min-w-0">
                    {/* Large watermark number */}
                    <span className={cn(
                      'text-8xl font-black italic tracking-tighter leading-none select-none transition-colors duration-500 shrink-0',
                      status === 'completed'
                        ? isDark ? 'text-emerald-500/30' : 'text-emerald-500/20'
                        : status === 'in_progress'
                          ? isDark ? 'text-amber-500/70' : 'text-amber-500/60'
                          : isDark ? 'text-white/5' : 'text-slate-900/[0.05]'
                    )}>
                      0{step.number}
                    </span>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[9px] font-black uppercase tracking-widest',
                          status === 'completed' ? 'text-emerald-500' : status === 'in_progress' ? 'text-amber-500' : 'text-slate-400'
                        )}>
                          {status === 'completed' ? 'Finished' : status === 'in_progress' ? 'In Progress' : 'Not Started'}
                        </span>
                        {status === 'pending' && step.number === 4 && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-550 pl-2">
                            <Lock size={10} /> Pending Finalization
                          </span>
                        )}
                      </div>

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

                      {/* Checklist */}
                      <div className="space-y-2.5 pt-3">
                        {checklist.map((item, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2 text-xs">
                            <Check
                              size={12}
                              className={item.done ? 'text-emerald-500' : isDark ? 'text-slate-700' : 'text-slate-300'}
                            />
                            <span className={cn(
                              item.done ? 'line-through opacity-40' : '',
                              isDark ? 'text-slate-350' : 'text-slate-600'
                            )}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 shrink-0 pl-24 md:pl-0 mt-4 md:mt-0">
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={e => handleStartStep(step.number, step.to, e)}
                          className={cn(
                            'flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-black uppercase transition-all duration-300 border shadow-sm',
                            isDark
                              ? 'bg-sky-500/20 border-sky-500/30 text-sky-400 hover:bg-sky-500/30'
                              : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                          )}>
                          <Play size={10} fill="currentColor" />
                          <span>Start Step</span>
                          <ArrowRight size={12} className="ml-1" />
                        </button>
                        <button
                          onClick={e => handleMarkComplete(step.number, e)}
                          className="px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-800">
                          Skip
                        </button>
                      </>
                    )}

                    {status === 'in_progress' && (
                      <>
                        <button
                          onClick={e => handleMarkComplete(step.number, e)}
                          className={cn(
                            'flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-black uppercase transition-all border shadow-sm',
                            isDark
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : 'bg-emerald-600 border-emerald-555 text-white hover:bg-emerald-500'
                          )}>
                          <Check size={11} strokeWidth={3} />
                          <span>Complete</span>
                        </button>
                        <button
                          onClick={e => handleStartStep(step.number, step.to, e)}
                          className={cn('text-xs font-bold', isDark ? 'text-slate-450 hover:text-white' : 'text-slate-450 hover:text-slate-850')}>
                          Resume
                        </button>
                      </>
                    )}

                    {status === 'completed' && (
                      <>
                        <button
                          onClick={e => handleStartStep(step.number, step.to, e)}
                          className={cn('text-xs font-bold mr-1', isDark ? 'text-slate-450 hover:text-white' : 'text-slate-450 hover:text-slate-850')}>
                          View / Edit
                        </button>
                        <div className={cn(
                          'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border',
                          isDark
                            ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                            : 'bg-emerald-500/5 text-emerald-555 border-emerald-555/15'
                        )}>
                          Finished
                        </div>
                        <button
                          onClick={e => handleMarkIncomplete(step.number, e)}
                          className="p-1.5 rounded text-slate-450 hover:text-slate-650 transition-colors"
                          title="Reset Step Status">
                          <RotateCcw size={12} />
                        </button>
                      </>
                    )}
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
