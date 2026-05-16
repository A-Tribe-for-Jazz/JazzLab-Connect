import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Building, MapPin, Activity, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CampDay {
  id: string;
  date: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Assignment {
  camp_day_id: string;
  organization_id: string;
}

export default function AdminSchedule() {
  const [campDays, setCampDays] = useState<CampDay[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [daysRes, orgsRes, assignRes] = await Promise.all([
        supabase.from('camp_days').select('*').order('date', { ascending: true }),
        supabase.from('organizations').select('id, name').order('name', { ascending: true }),
        supabase.from('camp_day_organizations').select('*')
      ]);

      if (daysRes.error) throw daysRes.error;
      if (orgsRes.error) throw orgsRes.error;
      if (assignRes.error) throw assignRes.error;

      setCampDays(daysRes.data || []);
      setOrganizations(orgsRes.data || []);
      setAssignments(assignRes.data || []);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAssignment = (dayId: string, orgId: string) => {
    setHasChanges(true);
    setAssignments((prev) => {
      const exists = prev.find((a) => a.camp_day_id === dayId && a.organization_id === orgId);
      if (exists) {
        return prev.filter((a) => !(a.camp_day_id === dayId && a.organization_id === orgId));
      } else {
        return [...prev, { camp_day_id: dayId, organization_id: orgId }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('camp_day_organizations').delete().neq('camp_day_id', '00000000-0000-0000-0000-000000000000');
      
      if (assignments.length > 0) {
        const { error } = await supabase.from('camp_day_organizations').insert(assignments);
        if (error) throw error;
      }
      
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <div className="size-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Building Master Schedule...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Organization Scheduler</h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            Assign partner organizations to specific program dates to enable student registration flows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`rounded-full px-8 h-12 font-bold shadow-lg transition-all ${
              hasChanges 
                ? 'bg-slate-900 text-white shadow-slate-900/20' 
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
            }`}
          >
            {saving ? <Activity className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
            {saving ? 'SAVING...' : 'SAVE MASTER SCHEDULE'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {campDays.map((day, idx) => {
          const assignedOrgs = assignments.filter((a) => a.camp_day_id === day.id);
          
          return (
            <Card key={day.id} className="border-none shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col hover:translate-y-[-2px] transition-all duration-300">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center text-slate-900">
                       <span className="text-[10px] font-black uppercase leading-none opacity-40">Day</span>
                       <span className="text-xl font-black leading-none">{idx + 1}</span>
                    </div>
                    <div className="space-y-0.5">
                       <CardTitle className="text-xl font-black tracking-tight text-slate-900">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                       </CardTitle>
                       <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <MapPin size={12} /> Main Campus &bull; {assignedOrgs.length} Organizations
                       </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-bold px-3 py-1">
                     {assignedOrgs.length} Active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-8 flex-1">
                 <div className="space-y-3">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Building size={14} /> Available Partners
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {organizations.map((org) => {
                        const isAssigned = assignments.some((a) => a.camp_day_id === day.id && a.organization_id === org.id);
                        return (
                          <div 
                            key={org.id}
                            onClick={() => handleToggleAssignment(day.id, org.id)}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                              isAssigned 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10' 
                                : 'bg-white border-slate-50 text-slate-600 hover:border-slate-200'
                            }`}
                          >
                             <div className="flex items-center gap-3">
                                <Building size={16} className={isAssigned ? 'text-emerald-400' : 'text-slate-300'} />
                                <span className={`text-sm font-bold tracking-tight ${isAssigned ? 'text-white' : 'text-slate-700'}`}>
                                  {org.name}
                                </span>
                             </div>
                             <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-all ${
                               isAssigned ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-transparent border-slate-200'
                             }`}>
                                {isAssigned && <CheckCircle2 size={12} className="stroke-[3]" />}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                 </div>
              </CardContent>
              
              <CardFooter className="bg-slate-50/30 border-t border-slate-100 p-4">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic w-full text-center">
                    Organization assignments directly affect student onboarding flows
                 </p>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
