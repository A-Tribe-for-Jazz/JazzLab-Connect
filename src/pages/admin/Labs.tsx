import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Users, Music, Layers, UserCircle, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Lab {
  id: string;
  name: string;
  description: string;
  capacity_per_session: number;
  min_age: number;
  max_age: number;
  instructors: string[];
}

export default function AdminLabs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('labs')
        .select(`
          id, name, description, capacity_per_session, min_age, max_age,
          lab_instructors(
            profiles(full_name)
          )
        `);

      if (error) throw error;

      const formatted = (data || []).map((lab: any) => ({
        id: lab.id,
        name: lab.name,
        description: lab.description,
        capacity_per_session: lab.capacity_per_session,
        min_age: lab.min_age,
        max_age: lab.max_age,
        instructors: lab.lab_instructors?.map((li: any) => li.profiles?.full_name).filter(Boolean) || [],
      }));

      setLabs(formatted);
    } catch (error) {
      console.error('Error fetching labs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the lab "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('labs').delete().eq('id', id);
      if (error) throw error;
      setLabs(labs.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting lab:', error);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Program Labs</h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            Configure the educational modules, session capacities, and instructor assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="rounded-full px-6 shadow-lg shadow-slate-900/20 font-bold">
            <Link to="/admin/labs/new">
              <Plus size={18} className="mr-2" />
              Create New Lab
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
          <div className="size-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Organizing Labs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {labs.map((lab) => (
            <Card key={lab.id} className="border-none shadow-xl shadow-slate-200/50 flex flex-col group hover:translate-y-[-4px] transition-all duration-300">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                <div className="flex justify-between items-start">
                  <div className="size-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                    <Music size={24} />
                  </div>
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-bold px-3 py-1 flex items-center gap-1.5 group-hover:text-primary group-hover:border-primary/30 transition-colors">
                    <Users size={12} />
                    {lab.capacity_per_session} Capacity
                  </Badge>
                </div>
                <CardTitle className="text-xl font-black tracking-tight mt-4 text-slate-900 leading-tight">{lab.name}</CardTitle>
                <CardDescription className="line-clamp-2 font-medium min-h-[40px] mt-1">{lab.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 py-6 space-y-5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Layers size={14} /> Age Range
                   </div>
                   <Badge className="bg-slate-100 text-slate-900 border-none font-black hover:bg-slate-100">
                      {lab.min_age} — {lab.max_age} Years
                   </Badge>
                </div>
                
                <Separator className="bg-slate-100" />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <UserCircle size={14} /> Instructors
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lab.instructors.length > 0 ? (
                      lab.instructors.map((name, i) => (
                        <Badge key={i} variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold">
                          {name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs font-medium text-slate-300 italic">No instructors assigned</span>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-slate-50/30 border-t border-slate-100 flex gap-3">
                <Button asChild variant="outline" className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-white hover:text-primary hover:border-primary transition-all">
                  <Link to={`/admin/labs/${lab.id}/edit`}>
                    <Edit2 size={14} className="mr-2" /> Edit Lab
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDelete(lab.id, lab.name)}
                  className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={18} />
                </Button>
              </CardFooter>
            </Card>
          ))}

          {labs.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[2rem] space-y-4 opacity-50">
               <Settings2 size={48} className="text-slate-300" />
               <p className="font-bold text-slate-400 uppercase tracking-widest">No labs configured</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
