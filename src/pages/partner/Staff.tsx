import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import StaffGrid from '../../components/partner/StaffGrid';
import { cn } from '@/lib/utils';

export default function PartnerStaff() {
  const { profile } = useAuth();
  const { isDark, childFlushRef }: any = useOutletContext();
  const navigate = useNavigate();

  const handleNavClick = async (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (childFlushRef?.current) {
      try {
        await childFlushRef.current();
      } catch (err) {
        console.error('Error flushing to DB:', err);
      }
    }
    navigate(path);
  };

  const navButtons = (
    <>
      <button
        onClick={(e) => handleNavClick(e, '/partner/dashboard')}
        className={cn(
          "rounded-xl h-10 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center gap-2",
          isDark
            ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            : "bg-white border-slate-200/60 text-slate-655 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
        )}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
      <button
        onClick={(e) => handleNavClick(e, '/partner/schedule')}
        className={cn(
          "rounded-xl h-10 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center gap-2",
          isDark
            ? "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300"
            : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
        )}
      >
        Next: Schedules
        <ArrowRight size={16} />
      </button>
    </>
  );

  return (
    <div className={cn(
      'h-[calc(100dvh-5rem)] transition-all duration-700 overflow-hidden flex flex-col',
      isDark ? 'bg-black text-white' : 'bg-white text-slate-900'
    )}>
      {/* Page Action Header */}
      <div className={cn(
        "w-full px-8 py-3 flex items-center justify-start border-b shrink-0 gap-3 transition-colors duration-700",
        isDark ? "bg-black border-white/5" : "bg-white border-slate-100"
      )}>
        <Info size={14} className="text-sky-500 dark:text-sky-400 shrink-0 animate-pulse" />
        <p className={cn(
          "text-xs font-semibold leading-relaxed",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>
          Please enter the name, email address, and cell phone number of each staff member who will be attending Jazz Lab.
        </p>
      </div>

      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">
          {profile?.organization_id && (
            <StaffGrid
              organizationId={profile.organization_id}
              isDark={isDark}
              navActions={navButtons}
            />
          )}
        </section>
      </div>
    </div>
  );
}
