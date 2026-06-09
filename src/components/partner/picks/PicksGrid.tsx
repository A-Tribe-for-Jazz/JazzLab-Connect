import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Search, Info, Play, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import PartnerLoader from '../PartnerLoader';
import { DataTable } from "../students/data-table";
import { getColumns, type LabPickRow } from "./columns";
import LabPreferencesTour from './LabPreferencesTour';
import { type BgFlavor } from '@/lib/theme';

interface PicksGridProps {
  organizationId: string;
  isDark?: boolean;
  bgFlavor?: BgFlavor;
  activeCampDayId?: string | null;
  isAdmin?: boolean;
}

export default function PicksGrid({ organizationId, isDark = false, bgFlavor = 'slate', activeCampDayId = null, isAdmin = false }: PicksGridProps) {
  const { profile } = useAuth();
  const { childFlushRef } = useOutletContext<any>() || {};
  const navigate = useNavigate();
  const [students, setStudents] = useState<LabPickRow[]>([]);
  const [labs, setLabs] = useState<{ id: string; name: string; min_age: number | null; max_age: number | null }[]>([]);
  const [maxSlots, setMaxSlots] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleNavClick = async (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    await flushToDB();
    if (path === '/partner/staff' && profile?.organization_id && activeCampDayId) {
      const { data: cdo } = await supabase
        .from('camp_day_organizations')
        .select('step_3_status')
        .eq('organization_id', profile.organization_id)
        .eq('camp_day_id', activeCampDayId)
        .maybeSingle();

      if (cdo && cdo.step_3_status !== 'completed' && cdo.step_3_status !== 'in_progress') {
        await supabase
          .from('camp_day_organizations')
          .update({ step_3_status: 'in_progress' })
          .eq('organization_id', profile.organization_id)
          .eq('camp_day_id', activeCampDayId);
      }
    }
    navigate(path);
  };
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-start tutorial once loading completes if they haven't seen it yet
  // useEffect(() => {
  //   if (!loading && students.length > 0) {
  //     const hasSeen = localStorage.getItem('has_seen_lab_tour');
  //     if (!hasSeen) {
  //       setIsTourOpen(true);
  //     }
  //   }
  // }, [loading, students]);

  // Always-fresh refs so handlers inside memoized columns never go stale
  const studentsRef = useRef<LabPickRow[]>(students);
  useEffect(() => { studentsRef.current = students; }, [students]);

  const labsRef = useRef(labs);
  useEffect(() => { labsRef.current = labs; }, [labs]);

  // Track which students have a local save in-flight to suppress realtime echo
  const savingStudentsRef = useRef<Set<string>>(new Set());

  // Per-student save queue — serializes DB writes so rapid clicks don't overlap
  const pendingSaveRef = useRef<Map<string, Promise<void>>>(new Map());

  // Debounce map for preference realtime events — coalesces rapid delete+insert bursts
  const prefDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flushToDB = useCallback(async () => {
    const promises = Array.from(pendingSaveRef.current.values());
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }, []);

  useEffect(() => {
    if (childFlushRef) {
      childFlushRef.current = flushToDB;
      return () => {
        childFlushRef.current = null;
      };
    }
  }, [childFlushRef, flushToDB]);

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
        .select('id, first_name, last_name, age, camp_day_id, notes, organization_id, preferences(lab_id, rank)')
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

      const isValid = !!(
        student.first_name?.trim() &&
        student.last_name?.trim() &&
        student.age !== null &&
        student.age !== undefined &&
        student.age !== '' &&
        (!activeCampDayId || student.camp_day_id === activeCampDayId)
      );

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
  }, [organizationId, activeCampDayId]);

  const fetchData = async () => {
    try {
      const [labsRes, studentsRes, orgRes] = await Promise.all([
        supabase.from('labs').select('id, name, min_age, max_age').order('name'),
        supabase
          .from('students')
          .select('id, first_name, last_name, age, camp_day_id, notes, preferences(lab_id, rank)')
          .eq('organization_id', organizationId)
          .order('first_name'),
        supabase
          .from('organizations')
          .select('max_slots')
          .eq('id', organizationId)
          .maybeSingle()
      ]);

      if (labsRes.data) setLabs(labsRes.data);
      if (orgRes.data) setMaxSlots(orgRes.data.max_slots);

      if (studentsRes.data) {
        const existingStudents = studentsRes.data
          .filter(s => s.first_name?.trim() && s.last_name?.trim() && s.age !== null && s.age !== undefined && s.age !== '')
          .filter(s => !activeCampDayId || s.camp_day_id === activeCampDayId)
          .map(s => ({
            ...s,
            preferences: (s.preferences as any[] || []).sort((a, b) => a.rank - b.rank),
            sync_status: 'synced'
          })) as any[];

        const limitSlots = orgRes.data?.max_slots;
        const targetCount = (limitSlots !== null && limitSlots !== undefined && limitSlots > 0)
          ? Math.max(limitSlots, existingStudents.length)
          : Math.max(existingStudents.length + 20, 100);

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
      // Always allow deselection
      newPrefs.splice(existingIndex, 1);
      newPrefs = newPrefs.map((p, idx) => ({ ...p, rank: idx + 1 }));
    } else {
      // Block selection if student doesn't meet lab age requirement
      const lab = labsRef.current.find(l => l.id === labId);
      if (lab && lab.min_age != null) {
        if (student.age === '' || student.age == null) return;
        const age = Number(student.age);
        const maxAge = lab.max_age ?? 999;
        if (age < lab.min_age || age > maxAge) return;
      }
      if (newPrefs.length >= 10) return;
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

  const handleNoteSave = useCallback(async (studentId: string, notes: string) => {
    // Optimistic UI
    const updated = studentsRef.current.map(s =>
      s.id === studentId ? { ...s, notes, sync_status: 'saving' as const } : s
    );
    studentsRef.current = updated;
    setStudents(updated);

    try {
      const { error } = await supabase
        .from('students')
        .update({ notes })
        .eq('id', studentId);
      if (error) throw error;

      const synced = studentsRef.current.map(s =>
        s.id === studentId ? { ...s, sync_status: 'synced' as const } : s
      );
      studentsRef.current = synced;
      setStudents(synced);
    } catch (error) {
      console.error('Error saving notes:', error);
      const errUpdated = studentsRef.current.map(s =>
        s.id === studentId ? { ...s, sync_status: 'error' as const } : s
      );
      studentsRef.current = errUpdated;
      setStudents(errUpdated);
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
    handleNoteSave,
    isDark,
  }), [labs, isDark, handlePreferenceToggle, handleClearPreferences, handleNoteSave]);

  if (loading) return (
    <PartnerLoader label="Configuring Lab Roster..." isDark={isDark} />
  );

  return (
    <div className="partner-enter flex-1 min-h-0 flex flex-col">
      <div className="relative flex-1 min-h-0 flex flex-col">

        <DataTable
          columns={columns}
          data={filteredStudents}
          isDark={isDark}
          bgFlavor={bgFlavor}
          toolbar={
            <div className="flex flex-col gap-3 w-full">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 w-full">
                {/* Left Side: Search */}
                <div className="relative w-full sm:w-56 lg:w-52 xl:w-60 group/search shrink-0">
                  <Search className={cn(
                    "absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 z-10",
                    isDark
                      ? "text-sky-700 group-hover/search:text-sky-400 group-focus-within/search:text-sky-400"
                      : "text-sky-300 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600"
                  )} size={20} />
                  <Input
                    id="tour-search"
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      "pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-semibold outline-none w-full placeholder:truncate",
                      isDark
                        ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                        : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                    )}
                  />
                </div>

                {/* Middle: Instruction message (visible on desktop) */}
                <div className="hidden lg:flex items-center justify-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400 text-center px-4 flex-1">
                  <Info size={14} className="text-sky-500 dark:text-sky-400 shrink-0" />
                  <p className="leading-tight">
                    Select all eligible lab preferences per student by clicking cells <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>(1 = top choice)</strong>. Age-restricted labs are blocked. A green checkmark under <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Complete"</strong> confirms selections. Click <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Clear"</strong> to reset.
                  </p>
                </div>

                {/* Right Side: Back to Dashboard & Next Buttons */}
                {!isAdmin && (
                  <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-end">
                    <button
                      onClick={(e) => handleNavClick(e, '/partner/dashboard')}
                      className={cn(
                        "rounded-xl h-10 px-4 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center gap-2 shrink-0",
                        isDark
                          ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                          : "bg-white border-slate-200/60 text-slate-655 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                      )}
                    >
                      <ArrowLeft size={16} />
                      Back to Dashboard
                    </button>
                    <button
                      onClick={(e) => handleNavClick(e, '/partner/staff')}
                      className={cn(
                        "rounded-xl h-10 px-4 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center gap-2 shrink-0",
                        isDark
                          ? "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:text-sky-350"
                          : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                      )}
                    >
                      Next: Staff Data
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile/Tablet Instruction Message (hidden on desktop) */}
              <div className="flex lg:hidden items-center gap-2.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-150 dark:border-white/5 pt-3 mt-1">
                <Info size={14} className="text-sky-500 dark:text-sky-400 shrink-0 animate-pulse" />
                <p className="leading-tight">
                  Select all eligible lab preferences per student by clicking cells <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>(1 = top choice)</strong>. Age-restricted labs are blocked. A green checkmark under <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Complete"</strong> confirms selections. Click <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Clear"</strong> to reset.
                </p>
              </div>
            </div>
          }
        />
      </div>

      {/* Floating Play Guide / Tutorial Button (Hidden for now)
      <button
        onClick={() => setIsTourOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-11 px-4 rounded-full border shadow-xl flex items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 select-none hover:shadow-2xl",
          isDark
            ? "bg-slate-900 border-white/10 text-sky-400 hover:bg-slate-800 hover:border-sky-400/50 shadow-black/60"
            : "bg-white border-slate-200 text-sky-600 hover:bg-slate-50 hover:border-sky-500/30 shadow-slate-200/55"
        )}
        title="Play Guided Tutorial"
      >
        <Play size={12} className="fill-current animate-pulse text-sky-400" />
        <span>Guide Me</span>
      </button>
      */}

      {/* Render Portal Tour Animation */}
      {isTourOpen && (
        <LabPreferencesTour
          isDark={isDark}
          onClose={() => {
            setIsTourOpen(false);
            localStorage.setItem('has_seen_lab_tour', 'true');
          }}
        />
      )}


    </div>
  );
}
