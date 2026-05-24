import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Share2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ShareAccessModal from '../../components/partner/ShareAccessModal';
import { cn } from '@/lib/utils';
import { useOutletContext } from 'react-router-dom';

export default function PartnerDashboard() {
  const { profile } = useAuth();
  const { isDark }: any = useOutletContext();
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [stats, setStats] = useState({
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
          race,
          ethnicity,
          gender,
          household_income_tier,
          zip_code,
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

      // Profiles Required (Missing Demographics: race, ethnicity, gender, zip_code, household_income_tier)
      const missingDemo = realStudents.filter(
        s => !s.race || !s.ethnicity || !s.gender || !s.household_income_tier || !s.zip_code
      ).length;

      // Selections Required (Missing 5 Lab Picks)
      const missingPicks = realStudents.filter(
        s => (s.preferences?.length || 0) < 5
      ).length;

      // Fully Ready (Both Core Profile, Demographics, and 5 selections are complete)
      const fullyReady = realStudents.filter(s => {
        const hasCore = s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== '';
        const hasDemo = s.race && s.ethnicity && s.gender && s.household_income_tier && s.zip_code;
        const hasPicks = (s.preferences?.length || 0) === 5;
        return hasCore && hasDemo && hasPicks;
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
            <p className={cn("font-medium italic transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>Jazz Lab&trade; Summer Experience &bull; Partner Portal</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowShareModal(true)} variant="outline" className={cn(
              "rounded-xl h-12 px-6 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border",
              isDark ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" : "bg-white border-slate-200/60 text-slate-600 hover:border-slate-300 hover:shadow-md"
            )}>
              <Share2 size={16} className="mr-2 text-slate-400" /> Share Access
            </Button>
            <Button asChild className={cn(
              "rounded-xl h-12 px-6 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border",
              isDark ? "bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50" : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
            )}>
              <Link to="/partner/students?add=true"><Plus size={16} className="mr-2" /> Add Student</Link>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 py-12">
          <OrbitStat label="Total Enrolled" value={stats.count} color="border-blue-500" bgColor={isDark ? "bg-blue-500/5" : "bg-blue-50/50"} to="/partner/students" isDark={isDark} />
          <OrbitStat label="Profiles Required" value={stats.missingDemo} color="border-amber-500" bgColor={isDark ? "bg-amber-500/5" : "bg-amber-50/50"} isWarning={stats.missingDemo > 0} to="/partner/students?filter=incomplete_demo" isDark={isDark} />
          <OrbitStat label="Selections Required" value={stats.missingPicks} color="border-indigo-500" bgColor={isDark ? "bg-indigo-500/5" : "bg-indigo-50/50"} isWarning={stats.missingPicks > 0} to="/partner/lab-picks" isDark={isDark} />
          <OrbitStat label="Fully Registered" value={stats.fullyReady} color="border-emerald-500" bgColor={isDark ? "bg-emerald-500/5" : "bg-emerald-50/50"} isSuccess={stats.fullyReady === stats.count && stats.count > 0} to="/partner/students" isDark={isDark} />
        </div>

        {profile?.organization_id && (
          <ShareAccessModal open={showShareModal} onOpenChange={setShowShareModal} organizationId={profile.organization_id} />
        )}

      </div>
    </div>
  );
}

function OrbitStat({ label, value, color, bgColor, isWarning, isSuccess, to, isDark }: any) {
  return (
    <Link to={to} className="flex flex-col items-center gap-8 group cursor-pointer no-underline hover:opacity-100">
      <div className={cn(
        "size-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 relative",
        color,
        bgColor,
        isDark ? "group-hover:brightness-125 shadow-2xl shadow-blue-900/10" : "group-hover:brightness-95 shadow-sm"
      )}>
        <span className={cn("text-4xl font-light tracking-tighter transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>{value}</span>

        {/* Enhanced Simple Pulse Render */}
        {isWarning && value > 0 && (
          <div className={cn("absolute inset-0 rounded-full border-2 animate-ping opacity-40", color)} />
        )}

        {isSuccess && <div className="absolute -top-1 -right-1 size-4 rounded-full bg-white flex items-center justify-center shadow-lg z-10"><CheckCircle2 className="text-emerald-500" size={12} /></div>}
      </div>
      <div className={cn("text-xs font-black uppercase tracking-widest text-center !opacity-100 relative z-20 transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-600")}>{label}</div>
    </Link>
  );
}
