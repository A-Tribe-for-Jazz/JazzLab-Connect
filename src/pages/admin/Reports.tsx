import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useOutletContext, Link } from 'react-router-dom';
import { Calendar, Search, Filter, Printer, Building, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { cn, formatTimeString, hasAnyStudentData } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TimeSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface PlacementRow {
  studentId: string;
  studentName: string;
  studentAge: number;
  organizationId: string;
  organizationName: string;
  sessionAssignments: {
    [timeSlotId: string]: {
      labId: string;
      labName: string;
      pickNumber: number | null;
    };
  };
}

export default function AdminReports() {
  const { isDark }: any = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  
  // Metadata states
  const [campDays, setCampDays] = useState<{ id: string; date: string }[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [labs, setLabs] = useState<any[]>([]);

  // Filter states
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [activeOrgId, setActiveOrgId] = useState<string>('all');
  const [activeLabId, setActiveLabId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Day specific data states
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // 1. Fetch metadata on mount
  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoading(true);
        const [daysRes, orgsRes, slotsRes, labsRes] = await Promise.all([
          supabase.from('camp_days').select('*').order('date'),
          supabase.from('organizations').select('*').order('name'),
          supabase.from('time_slots').select('*').order('start_time'),
          supabase.from('labs').select('*').order('name')
        ]);

        if (daysRes.error) throw daysRes.error;
        if (orgsRes.error) throw orgsRes.error;
        if (slotsRes.error) throw slotsRes.error;
        if (labsRes.error) throw labsRes.error;

        setCampDays(daysRes.data || []);
        setOrganizations(orgsRes.data || []);
        setTimeSlots(slotsRes.data || []);
        setLabs(labsRes.data || []);

        if (daysRes.data && daysRes.data.length > 0) {
          setSelectedDayId(daysRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetadata();
  }, []);

  // 2. Fetch day-specific schedules when selectedDayId changes
  useEffect(() => {
    if (!selectedDayId) return;

    async function fetchScheduleDetails() {
      try {
        setLoadingSchedule(true);
        
        // Fetch students attending on this camp day
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('camp_day_id', selectedDayId);

        if (studentsError) throw studentsError;

        // Fetch lab sessions on this day
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('lab_sessions')
          .select('id, lab_id, time_slot_id')
          .eq('camp_day_id', selectedDayId);

        if (sessionsError) throw sessionsError;

        const sessionIds = (sessionsData || []).map(s => s.id);
        
        let assignmentsData: any[] = [];
        if (sessionIds.length > 0) {
          const { data, error } = await supabase
            .from('assignments')
            .select('id, student_id, lab_session_id, pick_number')
            .in('lab_session_id', sessionIds);
          if (error) throw error;
          assignmentsData = data || [];
        }

        setStudents(studentsData || []);
        setSessions(sessionsData || []);
        setAssignments(assignmentsData || []);
      } catch (err) {
        console.error('Failed to fetch schedule details:', err);
      } finally {
        setLoadingSchedule(false);
      }
    }

    fetchScheduleDetails();
  }, [selectedDayId]);

  // Derived: Placements structure
  const placements = useMemo<PlacementRow[]>(() => {
    if (!selectedDayId) return [];

    return students
      .filter(hasAnyStudentData)
      .map(student => {
        const studentAssignments = assignments.filter(a => a.student_id === student.id);
        const sessionMap: { [timeSlotId: string]: { labId: string; labName: string; pickNumber: number | null } } = {};
        
        studentAssignments.forEach(assign => {
          const session = sessions.find(s => s.id === assign.lab_session_id);
          if (session) {
            const labName = labs.find(l => l.id === session.lab_id)?.name || 'Unknown Lab';
            sessionMap[session.time_slot_id] = { 
              labId: session.lab_id,
              labName, 
              pickNumber: assign.pick_number 
            };
          }
        });

        const orgName = organizations.find(o => o.id === student.organization_id)?.name || 'Unknown Partner';

        return {
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          studentAge: student.age,
          organizationId: student.organization_id,
          organizationName: orgName,
          sessionAssignments: sessionMap
        };
      });
  }, [selectedDayId, students, assignments, sessions, labs, organizations]);

  // Derived: Filtered Placements
  const filteredPlacements = useMemo(() => {
    return placements.filter(row => {
      const matchesSearch = row.studentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrg = activeOrgId === 'all' ? true : row.organizationId === activeOrgId;
      const matchesLab = activeLabId === 'all'
        ? true
        : Object.values(row.sessionAssignments).some(assign => assign.labId === activeLabId);

      return matchesSearch && matchesOrg && matchesLab;
    });
  }, [placements, searchTerm, activeOrgId, activeLabId]);

  const isFinalized = useMemo(() => {
    return assignments.length > 0;
  }, [assignments]);

  const selectedDayObj = useMemo(() => {
    return campDays.find(d => d.id === selectedDayId);
  }, [campDays, selectedDayId]);

  const visitDate = selectedDayObj ? selectedDayObj.date : "";

  const getPrefLabel = (pickNumber: number | null) => {
    if (pickNumber === 1) return '1st Pref';
    if (pickNumber === 2) return '2nd Pref';
    if (pickNumber === 3) return '3rd Pref';
    if (pickNumber === 4) return '4th Pref';
    if (pickNumber === 5) return '5th Pref';
    if (pickNumber === 6) return '6th Pref';
    if (pickNumber === 7) return '7th Pref';
    if (pickNumber === 8) return '8th Pref';
    if (pickNumber === 9) return '9th Pref';
    if (pickNumber === 10) return '10th Pref';
    return 'Fallback';
  };

  const handlePrint = () => {
    window.print();
  };

  // Safe fallback sessions
  const activeSessions = useMemo(() => {
    if (timeSlots.length > 0) return timeSlots;
    return [
      { id: 'ds1', name: 'Session 1', start_time: '10:00:00', end_time: '10:50:00' },
      { id: 'ds2', name: 'Session 2', start_time: '11:00:00', end_time: '11:50:00' },
      { id: 'ds3', name: 'Session 3', start_time: '12:30:00', end_time: '13:20:00' }
    ];
  }, [timeSlots]);

  if (loading) {
    return (
      <div className={cn(
        "h-[calc(100dvh-5rem)] flex flex-col items-center justify-center space-y-4", 
        isDark ? "bg-black text-white" : "bg-white text-slate-900"
      )}>
        <div className={cn(
          "size-12 border-4 rounded-full animate-spin", 
          isDark ? "border-white/10 border-t-white" : "border-slate-200 border-t-slate-900"
        )} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading master schedule data...</p>
      </div>
    );
  }

  const s1 = activeSessions[0];
  const s2 = activeSessions[1];
  const s3 = activeSessions[2];

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-colors duration-700 overflow-hidden flex flex-col",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      {/* Main Grid Section */}
      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 min-h-0 flex flex-col pt-0 pb-0">
          <div className={cn(
            "rounded-[1.25rem] border overflow-hidden relative flex flex-col flex-1 min-h-0",
            isDark ? "border-white/10 bg-[#020617] shadow-2xl shadow-black/40" : "border-slate-200 bg-white shadow-xl shadow-slate-200/40"
          )}>
            {/* Unified High-Density Toolbar */}
            <div className={cn(
              "p-3 md:p-4 border-b shrink-0",
              isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/30"
            )}>
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 w-full">
                {/* Left: Search */}
                <div className="relative flex-1 max-w-xs w-full group/search">
                  <Search
                    className={cn(
                      "absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 z-10",
                      isDark
                        ? "text-sky-700 group-hover/search:text-sky-400 group-focus-within/search:text-sky-400"
                        : "text-sky-300 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600"
                    )}
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      "pl-16 pr-5 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-semibold outline-none w-full",
                      isDark
                        ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                        : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                    )}
                  />
                </div>


                {/* Right: Selectors & Print Controls */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 self-stretch xl:self-auto justify-start xl:justify-end">
                  {/* Camp Day Selector */}
                  <Select value={selectedDayId} onValueChange={(val) => setSelectedDayId(val || '')}>
                    <SelectTrigger className={cn(
                      "h-10 w-40 md:w-44 rounded-xl border px-4 font-semibold text-[13px] transition-all duration-300 outline-none group/filter flex items-center justify-between shadow-sm shrink-0",
                      "[&_svg:last-child]:transition-all [&_svg:last-child]:duration-300 [&_svg:last-child]:opacity-40 group-hover/filter:[&_svg:last-child]:opacity-85 group-hover/filter:[&_svg:last-child]:translate-y-0.5",
                      isDark
                        ? "bg-slate-900/60 border-white/10 text-white hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-[0_0_15px_rgba(14,165,233,0.1)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-400"
                        : "bg-white border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-slate-50/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-500"
                    )}>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className={cn(
                          "transition-colors duration-300 shrink-0",
                          isDark ? "text-sky-500/70" : "text-sky-500/70"
                        )} />
                        <span className="truncate">
                          {selectedDayObj
                            ? new Date(selectedDayObj.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Select Day'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className={cn(
                      "rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-44 border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300",
                      isDark ? "bg-slate-950/90 border-white/10 text-white shadow-black" : "bg-white/95 border-slate-100 text-slate-900"
                    )}>
                      {campDays.map(day => (
                        <SelectItem key={day.id} value={day.id} className={cn(
                          "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5",
                          isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                        )}>
                          {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Organization Selector */}
                  <Select value={activeOrgId} onValueChange={(val) => setActiveOrgId(val || 'all')}>
                    <SelectTrigger className={cn(
                      "h-10 w-40 md:w-48 rounded-xl border px-4 font-semibold text-[13px] transition-all duration-300 outline-none group/filter flex items-center justify-between shadow-sm shrink-0",
                      "[&_svg:last-child]:transition-all [&_svg:last-child]:duration-300 [&_svg:last-child]:opacity-40 group-hover/filter:[&_svg:last-child]:opacity-85 group-hover/filter:[&_svg:last-child]:translate-y-0.5",
                      isDark
                        ? "bg-slate-900/60 border-white/10 text-white hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-[0_0_15px_rgba(14,165,233,0.1)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-400"
                        : "bg-white border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-slate-50/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-500"
                    )}>
                      <div className="flex items-center gap-2">
                        <Building size={14} className={cn(
                          "transition-colors duration-300 shrink-0",
                          isDark ? "text-sky-500/70" : "text-sky-500/70"
                        )} />
                        <span className="truncate">
                          {activeOrgId === 'all' ? 'All Orgs' : (organizations.find(o => o.id === activeOrgId)?.name || 'All Orgs')}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className={cn(
                      "rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-48 border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300",
                      isDark ? "bg-slate-950/90 border-white/10 text-white shadow-black" : "bg-white/95 border-slate-100 text-slate-900"
                    )}>
                      <SelectItem value="all" className={cn(
                        "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5",
                        isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                      )}>All Organizations</SelectItem>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id} className={cn(
                          "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5",
                          isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                        )}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Lab Selector */}
                  <Select value={activeLabId} onValueChange={(val) => setActiveLabId(val || 'all')}>
                    <SelectTrigger className={cn(
                      "h-10 w-40 md:w-44 rounded-xl border px-4 font-semibold text-[13px] transition-all duration-300 outline-none group/filter flex items-center justify-between shadow-sm shrink-0",
                      "[&_svg:last-child]:transition-all [&_svg:last-child]:duration-300 [&_svg:last-child]:opacity-40 group-hover/filter:[&_svg:last-child]:opacity-85 group-hover/filter:[&_svg:last-child]:translate-y-0.5",
                      isDark
                        ? "bg-slate-900/60 border-white/10 text-white hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-[0_0_15px_rgba(14,165,233,0.1)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-400"
                        : "bg-white border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-slate-50/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-500"
                    )}>
                      <div className="flex items-center gap-2">
                        <Filter size={14} className={cn(
                          "transition-colors duration-300 shrink-0",
                          isDark ? "text-sky-500/70" : "text-sky-500/70"
                        )} />
                        <span className="truncate">
                          {activeLabId === 'all' ? 'All Labs' : (labs.find(l => l.id === activeLabId)?.name || 'All Labs')}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className={cn(
                      "rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-44 border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300",
                      isDark ? "bg-slate-950/90 border-white/10 text-white shadow-black" : "bg-white/95 border-slate-100 text-slate-900"
                    )}>
                      <SelectItem value="all" className={cn(
                        "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5",
                        isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                      )}>All Labs</SelectItem>
                      {labs.map(lab => (
                        <SelectItem key={lab.id} value={lab.id} className={cn(
                          "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5",
                          isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                        )}>
                          {lab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Print Button */}
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className={cn(
                      "h-10 rounded-xl px-4 font-semibold text-[13px] transition-all duration-300 border shadow-sm flex items-center gap-2 shrink-0",
                      isDark
                        ? "bg-slate-900 border-white/10 text-white hover:bg-slate-800 hover:border-white/20"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    <Printer size={15} />
                    <span>Print Roster</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Printable Header Context */}
            <div className="hidden print:block mb-8">
              <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Jazz Lab Master Schedule</h1>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                Camp Session Date: {selectedDayObj ? new Date(selectedDayObj.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unassigned Day'}
              </p>
              {activeOrgId !== 'all' && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Organization: {organizations.find(o => o.id === activeOrgId)?.name}
                </p>
              )}
            </div>

            {/* Non-finalized Alert Banner */}
            {!isFinalized && !loadingSchedule && (
              <div className={cn(
                "mx-6 mt-6 mb-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 print:hidden",
                isDark ? "bg-amber-500/10 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"
              )}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="shrink-0 size-5 text-amber-500" />
                  <div className="text-xs font-semibold">
                    <p className="font-bold text-sm">Schedule Not Finalized</p>
                    <p className={isDark ? "text-slate-400 mt-0.5" : "text-slate-600 mt-0.5"}>
                      Assignments have not been generated for this camp day yet. All student slots will show as "Unassigned".
                    </p>
                  </div>
                </div>
                <Link to="/admin/assignments">
                  <Button size="sm" className={cn(
                    "rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors",
                    isDark ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-amber-600 text-white hover:bg-amber-500"
                  )}>
                    <span>Go to Assignments</span>
                    <ArrowRight size={13} />
                  </Button>
                </Link>
              </div>
            )}

            {/* Roster Data Table */}
            <div className={cn(
              "flex-1 overflow-auto min-h-0 border-r",
              isDark ? "border-white/20" : "border-slate-300"
            )}
              style={{ contain: "strict" }}
            >
              {loadingSchedule ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className={cn(
                    "size-8 border-4 rounded-full animate-spin",
                    isDark ? "border-white/10 border-t-white" : "border-slate-200 border-t-slate-900"
                  )} />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading schedules for day...</p>
                </div>
              ) : (
                <Table className="border-collapse" wrapperClassName="overflow-visible" style={{ width: "100%" }}>
                  <TableHeader className="sticky top-0 z-40">
                    <TableRow className={cn(
                      "border-b hover:bg-transparent",
                      isDark ? "border-white/10" : "border-slate-300"
                    )}>
                      <TableHead className={cn(
                        "font-semibold text-[13px] text-center w-[50px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-2",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>#</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Organization/Camp</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[180px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Student FULL NAME</TableHead>
                      
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Assigned Lab 1</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[100px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Lab 1 Pref</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[120px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Lab 1 Time Slot</TableHead>
                      
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Assigned Lab 2</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[100px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Lab 2 Pref</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[120px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Lab 2 Time Slot</TableHead>
                      
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Assigned Lab 3</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[100px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Lab 3 Pref</TableHead>
                      <TableHead className={cn(
                        "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[120px]",
                        isDark
                          ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]"
                          : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Lab 3 Time Slot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlacements.map((row, idx) => {
                      const a1 = s1 ? row.sessionAssignments[s1.id] : null;
                      const a2 = s2 ? row.sessionAssignments[s2.id] : null;
                      const a3 = s3 ? row.sessionAssignments[s3.id] : null;

                      return (
                        <tr
                          key={row.studentId}
                          className={cn(
                            "h-10 border-b group",
                            isDark
                              ? "hover:bg-white/[0.02] data-[state=selected]:bg-white/[0.05] border-white/10"
                              : "hover:bg-slate-50/50 data-[state=selected]:bg-slate-50/70 border-slate-200",
                            idx % 2 === 1 && (isDark ? "bg-white/[0.015]" : "bg-slate-50/40")
                          )}
                          style={{ height: 40 }}
                        >
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center justify-center w-[50px] h-10">
                              <span className={cn(
                                "font-black text-[11px] tracking-tighter opacity-30",
                                isDark ? "text-slate-400" : "text-slate-600"
                              )}>{String(idx + 1).padStart(2, '0')}</span>
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate" title={row.organizationName}>
                              {row.organizationName}
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                              {row.studentName}
                            </div>
                          </td>

                          {/* Rotation 1 */}
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                              {a1 ? a1.labName : <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4">
                              {a1 ? (
                                <span className={cn(
                                  "text-[10px] font-bold tracking-wider",
                                  a1.pickNumber === 1 && (isDark ? "text-emerald-400" : "text-emerald-700"),
                                  (a1.pickNumber === 2 || a1.pickNumber === 3) && (isDark ? "text-blue-400" : "text-blue-700"),
                                  (a1.pickNumber === 4 || a1.pickNumber === 5 || a1.pickNumber === 6 || a1.pickNumber === 7) && (isDark ? "text-amber-400" : "text-amber-700"),
                                  ((a1.pickNumber !== null && a1.pickNumber > 7) || a1.pickNumber === null) && (isDark ? "text-slate-400" : "text-slate-500")
                                )}>
                                  {getPrefLabel(a1.pickNumber)}
                                </span>
                              ) : "—"}
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-xs text-slate-500 truncate">
                              {s1 ? `${formatTimeString(s1.start_time)} - ${formatTimeString(s1.end_time)}` : "—"}
                            </div>
                          </td>

                          {/* Rotation 2 */}
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                              {a2 ? a2.labName : <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4">
                              {a2 ? (
                                <span className={cn(
                                  "text-[10px] font-bold tracking-wider",
                                  a2.pickNumber === 1 && (isDark ? "text-emerald-400" : "text-emerald-700"),
                                  (a2.pickNumber === 2 || a2.pickNumber === 3) && (isDark ? "text-blue-400" : "text-blue-700"),
                                  (a2.pickNumber === 4 || a2.pickNumber === 5 || a2.pickNumber === 6 || a2.pickNumber === 7) && (isDark ? "text-amber-400" : "text-amber-700"),
                                  ((a2.pickNumber !== null && a2.pickNumber > 7) || a2.pickNumber === null) && (isDark ? "text-slate-400" : "text-slate-500")
                                )}>
                                  {getPrefLabel(a2.pickNumber)}
                                </span>
                              ) : "—"}
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-xs text-slate-500 truncate">
                              {s2 ? `${formatTimeString(s2.start_time)} - ${formatTimeString(s2.end_time)}` : "—"}
                            </div>
                          </td>

                          {/* Rotation 3 */}
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                              {a3 ? a3.labName : <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4">
                              {a3 ? (
                                <span className={cn(
                                  "text-[10px] font-bold tracking-wider",
                                  a3.pickNumber === 1 && (isDark ? "text-emerald-400" : "text-emerald-700"),
                                  (a3.pickNumber === 2 || a3.pickNumber === 3) && (isDark ? "text-blue-400" : "text-blue-700"),
                                  (a3.pickNumber === 4 || a3.pickNumber === 5 || a3.pickNumber === 6 || a3.pickNumber === 7) && (isDark ? "text-amber-400" : "text-amber-700"),
                                  ((a3.pickNumber !== null && a3.pickNumber > 7) || a3.pickNumber === null) && (isDark ? "text-slate-400" : "text-slate-500")
                                )}>
                                  {getPrefLabel(a3.pickNumber)}
                                </span>
                              ) : "—"}
                            </div>
                          </td>
                          <td className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            isDark ? "border-white/10" : "border-slate-200"
                          )}>
                            <div className="flex items-center h-10 px-4 text-xs text-slate-500 truncate">
                              {s3 ? `${formatTimeString(s3.start_time)} - ${formatTimeString(s3.end_time)}` : "—"}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredPlacements.length === 0 && (
                      <tr className="hover:bg-transparent">
                        <td colSpan={12} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className={cn("p-4 rounded-[1.5rem]", isDark ? "bg-white/5" : "bg-slate-50")}>
                              <Search size={32} className="text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-bold italic text-sm">No matching student assignments found.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
