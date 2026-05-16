import React from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, Star, User as UserIcon, Sun, Moon, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PartnerLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = React.useState(false);

  const isDataGridRoute = ['/partner/students', '/partner/lab-picks'].includes(location.pathname);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/partner/dashboard', icon: LayoutDashboard },
    { name: 'Student Directory', path: '/partner/students', icon: Users },
    { name: 'Lab Preferences', path: '/partner/lab-picks', icon: Star },
    { name: 'Final Placements', path: '/partner/schedule', icon: Calendar },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Final Muse Centered Header */}
      <PortalHeader 
        navItems={navItems} 
        onSignOut={handleSignOut} 
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        hideBorder={isDataGridRoute}
      />

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 transition-colors duration-700 flex flex-col",
        isDark ? "bg-black" : "bg-white"
      )}>
        <div className="flex-1 min-h-0 flex flex-col">
           <Outlet context={{ isDark }} />
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
             &copy; 2026 A Tribe for Jazz. All Rights Reserved.
           </p>
        </footer>
      )}
    </div>
  );
}

function PortalHeader({ navItems, onSignOut, isDark, onToggleTheme, hideBorder }: any) {
  return (
    <header className={cn(
      "sticky top-0 z-50 h-16 flex items-center px-8 transition-all duration-700",
      !hideBorder && "border-b",
      isDark ? cn("bg-black/95 backdrop-blur-md", !hideBorder && "border-white/10") : cn("bg-white/95 backdrop-blur-md", !hideBorder && "border-slate-200")
    )}>
       <div className="flex items-center justify-between w-full max-w-7xl mx-auto h-full">
          {/* Logo on Left */}
          <Link to="/partner/dashboard" className="flex items-center gap-3 group w-48 h-full">
             <Music className={cn("transition-colors duration-700", isDark ? "text-blue-500" : "text-primary")} size={20} />
             <span className={cn("font-black text-sm tracking-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>JazzLab</span>
          </Link>
          
          {/* Navigation Centered */}
          <nav className="flex items-center gap-8 h-full">
             {navItems.map((item: any) => (
               <NavLink
                 key={item.name}
                 to={item.path}
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
                     {/* Underline Indicator */}
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

          {/* Controls on Right */}
          <div className="flex items-center justify-end gap-5 w-48 h-full">
             <button 
               onClick={onToggleTheme}
               className={cn(
                 "transition-colors",
                 isDark ? "text-slate-400 hover:text-amber-400" : "text-slate-400 hover:text-slate-900"
               )}
             >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button onClick={onSignOut} className={cn(
               "text-[13px] font-semibold transition-colors",
               isDark ? "text-slate-400 hover:text-rose-400" : "text-slate-500 hover:text-rose-600"
             )}>
                Sign Out
             </button>
          </div>
       </div>
    </header>
  );
}

// Helper for dynamic icon styling
const Music = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
