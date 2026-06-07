import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircle2, 
  XCircle, 
  Users, 
  Printer, 
  Download, 
  CheckSquare, 
  Clock, 
  GraduationCap, 
  Search, 
  MapPin, 
  AlertCircle, 
  Mail, 
  RefreshCw, 
  Award,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatTimeString } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function EducatorRoster() {
  const { profile } = useAuth();
  const { isDark }: any = useOutletContext() || { isDark: false };
  const [loading, setLoading] = useState(true);
  
  // State for active lab context
  const [assignedLabs, setAssignedLabs] = useState<any[]>([]);
  const [activeLabId, setActiveLabId] = useState<string>('');
  
  // State for active day context
  const [campDays, setCampDays] = useState<any[]>([]);
  const [activeDayId, setActiveDayId] = useState<string>('');

  // State for session context
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Roster data
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ [studentId: string]: boolean }>({});
  const [checkInTimes, setCheckInTimes] = useState<{ [studentId: string]: string | null }>({});

  // Mobile layout switch
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Sidebar details drawer state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [siblingsAtCamp, setSiblingsAtCamp] = useState<any[]>([]);
  const [loadingSiblings, setLoadingSiblings] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      initializeEducatorData();
    }
  }, [profile]);

  useEffect(() => {
    if (activeSessionId) {
      fetchRoster();
    }
  }, [activeSessionId, activeLabId, activeDayId]);

  const initializeEducatorData = async () => {
    try {
      // 1. Get labs assigned to this educator
      const { data: instData } = await supabase
        .from('lab_instructors')
        .select('lab_id, labs(name)')
        .eq('educator_id', profile!.id);
        
      if (!instData || instData.length === 0) {
        setLoading(false);
        return;
      }
      
      const labsList = instData.map((d: any) => ({ id: d.lab_id, name: d.labs.name }));
      setAssignedLabs(labsList);
      setActiveLabId(labsList[0].id);

      // 2. Get camp days
      const { data: daysData } = await supabase.from('camp_days').select('*').order('date');
      if (daysData && daysData.length > 0) {
        setCampDays(daysData);
        setActiveDayId(daysData[0].id);
      }

      // 3. Get time slots
      const { data: slotsData } = await supabase.from('time_slots').select('*').order('start_time');
      if (slotsData) {
        setSessions(slotsData);
        setActiveSessionId(slotsData[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async () => {
    try {
      const { data: labSession } = await supabase
        .from('lab_sessions')
        .select('id')
        .eq('lab_id', activeLabId)
        .eq('camp_day_id', activeDayId)
        .eq('time_slot_id', activeSessionId)
        .single();

      if (!labSession) {
        setStudents([]);
        return;
      }

      const { data: assignmentData } = await supabase
        .from('assignments')
        .select(`
          student_id,
          students (
            id, 
            first_name, 
            last_name, 
            age, 
            organizations (name),
            special_needs_notes,
            parent_email,
            notes,
            sibling_group_id
          )
        `)
        .eq('lab_session_id', labSession.id);

      const stList = (assignmentData || []).map((a: any) => ({
        ...a.students,
        orgName: a.students.organizations?.name
      }));
      setStudents(stList);

      const { data: attData } = await supabase
        .from('attendance')
        .select('student_id, status, marked_at')
        .eq('lab_session_id', labSession.id);

      const attMap: any = {};
      const timeMap: any = {};
      (attData || []).forEach((a: any) => {
        attMap[a.student_id] = a.status === 'present';
        timeMap[a.student_id] = a.status === 'present' ? a.marked_at : null;
      });
      setAttendance(attMap);
      setCheckInTimes(timeMap);
    } catch (error) {
      console.error(error);
      setStudents([]);
    }
  };

  const toggleAttendance = async (studentId: string) => {
    const isPresent = !attendance[studentId];
    const now = isPresent ? new Date().toISOString() : null;

    setAttendance(prev => ({ ...prev, [studentId]: isPresent }));
    setCheckInTimes(prev => ({ ...prev, [studentId]: now }));

    try {
      const { data: labSession } = await supabase
        .from('lab_sessions')
        .select('id')
        .eq('lab_id', activeLabId)
        .eq('camp_day_id', activeDayId)
        .eq('time_slot_id', activeSessionId)
        .single();

      if (labSession) {
        await supabase
          .from('attendance')
          .upsert({
            student_id: studentId,
            lab_session_id: labSession.id,
            status: isPresent ? 'present' : 'absent',
            marked_at: now
          }, { onConflict: 'student_id,lab_session_id' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const markAllPresent = async () => {
    const newAtt: any = { ...attendance };
    const newTimes: any = { ...checkInTimes };
    const now = new Date().toISOString();
    
    students.forEach(s => {
      newAtt[s.id] = true;
      newTimes[s.id] = now;
    });
    
    setAttendance(newAtt);
    setCheckInTimes(newTimes);

    try {
      const { data: labSession } = await supabase
        .from('lab_sessions')
        .select('id')
        .eq('lab_id', activeLabId)
        .eq('camp_day_id', activeDayId)
        .eq('time_slot_id', activeSessionId)
        .single();

      if (labSession) {
        const inserts = students.map(s => ({
          student_id: s.id,
          lab_session_id: labSession.id,
          status: 'present',
          marked_at: now
        }));
        await supabase.from('attendance').upsert(inserts, { onConflict: 'student_id,lab_session_id' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStudentClick = async (student: any) => {
    setSelectedStudent(student);
    setIsDrawerOpen(true);

    if (student.sibling_group_id) {
      setLoadingSiblings(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, last_name, age, organizations (name)')
          .eq('sibling_group_id', student.sibling_group_id)
          .neq('id', student.id);

        if (error) throw error;
        setSiblingsAtCamp(data || []);
      } catch (err) {
        console.error('Error fetching siblings:', err);
        setSiblingsAtCamp([]);
      } finally {
        setLoadingSiblings(false);
      }
    } else {
      setSiblingsAtCamp([]);
    }
  };

  const exportPDF = () => {
    const activeLab = assignedLabs.find(l => l.id === activeLabId);
    const activeDay = campDays.find(d => d.id === activeDayId);
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const dayIndex = campDays.findIndex(d => d.id === activeDayId) + 1;

    const doc = new jsPDF();

    // Premium Border and Branding
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(5, 5, 200, 287); // Page border

    // Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(activeLab?.name || "Class Roster", 14, 25);

    // Metadata Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`JazzLab Summer Arts Program  |  Instructor: ${profile?.full_name || "Camp Instructor"}`, 14, 32);

    // Separator line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(14, 36, 196, 36);

    // Details Block (Grid coordinates)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Date:", 14, 45);
    doc.text("Camp Day:", 80, 45);
    doc.text("Session Slot:", 135, 45);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(activeDay?.date ? new Date(activeDay.date).toLocaleDateString() : "-", 26, 45);
    doc.text(`Day ${dayIndex} of 6`, 102, 45);
    doc.text(activeSession?.name || "-", 160, 45);

    // Stats Info Bar
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 52, 182, 12, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`TOTAL ROSTER: ${students.length}`, 18, 60);
    doc.text(`PRESENT: ${presentCount}`, 80, 60);
    doc.text(`ABSENT: ${absentCount}`, 145, 60);

    // Table Header
    let y = 75;
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(14, y, 182, 10, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("#", 17, y + 6);
    doc.text("Student Name", 28, y + 6);
    doc.text("Organization Name", 90, y + 6);
    doc.text("Age", 145, y + 6);
    doc.text("Roll Call Mark / Signature", 158, y + 6);

    // Table Rows
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    students.forEach((student, idx) => {
      // Row highlighting for clean visual layout
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y, 182, 9, "F");
      }
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(14, y + 9, 196, y + 9);

      doc.text((idx + 1).toString(), 17, y + 6);
      doc.text(`${student.first_name} ${student.last_name}`, 28, y + 6);
      doc.text(student.orgName || "-", 90, y + 6);
      doc.text((student.age || "-").toString(), 145, y + 6);

      // Render Check mark if present, else blank for signing
      const isPresent = attendance[student.id];
      if (isPresent) {
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text("[ X ] PRESENT", 158, y + 6);
        doc.setTextColor(15, 23, 42);
      } else {
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("[   ] ABSENT", 158, y + 6);
        doc.setTextColor(15, 23, 42);
      }

      y += 9;

      // Handle page break if roster is very long
      if (y > 270) {
        doc.addPage();
        doc.setDrawColor(226, 232, 240);
        doc.rect(5, 5, 200, 287);
        y = 20;
      }
    });

    // Signature Block at footer
    y += 15;
    if (y > 260) {
      doc.addPage();
      doc.setDrawColor(226, 232, 240);
      doc.rect(5, 5, 200, 287);
      y = 30;
    }

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(14, y + 10, 85, y + 10);
    doc.line(125, y + 10, 196, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("INSTRUCTOR SIGNATURE", 14, y + 15);
    doc.text("CAMP COORDINATOR VERIFICATION", 125, y + 15);

    // Save PDF
    const filename = `${activeLab?.name.replace(/\s+/g, '_')}_Roster_Day_${dayIndex}.pdf`;
    doc.save(filename);
  };

  const exportExcel = () => {
    const activeLab = assignedLabs.find(l => l.id === activeLabId);
    const campDay = campDays.find(d => d.id === activeDayId);
    const dayIndex = campDays.findIndex(d => d.id === activeDayId) + 1;

    const data = students.map((s, idx) => {
      const isPresent = attendance[s.id] || false;
      const checkedInTime = checkInTimes[s.id];
      return {
        '#': idx + 1,
        'First Name': s.first_name,
        'Last Name': s.last_name,
        'Age': s.age,
        'Organization': s.orgName,
        'Attendance': isPresent ? 'PRESENT' : 'ABSENT',
        'Check-In Time': isPresent && checkedInTime ? new Date(checkedInTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Attendance");

    const filename = `${activeLab?.name.replace(/\s+/g, '_')}_Attendance_Day_${dayIndex}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <div className="size-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin"></div>
      <p className={cn("text-sm font-bold uppercase tracking-widest transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>Preparing Rosters...</p>
    </div>
  );

  if (assignedLabs.length === 0) {
    return (
      <Card className={cn("max-w-2xl mx-auto mt-20 border-none p-10 text-center space-y-6 transition-all duration-700", isDark ? "bg-zinc-950/40 border border-white/5 shadow-none" : "shadow-2xl shadow-slate-200/50 bg-white")}>
        <div className={cn("size-24 rounded-full flex items-center justify-center mx-auto transition-colors duration-700", isDark ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-300")}>
          <GraduationCap size={48} />
        </div>
        <div className="space-y-2">
          <h2 className={cn("text-3xl font-black tracking-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>No Assignments Found</h2>
          <p className={cn("font-medium leading-relaxed transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>
            You aren't currently assigned to any labs. Please coordinate with the program administrator to update your status.
          </p>
        </div>
      </Card>
    );
  }

  const activeLab = assignedLabs.find(l => l.id === activeLabId);
  const presentCount = Object.values(attendance).filter(v => v).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Header Context */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors duration-700", isDark ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-100")}>
            <GraduationCap size={12} /> Instructor View
          </div>
          <div className="space-y-1">
            <h1 className={cn("text-4xl font-black tracking-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>
               {activeLab?.name || 'Class Roster'}
            </h1>
            <p className={cn("font-medium flex items-center gap-2 text-sm transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>
               <MapPin size={14} /> Main Campus &bull; {campDays.find(d => d.id === activeDayId)?.date ? new Date(campDays.find(d => d.id === activeDayId).date).toLocaleDateString() : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-64">
            <Select value={activeLabId} onValueChange={(v) => setActiveLabId(v ?? '')}>
              <SelectTrigger className={cn("rounded-xl font-bold h-12 transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-white" : "bg-white shadow-sm border-slate-200")}>
                <SelectValue placeholder="Select Lab" />
              </SelectTrigger>
              <SelectContent>
                {assignedLabs.map(l => (
                  <SelectItem key={l.id} value={l.id} className="font-bold">{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-64">
            <Select value={activeDayId} onValueChange={(v) => setActiveDayId(v ?? '')}>
              <SelectTrigger className={cn("rounded-xl font-bold h-12 transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-white" : "bg-white shadow-sm border-slate-200")}>
                <SelectValue placeholder="Select Day" />
              </SelectTrigger>
              <SelectContent>
                {campDays.map((d, i) => (
                  <SelectItem key={d.id} value={d.id} className="font-bold">
                    Day {i + 1} &bull; {new Date(d.date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Session Picker */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>
            <Clock size={14} /> Available Sessions
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={cn(
                "text-left p-6 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden group",
                activeSessionId === s.id 
                  ? (isDark ? 'bg-zinc-900 border-emerald-500 text-white shadow-2xl shadow-emerald-500/10 -translate-y-1' : 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-900/30 -translate-y-1')
                  : (isDark ? 'bg-zinc-950 border-white/5 text-slate-300 hover:border-white/10' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300')
              )}
            >
              <div className="relative z-10 space-y-1">
                <div className={cn("text-[10px] font-black uppercase tracking-widest transition-colors duration-700", activeSessionId === s.id ? 'text-emerald-400' : 'text-slate-500')}>
                  {formatTimeString(s.start_time)} — {formatTimeString(s.end_time)}
                </div>
                <div className="text-lg font-black tracking-tight">{s.name}</div>
                <Badge variant="outline" className={cn("mt-2 font-bold px-3 py-0.5 border-none transition-colors duration-700",
                  activeSessionId === s.id ? 'bg-white/10 text-white' : (isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600')
                )}>
                  {activeSessionId === s.id ? students.length : '?'} Students
                </Badge>
              </div>
              {activeSessionId === s.id && (
                <CheckCircle2 className="absolute -bottom-4 -right-4 size-24 text-white/5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card className={cn("border-none flex flex-col items-center justify-center p-8 border-t-4 border-t-slate-900 transition-all duration-700", isDark ? "bg-zinc-950/40 border border-white/5 shadow-none" : "shadow-xl shadow-slate-200/50 bg-white")}>
            <div className={cn("text-4xl font-black tracking-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>{students.length}</div>
            <div className={cn("text-[10px] font-black uppercase tracking-widest mt-2 transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>Total Capacity</div>
         </Card>
         <Card className={cn("border-none flex flex-col items-center justify-center p-8 border-t-4 border-t-emerald-500 transition-all duration-700", isDark ? "bg-zinc-950/40 border border-white/5 shadow-none" : "shadow-xl shadow-slate-200/50 bg-white")}>
            <div className="text-4xl font-black text-emerald-600 tracking-tight">{presentCount}</div>
            <div className={cn("text-[10px] font-black uppercase tracking-widest mt-2 transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>Currently Present</div>
         </Card>
         <Card className={cn("border-none flex flex-col items-center justify-center p-8 border-t-4 border-t-rose-500 transition-all duration-700", isDark ? "bg-zinc-950/40 border border-white/5 shadow-none" : "shadow-xl shadow-slate-200/50 bg-white")}>
            <div className="text-4xl font-black text-rose-600 tracking-tight">{absentCount}</div>
            <div className={cn("text-[10px] font-black uppercase tracking-widest mt-2 transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>Marked Absent</div>
         </Card>
      </div>

      {/* Roster Container */}
      <Card className={cn("border-none overflow-hidden transition-all duration-700", isDark ? "bg-zinc-950/40 border border-white/5 shadow-2xl shadow-black/80" : "bg-white shadow-2xl shadow-slate-200/50")}>
        <CardHeader className={cn("border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 transition-colors duration-700", isDark ? "bg-white/[0.01] border-white/5" : "bg-slate-50/50 border-slate-100")}>
          <div className="space-y-1">
            <CardTitle className={cn("text-xl font-black tracking-tight flex items-center gap-2 transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>
              <Users size={20} className="text-slate-400" />
              Student Roster
            </CardTitle>
            <CardDescription className={cn("font-medium transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>Direct attendance management for current session.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className={cn("flex border rounded-full p-0.5 shrink-0 transition-colors duration-700", isDark ? "bg-white/5 border-white/10" : "bg-slate-100")}>
              <button 
                onClick={() => setViewMode('table')}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all",
                  viewMode === 'table' 
                    ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm") 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Table
              </button>
              <button 
                onClick={() => setViewMode('cards')}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all",
                  viewMode === 'cards' 
                    ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm") 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Cards
              </button>
            </div>
            <Button 
              onClick={markAllPresent}
              variant="outline"
              className={cn("rounded-full font-bold shadow-sm text-xs h-10 px-4 transition-all duration-300", isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30" : "border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200")}
            >
              <CheckSquare size={14} className="mr-2" /> Mark All Present
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <Table>
              <TableHeader className={isDark ? "bg-white/[0.02]" : "bg-slate-50/30"}>
                <TableRow className={cn("hover:bg-transparent border-b transition-colors duration-700", isDark ? "border-white/5" : "border-slate-100")}>
                  <TableHead className={cn("px-8 py-4 font-bold w-16 text-center transition-colors duration-700", isDark ? "text-slate-300 border-white/5" : "text-slate-900 border-slate-100")}>#</TableHead>
                  <TableHead className={cn("px-8 py-4 font-bold transition-colors duration-700", isDark ? "text-slate-300 border-white/5" : "text-slate-900 border-slate-100")}>Student Name</TableHead>
                  <TableHead className={cn("px-8 py-4 font-bold transition-colors duration-700", isDark ? "text-slate-300 border-white/5" : "text-slate-900 border-slate-100")}>Organization</TableHead>
                  <TableHead className={cn("px-8 py-4 font-bold text-right pr-12 transition-colors duration-700", isDark ? "text-slate-300 border-white/5" : "text-slate-900 border-slate-100")}>Attendance Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, idx) => {
                  const isPresent = attendance[student.id] || false;
                  const checkInTime = checkInTimes[student.id];
                  return (
                    <TableRow 
                      key={student.id} 
                      onClick={() => handleStudentClick(student)}
                      className={cn("transition-colors border-b cursor-pointer", isDark ? "hover:bg-white/[0.02] border-white/5" : "hover:bg-slate-50/50 border-slate-50")}
                    >
                      <TableCell className={cn("px-8 py-6 text-center font-black transition-colors duration-700", isDark ? "text-slate-700" : "text-slate-300")}>{idx + 1}</TableCell>
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className={cn("size-10 rounded-full flex items-center justify-center font-black text-xs transition-colors", isDark ? "bg-white/5 text-slate-400 border border-white/10" : "bg-slate-100 text-slate-400 border border-slate-200")}>
                             {student.first_name[0]}{student.last_name[0]}
                           </div>
                           <div className="flex flex-col">
                              <span className={cn("font-black flex items-center gap-1.5 transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>
                                {student.first_name} {student.last_name}
                                {(student.special_needs_notes || student.notes) && (
                                  <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 border-none text-[8px] font-bold py-0 px-2 flex items-center gap-0.5">
                                    <AlertCircle size={8} /> ALERTS
                                  </Badge>
                                )}
                              </span>
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-700", isDark ? "text-slate-500" : "text-slate-400")}>{student.age} Years Old</span>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6">
                         <Badge variant="secondary" className={cn("font-bold px-3 py-1 transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-slate-300" : "bg-white border-slate-200 text-slate-500")}>
                            {student.orgName}
                         </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right pr-12" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            onClick={() => toggleAttendance(student.id)}
                            variant="ghost"
                            className={cn("rounded-full px-6 font-black uppercase tracking-widest text-[10px] h-10 transition-all",
                              isPresent 
                                ? (isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white') 
                                : (isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white')
                            )}
                          >
                            {isPresent ? (
                              <><CheckCircle2 size={14} className="mr-2" /> Present</>
                            ) : (
                              <><XCircle size={14} className="mr-2" /> Absent</>
                            )}
                          </Button>
                          {isPresent && checkInTime && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Clock size={10} /> Checked-in at {new Date(checkInTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                         <Search size={40} className="text-slate-400" />
                         <p className="font-black text-slate-400 uppercase tracking-widest">No students assigned to this session</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            /* Cards View */
            <div className={cn("p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-colors duration-700", isDark ? "bg-black" : "bg-slate-50/20")}>
              {students.map((student, idx) => {
                const isPresent = attendance[student.id] || false;
                const checkInTime = checkInTimes[student.id];
                return (
                  <div 
                    key={student.id}
                    onClick={() => handleStudentClick(student)}
                    className={cn("p-5 border rounded-3xl shadow-sm transition-all duration-300 flex flex-col justify-between cursor-pointer group",
                      isDark 
                        ? "bg-zinc-950 border-white/5 hover:border-white/10 hover:shadow-black" 
                        : "bg-white border-slate-100 hover:shadow-md hover:border-slate-200"
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("size-10 rounded-2xl flex items-center justify-center font-black text-xs transition-colors", isDark ? "bg-white/5 text-slate-400 border border-white/10 group-hover:bg-primary/20 group-hover:text-primary" : "bg-slate-100 text-slate-400 border border-slate-200 group-hover:bg-primary/10 group-hover:text-primary")}>
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div>
                            <h4 className={cn("font-black text-sm leading-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>{student.first_name} {student.last_name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{student.age} Years Old</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={cn("border-none text-[8px] font-black uppercase tracking-wider py-0.5 px-2 transition-colors duration-700", isDark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500")}>
                          {student.orgName}
                        </Badge>
                      </div>

                      {/* Display Alert Dot if has special needs */}
                      {(student.special_needs_notes || student.notes) && (
                        <div className={cn("flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full w-fit transition-colors", isDark ? "bg-rose-950/20 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-505")}>
                          <AlertCircle size={10} /> Has Alerts
                        </div>
                      )}
                    </div>

                    <div className={cn("mt-6 pt-4 border-t flex items-center justify-between transition-colors duration-700", isDark ? "border-white/5" : "border-slate-50")} onClick={(e) => e.stopPropagation()}>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {isPresent && checkInTime ? (
                          <span className="flex items-center gap-1"><Clock size={10} /> {new Date(checkInTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        ) : (
                          "Unchecked"
                        )}
                      </div>
                      <Button
                        onClick={() => toggleAttendance(student.id)}
                        variant="ghost"
                        size="sm"
                        className={cn("rounded-full px-5 font-black uppercase tracking-widest text-[9px] h-8 transition-all",
                          isPresent 
                            ? (isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white')
                            : (isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white')
                        )}
                      >
                        {isPresent ? "Present" : "Absent"}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center space-y-3 opacity-30">
                  <Search size={40} className="text-slate-400" />
                  <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No students assigned to this session</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Export Actions */}
      <div className="flex flex-wrap gap-4 justify-end">
        <Button 
          onClick={exportPDF}
          variant="outline" 
          className={cn("rounded-xl font-bold shadow-sm px-8 h-12 transition-all duration-300", isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50")}
        >
          <Printer size={18} className="mr-2" /> Print Physical Roster
        </Button>
        <Button 
          onClick={exportExcel}
          className="rounded-xl font-bold px-8 shadow-lg shadow-slate-900/20 bg-slate-900 text-white h-12 hover:bg-slate-800"
        >
          <Download size={18} className="mr-2" /> Export Excel Report
        </Button>
      </div>
      {/* Sliding Student Details Drawer */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isDrawerOpen ? "opacity-100 z-[999] pointer-events-auto" : "opacity-0 z-[-10] pointer-events-none"
        )}
        onClick={() => setIsDrawerOpen(false)}
      >
        <div 
          className={cn(
            "fixed inset-y-0 right-0 w-full sm:max-w-md shadow-2xl transition-transform duration-300 transform flex flex-col p-0 z-[1000] border-l",
            isDrawerOpen ? "translate-x-0" : "translate-x-full",
            isDark ? "bg-zinc-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center font-black">
                {selectedStudent?.first_name?.[0]}{selectedStudent?.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-none">{selectedStudent?.first_name} {selectedStudent?.last_name}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">{selectedStudent?.age} Years Old &bull; {selectedStudent?.orgName}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Special Needs & Behavioral Alert */}
            {(selectedStudent?.special_needs_notes || selectedStudent?.notes) ? (
              <div className={cn("p-4 rounded-2xl border space-y-2 transition-all duration-500", isDark ? "bg-rose-950/20 border-rose-500/30" : "bg-rose-50 border-rose-100")}>
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle size={16} /> Confidential Instructor Alert
                </div>
                {selectedStudent?.special_needs_notes && (
                  <div className={cn("text-xs leading-relaxed transition-colors", isDark ? "text-rose-400" : "text-rose-700")}>
                    <strong>Medical/Special Needs:</strong> {selectedStudent.special_needs_notes}
                  </div>
                )}
                {selectedStudent?.notes && (
                  <div className={cn("text-xs leading-relaxed transition-colors", isDark ? "text-rose-400" : "text-rose-700")}>
                    <strong>Behavioral/General Notes:</strong> {selectedStudent.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn("p-4 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all duration-500", isDark ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500")}>
                <CheckSquare size={16} className="text-slate-400" /> No confidential alerts or health flags reported.
              </div>
            )}

            {/* Contacts & Guardian Info */}
            <div className="space-y-3">
              <h4 className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors", isDark ? "text-slate-500" : "text-slate-400")}>
                <Mail size={12} /> Contact & Family Information
              </h4>
              <div className={cn("p-4 rounded-2xl border space-y-3 transition-all duration-500", isDark ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-100")}>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parent / Guardian Email</span>
                  <span className={cn("text-sm font-bold transition-colors", isDark ? "text-white" : "text-slate-800")}>{selectedStudent?.parent_email || "No contact email provided"}</span>
                </div>
              </div>
            </div>

            {/* Sibling Network */}
            <div className="space-y-3">
              <h4 className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors", isDark ? "text-slate-500" : "text-slate-400")}>
                <Users size={12} /> Sibling Network at Camp
              </h4>
              {loadingSiblings ? (
                <div className="flex items-center justify-center p-6 text-slate-400 text-xs font-bold uppercase tracking-widest gap-2">
                  <RefreshCw className="animate-spin" size={14} /> Scanning Sibling Network...
                </div>
              ) : siblingsAtCamp.length > 0 ? (
                <div className="space-y-2">
                  {siblingsAtCamp.map(sibling => (
                    <div key={sibling.id} className={cn("flex items-center justify-between p-3 rounded-xl border shadow-sm transition-all duration-500", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100")}>
                      <div className="space-y-0.5">
                        <p className={cn("font-bold text-xs transition-colors", isDark ? "text-white" : "text-slate-800")}>{sibling.first_name} {sibling.last_name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sibling.age} Years Old &bull; {sibling.organizations?.name}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-wider">Sibling</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn("p-4 rounded-2xl border border-dashed text-xs font-medium italic text-center transition-all duration-500", isDark ? "border-white/5 text-slate-600 bg-white/[0.01]" : "border-slate-200 text-slate-400 bg-slate-50/20")}>
                  No siblings currently registered in other groups.
                </div>
              )}
            </div>

        </div>
      </div>
    </div>
  </div>
  );
}
