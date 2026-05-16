import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useOutletContext } from 'react-router-dom';
import PicksGrid from '../../components/partner/picks/PicksGrid';

export default function PartnerLabPicks() {
  const { profile } = useAuth();
  const { isDark }: any = useOutletContext();

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-all duration-700 overflow-hidden flex flex-col",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">
          {profile?.organization_id && (
            <PicksGrid organizationId={profile.organization_id} isDark={isDark} />
          )}
        </section>
      </div>
    </div>
  );
}
