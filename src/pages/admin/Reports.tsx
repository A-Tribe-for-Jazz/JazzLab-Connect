import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useOutletContext, Link } from 'react-router-dom';
import { Calendar, Search, Filter, Printer, Building, AlertTriangle, ArrowRight, Info, Eye, ChevronDown } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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

export function getLabRoom(labName: string): string {
  if (!labName) return '';
  const nameLower = labName.toLowerCase();
  if (nameLower.includes('mixed media')) return 'Room 106';
  if (nameLower.includes('producer')) return 'Room 108';
  if (nameLower.includes('afro-futuristic') || nameLower.includes('afrofuturistic')) return 'Room 110';
  if (nameLower.includes('pixel beat') || nameLower.includes('pixelbeats')) return 'Room 112';
  if (nameLower.includes('virtual reality') || nameLower.includes('virtureality') || nameLower.includes('vr')) return 'Room 124';
  if (nameLower.includes('reverb')) return 'Room 120';
  if (nameLower.includes('remix')) return 'Room 122';
  if (nameLower.includes('conga')) return 'Room 125';
  if (nameLower.includes('ecojazz') || nameLower.includes('eco jazz') || nameLower.includes('eco-jazz')) return 'Room 128';
  if (nameLower.includes('jazzfablab') || nameLower.includes('jazz fab') || nameLower.includes('jazzfab') || nameLower.includes('fab lab') || nameLower.includes('fablab')) return 'Room 130';
  return '';
}

const HIDE_AGE_STUDENTS = new Set([
  'mahariallen',
  'lunabellabattise',
  'janoriscage',
  'makariclinton',
  'braidencoran',
  'amiyahcox',
  'meskerengiday',
  'gregoryharris',
  'kamaiyajohnson',
  'willowjones',
  'devenkingfieldsjr',
  'kamayahmalcom',
  'sirlamarmccloud',
  'kaedenmoss',
  'kameronparkermoore',
  'romanmyers',
  'haydenroberts',
  'erykrasheedjones',
  'messiahsamuels',
  'sanaasharif',
  'brailynnwhite',
  'mikalsmith',
  'braxtonsmith',
  'donavonwilliams',
  'karsenwhite'
]);

