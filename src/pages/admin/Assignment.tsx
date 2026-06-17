import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Play, CheckCircle2, Settings2, RefreshCw, ShieldAlert, Award, X,
  Building, Users, Microscope, GraduationCap, Database,
  ChevronLeft, ChevronRight, Calendar, UserX, BarChart3
} from 'lucide-react';
import { runAssignmentAlgorithm } from '../../lib/algorithm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import StudentGrid from '@/components/partner/StudentGrid';
import PicksGrid from '@/components/partner/picks/PicksGrid';
import { cn, hasAnyStudentData } from '@/lib/utils';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function AdminAssignment() {
  const { isDark }: any = useOutletContext();
  const navigate = useNavigate();

  // Core state
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState(false);

  // Data state
  const [campDays, setCampDays] = useState<any[]>([]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [labSessions, setLabSessions] = useState<any[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedUtilizationSession, setSelectedUtilizationSession] = useState<string>('all');

  // Modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [studentPrefs, setStudentPrefs] = useState<any[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingForce, setSavingForce] = useState(false);
  const [viewDataOrg, setViewDataOrg] = useState<any | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  useEffect(() => { fetchInitData(); }, []);

  useEffect(() => {
    if (selectedDayId && campDays.length > 0) {
      const selectedDay = campDays.find(d => d.id === selectedDayId);
      if (selectedDay) setCurrentMonth(new Date(selectedDay.date + 'T00:00:00'));
      setSelectedUtilizationSession('all');
      fetchPlacements();
    }
  }, [selectedDayId, campDays]);

  const fetchInitData = async () => {
    setLoading(true);
    try {
      const [labsRes, slotsRes, sessionsRes, campDaysRes, orgsData, studentsRes, instructorsRes] = await Promise.all([
        supabase.from('labs').select('id, name, capacity_per_session, min_age, max_age').order('name'),
        supabase.from('time_slots').select('id, name').order('start_time'),
        supabase.from('lab_sessions').select('*'),
        supabase.from('camp_days').select('*, camp_day_organizations(camp_day_id)').order('date'),
        (async () => {
          try {
            const { data, error } = await supabase.from('organizations').select('id, name, contact_name, contact_email, group_together, camp_day_organizations ( camp_day_id )');
            if (error) {
              const { data: fallbackData } = await supabase.from('organizations').select('id, name, contact_name, contact_email, camp_day_organizations ( camp_day_id )');
              return fallbackData || [];
            }
            return data || [];
          } catch {
            const { data: fallbackData } = await supabase.from('organizations').select('id, name, contact_name, contact_email, camp_day_organizations ( camp_day_id )');
            return fallbackData || [];
          }
        })(),
        supabase.from('students').select('*, preferences (lab_id)'),
        supabase.from('lab_instructors').select('lab_id, educator_id'),
      ]);
      if (labsRes.data) setLabs(labsRes.data);
      if (slotsRes.data) setTimeSlots(slotsRes.data);
      if (sessionsRes.data) setLabSessions(sessionsRes.data);
      const fetchedDays = (campDaysRes.data || []).filter(d => d.camp_day_organizations?.length > 0);
      setCampDays(fetchedDays);
      if (fetchedDays.length > 0) setSelectedDayId(fetchedDays[0].id);

      const mappedOrgs = (orgsData || []).map((org: any) => {
        const localFallback = localStorage.getItem(`group_together_fallback_${org.id}`) === 'true';
        return {
          ...org,
          group_together: org.group_together ?? localFallback
        };
      });
      setOrganizations(mappedOrgs);
      setStudents(studentsRes.data || []);
      setInstructors(instructorsRes.data || []);
      await fetchPlacements();
    } catch (error) {
      console.error('Error fetching init data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlacements = async () => {
    if (!selectedDayId) return;
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id, pick_number, student_id, lab_session_id,
          students ( id, first_name, last_name, age, organization_id, organizations (name) ),
          lab_sessions!inner ( id, camp_day_id, time_slot_id, lab_id, labs (name) )
        `)
        .eq('lab_sessions.camp_day_id', selectedDayId);
      if (error) throw error;
      setAllAssignments(data || []);
    } catch (error) {
      console.error('Error fetching placements:', error);
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const runAlgorithm = async () => {
    if (!selectedDayId) return;
    setRunning(true);
    setRunSuccess(false);
    try {
      await runAssignmentAlgorithm(selectedDayId);
      setRunSuccess(true);
      setLastRunTime(new Date());
      await fetchPlacements();
    } catch (error) {
      console.error(error);
    } finally {
      setRunning(false);
    }
  };

  const toggleGrouping = async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;
    const nextVal = !org.group_together;

    // 1. Update local UI state
    setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, group_together: nextVal } : o));

    // 2. Save to localStorage fallback
    localStorage.setItem(`group_together_fallback_${orgId}`, String(nextVal));

    // 3. Save to database
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ group_together: nextVal })
        .eq('id', orgId);
      if (error) {
        console.warn('DB update failed, using localStorage fallback:', error);
      }
    } catch (err) {
      console.warn('DB update error, using localStorage fallback:', err);
    }
  };

  const handleResolveClick = async (assignment: any) => {
    setSelectedAssignment(assignment);
    setIsResolveModalOpen(true);
    setLoadingPrefs(true);
    try {
      const { data, error } = await supabase
        .from('preferences')
        .select('rank, lab_id, labs (name, min_age, max_age, capacity_per_session)')
        .eq('student_id', assignment.student_id)
        .order('rank');
      if (error) throw error;
      setStudentPrefs(data || []);
    } catch (err) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const handleForceAssign = async (targetLabId: string) => {
    if (!selectedAssignment) return;
    setSavingForce(true);
    try {
      const campDayId = selectedAssignment.lab_sessions.camp_day_id;
      const timeSlotId = selectedAssignment.lab_sessions.time_slot_id;
      const { data: targetSession, error: sessError } = await supabase
        .from('lab_sessions').select('id')
        .eq('lab_id', targetLabId).eq('camp_day_id', campDayId).eq('time_slot_id', timeSlotId).single();
      if (sessError || !targetSession) throw new Error('Target lab session not found for this day/slot.');
      const matchPref = studentPrefs.find(p => p.lab_id === targetLabId);
      const pickNumber = matchPref ? matchPref.rank : 99;
      const { error: updateError } = await supabase
        .from('assignments').update({ lab_session_id: targetSession.id, pick_number: pickNumber }).eq('id', selectedAssignment.id);
      if (updateError) throw updateError;
      setIsResolveModalOpen(false);
      setSelectedAssignment(null);
      await fetchPlacements();
    } catch (err: any) {
      console.error('Error force assigning:', err);
      alert(err.message || 'Error updating assignment.');
    } finally {
      setSavingForce(false);
    }
  };

  // ─── Derived State ────────────────────────────────────────────────────────────

  const activeOrgs = useMemo(() =>
    organizations.filter(org => org.camp_day_organizations?.some((cdo: any) => cdo.camp_day_id === selectedDayId)),
    [organizations, selectedDayId]
  );

  const dayStudents = useMemo(() => {
    const real = students.filter(hasAnyStudentData);
    return real.filter(s => activeOrgs.some(o => o.id === s.organization_id));
  }, [students, activeOrgs]);

  const daySessions = useMemo(() => labSessions.filter(s => s.camp_day_id === selectedDayId), [labSessions, selectedDayId]);
  const activeLabIds = useMemo(() => [...new Set(daySessions.map(s => s.lab_id))], [daySessions]);

  const dayInstructorsCount = useMemo(() => {
    const ids = instructors.filter(li => activeLabIds.includes(li.lab_id)).map(li => li.educator_id);
    return [...new Set(ids)].length;
  }, [instructors, activeLabIds]);

  const selectedDayObj = useMemo(() => campDays.find(d => d.id === selectedDayId), [campDays, selectedDayId]);
  const dayPlacements = useMemo(() => allAssignments.filter(a => a.lab_sessions?.camp_day_id === selectedDayId), [allAssignments, selectedDayId]);
  const flaggedAssignments = useMemo(() => dayPlacements.filter(a => a.pick_number === null), [dayPlacements]);

  const pickDistribution = useMemo(() => {
    const buckets = [
      { key: 'top3', label: 'Top 3 Picks', color: '#10b981', count: 0 },
      { key: '4-5', label: '4th – 5th', color: '#0ea5e9', count: 0 },
      { key: '6-10', label: '6th – 10th', color: '#f59e0b', count: 0 },
      { key: 'fallback', label: 'Fallback', color: '#f43f5e', count: 0 },
    ];
    dayPlacements.forEach(a => {
      const p = a.pick_number;
      if (p === null) buckets[3].count++;
      else if (p <= 3) buckets[0].count++;
      else if (p <= 5) buckets[1].count++;
      else buckets[2].count++;
    });
    return buckets.filter(b => b.count > 0);
  }, [dayPlacements]);

  const labCapacity = useMemo(() => {
    return labs.filter(l => activeLabIds.includes(l.id)).map(lab => {
      let sessionsForLab = daySessions.filter(s => s.lab_id === lab.id);
      if (selectedUtilizationSession !== 'all') {
        sessionsForLab = sessionsForLab.filter(s => s.time_slot_id === selectedUtilizationSession);
      }
      const labSessionIds = sessionsForLab.map(s => s.id);
      const filled = dayPlacements.filter(a => labSessionIds.includes(a.lab_session_id)).length;
      const totalCap = lab.capacity_per_session * labSessionIds.length;
      return { 
        name: lab.name, 
        filled, 
        capacity: totalCap, 
        perSession: lab.capacity_per_session, 
        sessions: labSessionIds.length 
      };
    });
  }, [labs, activeLabIds, daySessions, dayPlacements, selectedUtilizationSession]);

  const unassignedCount = useMemo(() => {
    const assignedStudentIds = new Set(dayPlacements.map(a => a.student_id));
    return dayStudents.filter(s => !assignedStudentIds.has(s.id)).length;
  }, [dayStudents, dayPlacements]);

  // ─── Calendar Logic ───────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: (null | { dayNum: number; dateString: string })[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      days.push({ dayNum: d, dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    return days;
  }, [currentMonth]);

  // ─── Shared Stat Items ────────────────────────────────────────────────────────

  const statItems = [
    { label: 'Partners', value: activeOrgs.length, icon: <Building size={16} />, color: isDark ? 'text-sky-400' : 'text-sky-600' },
    { label: 'Students', value: dayStudents.length, icon: <Users size={16} />, color: isDark ? 'text-indigo-400' : 'text-indigo-600' },
    { label: 'Labs', value: activeLabIds.length, icon: <Microscope size={16} />, color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
    { label: 'Educators', value: dayInstructorsCount, icon: <GraduationCap size={16} />, color: isDark ? 'text-amber-400' : 'text-amber-600' },
  ];

  // ─── Styling Tokens ───────────────────────────────────────────────────────────

  const thCls = cn(
    "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 overflow-hidden",
    isDark
      ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md"
      : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
  );
  const tdCls = cn("py-1 px-4 border-r last:border-r-0 overflow-hidden", isDark ? "border-white/20" : "border-slate-300");
  const trCls = cn("h-10 border-b transition-colors duration-300 group", isDark ? "border-white/10 hover:bg-white/[0.02]" : "border-slate-200 hover:bg-slate-50/30");

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={cn("h-[calc(100dvh-5rem)] flex flex-col items-center justify-center space-y-4", isDark ? "bg-black text-white" : "bg-white text-slate-900")}>
        <div className={cn("size-12 border-4 rounded-full animate-spin", isDark ? "border-white/10 border-t-white" : "border-slate-200 border-t-slate-900")} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading assignment engine...</p>
      </div>
    );
  }

  // ─── Shared Sub-Components ────────────────────────────────────────────────────

  const ActionButtons = ({ className }: { className?: string }) => (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        onClick={() => navigate('/admin/schedules')}
        className={cn(
          'rounded-xl h-10 px-3 font-semibold tracking-wide text-[11px] transition-all duration-300 border flex items-center justify-center gap-1.5 shadow-sm w-full',
          runSuccess
            ? (isDark ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100')
            : (isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100')
        )}
      >
        <Calendar size={11} className={runSuccess ? 'text-emerald-500' : 'text-slate-400'} /> View Schedule
      </Button>
      <Button
        onClick={runAlgorithm}
        disabled={running}
        className={cn(
          'rounded-xl h-10 px-3 font-semibold tracking-wide text-[11px] transition-all duration-300 border flex items-center justify-center gap-1.5 shadow-sm w-full',
          isDark ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50'
            : 'bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
        )}
      >
        {running ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
        {running ? 'Running...' : 'Run Assignments'}
      </Button>
    </div>
  );

  const CalendarWidget = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className={cn("text-[13px] font-bold", isDark ? "text-white" : "text-slate-800")}>
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className={cn("p-1.5 rounded-lg border transition-colors", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600")}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className={cn("p-1.5 rounded-lg border transition-colors", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600")}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <span key={idx} className="text-[10px] font-black text-slate-500 uppercase">{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const matchedCampDay = campDays.find(d => d.date === day.dateString);
          const isSelected = matchedCampDay && matchedCampDay.id === selectedDayId;
          return (
            <button key={day.dateString} disabled={!matchedCampDay}
              onClick={() => { if (matchedCampDay) setSelectedDayId(matchedCampDay.id); }}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-xl text-[12px] font-bold transition-all relative",
                matchedCampDay
                  ? isSelected
                    ? (isDark ? "bg-white text-slate-950 font-black shadow-md" : "bg-slate-900 text-white font-black shadow-sm")
                    : (isDark ? "text-slate-200 hover:bg-white/5 bg-sky-500/10 border border-sky-500/20" : "text-slate-800 hover:bg-slate-100 bg-sky-50 border border-sky-100")
                  : (isDark ? "text-slate-600 cursor-not-allowed opacity-30" : "text-slate-300 cursor-not-allowed")
              )}>
              <span>{day.dayNum}</span>
              {matchedCampDay && !isSelected && <span className={cn("absolute bottom-1 size-1 rounded-full", isDark ? "bg-sky-400" : "bg-sky-600")} />}
            </button>
          );
        })}
      </div>
    </>
  );

  const FlaggedTable = () => (
    <table className="w-full text-left border-collapse">
      <thead className="sticky top-0 z-40">
        <tr className={cn("border-b transition-colors duration-700", isDark ? "border-white/10" : "border-slate-300")}>
          <th className={cn(thCls, "text-center w-[60px]")}>#</th>
          <th className={cn(thCls, "w-[220px]")}>Student</th>
          <th className={cn(thCls, "w-[200px]")}>Partner Organization</th>
          <th className={thCls}>Current Placement</th>
          <th className={cn(thCls, "text-center w-[140px] border-r-0")}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {flaggedAssignments.map((a, index) => {
          const student = a.students || {};
          const orgName = student.organizations?.name || 'Unknown';
          const initials = (student.first_name?.[0] || '') + (student.last_name?.[0] || '');
          return (
            <tr key={a.id} className={trCls}>
              <td className={cn(tdCls, "text-center font-medium opacity-40")}>{String(index + 1).padStart(2, '0')}</td>
              <td className={tdCls}>
                <div className="flex items-center gap-2">
                  <div className={cn("size-7 rounded-full flex items-center justify-center text-[9px] font-semibold border uppercase shrink-0", isDark ? "bg-slate-900 border-white/10 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-700")}>{initials}</div>
                  <div className="min-w-0">
                    <span className={cn("font-semibold text-[13px] block truncate", isDark ? "text-white" : "text-slate-900")}>{student.first_name} {student.last_name}</span>
                    <span className="text-[10px] font-medium text-slate-400">Age {student.age}</span>
                  </div>
                </div>
              </td>
              <td className={tdCls}><span className={cn("font-semibold text-[13px]", isDark ? "text-slate-300" : "text-slate-600")}>{orgName}</span></td>
              <td className={tdCls}><span className={cn("text-[12px] font-medium", isDark ? "text-rose-400" : "text-rose-600")}>{a.lab_sessions?.labs?.name || 'Fallback'} (fallback)</span></td>
              <td className={cn(tdCls, "text-center border-r-0")}>
                <Button disabled onClick={() => handleResolveClick(a)}
                  className={cn("rounded-xl h-8 px-3 font-semibold tracking-wide text-[10px] transition-all duration-300 border flex items-center gap-1.5 mx-auto disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
                    isDark ? "bg-rose-500/15 border-rose-500/20 text-rose-400 shadow-md shadow-rose-500/5" : "bg-rose-50 border-rose-200/60 text-rose-700 shadow-sm"
                  )}>
                  <Settings2 size={11} /> Resolve
                </Button>
              </td>
            </tr>
          );
        })}
        {flaggedAssignments.length === 0 && (
          <tr>
            <td colSpan={5} className="py-16 text-center">
              <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                <CheckCircle2 size={32} className={dayPlacements.length > 0 ? "text-emerald-500" : (isDark ? "text-slate-500" : "text-slate-400")} />
                <p className={cn(
                  "font-bold text-[11px] transition-colors duration-700",
                  dayPlacements.length > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : (isDark ? "text-slate-400" : "text-slate-500")
                )}>
                  {dayPlacements.length > 0 ? 'All students optimally placed' : 'Any flagged students will be displayed here'}
                </p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const FlaggedToolbar = () => (
    <div className={cn(
      "p-3 md:p-4 border-b flex items-center justify-between shrink-0",
      isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/30"
    )}>
      <div className="flex items-center gap-2">
        <ShieldAlert size={14} className={flaggedAssignments.length > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"} />
        <span className="font-semibold text-[13px]">Flagged Students</span>
        {flaggedAssignments.length > 0 && (
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600")}>
            {flaggedAssignments.length}
          </span>
        )}
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-all duration-700 overflow-hidden flex flex-col",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">
        {/* Main Container — Calendar Sidebar + Compact Toolbar + Table */}
        <div className={cn(
          "rounded-[1.25rem] border transition-colors duration-700 overflow-hidden relative flex flex-1 min-h-0",
          isDark ? "bg-[#020617] border-white/10 shadow-2xl shadow-black/40" : "bg-white border-slate-200 shadow-xl shadow-slate-200/40"
        )}>
          {/* Left — Calendar Sidebar */}
          <div className={cn("w-[300px] shrink-0 flex flex-col overflow-hidden border-r", isDark ? "border-white/10" : "border-slate-200")}>
            <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/30")}>
              <p className={cn("text-sm font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>Camp Schedule</p>
              <Calendar size={16} className="text-slate-400" />
            </div>
            <div className={cn("p-4 flex-1 min-h-0 overflow-y-auto", isDark ? "border-white/5" : "")}>
              <CalendarWidget />
              <p className={cn("text-[10px] font-medium text-center mt-4 leading-relaxed", isDark ? "text-slate-500" : "text-slate-400")}>
                Select a camp date and run the assignment algorithm to place students into labs.
              </p>

              {/* Partner Roster */}
              {activeOrgs.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Partners on this Day</h4>
                  <div className="space-y-1.5">
                    {activeOrgs.map(org => {
                      return (
                        <div key={org.id} className="flex items-center justify-between py-0.5 pr-0.5">
                          <span className={cn("text-[12px] font-medium truncate flex-1 mr-2", isDark ? "text-slate-300" : "text-slate-700")}>
                            {org.name}
                          </span>
                          <button
                            onClick={() => toggleGrouping(org.id)}
                            title={org.group_together ? "Grouping enabled: Solver will prioritize keeping students together in same sessions" : "Group students of this organization together"}
                            className={cn(
                              "size-6 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 border",
                              org.group_together
                                ? (isDark 
                                    ? "bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30 hover:border-sky-500/40" 
                                    : "bg-sky-50 text-sky-700 border-sky-200/80 hover:bg-sky-100 hover:border-sky-300")
                                : (isDark
                                    ? "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100")
                            )}
                          >
                            <Users size={12} className={org.group_together ? "stroke-[2.5]" : "stroke-[2]"} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
            <div className={cn("p-3 border-t shrink-0", isDark ? "border-white/10" : "border-slate-200")}>
              {lastRunTime && (
                <p className={cn("text-[10px] font-medium mb-2 text-center", isDark ? "text-slate-500" : "text-slate-400")}>
                  Last run: {lastRunTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
              )}
              <ActionButtons className="flex-col w-full" />
            </div>
          </div>

          {/* Right — Compact Toolbar with inline stats + Flagged Table */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {/* Compact Toolbar with inline stats */}
            <div className={cn(
              "p-3 md:p-4 border-b shrink-0 flex items-center justify-between",
              isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/30"
            )}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Database size={13} className="text-slate-400" />
                  <span className="font-semibold text-[13px]">
                    {selectedDayObj
                      ? new Date(selectedDayObj.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Select a Day'}
                  </span>
                </div>
                <div className={cn("h-5 w-px", isDark ? "bg-white/10" : "bg-slate-200")} />
                {/* Inline stat badges */}
                <div className="flex items-center gap-4">
                  {statItems.map(stat => (
                    <div key={stat.label} className="flex items-center gap-2">
                      <span className={cn("opacity-70", stat.color)}>{stat.icon}</span>
                      <span className={cn("text-base font-black leading-none", isDark ? "text-white" : "text-slate-900")}>{stat.value}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {unassignedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <UserX size={14} className={isDark ? "text-rose-400" : "text-rose-500"} />
                    <span className={cn("text-base font-black leading-none", isDark ? "text-rose-400" : "text-rose-600")}>{unassignedCount}</span>
                    <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-rose-400/70" : "text-rose-500/70")}>Unassigned</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className={flaggedAssignments.length > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"} />
                  <span className={cn("font-semibold text-[13px]", isDark ? "text-slate-200" : "text-slate-700")}>Flagged</span>
                  {flaggedAssignments.length > 0 && (
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600")}>
                      {flaggedAssignments.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Full Table */}
            <div className="flex-1 overflow-auto min-h-0"><FlaggedTable /></div>

            {/* Pick Distribution + Lab Utilization panels */}
            <div className={cn(
              "border-t shrink-0 grid grid-cols-2",
              isDark ? "border-white/10" : "border-slate-200"
            )}>
              {/* Pick Distribution — Pie Chart */}
              <div className={cn("p-4 border-r flex flex-col", isDark ? "border-white/10" : "border-slate-200")}>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <BarChart3 size={11} className="text-slate-400" /> Pick Distribution
                </h4>
                {dayPlacements.length > 0 ? (() => {
                  const total = dayPlacements.length;
                  const size = 140;
                  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
                  let cumAngle = -Math.PI / 2;
                  const slices = pickDistribution.map(bucket => {
                    const angle = (bucket.count / total) * 2 * Math.PI;
                    const sa = cumAngle;
                    cumAngle += angle;
                    const ea = cumAngle;
                    const cosS = Math.cos(sa), sinS = Math.sin(sa);
                    const cosE = Math.cos(ea), sinE = Math.sin(ea);
                    const lg = angle > Math.PI ? 1 : 0;
                    const d = bucket.count === total
                      ? `M ${cx-r},${cy} A ${r},${r} 0 1,1 ${cx+r},${cy} A ${r},${r} 0 1,1 ${cx-r},${cy}`
                      : `M ${cx},${cy} L ${cx+r*cosS},${cy+r*sinS} A ${r},${r} 0 ${lg},1 ${cx+r*cosE},${cy+r*sinE} Z`;
                    return { ...bucket, d };
                  });
                  return (
                    <div className="flex-1 flex items-center justify-center gap-6">
                      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
                        {slices.map(s => (
                          <path key={s.key} d={s.d} fill={s.color} className="transition-all duration-500"
                            stroke={isDark ? '#020617' : '#ffffff'} strokeWidth="1.5" />
                        ))}
                      </svg>
                      <div className="space-y-2">
                        {pickDistribution.map(bucket => {
                          const pct = Math.round((bucket.count / total) * 100);
                          return (
                            <div key={bucket.key} className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: bucket.color }} />
                              <div className="flex flex-col">
                                <span className={cn("text-[12px] font-semibold leading-tight", isDark ? "text-slate-200" : "text-slate-700")}>{bucket.label}</span>
                                <span className="text-[10px] text-slate-400">{bucket.count} assignments ({pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="flex-1 flex items-center justify-center gap-6">
                    <svg width={140} height={140} viewBox="0 0 140 140" className="shrink-0">
                      <circle cx="70" cy="70" r="68" fill="none" strokeWidth="1.5"
                        className={isDark ? "stroke-white/10" : "stroke-slate-200"} strokeDasharray="4 3" />
                    </svg>
                    <div className="space-y-2">
                      {[{ label: 'Top 3 Picks', color: '#10b981' }, { label: '4th – 5th', color: '#0ea5e9' }, { label: '6th – 10th', color: '#f59e0b' }, { label: 'Fallback', color: '#f43f5e' }].map(b => (
                        <div key={b.label} className="flex items-center gap-2 opacity-30">
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                          <div className="flex flex-col">
                            <span className={cn("text-[12px] font-semibold leading-tight", isDark ? "text-slate-200" : "text-slate-700")}>{b.label}</span>
                            <span className="text-[10px] text-slate-400">— assignments</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lab Utilization */}
              <div className="p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Microscope size={11} className="text-slate-400" /> Lab Utilization
                  </h4>
                  {daySessions.length > 0 && (
                    <div className={cn(
                      "flex items-center gap-1 p-0.5 rounded-lg border text-[9px] font-bold",
                      isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    )}>
                      <button
                        onClick={() => setSelectedUtilizationSession('all')}
                        className={cn(
                          "px-2 py-0.5 rounded-md transition-all",
                          selectedUtilizationSession === 'all'
                            ? (isDark ? "bg-white text-slate-950 font-black" : "bg-slate-900 text-white font-black")
                            : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800")
                        )}
                      >
                        All
                      </button>
                      {timeSlots.map(slot => {
                        const hasSession = daySessions.some(s => s.time_slot_id === slot.id);
                        if (!hasSession) return null;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedUtilizationSession(slot.id)}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all whitespace-nowrap",
                              selectedUtilizationSession === slot.id
                                ? (isDark ? "bg-white text-slate-950 font-black" : "bg-slate-900 text-white font-black")
                                : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800")
                            )}
                          >
                            {slot.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {labCapacity.length > 0 ? (
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {labCapacity.map(lab => {
                      const pct = lab.capacity > 0 ? Math.min((lab.filled / lab.capacity) * 100, 100) : 0;
                      const barColor = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
                      return (
                        <div key={lab.name} className="flex items-center gap-2">
                          <span className={cn("text-[11px] font-medium w-[120px] truncate shrink-0", isDark ? "text-slate-300" : "text-slate-600")}>{lab.name}</span>
                          <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                            <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={cn("text-[10px] font-bold w-[40px] text-right shrink-0", isDark ? "text-slate-500" : "text-slate-400")}>{lab.filled}/{lab.capacity}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 opacity-30">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={cn("text-[11px] font-medium w-[120px] truncate shrink-0", isDark ? "text-slate-500" : "text-slate-400")}>Lab {i}</span>
                        <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")} />
                        <span className={cn("text-[10px] font-bold w-[40px] text-right shrink-0", isDark ? "text-slate-500" : "text-slate-400")}>0/0</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </section>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      <ResolveModal
        isDark={isDark} open={isResolveModalOpen}
        onOpenChange={(v) => { setIsResolveModalOpen(v); if (!v) setSelectedAssignment(null); }}
        assignment={selectedAssignment} studentPrefs={studentPrefs} loadingPrefs={loadingPrefs}
        savingForce={savingForce} labs={labs} daySessions={daySessions}
        allAssignments={allAssignments} onForceAssign={handleForceAssign}
      />
      {viewDataOrg && <OrgDataDrawer org={viewDataOrg} isDark={isDark} onClose={() => setViewDataOrg(null)} />}
    </div>
  );
}

// ─── Resolve Modal ──────────────────────────────────────────────────────────────
function ResolveModal({
  isDark, open, onOpenChange, assignment, studentPrefs, loadingPrefs, savingForce,
  labs, daySessions, allAssignments, onForceAssign,
}: {
  isDark: boolean; open: boolean; onOpenChange: (v: boolean) => void;
  assignment: any; studentPrefs: any[]; loadingPrefs: boolean; savingForce: boolean;
  labs: any[]; daySessions: any[]; allAssignments: any[]; onForceAssign: (labId: string) => void;
}) {
  const student = assignment?.students;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}
        className={cn("sm:max-w-[600px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl", isDark ? "bg-[#020617] text-white shadow-black" : "bg-white text-slate-900")}>
        <DialogHeader className={cn("p-6 md:p-8 border-b relative", isDark ? "border-white/5" : "border-slate-100")}>
          <div className="flex items-center gap-4">
            <div className={cn("size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-md",
              isDark ? "bg-rose-500/10 border-rose-500/25 text-rose-400 shadow-rose-950/20" : "bg-rose-50 border-rose-100 text-rose-600 shadow-rose-100")}>
              <ShieldAlert size={22} className="stroke-[2]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight leading-none">Resolve Conflict</DialogTitle>
              <DialogDescription className={cn("text-[11px] font-medium mt-1 leading-normal", isDark ? "text-slate-400" : "text-slate-500")}>
                Manually place <strong>{student?.first_name} {student?.last_name}</strong> ({student?.age} y/o) in a compatible lab.
              </DialogDescription>
            </div>
          </div>
          <button type="button" onClick={() => onOpenChange(false)}
            className={cn("absolute top-6 right-6 size-9 rounded-xl flex items-center justify-center border transition-all duration-200 z-50",
              isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100")}>
            <X size={16} className="stroke-[2.5]" />
          </button>
        </DialogHeader>
        {loadingPrefs ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="animate-spin text-slate-400" size={32} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading preferences...</p>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-h-[400px] overflow-y-auto">
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Award size={14} className="text-emerald-500" /> Ranked Preferences</h3>
              <div className="space-y-2">
                {studentPrefs.map((pref) => {
                  const isAgeOk = student?.age >= pref.labs.min_age && student?.age <= pref.labs.max_age;
                  const session = daySessions.find(s => s.lab_id === pref.lab_id && s.time_slot_id === assignment?.lab_sessions?.time_slot_id);
                  const filled = allAssignments.filter(a => a.lab_session_id === session?.id).length;
                  const cap = pref.labs.capacity_per_session;
                  const isFull = filled >= cap;
                  return (
                    <div key={pref.lab_id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-4 border transition-all gap-4 rounded-xl",
                      isAgeOk && !isFull ? (isDark ? "bg-white/[0.02] border-white/5 hover:border-emerald-500/30" : "bg-slate-50 border-slate-200/60 hover:border-sky-200") : (isDark ? "bg-white/[0.01] border-white/[0.01] opacity-40" : "bg-slate-100/50 border-slate-50 opacity-60"))}>
                      <div className="flex items-start gap-3">
                        <Badge className={cn("rounded-full size-6 flex items-center justify-center p-0 shrink-0 font-black text-[10px] border-none", isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white")}>{pref.rank}</Badge>
                        <div>
                          <p className="font-black text-sm leading-none">{pref.labs.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">Age: {pref.labs.min_age}-{pref.labs.max_age} &bull; Cap: {cap}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3 shrink-0">
                        {!isAgeOk && <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600")}>Age Mismatch</span>}
                        {isAgeOk && isFull && <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600")}>Full ({filled}/{cap})</span>}
                        {isAgeOk && !isFull && <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>{filled}/{cap}</span>}
                        <Button onClick={() => onForceAssign(pref.lab_id)} disabled={savingForce || !isAgeOk || isFull}
                          className={cn("rounded-xl h-8 px-4 font-semibold text-[10px] transition-all border shadow-sm", isDark ? "bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30" : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100")}>
                          Assign
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {studentPrefs.length === 0 && <div className={cn("text-center py-6 border border-dashed rounded-xl text-sm italic", isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400")}>No preferences configured.</div>}
              </div>
            </div>
            <div className={cn("space-y-3 pt-4 border-t", isDark ? "border-white/10" : "border-slate-200")}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alternative Labs</h3>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                {labs.filter(l => !studentPrefs.some(p => p.lab_id === l.id)).map(lab => {
                  const isAgeOk = student?.age >= lab.min_age && student?.age <= lab.max_age;
                  const session = daySessions.find(s => s.lab_id === lab.id && s.time_slot_id === assignment?.lab_sessions?.time_slot_id);
                  const filled = allAssignments.filter(a => a.lab_session_id === session?.id).length;
                  const cap = lab.capacity_per_session; const isFull = filled >= cap;
                  return (
                    <div key={lab.id} className={cn("flex items-center justify-between p-3 border transition-all rounded-xl",
                      isAgeOk && !isFull ? (isDark ? "bg-white/[0.02] border-white/5 hover:border-emerald-500/30" : "bg-white hover:border-sky-200 border-slate-200/60") : (isDark ? "bg-white/[0.01] border-white/[0.01] opacity-40" : "bg-slate-50 border-slate-50 opacity-40"))}>
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs">{lab.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Age: {lab.min_age}-{lab.max_age} &bull; {filled}/{cap}</p>
                      </div>
                      <Button disabled={!isAgeOk || isFull || savingForce} onClick={() => onForceAssign(lab.id)}
                        className={cn("h-8 rounded-xl font-semibold px-4 text-[10px] border transition-colors shrink-0", isDark ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                        Force Place
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <DialogFooter className={cn("p-6 border-t gap-2", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50/30 border-slate-100")}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}
            className={cn("rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 border border-transparent", isDark ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-50")}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Org Data Drawer ────────────────────────────────────────────────────────────
type OrgDataTab = 'students' | 'picks';
function OrgDataDrawer({ org, isDark, onClose }: { org: any; isDark: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<OrgDataTab>('students');
  const gridFlushRef = useRef<(() => Promise<void>) | null>(null);

  const handleClose = async () => {
    if (gridFlushRef.current) {
      try {
        await gridFlushRef.current();
      } catch (err) {
        console.error('Error flushing to DB before closing drawer:', err);
      }
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent showCloseButton={false}
        className={cn('!fixed !inset-0 !top-0 !left-0 !transform-none !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !rounded-none !border-none !p-0 !gap-0 flex flex-col overflow-hidden', isDark ? 'bg-black text-white' : 'bg-white text-slate-900')}>
        <div className={cn("grid grid-cols-3 items-center px-8 h-16 border-b shrink-0", isDark ? "border-white/10" : "border-slate-200")}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0 border', isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}><Database size={16} /></div>
            <h2 className="text-base font-black tracking-tight leading-none truncate">{org.name}</h2>
          </div>
          <div className="flex items-center justify-center h-full">
            <nav className="flex items-center gap-8 h-full">
              {(['students', 'picks'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn("relative flex items-center h-full text-[13px] font-semibold transition-all duration-500 whitespace-nowrap",
                    activeTab === tab ? (isDark ? "text-white" : "text-blue-600") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"))}>
                  <span>{tab === 'students' ? 'Student Data' : 'Lab Preferences'}</span>
                  {activeTab === tab && <div className={cn("absolute bottom-0 left-0 w-full h-[2.5px] rounded-t-full transition-all duration-300", isDark ? "bg-white" : "bg-blue-600")} />}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center justify-end">
            <button onClick={handleClose} className={cn('size-9 rounded-xl flex items-center justify-center border transition-all duration-200', isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')}>
              <X size={16} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
          <div className="w-full flex-1 min-h-0 flex flex-col partner-enter">
            <section className="relative flex-1 min-h-0 flex flex-col">
              {activeTab === 'students' ? (
                <StudentGrid organizationId={org.id} isDark={isDark} isAdmin={true} flushRef={gridFlushRef} />
              ) : (
                <PicksGrid organizationId={org.id} isDark={isDark} flushRef={gridFlushRef} />
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
