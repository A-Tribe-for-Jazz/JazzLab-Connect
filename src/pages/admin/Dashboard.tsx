import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Building2, Music, AlertTriangle, ChevronRight, Calendar, Activity, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalStudents: number;
  totalCapacity: number;
  orgCount: number;
  labCount: number;
  flaggedCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
      const { count: labCount } = await supabase.from('labs').select('*', { count: 'exact', head: true });
      const { data: labs } = await supabase.from('labs').select('capacity_per_session');
      
      const totalCapacity = (labs || []).reduce((acc, lab) => acc + (lab.capacity_per_session * 3 * 6), 0); 
      
      setStats({
        totalStudents: studentCount || 0,
        totalCapacity,
        orgCount: orgCount || 0,
        labCount: labCount || 0,
        flaggedCount: 0 
      });
    } catch (error) {
      console.error('Error fetching dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
        <div className="size-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Initializing System...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">System Overview</h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            Real-time monitoring of JazzLab Connect enrollment, capacity, and organizational status.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-full px-6 border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
             <Activity size={16} className="mr-2" /> Live Status
           </Button>
           <Button asChild className="rounded-full px-6 shadow-lg shadow-slate-900/20 font-bold">
             <Link to="/admin/assignment">Run Algorithm</Link>
           </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden group">
          <CardContent className="p-6 flex items-start gap-5">
            <div className="size-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-slate-900/20">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Students Enrolled</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats?.totalStudents}</span>
                <span className="text-xs font-bold text-slate-400">/ {stats?.totalCapacity} Cap.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden group">
          <CardContent className="p-6 flex items-start gap-5">
            <div className="size-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Organizations</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats?.orgCount}</span>
                <span className="text-xs font-bold text-slate-400">Total Partners</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden group">
          <CardContent className="p-6 flex items-start gap-5">
            <div className="size-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
              <Music size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Labs</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats?.labCount}</span>
                <span className="text-xs font-bold text-slate-400">Specialized Labs</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden group">
          <CardContent className="p-6 flex items-start gap-5">
            <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg ${stats?.flaggedCount && stats.flaggedCount > 0 ? 'bg-rose-500 shadow-rose-500/20' : 'bg-slate-200 shadow-slate-200/20'} text-white`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Flagged Data</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats?.flaggedCount}</span>
                <span className="text-xs font-bold text-slate-400">Needs Review</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Days Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Camp Days Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const capacityPerDay = stats ? Math.floor(stats.totalCapacity / 6) : 0;
            return (
              <Card key={day} className="border-none shadow-lg shadow-slate-200/30 overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black">Day {day}</CardTitle>
                    <Badge variant="outline" className="bg-white text-slate-400 border-slate-200 group-hover:text-primary group-hover:border-primary/30 transition-colors">June {9 + day}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                      <span>Seats Filled</span>
                      <span className="text-slate-900">0 / {capacityPerDay}</span>
                    </div>
                    <Progress value={0} className="h-1.5 bg-slate-100" />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Organizations Status Table */}
      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-5">
          <div>
            <CardTitle className="text-lg">Organization Pipeline</CardTitle>
            <CardDescription>Status of partner data submissions and deadlines</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full font-bold text-primary">
            <Link to="/admin/organizations" className="flex items-center gap-1">
              Management Portal <ChevronRight size={16} />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 py-4 font-bold text-slate-900">Organization</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-900">Students</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-900">Demographics</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-900">Lab Picks</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-900 text-right pr-8">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-slate-400 font-medium italic">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                      <Database size={32} />
                      <p>No organizations registered yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
