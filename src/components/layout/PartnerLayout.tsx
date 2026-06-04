import React from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, Microscope, Sun, Moon, Calendar, UserCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '../../lib/supabase';

export default function PartnerLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = React.useState(false);
  const [campDays, setCampDays] = React.useState<any[]>([]);
  const [activeCampDayId, setActiveCampDayId] = React.useState<string>('');
  const childFlushRef = React.useRef<(() => Promise<void>) | null>(null);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  React.useEffect(() => {
    if (!profile?.organization_id) return;
    
    const fetchCampDays = async () => {
      try {
        const { data, error } = await supabase
          .from('camp_day_organizations')
          .select(`
            camp_days (
              id,
              date
            )
          `)
          .eq('organization_id', profile.organization_id);
          
        if (error) throw error;
        
        if (data) {
          const days = data
            .map((item: any) => {
              const rawDay = item.camp_days;
              return Array.isArray(rawDay) ? rawDay[0] : rawDay;
            })
            .filter((d: any) => d && d.id && d.date)
            .sort((a: any, b: any) => a.date.localeCompare(b.date));
            
          setCampDays(days);
          
          if (days.length > 0) {
            setActiveCampDayId(prev => prev || days[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching camp days:', err);
      }
    };
    
    fetchCampDays();
  }, [profile?.organization_id]);

  const isDataGridRoute = ['/partner/students', '/partner/staff', '/partner/lab-picks', '/partner/schedule'].includes(location.pathname);

  const handleSignOut = async () => {
    if (childFlushRef.current) {
      try {
        await childFlushRef.current();
      } catch (err) {
        console.error('Error flushing to DB before sign out:', err);
      }
    }
    await signOut();
    navigate('/signin');
  };

  const navItems = [
    { name: 'Overview', path: '/partner/dashboard', icon: LayoutDashboard },
    { name: 'Student Data', path: '/partner/students', icon: Users },
    { name: 'Lab Preferences', path: '/partner/lab-picks', icon: Microscope },
    { name: 'Staff Data', path: '/partner/staff', icon: UserCheck },
    { name: 'Final Placements', path: '/partner/schedule', icon: Calendar },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <PortalHeader
        navItems={navItems}
        onSignOut={handleSignOut}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        hideBorder={isDataGridRoute}
        campDays={campDays}
        activeCampDayId={activeCampDayId}
        setActiveCampDayId={setActiveCampDayId}
        childFlushRef={childFlushRef}
      />

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 transition-colors duration-700 flex flex-col",
        isDark ? "bg-black" : "bg-white"
      )}>
        <div className="flex-1 min-h-0 flex flex-col">
           <Outlet context={{ isDark, activeCampDayId, setActiveCampDayId, campDays, childFlushRef }} />
        </div>
      </main>

      {/* Global Sticky Footer */}
      {!isDataGridRoute && (
        <footer className={cn(
          "py-6 text-center border-t transition-all duration-700 mt-auto",
          isDark ? "bg-black border-white/5" : "bg-white border-slate-100"
        )}>
           <p className={cn(
             "text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-700",
             isDark ? "text-slate-700" : "text-slate-300"
           )}>
             &copy; 2026 A Tribe for Jazz.
           </p>
        </footer>
      )}
    </div>
  );
}

function PortalHeader({ navItems, onSignOut, isDark, onToggleTheme, hideBorder, campDays, activeCampDayId, setActiveCampDayId, childFlushRef }: any) {
  const navigate = useNavigate();

  const handleNavClick = async (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (childFlushRef?.current) {
      e.preventDefault();
      try {
        await childFlushRef.current();
      } catch (err) {
        console.error('Error flushing to DB before navigation:', err);
      }
      navigate(path);
    }
  };

  const handleCampDayChange = async (dayId: string) => {
    if (activeCampDayId === dayId) return;
    if (childFlushRef?.current) {
      try {
        await childFlushRef.current();
      } catch (err) {
        console.error('Error flushing to DB before camp day switch:', err);
      }
    }
    setActiveCampDayId(dayId);
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 h-16 flex items-center px-8 transition-all duration-700",
      !hideBorder && "border-b",
      isDark ? cn("bg-black/95 backdrop-blur-md", !hideBorder && "border-white/10") : cn("bg-white/95 backdrop-blur-md", !hideBorder && "border-slate-200")
    )}>
       <div className="flex items-center justify-between w-full h-full">
          <div className="flex items-center gap-4 w-72 h-full shrink-0">
            <Link 
              to="/partner/dashboard" 
              onClick={(e) => handleNavClick(e, '/partner/dashboard')}
              className="flex items-center"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
                <img src="/atfj-logo.png" alt="ATFJ" className="h-full w-full object-cover" />
              </div>
            </Link>
            
            {campDays && campDays.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "text-[13px] font-semibold tracking-tight transition-colors duration-500",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  Select Camp Day:
                </span>
                <div className={cn(
                  "flex items-center p-0.5 rounded-xl border gap-1 shadow-inner",
                  isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200/60"
                )}>
                  {campDays.map((day: any) => {
                    const isActive = activeCampDayId === day.id;
                    const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <button
                        key={day.id}
                        onClick={() => handleCampDayChange(day.id)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 border",
                          isActive 
                            ? (isDark 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]" 
                                : "bg-white text-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.15)] border-emerald-200")
                            : (isDark 
                                ? "bg-transparent border-transparent text-slate-400 hover:text-white" 
                                : "bg-transparent border-transparent text-slate-500 hover:text-slate-900")
                        )}
                      >
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0 transition-opacity duration-300",
                          isActive ? "animate-ping opacity-100" : "opacity-0"
                        )} />
                        {formattedDate}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <nav className="flex items-center gap-8 h-full">
             {navItems.map((item: any) => (
               <NavLink
                 key={item.name}
                 to={item.path}
                 onClick={(e) => handleNavClick(e, item.path)}
                 className={({ isActive }) => cn(
                   "relative flex items-center h-full text-[13px] font-semibold transition-all duration-500",
                   isActive 
                     ? (isDark ? "text-white" : "text-blue-600") 
                     : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                 )}
               >
                 {({ isActive }) => (
                   <>
                     {item.name}
                     {isActive && (
                       <div className={cn(
                         "absolute bottom-0 left-0 w-full h-[2px] rounded-t-full transition-all duration-300",
                         isDark ? "bg-white" : "bg-blue-600"
                       )} />
                     )}
                   </>
                 )}
               </NavLink>
             ))}
          </nav>

          <div className="flex items-center justify-end gap-4 w-72 h-full">
             <button
               onClick={onToggleTheme}
               className={cn(
                 "transition-colors",
                 isDark ? "text-slate-400 hover:text-amber-400" : "text-slate-400 hover:text-slate-900"
               )}
             >
               {isDark ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button onClick={onSignOut} className="text-[11.5px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors whitespace-nowrap">
               Sign Out
             </button>
          </div>
       </div>
    </header>
  );
}
