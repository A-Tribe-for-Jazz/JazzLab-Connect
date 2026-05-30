import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Search, Filter, Printer, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  const { isDark }: any = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [campDayDate, setCampDayDate] = useState('');
  const [sessions, setSessions] = useState<TimeSlot[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Filter States
  const [activeLabId, setActiveLabId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile?.organization_id) {
      fetchData(profile.organization_id);
    }
  }, [profile]);

  const fetchData = async (orgId: string) => {
    try {
      setLoading(true);

      // 1. Fetch organization's camp day
      const { data: daysData } = await supabase
        .from('camp_day_organizations')
        .select('camp_day_id, camp_days(date)')
        .eq('organization_id', orgId);

      let activeDayId = '';
      if (daysData && daysData.length > 0) {
        activeDayId = daysData[0].camp_day_id;
        const campDaysField = daysData[0].camp_days;
        const rawDate = Array.isArray(campDaysField) ? (campDaysField[0] as any)?.date : (campDaysField as any)?.date;
        if (rawDate) {
          const formatted = new Date(rawDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          setCampDayDate(formatted);
        }
      }

      // 2. Fetch all time slots (sessions)
      const { data: slotsData } = await supabase
        .from('time_slots')
        .select('*')
        .order('start_time');

      const activeSlots = slotsData || [];
      setSessions(activeSlots);

      // 3. Fetch all labs
      const { data: labsData } = await supabase
        .from('labs')
        .select('*')
        .order('name');
      setLabs(labsData || []);

      // 4. Fetch valid students in organization (must have First, Last, and Age filled)
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('organization_id', orgId);

      const validStudents = (studentsData || []).filter(
        s => s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== ''
      );

      // 5. Fetch placements/assignments
      const studentIds = validStudents.map(s => s.id);
      let assignmentsData: any[] = [];
      if (studentIds.length > 0) {
        const { data: assignmentsRes } = await supabase
          .from('assignments')
          .select(`
            id,
            student_id,
            pick_number,
            lab_sessions (
              id,
              lab_id,
              camp_day_id,
              time_slot_id
            )
          `)
          .in('student_id', studentIds);
        if (assignmentsRes) {
          assignmentsData = assignmentsRes;
        }
      }

      // Filter assignments for our active camp day
      const activeAssignments = assignmentsData.filter(
        a => a.lab_sessions?.camp_day_id === activeDayId
      );

      setIsFinalized(activeAssignments.length > 0);

      // Map placements
      const mapped = validStudents.map(student => {
        const studentAssignments = activeAssignments.filter(a => a.student_id === student.id);
        const sessionMap: { [timeSlotId: string]: { labId: string; labName: string; pickNumber: number | null } } = {};

        studentAssignments.forEach(assign => {
          const slotId = assign.lab_sessions?.time_slot_id;
          const labId = assign.lab_sessions?.lab_id;
          if (slotId && labId) {
            const labName = labsData?.find(l => l.id === labId)?.name || 'Unknown Lab';
            sessionMap[slotId] = {
              labId,
              labName,
              pickNumber: assign.pick_number
            };
          }
        });

        return {
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          studentAge: student.age,
          sessionAssignments: sessionMap
        };
      });

      setPlacements(mapped);
    } catch (error) {
      console.error('Error fetching placements:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <PartnerLoader isDark={isDark} label="Loading Placements..." />;
  }

  // If schedules are not finalized AND showDemo state is false, show "Schedules Not Ready"
  if (!isFinalized && !showDemo) {
    return (
      <div className={cn(
        "min-h-[calc(100dvh-5rem)] flex flex-col justify-center items-center text-center p-8 transition-colors duration-700",
        isDark ? "bg-black text-white" : "bg-white text-slate-900"
      )}>
        <div className="max-w-md space-y-6 partner-enter animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className={cn(
            "size-20 rounded-full flex items-center justify-center mx-auto transition-colors duration-700",
            isDark ? "bg-slate-900 text-slate-700" : "bg-slate-50 text-slate-300"
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
      "flex-1 flex flex-col min-h-0 min-w-0 transition-colors duration-700",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
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

      {/* Header section (Non-printable) */}
      <div className="print:hidden w-full mx-auto px-8 pt-8 pb-4 flex flex-col gap-1 border-b border-slate-100 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Final Placements
            </h1>
            <p className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1", isDark ? "text-slate-500" : "text-slate-400")}>
              <Calendar size={14} className={isDark ? "text-sky-700" : "text-sky-300"} />
              Attending Date: {showDemo && !isFinalized ? "Thursday, May 14, 2026" : (campDayDate || 'Unassigned Day')}
            </p>
          </div>

          {/* Right-aligned Filter & Print controls beside sessions */}
          <div className="flex items-center gap-4">
            <Select value={activeLabId} onValueChange={(v) => setActiveLabId(v ?? 'all')}>
              <SelectTrigger className={cn(
                "h-10 w-48 md:w-56 rounded-xl border-2 px-6 font-semibold text-[13px] transition-all duration-500 outline-none group/filter",
                isDark
                  ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus:border-sky-400/50 focus:bg-sky-400/5 focus:ring-0"
                  : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus:border-sky-500/30 focus:bg-sky-50/50 focus:ring-0"
              )}>
                <div className="flex items-center gap-3">
                  <Filter size={16} className={cn(
                    "transition-colors duration-500",
                    isDark
                      ? "text-sky-700 group-hover/filter:text-sky-400"
                      : "text-sky-300 group-hover/filter:text-sky-600"
                  )} />
                  <span className="truncate">
                    {activeLabId === 'all' ? 'All Labs' : (activeLabs.find(l => l.id === activeLabId)?.name || 'All Labs')}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent
                side="bottom"
                sideOffset={6}
                alignItemWithTrigger={false}
                className={cn("rounded-2xl border-none p-2 shadow-2xl w-48 md:w-56", isDark ? "bg-slate-900 text-white" : "bg-white")}
              >
                <SelectItem value="all" className="rounded-xl font-semibold text-[13px] py-4 px-6">All Labs</SelectItem>
                {activeLabs.map(lab => (
                  <SelectItem key={lab.id} value={lab.id} className="rounded-xl font-semibold text-[13px] py-4 px-6">
                    {lab.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handlePrint}
              variant="outline"
              className={cn(
                "h-10 rounded-xl px-5 font-semibold text-[13px] transition-all duration-500 border-2 flex items-center gap-2",
                isDark
                  ? "bg-sky-400/[0.03] border-white/10 text-white hover:bg-sky-400/50 hover:bg-sky-400/5 hover:border-sky-400/50"
                  : "bg-sky-50/20 border-slate-200 text-slate-900 hover:bg-sky-50/50"
              )}
            >
              <Printer size={16} />
              <span>Print Roster</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="flex-1 min-h-0 flex flex-col p-8 print:p-0">
        <div className={cn(
          "flex-1 min-h-0 flex flex-col rounded-3xl border-2 overflow-hidden print:border-none",
          isDark ? "bg-black border-white/5" : "bg-white border-slate-100"
        )}>
          {/* Full-width Search Bar (Non-printable) */}
          <div className="print:hidden p-6 border-b border-slate-100 dark:border-white/5">
            <div className="relative w-full">
              <Search size={18} className={cn(
                "absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-500 pointer-events-none",
                isDark ? "text-slate-600" : "text-slate-400"
              )} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-16 pr-5 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-semibold outline-none",
                  isDark
                    ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                    : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                )}
              />
            </div>
          </div>

          {/* Printable Header Context */}
          <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">JazzLab Final Roster</h1>
            <p className="text-xs text-slate-500 mt-1">
              Camp Session Date: {showDemo && !isFinalized ? "Thursday, May 14, 2026" : (campDayDate || 'Unassigned Day')}
            </p>
          </div>

          {/* Roster Data Table */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <Table>
              <TableHeader className={isDark ? "bg-white/[0.02]" : "bg-slate-50/50"}>
                <TableRow className="hover:bg-transparent border-slate-100 dark:border-white/5">
                  <TableHead className="px-8 py-4 font-bold text-center w-[36px] text-slate-400 dark:text-slate-500">#</TableHead>
                  <TableHead className="px-8 py-4 font-bold text-left text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider min-w-[200px]">Student Name</TableHead>
                  {activeSessions.map(session => (
                    <TableHead key={session.id} className="px-8 py-4 font-bold text-left text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider min-w-[180px]">
                      <div className="flex flex-col">
                        <span>{session.name}</span>
                        <span className="text-[9px] opacity-60 normal-case font-medium mt-0.5">
                          {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlacements.map((row, idx) => (
                  <TableRow
                    key={row.studentId}
                    className={cn(
                      "transition-colors border-slate-100 dark:border-white/5",
                      isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/50"
                    )}
                  >
                    <TableCell className="px-8 py-4 text-center text-[13px] font-black text-slate-300 dark:text-slate-700 w-[36px]">
                      {String(idx + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className={cn("font-semibold text-[13px]", isDark ? "text-white" : "text-slate-900")}>
                          {row.studentName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                          {row.studentAge} Years Old
                        </span>
                      </div>
                    </TableCell>
                    {activeSessions.map(session => {
                      const assignment = row.sessionAssignments[session.id];
                      return (
                        <TableCell key={session.id} className="px-8 py-4">
                          {assignment ? (
                            <div className="flex flex-col gap-1">
                              <span className={cn("text-[13px] font-semibold", isDark ? "text-white" : "text-slate-900")}>
                                {assignment.labName}
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest self-start px-2 py-0.5 rounded-full border",
                                assignment.pickNumber === 1 && (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"),
                                (assignment.pickNumber === 2 || assignment.pickNumber === 3) && (isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200"),
                                (assignment.pickNumber === 4 || assignment.pickNumber === 5) && (isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"),
                                ((assignment.pickNumber !== null && assignment.pickNumber > 5) || assignment.pickNumber === null) && (isDark ? "bg-white/5 text-slate-300 border-white/10" : "bg-slate-100 text-slate-600 border-slate-200")
                              )}>
                                {assignment.pickNumber === 1 ? '1st Choice' :
                                  assignment.pickNumber === 2 ? '2nd Choice' :
                                  assignment.pickNumber === 3 ? '3rd Choice' :
                                  assignment.pickNumber === 4 ? '4th Choice' :
                                  assignment.pickNumber === 5 ? '5th Choice' : 'Override'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 italic text-[13px]">Unassigned</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {filteredPlacements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2 + activeSessions.length} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 opacity-35">
                        <Search size={32} className={isDark ? "text-slate-700" : "text-slate-400"} />
                        <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-xs">
                          No matching student assignments found
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
