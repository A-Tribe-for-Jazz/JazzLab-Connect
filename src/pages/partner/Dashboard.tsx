import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Share2, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ShareAccessModal from '../../components/partner/ShareAccessModal';
import { cn } from '@/lib/utils';
import { useOutletContext } from 'react-router-dom';

interface StepConfig {
  number: number;
  title: string;
  getSubtitle: (stats: Stats) => string;
  isComplete: (stats: Stats) => boolean;
  to: string;
}

interface Stats {
  target: number;
  count: number;
  missingDemo: number;
  missingPicks: number;
  fullyReady: number;
}

const STEPS: StepConfig[] = [
  {
    number: 1,
    title: 'Add Students',
    getSubtitle: (s) =>
      s.count > 0
        ? `${s.count} student${s.count !== 1 ? 's' : ''} enrolled`
        : 'Enroll at least one student to get started',
    isComplete: (s) => s.count > 0,
    to: '/partner/students?add=true',
  },
  {
    number: 2,
    title: 'Complete Student Profiles',
    getSubtitle: (s) => {
      if (s.count === 0) return 'Add students first';
      if (s.missingDemo === 0) return 'All profiles complete';
      return `${s.missingDemo} student${s.missingDemo !== 1 ? 's' : ''} missing profile info`;
    },
    isComplete: (s) => s.count > 0 && s.missingDemo === 0,
    to: '/partner/students?filter=incomplete_demo',
  },
  {
    number: 3,
    title: 'Select Lab Preferences',
    getSubtitle: (s) => {
      if (s.count === 0) return 'Add students first';
      if (s.missingDemo > 0) return 'Complete profiles first';
      if (s.missingPicks === 0) return 'All lab selections complete';
      return `${s.missingPicks} student${s.missingPicks !== 1 ? 's' : ''} need lab selections`;
    },
    isComplete: (s) => s.count > 0 && s.missingDemo === 0 && s.missingPicks === 0,
    to: '/partner/lab-picks',
  },
  {
    number: 4,
    title: 'All Students Registered',
    getSubtitle: (s) => {
      if (s.fullyReady === s.count && s.count > 0) return 'Registration complete — you\'re all set!';
      if (s.count === 0) return 'No students enrolled yet';
      return `${s.fullyReady} of ${s.count} students fully registered`;
    },
    isComplete: (s) => s.fullyReady === s.count && s.count > 0,
    to: '/partner/students',
  },
];

