import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import PicksGrid from '../../components/partner/picks/PicksGrid';
import { cn } from '@/lib/utils';
import { getThemeClasses } from '../../lib/theme';

export default function PartnerLabPicks() {
  const { profile } = useAuth();
  const { isDark, bgFlavor, activeCampDayId, childFlushRef }: any = useOutletContext();
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

  const theme = getThemeClasses(isDark, bgFlavor);

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-colors duration-700 overflow-hidden flex flex-col",
      theme.bg
    )}>
      {/* Page Action Header */}
      <div className={cn(
        "w-full px-8 py-3 flex flex-col md:flex-row items-start md:items-center justify-between border-b shrink-0 gap-4 transition-colors duration-700",
        theme.headerBg,
        theme.border
      )}>
        <div className="flex items-center gap-3 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
          <Info size={16} className="text-sky-500 dark:text-sky-400 shrink-0 animate-pulse" />
          <p className="leading-relaxed">
            Select all eligible lab preferences per student by clicking cells <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>(1 = top choice)</strong>. Age-restricted labs are blocked. Click <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Clear"</strong> to reset. A green checkmark under <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>"Complete"</strong> confirms completion.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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
            onClick={(e) => handleNavClick(e, '/partner/staff')}
            className={cn(
              "rounded-xl h-10 px-6 font-semibold tracking-wide text-[13px] transition-all duration-300 shadow-sm border flex items-center gap-2",
              isDark
                ? "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300"
                : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
            )}
          >
            Next: Staff Data
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">
          {profile?.organization_id && (
            <PicksGrid
              key={activeCampDayId}
              organizationId={profile.organization_id}
              isDark={isDark}
              bgFlavor={bgFlavor}
              activeCampDayId={activeCampDayId}
            />
          )}
        </section>
      </div>
    </div>
  );
}
