import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, File, Calendar as CalendarIcon, Activity, PieChart, ShieldCheck } from 'lucide-react';
import { generateProgramReport, generateStudentPassports, generateLabRosters, generateOrgSchedule, generateDemographicsSummary, generateSatisfactionReport } from '../../lib/exports';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AdminReports() {
  const [activeDayFilter, setActiveDayFilter] = useState<string | 'All'>('All');
  const [downloading, setDownloading] = useState<string | null>(null);

  const days = ['All', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'];

  const handleDownload = async (reportId: string) => {
    setDownloading(reportId);
    try {
      if (reportId === 'Full Program Report') await generateProgramReport();
      else if (reportId === 'Student Passports') await generateStudentPassports();
      else if (reportId === 'Lab Rosters') await generateLabRosters();
      else if (reportId === 'Org Schedules') await generateOrgSchedule();
      else if (reportId === 'Demographics') await generateDemographicsSummary();
      else if (reportId === 'Satisfaction') await generateSatisfactionReport();
      else await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Reports & Exports</h1>
          <p className="text-slate-500 font-medium max-w-2xl">
            Extract program data into formatted artifacts for reporting, distribution, and archival.
          </p>
        </div>
      </div>

      {/* Primary Export Hero Card */}
      <Card className="bg-slate-900 border-none shadow-2xl shadow-slate-900/20 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
           <FileSpreadsheet size={160} className="text-white" />
        </div>
        <CardContent className="p-10 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="space-y-6 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-[10px] font-black uppercase tracking-widest border border-white/10">
                <ShieldCheck size={12} /> Master Data Repository
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-white tracking-tight">Full Program Report</h2>
                <p className="text-slate-400 font-medium leading-relaxed max-w-xl">
                  Our comprehensive Excel workbook containing all student records, demographic profiles, lab assignments, and attendance logs. Perfect for grant reporting and audit trails.
                </p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Format</span>
                    <span className="text-white font-bold">XLSX (Workbook)</span>
                 </div>
                 <Separator orientation="vertical" className="h-8 bg-white/10" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scope</span>
                    <span className="text-white font-bold">Full Program</span>
                 </div>
              </div>
            </div>
            <Button 
              onClick={() => handleDownload('Full Program Report')}
              disabled={!!downloading}
              size="lg"
              className="h-20 px-12 rounded-full bg-white text-slate-900 hover:bg-slate-100 font-black text-xl shadow-xl shadow-white/5 group transition-all"
            >
              {downloading === 'Full Program Report' ? <Activity className="animate-spin mr-3" /> : <Download size={24} className="mr-3 group-hover:translate-y-1 transition-transform" />}
              {downloading === 'Full Program Report' ? 'GENERATING...' : 'DOWNLOAD EXCEL'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter System */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
           <CalendarIcon size={14} /> Filter artifacts by:
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {days.map(day => (
            <Button
              key={day}
              onClick={() => setActiveDayFilter(day)}
              variant={activeDayFilter === day ? 'default' : 'ghost'}
              className={`rounded-full px-8 font-black uppercase tracking-widest text-[10px] h-10 transition-all ${
                activeDayFilter === day 
                  ? 'shadow-lg shadow-primary/20' 
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {day}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-slate-100" />

      {/* Artifact Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Operational Section */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/50 w-fit">
              <Activity size={16} className="text-slate-500" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Operational Distribution</h3>
           </div>
           <div className="grid grid-cols-1 gap-6">
              <ModernExportCard 
                id="Student Passports"
                title="Student Passport Cards"
                description="Printable PDF cards for student daily lab orientation. 6 per page."
                icon={FileText}
                format="PDF"
                color="emerald"
                loading={downloading === 'Student Passports'}
                onDownload={() => handleDownload('Student Passports')}
              />
              <ModernExportCard 
                id="Lab Rosters"
                title="Lab Rosters"
                description="One page per lab/session showing assigned students & orgs."
                icon={FileText}
                format="PDF"
                color="blue"
                loading={downloading === 'Lab Rosters'}
                onDownload={() => handleDownload('Lab Rosters')}
              />
              <ModernExportCard 
                id="Org Schedules"
                title="Per-Organization Schedule"
                description="Full student group assignments grouped by camp day."
                icon={File}
                format="DOCX"
                color="indigo"
                loading={downloading === 'Org Schedules'}
                onDownload={() => handleDownload('Org Schedules')}
              />
           </div>
        </div>

        {/* Analytics Section */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/50 w-fit">
              <PieChart size={16} className="text-slate-500" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Analytics & Reporting</h3>
           </div>
           <div className="grid grid-cols-1 gap-6">
              <ModernExportCard 
                id="Demographics"
                title="Demographics Summary"
                description="Aggregated participant counts across all selected days."
                icon={FileSpreadsheet}
                format="EXCEL"
                color="rose"
                loading={downloading === 'Demographics'}
                onDownload={() => handleDownload('Demographics')}
              />
              <ModernExportCard 
                id="Satisfaction"
                title="Satisfaction & Match Rate"
                description="Deep dive into algorithm performance and student pick accuracy."
                icon={FileSpreadsheet}
                format="EXCEL"
                color="amber"
                loading={downloading === 'Satisfaction'}
                onDownload={() => handleDownload('Satisfaction')}
              />
           </div>
        </div>
      </div>
    </div>
  );
}

function ModernExportCard({ title, description, icon: Icon, format, loading, onDownload, color }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className={`p-4 rounded-2xl border ${colorMap[color]} shadow-sm group-hover:scale-110 transition-transform`}>
              <Icon size={24} />
            </div>
            <div className="space-y-1 pt-1">
              <h4 className="font-black text-slate-900 tracking-tight">{title}</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px] md:max-w-xs">{description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 pt-1">
            <Badge variant="outline" className="bg-white border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1">
              {format}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDownload}
              disabled={loading}
              className="rounded-full font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              {loading ? <Activity className="size-4 animate-spin" /> : <Download size={14} className="mr-2" />}
              {loading ? '...' : 'EXPORT'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
