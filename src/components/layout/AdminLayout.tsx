import React from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sun, Moon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const isDataGridRoute = ['/admin/assignments', '/admin/partners', '/admin/labs', '/admin/system-users', '/admin/schedules'].includes(location.pathname)
    || location.pathname.startsWith('/admin/labs/');

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Partners', path: '/admin/partners' },
    { name: 'Labs', path: '/admin/labs' },
    { name: 'Assignments', path: '/admin/assignments' },
    { name: 'Schedules', path: '/admin/schedules' },
    { name: 'System Users', path: '/admin/system-users' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Final Muse Centered Header */}
      <PortalHeader
        navItems={navItems}
        onSignOut={handleSignOut}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        hideBorder={false}
      />

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 transition-colors duration-700 flex flex-col",
        isDark ? "bg-black" : "bg-white"
      )}>
        <div className={cn(
          "flex-1 min-h-0 flex flex-col",
          isDataGridRoute ? "w-full" : "container mx-auto px-8 py-12 max-w-7xl"
        )}>
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
             &copy; 2026 A Tribe for Jazz.
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
       <div className="flex items-center justify-between w-full h-full">
          {/* Logo on Left */}
          <Link to="/admin/dashboard" className="flex items-center w-48 h-full">
            <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
              <img src="/atfj-logo.png" alt="ATFJ" className="h-full w-full object-cover" />
            </div>
          </Link>
          
          {/* Navigation Centered */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 h-full">
             {navItems.map((item: any) => (
               <NavLink
                 key={item.name}
                 to={item.path}
                 className={({ isActive }) => cn(
                   "relative flex items-center h-full text-[13px] font-semibold transition-all duration-500 whitespace-nowrap",
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
          <div className="flex items-center justify-end gap-4 w-48 h-full">
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
