import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import PartnerLoader from '../PartnerLoader';
import { DataTable } from "../students/data-table";
import { getColumns, type LabPickRow } from "./columns";

interface PicksGridProps {
  organizationId: string;
  isDark?: boolean;
}

export default function PicksGrid({ organizationId, isDark = false }: PicksGridProps) {
  const [students, setStudents] = useState<LabPickRow[]>([]);
  const [labs, setLabs] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Always-fresh ref so handlers inside memoized columns never go stale
  const studentsRef = useRef<LabPickRow[]>(students);
  useEffect(() => { studentsRef.current = students; }, [students]);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      const [labsRes, studentsRes] = await Promise.all([
        supabase.from('labs').select('id, name').order('name'),
        supabase
          .from('students')
          .select('id, first_name, last_name, age, preferences(lab_id, rank)')
          .eq('organization_id', organizationId)
          .order('first_name')
      ]);

      if (labsRes.data) setLabs(labsRes.data);
      if (studentsRes.data) {
        const existingStudents = studentsRes.data
          .filter(s => s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== '')
          .map(s => ({
            ...s,
            preferences: (s.preferences as any[] || []).sort((a, b) => a.rank - b.rank),
            sync_status: 'synced'
          })) as any[];

        // Excel-style: 100 rows
        const targetCount = Math.max(existingStudents.length + 20, 100);

        const paddedStudents = [...existingStudents];
        while (paddedStudents.length < targetCount) {
          paddedStudents.push({
            id: crypto.randomUUID(),
            first_name: '',
            last_name: '',
            preferences: [],
            sync_status: 'synced'
          });
        }
        setStudents(paddedStudents);
      }
    } catch (error) {
      console.error('Error fetching picks data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceToggle = useCallback(async (studentId: string, labId: string) => {
    const student = studentsRef.current.find(s => s.id === studentId);
    if (!student) return;

    let newPrefs = [...student.preferences];
    const existingIndex = newPrefs.findIndex(p => p.lab_id === labId);

    if (existingIndex !== -1) {
      newPrefs.splice(existingIndex, 1);
      newPrefs = newPrefs.map((p, idx) => ({ ...p, rank: idx + 1 }));
    } else {
      if (newPrefs.length >= 5) return;
      newPrefs.push({ lab_id: labId, rank: newPrefs.length + 1 });
    }

    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, preferences: newPrefs, sync_status: 'saving' } : s
    ));

    try {
      const { error: delError } = await supabase.from('preferences').delete().eq('student_id', studentId);
      if (delError) throw delError;

      if (newPrefs.length > 0) {
        const { error: insError } = await supabase.from('preferences').insert(
          newPrefs.map(p => ({ student_id: studentId, lab_id: p.lab_id, rank: p.rank }))
        );
        if (insError) throw insError;
      }

      setStudents(prev => prev.map(s =>
        s.id === studentId ? { ...s, sync_status: 'synced' } : s
      ));
    } catch (error) {
      console.error('Error saving preferences:', error);
      setStudents(prev => prev.map(s =>
        s.id === studentId ? { ...s, sync_status: 'error' } : s
      ));
    }
  }, []); // stable — reads live state via studentsRef

  const handleClearPreferences = useCallback(async (studentId: string) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, preferences: [], sync_status: 'saving' } : s
    ));

    try {
      const { error } = await supabase.from('preferences').delete().eq('student_id', studentId);
      if (error) throw error;

      setStudents(prev => prev.map(s =>
        s.id === studentId ? { ...s, sync_status: 'synced' } : s
      ));
    } catch (error) {
      console.error('Error clearing preferences:', error);
      setStudents(prev => prev.map(s =>
        s.id === studentId ? { ...s, sync_status: 'error' } : s
      ));
    }
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const name = `${student.first_name} ${student.last_name}`.toLowerCase();
      return name.includes(searchTerm.toLowerCase());
    });
  }, [students, searchTerm]);

  const columns = useMemo(() => getColumns({
    labs,
    handlePreferenceToggle,
    handleClearPreferences,
    isDark
  }), [labs, isDark, handlePreferenceToggle, handleClearPreferences]);

  if (loading) return (
    <PartnerLoader label="Configuring Lab Roster..." isDark={isDark} />
  );

  return (
    <div className="partner-enter flex-1 min-h-0 flex flex-col">
      <div className="relative group flex-1 min-h-0 flex flex-col">
        {/* Outer glow — identical to StudentGrid */}
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
              {/* Search — identical to StudentGrid */}
              <div className="relative flex-1 w-full group/search">
                <Search className={cn(
                  "absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 z-10",
                  isDark
                    ? "text-sky-700 group-hover/search:text-sky-400 group-focus-within/search:text-sky-400"
                    : "text-sky-300 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600"
                )} size={20} />
                <Input
                  placeholder="Search students to assign picks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-base font-medium outline-none",
                    isDark
                      ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                      : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                  )}
                />
              </div>

              {/* Hint pill — same h-10, rounded-xl, border-2 as StudentGrid filter */}
              <div className={cn(
                "h-10 hidden md:flex items-center gap-3 px-6 rounded-xl border-2 shrink-0",
                isDark
                  ? "bg-black/40 border-white/10 text-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              )}>
                <SlidersHorizontal size={16} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Select 1–5 In Order</span>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