export default function PartnerDashboard() {
  const { profile } = useAuth();
  const { isDark }: any = useOutletContext();
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    target: 50,
    count: 0,
    missingDemo: 0,
    missingPicks: 0,
    fullyReady: 0
  });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData();

      const channelStudents = supabase
        .channel(`dashboard-students-org-${profile.organization_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'students',
          },
          (payload) => {
            const newRecord = payload.new as any;
            const oldRecord = payload.old as any;
            const recordOrgId = newRecord?.organization_id || oldRecord?.organization_id;
            if (recordOrgId === profile.organization_id) {
              fetchData();
            }
          }
        )
        .subscribe();

      const channelPrefs = supabase
        .channel(`dashboard-prefs-org-${profile.organization_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'preferences',
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channelStudents);
        supabase.removeChannel(channelPrefs);
      };
    } else if (profile) {
      setLoading(false);
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const orgId = profile!.organization_id;

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();
      setOrganization(orgData);

      const { data: stData, error: stError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          age,
          preferences (lab_id)
        `)
        .eq('organization_id', orgId);

      if (stError) throw stError;

      const { data: labData } = await supabase.from('labs').select('id, name');
      setLabs(labData || []);

      // Filter out empty phantom rows that might exist in the database
      const realStudents = (stData || []).filter(
        s => s.first_name?.trim() || s.last_name?.trim()
      );

      const count = realStudents.length;

      // Profiles Required (Missing core profile: first_name + last_name + age)
      // Matches the StudentGrid's "Incomplete Profiles" filter definition
      const missingDemo = realStudents.filter(
        s => !s.first_name?.trim() || !s.last_name?.trim() || s.age === null || s.age === undefined || s.age === ''
      ).length;

      // Selections Required (core-complete students missing 5 Lab Picks)
      // Only count from students visible on the Lab Picks page (requires complete core profile)
      const coreComplete = realStudents.filter(
        s => s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== ''
      );
      const missingPicks = coreComplete.filter(
        s => (s.preferences?.length || 0) < 5
      ).length;

      // Fully Ready (Core Profile + 5 selections are complete)
      const fullyReady = realStudents.filter(s => {
        const hasCore = s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== '';
        const hasPicks = (s.preferences?.length || 0) === 5;
        return hasCore && hasPicks;
      }).length;

      setStats({
        target: 50,
        count,
        missingDemo,
        missingPicks,
        fullyReady
      });

      if (!orgData) setOrganization({ name: 'Creative Youth Alliance' });
      if (!labData?.length) {
        setLabs([
          { id: 'lab-0', name: 'Jazz Performance' },
          { id: 'lab-1', name: 'Digital Storytelling' },
          { id: 'lab-2', name: 'Visual Arts' },
          { id: 'lab-3', name: 'Music Production' },
          { id: 'lab-4', name: 'Dance Workshop' },
          { id: 'lab-5', name: 'Theater Arts' },
          { id: 'lab-6', name: 'Creative Writing' },
          { id: 'lab-7', name: 'Photography' },
          { id: 'lab-8', name: 'Robotics' },
          { id: 'lab-9', name: 'Fashion Design' },
        ]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Determine which step is the current active one (first incomplete)
  const activeStepIndex = STEPS.findIndex(step => !step.isComplete(stats));

  if (loading) return null;

  return (
    <div className={cn(
      "pb-0 transition-all duration-700",
      isDark ? "bg-black" : "bg-white"
    )}>
      <div className="max-w-7xl mx-auto px-8 pt-16 space-y-16 partner-enter">

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-1">
            <h1 className={cn("text-3xl font-black tracking-tighter transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>{organization?.name}</h1>
            <p className={cn("font-medium italic transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>Jazz Lab Summer Experience &bull; Partner Portal</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowShareModal(true)} variant="outline" className={cn(
              "rounded-xl h-12 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border",
              isDark ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" : "bg-white border-slate-200/60 text-slate-600 hover:border-slate-300 hover:shadow-md"
            )}>
              <Share2 size={16} className="mr-2 text-slate-400" /> Share Access
            </Button>
            <Button asChild className={cn(
              "rounded-xl h-12 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border",
              isDark ? "bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50" : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
            )}>
              <Link to="/partner/students?add=true"><Plus size={16} className="mr-2" /> Add Student</Link>
            </Button>
          </div>
        </header>

        {/* Registration Progress Timeline */}
        <div className="py-8">
          <h2 className={cn(
            "text-[10px] font-black uppercase tracking-[0.25em] mb-10",
            isDark ? "text-slate-600" : "text-slate-400"
          )}>
            Registration Progress
          </h2>

          <div className="relative ml-2">
            {STEPS.map((step, idx) => {
              const isComplete = step.isComplete(stats);
              const isActive = idx === activeStepIndex;
              const isPending = !isComplete && !isActive;
              const isLast = idx === STEPS.length - 1;

              return (
                <div key={step.number} className="relative flex items-start group">
                  {/* Vertical Connector Line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "absolute left-[19px] top-[44px] w-[2px] transition-all duration-700",
                        isComplete
                          ? isDark ? "bg-sky-500/60" : "bg-sky-400/50"
                          : isDark ? "bg-white/[0.06]" : "bg-slate-200/80"
                      )}
                      style={{ height: 'calc(100% - 20px)' }}
                    />
                  )}

                  {/* Step Circle */}
                  <div className="relative flex-shrink-0 z-10">
                    <div
                      className={cn(
                        "size-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 border-2",
                        isComplete
                          ? isDark
                            ? "bg-sky-500/20 border-sky-400 text-sky-400"
                            : "bg-sky-50 border-sky-400 text-sky-600"
                          : isActive
                            ? isDark
                              ? "bg-sky-500/10 border-sky-400/70 text-sky-400"
                              : "bg-sky-50/80 border-sky-400/60 text-sky-600"
                            : isDark
                              ? "bg-white/[0.03] border-white/10 text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                      )}
                    >
                      {isComplete ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        step.number
                      )}
                    </div>

                    {/* Active step pulse ring */}
                    {isActive && (
                      <div className={cn(
                        "absolute inset-0 rounded-full border-2 animate-ping opacity-30",
                        isDark ? "border-sky-400" : "border-sky-400"
                      )} />
                    )}
                  </div>

                  {/* Step Content */}
                  <Link
                    to={step.to}
                    className={cn(
                      "ml-5 pb-10 flex-1 group/link cursor-pointer no-underline transition-all duration-300",
                      isLast && "pb-0"
                    )}
                  >
                    <div className={cn(
                      "rounded-2xl px-6 py-4 transition-all duration-300 border",
                      isComplete
                        ? isDark
                          ? "bg-sky-500/[0.04] border-sky-500/10 hover:bg-sky-500/[0.08]"
                          : "bg-sky-50/40 border-sky-100/60 hover:bg-sky-50/80"
                        : isActive
                          ? isDark
                            ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] shadow-lg shadow-sky-900/5"
                            : "bg-white border-slate-200/60 hover:border-slate-300 shadow-lg shadow-slate-200/50"
                          : isDark
                            ? "bg-transparent border-white/[0.03] hover:bg-white/[0.02]"
                            : "bg-transparent border-slate-100/50 hover:bg-slate-50/50"
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={cn(
                            "text-[15px] font-bold tracking-tight transition-colors duration-300",
                            isComplete
                              ? isDark ? "text-sky-400" : "text-sky-700"
                              : isActive
                                ? isDark ? "text-white" : "text-slate-900"
                                : isDark ? "text-slate-500" : "text-slate-400"
                          )}>
                            {step.title}
                          </h3>
                          <p className={cn(
                            "text-[13px] mt-0.5 font-medium transition-colors duration-300",
                            isComplete
                              ? isDark ? "text-sky-400/60" : "text-sky-600/60"
                              : isActive
                                ? isDark ? "text-slate-400" : "text-slate-500"
                                : isDark ? "text-slate-600" : "text-slate-400"
                          )}>
                            {step.getSubtitle(stats)}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className={cn(
                            "transition-all duration-300 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-1",
                            isComplete
                              ? isDark ? "text-sky-400/50" : "text-sky-400"
                              : isActive
                                ? isDark ? "text-slate-400" : "text-slate-500"
                                : isDark ? "text-slate-600" : "text-slate-400"
                          )}
                        />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {profile?.organization_id && (
          <ShareAccessModal open={showShareModal} onOpenChange={setShowShareModal} organizationId={profile.organization_id} isDark={isDark} />
        )}

      </div>
    </div>
  );
}
