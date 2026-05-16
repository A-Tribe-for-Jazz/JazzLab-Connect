import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, LayoutDashboard, Users as UsersIcon, Music, Calendar, SplitSquareHorizontal, FileDown, User as UserIcon, UserPlus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Organizations', path: '/admin/organizations', icon: UsersIcon },
    { name: 'Labs', path: '/admin/labs', icon: Music },
    { name: 'Schedule', path: '/admin/schedule', icon: Calendar },
    { name: 'Assignment', path: '/admin/assignment', icon: SplitSquareHorizontal },
    { name: 'Reports', path: '/admin/reports', icon: FileDown },
    { name: 'System Users', path: '/admin/users', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 group transition-all">
              <div className="h-9 w-9 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-md shadow-slate-900/20 group-hover:scale-105 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight tracking-tight text-slate-900">Admin Control</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">JazzLab Connect</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <UserIcon size={14} className="text-slate-400" />
              <span>{profile?.full_name}</span>
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>

        {/* Horizontal Navigation */}
        <div className="bg-white border-b border-slate-100">
          <div className="container mx-auto px-4 md:px-6 overflow-x-auto no-scrollbar">
            <nav className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-xs tracking-wide uppercase transition-all whitespace-nowrap ${
                        isActive
                          ? 'border-slate-900 text-slate-900 bg-slate-50'
                          : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={14} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
                        {item.name}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 animate-in fade-in duration-500 max-w-7xl">
        <Outlet />
      </main>
      
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            &copy; 2024 A Tribe for Jazz &bull; System Administration
          </p>
        </div>
      </footer>
    </div>
  );
}
