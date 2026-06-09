import React from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EducatorLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const navItems = [
    { name: 'Dashboard', path: '/educator/dashboard' },
    { name: 'My Roster', path: '/educator/roster' },
    { name: 'Camp Schedule', path: '/educator/schedule' },
  ];

  return (
    <div className={cn("min-h-screen flex flex-col transition-colors duration-700", isDark ? "bg-black text-white" : "bg-slate-50/50 text-slate-900")}>
      {/* Header Bar */}
      <header className={cn(
        "sticky top-0 z-40 h-16 flex items-center border-b transition-all duration-700 shadow-sm",
        isDark ? "bg-black/95 border-white/10" : "bg-white border-slate-200"
      )}>
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between h-full">
          {/* Logo / Title */}
          <div className="flex items-center gap-4">
            <Link to="/educator/dashboard" className="flex items-center gap-2.5 group transition-all">
              <div className="h-9 w-9 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <GraduationCap size={20} />
              </div>
              <div className="flex flex-col">
                <span className={cn("font-bold text-sm leading-tight tracking-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>Educator Portal</span>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>JazzLab Connect</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links (Centered) */}
          <nav className="hidden md:flex items-center gap-6 xl:gap-8 h-full">
             {navItems.map((item: any) => (
               <NavLink
                 key={item.name}
                 to={item.path}
                 className={({ isActive }) => cn(
                   "relative flex items-center h-full text-[13px] font-semibold transition-all duration-500 whitespace-nowrap",
                   isActive 
                     ? (isDark ? "text-white" : "text-emerald-600") 
                     : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                 )}
               >
                 {({ isActive }) => (
                   <>
                     <span>{item.name}</span>
                     {/* Underline Indicator */}
                     {isActive && (
                       <div className={cn(
                         "absolute bottom-0 left-0 w-full h-[2px] rounded-t-full transition-all duration-300",
                         isDark ? "bg-white" : "bg-emerald-600"
                       )} />
                     )}
                   </>
                 )}
               </NavLink>
             ))}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDark(!isDark)}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDark ? "text-slate-400 hover:text-amber-400 hover:bg-white/5" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={handleSignOut}
              className="text-[11.5px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors whitespace-nowrap"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 transition-colors duration-700 flex flex-col",
        isDark ? "bg-black" : "bg-white"
      )}>
         <Outlet context={{ isDark }} />
      </main>

      <footer className={cn(
        "border-t transition-all duration-700 py-6",
        isDark ? "bg-black border-white/10" : "bg-white border-slate-200"
      )}>
        <div className="container mx-auto px-4 text-center">
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-widest transition-colors duration-700",
            isDark ? "text-slate-600" : "text-slate-400"
          )}>
            &copy; 2026 A Tribe for Jazz &bull; Educator Access
          </p>
        </div>
      </footer>
    </div>
  );
}
