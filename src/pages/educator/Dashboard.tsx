import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, LayoutGrid, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function EducatorDashboard() {
  const { isDark }: any = useOutletContext();
  const navigate = useNavigate();

  const [campDays, setCampDays] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSelections();
  }, []);

  const fetchSelections = async () => {
    try {
      const [daysRes, slotsRes] = await Promise.all([
        supabase.from('camp_days').select('*').order('date'),
        supabase.from('time_slots').select('*').order('start_time')
      ]);

      setCampDays(daysRes.data || []);
      setTimeSlots(slotsRes.data || []);

      if (daysRes.data && daysRes.data.length > 0) {
        setSelectedDayId(daysRes.data[0].id);
      }
      if (slotsRes.data && slotsRes.data.length > 0) {
        setSelectedSlotId(slotsRes.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching selections for dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSchedule = () => {
    if (selectedDayId && selectedSlotId) {
      navigate(`/educator/schedule?day=${selectedDayId}&slot=${selectedSlotId}`);
    }
  };

  if (loading) {
    return (
      <div className={cn("h-[calc(100dvh-5rem)] flex flex-col items-center justify-center space-y-4", isDark ? "bg-black text-white" : "bg-white text-slate-900")}>
        <div className={cn("size-12 border-4 rounded-full animate-spin", isDark ? "border-white/10 border-t-white" : "border-slate-200 border-t-slate-900")} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Educator Command Center...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-[calc(100dvh-5rem)] flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-12 transition-colors duration-700",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="max-w-xl w-full space-y-8 partner-enter animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header / Intro */}
        <div className="text-center space-y-3">
          <div className={cn(
            "size-16 rounded-3xl flex items-center justify-center mx-auto transition-colors duration-700 border",
            isDark ? "bg-zinc-950/40 border-white/10 text-emerald-400" : "bg-slate-50 border-slate-200 text-emerald-600"
          )}>
            <LayoutGrid size={28} />
          </div>
          <h2 className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Welcome, Educator!
          </h2>
          <p className={cn("text-sm font-medium leading-relaxed max-w-md mx-auto", isDark ? "text-slate-500" : "text-slate-400")}>
            JazzLab Connect allows you to check active camper schedules, track daily rosters, and perform classroom roll call verification.
          </p>
        </div>

        {/* Dashboard Control Panel Card */}
        <Card className={cn(
          "border-none overflow-hidden rounded-[2rem] transition-all duration-700 shadow-2xl",
          isDark 
            ? "bg-[#020617] border border-white/5 shadow-black/80 text-white" 
            : "bg-white border border-slate-100 shadow-slate-200/50 text-slate-900"
        )}>
          <CardHeader className={cn(
            "border-b p-6 md:p-8 transition-colors duration-700",
            isDark ? "bg-white/[0.01] border-white/5" : "bg-slate-50/50 border-slate-100"
          )}>
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <HelpCircle size={18} className="text-slate-400" />
              Operational Guide
            </CardTitle>
            <CardDescription className={cn("font-medium", isDark ? "text-slate-500" : "text-slate-400")}>
              Select camp day and session time below to view the master schedule matrix.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Camp Day Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Calendar size={12} /> Camp Day
                </label>
                <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                  <SelectTrigger className={cn("rounded-xl font-bold h-12 transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200")}>
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent className={isDark ? "bg-zinc-950 border-white/10" : "bg-white"}>
                    {campDays.map((day, idx) => (
                      <SelectItem key={day.id} value={day.id} className="font-bold">
                        Day {idx + 1} &bull; {new Date(day.date + 'T00:00:00').toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Slot Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Clock size={12} /> Session Time
                </label>
                <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                  <SelectTrigger className={cn("rounded-xl font-bold h-12 transition-colors duration-700", isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200")}>
                    <SelectValue placeholder="Select Slot" />
                  </SelectTrigger>
                  <SelectContent className={isDark ? "bg-zinc-950 border-white/10" : "bg-white"}>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot.id} value={slot.id} className="font-bold">
                        {slot.name} ({slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* View Schedule Action */}
            <Button
              onClick={handleViewSchedule}
              disabled={!selectedDayId || !selectedSlotId}
              className={cn(
                "w-full rounded-2xl h-14 font-black text-sm transition-all duration-300 shadow-xl flex items-center justify-center gap-2 mt-4",
                isDark 
                  ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 shadow-emerald-950/20"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-100"
              )}
            >
              View Schedule Matrix
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
