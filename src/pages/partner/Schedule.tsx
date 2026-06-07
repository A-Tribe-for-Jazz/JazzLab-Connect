import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Search, Filter, Printer, Sparkles, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getThemeClasses } from '../../lib/theme';
import { Badge } from '@/components/ui/badge';
import PartnerLoader from '../../components/partner/PartnerLoader';
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

interface Lab {
  id: string;
  name: string;
}

interface PlacementRow {
  studentId: string;
  studentName: string;
  studentAge: number;
  sessionAssignments: {
    [timeSlotId: string]: {
      labId: string;
      labName: string;
      pickNumber: number | null;
    };
  };
}

export default function PartnerSchedule() {
  const { profile } = useAuth();
  const { isDark, bgFlavor, activeCampDayId }: any = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [campDays, setCampDays] = useState<{ id: string; date: string }[]>([]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [sessions, setSessions] = useState<TimeSlot[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [validStudents, setValidStudents] = useState<any[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  // Filter States
  const [activeLabId, setActiveLabId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData(profile.organization_id);
    }
  }, [profile]);

  useEffect(() => {
    if (activeCampDayId) {
      setSelectedDayId(activeCampDayId);
    }
  }, [activeCampDayId]);

  const fetchData = async (orgId: string) => {
    try {
      setLoading(true);

      // Fetch organization name
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();
      if (orgData) setOrgName(orgData.name);

      // 1. Fetch all of the org's camp days
      const { data: daysData } = await supabase
        .from('camp_day_organizations')
        .select('camp_day_id, camp_days(date)')
        .eq('organization_id', orgId);

      const days = (daysData || [])
        .map(d => {
          const campDayField = d.camp_days;
          const date = Array.isArray(campDayField)
            ? (campDayField[0] as any)?.date
            : (campDayField as any)?.date;
          return { id: d.camp_day_id, date: date || '' };
        })
        .filter(d => d.date)
        .sort((a, b) => a.date.localeCompare(b.date));

      setCampDays(days);
      if (days.length > 0) setSelectedDayId(prev => prev || activeCampDayId || days[0].id);

      // 2. Fetch all time slots
      const { data: slotsData } = await supabase
        .from('time_slots').select('*').order('start_time');
      setSessions(slotsData || []);

      // 3. Fetch all labs
      const { data: labsData } = await supabase
        .from('labs').select('*').order('name');
      setLabs(labsData || []);

      // 4. Fetch valid students
      const { data: studentsData } = await supabase
        .from('students').select('*').eq('organization_id', orgId);
      const valid = (studentsData || []).filter(
        s => s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== ''
      );
      setValidStudents(valid);

      // 5. Fetch ALL assignments for these students (filtered by day in useMemo)
      const studentIds = valid.map(s => s.id);
      if (studentIds.length > 0) {
        const { data: assignmentsRes } = await supabase
          .from('assignments')
          .select('id, student_id, pick_number, lab_sessions(id, lab_id, camp_day_id, time_slot_id)')
          .in('student_id', studentIds);
        setAllAssignments(assignmentsRes || []);
      }
    } catch (error) {
      console.error('Error fetching placements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Derived: placements for the selected day
  const placements = useMemo<PlacementRow[]>(() => {
    if (!selectedDayId || !validStudents.length || !labs.length) return [];
    const dayAssignments = allAssignments.filter(a => a.lab_sessions?.camp_day_id === selectedDayId);
    return validStudents.map(student => {
      const studentAssignments = dayAssignments.filter(a => a.student_id === student.id);
      const sessionMap: { [timeSlotId: string]: { labId: string; labName: string; pickNumber: number | null } } = {};
      studentAssignments.forEach(assign => {
        const slotId = assign.lab_sessions?.time_slot_id;
        const labId = assign.lab_sessions?.lab_id;
        if (slotId && labId) {
          const labName = labs.find(l => l.id === labId)?.name || 'Unknown Lab';
          sessionMap[slotId] = { labId, labName, pickNumber: assign.pick_number };
        }
      });
      return {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentAge: student.age,
        sessionAssignments: sessionMap
      };
    });
  }, [selectedDayId, allAssignments, validStudents, labs]);

  // Derived: whether the selected day has any assignments
  const isFinalized = useMemo(() => {
    if (!selectedDayId) return false;
    return allAssignments.some(a => a.lab_sessions?.camp_day_id === selectedDayId);
  }, [selectedDayId, allAssignments]);

  // Derived: formatted label for selected day
  const campDayLabel = useMemo(() => {
    const day = campDays.find(d => d.id === selectedDayId);
    if (!day) return '';
    return new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }, [selectedDayId, campDays]);

  // Safe fallback mock sessions & labs if DB contains none
  const activeSessions = useMemo(() => {
    if (sessions.length > 0) return sessions;
    return [
      { id: 'ds1', name: 'Session 1', start_time: '10:00:00', end_time: '10:55:00' },
      { id: 'ds2', name: 'Session 2', start_time: '11:00:00', end_time: '11:55:00' },
      { id: 'ds3', name: 'Session 3', start_time: '12:40:00', end_time: '13:35:00' }
    ];
  }, [sessions]);

  const activeLabs = useMemo(() => {
    if (labs.length > 0) return labs;
    return [
      { id: 'dl1', name: 'Arts Collab' },
      { id: 'dl2', name: 'Pixel Beats' },
      { id: 'dl3', name: 'VR Music' },
      { id: 'dl4', name: 'Afro-Future' },
      { id: 'dl5', name: 'Remix Code' }
    ];
  }, [labs]);

  // Demo placements generator
  const demoPlacements = useMemo<PlacementRow[]>(() => {
    const s1 = activeSessions[0]?.id || 'ds1';
    const s2 = activeSessions[1]?.id || 'ds2';
    const s3 = activeSessions[2]?.id || 'ds3';

    const l1 = activeLabs[0]?.id || 'dl1';
    const l2 = activeLabs[1]?.id || 'dl2';
    const l3 = activeLabs[2]?.id || 'dl3';
    const l4 = activeLabs[3]?.id || 'dl4';
    const l5 = activeLabs[4]?.id || 'dl5';

    const l1Name = activeLabs[0]?.name || 'Arts Collab';
    const l2Name = activeLabs[1]?.name || 'Pixel Beats';
    const l3Name = activeLabs[2]?.name || 'VR Music';
    const l4Name = activeLabs[3]?.name || 'Afro-Future';
    const l5Name = activeLabs[4]?.name || 'Remix Code';

    return [
      {
        studentId: 'demo-1',
        studentName: 'Miles Davis',
        studentAge: 14,
        sessionAssignments: {
          [s1]: { labId: l1, labName: l1Name, pickNumber: 1 },
          [s2]: { labId: l5, labName: l5Name, pickNumber: 2 },
          [s3]: { labId: l4, labName: l4Name, pickNumber: null }
        }
      },
      {
        studentId: 'demo-2',
        studentName: 'Ella Fitzgerald',
        studentAge: 13,
        sessionAssignments: {
          [s1]: { labId: l3, labName: l3Name, pickNumber: 1 },
          [s2]: { labId: l3, labName: l3Name, pickNumber: 1 },
          [s3]: { labId: l2, labName: l2Name, pickNumber: 2 }
        }
      },
      {
        studentId: 'demo-3',
        studentName: 'John Coltrane',
        studentAge: 15,
        sessionAssignments: {
          [s1]: { labId: l4, labName: l4Name, pickNumber: null },
          [s2]: { labId: l1, labName: l1Name, pickNumber: 1 },
          [s3]: { labId: l3, labName: l3Name, pickNumber: 3 }
        }
      },
      {
        studentId: 'demo-4',
        studentName: 'Sarah Vaughan',
        studentAge: 12,
        sessionAssignments: {
          [s1]: { labId: l2, labName: l2Name, pickNumber: 1 },
          [s2]: { labId: l4, labName: l4Name, pickNumber: 2 },
          [s3]: { labId: l3, labName: l3Name, pickNumber: 1 }
        }
      },
      {
        studentId: 'demo-5',
        studentName: 'Herbie Hancock',
        studentAge: 14,
        sessionAssignments: {
          [s1]: { labId: l5, labName: l5Name, pickNumber: 2 },
          [s2]: { labId: l2, labName: l2Name, pickNumber: null },
          [s3]: { labId: l1, labName: l1Name, pickNumber: 1 }
        }
      },
      {
        studentId: 'demo-6',
        studentName: 'Thelonious Monk',
        studentAge: 15,
        sessionAssignments: {
          [s1]: { labId: l3, labName: l3Name, pickNumber: 1 },
          [s2]: { labId: l2, labName: l2Name, pickNumber: 3 },
          [s3]: { labId: l4, labName: l4Name, pickNumber: null }
        }
      }
    ];
  }, [activeSessions, activeLabs]);

  // Select between live placements or demo placements
  const displayPlacements = useMemo(() => {
    return showDemo ? demoPlacements : placements;
  }, [showDemo, demoPlacements, placements]);

  const filteredPlacements = useMemo(() => {
    return displayPlacements
      .filter(row => {
        const matchesSearch = row.studentName.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Shows student if 'all' is selected or if student visits this lab in ANY of the sessions
        const matchesLab = activeLabId === 'all'
          ? true
          : Object.values(row.sessionAssignments).some(assign => assign.labId === activeLabId);

        return matchesSearch && matchesLab;
      });
  }, [displayPlacements, activeLabId, searchTerm]);

  const selectedDayObj = useMemo(() => {
    return campDays.find(d => d.id === selectedDayId);
  }, [campDays, selectedDayId]);

  const visitDate = selectedDayObj ? selectedDayObj.date : (showDemo && !isFinalized ? "2026-05-14" : "");
  const activeOrgName = orgName || "ETSS";

  const handlePrint = () => {
    window.print();
  };

  const theme = getThemeClasses(isDark, bgFlavor);

  if (!isFinalized && !showDemo) {
    return (
      <div className={cn(
        "min-h-[calc(100dvh-5rem)] flex flex-col justify-center items-center text-center p-8 transition-colors duration-700",
        theme.bg
      )}>
        <div className="max-w-md space-y-6 partner-enter animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className={cn(
            "size-20 rounded-full flex items-center justify-center mx-auto transition-colors duration-700",
            isDark ? "bg-white/5 text-slate-700" : "bg-slate-50 text-slate-300"
          )}>
            <Calendar size={36} />
          </div>
          <div className="space-y-2">
            <h2 className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Schedules Not Ready
            </h2>
            <p className={cn("text-sm font-medium leading-relaxed mb-6", isDark ? "text-slate-500" : "text-slate-400")}>
              The master admin has not finalized the lab assignments yet.
              You will be automatically notified via email once the placement process is finalized and the schedules are ready.
            </p>
          </div>
          {/* Hiding Preview Demo Roster button for now
          <div className="pt-4 flex justify-center">
            <Button
              onClick={() => setShowDemo(true)}
              className={cn(
                "h-10 rounded-xl px-6 font-bold text-[13px] transition-all duration-500 shadow-xl shadow-sky-500/10 flex items-center gap-2",
                isDark
                  ? "bg-sky-500 hover:bg-sky-400 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              )}
            >
              <Sparkles size={16} />
              <span>Preview Demo Roster</span>
            </Button>
          </div>
          */}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-colors duration-700 overflow-hidden flex flex-col",
      theme.bg
    )}>
      {/* Sandbox Demo Banner (Non-printable) */}
      {showDemo && !isFinalized && (
        <div className={cn(
          "print:hidden px-8 py-3 flex items-center justify-between border-b text-[12px] font-bold tracking-wide transition-colors duration-500",
          isDark
            ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
            : "bg-sky-50 border-sky-100 text-sky-700"
        )}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="animate-pulse" />
            <span>SANDBOX PREVIEW MODE — Viewing mock placement grids. Actual schedules are not yet published.</span>
          </div>
          <button
            onClick={() => {
              setShowDemo(false);
              setActiveLabId('all');
              setSearchTerm('');
            }}
            className={cn(
              "p-1 rounded-lg transition-colors flex items-center gap-1.5 uppercase text-[10px] font-black tracking-widest",
              isDark ? "hover:bg-sky-500/20 text-sky-300" : "hover:bg-sky-100 text-sky-800"
            )}
          >
            <span>Exit Sandbox</span>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col pt-0 pb-0">
          <div className={cn(
            "rounded-[1.25rem] border overflow-hidden relative flex flex-col flex-1 min-h-0 transition-colors duration-700",
            theme.cardBorder,
            theme.cardBg,
            isDark ? "shadow-2xl shadow-black/40" : "shadow-xl shadow-slate-200/40"
          )}>
            {/* Unified High-Density Toolbar */}
            <div className={cn(
              "p-3 md:p-4 border-b shrink-0 transition-colors duration-700",
              theme.border,
              isDark ? "bg-white/[0.02]" : "bg-slate-50/30"
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
                      theme.inputBg,
                      isDark
                        ? "hover:border-sky-400/50 focus-visible:border-sky-400/50 focus-visible:ring-0"
                        : "hover:border-sky-500/30 focus-visible:border-sky-500/30 focus-visible:ring-0"
                    )}
                  />
                </div>

                {/* Middle: Guideline Info Note */}
                <div className={cn(
                  "h-auto md:h-10 py-2 md:py-0 flex items-center gap-2 px-4 rounded-xl text-[11px] font-semibold border border-transparent transition-all duration-500 self-start xl:self-auto flex-1 justify-center w-full xl:w-auto",
                  isDark
                    ? "bg-gradient-to-r from-indigo-500/[0.02] to-transparent text-indigo-200/80"
                    : "bg-gradient-to-r from-indigo-50/[0.3] to-transparent text-indigo-600/80"
                )}>
                  <Info size={14} className={cn("shrink-0 opacity-70 animate-pulse", isDark ? "text-indigo-400" : "text-indigo-500")} />
                  <span className="text-center">
                    This table shows your organization's final assignments. Use filters to check specific labs, or click <span className="font-bold">"Print Roster"</span> to export.
                  </span>
                </div>

                {/* Right: Selectors & Print Controls */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 self-stretch xl:self-auto justify-start xl:justify-end">
                  {/* Camp Day Selector (shown if there are multiple days) */}
                  {campDays.length > 1 && (
                    <Select value={selectedDayId} onValueChange={(val) => setSelectedDayId(val || '')}>
                      <SelectTrigger className={cn(
                        "h-10 w-40 md:w-44 rounded-xl border px-4 font-semibold text-[13px] transition-all duration-300 outline-none group/filter flex items-center justify-between shadow-sm shrink-0",
                        "[&_svg:last-child]:transition-all [&_svg:last-child]:duration-300 [&_svg:last-child]:opacity-40 group-hover/filter:[&_svg:last-child]:opacity-85 group-hover/filter:[&_svg:last-child]:translate-y-0.5",
                        isDark
                          ? "bg-slate-900/60 border-white/10 text-white hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-[0_0_15px_rgba(14,165,233,0.1)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-400"
                          : "bg-white border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-slate-50/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-500"
                      )}>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="transition-colors duration-300 shrink-0 text-sky-500/70" />
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
                  )}

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
                        <Filter size={14} className="transition-colors duration-300 shrink-0 text-sky-500/70" />
                        <span className="truncate">
                          {activeLabId === 'all' ? 'All Labs' : (activeLabs.find(l => l.id === activeLabId)?.name || 'All Labs')}
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
                      {activeLabs.map(lab => (
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
              <h1 className="text-2xl font-bold text-black uppercase tracking-tight">JazzLab Final Roster</h1>
              <p className="text-xs text-slate-500 mt-1">
                Camp Session Date: {showDemo && !isFinalized ? "Thursday, May 14, 2026" : (campDayLabel || 'Unassigned Day')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Organization: {activeOrgName}
              </p>
            </div>

            {/* Roster Data Table */}
            <div className={cn(
              "flex-1 overflow-auto min-h-0 border-r transition-colors duration-700",
              theme.border
            )}
              style={{ contain: "strict" }}
            >
              <Table className="border-collapse" wrapperClassName="overflow-visible" style={{ width: "100%" }}>
                <TableHeader className="sticky top-0 z-40">
                  <TableRow className={cn(
                    "border-b hover:bg-transparent transition-colors duration-700",
                    theme.border
                  )}>
                    <TableHead className={cn(
                      "font-semibold text-[13px] text-center w-[50px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-2",
                      theme.tableHeadBg
                    )}>#</TableHead>
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[120px]",
                      theme.tableHeadBg
                    )}>Visit Date</TableHead>
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                      theme.tableHeadBg
                    )}>Organization/Camp</TableHead>
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[180px]",
                      theme.tableHeadBg
                    )}>Student FULL NAME</TableHead>
                    
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                      theme.tableHeadBg
                    )}>Assigned Lab 1</TableHead>
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[120px]",
                      theme.tableHeadBg
                    )}>Lab 1 Time Slot</TableHead>
                    
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                      theme.tableHeadBg
                    )}>Assigned Lab 2</TableHead>
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[120px]",
                      theme.tableHeadBg
                    )}>Lab 2 Time Slot</TableHead>
                    
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[160px]",
                      theme.tableHeadBg
                    )}>Assigned Lab 3</TableHead>
                    <TableHead className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30 py-3 px-4 min-w-[120px]",
                      theme.tableHeadBg
                    )}>Lab 3 Time Slot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlacements.map((row, idx) => {
                    const s1 = activeSessions[0];
                    const s2 = activeSessions[1];
                    const s3 = activeSessions[2];

                    const a1 = s1 ? row.sessionAssignments[s1.id] : null;
                    const a2 = s2 ? row.sessionAssignments[s2.id] : null;
                    const a3 = s3 ? row.sessionAssignments[s3.id] : null;

                    return (                      <tr
                        key={row.studentId}
                        className={cn(
                          "h-10 border-b group transition-colors duration-500",
                          theme.border,
                          isDark
                            ? `hover:${theme.rowHover} data-[state=selected]:bg-white/[0.05]`
                            : `hover:${theme.rowHover} data-[state=selected]:bg-slate-50/70`,
                          idx % 2 === 1 && theme.rowOdd
                        )}
                        style={{ height: 40 }}
                      >
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center justify-center w-[50px] h-10">
                            <span className={cn(
                              "font-black text-[11px] tracking-tighter opacity-30",
                              isDark ? "text-slate-400" : "text-slate-600"
                            )}>{String(idx + 1).padStart(2, '0')}</span>
                          </div>
                        </td>
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-[13px] font-medium text-slate-600 dark:text-slate-400 truncate">
                            {visitDate}
                          </div>
                        </td>
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate" title={activeOrgName}>
                            {activeOrgName}
                          </div>
                        </td>
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                            {row.studentName}
                          </div>
                        </td>
 
                        {/* Rotation 1 */}
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                            {a1 ? a1.labName : <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                          </div>
                        </td>
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-xs text-slate-500 truncate">
                            {s1 ? `${s1.start_time.slice(0, 5)} - ${s1.end_time.slice(0, 5)}` : "—"}
                          </div>
                        </td>
 
                        {/* Rotation 2 */}
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                            {a2 ? a2.labName : <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                          </div>
                        </td>
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-xs text-slate-500 truncate">
                            {s2 ? `${s2.start_time.slice(0, 5)} - ${s2.end_time.slice(0, 5)}` : "—"}
                          </div>
                        </td>
 
                        {/* Rotation 3 */}
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                            {a3 ? a3.labName : <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                          </div>
                        </td>
                        <td className={cn(
                          "p-0 border-r last:border-r-0 relative overflow-hidden transition-colors duration-700",
                          theme.border
                        )}>
                          <div className="flex items-center h-10 px-4 text-xs text-slate-500 truncate">
                            {s3 ? `${s3.start_time.slice(0, 5)} - ${s3.end_time.slice(0, 5)}` : "—"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPlacements.length === 0 && (
                    <tr className="hover:bg-transparent">
                      <td colSpan={10} className="h-48 text-center">
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
