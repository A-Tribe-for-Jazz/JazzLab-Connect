import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StaffGrid from '../../components/partner/StaffGrid';
import { cn } from '@/lib/utils';
import { getThemeClasses } from '../../lib/theme';

export default function PartnerStaff() {
  const { profile } = useAuth();
  const { isDark, bgFlavor, childFlushRef }: any = useOutletContext();


  const theme = getThemeClasses(isDark, bgFlavor);

  return (
    <div className={cn(
      'h-[calc(100dvh-5rem)] transition-all duration-700 overflow-hidden flex flex-col',
      theme.bg
    )}>

      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">
          {profile?.organization_id && (
            <StaffGrid
              organizationId={profile.organization_id}
              isDark={isDark}
              bgFlavor={bgFlavor}
            />
          )}
        </section>
      </div>
    </div>
  );
}
