import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartnerLoaderProps {
  label?: string;
  isDark?: boolean;
}

/**
 * Canonical loading state for every partner portal page/component.
 * Matches the design used in StudentGrid and PicksGrid.
 */
export default function PartnerLoader({ label = 'Loading...', isDark = false }: PartnerLoaderProps) {
  return (
    <div className="py-32 flex flex-col items-center justify-center space-y-6 partner-enter">
      <div className="relative">
        <Loader2
          className={cn('animate-spin', isDark ? 'text-blue-500' : 'text-blue-600')}
          size={48}
        />
        <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
      </div>
      <p className={cn(
        'text-xs font-black uppercase tracking-[0.3em] transition-colors duration-700',
        isDark ? 'text-slate-500' : 'text-slate-400'
      )}>
        {label}
      </p>
    </div>
  );
}
