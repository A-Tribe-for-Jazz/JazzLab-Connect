import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
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

// ─── Constants ────────────────────────────────────────────────────────────────
const PHANTOM_PREFIX = 'phantom-';
const isPhantom = (id: string) => id.startsWith(PHANTOM_PREFIX);
const FLUSH_INTERVAL_MS = 5_000; // Batch-save every 5 seconds

const makeEmptyRow = (orgId: string, idx: number): StudentRow => ({
  id: `${PHANTOM_PREFIX}${crypto.randomUUID()}`,
  first_name: '',
  last_name: '',
  age: '',
  camp_day_id: null,
  notes: '',
  organization_id: orgId,
  sync_status: 'synced',
  order_index: idx,
});

interface StudentGridProps {
  organizationId: string;
  isDark?: boolean;
}

export default function StudentGrid({ organizationId, isDark = false }: StudentGridProps) {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [campDays, setCampDays] = useState<{ id: string, date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('filter') || 'all');
  const activeCursorsRef = useRef<{ [cellKey: string]: string }>({});

  // Refs ─────────────────────────────────────────────────────────────────────
  const channelRef = useRef<any>(null);
  const connectionIdRef = useRef(crypto.randomUUID());
  const studentsRef = useRef<StudentRow[]>([]);
  const dirtyRowsRef = useRef(new Set<string>());
  const pendingDeletesRef = useRef<string[]>([]);
  const isFlushingRef = useRef(false);
  const broadcastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
      const [studentsRes, daysRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true }),
        supabase
          .from('camp_day_organizations')
          .select('camp_day_id, camp_days(date)')
          .eq('organization_id', organizationId),
      ]);

      if (studentsRes.data) {
        const existing = studentsRes.data
          .filter(s => s.first_name?.trim() || s.last_name?.trim())
          .map((s, idx) => ({
            ...s,
            sync_status: 'synced' as const,
            order_index: s.order_index ?? idx,
            age: s.age ?? '',
          })) as StudentRow[];

        const targetCount = Math.max(existing.length + 20, 100);
        const padded = [...existing];
        while (padded.length < targetCount) {
          padded.push(makeEmptyRow(organizationId, padded.length));
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
  }, [organizationId]);

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
      const phantomRows: { phantomId: string; insertPayload: any }[] = [];
      const upsertRows: any[] = [];
      const upsertIds: string[] = [];

      for (const id of dirtyIds) {
        const student = currentStudents.find(s => s.id === id);
        if (!student) continue;

        const hasData = !!(student.first_name?.trim() || student.last_name?.trim() || student.age !== '');
        if (!hasData) continue;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sync_status, organization_id: _org, ...payload } = student;
        const ageValue =
          payload.age === '' || payload.age === null || payload.age === undefined
            ? null
            : Number(payload.age);

        if (isPhantom(payload.id)) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...insertPayload } = payload;
          phantomRows.push({ phantomId: payload.id, insertPayload: { ...insertPayload, organization_id: organizationId, age: ageValue } });
        } else {
          upsertRows.push({ ...payload, organization_id: organizationId, age: ageValue });
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

      // ── Individual inserts for phantom rows (need ID remap) ─────────────
      for (const { phantomId, insertPayload } of phantomRows) {
        const { data, error } = await supabase
          .from('students')
          .insert(insertPayload)
          .select()
          .single();

        if (error) {
          console.error('Insert error:', error.message);
          dirtyRowsRef.current.add(phantomId);
          continue;
        }

        if (data) {
          setStudents(prev =>
            prev.map(s =>
              s.id === phantomId
                ? { ...s, ...data, age: data.age ?? '', sync_status: 'synced' }
                : s
            )
          );
          channelRef.current?.send({
            type: 'broadcast',
            event: 'id_remap',
            payload: { senderId: connectionIdRef.current, oldId: phantomId, newId: data.id },
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
  }, [organizationId]);

  // ─── Channel setup, periodic save, beforeunload ─────────────────────────
  useEffect(() => {
    fetchData();

    const connId = connectionIdRef.current;

    // Single Supabase channel: broadcast for instant sync + presence for disconnect
    const channel = supabase.channel(`collab-org-${organizationId}`, {
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
          s => isPhantom(s.id) && !s.first_name?.trim() && !s.last_name?.trim() && s.age === ''
        );
        const newRow: StudentRow = {
          ...makeEmptyRow(organizationId, phantomIdx !== -1 ? phantomIdx : prev.length),
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
        filtered.push(makeEmptyRow(organizationId, filtered.length));
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
          // Skip if already in local state (our own flush inserts)
          setStudents(prev => {
            if (prev.some(s => s.id === newRow.id)) return prev;
            const hasData = !!(newRow.first_name?.trim() || newRow.last_name?.trim());
            if (!hasData) return prev;
            const phantomIdx = prev.findIndex(
              s => isPhantom(s.id) && !s.first_name?.trim() && !s.last_name?.trim() && s.age === ''
            );
            const student: StudentRow = {
              ...newRow,
              age: newRow.age ?? '',
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
            filtered.push(makeEmptyRow(organizationId, filtered.length));
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
  }, [organizationId, profile, fetchData, flushToDB]);

  // ─── Field change: local + broadcast instantly, DB later ────────────────
  const handleFieldChange = useCallback(
    (id: string, field: keyof StudentRow, value: any) => {
      // 1. Update local state immediately
      setStudents(prev => {
        const idx = prev.findIndex(s => s.id === id);
        if (idx === -1) return prev;

        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };

        // Auto-expand when near the bottom
        if (idx >= prev.length - 5) {
          const extras = Array.from({ length: 50 }).map((_, i) =>
            makeEmptyRow(organizationId, prev.length + i)
          );
          return [...next, ...extras];
        }
        return next;
      });

      // 2. Mark dirty for the next periodic save
      dirtyRowsRef.current.add(id);

      // 3. Debounced broadcast — coalesces rapid keystrokes into fewer messages
      const broadcastKey = `${id}_${String(field)}`;
      const pendingTimer = broadcastTimersRef.current.get(broadcastKey);
      if (pendingTimer) clearTimeout(pendingTimer);
      broadcastTimersRef.current.set(broadcastKey, setTimeout(() => {
        broadcastTimersRef.current.delete(broadcastKey);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'cell_edit',
          payload: { senderId: connectionIdRef.current, studentId: id, field, value },
        });
      }, 150));
    },
    [organizationId]
  );

  // ─── Delete: local + broadcast instantly, DB in next flush ──────────────
  const deleteStudent = useCallback(
    (id: string) => {
      // 1. Update local state
      setStudents(prev => {
        const filtered = prev.filter(s => s.id !== id);
        if (filtered.length === prev.length) return prev;
        filtered.push(makeEmptyRow(organizationId, filtered.length));
        return filtered;
      });

      // 2. Schedule DB delete (phantom rows don't need one)
      if (!isPhantom(id)) {
        pendingDeletesRef.current.push(id);
      }
      dirtyRowsRef.current.delete(id); // no point saving a deleted row

      // 3. Broadcast instantly
      channelRef.current?.send({
        type: 'broadcast',
        event: 'row_delete',
        payload: { senderId: connectionIdRef.current, studentId: id },
      });
    },
    [organizationId]
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
        const hasData = !!(student.first_name?.trim() || student.last_name?.trim() || student.age !== '');
        const isComplete = !!(student.first_name?.trim() && student.last_name?.trim() && student.age !== '');

        if (filterStatus === 'completed' && isComplete) ids.add(student.id);
        if (filterStatus === 'incomplete_demo' && hasData && !isComplete) ids.add(student.id);
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
      }),
    [handleFieldChange, deleteStudent, campDays, isDark, handleCellFocus, handleCellBlur]
  );

  if (loading) return <PartnerLoader label="Powering Up Database..." isDark={isDark} />;

  return (
    <div className="partner-enter flex-1 min-h-0 flex flex-col">
      <div className="relative group flex-1 min-h-0 flex flex-col">
        <div
          className={cn(
            "absolute -inset-2 rounded-[4.5rem] blur-3xl opacity-0 transition-opacity duration-1000 group-hover:opacity-10 pointer-events-none",
            isDark ? "bg-blue-500" : "bg-slate-300"
          )}
        />

        <DataTable
          columns={columns}
          data={filteredStudents}
          isDark={isDark}
          toolbar={
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full group/search">
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
                  placeholder="Search students..."
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

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
                <SelectTrigger
                  className={cn(
                    "h-10 md:w-64 rounded-xl border px-4 font-semibold text-[13px] transition-all duration-300 outline-none group/filter flex items-center justify-between w-full shadow-sm",
                    "[&_svg:last-child]:transition-all [&_svg:last-child]:duration-300 [&_svg:last-child]:opacity-40 group-hover/filter:[&_svg:last-child]:opacity-85 group-hover/filter:[&_svg:last-child]:translate-y-0.5",
                    isDark
                      ? "bg-slate-900/60 border-white/10 text-white hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-[0_0_15px_rgba(14,165,233,0.1)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-400"
                      : "bg-white border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-slate-50/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] focus:border-sky-500/50 focus:ring-0 [&_svg:last-child]:text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Filter
                      size={16}
                      className={cn(
                        "transition-colors duration-300 shrink-0",
                        isDark
                          ? "text-sky-500/70 group-hover/filter:text-sky-400"
                          : "text-sky-500/70 group-hover/filter:text-sky-600"
                      )}
                    />
                    <span className="truncate">
                      {filterStatus === 'all' && 'All Students'}
                      {filterStatus === 'incomplete_demo' && 'Incomplete Profiles'}
                      {filterStatus === 'completed' && 'Completed Profiles'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  sideOffset={8}
                  className={cn(
                    "rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] md:w-64 border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300",
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
                    Incomplete Profiles
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
                    Completed Profiles
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>
    </div>
  );
}
