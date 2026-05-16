import { useState } from 'react';
import { Calendar, FileText, FileSpreadsheet, File, Mail, CheckCircle2, UserCircle, Clock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

export default function PartnerSchedule() {
  const { isDark }: any = useOutletContext();
  const [activeDay, setActiveDay] = useState(1);
  const days = [1, 2]; 

  const isFinalized = true; 

  if (!isFinalized) {
    return (
      <div className={cn(
        "min-h-screen transition-all duration-700 pb-2",
        isDark ? "bg-black text-white" : "bg-white text-slate-900"
      )}>
        <div className="w-full mx-auto px-4 pt-2 partner-enter">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-2xl mx-auto space-y-6">
        <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
          <Calendar size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Schedules Not Ready</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            The master admin has not finalized the lab assignments yet. <br />
            Please check back after the submission deadline (May 15th).
          </p>
        </div>
        <Button variant="outline" className="rounded-full px-8 border-slate-200 text-slate-600 font-bold">
           Return to Dashboard
        </Button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-all duration-700 pb-2",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 pt-2 partner-enter">
      <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 mb-2">
            <CheckCircle2 size={12} /> Assignments Finalized
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Your Final Schedule</h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            Assignments are finalized. Your students achieved a <span className="text-emerald-600 font-bold">94% top-3 match rate</span> across all sessions!
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-full px-6 border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
             <Mail size={16} className="mr-2" /> Email Parents
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Distribution Center</CardTitle>
            <CardDescription>Export schedules for your team and students</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <Button className="rounded-xl h-auto py-4 px-6 flex-1 min-w-[200px] shadow-lg shadow-primary/20 flex flex-col items-center gap-2">
              <FileText size={24} />
              <div className="text-center">
                <span className="block font-bold">Passport Cards</span>
                <span className="text-[10px] font-medium opacity-80">Download Student PDFs</span>
              </div>
            </Button>
            <Button variant="outline" className="rounded-xl h-auto py-4 px-6 flex-1 min-w-[200px] border-slate-200 flex flex-col items-center gap-2 hover:bg-slate-50">
              <FileSpreadsheet size={24} className="text-emerald-600" />
              <div className="text-center">
                <span className="block font-bold text-slate-900">Full Roster</span>
                <span className="text-[10px] font-medium text-slate-400">Excel Spreadsheet</span>
              </div>
            </Button>
            <Button variant="outline" className="rounded-xl h-auto py-4 px-6 flex-1 min-w-[200px] border-slate-200 flex flex-col items-center gap-2 hover:bg-slate-50">
              <File size={24} className="text-blue-600" />
              <div className="text-center">
                <span className="block font-bold text-slate-900">Grouped List</span>
                <span className="text-[10px] font-medium text-slate-400">Word Document</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex gap-2">
          {days.map(day => (
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
              Day {day} <Separator orientation="vertical" className="mx-2 h-4 bg-current opacity-20" /> 25 students
            </Button>
          ))}
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4 font-bold text-slate-900">Student</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" /> Session 1 <span className="text-[10px] text-slate-400 font-medium">(10:00 - 10:55)</span>
                      </div>
                    </TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" /> Session 2 <span className="text-[10px] text-slate-400 font-medium">(11:00 - 11:55)</span>
                      </div>
                    </TableHead>
                    <TableHead className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" /> Session 3 <span className="text-[10px] text-slate-400 font-medium">(12:40 - 1:35)</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Mock Row 1 */}
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle size={20} className="text-slate-300" />
                        <span className="font-bold text-slate-900">Alex Johnson <span className="text-slate-400 font-medium ml-1">(15)</span></span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold py-1 px-3">Intro to Jazz Piano</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold py-1 px-3">Rhythm & Percussion</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge className="bg-amber-50 text-amber-600 border-amber-200 font-black py-1 px-3 shadow-sm">Vocal Improvisation</Badge>
                    </TableCell>
                  </TableRow>
                  {/* Mock Row 2 */}
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle size={20} className="text-slate-300" />
                        <span className="font-bold text-slate-900">Sam Smith <span className="text-slate-400 font-medium ml-1">(13)</span></span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge className="bg-primary text-white border-primary shadow-md shadow-primary/20 font-black py-1 px-3">Brass Ensemble</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold py-1 px-3">Digital Audio</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold py-1 px-3">Rhythm & Percussion</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="p-4 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 flex gap-6">
                <span className="flex items-center gap-2"><div className="size-2 rounded-full bg-primary"></div> Top Pick</span>
                <span className="flex items-center gap-2"><div className="size-2 rounded-full bg-amber-500"></div> 2nd/3rd Pick</span>
                <span className="flex items-center gap-2"><div className="size-2 rounded-full bg-slate-200 border border-slate-300"></div> 4th/5th Pick</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
      </div>
    </div>
  );
}
