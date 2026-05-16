import { useState, useMemo } from 'react';
import { Play, CheckCircle2, AlertTriangle, Info, Settings2, RefreshCw, Activity, Clock, UserCircle, ExternalLink } from 'lucide-react';
import { runAssignmentAlgorithm } from '../../lib/algorithm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';

export default function AdminAssignment() {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(new Date());
  const [activeDay, setActiveDay] = useState(1);
  const [stats, setStats] = useState({
    assigned: 850,
    top3: 92,
    lowPicks: 5,
    flagged: 24,
  });

  const runAlgorithm = async () => {
    setRunning(true);
    try {
      const result = await runAssignmentAlgorithm();
      setLastRun(new Date());
      setStats({
        assigned: result.totalAssigned,
        top3: result.top3Percentage,
        lowPicks: result.lowPicksPercentage,
        flagged: result.flaggedCount,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setRunning(false);
    }
  };

  const dayTabs = [1, 2, 3, 4, 5, 6];
  const timeSlots = ['Session 1', 'Session 2', 'Session 3'];
  const mockLabs = ['Intro to Jazz Piano', 'Rhythm & Percussion', 'Vocal Improvisation', 'Brass Ensemble', 'Digital Audio'];

  const mockCapacity = useMemo(() => {
    return mockLabs.map(() =>
      timeSlots.map(() => Math.floor(Math.random() * 21))
    );
  }, []);

  const getCapacityBadge = (used: number, total: number) => {
    const ratio = used / total;
    if (ratio > 0.9) return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 font-black">{used} / {total}</Badge>;
    if (ratio > 0.7) return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-black">{used} / {total}</Badge>;
    return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-black">{used} / {total}</Badge>;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Top Banner */}
      <Card className="bg-slate-900 border-none shadow-2xl shadow-slate-900/20 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-[10px] font-black uppercase tracking-widest border border-white/10">
                <Activity size={12} /> System Core
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white">Assignment Algorithm</h1>
              <p className="text-slate-400 font-medium max-w-md leading-relaxed">
                Run the master distribution engine to assign students to labs based on preferences and age restrictions.
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">
                {lastRun ? `Last run: ${lastRun.toLocaleString()}` : 'Initial state: never run'}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="text-center space-y-1">
                <div className="text-3xl font-black text-white">{stats.assigned}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned</div>
              </div>
              <Separator orientation="vertical" className="h-10 bg-white/10" />
              <div className="text-center space-y-1">
                <div className="text-3xl font-black text-white">{stats.top3}%</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top 3 Pick</div>
              </div>
              <Separator orientation="vertical" className="h-10 bg-white/10" />
              <div className="text-center space-y-1">
                <div className="text-3xl font-black text-rose-500">{stats.flagged}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Flagged</div>
              </div>
            </div>

            <Button 
              onClick={runAlgorithm}
              disabled={running}
              size="lg"
              className="rounded-full px-10 h-16 bg-white text-slate-900 hover:bg-slate-100 font-black text-lg shadow-xl shadow-white/5 transition-all group"
            >
              {running ? <RefreshCw className="animate-spin mr-3" size={24} /> : <Play className="mr-3 group-hover:scale-110 transition-transform" size={24} fill="currentColor" />}
              {running ? 'PROCESSING...' : 'RUN ASSIGNMENT'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-none shadow-xl shadow-slate-200/50 text-center py-10 group transition-all hover:translate-y-[-4px]">
          <div className="size-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stats.top3}%</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Optimal Distribution (1–3)</p>
        </Card>
        
        <Card className="border-none shadow-xl shadow-slate-200/50 text-center py-10 group transition-all hover:translate-y-[-4px]">
          <div className="size-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Info size={32} />
          </div>
          <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stats.lowPicks}%</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Satisfactory Match (4–5)</p>
        </Card>
        
        <Card className="border-none shadow-xl shadow-slate-200/50 text-center py-10 group transition-all hover:translate-y-[-4px]">
          <div className="size-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stats.flagged}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Manual Interventions Required</p>
        </Card>
      </div>

      {/* Capacity by Day */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-slate-400" />
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Capacity Matrix</h2>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {dayTabs.map(day => (
            <Button
              key={day}
              onClick={() => setActiveDay(day)}
              variant={activeDay === day ? 'default' : 'ghost'}
              className={`rounded-full px-8 font-black uppercase tracking-widest text-[10px] h-10 transition-all ${
                activeDay === day 
                  ? 'shadow-lg shadow-primary/20' 
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Day {day}
            </Button>
          ))}
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 py-4 font-bold text-slate-900 w-1/3">Lab Name</TableHead>
                  {timeSlots.map(slot => (
                    <TableHead key={slot} className="px-6 py-4 font-bold text-slate-900 text-center">{slot}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLabs.map((lab, labIdx) => (
                  <TableRow key={lab} className="hover:bg-slate-50/50">
                    <TableCell className="px-6 py-4 font-black text-slate-900">{lab}</TableCell>
                    {timeSlots.map((slot, slotIdx) => (
                      <TableCell key={slot} className="px-6 py-4 text-center">
                        {getCapacityBadge(mockCapacity[labIdx][slotIdx], 20)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Students */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <h2 className="text-xl font-black text-slate-900 tracking-tight">System Alerts ({stats.flagged})</h2>
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden border-t-4 border-t-rose-500">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-rose-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 py-4 font-bold text-rose-900">Student</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-rose-900">Organization</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-rose-900">Issue Description</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-rose-900 text-right pr-8">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-rose-50/20">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserCircle size={20} className="text-rose-300" />
                      <span className="font-black text-slate-900">John Smith</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px]">Columbus Youth Foundation</TableCell>
                  <TableCell className="px-6 py-4 text-rose-600 text-xs font-bold leading-relaxed">
                    Critical: No available seats in Session 2 for any of student's Top 5 choices.
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right pr-8">
                    <Button variant="outline" size="sm" className="rounded-full font-bold border-rose-200 text-rose-600 hover:bg-rose-50">
                      <Settings2 size={14} className="mr-2" /> Resolve
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-rose-50/20">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserCircle size={20} className="text-rose-300" />
                      <span className="font-black text-slate-900">Sarah Jenkins</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px]">Urban Strings</TableCell>
                  <TableCell className="px-6 py-4 text-rose-600 text-xs font-bold leading-relaxed">
                    Conflict: Age restriction mismatch for fallback lab assignment.
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right pr-8">
                    <Button variant="outline" size="sm" className="rounded-full font-bold border-rose-200 text-rose-600 hover:bg-rose-50">
                      <Settings2 size={14} className="mr-2" /> Resolve
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="p-4 bg-slate-50/50 text-center">
               <Button variant="link" className="text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900">
                 View All Anomalies <ExternalLink size={12} className="ml-2" />
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
