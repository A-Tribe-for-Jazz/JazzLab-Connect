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
  gender: '',
  race: '',
  ethnicity: '',
  zip_code: '',
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
  const [activeCursors, setActiveCursors] = useState<{ [cellKey: string]: string }>({});

  // Refs ─────────────────────────────────────────────────────────────────────
  const channelRef = useRef<any>(null);
  const connectionIdRef = useRef(crypto.randomUUID());
  const studentsRef = useRef<StudentRow[]>([]);
  const dirtyRowsRef = useRef(new Set<string>());
  const pendingDeletesRef = useRef<string[]>([]);
  const isFlushingRef = useRef(false);

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
      // ── Upserts ─────────────────────────────────────────────────────────
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
          const phantomId = payload.id;
          // Strip the phantom id — let the DB generate a real UUID
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...insertPayload } = payload;

          const { data, error } = await supabase
            .from('students')
            .insert({ ...insertPayload, organization_id: organizationId, age: ageValue })
            .select()
            .single();

          if (error) {
            console.error('Insert error:', error.message);
            dirtyRowsRef.current.add(phantomId); // retry next cycle
            continue;
          }

          if (data) {
            // Remap locally
            setStudents(prev =>
              prev.map(s =>
                s.id === phantomId
                  ? { ...s, ...data, age: data.age ?? '', sync_status: 'synced' }
                  : s
              )
            );
            // Tell other clients to remap their copy of this phantom id
            channelRef.current?.send({
              type: 'broadcast',
              event: 'id_remap',
              payload: { senderId: connectionIdRef.current, oldId: phantomId, newId: data.id },
            });
          }
        } else {
          const { error } = await supabase
            .from('students')
            .upsert({ ...payload, organization_id: organizationId, age: ageValue });

          if (error) {
            console.error('Upsert error:', error.message);
            dirtyRowsRef.current.add(id); // retry
          } else {
            setStudents(prev =>
              prev.map(s => (s.id === id ? { ...s, sync_status: 'synced' } : s))
            );
          }
        }
      }

      // ── Deletes ─────────────────────────────────────────────────────────
      for (const id of deletes) {
        if (!isPhantom(id)) {
          const { error } = await supabase.from('students').delete().eq('id', id);
          if (error) console.error('Delete error:', error.message);
        }
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
      setActiveCursors(prev => {
        const next: typeof prev = {};
        for (const [key, val] of Object.entries(prev)) {
          next[key.replace(payload.oldId, payload.newId)] = val;
        }
        return next;
      });
    });

    // ── Broadcast: cursor moves ───────────────────────────────────────────
    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      setActiveCursors(prev => {
        const next = { ...prev };
        // Clear old positions for this sender
        for (const key of Object.keys(next)) {
          if (next[key] === payload.senderId) delete next[key];
        }
        // Set new position
        if (payload.studentId && payload.field) {
          next[`${payload.studentId}_${payload.field}`] = payload.senderId;
        }
        return next;
      });
    });

    // ── Broadcast: cursor clears ──────────────────────────────────────────
    channel.on('broadcast', { event: 'cursor_clear' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      setActiveCursors(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key] === payload.senderId) delete next[key];
        }
        return next;
      });
    });

    // ── Presence: clean up stale cursors when a user disconnects ──────────
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const leftSenders = new Set(
        (leftPresences as any[]).map(p => p.senderId).filter(Boolean)
      );
      if (leftSenders.size === 0) return;
      setActiveCursors(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (leftSenders.has(next[key])) delete next[key];
        }
        return next;
      });
    });

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ senderId: connId });
      }
    });

    channelRef.current = channel;

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
      // Best-effort final flush on unmount
      flushToDB();
      supabase.removeChannel(channel);
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

      // 3. Broadcast to other users — arrives in < 100ms over WebSocket
      channelRef.current?.send({
        type: 'broadcast',
        event: 'cell_edit',
        payload: { senderId: connectionIdRef.current, studentId: id, field, value },
      });
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
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const name = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());

      const hasData = !!(student.first_name?.trim() || student.last_name?.trim() || student.age !== '');
      const isComplete = !!(student.first_name?.trim() && student.last_name?.trim() && student.age !== '');

      if (filterStatus === 'completed') return matchesSearch && isComplete;
      if (filterStatus === 'incomplete_demo') return matchesSearch && (hasData && !isComplete);

      return matchesSearch;
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
        activeCursors,
        handleCellFocus,
        handleCellBlur,
      }),
    [handleFieldChange, deleteStudent, campDays, isDark, activeCursors, handleCellFocus, handleCellBlur]
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
                    "pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-medium outline-none",
                    isDark
                      ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                      : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                  )}
                />
              </div>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
                <SelectTrigger
                  className={cn(
                    "h-10 md:w-64 rounded-xl border-2 px-10 font-semibold text-[13px] transition-all duration-500 outline-none group/filter",
                    isDark
                      ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus:border-sky-400/50 focus:bg-sky-400/5 focus:ring-0"
                      : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus:border-sky-500/30 focus:bg-sky-50/50 focus:ring-0"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Filter
                      size={18}
                      className={cn(
                        "transition-colors duration-500",
                        isDark
                          ? "text-sky-700 group-hover/filter:text-sky-400"
                          : "text-sky-300 group-hover/filter:text-sky-600"
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
                  sideOffset={6}
                  alignItemWithTrigger={false}
                  className={cn(
                    "rounded-2xl border-none p-2 shadow-2xl md:w-64",
                    isDark ? "bg-slate-900 text-white" : "bg-white"
                  )}
                >
                  <SelectItem value="all" className="rounded-xl font-semibold text-[13px] py-4 px-6">
                    All Students
                  </SelectItem>
                  <SelectItem value="incomplete_demo" className="rounded-xl font-semibold text-[13px] py-4 px-6 text-amber-500">
                    Incomplete Profiles
                  </SelectItem>
                  <SelectItem value="completed" className="rounded-xl font-semibold text-[13px] py-4 px-6 text-emerald-500">
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
