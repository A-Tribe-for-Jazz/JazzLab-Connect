import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Filter, Info, Play, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { cn, hasAnyStudentData } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "./students/data-table";
import { getColumns, type StudentRow } from "./students/columns";
import PartnerLoader from './PartnerLoader';
import StudentDirectoryTour from './StudentDirectoryTour';
import { type BgFlavor } from '@/lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const PHANTOM_PREFIX = 'phantom-';
const isPhantom = (id: string) => id.startsWith(PHANTOM_PREFIX);
const FLUSH_INTERVAL_MS = 5_000; // Batch-save every 5 seconds

const makeEmptyRow = (orgId: string, idx: number, activeCampDayId?: string | null): StudentRow => ({
  id: `${PHANTOM_PREFIX}${crypto.randomUUID()}`,
  first_name: '',
  last_name: '',
  age: '',
  last_grade_completed: '',
  home_zip_code: '',
  race_ethnicity: '',
  gender: '',
  first_language: '',
  total_program_hours: '',
  camp_day_id: activeCampDayId || null,
  notes: '',
  organization_id: orgId,
  sync_status: 'synced',
  order_index: idx,
});

interface StudentGridProps {
  organizationId: string;
  isDark?: boolean;
  bgFlavor?: BgFlavor;
  activeCampDayId?: string | null;
  isAdmin?: boolean;
  flushRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export default function StudentGrid({
  organizationId,
  isDark = false,
  bgFlavor = 'slate',
  activeCampDayId = null,
  isAdmin = false,
  flushRef
}: StudentGridProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { childFlushRef } = useOutletContext<any>() || {};
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [maxSlots, setMaxSlots] = useState<number | null>(null);
  const [campDays, setCampDays] = useState<{ id: string, date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

  const handleNavClick = async (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    await flushToDB();
    if (path === '/partner/lab-picks' && profile?.organization_id && activeCampDayId) {
      const { data: cdo } = await supabase
        .from('camp_day_organizations')
        .select('step_2_status')
        .eq('organization_id', profile.organization_id)
        .eq('camp_day_id', activeCampDayId)
        .maybeSingle();

      if (cdo && cdo.step_2_status !== 'completed' && cdo.step_2_status !== 'in_progress') {
        await supabase
          .from('camp_day_organizations')
          .update({ step_2_status: 'in_progress' })
          .eq('organization_id', profile.organization_id)
          .eq('camp_day_id', activeCampDayId);
      }
    }
    navigate(path);
  };
  const [filterStatus, setFilterStatus] = useState(searchParams.get('filter') || 'all');
  const activeCursorsRef = useRef<{ [cellKey: string]: string }>({});
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-play Student Data guide if they haven't seen it yet
  // useEffect(() => {
  //   if (!loading && students.length > 0) {
  //     const hasSeen = localStorage.getItem('has_seen_dir_tour');
  //     if (!hasSeen) {
  //       setIsTourOpen(true);
  //     }
  //   }
  // }, [loading, students]);

  const channelRef = useRef<any>(null);
  const connectionIdRef = useRef(crypto.randomUUID());
  const studentsRef = useRef<StudentRow[]>([]);
  const dirtyRowsRef = useRef(new Set<string>());
  const pendingDeletesRef = useRef<string[]>([]);
  const isFlushingRef = useRef(false);
  const broadcastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const ownInsertsRef = useRef(new Set<string>()); // Track our own DB inserts to avoid Postgres listener duplicates
  const stateFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Debounce React state updates
  const idRemapRef = useRef<Map<string, string>>(new Map()); // Map phantom IDs to real database UUIDs

  // Keep studentsRef always current for use inside callbacks
  useEffect(() => { studentsRef.current = students; }, [students]);

  // ─── Cursor tracking (broadcast-based for speed) ────────────────────────
  const handleCellFocus = useCallback((studentId: string, field: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { senderId: connectionIdRef.current, studentId, field },
    });
  }, []);

