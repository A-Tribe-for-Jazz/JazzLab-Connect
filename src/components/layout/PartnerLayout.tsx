import React from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, Microscope, Sun, Moon, Calendar, UserCheck, Palette, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '../../lib/supabase';
import { getThemeClasses, type BgFlavor } from '../../lib/theme';

export default function PartnerLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = React.useState(false);
  const [bgFlavor, setBgFlavor] = React.useState<BgFlavor>(() => {
    return (localStorage.getItem('portal_bg_flavor') as BgFlavor) || 'slate';
  });
  const [campDays, setCampDays] = React.useState<any[]>([]);
  const [activeCampDayId, setActiveCampDayId] = React.useState<string>('');
  const childFlushRef = React.useRef<(() => Promise<void>) | null>(null);

  const handleBgFlavorChange = (flavor: BgFlavor) => {
    setBgFlavor(flavor);
    localStorage.setItem('portal_bg_flavor', flavor);
  };

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);

    const theme = getThemeClasses(isDark, bgFlavor);
    if (isDark) {
      if (bgFlavor === 'zinc') {
        document.body.style.backgroundColor = '#09090b';
        document.documentElement.style.backgroundColor = '#09090b';
      } else if (bgFlavor === 'classic') {
        document.body.style.backgroundColor = '#000000';
        document.documentElement.style.backgroundColor = '#000000';
      } else {
        document.body.style.backgroundColor = '#090d16';
        document.documentElement.style.backgroundColor = '#090d16';
      }
    } else {
      if (bgFlavor === 'zinc') {
        document.body.style.backgroundColor = '#f4f4f5';
        document.documentElement.style.backgroundColor = '#f4f4f5';
      } else if (bgFlavor === 'classic') {
        document.body.style.backgroundColor = '#ffffff';
        document.documentElement.style.backgroundColor = '#ffffff';
      } else {
        document.body.style.backgroundColor = '#f8fafc';
        document.documentElement.style.backgroundColor = '#f8fafc';
      }
    }
  }, [isDark, bgFlavor]);

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
    { name: 'Dashboard', path: '/partner/dashboard', icon: LayoutDashboard },
    { name: 'Student Data', path: '/partner/students', icon: Users },
    { name: 'Lab Preferences', path: '/partner/lab-picks', icon: Microscope },
    { name: 'Staff Data', path: '/partner/staff', icon: UserCheck },
    { name: 'Schedules', path: '/partner/schedule', icon: Calendar },
  ];

  const theme = getThemeClasses(isDark, bgFlavor);

  return (
    <div className={cn("min-h-screen flex flex-col transition-colors duration-700", theme.bg)}>
      <PortalHeader
        navItems={navItems}
        onSignOut={handleSignOut}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        bgFlavor={bgFlavor}
        onBgFlavorChange={handleBgFlavorChange}
        hideBorder={isDataGridRoute}
        campDays={campDays}
        activeCampDayId={activeCampDayId}
        setActiveCampDayId={setActiveCampDayId}
        childFlushRef={childFlushRef}
      />

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 transition-colors duration-700 flex flex-col",
        theme.bg
      )}>
        <div className="flex-1 min-h-0 flex flex-col">
          <Outlet context={{ isDark, bgFlavor, activeCampDayId, setActiveCampDayId, campDays, childFlushRef }} />
        </div>
      </main>

      {/* Global Sticky Footer */}
      {!isDataGridRoute && (
        <footer className={cn(
          "py-6 text-center border-t transition-all duration-700 mt-auto",
          theme.headerBg
        )}>
          <p className={cn(
            "text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-700",
            isDark ? "text-slate-700" : "text-slate-350"
          )}>
            &copy; 2026 A Tribe for Jazz.
          </p>
        </footer>
      )}
    </div>
  );
}