function shouldHideAge(studentName: string, organizationName: string): boolean {
  if (!studentName || !organizationName) return false;
  if (organizationName !== 'YWCA Safe & Sound') return false;
  const normalized = studentName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return HIDE_AGE_STUDENTS.has(normalized);
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
  const [activeView, setActiveView] = useState<'master' | 'labs' | 'orgs' | 'slips'>('master');

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

  const chunkedSlips = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < filteredPlacements.length; i += 6) {
      chunks.push(filteredPlacements.slice(i, i + 6));
    }
    return chunks;
  }, [filteredPlacements]);

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
    const originalTitle = document.title;
    if (activeView === 'labs') {
      document.title = 'Lab Assignments';
    } else if (activeView === 'orgs') {
      document.title = 'Schedule by Org';
    } else if (activeView === 'slips') {
      document.title = 'Student Slips';
    } else {
      document.title = 'Master Camp Schedule';
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
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
                {/* Left: Search & View Selector */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative max-w-xs w-full group/search">
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

                  {/* View Options Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 rounded-xl px-4 font-semibold text-[13px] transition-all duration-300 border shadow-sm flex items-center gap-2",
                          isDark
                            ? "bg-slate-900 border-white/10 text-white hover:bg-slate-800 hover:border-white/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        )}
                      >
                        <Eye size={15} className="text-sky-500" />
                        <span>
                          {activeView === 'master' && 'Master Roster'}
                          {activeView === 'labs' && 'Lab Assignments View'}
                          {activeView === 'orgs' && 'Schedule by Org'}
                          {activeView === 'slips' && 'Student Slips'}
                        </span>
                        <ChevronDown size={14} className="opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={cn(
                      "rounded-xl border p-1 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 z-50",
                      isDark ? "bg-slate-900 border-white/10 text-white shadow-black" : "bg-white border-slate-100 text-slate-900"
                    )}>
                      <DropdownMenuItem
                        onClick={() => setActiveView('master')}
                        className={cn("font-semibold text-[13px] py-2 px-3 rounded-lg cursor-pointer", isDark ? "focus:bg-white/5" : "focus:bg-slate-50")}
                      >
                        Master Roster
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setActiveView('labs')}
                        className={cn("font-semibold text-[13px] py-2 px-3 rounded-lg cursor-pointer", isDark ? "focus:bg-white/5" : "focus:bg-slate-50")}
                      >
                        Lab Assignments View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setActiveView('orgs')}
                        className={cn("font-semibold text-[13px] py-2 px-3 rounded-lg cursor-pointer", isDark ? "focus:bg-white/5" : "focus:bg-slate-50")}
                      >
                        Schedule by Org
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setActiveView('slips')}
                        className={cn("font-semibold text-[13px] py-2 px-3 rounded-lg cursor-pointer", isDark ? "focus:bg-white/5" : "focus:bg-slate-50")}
                      >
                        Student Slips
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                            : 'Select Camp Day'}
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
                    <span>Print Schedule</span>
                  </Button>
                </div>
              </div>
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
                    <p className="font-bold text-sm">Schedule Not Finalized / No Active Placements</p>
                    <p className={isDark ? "text-slate-400 mt-0.5" : "text-slate-600 mt-0.5"}>
                      Please select another Camp Day from the date picker above, or go to Assignments to run the solver for this day.
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
              ) : activeView === 'master' ? (
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
              ) : activeView === 'labs' ? (
                /* Lab Assignments View */
                <div className="p-6 space-y-8 select-none">
                  {labs.map(lab => {
                    return activeSessions.map(slot => {
                      const sessionStudents = filteredPlacements.filter(p => p.sessionAssignments[slot.id]?.labId === lab.id);
                      if (sessionStudents.length === 0) return null;

                      return (
                        <div key={`${lab.id}-${slot.id}`} className={cn(
                          "rounded-xl border p-4 shadow-sm",
                          isDark ? "bg-[#0f172a]/55 border-white/10" : "bg-slate-50/60 border-slate-200"
                        )}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 mb-3 gap-2">
                            <h3 className="font-extrabold text-sm text-sky-500">{lab.name}</h3>
                            <span className="text-xs font-bold text-slate-400">{slot.name} ({formatTimeString(slot.start_time)} - {formatTimeString(slot.end_time)})</span>
                            <span className="text-xs font-semibold text-slate-400">Date: {visitDate}</span>
                          </div>
                          <Table className="border-collapse" style={{ width: "100%" }}>
                            <TableHeader>
                              <TableRow className={isDark ? "border-white/10" : "border-slate-200"}>
                                <TableHead className="w-[50px] font-bold text-xs">S.No</TableHead>
                                <TableHead className="font-bold text-xs">Student FULL NAME</TableHead>
                                <TableHead className="font-bold text-xs">Organization/Camp</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sessionStudents.map((stud, sidx) => (
                                <TableRow key={stud.studentId} className={isDark ? "border-white/5" : "border-slate-100"}>
                                  <TableCell className="text-xs font-bold">{String(sidx + 1).padStart(2, '0')}</TableCell>
                                  <TableCell className="text-xs font-semibold">{stud.studentName}</TableCell>
                                  <TableCell className="text-xs font-semibold">{stud.organizationName}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    });
                  })}
                </div>
              ) : activeView === 'orgs' ? (
                /* Schedule by Org */
                <div className="p-6 space-y-8 select-none">
                  {organizations.map(org => {
                    const orgStudents = filteredPlacements.filter(p => p.organizationId === org.id);
                    if (orgStudents.length === 0) return null;

                    return (
                      <div key={org.id} className={cn(
                        "rounded-xl border p-4 shadow-sm",
                        isDark ? "bg-[#0f172a]/55 border-white/10" : "bg-slate-50/60 border-slate-200"
                      )}>
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                          <h3 className="font-extrabold text-sm text-indigo-400">{org.name}</h3>
                          <span className="text-xs font-semibold text-slate-400">Date: {visitDate}</span>
                        </div>
                        <Table className="border-collapse" style={{ width: "100%" }}>
                          <TableHeader>
                            <TableRow className={isDark ? "border-white/10" : "border-slate-200"}>
                              <TableHead className="w-[50px] font-bold text-xs">S.No</TableHead>
                              <TableHead className="font-bold text-xs">Student FULL NAME</TableHead>
                              <TableHead className="font-bold text-xs">Assigned Lab 1</TableHead>
                              <TableHead className="font-bold text-xs">Lab 1 Time Slot</TableHead>
                              <TableHead className="font-bold text-xs">Assigned Lab 2</TableHead>
                              <TableHead className="font-bold text-xs">Lab 2 Time Slot</TableHead>
                              <TableHead className="font-bold text-xs">Assigned Lab 3</TableHead>
                              <TableHead className="font-bold text-xs">Lab 3 Time Slot</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orgStudents.map((stud, oidx) => {
                              const a1 = s1 ? stud.sessionAssignments[s1.id] : null;
                              const a2 = s2 ? stud.sessionAssignments[s2.id] : null;
                              const a3 = s3 ? stud.sessionAssignments[s3.id] : null;

                              return (
                                <TableRow key={stud.studentId} className={isDark ? "border-white/5" : "border-slate-100"}>
                                  <TableCell className="text-xs font-bold">{String(oidx + 1).padStart(2, '0')}</TableCell>
                                  <TableCell className="text-xs font-bold">{stud.studentName}</TableCell>
                                  <TableCell className="text-xs">{a1 ? a1.labName : <span className="text-slate-500 italic">Unassigned</span>}</TableCell>
                                  <TableCell className="text-xs text-slate-400">{s1 ? `${formatTimeString(s1.start_time)} - ${formatTimeString(s1.end_time)}` : "—"}</TableCell>
                                  <TableCell className="text-xs">{a2 ? a2.labName : <span className="text-slate-500 italic">Unassigned</span>}</TableCell>
                                  <TableCell className="text-xs text-slate-400">{s2 ? `${formatTimeString(s2.start_time)} - ${formatTimeString(s2.end_time)}` : "—"}</TableCell>
                                  <TableCell className="text-xs">{a3 ? a3.labName : <span className="text-slate-500 italic">Unassigned</span>}</TableCell>
                                  <TableCell className="text-xs text-slate-400">{s3 ? `${formatTimeString(s3.start_time)} - ${formatTimeString(s3.end_time)}` : "—"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Student Slips View */
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none print:hidden">
                  {filteredPlacements.map(stud => {
                    const a1 = s1 ? stud.sessionAssignments[s1.id] : null;
                    const a2 = s2 ? stud.sessionAssignments[s2.id] : null;
                    const a3 = s3 ? stud.sessionAssignments[s3.id] : null;

                    return (
                      <div key={stud.studentId} className={cn(
                        "rounded-2xl border p-5 flex flex-col justify-between shadow-md",
                        isDark ? "bg-[#0b0f19] border-white/10" : "bg-white border-slate-200"
                      )} style={{ minHeight: "220px" }}>
                        <div>
                          <div className="flex justify-between items-baseline gap-2">
                            <h3 className="font-black text-xl tracking-tight text-slate-900 dark:text-white truncate" title={stud.studentName}>{stud.studentName}</h3>
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">Age: {shouldHideAge(stud.studentName, stud.organizationName) ? "___" : stud.studentAge}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{stud.organizationName}</p>
                          <div className={cn("h-px my-3", isDark ? "bg-white/5" : "bg-slate-100")} />
                          <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-2">Your Labs:</p>
                          <div className="space-y-3">
                            <div className="flex justify-between items-start text-xs">
                              <span className="font-bold text-slate-500 shrink-0 mr-3 text-xs md:text-sm pt-0.5">10:00 - 10:50</span>
                              <div className="text-right">
                                <div className="font-black text-slate-900 dark:text-slate-100 text-xs md:text-sm">{a1 ? a1.labName : 'Unassigned'}</div>
                                {a1 && getLabRoom(a1.labName) && (
                                  <div className="text-xs md:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{getLabRoom(a1.labName)}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-start text-xs">
                              <span className="font-bold text-slate-500 shrink-0 mr-3 text-xs md:text-sm pt-0.5">11:00 - 11:50</span>
                              <div className="text-right">
                                <div className="font-black text-slate-900 dark:text-slate-100 text-xs md:text-sm">{a2 ? a2.labName : 'Unassigned'}</div>
                                {a2 && getLabRoom(a2.labName) && (
                                  <div className="text-xs md:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{getLabRoom(a2.labName)}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-start text-xs">
                              <span className="font-bold text-slate-500 shrink-0 mr-3 text-xs md:text-sm pt-0.5">12:30 - 01:20</span>
                              <div className="text-right">
                                <div className="font-black text-slate-900 dark:text-slate-100 text-xs md:text-sm">{a3 ? a3.labName : 'Unassigned'}</div>
                                {a3 && getLabRoom(a3.labName) && (
                                  <div className="text-xs md:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{getLabRoom(a3.labName)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Section (Only visible during printing) */}
      <div id="print-section" className="hidden">
        <style>{`
          @media print {
            @page {
              size: ${activeView === 'slips' ? 'portrait' : 'landscape'};
              margin: ${activeView === 'slips' ? '6mm' : '12mm'};
            }
            
            /* Reset body styles for print */
            html, body, #root, [class*="layout"], [class*="Layout"] {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: auto !important;
            }

            /* Hide everything in the document body */
            body * {
              visibility: hidden;
              background: transparent !important;
            }

            /* Enable visibility only for the print section and its children */
            #print-section, #print-section * {
              visibility: visible;
            }

            #print-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
              background: white !important;
              color: black !important;
            }

            /* Styled print table */
            #print-section table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 15px !important;
              margin-bottom: 25px !important;
              font-family: system-ui, -apple-system, sans-serif !important;
              font-size: 11px !important;
              color: #0f172a !important;
              background: white !important;
            }

            #print-section th {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              border: 1.5px solid #cbd5e1 !important;
              padding: 8px 10px !important;
              text-align: left !important;
            }

            #print-section td {
              border: 1px solid #cbd5e1 !important;
              padding: 6px 10px !important;
              color: #334155 !important;
              background: white !important;
            }

            #print-section tr:nth-child(even) {
              background-color: #f8fafc !important;
            }

            #print-section tr {
              page-break-inside: avoid !important;
            }

            #print-section .pref-badge {
              font-weight: 700 !important;
              font-size: 8px !important;
              color: #64748b !important;
              text-transform: uppercase !important;
              margin-left: 4px !important;
            }

            #print-section .unassigned-text {
              font-style: italic !important;
              color: #94a3b8 !important;
              font-weight: 500 !important;
            }

            /* Lab Assignments View custom print sizes */
            .print-lab-session-block h2 {
              font-size: 22px !important;
              font-weight: 900 !important;
            }

            .print-lab-session-block .text-sm {
              font-size: 14px !important;
              font-weight: 700 !important;
            }

            .print-lab-session-block table {
              font-size: 13px !important;
            }

            .print-lab-session-block th {
              font-size: 13px !important;
              padding: 8px 12px !important;
            }

            .print-lab-session-block td {
              font-size: 13px !important;
              padding: 7px 12px !important;
            }

            /* Slips styling */
            .slips-print-container {
              width: 100% !important;
              background: white !important;
              display: block !important;
            }

            .slips-page-sheet {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              grid-template-rows: repeat(3, 1fr) !important;
              gap: 10px !important;
              width: 100% !important;
              height: 248mm !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
              padding: 2mm !important;
              background: white !important;
            }

            .slip-card {
              border: 1px dashed #94a3b8 !important;
              border-radius: 8px !important;
              padding: 12px !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              background: white !important;
              height: 100% !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .slip-card-header {
              margin-bottom: 4px !important;
            }

            .slip-student-name {
              font-size: 20px !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              line-height: 1.2 !important;
              margin-bottom: 2px !important;
            }

            .slip-org-name {
              font-size: 11px !important;
              font-weight: 700 !important;
              color: #475569 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
            }

            .slip-age {
              font-size: 11px !important;
              font-weight: 700 !important;
              color: #64748b !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              margin-top: 2px !important;
            }

             .slip-your-labs-title {
              font-size: 10px !important;
              font-weight: 800 !important;
              color: #0284c7 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.1em !important;
              margin-top: 4px !important;
              margin-bottom: 2px !important;
            }

            .slip-labs-table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
            }

            .slip-labs-table td {
              border: none !important;
              padding: 2px 0 !important;
              background: transparent !important;
            }

            .slip-time-col {
              font-size: 12px !important;
              font-weight: 700 !important;
              color: #475569 !important;
              width: 90px !important;
              white-space: nowrap !important;
              text-align: left !important;
              vertical-align: top !important;
              padding-top: 2px !important;
            }

            .slip-lab-col {
              text-align: right !important;
              vertical-align: top !important;
              padding-top: 2px !important;
            }

            .slip-lab-name {
              font-size: 13px !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              text-align: right !important;
            }

            .slip-lab-room {
              font-size: 12px !important;
              font-weight: 600 !important;
              color: #64748b !important;
              text-align: right !important;
              margin-top: 1px !important;
            }
          }
        `}</style>

        {activeView === 'master' && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between border-b-2 border-slate-300 pb-4">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Master Camp Schedule</h1>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Student Placements</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-black text-slate-900">
                    Date: {selectedDayObj ? new Date(selectedDayObj.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unassigned Day'}
                  </p>
                  {activeOrgId !== 'all' && (
                    <p className="text-xs font-bold text-slate-600 mt-1">
                      Partner: {organizations.find(o => o.id === activeOrgId)?.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '22%' }}>Student Name</th>
                  <th style={{ width: '20%' }}>Partner Organization</th>
                  <th>Session 1 ({s1 ? `${formatTimeString(s1.start_time)} - ${formatTimeString(s1.end_time)}` : "10:00 - 10:50"})</th>
                  <th>Session 2 ({s2 ? `${formatTimeString(s2.start_time)} - ${formatTimeString(s2.end_time)}` : "11:00 - 11:50"})</th>
                  <th>Session 3 ({s3 ? `${formatTimeString(s3.start_time)} - ${formatTimeString(s3.end_time)}` : "12:30 - 13:20"})</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlacements.map((row, idx) => {
                  const a1 = s1 ? row.sessionAssignments[s1.id] : null;
                  const a2 = s2 ? row.sessionAssignments[s2.id] : null;
                  const a3 = s3 ? row.sessionAssignments[s3.id] : null;

                  return (
                    <tr key={row.studentId}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{String(idx + 1).padStart(2, '0')}</td>
                      <td style={{ fontWeight: '700', color: '#0f172a' }}>{row.studentName}</td>
                      <td>{row.organizationName}</td>
                      <td>
                        {a1 ? (
                          <div>
                            <span style={{ fontWeight: '600' }}>{a1.labName}</span>
                            <span className="pref-badge">({getPrefLabel(a1.pickNumber)})</span>
                          </div>
                        ) : (
                          <span className="unassigned-text">Unassigned</span>
                        )}
                      </td>
                      <td>
                        {a2 ? (
                          <div>
                            <span style={{ fontWeight: '600' }}>{a2.labName}</span>
                            <span className="pref-badge">({getPrefLabel(a2.pickNumber)})</span>
                          </div>
                        ) : (
                          <span className="unassigned-text">Unassigned</span>
                        )}
                      </td>
                      <td>
                        {a3 ? (
                          <div>
                            <span style={{ fontWeight: '600' }}>{a3.labName}</span>
                            <span className="pref-badge">({getPrefLabel(a3.pickNumber)})</span>
                          </div>
                        ) : (
                          <span className="unassigned-text">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {activeView === 'labs' && (
          <div className="space-y-8">
            {labs.map(lab => {
              return activeSessions.map(slot => {
                const sessionStudents = filteredPlacements.filter(p => p.sessionAssignments[slot.id]?.labId === lab.id);
                if (sessionStudents.length === 0) return null;

                return (
                  <div key={`${lab.id}-${slot.id}`} className="print-lab-session-block" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '30px' }}>
                    <div className="flex items-center justify-between border-b-2 border-slate-300 pb-2 mb-3">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{lab.name}</h2>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-slate-700">
                          {slot.name} ({formatTimeString(slot.start_time)} - {formatTimeString(slot.end_time)})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-700">Date: {selectedDayObj ? new Date(selectedDayObj.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                      </div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                          <th>Student FULL NAME</th>
                          <th style={{ width: '40%' }}>Organization/Camp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionStudents.map((stud, sidx) => (
                          <tr key={stud.studentId}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{String(sidx + 1).padStart(2, '0')}</td>
                            <td style={{ fontWeight: '700', color: '#0f172a' }}>{stud.studentName}</td>
                            <td>{stud.organizationName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              });
            })}
          </div>
        )}

        {activeView === 'orgs' && (
          <div className="space-y-8">
            {organizations.map(org => {
              const orgStudents = filteredPlacements.filter(p => p.organizationId === org.id);
              if (orgStudents.length === 0) return null;

              return (
                <div key={org.id} className="print-org-block" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '30px' }}>
                  <div className="flex items-center justify-between border-b-2 border-slate-300 pb-2 mb-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">{org.name}</h2>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700">Date: {selectedDayObj ? new Date(selectedDayObj.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                        <th>Student FULL NAME</th>
                        <th>Assigned Lab 1</th>
                        <th>Lab 1 Time Slot</th>
                        <th>Assigned Lab 2</th>
                        <th>Lab 2 Time Slot</th>
                        <th>Assigned Lab 3</th>
                        <th>Lab 3 Time Slot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgStudents.map((stud, oidx) => {
                        const a1 = s1 ? stud.sessionAssignments[s1.id] : null;
                        const a2 = s2 ? stud.sessionAssignments[s2.id] : null;
                        const a3 = s3 ? stud.sessionAssignments[s3.id] : null;

                        return (
                          <tr key={stud.studentId}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{String(oidx + 1).padStart(2, '0')}</td>
                            <td style={{ fontWeight: '700', color: '#0f172a' }}>{stud.studentName}</td>
                            <td>{a1 ? a1.labName : <span className="unassigned-text">Unassigned</span>}</td>
                            <td>{s1 ? `${formatTimeString(s1.start_time)} - ${formatTimeString(s1.end_time)}` : "—"}</td>
                            <td>{a2 ? a2.labName : <span className="unassigned-text">Unassigned</span>}</td>
                            <td>{s2 ? `${formatTimeString(s2.start_time)} - ${formatTimeString(s2.end_time)}` : "—"}</td>
                            <td>{a3 ? a3.labName : <span className="unassigned-text">Unassigned</span>}</td>
                            <td>{s3 ? `${formatTimeString(s3.start_time)} - ${formatTimeString(s3.end_time)}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {activeView === 'slips' && (
          <div className="slips-print-container">
            {chunkedSlips.map((chunk, pageIdx) => (
              <div key={pageIdx} className="slips-page-sheet">
                {chunk.map(stud => {
                  const a1 = s1 ? stud.sessionAssignments[s1.id] : null;
                  const a2 = s2 ? stud.sessionAssignments[s2.id] : null;
                  const a3 = s3 ? stud.sessionAssignments[s3.id] : null;

                  return (
                    <div key={stud.studentId} className="slip-card">
                      <div className="slip-card-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div className="slip-student-name">{stud.studentName}</div>
                          <div className="slip-age">Age: {shouldHideAge(stud.studentName, stud.organizationName) ? "___" : stud.studentAge}</div>
                        </div>
                        <div className="slip-org-name">{stud.organizationName}</div>
                      </div>
                      <div className="slip-card-body">
                        <div className="slip-your-labs-title">Your Labs:</div>
                        <table className="slip-labs-table">
                          <tbody>
                            <tr>
                              <td className="slip-time-col">{s1 ? `${formatTimeString(s1.start_time)} - ${formatTimeString(s1.end_time)}` : "10:00 - 10:50"}</td>
                              <td className="slip-lab-col">
                                <div className="slip-lab-name">{a1 ? a1.labName : <span className="unassigned-text">Unassigned</span>}</div>
                                {a1 && getLabRoom(a1.labName) && (
                                  <div className="slip-lab-room">{getLabRoom(a1.labName)}</div>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="slip-time-col">{s2 ? `${formatTimeString(s2.start_time)} - ${formatTimeString(s2.end_time)}` : "11:00 - 11:50"}</td>
                              <td className="slip-lab-col">
                                <div className="slip-lab-name">{a2 ? a2.labName : <span className="unassigned-text">Unassigned</span>}</div>
                                {a2 && getLabRoom(a2.labName) && (
                                  <div className="slip-lab-room">{getLabRoom(a2.labName)}</div>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="slip-time-col">{s3 ? `${formatTimeString(s3.start_time)} - ${formatTimeString(s3.end_time)}` : "12:30 - 01:20"}</td>
                              <td className="slip-lab-col">
                                <div className="slip-lab-name">{a3 ? a3.labName : <span className="unassigned-text">Unassigned</span>}</div>
                                {a3 && getLabRoom(a3.labName) && (
                                  <div className="slip-lab-room">{getLabRoom(a3.labName)}</div>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Blank passports (2 pages of 6 cards each) */}
            {[1, 2].map(pageIndex => (
              <div key={`blank-page-${pageIndex}`} className="slips-page-sheet">
                {[...Array(6)].map((_, cardIndex) => (
                  <div key={`blank-card-${pageIndex}-${cardIndex}`} className="slip-card">
                    <div className="slip-card-header">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div className="slip-student-name" style={{ fontSize: '15px', color: '#94a3b8', borderBottom: '1px solid #cbd5e1', width: '70%', height: '24px' }}>Name:</div>
                        <div className="slip-age" style={{ color: '#94a3b8', borderBottom: '1px solid #cbd5e1', width: '25%', height: '24px', textAlign: 'left' }}>Age:</div>
                      </div>
                      <div className="slip-org-name" style={{ color: '#94a3b8', borderBottom: '1px solid #cbd5e1', width: '100%', height: '20px', marginTop: '6px' }}>Organization:</div>
                    </div>
                    <div className="slip-card-body">
                      <div className="slip-your-labs-title">Your Labs:</div>
                      <table className="slip-labs-table">
                        <tbody>
                          <tr>
                            <td className="slip-time-col">{s1 ? `${formatTimeString(s1.start_time)} - ${formatTimeString(s1.end_time)}` : "10:00 - 10:50"}</td>
                            <td className="slip-lab-col">
                              <div style={{ borderBottom: '1px dashed #cbd5e1', height: '18px', width: '100%' }}></div>
                            </td>
                          </tr>
                          <tr>
                            <td className="slip-time-col">{s2 ? `${formatTimeString(s2.start_time)} - ${formatTimeString(s2.end_time)}` : "11:00 - 11:50"}</td>
                            <td className="slip-lab-col">
                              <div style={{ borderBottom: '1px dashed #cbd5e1', height: '18px', width: '100%' }}></div>
                            </td>
                          </tr>
                          <tr>
                            <td className="slip-time-col">{s3 ? `${formatTimeString(s3.start_time)} - ${formatTimeString(s3.end_time)}` : "12:30 - 01:20"}</td>
                            <td className="slip-lab-col">
                              <div style={{ borderBottom: '1px dashed #cbd5e1', height: '18px', width: '100%' }}></div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
