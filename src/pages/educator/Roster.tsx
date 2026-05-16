import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, XCircle, Users, Printer, Download, CheckSquare, Clock, GraduationCap, Search, MapPin } from 'lucide-react';
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

export default function EducatorRoster() {
  const { profile } = useAuth();
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
          students (id, first_name, last_name, age, organizations(name))
        `)
        .eq('lab_session_id', labSession.id);

      const stList = (assignmentData || []).map((a: any) => ({
        ...a.students,
        orgName: a.students.organizations?.name
      }));
      setStudents(stList);

      const { data: attData } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('lab_session_id', labSession.id);

      const attMap: any = {};
      (attData || []).forEach((a: any) => {
        attMap[a.student_id] = a.status === 'present';
      });
      setAttendance(attMap);
    } catch (error) {
      console.error(error);
      setStudents([]);
    }
  };

  const toggleAttendance = async (studentId: string) => {
    const isPresent = !attendance[studentId];
    setAttendance({ ...attendance, [studentId]: isPresent });

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
            marked_at: new Date().toISOString()
          }, { onConflict: 'student_id,lab_session_id' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const markAllPresent = async () => {
    const newAtt: any = { ...attendance };
    students.forEach(s => newAtt[s.id] = true);
    setAttendance(newAtt);

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
          marked_at: new Date().toISOString()
        }));
        await supabase.from('attendance').upsert(inserts, { onConflict: 'student_id,lab_session_id' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <div className="size-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Preparing Rosters...</p>
    </div>
  );

  if (assignedLabs.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto mt-20 border-none shadow-2xl shadow-slate-200/50 p-10 text-center space-y-6">
        <div className="size-24 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto">
          <GraduationCap size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">No Assignments Found</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <GraduationCap size={12} /> Instructor View
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
               {activeLab?.name || 'Class Roster'}
            </h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
               <MapPin size={14} /> Main Campus &bull; {campDays.find(d => d.id === activeDayId)?.date ? new Date(campDays.find(d => d.id === activeDayId).date).toLocaleDateString() : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-64">
            <Select value={activeLabId} onValueChange={(v) => setActiveLabId(v ?? '')}>
              <SelectTrigger className="rounded-xl font-bold bg-white shadow-sm border-slate-200 h-12">
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
              <SelectTrigger className="rounded-xl font-bold bg-white shadow-sm border-slate-200 h-12">
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
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
            <Clock size={14} /> Available Sessions
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`text-left p-6 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden group ${
                activeSessionId === s.id 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-900/30 -translate-y-1' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="relative z-10 space-y-1">
                <div className={`text-[10px] font-black uppercase tracking-widest ${activeSessionId === s.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {s.start_time.slice(0, 5)} — {s.end_time.slice(0, 5)}
                </div>
                <div className="text-lg font-black tracking-tight">{s.name}</div>
                <Badge variant="outline" className={`mt-2 font-bold px-3 py-0.5 border-none ${
                  activeSessionId === s.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
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
         <Card className="border-none shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center p-8 border-t-4 border-t-slate-900">
            <div className="text-4xl font-black text-slate-900 tracking-tight">{students.length}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Total Capacity</div>
         </Card>
         <Card className="border-none shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center p-8 border-t-4 border-t-emerald-500">
            <div className="text-4xl font-black text-emerald-600 tracking-tight">{presentCount}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Currently Present</div>
         </Card>
         <Card className="border-none shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center p-8 border-t-4 border-t-rose-500">
            <div className="text-4xl font-black text-rose-600 tracking-tight">{absentCount}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Marked Absent</div>
         </Card>
      </div>

      {/* Roster Table */}
      <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Users size={20} className="text-slate-400" />
              Student Roster
            </CardTitle>
            <CardDescription className="font-medium">Direct attendance management for current session.</CardDescription>
          </div>
          <Button 
            onClick={markAllPresent}
            variant="outline"
            className="rounded-full font-bold border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
          >
            <CheckSquare size={16} className="mr-2" /> Mark All Present
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="px-8 py-4 font-bold text-slate-900 w-16 text-center">#</TableHead>
                <TableHead className="px-8 py-4 font-bold text-slate-900">Student Name</TableHead>
                <TableHead className="px-8 py-4 font-bold text-slate-900">Organization</TableHead>
                <TableHead className="px-8 py-4 font-bold text-slate-900 text-right pr-12">Attendance Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, idx) => {
                const isPresent = attendance[student.id] || false;
                return (
                  <TableRow key={student.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="px-8 py-6 text-center text-slate-300 font-black">{idx + 1}</TableCell>
                    <TableCell className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 font-black text-xs">
                           {student.first_name[0]}{student.last_name[0]}
                         </div>
                         <div className="flex flex-col">
                            <span className="font-black text-slate-900">{student.first_name} {student.last_name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.age} Years Old</span>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                       <Badge variant="secondary" className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1">
                          {student.orgName}
                       </Badge>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right pr-12">
                      <Button
                        onClick={() => toggleAttendance(student.id)}
                        variant="ghost"
                        className={`rounded-full px-6 font-black uppercase tracking-widest text-[10px] h-10 transition-all ${
                          isPresent 
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' 
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
                        }`}
                      >
                        {isPresent ? (
                          <><CheckCircle2 size={14} className="mr-2" /> Present</>
                        ) : (
                          <><XCircle size={14} className="mr-2" /> Absent</>
                        )}
                      </Button>
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
        </CardContent>
      </Card>

      {/* Export Actions */}
      <div className="flex flex-wrap gap-4 justify-end">
        <Button variant="outline" className="rounded-xl font-bold border-slate-200 text-slate-600 shadow-sm px-8">
          <Printer size={18} className="mr-2" /> Print Physical Roster
        </Button>
        <Button className="rounded-xl font-bold px-8 shadow-lg shadow-slate-900/20 bg-slate-900 text-white">
          <Download size={18} className="mr-2" /> Export PDF Report
        </Button>
      </div>

    </div>
  );
}
