import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PieChart, Edit2, AlertCircle, CheckCircle2, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PartnerLoader from '../../components/partner/PartnerLoader';

export default function PartnerDemographics() {
  const { profile } = useAuth();
  const { isDark }: any = useOutletContext();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchStudents();
    }
  }, [profile]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, race, ethnicity, gender, household_income_tier, zip_code')
        .eq('organization_id', profile!.organization_id);
        
      if (error) throw error;
      const realStudents = (data || []).filter(
        s => s.first_name?.trim() || s.last_name?.trim()
      );
      setStudents(realStudents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-all duration-700 pb-2",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 pt-2 partner-enter">
      <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Demographics</h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">
            Review and complete grant reporting data for your students. This data is strictly confidential and used for program funding.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200">
           <PieChart size={18} className="text-slate-400" />
           <span className="text-sm font-bold text-slate-700">{students.length} Total Students</span>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <PartnerLoader label="Loading Roster..." isDark={isDark} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Student</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Race / Ethnicity</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Gender</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Income Tier</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Status</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900 text-right pr-8">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const isMissing = !student.race || !student.ethnicity || !student.gender || !student.household_income_tier || !student.zip_code;
                    return (
                      <TableRow key={student.id} className="group transition-colors hover:bg-slate-50/50">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <UserCircle size={20} />
                            </div>
                            <span className="font-bold text-slate-900">{student.first_name} {student.last_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-slate-500 font-medium">
                          {student.race ? (
                            <div className="flex flex-col">
                              <span>{student.race}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-400">{student.ethnicity}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-slate-600 font-medium">{student.gender || '-'}</TableCell>
                        <TableCell className="px-6 py-4 text-slate-600 font-medium">{student.household_income_tier || '-'}</TableCell>
                        <TableCell className="px-6 py-4">
                          {isMissing ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold flex items-center w-fit gap-1">
                              <AlertCircle size={12} /> Missing Data
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold flex items-center w-fit gap-1">
                              <CheckCircle2 size={12} /> Complete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right pr-8">
                          <Button asChild variant="ghost" size="sm" className="rounded-full font-bold text-slate-500 hover:text-primary hover:bg-primary/5">
                            <Link to={`/partner/students/${student.id}/edit`}>
                              <Edit2 size={14} className="mr-2" /> Edit
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic">
                        No students found. Add students first to manage demographics.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