function PortalHeader({ navItems, onSignOut, isDark, onToggleTheme, bgFlavor, onBgFlavorChange, hideBorder, campDays, activeCampDayId, setActiveCampDayId, childFlushRef }: any) {
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

  const theme = getThemeClasses(isDark, bgFlavor);

  return (
    <header className={cn(
      "sticky top-0 z-50 h-16 flex items-center px-8 transition-all duration-700 backdrop-blur-md",
      !hideBorder ? "border-b" : "border-b-transparent",
      theme.headerBg
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
                "flex items-center p-0.5 rounded-xl border gap-1 shadow-inner transition-colors duration-700",
                isDark ? "bg-white/5" : "bg-slate-100/50",
                theme.border
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
                      <span className="relative flex h-[10px] w-[10px] min-w-[10px] min-h-[10px] max-w-[10px] max-h-[10px] shrink-0 items-center justify-center">
                        <svg
                          className={cn(
                            "h-[6px] w-[6px] min-w-[6px] min-h-[6px] max-w-[6px] max-h-[6px] text-emerald-500 dark:text-emerald-400 transition-opacity duration-300",
                            isActive ? "opacity-100" : "opacity-0"
                          )}
                          viewBox="0 0 8 8"
                          fill="currentColor"
                        >
                          <circle cx="4" cy="4" r="3" />
                        </svg>
                        {isActive && (
                          <svg
                            className="absolute inset-0 m-auto h-[6px] w-[6px] min-w-[6px] min-h-[6px] max-w-[6px] max-h-[6px] text-emerald-500 dark:text-emerald-400 animate-ping-slow"
                            viewBox="0 0 8 8"
                            fill="currentColor"
                          >
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                        )}
                      </span>
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

        <div className="flex items-center justify-end gap-3 w-72 h-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "transition-colors p-2 rounded-xl border flex items-center justify-center cursor-pointer",
                  isDark ? "text-slate-400 hover:text-white border-white/10 hover:bg-white/5" : "text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                )}
                title="Change Background Theme"
              >
                <Palette size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn(
                "w-48 rounded-xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300",
                isDark ? "bg-slate-950/90 border-white/10 text-white shadow-black" : "bg-white/95 border-slate-100 text-slate-900"
              )}
            >
              <div className={cn("px-3 py-1.5 text-[10px] font-black uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>
                Background Style
              </div>
              <DropdownMenuItem
                onClick={() => onBgFlavorChange('slate')}
                className={cn(
                  "rounded-lg font-semibold text-[13px] py-2 px-3 cursor-pointer transition-colors duration-200 my-0.5 flex items-center justify-between",
                  bgFlavor === 'slate' ? (isDark ? "bg-white/5 text-white" : "bg-slate-100 text-slate-900") : "",
                  isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                )}
              >
                <span>Soft Slate</span>
                {bgFlavor === 'slate' && <Check size={14} className="text-sky-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBgFlavorChange('zinc')}
                className={cn(
                  "rounded-lg font-semibold text-[13px] py-2 px-3 cursor-pointer transition-colors duration-200 my-0.5 flex items-center justify-between",
                  bgFlavor === 'zinc' ? (isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-900") : "",
                  isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                )}
              >
                <span>Warm Zinc</span>
                {bgFlavor === 'zinc' && <Check size={14} className="text-sky-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBgFlavorChange('classic')}
                className={cn(
                  "rounded-lg font-semibold text-[13px] py-2 px-3 cursor-pointer transition-colors duration-200 my-0.5 flex items-center justify-between",
                  bgFlavor === 'classic' ? (isDark ? "bg-white/5 text-white" : "bg-slate-100 text-slate-900") : "",
                  isDark ? "focus:bg-white/5 focus:text-white" : "focus:bg-slate-50 focus:text-slate-900"
                )}
              >
                <span>Classic B&W</span>
                {bgFlavor === 'classic' && <Check size={14} className="text-sky-500" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onToggleTheme}
            className={cn(
              "transition-colors p-2 rounded-xl border flex items-center justify-center cursor-pointer",
              isDark ? "text-slate-400 hover:text-amber-400 border-white/10 hover:bg-white/5" : "text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
            )}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={onSignOut} className="text-[11.5px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors whitespace-nowrap pl-2">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
