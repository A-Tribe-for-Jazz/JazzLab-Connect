import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Users, Microscope, GraduationCap, Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminReports() {
  const { isDark }: any = useOutletContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [campDays, setCampDays] = useState<any[]>([]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [labs, setLabs] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [labSessions, setLabSessions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [labInstructors, setLabInstructors] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [campDayOrgs, setCampDayOrgs] = useState<any[]>([]);

  useEffect(() => {
    fetchInitData();
  }, []);

  const fetchInitData = async () => {
    setLoading(true);
    try {
      // 1. Fetch camp days
      const { data: daysData } = await supabase.from('camp_days').select('*').order('date');
      setCampDays(daysData || []);
      if (daysData && daysData.length > 0) {
        setSelectedDayId(daysData[0].id);
      }

      // 2. Fetch labs
      const { data: labsData } = await supabase.from('labs').select('*').order('name');
      setLabs(labsData || []);

      // 3. Fetch time slots
      const { data: slotsData } = await supabase.from('time_slots').select('*').order('start_time');
      setTimeSlots(slotsData || []);

      // 4. Fetch lab sessions
      const { data: sessionsData } = await supabase.from('lab_sessions').select('*');
      setLabSessions(sessionsData || []);

      // 5. Fetch lab instructors mapping
      const { data: instData } = await supabase
        .from('lab_instructors')
        .select('*, profiles(id, full_name)');
      setLabInstructors(instData || []);

      // 6. Fetch assignments with student details
      const { data: assignData } = await supabase
        .from('assignments')
        .select('*, students(id, first_name, last_name, age, organization_id)');
      setAssignments(assignData || []);

      // 7. Fetch organizations and camp day relations
      const [orgsRes, cdoRes] = await Promise.all([
        supabase.from('organizations').select('id, name'),
        supabase.from('camp_day_organizations').select('*')
      ]);
      setOrganizations(orgsRes.data || []);
      setCampDayOrgs(cdoRes.data || []);

    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived Statistics ───────────────────────────────────────────────────
  const activeOrgs = useMemo(() => {
    if (!selectedDayId) return [];
    const relatedOrgIds = campDayOrgs
      .filter(cdo => cdo.camp_day_id === selectedDayId)
      .map(cdo => cdo.organization_id);
    return organizations.filter(org => relatedOrgIds.includes(org.id));
  }, [selectedDayId, campDayOrgs, organizations]);

  const activeAssignments = useMemo(() => {
    if (!selectedDayId) return [];
    return assignments.filter(a => a.lab_sessions?.camp_day_id === selectedDayId);
  }, [selectedDayId, assignments]);

  const activeStudentsCount = useMemo(() => {
    const studentIds = new Set(activeAssignments.map(a => a.student_id));
    return studentIds.size;
  }, [activeAssignments]);

  const activeEducatorsCount = useMemo(() => {
    if (!selectedDayId) return 0;
    // Find all labs that have sessions scheduled on this day
    const activeSessions = labSessions.filter(s => s.camp_day_id === selectedDayId);
    const activeLabIds = [...new Set(activeSessions.map(s => s.lab_id))];
    
    // Find unique educators assigned to those active labs
    const educators = labInstructors
      .filter(li => activeLabIds.includes(li.lab_id))
      .map(li => li.educator_id);
    return [...new Set(educators)].length;
  }, [selectedDayId, labSessions, labInstructors]);

  if (loading) {
    return (
      <div className={cn("h-[calc(100dvh-5rem)] flex flex-col items-center justify-center space-y-4", isDark ? "bg-black text-white" : "bg-white text-slate-900")}>
        <div className={cn("size-12 border-4 rounded-full animate-spin", isDark ? "border-white/10 border-t-white" : "border-slate-200 border-t-slate-900")} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Camp Schedule matrix...</p>
      </div>
    );
  }

  const selectedDayObj = campDays.find(d => d.id === selectedDayId);
  const dayLabel = selectedDayObj
    ? new Date(selectedDayObj.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Select a Day';

  const statItems = [
    { label: 'Partners', value: activeOrgs.length, icon: <Building2 size={16} />, color: isDark ? 'text-sky-400' : 'text-sky-600' },
    { label: 'Students Assigned', value: activeStudentsCount, icon: <Users size={16} />, color: isDark ? 'text-indigo-400' : 'text-indigo-600' },
    { label: 'Active Labs', value: labs.length, icon: <Microscope size={16} />, color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
    { label: 'Educators on Duty', value: activeEducatorsCount, icon: <GraduationCap size={16} />, color: isDark ? 'text-amber-400' : 'text-amber-600' },
  ];

  // Table styling classes
  const thCls = cn(
    "py-4 px-6 font-bold text-[11px] uppercase tracking-wider border-r last:border-r-0 overflow-hidden",
    isDark
      ? "bg-slate-900 text-slate-400 border-white/10 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
      : "bg-slate-50 text-slate-500 border-slate-200 shadow-[inset_0_-1px_0_0_#e2e8f0]"
  );
  const tdCls = cn("py-4 px-6 border-r last:border-r-0 overflow-hidden", isDark ? "border-white/10" : "border-slate-200");
  const trCls = cn("border-b transition-colors duration-300", isDark ? "border-white/5 hover:bg-white/[0.02]" : "border-slate-200 hover:bg-slate-50/50");

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-all duration-700 overflow-hidden flex flex-col",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col gap-6">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <h1 className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Camp Schedule Matrix
              </h1>
              <p className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDark ? "text-slate-500" : "text-slate-400")}>
                <Calendar size={14} className={isDark ? "text-sky-700" : "text-sky-300"} />
                {dayLabel}
              </p>
            </div>

            {/* Camp Day Selector */}
            <div className="w-full md:w-64">
              <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                <SelectTrigger className={cn("rounded-xl font-bold h-12 transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-white" : "bg-white shadow-sm border-slate-200")}>
                  <SelectValue placeholder="Select Camp Day" />
                </SelectTrigger>
                <SelectContent className={isDark ? "bg-zinc-950 border-white/10" : "bg-white"}>
                  {campDays.map((day, idx) => (
                    <SelectItem key={day.id} value={day.id} className="font-bold">
                      Day {idx + 1} &bull; {new Date(day.date + 'T00:00:00').toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={cn(
            "p-4 rounded-2xl border shrink-0 grid grid-cols-2 md:grid-cols-4 gap-6",
            isDark ? "bg-zinc-950/40 border-white/10" : "bg-slate-50/50 border-slate-200"
          )}>
            {statItems.map(stat => (
              <div key={stat.label} className="flex items-center gap-3">
                <span className={cn("opacity-70 p-2.5 rounded-xl bg-slate-500/10", stat.color)}>{stat.icon}</span>
                <div>
                  <span className={cn("text-xl font-black leading-none block", isDark ? "text-white" : "text-slate-900")}>{stat.value}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Schedule Grid Matrix */}
          <div className={cn(
            "rounded-2xl border transition-colors duration-700 overflow-hidden flex flex-col flex-1 min-h-0",
            isDark 
              ? "bg-[#020617] border-white/10 shadow-2xl shadow-black/40" 
              : "bg-white border-slate-200 shadow-xl shadow-slate-200/40"
          )}>
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-40">
                  <tr className={cn("border-b transition-colors duration-700", isDark ? "border-white/10" : "border-slate-300")}>
                    <th className={cn(thCls, "text-center w-[60px]")}>#</th>
                    <th className={cn(thCls, "w-[240px]")}>Lab Module</th>
                    <th className={cn(thCls, "text-center w-[120px]")}>Age Group</th>
                    {timeSlots.map(slot => (
                      <th key={slot.id} className={thCls}>
                        <div className="flex flex-col">
                          <span>{slot.name}</span>
                          <span className="text-[9px] opacity-60 normal-case font-medium mt-0.5">
                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labs.map((lab, index) => {
                    return (
                      <tr key={lab.id} className={trCls}>
                        {/* Index */}
                        <td className={cn(tdCls, "text-center font-bold opacity-40")}>
                          {String(index + 1).padStart(2, '0')}
                        </td>

                        {/* Lab Info */}
                        <td className={tdCls}>
                          <span className={cn("font-bold text-[13px] block", isDark ? "text-white" : "text-slate-900")}>
                            {lab.name}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                            Max Capacity: {lab.capacity_per_session} students
                          </span>
                        </td>

                        {/* Age Group */}
                        <td className={cn(tdCls, "text-center")}>
                          <Badge variant="secondary" className={cn("font-bold text-[10px] py-0.5 px-2.5", isDark ? "bg-white/5 text-slate-300 border border-white/10" : "bg-slate-100 text-slate-600 border border-slate-200")}>
                            {lab.min_age} - {lab.max_age} yrs
                          </Badge>
                        </td>

                        {/* Time Slots Mapping */}
                        {timeSlots.map(slot => {
                          const session = labSessions.find(s => s.lab_id === lab.id && s.time_slot_id === slot.id && s.camp_day_id === selectedDayId);
                          const sessionInstructors = labInstructors.filter(li => li.lab_id === lab.id);
                          const sessionAssignments = session ? activeAssignments.filter(a => a.lab_session_id === session.id) : [];
                          const studentCount = sessionAssignments.length;
                          const capacity = lab.capacity_per_session || 20;
                          const occupancyPct = (studentCount / capacity) * 100;

                          return (
                            <td key={slot.id} className={tdCls}>
                              {session ? (
                                <div className="space-y-2">
                                  {/* Educators */}
                                  <div className="flex flex-wrap gap-1 items-center">
                                    <GraduationCap size={13} className="text-slate-400 shrink-0" />
                                    {sessionInstructors.length > 0 ? (
                                      <span className={cn("text-[11px] font-semibold truncate max-w-[150px]", isDark ? "text-slate-300" : "text-slate-700")}>
                                        {sessionInstructors.map(si => si.profiles?.full_name).join(', ')}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">No educator</span>
                                    )}
                                  </div>

                                  {/* Occupancy Indicator */}
                                  <div className="flex items-center gap-2">
                                    <div className={cn("flex-1 h-1 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                                      <div 
                                        className={cn(
                                          "h-full rounded-full transition-all duration-500",
                                          occupancyPct >= 100 ? "bg-rose-500" : occupancyPct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                                        )} 
                                        style={{ width: `${Math.min(occupancyPct, 100)}%` }} 
                                      />
                                    </div>
                                    <span className={cn(
                                      "text-[10px] font-black shrink-0",
                                      occupancyPct >= 100 ? "text-rose-500" : occupancyPct >= 75 ? "text-amber-500" : "text-emerald-500"
                                    )}>
                                      {studentCount} / {capacity}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[12px] text-slate-400 dark:text-slate-600 italic">No session</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
