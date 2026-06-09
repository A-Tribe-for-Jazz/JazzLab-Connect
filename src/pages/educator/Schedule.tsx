import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Users, Microscope, GraduationCap, Building2, Eye, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function EducatorSchedule() {
  const { isDark }: any = useOutletContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Query parameter selectors
  const paramDayId = searchParams.get('day') || '';
  const paramSlotId = searchParams.get('slot') || '';

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

  // Modal State for viewing students
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [selectedSessionInfo, setSelectedSessionInfo] = useState<any>(null);
  const [selectedSessionStudents, setSelectedSessionStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchInitData();
  }, []);

  useEffect(() => {
    if (paramDayId && campDays.length > 0) {
      setSelectedDayId(paramDayId);
    }
  }, [paramDayId, campDays]);

  const fetchInitData = async () => {
    setLoading(true);
    try {
      const { data: daysData } = await supabase.from('camp_days').select('*').order('date');
      setCampDays(daysData || []);
      if (daysData && daysData.length > 0) {
        setSelectedDayId(paramDayId || daysData[0].id);
      }

      const { data: labsData } = await supabase.from('labs').select('*').order('name');
      setLabs(labsData || []);

      const { data: slotsData } = await supabase.from('time_slots').select('*').order('start_time');
      setTimeSlots(slotsData || []);

      const { data: sessionsData } = await supabase.from('lab_sessions').select('*');
      setLabSessions(sessionsData || []);

      const { data: instData } = await supabase
        .from('lab_instructors')
        .select('*, profiles(id, full_name)');
      setLabInstructors(instData || []);

      const { data: assignData } = await supabase
        .from('assignments')
        .select('*, students(id, first_name, last_name, age, organization_id, organizations(name))');
      setAssignments(assignData || []);

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
    const activeSessions = labSessions.filter(s => s.camp_day_id === selectedDayId);
    const activeLabIds = [...new Set(activeSessions.map(s => s.lab_id))];
    const educators = labInstructors
      .filter(li => activeLabIds.includes(li.lab_id))
      .map(li => li.educator_id);
    return [...new Set(educators)].length;
  }, [selectedDayId, labSessions, labInstructors]);

  const handleCellClick = (lab: any, slot: any, session: any) => {
    if (!session) return;
    const sessionInstructors = labInstructors.filter(li => li.lab_id === lab.id);
    const sessionAssignments = activeAssignments.filter(a => a.lab_session_id === session.id);
    const roster = sessionAssignments.map(a => a.students).filter(Boolean);

    setSelectedSessionInfo({
      lab,
      slot,
      session,
      instructors: sessionInstructors.map(si => si.profiles?.full_name).join(', ') || 'No educators assigned'
    });
    setSelectedSessionStudents(roster);
    setRosterModalOpen(true);
  };

  const handleOpenRosterSheet = () => {
    if (selectedSessionInfo) {
      setRosterModalOpen(false);
      navigate(`/educator/roster?lab=${selectedSessionInfo.lab.id}&day=${selectedDayId}&slot=${selectedSessionInfo.slot.id}`);
    }
  };

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
    { label: 'Campers Scheduled', value: activeStudentsCount, icon: <Users size={16} />, color: isDark ? 'text-indigo-400' : 'text-indigo-600' },
    { label: 'Active Labs', value: labs.length, icon: <Microscope size={16} />, color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
    { label: 'Educators on Duty', value: activeEducatorsCount, icon: <GraduationCap size={16} />, color: isDark ? 'text-amber-400' : 'text-amber-600' },
  ];

  const thCls = cn(
    "py-4 px-6 font-bold text-[11px] uppercase tracking-wider border-r last:border-r-0 overflow-hidden",
    isDark
      ? "bg-slate-900 text-slate-400 border-white/10 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
      : "bg-slate-50 text-slate-500 border-slate-200 shadow-[inset_0_-1px_0_0_#e2e8f0]"
  );
  const tdCls = cn("py-4 px-6 border-r last:border-r-0 overflow-hidden relative cursor-pointer", isDark ? "border-white/10" : "border-slate-200");
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

            {/* Day Selector */}
            <div className="w-full md:w-64">
              <Select value={selectedDayId} onValueChange={(val) => { setSelectedDayId(val); setSearchParams({ day: val, slot: paramSlotId }); }}>
                <SelectTrigger className={cn("rounded-xl font-bold h-12 transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-white" : "bg-white shadow-sm border-slate-200")}>
                  <SelectValue placeholder="Select Day" />
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

          {/* Table Matrix */}
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
                  {labs.map((lab, index) => (
                    <tr key={lab.id} className={trCls}>
                      <td className={cn(tdCls, "text-center font-bold opacity-40 cursor-default")}>
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className={cn(tdCls, "cursor-default")}>
                        <span className={cn("font-bold text-[13px] block", isDark ? "text-white" : "text-slate-900")}>
                          {lab.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                          Max Capacity: {lab.capacity_per_session} students
                        </span>
                      </td>
                      <td className={cn(tdCls, "text-center cursor-default")}>
                        <Badge variant="secondary" className={cn("font-bold text-[10px] py-0.5 px-2.5", isDark ? "bg-white/5 text-slate-300 border border-white/10" : "bg-slate-100 text-slate-600 border border-slate-200")}>
                          {lab.min_age} - {lab.max_age} yrs
                        </Badge>
                      </td>
                      {timeSlots.map(slot => {
                        const session = labSessions.find(s => s.lab_id === lab.id && s.time_slot_id === slot.id && s.camp_day_id === selectedDayId);
                        const sessionInstructors = labInstructors.filter(li => li.lab_id === lab.id);
                        const sessionAssignments = session ? activeAssignments.filter(a => a.lab_session_id === session.id) : [];
                        const studentCount = sessionAssignments.length;
                        const capacity = lab.capacity_per_session || 20;
                        const occupancyPct = (studentCount / capacity) * 100;
                        const isFocused = paramSlotId === slot.id;

                        return (
                          <td 
                            key={slot.id} 
                            onClick={() => handleCellClick(lab, slot, session)}
                            className={cn(
                              tdCls,
                              isFocused && (isDark ? "ring-2 ring-inset ring-sky-400/40 bg-sky-500/[0.02]" : "ring-2 ring-inset ring-sky-400/30 bg-sky-50/20")
                            )}
                          >
                            {session ? (
                              <div className="space-y-2">
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Roster View Dialog Modal */}
      <Dialog open={rosterModalOpen} onOpenChange={setRosterModalOpen}>
        <DialogContent showCloseButton={false} className={cn(
          "sm:max-w-[500px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl flex flex-col max-h-[85vh]",
          isDark ? "bg-[#020617] text-white shadow-black" : "bg-white text-slate-900"
        )}>
          <DialogHeader className={cn("p-6 border-b relative", isDark ? "border-white/5" : "border-slate-100")}>
            <DialogTitle className="text-lg font-black tracking-tight leading-none">
              {selectedSessionInfo?.lab.name}
            </DialogTitle>
            <DialogDescription className={cn("text-[11px] font-medium mt-1.5 leading-normal", isDark ? "text-slate-400" : "text-slate-500")}>
              {selectedSessionInfo?.slot.name} ({selectedSessionInfo?.slot.start_time.slice(0, 5)} - {selectedSessionInfo?.slot.end_time.slice(0, 5)}) &bull; Instructors: {selectedSessionInfo?.instructors}
            </DialogDescription>
            <button type="button" onClick={() => setRosterModalOpen(false)}
              className={cn("absolute top-5 right-6 size-9 rounded-xl flex items-center justify-center border transition-all duration-200 z-50",
                isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100")}>
              <X size={16} className="stroke-[2.5]" />
            </button>
          </DialogHeader>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enrolled campers ({selectedSessionStudents.length})</h4>
            <div className="space-y-2">
              {selectedSessionStudents.map((student, idx) => (
                <div key={student.id} className={cn(
                  "p-3 border rounded-xl flex items-center justify-between",
                  isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200/50"
                )}>
                  <div>
                    <span className="font-bold text-xs block">{student.first_name} {student.last_name}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">{student.organizations?.name}</span>
                  </div>
                  <Badge variant="outline" className={cn("font-bold text-[9px]", isDark ? "text-slate-300 border-white/10" : "text-slate-600 border-slate-200")}>
                    {student.age} yrs old
                  </Badge>
                </div>
              ))}
              {selectedSessionStudents.length === 0 && (
                <div className="text-center py-10 opacity-30 space-y-2">
                  <Users className="mx-auto text-slate-400" size={28} />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No students enrolled</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className={cn("p-6 border-t bg-transparent", isDark ? "border-white/5" : "border-slate-100")}>
            <Button variant="ghost" onClick={() => setRosterModalOpen(false)} className={cn("rounded-xl h-10 px-5 font-semibold text-xs", isDark ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-50")}>
              Close
            </Button>
            <Button onClick={handleOpenRosterSheet} disabled={selectedSessionStudents.length === 0} className={cn("rounded-xl h-10 px-5 font-semibold text-xs transition-all border shadow-sm", isDark ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white hover:bg-emerald-500")}>
              <BookOpen size={14} className="mr-1.5" />
              Open Roster Sheets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
