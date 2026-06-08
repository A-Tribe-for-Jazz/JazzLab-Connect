import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Sun, Moon, Construction } from 'lucide-react';
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

  return (
    <div className={cn("min-h-screen flex flex-col transition-colors duration-700", isDark ? "bg-black text-white" : "bg-slate-50/50 text-slate-900")}>
      {/* Header Bar */}
      <header className={cn(
        "sticky top-0 z-40 h-16 flex items-center border-b transition-all duration-700 shadow-sm",
        isDark ? "bg-black/95 border-white/10" : "bg-white border-slate-200"
      )}>
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/educator/roster" className="flex items-center gap-2.5 group transition-all">
              <div className="h-9 w-9 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <GraduationCap size={20} />
              </div>
              <div className="flex flex-col">
                <span className={cn("font-bold text-sm leading-tight tracking-tight transition-colors duration-700", isDark ? "text-white" : "text-slate-900")}>Educator Portal</span>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-700", isDark ? "text-slate-400" : "text-slate-500")}>Jazz Lab Connect</span>
              </div>
            </Link>
          </div>

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
        "flex-1 transition-colors duration-700 flex flex-col items-center justify-center",
        isDark ? "bg-black" : "bg-white"
      )}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center",
            isDark ? "bg-white/5" : "bg-slate-100"
          )}>
            <Construction size={26} className={isDark ? "text-slate-400" : "text-slate-400"} />
          </div>
          <div>
            <h2 className={cn("text-lg font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Under Development
            </h2>
            <p className={cn("text-[13px] font-semibold mt-1", isDark ? "text-slate-500" : "text-slate-400")}>
              The Educator Portal is coming soon.
            </p>
          </div>
        </div>
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
            &copy; 2024 A Tribe for Jazz &bull; Educator Access
          </p>
        </div>
      </footer>
    </div>
  );
}
