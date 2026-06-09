import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X, SlidersHorizontal, Microscope, Users, Trash2, Mail, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function EditLab() {
  const { isDark }: any = useOutletContext();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([]);
  const [allEducators, setAllEducators] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedEducatorId, setSelectedEducatorId] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    capacity_per_session: 20,
    min_age: 10,
    max_age: 18,
  });

  useEffect(() => {
    fetchEducators();
    if (!isNew) fetchLab();
  }, [id]);

  const fetchEducators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'educator')
        .order('full_name');
      if (error) throw error;
      if (data) setAllEducators(data);
    } catch (err) {
      console.error('Error fetching educators:', err);
    }
  };

  const fetchLab = async () => {
    try {
      const { data: lab, error } = await supabase.from('labs').select('*').eq('id', id).single();
      if (error) throw error;
      setFormData({
        name: lab.name,
        capacity_per_session: lab.capacity_per_session,
        min_age: lab.min_age,
        max_age: lab.max_age,
      });
      const { data: instData } = await supabase
        .from('lab_instructors')
        .select('educator_id, profiles(full_name)')
        .eq('lab_id', id);
      if (instData) {
        setInstructors(instData.map((i: any) => ({ id: i.educator_id, full_name: i.profiles.full_name })));
      }
    } catch {
      navigate('/admin/labs');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: 'educator',
          fullName: inviteName.trim(),
          labId: id || undefined
        })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to send invite');
      
      setInviteMessage({ type: 'success', text: `Invited ${inviteEmail}` });
      if (resData.user?.user) {
        setInstructors(prev => [...prev, { id: resData.user.user.id, full_name: inviteName.trim() }]);
        // Add to allEducators list as well so it registers locally
        setAllEducators(prev => [...prev, { id: resData.user.user.id, full_name: inviteName.trim() }]);
      }
      setInviteEmail('');
      setInviteName('');
    } catch (err: any) {
      setInviteMessage({ type: 'error', text: err.message || 'Error sending invite' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddExistingEducator = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedEducatorId) return;
    const selected = allEducators.find(edu => edu.id === selectedEducatorId);
    if (selected && !instructors.some(inst => inst.id === selected.id)) {
      setInstructors(prev => [...prev, selected]);
      setSelectedEducatorId('');
    }
  };

  const availableEducators = allEducators.filter(
    edu => !instructors.some(inst => inst.id === edu.id)
  );


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let labId = id;
      if (isNew) {
        const { data, error } = await supabase.from('labs').insert(formData).select().single();
        if (error) throw error;
        labId = data.id;
      } else {
        await supabase.from('labs').update(formData).eq('id', id);
      }
      await supabase.from('lab_instructors').delete().eq('lab_id', labId);
      if (instructors.length > 0) {
        await supabase.from('lab_instructors').insert(
          instructors.map(i => ({ lab_id: labId, educator_id: i.id }))
        );
      }
      navigate('/admin/labs');
    } catch (err) {
      console.error('Error saving lab:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete "${formData.name}"? This cannot be undone.`)) return;
    try {
      // 1. Clean up instructor assignments to prevent foreign key constraint violations
      await supabase.from('lab_instructors').delete().eq('lab_id', id);

      // 2. Clean up day placements associated with this lab to avoid foreign key violations
      await supabase.from('day_placements').delete().eq('lab_id', id);

      // 3. Delete the lab itself
      const { error } = await supabase.from('labs').delete().eq('id', id);
      if (error) throw error;

      navigate('/admin/labs');
    } catch (err) {
      console.error('Error deleting lab:', err);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center flex-col gap-4',
        isDark ? 'bg-black text-white' : 'bg-white text-slate-900'
      )}>
        <div className={cn(
          'size-10 border-[3px] rounded-full animate-spin',
          isDark ? 'border-white/10 border-t-white' : 'border-slate-200 border-t-slate-900'
        )} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Loading...</p>
      </div>
    );
  }

  const inputCls = cn(
    'h-10 border rounded-xl text-xs font-semibold transition-all',
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/40 focus-visible:ring-0'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:border-sky-400 focus-visible:ring-0'
  );

  const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400';

  // ─── Page ─────────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'fixed inset-0 z-[60] flex flex-col overflow-hidden',
      isDark ? 'bg-black text-white' : 'bg-white text-slate-900'
    )}>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className={cn(
        'grid grid-cols-3 items-center px-8 h-16 border-b shrink-0',
        isDark ? 'border-white/10' : 'border-slate-200'
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'size-9 rounded-xl flex items-center justify-center shrink-0 border',
            isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
          )}>
            <SlidersHorizontal size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isNew ? 'New Lab' : 'Manage Lab'}
            </p>
            <h2 className={cn(
              'text-sm font-black tracking-tight leading-none truncate',
              isDark ? 'text-white' : 'text-slate-900'
            )}>
              {isNew ? 'Create a new lab module' : formData.name}
            </h2>
          </div>
        </div>

        <div />

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/labs')}
            className={cn(
              'size-9 rounded-xl flex items-center justify-center border transition-all duration-200',
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            <X size={15} className="stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <form
          onSubmit={handleSubmit}
          className="h-full flex flex-col max-w-5xl mx-auto w-full px-6 py-6 gap-6"
        >
          {/* Two-column grid */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Settings stacked ─────────────────────────────────────── */}
            <div className="flex flex-col gap-5 overflow-y-auto pr-1">

              {/* Lab Name */}
              <div className="space-y-1.5">
                <Label htmlFor="lab_name" className={labelCls}>Lab Name</Label>
                <div className="relative">
                  <Microscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    id="lab_name"
                    required
                    placeholder="e.g. Advanced Improvisation"
                    className={cn(inputCls, 'pl-9')}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Capacity */}
              <div className="space-y-1.5">
                <Label htmlFor="capacity" className={labelCls}>Capacity per Session</Label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    id="capacity"
                    type="number"
                    required
                    min={1}
                    className={cn(inputCls, 'pl-9')}
                    value={formData.capacity_per_session}
                    onChange={e => setFormData({ ...formData, capacity_per_session: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {/* Age Range */}
              <div className="space-y-1.5">
                <Label className={labelCls}>Age Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className={cn('text-[10px] font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>Minimum</p>
                    <Input
                      id="min_age"
                      type="number"
                      required
                      min={1}
                      className={inputCls}
                      value={formData.min_age}
                      onChange={e => setFormData({ ...formData, min_age: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className={cn('text-[10px] font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>Maximum</p>
                    <Input
                      id="max_age"
                      type="number"
                      required
                      min={1}
                      className={inputCls}
                      value={formData.max_age}
                      onChange={e => setFormData({ ...formData, max_age: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className={cn('border-t', isDark ? 'border-white/5' : 'border-slate-100')} />

              {/* Assign Existing Instructor */}
              <div className="space-y-1.5">
                <Label className={labelCls}>Assign Existing Instructor</Label>
                <div className="flex gap-2">
                  <select
                    value={selectedEducatorId}
                    onChange={e => setSelectedEducatorId(e.target.value)}
                    className={cn(
                      inputCls,
                      'px-3 flex-1',
                      isDark ? '!bg-zinc-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    )}
                  >
                    <option value="">Select an educator...</option>
                    {availableEducators.map(edu => (
                      <option key={edu.id} value={edu.id}>
                        {edu.full_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={handleAddExistingEducator}
                    disabled={!selectedEducatorId}
                    className={cn(
                      'rounded-xl h-10 px-4 font-semibold text-xs transition-all border shrink-0',
                      isDark
                        ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20'
                        : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                    )}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Divider */}
              <div className={cn('border-t', isDark ? 'border-white/5' : 'border-slate-100')} />

              {/* Invite Instructor */}
              <div className="space-y-1.5">
                <Label className={labelCls}>Invite Instructor</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <GraduationCap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Albert Einstein"
                      className={cn(inputCls, 'pl-9')}
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        className={cn(inputCls, 'pl-9')}
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={inviteLoading}
                      onClick={handleInvite}
                      className={cn(
                        'rounded-xl h-10 px-4 font-semibold text-xs transition-all border shrink-0',
                        isDark
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20'
                          : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                      )}
                    >
                      {inviteLoading ? 'Sending...' : 'Invite'}
                    </Button>
                  </div>
                </div>
                {inviteMessage && (
                  <p className={cn(
                    'text-[11px] font-semibold mt-1',
                    inviteMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                    {inviteMessage.text}
                  </p>
                )}
              </div>

              {/* Danger Zone */}
              {!isNew && (
                <>
                  <div className={cn('border-t', isDark ? 'border-white/5' : 'border-slate-100')} />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Danger Zone</p>
                    <p className={cn('text-[11px] leading-snug', isDark ? 'text-slate-500' : 'text-slate-400')}>
                      Permanently delete this lab and remove all instructor assignments.
                    </p>
                    <Button
                      type="button"
                      onClick={handleDelete}
                      className="mt-1 rounded-xl h-9 px-4 text-xs font-semibold border bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all w-full"
                    >
                      <Trash2 size={12} className="mr-1.5" />
                      Delete Lab
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* ── Right: Assigned Instructors ────────────────────────────────── */}
            <div className={cn(
              'rounded-2xl border flex flex-col min-h-0 overflow-hidden',
              isDark ? 'border-white/10 bg-white/[0.01]' : 'border-slate-200 bg-slate-50/40'
            )}>
              {/* Panel header */}
              <div className={cn(
                'px-4 py-3 border-b shrink-0',
                isDark ? 'border-white/10' : 'border-slate-200'
              )}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Instructors</p>
                <p className={cn('text-[11px] mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  {instructors.length === 0
                    ? 'No instructors assigned yet'
                    : `${instructors.length} instructor${instructors.length > 1 ? 's' : ''} assigned`}
                </p>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {instructors.length > 0 ? (
                  <div className={cn('divide-y', isDark ? 'divide-white/5' : 'divide-slate-100')}>
                    {instructors.map(inst => {
                      const initials = inst.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <div key={inst.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'size-8 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0',
                              isDark ? 'bg-slate-900 border-white/10 text-sky-400' : 'bg-sky-50 border-sky-100 text-sky-700'
                            )}>
                              {initials}
                            </div>
                            <div>
                              <p className={cn('text-[13px] font-semibold leading-none', isDark ? 'text-white' : 'text-slate-900')}>
                                {inst.full_name}
                              </p>
                              <p className={cn('text-[10px] mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>Instructor</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInstructors(p => p.filter(i => i.id !== inst.id))}
                            className={cn(
                              'size-7 rounded-lg flex items-center justify-center border transition-all',
                              isDark
                                ? 'border-white/10 text-slate-500 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400'
                                : 'border-slate-200 text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500'
                            )}
                          >
                            <X size={12} className="stroke-[2.5]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 opacity-30">
                    <Users size={32} className="mb-3 text-slate-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No instructors yet</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Footer ─────────────────────────────────────────────────────────── */}
          <div className={cn(
            'flex items-center justify-end gap-3 pt-4 border-t shrink-0',
            isDark ? 'border-white/5' : 'border-slate-100'
          )}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/admin/labs')}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold text-xs transition-all border border-transparent',
                isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold text-xs transition-all border shadow-sm',
                isDark
                  ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/40'
                  : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
              )}
            >
              {saving ? 'Saving...' : isNew ? 'Add Lab' : 'Save Changes'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
