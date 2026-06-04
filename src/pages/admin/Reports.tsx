import { useOutletContext } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export default function AdminReports() {
  const { isDark }: any = useOutletContext();

  return (
    <div className={cn(
      "min-h-[calc(100dvh-5rem)] flex flex-col justify-center items-center text-center p-8 transition-colors duration-700",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="max-w-md space-y-6 partner-enter animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className={cn(
          "size-20 rounded-full flex items-center justify-center mx-auto transition-colors duration-700 relative",
          isDark ? "bg-slate-900 text-slate-700" : "bg-slate-50 text-slate-300"
        )}>
          <Calendar size={36} />
        </div>
        <div className="space-y-2">
          <h2 className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Under Development
          </h2>
          <p className={cn("text-sm font-medium leading-relaxed max-w-sm mx-auto", isDark ? "text-slate-500" : "text-slate-400")}>
            This operational module is currently under development. Finalized calendars, lab rosters, and schedule export tools will go live here shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
