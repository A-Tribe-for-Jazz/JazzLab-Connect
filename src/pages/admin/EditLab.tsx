import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, X, Plus, Trash2, ChevronLeft, Music, Info, Users, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function EditLab() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [instructors, setInstructors] = useState<{ id: string, full_name: string }[]>([]);
  const [availableEducators, setAvailableEducators] = useState<{ id: string, full_name: string }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity_per_session: 20,
    min_age: 10,
    max_age: 18,
  });

  useEffect(() => {
    if (!isNew) {
      fetchLab();
    }
    fetchEducators();
  }, [id]);

  const fetchLab = async () => {
    try {
      const { data: lab, error } = await supabase
        .from('labs')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      setFormData({
        name: lab.name,
        description: lab.description || '',
        capacity_per_session: lab.capacity_per_session,
        min_age: lab.min_age,
        max_age: lab.max_age,
      });

      const { data: instData } = await supabase
        .from('lab_instructors')
        .select('educator_id, profiles(full_name)')
        .eq('lab_id', id);

      if (instData) {
        setInstructors(instData.map((i: any) => ({
          id: i.educator_id,
          full_name: i.profiles.full_name
        })));
      }
    } catch (error) {
      console.error('Error fetching lab:', error);
      navigate('/admin/labs');
    } finally {
      setLoading(false);
    }
  };

  const fetchEducators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'educator');
      if (error) throw error;
      setAvailableEducators(data || []);
    } catch (error) {
      console.error('Error fetching educators:', error);
    }
  };

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
        const { error } = await supabase.from('labs').update(formData).eq('id', id);
        if (error) throw error;
      }

      if (!isNew) {
        await supabase.from('lab_instructors').delete().eq('lab_id', labId);
      }
      
      if (instructors.length > 0) {
        const instInserts = instructors.map(i => ({ lab_id: labId, educator_id: i.id }));
        await supabase.from('lab_instructors').insert(instInserts);
      }

      navigate('/admin/labs');
    } catch (error) {
      console.error('Error saving lab:', error);
    } finally {
      setSaving(false);
    }
  };

  const addInstructor = (edu: { id: string, full_name: string }) => {
    if (!instructors.find(i => i.id === edu.id)) {
      setInstructors([...instructors, edu]);
    }
  };

  const removeInstructor = (eduId: string) => {
    setInstructors(instructors.filter(i => i.id !== eduId));
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lab? This action cannot be undone.')) return;
    try {
      await supabase.from('labs').delete().eq('id', id);
      navigate('/admin/labs');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <div className="size-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Lab Profile...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-primary mb-2">
            <Link to="/admin/labs">
              <ChevronLeft size={16} className="mr-1" /> Back to Labs
            </Link>
          </Button>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            {isNew ? 'Initialize New Lab' : 'Refine Lab Architecture'}
          </h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            {isNew ? 'Configure a new JazzLab course for the upcoming program cycle.' : `Managing ${formData.name}`}
          </p>
        </div>
        {!isNew && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDelete}
            className="text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 font-bold rounded-full px-6 transition-all"
          >
            <Trash2 size={16} className="mr-2" /> DISMANTLE LAB
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Configuration */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
            <div className="flex items-center gap-3 text-primary">
              <Music size={20} />
              <CardTitle className="text-lg font-black uppercase tracking-tight">Core Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lab Identity Name</Label>
                <Input 
                  id="name"
                  required
                  placeholder="e.g. Advanced Improvisation"
                  className="h-14 text-lg font-bold border-slate-200 focus:border-primary focus:ring-primary/20 transition-all shadow-sm" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Program Narrative</Label>
                <Textarea 
                  id="description"
                  rows={4}
                  placeholder="Describe the learning objectives and syllabus for this lab..."
                  className="text-base font-medium border-slate-200 focus:border-primary focus:ring-primary/20 transition-all shadow-sm resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Constraints */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
            <div className="flex items-center gap-3 text-primary">
              <ShieldCheck size={20} />
              <CardTitle className="text-lg font-black uppercase tracking-tight">Dynamic Constraints</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity / Session</Label>
                <Input 
                  type="number" 
                  required min="1"
                  className="h-12 font-bold border-slate-200"
                  value={formData.capacity_per_session}
                  onChange={(e) => setFormData({ ...formData, capacity_per_session: parseInt(e.target.value) })}
                />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Maximum students allowed</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lower Age Limit</Label>
                <Input 
                  type="number" 
                  required min="1"
                  className="h-12 font-bold border-slate-200"
                  value={formData.min_age}
                  onChange={(e) => setFormData({ ...formData, min_age: parseInt(e.target.value) })}
                />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Inclusive minimum</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upper Age Limit</Label>
                <Input 
                  type="number" 
                  required min="1"
                  className="h-12 font-bold border-slate-200"
                  value={formData.max_age}
                  onChange={(e) => setFormData({ ...formData, max_age: parseInt(e.target.value) })}
                />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Inclusive maximum</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructor Deployment */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-primary">
                <Users size={20} />
                <CardTitle className="text-lg font-black uppercase tracking-tight">Instructor Deployment</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full font-bold border-slate-200 shadow-sm">
                    <Plus size={16} className="mr-2" /> ADD INSTRUCTOR
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-100 shadow-xl">
                  {availableEducators.filter(e => !instructors.find(i => i.id === e.id)).map(edu => (
                    <DropdownMenuItem 
                      key={edu.id} 
                      onClick={() => addInstructor(edu)}
                      className="font-bold text-slate-700 cursor-pointer py-2 px-4 focus:bg-primary/5 focus:text-primary"
                    >
                      {edu.full_name}
                    </DropdownMenuItem>
                  ))}
                  {availableEducators.filter(e => !instructors.find(i => i.id === e.id)).length === 0 && (
                    <div className="px-4 py-2 text-xs text-slate-400 font-bold uppercase tracking-widest">No available staff</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {instructors.map(inst => (
                <div key={inst.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[10px]">
                       {inst.full_name.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900">{inst.full_name}</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeInstructor(inst.id)}
                    className="size-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
              {instructors.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl space-y-3">
                   <Info size={32} className="text-slate-200" />
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No instructors deployed</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Global Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-6 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Button asChild variant="ghost" className="rounded-full px-8 font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
              <Link to="/admin/labs">Discard Changes</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={saving} 
              className="rounded-full px-12 h-14 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              {saving ? <Activity className="animate-spin mr-3" /> : <Save size={18} className="mr-3" />}
              {saving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
