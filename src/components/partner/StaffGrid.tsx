import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DataTable } from './students/data-table';
import { getColumns, type StaffRow } from './staff/columns';
import PartnerLoader from './PartnerLoader';
import { type BgFlavor } from '@/lib/theme';

const PHANTOM_PREFIX = 'phantom-';
const isPhantom = (id: string) => id.startsWith(PHANTOM_PREFIX);
const FLUSH_INTERVAL_MS = 5_000;

const makeEmptyRow = (orgId: string, idx: number): StaffRow => ({
  id: `${PHANTOM_PREFIX}${crypto.randomUUID()}`,
  name: '',
  title: '',
  email: '',
  cell: '',
  organization_id: orgId,
  sync_status: 'synced',
  order_index: idx,
});

interface StaffGridProps {
  organizationId: string;
  isDark?: boolean;
  bgFlavor?: BgFlavor;
}

export default function StaffGrid({ organizationId, isDark = false, bgFlavor = 'slate' }: StaffGridProps) {
  const { profile } = useAuth();
  const { childFlushRef } = useOutletContext<any>() || {};
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const activeCursorsRef = useRef<{ [cellKey: string]: string }>({});

  const channelRef = useRef<any>(null);
  const connectionIdRef = useRef(crypto.randomUUID());
  const staffRef = useRef<StaffRow[]>([]);
  const dirtyRowsRef = useRef(new Set<string>());
  const pendingDeletesRef = useRef<string[]>([]);
  const isFlushingRef = useRef(false);
  const broadcastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => { staffRef.current = staff; }, [staff]);

  const handleCellFocus = useCallback((staffId: string, field: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { senderId: connectionIdRef.current, staffId, field },
    });
  }, []);

  const handleCellBlur = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor_clear',
      payload: { senderId: connectionIdRef.current },
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('staff_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (data) {
        const existing = data
          .filter((s) => s.name?.trim() || s.title?.trim() || s.email?.trim() || s.cell?.trim())
          .map((s, idx) => ({
            ...s,
            sync_status: 'synced' as const,
            order_index: s.order_index ?? idx,
            name: s.name ?? '',
            title: s.title ?? '',
            email: s.email ?? '',
            cell: s.cell ?? '',
          })) as StaffRow[];

        const targetCount = Math.max(existing.length + 20, 50);
        const padded = [...existing];
        while (padded.length < targetCount) {
          padded.push(makeEmptyRow(organizationId, padded.length));
        }
        setStaff(padded);
      }
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const flushToDB = useCallback(async () => {
    if (isFlushingRef.current) return;
    const dirtyIds = [...dirtyRowsRef.current];
    const deletes = [...pendingDeletesRef.current];
    if (dirtyIds.length === 0 && deletes.length === 0) return;

    isFlushingRef.current = true;
    dirtyRowsRef.current.clear();
    pendingDeletesRef.current = [];

    const currentStaff = staffRef.current;

    try {
      const phantomRows: { phantomId: string; realId: string; insertPayload: any }[] = [];
      const upsertRows: any[] = [];
      const upsertIds: string[] = [];

      for (const id of dirtyIds) {
        const member = currentStaff.find((s) => s.id === id);
        if (!member) continue;
        const hasData = [member.name, member.title, member.email, member.cell].some(
          (f) => f !== '' && f !== null && f !== undefined
        );
        if (!hasData) continue;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sync_status, organization_id: _org, ...payload } = member;
        const dbPayload = { ...payload, organization_id: organizationId };

        if (isPhantom(payload.id)) {
          const realId = crypto.randomUUID();
          phantomRows.push({
            phantomId: payload.id,
            realId,
            insertPayload: {
              ...dbPayload,
              id: realId
            }
          });
        } else {
          upsertRows.push(dbPayload);
          upsertIds.push(id);
        }
      }

      if (upsertRows.length > 0) {
        const { error } = await supabase.from('staff_members').upsert(upsertRows);
        if (error) {
          console.error('Batch upsert error:', error.message);
          upsertIds.forEach((id) => dirtyRowsRef.current.add(id));
        } else {
          setStaff((prev) =>
            prev.map((s) => (upsertIds.includes(s.id) ? { ...s, sync_status: 'synced' } : s))
          );
        }
      }

      if (phantomRows.length > 0) {
        const payloads = phantomRows.map(p => p.insertPayload);
        const { data, error } = await supabase
          .from('staff_members')
          .insert(payloads)
          .select();

        if (error) {
          console.error('Batch insert error:', error.message);
          phantomRows.forEach(p => dirtyRowsRef.current.add(p.phantomId));
        } else if (data) {
          setStaff((prev) => {
            let next = [...prev];
            phantomRows.forEach(p => {
              const inserted = data.find(r => r.id === p.realId);
              if (inserted) {
                next = next.map((s) =>
                  s.id === p.phantomId
                    ? { ...s, ...inserted, name: inserted.name ?? '', title: inserted.title ?? '', email: inserted.email ?? '', cell: inserted.cell ?? '', sync_status: 'synced' as const }
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

      const realDeletes = deletes.filter((id) => !isPhantom(id));
      if (realDeletes.length > 0) {
        const { error } = await supabase.from('staff_members').delete().in('id', realDeletes);
        if (error) console.error('Batch delete error:', error.message);
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [organizationId]);

  // Register flush function in parent context to support flush-before-navigation
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
    const connId = connectionIdRef.current;

    const channel = supabase.channel(`collab-staff-org-${organizationId}`, {
      config: { presence: { key: connId } },
    });

    channel.on('broadcast', { event: 'cell_edit' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      setStaff((prev) => {
        const idx = prev.findIndex((s) => s.id === payload.staffId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], [payload.field]: payload.value };
          return next;
        }
        const phantomIdx = prev.findIndex(
          (s) => isPhantom(s.id) && !s.name?.trim() && !s.title?.trim() && !s.email?.trim() && !s.cell?.trim()
        );
        const newRow: StaffRow = {
          ...makeEmptyRow(organizationId, phantomIdx !== -1 ? phantomIdx : prev.length),
          id: payload.staffId,
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

    channel.on('broadcast', { event: 'row_delete' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      setStaff((prev) => {
        const filtered = prev.filter((s) => s.id !== payload.staffId);
        if (filtered.length === prev.length) return prev;
        filtered.push(makeEmptyRow(organizationId, filtered.length));
        return filtered;
      });
    });

    channel.on('broadcast', { event: 'id_remap' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      setStaff((prev) =>
        prev.map((s) => (s.id === payload.oldId ? { ...s, id: payload.newId } : s))
      );
    });

    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      const cursors = activeCursorsRef.current;
      for (const key of Object.keys(cursors)) {
        if (cursors[key] === payload.senderId) delete cursors[key];
      }
      if (payload.staffId && payload.field) {
        cursors[`${payload.staffId}_${payload.field}`] = payload.senderId;
      }
    });

    channel.on('broadcast', { event: 'cursor_clear' }, ({ payload }) => {
      if (payload.senderId === connId) return;
      const cursors = activeCursorsRef.current;
      for (const key of Object.keys(cursors)) {
        if (cursors[key] === payload.senderId) delete cursors[key];
      }
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const leftSenders = new Set(
        (leftPresences as any[]).map((p) => p.senderId).filter(Boolean)
      );
      const cursors = activeCursorsRef.current;
      for (const key of Object.keys(cursors)) {
        if (leftSenders.has(cursors[key])) delete cursors[key];
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ senderId: connId });
    });

    channelRef.current = channel;

    const saveInterval = setInterval(flushToDB, FLUSH_INTERVAL_MS);

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
      broadcastTimersRef.current.forEach((t) => clearTimeout(t));
      broadcastTimersRef.current.clear();
      flushToDB();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [organizationId, profile, fetchData, flushToDB]);

  const handleFieldChange = useCallback(
    (id: string, field: keyof StaffRow, value: any) => {
      setStaff((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        if (idx >= prev.length - 5) {
          const extras = Array.from({ length: 20 }).map((_, i) =>
            makeEmptyRow(organizationId, prev.length + i)
          );
          return [...next, ...extras];
        }
        return next;
      });

      dirtyRowsRef.current.add(id);

      const broadcastKey = `${id}_${String(field)}`;
      const pending = broadcastTimersRef.current.get(broadcastKey);
      if (pending) clearTimeout(pending);
      broadcastTimersRef.current.set(
        broadcastKey,
        setTimeout(() => {
          broadcastTimersRef.current.delete(broadcastKey);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'cell_edit',
            payload: { senderId: connectionIdRef.current, staffId: id, field, value },
          });
        }, 150)
      );
    },
    [organizationId]
  );

  const deleteStaff = useCallback(
    (id: string) => {
      setStaff((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (filtered.length === prev.length) return prev;
        filtered.push(makeEmptyRow(organizationId, filtered.length));
        return filtered;
      });
      if (!isPhantom(id)) pendingDeletesRef.current.push(id);
      dirtyRowsRef.current.delete(id);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'row_delete',
        payload: { senderId: connectionIdRef.current, staffId: id },
      });
    },
    [organizationId]
  );

  const filteredStaff = useMemo(
    () =>
      staff.filter((s) =>
        `${s.name || ''} ${s.title || ''} ${s.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [staff, searchTerm]
  );

  const columns = useMemo(
    () =>
      getColumns({
        handleFieldChange,
        deleteStaff,
        isDark,
        activeCursorsRef,
        handleCellFocus,
        handleCellBlur,
      }),
    [handleFieldChange, deleteStaff, isDark, handleCellFocus, handleCellBlur]
  );

  if (loading) return <PartnerLoader label="Loading Staff Data..." isDark={isDark} />;

  return (
    <div className="partner-enter flex-1 min-h-0 flex flex-col">
      <div className="relative flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={filteredStaff}
          isDark={isDark}
          bgFlavor={bgFlavor}
          toolbar={
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
              {/* Search */}
              <div className="relative flex-1 max-w-xs w-full group/search">
                <Search
                  className={cn(
                    'absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 z-10',
                    isDark
                      ? 'text-indigo-700 group-hover/search:text-indigo-400 group-focus-within/search:text-indigo-400'
                      : 'text-indigo-300 group-hover/search:text-indigo-600 group-focus-within/search:text-indigo-600'
                  )}
                  size={20}
                />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    'pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-semibold outline-none w-full',
                    isDark
                      ? 'bg-indigo-400/[0.03] border-white/10 text-white hover:border-indigo-400/50 hover:bg-indigo-400/5 focus-visible:border-indigo-400/50 focus-visible:ring-0'
                      : 'bg-indigo-50/20 border-slate-200 text-slate-900 hover:border-indigo-500/30 hover:bg-indigo-50/50 focus-visible:border-indigo-500/30 focus-visible:ring-0'
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
