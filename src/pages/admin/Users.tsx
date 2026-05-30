import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Mail, Shield, Building2, Users, Search,
  ArrowUpDown, ChevronUp, ChevronDown, X,
  UserPlus, Microscope, AlertCircle, Trash2, Settings
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  organization_id: string | null;
  organizations?: { name: string } | null;
  lab_instructors?: { labs?: { id: string; name: string } | null }[] | null;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Lab {
  id: string;
  name: string;
}

type SortField = 'full_name' | 'role' | 'organization' | 'created_at';

export default function AdminUsers() {
  const { isDark }: any = useOutletContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [manageUser, setManageUser] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, email, role, organization_id, created_at,
          organizations(name),
          lab_instructors(labs(id, name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as any) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const processedUsers = useMemo(() => {
    let result = [...users];

    // Text search
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(user => {
        const name = (user.full_name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const orgName = (user.organizations?.name || '').toLowerCase();
        const labName = (user.role === 'educator' ? user.lab_instructors?.map((li: any) => li.labs?.name).filter(Boolean).join(', ') : '') || '';
        return name.includes(query) || email.includes(query) || orgName.includes(query) || labName.toLowerCase().includes(query);
      });
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'full_name') {
        aVal = (a.full_name || '').toLowerCase();
        bVal = (b.full_name || '').toLowerCase();
      } else if (sortField === 'role') {
        aVal = a.role;
        bVal = b.role;
      } else if (sortField === 'organization') {
        const aOrg = a.organizations?.name || (a.role === 'educator' ? a.lab_instructors?.map((li: any) => li.labs?.name).filter(Boolean).join(', ') : '') || 'zzz';
        const bOrg = b.organizations?.name || (b.role === 'educator' ? b.lab_instructors?.map((li: any) => li.labs?.name).filter(Boolean).join(', ') : '') || 'zzz';
        aVal = aOrg.toLowerCase();
        bVal = bOrg.toLowerCase();
      } else if (sortField === 'created_at') {
        aVal = a.created_at;
        bVal = b.created_at;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchTerm, roleFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="ml-1.5 opacity-30 group-hover:opacity-70 transition-opacity" />;
    return sortAsc
      ? <ChevronUp size={12} className="ml-1.5 text-sky-500" />
      : <ChevronDown size={12} className="ml-1.5 text-sky-500" />;
  };

  const getRoleColor = (role: string) => {
    if (role === 'master_admin') return isDark ? "text-rose-400" : "text-rose-600";
    if (role === 'educator') return isDark ? "text-emerald-400" : "text-emerald-600";
    return isDark ? "text-sky-400" : "text-sky-600";
  };

  const getRoleLabel = (role: string) => {
    if (role === 'master_admin') return 'Admin';
    if (role === 'educator') return 'Educator';
    return 'Partner';
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteConfirm.id);
      if (error) throw error;
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Stats
  const adminCount = users.filter(u => u.role === 'master_admin').length;
  const partnerCount = users.filter(u => u.role === 'partner').length;
  const educatorCount = users.filter(u => u.role === 'educator').length;

  const thCls = cn(
    "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 overflow-hidden",
    isDark
      ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md"
      : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
  );

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] transition-all duration-700 overflow-hidden flex flex-col",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>
      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">
          <div
            className={cn(
              "absolute -inset-2 rounded-[4.5rem] blur-3xl opacity-0 transition-opacity duration-1000 group-hover:opacity-10 pointer-events-none",
              isDark ? "bg-blue-500" : "bg-slate-300"
            )}
          />

          {loading ? (
            <div className="p-40 text-center flex flex-col items-center justify-center space-y-4">
              <div className={cn(
                "size-12 border-4 rounded-full animate-spin",
                isDark ? "border-white/10 border-t-white" : "border-slate-200 border-t-slate-900"
              )}></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading system user directory...</p>
            </div>
          ) : (
            <div className={cn(
              "rounded-[1.25rem] border transition-colors duration-700 overflow-hidden relative flex flex-col flex-1 min-h-0",
              isDark
                ? "bg-[#020617] border-white/10 shadow-2xl shadow-black/40"
                : "bg-white border-slate-200 shadow-xl shadow-slate-200/40"
            )}>
              {/* Toolbar */}
              <div className={cn(
                "p-3 md:p-4 border-b",
                isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/30"
              )}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Search */}
                  <div className="relative flex-1 w-full group/search">
                    <Search
                      className={cn(
                        "absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 z-10",
                        isDark
                          ? "text-sky-700 group-hover/search:text-sky-400 group-focus-within/search:text-sky-400"
                          : "text-sky-300 group-hover/search:text-sky-600 group-focus-within/search:text-sky-600"
                      )}
                      size={20}
                    />
                    <Input
                      placeholder="Search users by name, email, or organization..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(
                        "pl-16 h-10 rounded-xl border-2 transition-all duration-500 text-[13px] font-medium outline-none w-full",
                        isDark
                          ? "bg-sky-400/[0.03] border-white/10 text-white hover:border-sky-400/50 hover:bg-sky-400/5 focus-visible:border-sky-400/50 focus-visible:bg-sky-400/5 focus-visible:ring-0"
                          : "bg-sky-50/20 border-slate-200 text-slate-900 hover:border-sky-500/30 hover:bg-sky-50/50 focus-visible:border-sky-500/30 focus-visible:bg-sky-50/50 focus-visible:ring-0"
                      )}
                    />
                  </div>

                  {/* Role filter + Stats + Invite button */}
                  <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                    {/* Role filter */}
                    <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
                      <SelectTrigger className={cn(
                        "h-10 rounded-xl border-2 text-[13px] font-medium w-[160px] transition-all duration-300",
                        isDark
                          ? "bg-white/[0.03] border-white/10 text-white hover:border-white/20 focus:ring-0"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:ring-0"
                      )}>
                        <span>
                          {roleFilter === 'all' ? 'All Roles' :
                           roleFilter === 'master_admin' ? `Admin (${adminCount})` :
                           roleFilter === 'partner' ? `Partner (${partnerCount})` :
                           `Educator (${educatorCount})`}
                        </span>
                      </SelectTrigger>
                      <SelectContent className={cn(
                        "rounded-xl border shadow-2xl p-1",
                        isDark ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-100 text-slate-900"
                      )}>
                        <SelectItem value="all" className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">All Roles</SelectItem>
                        <SelectItem value="master_admin" className={cn("font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer", isDark ? "text-rose-400" : "text-rose-600")}>
                          Admin ({adminCount})
                        </SelectItem>
                        <SelectItem value="partner" className={cn("font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer", isDark ? "text-sky-400" : "text-sky-600")}>
                          Partner ({partnerCount})
                        </SelectItem>
                        <SelectItem value="educator" className={cn("font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer", isDark ? "text-emerald-400" : "text-emerald-600")}>
                          Educator ({educatorCount})
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Invite button */}
                    <Button
                      onClick={() => setIsInviteModalOpen(true)}
                      className={cn(
                        "rounded-xl h-10 px-5 font-semibold tracking-wide text-[13px] transition-all duration-300 border flex items-center gap-2 shrink-0 md:w-auto w-full justify-center shadow-sm",
                        isDark
                          ? "bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50"
                          : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                      )}
                    >
                      <Plus size={16} />
                      <span>Invite User</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Spreadsheet Data Grid */}
              <div className="flex-1 overflow-auto min-h-0">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-40">
                    <tr className={cn(
                      "border-b transition-colors duration-700",
                      isDark ? "border-white/10" : "border-slate-300"
                    )}>
                      <th className={cn(thCls, "text-center w-[60px]")}>#</th>
                      <th
                        onClick={() => handleSort('full_name')}
                        className={cn(thCls, "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all select-none group w-[280px]")}
                      >
                        <div className="flex items-center">
                          <span>Name</span>
                          {renderSortArrow('full_name')}
                        </div>
                      </th>
                      <th className={cn(thCls, "w-[260px]")}>Email</th>
                      <th
                        onClick={() => handleSort('role')}
                        className={cn(thCls, "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all select-none group text-center w-[130px]")}
                      >
                        <div className="flex items-center justify-center">
                          <span>Role</span>
                          {renderSortArrow('role')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('organization')}
                        className={cn(thCls, "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all select-none group w-[220px]")}
                      >
                        <div className="flex items-center">
                          <span>Organization / Lab</span>
                          {renderSortArrow('organization')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('created_at')}
                        className={cn(thCls, "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all select-none group text-center w-[150px]")}
                      >
                        <div className="flex items-center justify-center">
                          <span>Joined</span>
                          {renderSortArrow('created_at')}
                        </div>
                      </th>
                      <th className={cn(thCls, "text-center w-[140px]")}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedUsers.map((user, index) => {
                      const initials = user.full_name
                        ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        : '?';

                      return (
                        <tr
                          key={user.id}
                          className={cn(
                            "h-10 border-b transition-colors duration-300 group",
                            isDark
                              ? "border-white/10 hover:bg-white/[0.02]"
                              : "border-slate-200 hover:bg-slate-50/30"
                          )}
                        >
                          {/* # Index */}
                          <td className={cn(
                            "py-1 text-center font-medium opacity-40 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            {String(index + 1).padStart(2, '0')}
                          </td>

                          {/* Name */}
                          <td className={cn(
                            "py-1 px-4 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "size-7 rounded-full flex items-center justify-center text-[9px] font-semibold border uppercase shrink-0",
                                isDark ? "bg-slate-900 border-white/10 text-sky-400" : "bg-sky-50 border-sky-100 text-sky-700"
                              )}>
                                {initials}
                              </div>
                              <span className={cn("font-semibold text-[13px] truncate", isDark ? "text-white" : "text-slate-900")}>
                                {user.full_name || <span className={cn("italic font-normal", isDark ? "text-slate-600" : "text-slate-400")}>Pending Invite</span>}
                              </span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className={cn(
                            "py-1 px-4 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            {user.email ? (
                              <div className="flex items-center gap-1.5">
                                <span className={cn("text-[13px] font-medium truncate", isDark ? "text-slate-300" : "text-slate-600")}>
                                  {user.email}
                                </span>
                                <a
                                  href={`mailto:${user.email}`}
                                  title={`Email ${user.full_name || user.email}`}
                                  className={cn(
                                    "inline-flex items-center justify-center transition-all duration-300 shrink-0",
                                    isDark ? "text-slate-500 hover:text-sky-400" : "text-slate-400 hover:text-blue-600"
                                  )}
                                >
                                  <Mail size={12} className="shrink-0" />
                                </a>
                              </div>
                            ) : (
                              <span className={cn("text-[13px] font-medium italic", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                            )}
                          </td>

                          {/* Role */}
                          <td className={cn(
                            "py-1 px-4 text-center border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <span className={cn("text-[13px] font-semibold", getRoleColor(user.role))}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>

                          {/* Organization */}
                          <td className={cn(
                            "py-1 px-4 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            {user.organizations?.name ? (
                              <div className="flex items-center gap-1.5">
                                <Building2 size={13} className={isDark ? "text-slate-600 shrink-0" : "text-slate-400 shrink-0"} />
                                <span className={cn("text-[13px] font-medium truncate", isDark ? "text-slate-200" : "text-slate-700")}>
                                  {user.organizations.name}
                                </span>
                              </div>
                            ) : user.role === 'educator' ? (
                              user.lab_instructors && user.lab_instructors.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <Microscope size={13} className={isDark ? "text-slate-600 shrink-0" : "text-slate-400 shrink-0"} />
                                  <span className={cn("text-[13px] font-medium truncate", isDark ? "text-slate-200" : "text-slate-700")}>
                                    {user.lab_instructors.map((li: any) => li.labs?.name).filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              ) : (
                                <span className={cn("text-[13px] font-medium italic", isDark ? "text-slate-600" : "text-slate-400")}>
                                  Unassigned
                                </span>
                              )
                            ) : (
                              <span className={cn("text-[13px] font-medium italic", isDark ? "text-slate-600" : "text-slate-400")}>
                                {user.role === 'master_admin' ? 'System-wide' : '—'}
                              </span>
                            )}
                          </td>

                          {/* Joined */}
                          <td className={cn(
                            "py-1 px-4 text-center border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <span className={cn("text-[13px] font-medium", isDark ? "text-slate-300" : "text-slate-500")}>
                              {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-1 px-4 text-center overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                onClick={() => setManageUser(user)}
                                className={cn(
                                  "rounded-xl h-8 px-3 font-semibold tracking-wide text-[10px] transition-all duration-300 border flex items-center gap-1.5",
                                  isDark
                                    ? "bg-sky-500/15 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 shadow-md shadow-sky-500/5"
                                    : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 shadow-sm"
                                )}
                              >
                                <Settings size={11} />
                                Manage
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {processedUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                            <Users size={32} className="text-slate-400" />
                            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                              No users found matching filters
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Invite User Modal */}
      <InviteModal
        isDark={isDark}
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        onSuccess={() => { setIsInviteModalOpen(false); fetchUsers(); }}
      />

      {/* Manage User Modal */}
      {manageUser && (
        <ManageUserModal
          user={manageUser}
          isDark={isDark}
          onClose={() => setManageUser(null)}
          onSave={() => { setManageUser(null); fetchUsers(); }}
          onDelete={(user) => { setManageUser(null); setDeleteConfirm(user); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent
            showCloseButton={false}
            className={cn(
              "sm:max-w-[420px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl",
              isDark ? "bg-[#020617] text-white shadow-black" : "bg-white text-slate-900"
            )}
          >
            <DialogHeader className={cn(
              "p-6 border-b relative",
              isDark ? "border-white/5" : "border-slate-100"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-md",
                  isDark
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-400 shadow-rose-950/20"
                    : "bg-rose-50 border-rose-100 text-rose-600 shadow-rose-100"
                )}>
                  <Trash2 size={22} className="stroke-[2]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight leading-none">Remove User</DialogTitle>
                  <DialogDescription className={cn(
                    "text-[11px] font-medium mt-1 leading-normal",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    This will remove <strong>{deleteConfirm.full_name || deleteConfirm.email || 'this user'}</strong> from the system.
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={cn(
                  'absolute top-6 right-6 size-9 rounded-xl flex items-center justify-center border transition-all duration-200 z-50',
                  isDark
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                )}
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </DialogHeader>
            <div className="p-6">
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteConfirm(null)}
                  className={cn(
                    'rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 border border-transparent',
                    isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className="rounded-xl h-10 px-5 font-semibold text-xs border bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all"
                >
                  <Trash2 size={12} className="mr-1.5" />
                  {deleteLoading ? 'Removing...' : 'Remove User'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Manage User Modal ────────────────────────────────────────────────────────
function ManageUserModal({
  user,
  isDark,
  onClose,
  onSave,
  onDelete,
}: {
  user: UserProfile;
  isDark: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: (user: UserProfile) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [role, setRole] = useState(user.role);
  const [organizationId, setOrganizationId] = useState(user.organization_id || '');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labId, setLabId] = useState(user.lab_instructors?.[0]?.labs?.id || '');

  useEffect(() => {
    supabase.from('organizations').select('id, name').order('name').then(({ data }) => {
      if (data) setOrgs(data);
    });
    supabase.from('labs').select('id, name').order('name').then(({ data }) => {
      if (data) setLabs(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Update core profile settings
      const updates: any = {
        full_name: fullName.trim(),
        role,
        organization_id: role === 'partner' ? organizationId || null : null,
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      // 2. Synchronize Lab assignments for Educators
      if (role === 'educator') {
        // Clear any prior lab assignments
        await supabase.from('lab_instructors').delete().eq('educator_id', user.id);

        // If a new lab has been selected, persist it
        if (labId) {
          const { error: labInstErr } = await supabase.from('lab_instructors').insert({
            educator_id: user.id,
            lab_id: labId,
          });
          if (labInstErr) throw labInstErr;
        }
      } else {
        // If they are no longer an educator, clean up lingering mappings
        await supabase.from('lab_instructors').delete().eq('educator_id', user.id);
      }

      onSave();
    } catch (err) {
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (r: string) => {
    if (r === 'partner') return 'Partner';
    if (r === 'educator') return 'Educator / Instructor';
    if (r === 'master_admin') return 'Master Admin';
    return 'Select role';
  };

  const getOrgLabel = (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    return org ? org.name : 'Select organization...';
  };

  const getLabLabel = (id: string) => {
    const lab = labs.find(l => l.id === id);
    return lab ? lab.name : 'Select lab...';
  };

  const inputCls = cn(
    'pl-10 h-10 border transition-all rounded-xl font-semibold text-[13px] w-full text-left flex items-center bg-transparent',
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/50 focus-visible:bg-sky-500/[0.02]'
      : 'border-slate-200 focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01]'
  );
  const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'sm:max-w-[760px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl',
          isDark ? 'bg-[#020617] text-white shadow-black' : 'bg-white text-slate-900'
        )}
      >
        <DialogHeader className={cn(
          'p-6 md:p-8 border-b relative',
          isDark ? 'border-white/5' : 'border-slate-100'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-md',
              isDark
                ? 'bg-sky-500/10 border-sky-500/25 text-sky-400 shadow-sky-950/20'
                : 'bg-sky-50 border-sky-100 text-sky-700 shadow-sky-100'
            )}>
              <Settings size={22} className="stroke-[2]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight leading-none">Manage User</DialogTitle>
              <DialogDescription className={cn(
                'text-[11px] font-medium mt-1 leading-normal',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                Update profile details for <strong>{user.full_name || user.email || 'this user'}</strong>.
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              'absolute top-6 right-6 size-9 rounded-xl flex items-center justify-center border transition-all duration-200 z-50',
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            <X size={16} className="stroke-[2.5]" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            {/* Left Column: Name + Role */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className={labelCls}>Full Name</Label>
                <div className="relative group">
                  <UserPlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    required
                    placeholder="Albert Einstein"
                    className={inputCls}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>Role</Label>
                <div className="relative group">
                  <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                  <Select
                    value={role}
                    onValueChange={val => { setRole(val || ''); setOrganizationId(''); setLabId(''); }}
                  >
                    <SelectTrigger className={inputCls}>
                      <span>{getRoleLabel(role)}</span>
                    </SelectTrigger>
                    <SelectContent className={cn(
                      'rounded-xl border shadow-2xl p-1',
                      isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                    )}>
                      <SelectItem value="partner" className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">Partner</SelectItem>
                      <SelectItem value="educator" className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">Educator / Instructor</SelectItem>
                      <SelectItem value="master_admin" className={cn('font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer', isDark ? 'text-rose-400' : 'text-rose-600')}>Master Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right Column: Email + Organization / Lab / Scope */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className={labelCls}>Email Address</Label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors z-10 pointer-events-none" />
                  <Input
                    disabled
                    value={user.email || '—'}
                    className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
                  />
                </div>
              </div>

              {role === 'partner' ? (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Organization</Label>
                  <div className="relative group">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                    <Select
                      value={organizationId}
                      onValueChange={val => setOrganizationId(val || '')}
                    >
                      <SelectTrigger className={inputCls}>
                        <span>{getOrgLabel(organizationId)}</span>
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border shadow-2xl p-1 max-h-60 overflow-y-auto',
                        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                      )}>
                        {orgs.map(org => (
                          <SelectItem key={org.id} value={org.id} className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : role === 'educator' ? (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Select Lab</Label>
                  <div className="relative group">
                    <Microscope size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                    <Select
                      value={labId}
                      onValueChange={val => setLabId(val || '')}
                    >
                      <SelectTrigger className={inputCls}>
                        <span>{getLabLabel(labId)}</span>
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border shadow-2xl p-1 max-h-60 overflow-y-auto',
                        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                      )}>
                        {labs.map(lab => (
                          <SelectItem key={lab.id} value={lab.id} className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Scope / Access</Label>
                  <div className="relative group">
                    <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors z-10 pointer-events-none" />
                    <Input
                      disabled
                      value="Full System Access (Master Admin)"
                      className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Danger Zone */}
          <div className={cn('border-t pt-4', isDark ? 'border-white/5' : 'border-slate-100')}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Danger Zone</p>
            <p className={cn('text-[11px] leading-snug mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
              Permanently remove this user from the system.
            </p>
            <Button
              type="button"
              onClick={() => onDelete(user)}
              className="mt-2 rounded-xl h-9 px-4 text-xs font-semibold border bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all w-full"
            >
              <Trash2 size={12} className="mr-1.5" />
              Remove User
            </Button>
          </div>

          <DialogFooter className={cn(
            'pt-4 border-t gap-2 bg-transparent',
            isDark ? 'border-white/5' : 'border-slate-100'
          )}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 border border-transparent',
                isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border',
                isDark
                  ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50'
                  : 'bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
              )}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invite User Modal ────────────────────────────────────────────────────────
function InviteModal({
  isDark,
  open,
  onOpenChange,
  onSuccess,
}: {
  isDark: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'partner', organizationId: '', labId: '' });

  useEffect(() => {
    supabase.from('organizations').select('id, name').order('name').then(({ data }) => {
      if (data) setOrgs(data);
    });
    supabase.from('labs').select('id, name').order('name').then(({ data }) => {
      if (data) setLabs(data);
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setError(null);
        setForm({ fullName: '', email: '', role: 'partner', organizationId: '', labId: '' });
      }, 300);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Authentication session not found. Please log in again.');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email: form.email.trim(),
          role: form.role,
          fullName: form.fullName.trim(),
          organizationId: form.role === 'partner' ? form.organizationId : undefined,
          labId: form.role === 'educator' ? form.labId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send secure invitation.');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'partner') return 'Partner';
    if (role === 'educator') return 'Educator / Instructor';
    if (role === 'master_admin') return 'Master Admin';
    return 'Select role';
  };

  const getOrgLabel = (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    return org ? org.name : 'Select organization...';
  };

  const getLabLabel = (labId: string) => {
    const lab = labs.find(l => l.id === labId);
    return lab ? lab.name : 'Select lab...';
  };

  const inputCls = cn(
    'pl-10 h-10 border transition-all rounded-xl font-semibold text-[13px] w-full text-left flex items-center bg-transparent',
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/50 focus-visible:bg-sky-500/[0.02]'
      : 'border-slate-200 focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01]'
  );
  const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'sm:max-w-[760px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl',
          isDark ? 'bg-[#020617] text-white shadow-black' : 'bg-white text-slate-900'
        )}
      >
        <DialogHeader className={cn(
          'p-6 md:p-8 border-b relative',
          isDark ? 'border-white/5' : 'border-slate-100'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-md',
              isDark
                ? 'bg-sky-500/10 border-sky-500/25 text-sky-400 shadow-sky-950/20'
                : 'bg-sky-50 border-sky-100 text-sky-700 shadow-sky-100'
            )}>
              <UserPlus size={22} className="stroke-[2]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight leading-none">Invite User</DialogTitle>
              <DialogDescription className={cn(
                'text-[11px] font-medium mt-1 leading-normal',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                Send a secure invitation to a new user. They will receive an email link to establish their credentials.
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'absolute top-6 right-6 size-9 rounded-xl flex items-center justify-center border transition-all duration-200 z-50',
              isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            <X size={16} className="stroke-[2.5]" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            {/* Left Column: Name + Role */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className={labelCls}>Full Name</Label>
                <div className="relative group">
                  <UserPlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    required
                    placeholder="Albert Einstein"
                    className={inputCls}
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>Role</Label>
                <div className="relative group">
                  <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                  <Select
                    value={form.role}
                    onValueChange={val => setForm({ ...form, role: val || '', organizationId: '', labId: '' })}
                  >
                    <SelectTrigger className={inputCls}>
                      <span>{getRoleLabel(form.role)}</span>
                    </SelectTrigger>
                    <SelectContent className={cn(
                      'rounded-xl border shadow-2xl p-1',
                      isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                    )}>
                      <SelectItem value="partner" className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">Partner</SelectItem>
                      <SelectItem value="educator" className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">Educator / Instructor</SelectItem>
                      <SelectItem value="master_admin" className={cn('font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer', isDark ? 'text-rose-400' : 'text-rose-600')}>Master Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right Column: Email + Organization / Lab / Spacer */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className={labelCls}>Email Address</Label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    required
                    type="email"
                    placeholder="name@example.com"
                    className={inputCls}
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              {form.role === 'partner' ? (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Organization</Label>
                  <div className="relative group">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                    <Select
                      value={form.organizationId}
                      onValueChange={val => setForm({ ...form, organizationId: val || '' })}
                      required={form.role === 'partner'}
                    >
                      <SelectTrigger className={inputCls}>
                        <span>{getOrgLabel(form.organizationId)}</span>
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border shadow-2xl p-1 max-h-60 overflow-y-auto',
                        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                      )}>
                        {orgs.map(org => (
                          <SelectItem key={org.id} value={org.id} className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : form.role === 'educator' ? (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Select Lab</Label>
                  <div className="relative group">
                    <Microscope size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none" />
                    <Select
                      value={form.labId}
                      onValueChange={val => setForm({ ...form, labId: val || '' })}
                      required={form.role === 'educator'}
                    >
                      <SelectTrigger className={inputCls}>
                        <span>{getLabLabel(form.labId)}</span>
                      </SelectTrigger>
                      <SelectContent className={cn(
                        'rounded-xl border shadow-2xl p-1 max-h-60 overflow-y-auto',
                        isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-100 text-slate-900'
                      )}>
                        {labs.map(lab => (
                          <SelectItem key={lab.id} value={lab.id} className="font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer">
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label className={labelCls}>Scope / Access</Label>
                  <div className="relative group">
                    <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors z-10 pointer-events-none" />
                    <Input
                      disabled
                      value="Full System Access (Master Admin)"
                      className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className={cn(
                  'text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in fade-in',
                  isDark
                    ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    : 'text-rose-500 bg-rose-50 border border-rose-100'
                )}>
                  <AlertCircle size={14} className="shrink-0" /> {error}
                </p>
              )}
            </div>

          </div>

          <DialogFooter className={cn(
            'pt-4 border-t gap-2 bg-transparent',
            isDark ? 'border-white/5' : 'border-slate-100'
          )}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 border border-transparent',
                isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                'rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border',
                isDark
                  ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50'
                  : 'bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
              )}
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
