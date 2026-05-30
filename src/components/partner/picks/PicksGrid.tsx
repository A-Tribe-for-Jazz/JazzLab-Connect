import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search } from 'lucide-react';
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

  // Track which students have a local save in-flight to suppress realtime echo
  const savingStudentsRef = useRef<Set<string>>(new Set());

  // Per-student save queue — serializes DB writes so rapid clicks don't overlap
  const pendingSaveRef = useRef<Map<string, Promise<void>>>(new Map());

  // Debounce map for preference realtime events — coalesces rapid delete+insert bursts
  const prefDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    fetchData();

    // ── Debounced preference re-fetch ────────────────────────────────────
    // A single toggle triggers DELETE(all) + INSERT(many), each firing a
    // realtime event.  We coalesce them so only one DB fetch occurs per
    // student per burst.
    const debouncedPrefChange = (studentId: string) => {
      // Skip our own echoes
      if (savingStudentsRef.current.has(studentId)) return;

      // Only process students that belong to this org
      const known = studentsRef.current.some(s => s.id === studentId);
      if (!known) return;

      // Clear any pending timer for this student
      const existing = prefDebounceRef.current.get(studentId);
      if (existing) clearTimeout(existing);

      // Set a new timer — fetch once after the burst settles
      const timer = setTimeout(async () => {
        prefDebounceRef.current.delete(studentId);

        const { data, error } = await supabase
          .from('preferences')
          .select('lab_id, rank')
          .eq('student_id', studentId)
          .order('rank');

        if (error) {
          console.error('Error fetching updated preferences:', error);
          return;
        }

        setStudents(prev => prev.map(s =>
          s.id === studentId ? { ...s, preferences: data || [], sync_status: 'synced' } : s
        ));
      }, 500);

      prefDebounceRef.current.set(studentId, timer);
    };

    // ── Student realtime handler ─────────────────────────────────────────
    const handleStudentRealtimeChange = async (studentId: string) => {
      const { data: student, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, age, organization_id, preferences(lab_id, rank)')
        .eq('id', studentId)
        .single();

      if (error) {
        // Student deleted — remove from list
        setStudents(prev => {
          const filtered = prev.filter(s => s.id !== studentId);
          if (filtered.length < prev.length) {
            filtered.push({
              id: crypto.randomUUID(),
              first_name: '',
              last_name: '',
              preferences: [],
              sync_status: 'synced'
            } as any);
          }
          return filtered;
        });
        return;
      }

      // Ignore students from other orgs
      if (student.organization_id !== organizationId) return;

      const isValid = !!(student.first_name?.trim() && student.last_name?.trim() && student.age !== null && student.age !== undefined && student.age !== '');

      setStudents(prev => {
        const idx = prev.findIndex(s => s.id === studentId);

        if (!isValid) {
          if (idx === -1) return prev;
          const filtered = prev.filter(s => s.id !== studentId);
          filtered.push({
            id: crypto.randomUUID(),
            first_name: '',
            last_name: '',
            preferences: [],
            sync_status: 'synced'
          } as any);
          return filtered;
        }

        const parsedStudent = {
          ...student,
          preferences: (student.preferences as any[] || []).sort((a, b) => a.rank - b.rank),
          sync_status: 'synced' as const
        };

        const newStudents = [...prev];
        if (idx !== -1) {
          newStudents[idx] = parsedStudent;
        } else {
          const emptyRowIdx = prev.findIndex(s => !s.first_name?.trim() && !s.last_name?.trim());
          if (emptyRowIdx !== -1) {
            newStudents[emptyRowIdx] = parsedStudent;
          } else {
            newStudents.push(parsedStudent);
          }
        }
        return newStudents;
      });
    };

    // ── Realtime channels ────────────────────────────────────────────────
    // Filter student changes to this org only
    const channelStudents = supabase
      .channel(`picks-students-org-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const studentId = newRecord?.id || oldRecord?.id;
          if (studentId) handleStudentRealtimeChange(studentId);
        }
      )
      .subscribe();

    // Preferences don't have org_id — we filter in the handler instead
    const channelPrefs = supabase
      .channel(`picks-prefs-org-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preferences',
        },
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;
          const studentId = newRec?.student_id || oldRec?.student_id;
          if (studentId) debouncedPrefChange(studentId);
        }
      )
      .subscribe();

    return () => {
      // Clear any pending debounce timers
      prefDebounceRef.current.forEach(timer => clearTimeout(timer));
      prefDebounceRef.current.clear();
      supabase.removeChannel(channelStudents);
      supabase.removeChannel(channelPrefs);
    };
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

  const handlePreferenceToggle = useCallback((studentId: string, labId: string) => {
    // 1. Read from ref — kept in sync synchronously below
    const student = studentsRef.current.find(s => s.id === studentId);
    if (!student) return;

    let newPrefs = [...student.preferences];
    const existingIndex = newPrefs.findIndex(p => p.lab_id === labId);

    if (existingIndex !== -1) {
      newPrefs.splice(existingIndex, 1);
      newPrefs = newPrefs.map((p, idx) => ({ ...p, rank: idx + 1 }));
    } else {
      if (newPrefs.length >= 7) return;
      newPrefs.push({ lab_id: labId, rank: newPrefs.length + 1 });
    }

    // 2. Optimistic UI — update ref SYNCHRONOUSLY so the next rapid click
    //    reads the correct preferences, then schedule React re-render
    const updated = studentsRef.current.map(s =>
      s.id === studentId ? { ...s, preferences: newPrefs, sync_status: 'saving' as const } : s
    );
    studentsRef.current = updated;
    setStudents(updated);

    // 3. Suppress realtime echo
    savingStudentsRef.current.add(studentId);

    // 4. Queue DB save — chains behind any pending save for this student
    //    so DELETE+INSERT operations never overlap
    const previousSave = pendingSaveRef.current.get(studentId) || Promise.resolve();
    const prefsToSave = [...newPrefs]; // capture for this save

    const savePromise = previousSave.then(async () => {
      try {
        const { error: delError } = await supabase.from('preferences').delete().eq('student_id', studentId);
        if (delError) throw delError;

        if (prefsToSave.length > 0) {
          const { error: insError } = await supabase.from('preferences').insert(
            prefsToSave.map(p => ({ student_id: studentId, lab_id: p.lab_id, rank: p.rank }))
          );
          if (insError) throw insError;
        }
      } catch (error) {
        console.error('Error saving preferences:', error);
        const errUpdated = studentsRef.current.map(s =>
          s.id === studentId ? { ...s, sync_status: 'error' as const } : s
        );
        studentsRef.current = errUpdated;
        setStudents(errUpdated);
      }
    });

    pendingSaveRef.current.set(studentId, savePromise);

    // Mark synced only after the LAST save in the chain completes
    savePromise.finally(() => {
      if (pendingSaveRef.current.get(studentId) === savePromise) {
        pendingSaveRef.current.delete(studentId);
        const syncedUpdated = studentsRef.current.map(s =>
          s.id === studentId ? { ...s, sync_status: 'synced' as const } : s
        );
        studentsRef.current = syncedUpdated;
        setStudents(syncedUpdated);
        setTimeout(() => savingStudentsRef.current.delete(studentId), 2000);
      }
    });
  }, []);

  const handleClearPreferences = useCallback((studentId: string) => {
    // Optimistic UI — sync ref immediately
    const updated = studentsRef.current.map(s =>
      s.id === studentId ? { ...s, preferences: [] as { lab_id: string; rank: number }[], sync_status: 'saving' as const } : s
    );
    studentsRef.current = updated;
    setStudents(updated);

    savingStudentsRef.current.add(studentId);

    // Queue behind any pending save
    const previousSave = pendingSaveRef.current.get(studentId) || Promise.resolve();

    const savePromise = previousSave.then(async () => {
      try {
        const { error } = await supabase.from('preferences').delete().eq('student_id', studentId);
        if (error) throw error;
      } catch (error) {
        console.error('Error clearing preferences:', error);
        const errUpdated = studentsRef.current.map(s =>
          s.id === studentId ? { ...s, sync_status: 'error' as const } : s
        );
        studentsRef.current = errUpdated;
        setStudents(errUpdated);
      }
    });

    pendingSaveRef.current.set(studentId, savePromise);

    savePromise.finally(() => {
      if (pendingSaveRef.current.get(studentId) === savePromise) {
        pendingSaveRef.current.delete(studentId);
        const syncedUpdated = studentsRef.current.map(s =>
          s.id === studentId ? { ...s, sync_status: 'synced' as const } : s
        );
        studentsRef.current = syncedUpdated;
        setStudents(syncedUpdated);
        setTimeout(() => savingStudentsRef.current.delete(studentId), 2000);
      }
    });
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
                  placeholder="Search students to assign picks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-semibold outline-none",
                    isDark
                      ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                      : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                  )}
                />
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
