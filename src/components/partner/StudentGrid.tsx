import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Search, Filter, GraduationCap, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PartnerLoader from './PartnerLoader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "./students/data-table";
import { getColumns, type StudentRow } from "./students/columns";

interface StudentGridProps {
  organizationId: string;
  isDark?: boolean;
}

export default function StudentGrid({ organizationId, isDark = false }: StudentGridProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [campDays, setCampDays] = useState<{ id: string, date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('filter') || 'all');
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Always-fresh ref so debounce timers never use stale student state
  const studentsRef = useRef<StudentRow[]>([]);
  useEffect(() => { studentsRef.current = students; }, [students]);

  useEffect(() => {
    fetchData();
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, [organizationId]);

  const fetchData = async () => {
    try {
      const [studentsRes, daysRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true }),
        supabase
          .from('camp_day_organizations')
          .select('camp_day_id, camp_days(date)')
          .eq('organization_id', organizationId)
      ]);

      if (studentsRes.data) {
        const existingStudents = studentsRes.data
          .filter(s => s.first_name?.trim() || s.last_name?.trim())
          .map((s, idx) => ({ 
          ...s, 
          sync_status: 'synced', 
          order_index: s.order_index ?? idx,
          age: s.age ?? ''
        })) as StudentRow[];

        // Excel-style: Always provide at least 100 rows for frictionless data entry
        const targetCount = Math.max(existingStudents.length + 20, 100);

        const paddedStudents = [...existingStudents];
        while (paddedStudents.length < targetCount) {
          paddedStudents.push({
            id: crypto.randomUUID(),
            first_name: '',
            last_name: '',
            age: '',
            gender: '',
            race: '',
            ethnicity: '',
            zip_code: '',
            camp_day_id: null,
            notes: '',
            organization_id: organizationId,
            sync_status: 'synced',
            order_index: paddedStudents.length
          } as StudentRow);
        }
        setStudents(paddedStudents);
      }
      
      if (daysRes.data) {
        setCampDays(daysRes.data.map((od: any) => ({
          id: od.camp_day_id,
          date: od.camp_days.date
        })));
      }
    } catch (error) {
      console.error('Error fetching grid data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = async (student: StudentRow) => {
    // Only skip if the row is completely empty (no name at all)
    const hasAnyData = !!(student.first_name?.trim() || student.last_name?.trim() || student.age !== '');
    if (!hasAnyData) {
      // Reset to neutral so the row doesn't stay stuck in 'saving'
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, sync_status: 'synced' } : s));
      return;
    }

    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, sync_status: 'saving' } : s));
    try {
      const { sync_status, ...payload } = student;
      // Safely convert age: '' | null | number -> number | null
      const ageValue = payload.age === '' || payload.age === null || payload.age === undefined
        ? null
        : Number(payload.age);

      const { error } = await supabase
        .from('students')
        .upsert({
          ...payload,
          organization_id: organizationId,
          age: ageValue,
        });
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, sync_status: 'synced' } : s));
    } catch (err: any) {
      console.error('Error syncing student:', err?.message ?? err);
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, sync_status: 'error' } : s));
    }
  };

  const handleFieldChange = (id: string, field: keyof StudentRow, value: any) => {
    // Update local state immediately for responsive UI
    setStudents(prev => {
      const studentIndex = prev.findIndex(s => s.id === id);
      if (studentIndex === -1) return prev;

      const newStudents = [...prev];
      newStudents[studentIndex] = { ...newStudents[studentIndex], [field]: value, sync_status: 'saving' as const };
      
      // Check if we are near the bottom of the current list (within last 5 rows)
      // AND ensure we don't keep adding if we just added a bunch
      if (studentIndex >= prev.length - 5) {
        const extraRows: StudentRow[] = Array.from({ length: 50 }).map((_, i) => ({
          id: crypto.randomUUID(),
          first_name: '',
          last_name: '',
          age: '',
          gender: '',
          race: '',
          ethnicity: '',
          zip_code: '',
          camp_day_id: campDays[0]?.id || null,
          notes: '',
          organization_id: organizationId,
          sync_status: 'synced',
          order_index: prev.length + i
        }));
        return [...newStudents, ...extraRows];
      }
      return newStudents;
    });

    // Debounce the DB write
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(() => {
      const student = studentsRef.current.find(s => id === s.id);
      if (student) updateStudent(student);
    }, 800);
  };

  const deleteStudent = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const name = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());

      // Use the same logic as the status badge in columns.tsx
      const hasData = !!(student.first_name?.trim() || student.last_name?.trim() || student.age !== '');
      const isComplete = !!(student.first_name?.trim() && student.last_name?.trim() && student.age !== '');
      
      if (filterStatus === 'completed') return matchesSearch && isComplete;
      if (filterStatus === 'incomplete_demo') return matchesSearch && (hasData && !isComplete);

      return matchesSearch;
    });
  }, [students, searchTerm, filterStatus]);

  const columns = useMemo(() => getColumns({
    handleFieldChange,
    handleKeyDown: () => {},
    deleteStudent,
    campDays,
    isDark
  }), [campDays, isDark]);

  if (loading) return (
    <PartnerLoader label="Powering Up Database..." isDark={isDark} />
  );

  return (
    <div className="partner-enter flex-1 min-h-0 flex flex-col">
      <div className="relative group flex-1 min-h-0 flex flex-col">
        <div className={cn(
          "absolute -inset-2 rounded-[4.5rem] blur-3xl opacity-0 transition-opacity duration-1000 group-hover:opacity-10 pointer-events-none",
          isDark ? "bg-blue-500" : "bg-slate-300"
        )} />
        
        <DataTable 
          columns={columns} 
          data={filteredStudents} 
          isDark={isDark} 
          toolbar={
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full group/search">
                <Search className={cn(
                  "absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 z-10", 
                  isDark 
                    ? "text-sky-700 group-hover/search:text-sky-400 group-focus-within/search:text-sky-400" 
                    : "text-sky-300 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600"
                )} size={20} />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-medium outline-none",
                    isDark 
                      ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0" 
                      : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                  )}
                />
              </div>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
                <SelectTrigger className={cn(
                  "h-10 md:w-64 rounded-xl border-2 px-10 font-semibold text-[13px] transition-all duration-500 outline-none group/filter",
                  isDark 
                    ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus:border-sky-400/50 focus:bg-sky-400/5 focus:ring-0" 
                    : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus:border-sky-500/30 focus:bg-sky-50/50 focus:ring-0"
                )}>
                  <div className="flex items-center gap-4">
                    <Filter size={18} className={cn(
                      "transition-colors duration-500",
                      isDark 
                        ? "text-sky-700 group-hover/filter:text-sky-400" 
                        : "text-sky-300 group-hover/filter:text-sky-600"
                    )} />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  sideOffset={6}
                  alignItemWithTrigger={false}
                  className={cn("rounded-2xl border-none p-2 shadow-2xl md:w-64", isDark ? "bg-slate-900 text-white" : "bg-white")}
                >
                  <SelectItem value="all" className="rounded-xl font-semibold text-[13px] py-4 px-6">All Students</SelectItem>
                  <SelectItem value="incomplete_demo" className="rounded-xl font-semibold text-[13px] py-4 px-6 text-amber-500">Incomplete Profiles</SelectItem>
                  <SelectItem value="completed" className="rounded-xl font-semibold text-[13px] py-4 px-6 text-emerald-500">Completed Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>
    </div>
  );
}
