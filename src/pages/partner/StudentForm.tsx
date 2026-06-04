import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, ChevronLeft, Music, Info, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function StudentForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { activeCampDayId } = useOutletContext<any>() || {};

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [labs, setLabs] = useState<any[]>([]);
  const [campDays, setCampDays] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    camp_day_id: isNew ? (activeCampDayId || '') : '',
    sibling_group_id: '',
    special_needs_notes: '',
    parent_email: '',
  });

  const [preferences, setPreferences] = useState<{ [rank: number]: string }>({});

  useEffect(() => {
    if (isNew && activeCampDayId && !formData.camp_day_id) {
      setFormData(prev => ({ ...prev, camp_day_id: activeCampDayId }));
    }
  }, [activeCampDayId, isNew]);

  useEffect(() => {
    fetchFormOptions();
    if (!isNew) {
      fetchStudentData();
    }
  }, [id]);

  const fetchFormOptions = async () => {
    try {
      const { data: labsData } = await supabase.from('labs').select('id, name').order('name');
      if (labsData) setLabs(labsData);

      if (profile?.organization_id) {
        const { data: orgDays } = await supabase
          .from('camp_day_organizations')
          .select('camp_day_id, camp_days(date)')
          .eq('organization_id', profile.organization_id);
        
        if (orgDays) {
          setCampDays(orgDays.map((od: any) => ({
            id: od.camp_day_id,
            date: od.camp_days.date
          })));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStudentData = async () => {
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        age: student.age.toString(),
        camp_day_id: student.camp_day_id || '',
        sibling_group_id: student.sibling_group_id || '',
        special_needs_notes: student.special_needs_notes || '',
        parent_email: student.parent_email || '',
      });

      const { data: prefsData } = await supabase
        .from('preferences')
        .select('lab_id, rank')
        .eq('student_id', id);

      if (prefsData) {
        const prefMap: any = {};
        prefsData.forEach((p: any) => {
          prefMap[p.rank] = p.lab_id;
        });
        setPreferences(prefMap);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRankClick = (labId: string, rank: number) => {
    setPreferences(prev => {
      const newPrefs = { ...prev };
      
      if (newPrefs[rank] === labId) {
        delete newPrefs[rank];
        return newPrefs;
      }
      
      Object.keys(newPrefs).forEach((k) => {
        if (newPrefs[parseInt(k)] === labId) {
          delete newPrefs[parseInt(k)];
        }
      });

      newPrefs[rank] = labId;
      return newPrefs;
    });
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    if (Object.keys(preferences).length < 5) {
      alert('Please rank exactly 5 labs.');
      return;
    }

    setSaving(true);
    try {
      const studentPayload = {
        organization_id: profile?.organization_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        age: parseInt(formData.age),
        camp_day_id: formData.camp_day_id || null,
        sibling_group_id: formData.sibling_group_id || null,
        special_needs_notes: formData.special_needs_notes || null,
        parent_email: formData.parent_email || null,
      };

      let studentId = id;

      if (isNew) {
        const { data, error } = await supabase.from('students').insert(studentPayload).select().single();
        if (error) throw error;
        studentId = data.id;
      } else {
        const { error } = await supabase.from('students').update(studentPayload).eq('id', id);
        if (error) throw error;
      }

      await supabase.from('preferences').delete().eq('student_id', studentId);
      const prefInserts = Object.keys(preferences).map((rank) => ({
        student_id: studentId,
        lab_id: preferences[parseInt(rank)],
        rank: parseInt(rank)
      }));
      if (prefInserts.length > 0) {
        const { error: pErr } = await supabase.from('preferences').insert(prefInserts);
        if (pErr) throw pErr;
      }

      if (addAnother) {
        setFormData({ ...formData, first_name: '', last_name: '', age: '', sibling_group_id: '', special_needs_notes: '' });
        setPreferences({});
        window.scrollTo(0, 0);
      } else {
        navigate('/partner/dashboard');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save student.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 italic">Preparing student file...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="pl-0 text-slate-500 hover:text-primary transition-colors">
            <Link to="/partner/dashboard">
              <ChevronLeft size={16} className="mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {isNew ? 'Register New Student' : 'Modify Student Record'}
          </h1>
        </div>
        {!isNew && (
          <Badge variant="outline" className="px-3 py-1 border-slate-200 text-slate-500 font-bold bg-white shadow-sm">
            ID: {id?.slice(0, 8)}
          </Badge>
        )}
      </div>

      <form className="space-y-10" onSubmit={(e) => handleSubmit(e, false)}>
        
        {/* Basic Info Card */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
            <div className="flex items-center gap-3 text-primary">
              <Music size={20} />
              <CardTitle className="text-lg">Core Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="font-bold text-slate-700">First Name <span className="text-primary">*</span></Label>
                <Input 
                  id="first_name"
                  required 
                  placeholder="e.g. John"
                  className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white transition-all"
                  value={formData.first_name} 
                  onChange={e => setFormData({...formData, first_name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="font-bold text-slate-700">Last Name <span className="text-primary">*</span></Label>
                <Input 
                  id="last_name"
                  required 
                  placeholder="e.g. Doe"
                  className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white transition-all"
                  value={formData.last_name} 
                  onChange={e => setFormData({...formData, last_name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age" className="font-bold text-slate-700">Age <span className="text-primary">*</span></Label>
                <Input 
                  id="age"
                  type="number" 
                  required 
                  className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white transition-all"
                  value={formData.age} 
                  onChange={e => setFormData({...formData, age: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp_day" className="font-bold text-slate-700">Camp Date <span className="text-primary">*</span></Label>
                <Select 
                  value={formData.camp_day_id} 
                  onValueChange={val => setFormData({...formData, camp_day_id: val ?? ''})}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white transition-all">
                    <SelectValue placeholder="Select a program date" />
                  </SelectTrigger>
                  <SelectContent>
                    {campDays.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {new Date(d.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="sibling_group" className="font-bold text-slate-700">Sibling Group ID <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  id="sibling_group"
                  className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white transition-all"
                  placeholder="e.g. Smith-Household-2024" 
                  value={formData.sibling_group_id} 
                  onChange={e => setFormData({...formData, sibling_group_id: e.target.value})} 
                />
                <p className="text-[10px] text-slate-400 font-medium italic">Assign identical IDs to siblings to attempt grouping them in the same labs.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
            <div className="flex items-center gap-3 text-primary">
              <Info size={20} />
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="parent_email" className="font-bold text-slate-700">Parent Email</Label>
                <Input
                  id="parent_email"
                  type="email"
                  className="h-11 border-slate-200 bg-slate-50/30 focus:bg-white transition-all"
                  placeholder="parent@example.com"
                  value={formData.parent_email}
                  onChange={e => setFormData({...formData, parent_email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-bold text-slate-700">Special Needs / Accommodations</Label>
                <textarea
                  id="notes"
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-slate-50/30 p-3 focus:bg-white focus:outline-none transition-all resize-none placeholder:text-slate-400"
                  placeholder="Allergies, accessibility needs, etc."
                  value={formData.special_needs_notes}
                  onChange={e => setFormData({...formData, special_needs_notes: e.target.value})}
                ></textarea>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lab Preferences Card */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
            <div className="flex items-center gap-3 text-primary">
              <Star size={20} />
              <CardTitle className="text-lg">Lab Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-8 py-6 bg-amber-50/50 border-b border-amber-100">
               <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Rank exactly <span className="font-bold">5 labs</span>. Use 1 for their highest choice. 
                Our algorithm prioritizes lower numbers to ensure every student gets a top-tier pick.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-bold text-slate-900 pl-8 h-12">Available JazzLab Courses</TableHead>
                  {[1, 2, 3, 4, 5].map(rank => (
                    <TableHead key={rank} className="text-center font-bold text-slate-900 w-24">Rank {rank}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.map(lab => (
                  <TableRow key={lab.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                    <td className="py-4 pl-8 font-bold text-slate-900 text-sm">{lab.name}</td>
                    {[1, 2, 3, 4, 5].map(rank => {
                      const isSelected = preferences[rank] === lab.id;
                      return (
                        <td key={rank} className="py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRankClick(lab.id, rank)}
                            className={cn(
                              "w-10 h-10 rounded-xl border-2 flex items-center justify-center mx-auto transition-all duration-200 font-black text-sm",
                              isSelected 
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110' 
                                : 'bg-white border-slate-100 text-transparent hover:border-primary/40 hover:text-slate-300'
                            )}
                          >
                            {isSelected ? rank : rank}
                          </button>
                        </td>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Button asChild variant="ghost" className="text-slate-500 font-bold">
              <Link to="/partner/dashboard">Cancel</Link>
            </Button>
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="border-slate-200 text-slate-700 font-bold rounded-full px-6"
                onClick={(e) => handleSubmit(e, true)} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save & Add Another'}
              </Button>
              <Button 
                type="submit" 
                className="font-bold rounded-full px-8 shadow-lg shadow-primary/20"
                disabled={saving}
              >
                <Save size={18} className="mr-2" />
                {saving ? 'Saving...' : 'Finalize Registration'}
              </Button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