  const handleCellBlur = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor_clear',
      payload: { senderId: connectionIdRef.current },
    });
  }, []);

  // ─── Fetch initial data from DB ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, daysRes, orgRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true }),
        supabase
          .from('camp_day_organizations')
          .select('camp_day_id, camp_days(date)')
          .eq('organization_id', organizationId),
        supabase
          .from('organizations')
          .select('max_slots')
          .eq('id', organizationId)
          .maybeSingle()
      ]);

      if (orgRes.data) {
        setMaxSlots(orgRes.data.max_slots);
      }

      if (studentsRes.data) {
        const existing = studentsRes.data
          .filter(hasAnyStudentData)
          .map((s, idx) => ({
            ...s,
            sync_status: 'synced' as const,
            order_index: s.order_index ?? idx,
            age: s.age ?? '',
            last_grade_completed: s.last_grade_completed ?? '',
            home_zip_code: s.home_zip_code ?? '',
            race_ethnicity: s.race_ethnicity ?? '',
            gender: s.gender ?? '',
            first_language: s.first_language ?? '',
            total_program_hours: s.total_program_hours ?? '',
          })) as StudentRow[];

        const filteredExisting = existing.filter(s => !activeCampDayId || s.camp_day_id === activeCampDayId);

        // Pad with empty rows based on maxSlots or default 20
        const padded = [...filteredExisting];
        const limitSlots = orgRes.data?.max_slots;
        const targetCount = (limitSlots !== null && limitSlots !== undefined && limitSlots > 0)
          ? Math.max(limitSlots, filteredExisting.length)
          : filteredExisting.length + 20;
        while (padded.length < targetCount) {
          padded.push(makeEmptyRow(organizationId, padded.length, activeCampDayId));
        }
        setStudents(padded);
      }

      if (daysRes.data) {
        setCampDays(daysRes.data.map((od: any) => ({
          id: od.camp_day_id,
          date: od.camp_days.date,
        })));
      }
    } catch (error) {
      console.error('Error fetching grid data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, activeCampDayId]);

  // ─── Batch-flush dirty rows to Supabase ─────────────────────────────────
  const flushToDB = useCallback(async () => {
    if (isFlushingRef.current) return;

    const dirtyIds = [...dirtyRowsRef.current];
    const deletes = [...pendingDeletesRef.current];
    if (dirtyIds.length === 0 && deletes.length === 0) return;

    isFlushingRef.current = true;
    dirtyRowsRef.current.clear();
    pendingDeletesRef.current = [];

    const currentStudents = studentsRef.current;

    try {
      // ── Prepare rows ────────────────────────────────────────────────────
      const phantomRows: { phantomId: string; realId: string; insertPayload: any }[] = [];
      const upsertRows: any[] = [];
      const upsertIds: string[] = [];

      for (const id of dirtyIds) {
        const student = currentStudents.find(s => s.id === id);
        if (!student) continue;

        const fields = [
          student.first_name,
          student.last_name,
          student.age,
          student.last_grade_completed,
          student.home_zip_code,
          student.race_ethnicity,
          student.gender,
          student.first_language,
          student.notes,
          ...(isAdmin ? [student.total_program_hours] : [])
        ];
        const hasData = fields.some(f => f !== '' && f !== null && f !== undefined);
        if (!hasData) continue;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sync_status, organization_id: _org, ...payload } = student;
        const ageValue =
          payload.age === '' || payload.age === null || payload.age === undefined
            ? null
            : Number(payload.age);

        const hoursValue =
          payload.total_program_hours === '' || payload.total_program_hours === null || payload.total_program_hours === undefined
            ? null
            : Number(payload.total_program_hours);

        const dbPayload = {
          ...payload,
          age: ageValue,
          total_program_hours: hoursValue,
        };

        if (isPhantom(payload.id)) {
          const realId = crypto.randomUUID();
          phantomRows.push({
            phantomId: payload.id,
            realId,
            insertPayload: {
              ...dbPayload,
              id: realId,
              organization_id: organizationId
            }
          });
        } else {
          upsertRows.push({ ...dbPayload, organization_id: organizationId });
          upsertIds.push(id);
        }
      }

      // ── Batch upsert existing rows ──────────────────────────────────────
      if (upsertRows.length > 0) {
        const { error } = await supabase.from('students').upsert(upsertRows);
        if (error) {
          console.error('Batch upsert error:', error.message);
          upsertIds.forEach(id => dirtyRowsRef.current.add(id));
        } else {
          setStudents(prev =>
            prev.map(s => upsertIds.includes(s.id) ? { ...s, sync_status: 'synced' } : s)
          );
        }
      }

      // ── Batch insert new (phantom) rows ─────────────────────────────────
      if (phantomRows.length > 0) {
        // Register in ownInsertsRef BEFORE initiating the insert request to avoid race condition with WebSocket events
        phantomRows.forEach(p => {
          ownInsertsRef.current.add(p.realId);
          setTimeout(() => ownInsertsRef.current.delete(p.realId), 10_000);
        });

        const payloads = phantomRows.map(p => p.insertPayload);
        const { data, error } = await supabase
          .from('students')
          .insert(payloads)
          .select();

        if (error) {
          console.error('Batch insert error:', error.message);
          phantomRows.forEach(p => {
            dirtyRowsRef.current.add(p.phantomId);
            ownInsertsRef.current.delete(p.realId);
          });
        } else if (data) {
          phantomRows.forEach(p => {
            idRemapRef.current.set(p.phantomId, p.realId);
            
            // Map the phantom ID in dirtyRowsRef to the real ID
            if (dirtyRowsRef.current.has(p.phantomId)) {
              dirtyRowsRef.current.delete(p.phantomId);
              dirtyRowsRef.current.add(p.realId);
            }
            
            // Map the phantom ID in pendingDeletesRef to the real ID
            const delIdx = pendingDeletesRef.current.indexOf(p.phantomId);
            if (delIdx !== -1) {
              pendingDeletesRef.current[delIdx] = p.realId;
            }
          });

          setStudents(prev => {
            let next = [...prev];
            phantomRows.forEach(p => {
              const inserted = data.find(r => r.id === p.realId);
              if (inserted) {
                next = next.map(s =>
                  s.id === p.phantomId
                    ? {
                        ...s,
                        id: inserted.id,
                        created_at: inserted.created_at,
                        updated_at: inserted.updated_at,
                        sync_status: 'synced' as const
                      }
                    : s
                );
              }
            });
            return next;
          });

          // Broadcast ID remaps
          phantomRows.forEach(p => {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'id_remap',
              payload: { senderId: connectionIdRef.current, oldId: p.phantomId, newId: p.realId },
            });
          });
        }
      }

      // ── Batch deletes ──────────────────────────────────────────────────
      const realDeletes = deletes.filter(id => !isPhantom(id));
      if (realDeletes.length > 0) {
        const { error } = await supabase.from('students').delete().in('id', realDeletes);
        if (error) console.error('Batch delete error:', error.message);
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [organizationId, activeCampDayId]);

  // Register flush function in parent context to support flush-before-navigation
  useEffect(() => {
    if (childFlushRef) {
      childFlushRef.current = flushToDB;
    }
    if (flushRef) {
      flushRef.current = flushToDB;
    }
    return () => {
      if (childFlushRef) {
        childFlushRef.current = null;
      }
      if (flushRef) {
        flushRef.current = null;
      }
    };
  }, [childFlushRef, flushRef, flushToDB]);

  // ─── Channel setup, periodic save, beforeunload ─────────────────────────
  useEffect(() => {
    fetchData();

    const connId = connectionIdRef.current;

    // Single Supabase channel: broadcast for instant sync + presence for disconnect
    const channel = supabase.channel(`collab-org-${organizationId}-day-${activeCampDayId || 'none'}`, {
      config: { presence: { key: connId } },
    });

    // ── Broadcast: cell edits (instant propagation) ───────────────────────
    channel.on('broadcast', { event: 'cell_edit' }, ({ payload }) => {
      if (payload.senderId === connId) return;

      setStudents(prev => {
        const idx = prev.findIndex(s => s.id === payload.studentId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], [payload.field]: payload.value };
          return next;
        }
        // Row from another user we haven't seen yet — replace an empty phantom slot
        const phantomIdx = prev.findIndex(
          s => isPhantom(s.id) && !hasAnyStudentData(s)
        );
        const newRow: StudentRow = {
          ...makeEmptyRow(organizationId, phantomIdx !== -1 ? phantomIdx : prev.length, activeCampDayId),
          id: payload.studentId,
          [payload.field]: payload.value,
        };
        if (phantomIdx !== -1) {
          const next = [...prev];
          next[phantomIdx] = newRow;
          return next;
        }
        return [...prev, newRow];
      });
    });

    // ── Broadcast: row deletes ────────────────────────────────────────────
    channel.on('broadcast', { event: 'row_delete' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      setStudents(prev => {
        const filtered = prev.filter(s => s.id !== payload.studentId);
        if (filtered.length === prev.length) return prev;
        filtered.push(makeEmptyRow(organizationId, filtered.length, activeCampDayId));
        return filtered;
      });
    });

    // ── Broadcast: phantom → real ID remaps ───────────────────────────────
    channel.on('broadcast', { event: 'id_remap' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      setStudents(prev =>
        prev.map(s => (s.id === payload.oldId ? { ...s, id: payload.newId } : s))
      );
      // Also remap any active cursor entries
      const cursorsCopy: { [key: string]: string } = {};
      for (const [key, val] of Object.entries(activeCursorsRef.current)) {
        cursorsCopy[key.replace(payload.oldId, payload.newId)] = val;
      }
      activeCursorsRef.current = cursorsCopy;
    });

    // ── Broadcast: cursor moves ───────────────────────────────────────────
    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      const cursors = activeCursorsRef.current;
      for (const key of Object.keys(cursors)) {
        if (cursors[key] === payload.senderId) delete cursors[key];
      }
      if (payload.studentId && payload.field) {
        cursors[`${payload.studentId}_${payload.field}`] = payload.senderId;
      }
    });

    // ── Broadcast: cursor clears ──────────────────────────────────────────
    channel.on('broadcast', { event: 'cursor_clear' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      const cursors = activeCursorsRef.current;
      for (const key of Object.keys(cursors)) {
        if (cursors[key] === payload.senderId) delete cursors[key];
      }
    });

    // ── Presence: clean up stale cursors when a user disconnects ──────────
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const leftSenders = new Set(
        (leftPresences as any[]).map(p => p.senderId).filter(Boolean)
      );
      if (leftSenders.size === 0) return;
      const cursors = activeCursorsRef.current;
      for (const key of Object.keys(cursors)) {
        if (leftSenders.has(cursors[key])) delete cursors[key];
      }
    });

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ senderId: connId });
      }
    });

    channelRef.current = channel;

    // ── Postgres changes: catch external additions (StudentForm, CSV, admin) ──
    const pgChannel = supabase
      .channel(`pg-students-org-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'students',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow?.id) return;
          // Skip our own inserts (the Postgres event arrives before React processes the ID remap)
          if (ownInsertsRef.current.has(newRow.id)) return;
          setStudents(prev => {
            if (prev.some(s => s.id === newRow.id)) return prev;
            const hasData = hasAnyStudentData(newRow);
            if (!hasData) return prev;
            if (activeCampDayId && newRow.camp_day_id !== activeCampDayId) return prev;
            const phantomIdx = prev.findIndex(
              s => isPhantom(s.id) && !hasAnyStudentData(s)
            );
            const student: StudentRow = {
              ...newRow,
              age: newRow.age ?? '',
              last_grade_completed: newRow.last_grade_completed ?? '',
              home_zip_code: newRow.home_zip_code ?? '',
              race_ethnicity: newRow.race_ethnicity ?? '',
              gender: newRow.gender ?? '',
              first_language: newRow.first_language ?? '',
              total_program_hours: newRow.total_program_hours ?? '',
              sync_status: 'synced' as const,
              order_index: phantomIdx !== -1 ? phantomIdx : prev.length,
            };
            if (phantomIdx !== -1) {
               const next = [...prev];
               next[phantomIdx] = student;
               return next;
            }
            return [...prev, student];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const updatedRow = payload.new as any;
          if (!updatedRow?.id) return;
          // Skip our own updates if we are actively editing/flushing them
          if (dirtyRowsRef.current.has(updatedRow.id)) return;

          setStudents(prev => {
            const idx = prev.findIndex(s => s.id === updatedRow.id);
            if (idx === -1) {
              const hasData = hasAnyStudentData(updatedRow);
              if (!hasData) return prev;
              if (activeCampDayId && updatedRow.camp_day_id !== activeCampDayId) return prev;

              const phantomIdx = prev.findIndex(
                s => isPhantom(s.id) && !hasAnyStudentData(s)
              );
              const student: StudentRow = {
                ...updatedRow,
                age: updatedRow.age ?? '',
                last_grade_completed: updatedRow.last_grade_completed ?? '',
                home_zip_code: updatedRow.home_zip_code ?? '',
                race_ethnicity: updatedRow.race_ethnicity ?? '',
                gender: updatedRow.gender ?? '',
                first_language: updatedRow.first_language ?? '',
                total_program_hours: updatedRow.total_program_hours ?? '',
                sync_status: 'synced' as const,
                order_index: phantomIdx !== -1 ? phantomIdx : prev.length,
              };
              if (phantomIdx !== -1) {
                const next = [...prev];
                next[phantomIdx] = student;
                return next;
              }
              return [...prev, student];
            } else {
              const next = [...prev];
              if (activeCampDayId && updatedRow.camp_day_id !== activeCampDayId) {
                const filtered = prev.filter(s => s.id !== updatedRow.id);
                filtered.push(makeEmptyRow(organizationId, filtered.length, activeCampDayId));
                return filtered;
              }
              next[idx] = {
                ...next[idx],
                ...updatedRow,
                age: updatedRow.age ?? '',
                last_grade_completed: updatedRow.last_grade_completed ?? '',
                home_zip_code: updatedRow.home_zip_code ?? '',
                race_ethnicity: updatedRow.race_ethnicity ?? '',
                gender: updatedRow.gender ?? '',
                first_language: updatedRow.first_language ?? '',
                total_program_hours: updatedRow.total_program_hours ?? '',
                sync_status: 'synced' as const,
              };
              return next;
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'students',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const oldRow = payload.old as any;
          if (!oldRow?.id) return;
          // Skip our own deletes
          if (pendingDeletesRef.current.includes(oldRow.id)) return;
          setStudents(prev => {
            if (!prev.some(s => s.id === oldRow.id)) return prev;
            const filtered = prev.filter(s => s.id !== oldRow.id);
            filtered.push(makeEmptyRow(organizationId, filtered.length, activeCampDayId));
            return filtered;
          });
        }
      )
      .subscribe();

    // ── Periodic batch save to DB ─────────────────────────────────────────
    const saveInterval = setInterval(flushToDB, FLUSH_INTERVAL_MS);

    // ── Warn on unsaved changes ───────────────────────────────────────────
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRowsRef.current.size > 0 || pendingDeletesRef.current.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(saveInterval);
      broadcastTimersRef.current.forEach(t => clearTimeout(t));
      broadcastTimersRef.current.clear();
      flushToDB();
      supabase.removeChannel(channel);
      supabase.removeChannel(pgChannel);
      channelRef.current = null;
    };
  }, [organizationId, profile, fetchData, flushToDB, flushRef]);

  // ─── Field change: local + broadcast instantly, DB later ────────────────
  const handleFieldChange = useCallback(
    (id: string, field: keyof StudentRow, value: any) => {
      // Resolve phantom ID to real ID if it has been remapped
      let targetId = id;
      if (idRemapRef.current.has(id)) {
        targetId = idRemapRef.current.get(id)!;
      }

      // 1. Update ref SYNCHRONOUSLY — CollaborativeInput shows value instantly
      //    via its own local state, so this ref is the source of truth for flush.
      const refIdx = studentsRef.current.findIndex(s => s.id === targetId);
      if (refIdx !== -1) {
        const updated = [...studentsRef.current];
        updated[refIdx] = { ...updated[refIdx], [field]: value };
        studentsRef.current = updated;
      }

      // 2. Mark dirty immediately so periodic flush saves correctly
      dirtyRowsRef.current.add(targetId);

      // 3. Debounce React state update — CollaborativeInput already shows the
      //    value instantly via localValue state, so we only need to sync React
      //    state for the status column + auto-expand. 200ms feels instant to users
      //    but reduces re-renders from "every keypress" to "every 200ms".
      if (stateFlushTimerRef.current) clearTimeout(stateFlushTimerRef.current);
      stateFlushTimerRef.current = setTimeout(() => {
        const latest = studentsRef.current; // always has most up-to-date values
        setStudents(prev => {
          const idx = prev.findIndex(s => s.id === targetId);
          if (idx === -1) return prev;
          const latestStudent = latest.find(s => s.id === targetId);
          if (!latestStudent) return prev;

          const next = [...prev];
          next[idx] = { ...prev[idx], ...latestStudent };

          // Auto-expand when near the bottom, but only if there is no slots limit set
          const limitSlots = maxSlots;
          const hasLimit = limitSlots !== null && limitSlots !== undefined && limitSlots > 0;
          if (!hasLimit && idx >= prev.length - 5) {
            const extras = Array.from({ length: 50 }).map((_, i) =>
              makeEmptyRow(organizationId, prev.length + i, activeCampDayId)
            );
            return [...next, ...extras];
          }
          return next;
        });
      }, 200);

      // 4. Debounced broadcast — coalesces rapid keystrokes into fewer messages
      const broadcastKey = `${targetId}_${String(field)}`;
      const pendingTimer = broadcastTimersRef.current.get(broadcastKey);
      if (pendingTimer) clearTimeout(pendingTimer);
      broadcastTimersRef.current.set(broadcastKey, setTimeout(() => {
        broadcastTimersRef.current.delete(broadcastKey);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'cell_edit',
          payload: { senderId: connectionIdRef.current, studentId: targetId, field, value },
        });
      }, 150));
    },
    [organizationId, activeCampDayId, maxSlots]
  );

  // ─── Delete: local + broadcast instantly, DB in next flush ──────────────
  const deleteStudent = useCallback(
    (id: string) => {
      let targetId = id;
      if (idRemapRef.current.has(id)) {
        targetId = idRemapRef.current.get(id)!;
      }

      // 1. Update local state
      setStudents(prev => {
        const filtered = prev.filter(s => s.id !== targetId);
        if (filtered.length === prev.length) return prev;
        filtered.push(makeEmptyRow(organizationId, filtered.length, activeCampDayId));
        return filtered;
      });

      // 2. Schedule DB delete (phantom rows don't need one)
      if (!isPhantom(targetId)) {
        pendingDeletesRef.current.push(targetId);
      }
      dirtyRowsRef.current.delete(targetId); // no point saving a deleted row

      // 3. Broadcast instantly
      channelRef.current?.send({
        type: 'broadcast',
        event: 'row_delete',
        payload: { senderId: connectionIdRef.current, studentId: targetId },
      });
    },
    [organizationId, activeCampDayId]
  );

  // ─── Filtered view ──────────────────────────────────────────────────────
  // Snapshot which IDs match the active filter so rows don't vanish mid-edit.
  // Only recomputed when the filter value itself changes, NOT on every keystroke.
  const filterSnapshotRef = useRef<Set<string> | null>(null);
  const lastFilterRef = useRef(filterStatus);

  const filteredStudents = useMemo(() => {
    // Recompute the snapshot only when the filter selection changes
    if (lastFilterRef.current !== filterStatus) {
      lastFilterRef.current = filterStatus;
      filterSnapshotRef.current = null;
    }

    if (filterStatus !== 'all' && (!filterSnapshotRef.current || filterSnapshotRef.current.size === 0)) {
      const ids = new Set<string>();
      students.forEach(student => {
        const { first_name, last_name, age, last_grade_completed, home_zip_code, race_ethnicity, gender, first_language, total_program_hours } = student;
        const fields = [
          first_name,
          last_name,
          age,
          last_grade_completed,
          home_zip_code,
          race_ethnicity,
          gender,
          first_language,
          ...(isAdmin ? [total_program_hours] : [])
        ];
        const hasAnyData = fields.some(f => f !== '' && f !== null && f !== undefined);
        const isAllFilled = fields.every(f => f !== '' && f !== null && f !== undefined);

        if (filterStatus === 'completed' && isAllFilled) ids.add(student.id);
        if (filterStatus === 'incomplete_demo' && hasAnyData && !isAllFilled) ids.add(student.id);
      });
      filterSnapshotRef.current = ids;
    }

    return students.filter(student => {
      const name = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (filterSnapshotRef.current) {
        return filterSnapshotRef.current.has(student.id);
      }
      return true;
    });
  }, [students, searchTerm, filterStatus]);

  const hasIncompleteRow = useMemo(() => {
    return students.some(s => {
      const isBlank = !hasAnyStudentData(s);
      if (isBlank) return false;
      const isPartiallyFilled = hasAnyStudentData(s);
      const isComplete = !!(s.first_name?.trim() && s.last_name?.trim() && s.age !== '' && s.age != null);
      return isPartiallyFilled && !isComplete;
    });
  }, [students]);

  const columns = useMemo(
    () =>
      getColumns({
        handleFieldChange,
        handleKeyDown: () => {},
        deleteStudent,
        campDays,
        isDark,
        activeCursorsRef,
        handleCellFocus,
        handleCellBlur,
        isAdmin,
      }),
    [handleFieldChange, deleteStudent, campDays, isDark, handleCellFocus, handleCellBlur, isAdmin]
  );

  if (loading) return <PartnerLoader label="Powering Up Database..." isDark={isDark} />;

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
                {/* Left Side: Search & Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  {/* Search */}
                  <div className="relative w-full sm:w-56 lg:w-52 xl:w-60 group/search">
                    <Search
                      className={cn(
                        "absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 z-10",
                        isDark
                          ? "text-sky-700 group-hover/search:text-sky-400 group-focus-within/search:text-sky-400"
                          : "text-sky-300 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600"
                      )}
                      size={20}
                    />
                    <Input
                      id="tour-search-dir"
                      placeholder="Search student..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(
                        "pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-semibold outline-none w-full",
                        isDark
                          ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                          : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                      )}
                    />
                  </div>

                  {/* Filter */}
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
                    <SelectTrigger
                      className={cn(
                        "h-10 w-full sm:w-36 lg:w-32 xl:w-40 rounded-xl border px-4 font-semibold text-[13px] transition-all duration-300 outline-none group/filter flex items-center justify-between shadow-sm shrink-0",
                        "[&_svg:last-child]:transition-all [&_svg:last-child]:duration-300 [&_svg:last-child]:opacity-40 group-hover/filter:[&_svg:last-child]:opacity-85 group-hover/filter:[&_svg:last-child]:translate-y-0.5",
                        isDark
                          ? "bg-slate-900/60 border-white/10 text-white hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-[0_0_15px_rgba(14,165,233,0.1)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-400"
                          : "bg-white border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-slate-50/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-500"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Filter
                          size={14}
                          className={cn(
                            "transition-colors duration-300 shrink-0",
                            isDark
                              ? "text-sky-500/70 group-hover/filter:text-sky-400"
                              : "text-sky-500/70 group-hover/filter:text-sky-600"
                          )}
                        />
                        <span 
                          className="truncate"
                          title={
                            filterStatus === 'all' ? 'All Students' :
                            filterStatus === 'incomplete_demo' ? 'Incomplete' :
                            filterStatus === 'completed' ? 'Completed' : ''
                          }
                        >
                          {filterStatus === 'all' && 'All Students'}
                          {filterStatus === 'incomplete_demo' && 'Incomplete'}
                          {filterStatus === 'completed' && 'Completed'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent
                      side="bottom"
                      sideOffset={8}
                      className={cn(
                        "rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] md:w-40 border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300",
                        isDark
                          ? "bg-slate-950/90 border-white/10 text-white"
                          : "bg-white/95 border-slate-100 text-slate-900"
                      )}
                    >
                      <SelectItem 
                        value="all" 
                        className={cn(
                          "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5",
                          isDark 
                            ? "focus:bg-white/5 focus:text-white" 
                            : "focus:bg-slate-50 focus:text-slate-900"
                        )}
                      >
                        All Students
                      </SelectItem>
                      <SelectItem 
                        value="incomplete_demo" 
                        className={cn(
                          "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5 text-amber-500 focus:text-amber-500",
                          isDark 
                            ? "focus:bg-amber-500/10" 
                            : "focus:bg-amber-50"
                        )}
                      >
                        Incomplete
                      </SelectItem>
                      <SelectItem 
                        value="completed" 
                        className={cn(
                          "rounded-xl font-semibold text-[13px] py-2.5 px-4 cursor-pointer transition-colors duration-200 my-0.5 text-emerald-500 focus:text-emerald-500",
                          isDark 
                            ? "focus:bg-emerald-500/10" 
                            : "focus:bg-emerald-50"
                        )}
                      >
                        Completed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Middle: Instruction message (visible on desktop) */}
                <div className="hidden lg:flex items-center justify-center gap-2 text-[12px] font-bold text-center px-4 flex-1">
                  <Info size={14} className="text-sky-500 dark:text-sky-400 shrink-0" />
                  <p className="leading-tight text-slate-500 dark:text-slate-400 font-semibold">
                    Fill out all fields for each student below. A green checkmark under <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Complete"</strong> confirms completion. Click <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Delete"</strong> to remove.
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
                      onClick={(e) => handleNavClick(e, '/partner/lab-picks')}
                      className={cn(
                        "rounded-xl h-10 px-4 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center gap-2 shrink-0",
                        isDark
                          ? "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:text-sky-350"
                          : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                      )}
                    >
                      Next: Lab Preferences
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile/Tablet Instruction Message (hidden on desktop) */}
              <div className="flex lg:hidden items-center gap-2.5 text-[12px] font-bold border-t border-slate-150 dark:border-white/5 pt-3 mt-1">
                <Info size={14} className="text-sky-500 dark:text-sky-400 shrink-0 animate-pulse" />
                <p className="leading-tight text-slate-500 dark:text-slate-400 font-semibold">
                  Fill out all fields for each student below. A green checkmark under <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Complete"</strong> confirms completion. Click <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Delete"</strong> to remove.
                </p>
              </div>
            </div>
          }
        />
      {/* Floating Guide Me / Tutorial Button (Hidden for now)
      <button
        onClick={() => setIsTourOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-11 px-4 rounded-full border shadow-xl flex items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 select-none hover:shadow-2xl",
          isDark
            ? "bg-slate-900 border-white/10 text-sky-400 hover:bg-slate-800 hover:border-sky-400/50 shadow-black/60"
            : "bg-white border-slate-200 text-sky-600 hover:bg-slate-50 hover:border-sky-500/30 shadow-slate-200/55"
        )}
        title="Play Student Data Guide"
      >
        <Play size={12} className="fill-current animate-pulse text-sky-400" />
        <span>Guide Me</span>
      </button>
      */}

      {/* Render Portal Student Data Tour */}
      {isTourOpen && (
        <StudentDirectoryTour 
          isDark={isDark} 
          onClose={() => {
            setIsTourOpen(false);
            localStorage.setItem('has_seen_dir_tour', 'true');
          }} 
        />
      )}
      </div>
    </div>
  );
}
