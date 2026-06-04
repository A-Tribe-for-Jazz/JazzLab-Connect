import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudentGrid from '../../components/partner/StudentGrid';
import { cn } from '@/lib/utils';
import { useOutletContext } from 'react-router-dom';

export default function PartnerStudents() {
  const { profile } = useAuth();
  const { isDark, activeCampDayId }: any = useOutletContext();

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-all duration-700 overflow-hidden flex flex-col",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">
          {profile?.organization_id && (
            <StudentGrid key={activeCampDayId} organizationId={profile.organization_id} isDark={isDark} activeCampDayId={activeCampDayId} />
          )}
        </section>
      </div>
    </div>
  );
}
