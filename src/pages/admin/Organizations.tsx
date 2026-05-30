import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Mail, Building, User as UserIcon,
  Database, X, Users, SlidersHorizontal, Calendar, Save, Check,
  Search, Filter, ArrowUpDown, ChevronUp, ChevronDown, Trash2,
  Table, Settings
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StudentGrid from '@/components/partner/StudentGrid';
import PicksGrid from '@/components/partner/picks/PicksGrid';
import { cn } from '@/lib/utils';

interface OrganizationMember {
  id: string;
  full_name: string;
  role: string;
  email: string;
}

interface Organization {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  camp_days: { id: string; date: string }[];
  student_count: number;
  missing_picks: number;
  incomplete_count: number;
  members: OrganizationMember[];
}

type SortField = 'name' | 'student_count' | 'incomplete_count' | 'camp_day';

export default function AdminOrganizations() {
  const { isDark }: any = useOutletContext();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [campDays, setCampDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals & Drawers States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [viewDataOrg, setViewDataOrg] = useState<Organization | null>(null);
  const [manageOrg, setManageOrg] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const [orgsRes, studentsRes, profilesRes, campDaysRes] = await Promise.all([
        supabase
          .from('organizations')
          .select(`
            id, name, contact_name, contact_email,
            camp_day_organizations (
              camp_days (id, date)
            )
          `),
        supabase
          .from('students')
          .select(`
            id,
            organization_id,
            first_name,
            last_name,
            preferences (lab_id)
          `),
        supabase
          .from('profiles')
          .select('id, full_name, role, organization_id, email')
          .eq('role', 'partner'),
        supabase
          .from('camp_days')
          .select('*')
          .order('date')
      ]);

      if (orgsRes.error) throw orgsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (campDaysRes.error) throw campDaysRes.error;

      const orgsData = orgsRes.data || [];
      const studentsData = studentsRes.data || [];
      const profilesData = profilesRes.data || [];
      setCampDays(campDaysRes.data || []);

      const realStudents = studentsData.filter(
        s => s.first_name?.trim() || s.last_name?.trim()
      );

      const formatted = orgsData.map((org: any) => {
        const orgStudents = realStudents.filter(s => s.organization_id === org.id);
        const sCount = orgStudents.length;

        const missingPicksCount = orgStudents.filter(
          s => (s.preferences?.length || 0) < 5
        ).length;

        const incompleteCount = missingPicksCount;

        const orgMembers = profilesData.filter((p: any) => p.organization_id === org.id);

        return {
          id: org.id,
          name: org.name,
          contact_name: org.contact_name,
          contact_email: org.contact_email,
          camp_days: org.camp_day_organizations?.map((cdo: any) => cdo.camp_days).filter(Boolean) || [],
          student_count: sCount,
          missing_picks: missingPicksCount,
          incomplete_count: incompleteCount,
          members: orgMembers
        };
      });

      setOrganizations(formatted);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sort & Filter computations
  const processedOrganizations = useMemo(() => {
    let result = [...organizations];

    // 1. Text Search Filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(org => 
        org.name.toLowerCase().includes(query) || 
        org.contact_name.toLowerCase().includes(query) ||
        org.contact_email.toLowerCase().includes(query)
      );
    }

    // 2. Camp Day Filter
    if (dayFilter !== 'all') {
      if (dayFilter === 'unscheduled') {
        result = result.filter(org => org.camp_days.length === 0);
      } else {
        result = result.filter(org => org.camp_days.some(d => d.id === dayFilter));
      }
    }

    // 3. Sorting Engine
    result.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === 'student_count') {
        aVal = a.student_count;
        bVal = b.student_count;
      } else if (sortField === 'incomplete_count') {
        aVal = a.incomplete_count;
        bVal = b.incomplete_count;
      } else if (sortField === 'camp_day') {
        aVal = a.camp_days[0]?.date || '9999-99-99';
        bVal = b.camp_days[0]?.date || '9999-99-99';
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [organizations, searchTerm, dayFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="ml-1.5 opacity-30 group-hover:opacity-70 transition-opacity animate-pulse" />;
    return sortAsc 
      ? <ChevronUp size={12} className="ml-1.5 text-sky-500 animate-bounce" />
      : <ChevronDown size={12} className="ml-1.5 text-sky-500 animate-bounce" />;
  };

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
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading partner directory matrix...</p>
            </div>
          ) : (
            <div className={cn(
              "rounded-[1.25rem] border transition-colors duration-700 overflow-hidden relative flex flex-col flex-1 min-h-0",
              isDark 
                ? "bg-[#020617] border-white/10 shadow-2xl shadow-black/40" 
                : "bg-white border-slate-200 shadow-xl shadow-slate-200/40"
            )}>
              {/* Unified High-Density Toolbar */}
              <div className={cn(
                "p-3 md:p-4 border-b",
                isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/30"
              )}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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
                      placeholder="Search partners, email, contact..."
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
                    <span>Add Partner</span>
                  </Button>
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
                      <th className={cn(
                        "py-3 font-semibold text-[13px] text-center w-[60px] border-r last:border-r-0 overflow-hidden",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>#</th>
                      <th 
                        onClick={() => handleSort('name')}
                        className={cn(
                          "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 cursor-pointer select-none group overflow-hidden w-[280px]",
                          isDark 
                            ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                            : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                        )}
                      >
                        <div className="flex items-center">
                          <span>Organization Name</span>
                          {renderSortArrow('name')}
                        </div>
                      </th>
                      <th className={cn(
                        "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 overflow-hidden w-[230px]",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Primary Contact</th>
                      <th 
                        onClick={() => handleSort('camp_day')}
                        className={cn(
                          "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 cursor-pointer select-none group overflow-hidden w-[180px]",
                          isDark 
                            ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                            : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                        )}
                      >
                        <div className="flex items-center">
                          <span>Camp Date</span>
                          {renderSortArrow('camp_day')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('student_count')}
                        className={cn(
                          "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 cursor-pointer select-none group text-center w-[120px] overflow-hidden",
                          isDark 
                            ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                            : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <span>Registered</span>
                          {renderSortArrow('student_count')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('incomplete_count')}
                        className={cn(
                          "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 cursor-pointer select-none group text-center w-[130px] overflow-hidden",
                          isDark 
                            ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                            : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <span>Needs Work</span>
                          {renderSortArrow('incomplete_count')}
                        </div>
                      </th>
                      <th className={cn(
                        "py-3 px-4 font-semibold text-[13px] text-center w-[140px] last:border-r-0 overflow-hidden",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedOrganizations.map((org, index) => {
                      const campDay = org.camp_days[0];
                      const initials = org.contact_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

                      return (
                        <tr 
                          key={org.id}
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

                          {/* Org Name */}
                          <td className={cn(
                            "py-1 px-4 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <span className={cn("font-semibold text-[13px]", isDark ? "text-white" : "text-slate-900")}>
                              {org.name}
                            </span>
                          </td>

                          {/* Contact Info */}
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
                               <div className="min-w-0 flex items-center gap-1.5 justify-start">
                                 <p className={cn("font-semibold text-[13px] truncate leading-tight", isDark ? "text-white" : "text-slate-900")}>
                                   {org.contact_name}
                                 </p>
                                 <a 
                                   href={`mailto:${org.contact_email}`}
                                   title={`Email ${org.contact_name}: ${org.contact_email}`}
                                   className={cn(
                                     "inline-flex items-center justify-center transition-all duration-300 pt-0.5 shrink-0",
                                     isDark ? "text-slate-500 hover:text-sky-400" : "text-slate-400 hover:text-blue-600"
                                   )}
                                 >
                                   <Mail size={12} className="shrink-0" />
                                 </a>
                               </div>
                            </div>
                          </td>

                          {/* Day Allocation menu */}
                          <td className={cn(
                            "py-1 px-4 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            {campDay ? (
                              <span className={cn("text-[13px] font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                                {new Date(campDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-500 dark:text-amber-400 animate-pulse">
                                <SlidersHorizontal size={13} className="shrink-0" />
                                <span>Standby / Unassigned</span>
                              </div>
                            )}
                          </td>

                          {/* Registered */}
                          <td className={cn(
                            "py-1 px-4 text-center font-semibold text-[13px] border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            {org.student_count}
                          </td>

                          {/* Incomplete */}
                          <td className={cn(
                            "py-1 px-4 text-center border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <span className={cn(
                              "text-[13px] font-bold",
                              org.incomplete_count > 0 
                                ? "text-amber-500 dark:text-amber-400" 
                                : "text-emerald-500 dark:text-emerald-400"
                            )}>
                              {org.incomplete_count}
                            </span>
                          </td>

                          {/* Actions Deck */}
                          <td className="py-1 px-4 text-center overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                onClick={() => setViewDataOrg(org)}
                                className={cn(
                                  "rounded-xl h-8 px-3 font-semibold tracking-wide text-[10px] transition-all duration-300 border flex items-center gap-1.5",
                                  isDark
                                    ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-500/30 shadow-md shadow-emerald-500/5 dark:bg-emerald-500/15 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 dark:hover:border-emerald-500/30"
                                    : "bg-emerald-50 border-emerald-200/60 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm"
                                )}
                              >
                                <Table size={11} />
                                View Data
                              </Button>
                              <Button
                                onClick={() => setManageOrg(org)}
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

                    {processedOrganizations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                            <Building size={32} className="text-slate-400" />
                            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                              No partner organizations found matching filters
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

      {/* Modal Decoders */}
      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onInvite={() => { setIsInviteModalOpen(false); fetchOrganizations(); }} 
        isDark={isDark}
        campDays={campDays}
      />

      {viewDataOrg && (
        <OrgDataDrawer
          org={viewDataOrg}
          isDark={isDark}
          onClose={() => setViewDataOrg(null)}
        />
      )}

      {manageOrg && (
        <ManageModal
          org={manageOrg}
          campDays={campDays}
          isDark={isDark}
          onClose={() => setManageOrg(null)}
          onSave={() => { setManageOrg(null); fetchOrganizations(); }}
        />
      )}
    </div>
  );
}

function InviteModal({ isOpen, onClose, onInvite, isDark, campDays }: { isOpen: boolean, onClose: () => void, onInvite: () => void, isDark: boolean, campDays: any[] }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    contactEmail: ''
  });
  const [selectedDateString, setSelectedDateString] = useState<string>('unscheduled');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          contact_name: formData.contactName,
          contact_email: formData.contactEmail
        })
        .select()
        .single();

      if (orgError) throw orgError;
      if (!orgData) throw new Error('Failed to create organization record');

      // If scheduled, select or create the camp day row
      if (selectedDateString !== 'unscheduled') {
        let targetCampDayId = '';
        
        const { data: existingDay } = await supabase
          .from('camp_days')
          .select('id')
          .eq('date', selectedDateString)
          .maybeSingle();

        if (existingDay) {
          targetCampDayId = existingDay.id;
        } else {
          // Create a new camp day
          const { data: newDay, error: insertDayError } = await supabase
            .from('camp_days')
            .insert({ date: selectedDateString })
            .select('id')
            .single();

          if (insertDayError) throw insertDayError;
          if (newDay) targetCampDayId = newDay.id;
        }

        // Link organization to this camp day id
        if (targetCampDayId) {
          const { error: insertError } = await supabase
            .from('camp_day_organizations')
            .insert({
              organization_id: orgData.id,
              camp_day_id: targetCampDayId
            });
          if (insertError) throw insertError;
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`
          },
          body: JSON.stringify({
            email: formData.contactEmail,
            role: 'partner',
            organizationId: orgData.id
          })
        });
      }
      
      onInvite();
    } catch (error) {
      console.error('Error inviting organization:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "sm:max-w-[760px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl",
          isDark ? "bg-[#020617] text-white shadow-black" : "bg-white text-slate-900"
        )}
      >
        <DialogHeader className={cn(
          "p-6 md:p-8 border-b relative",
          isDark ? "border-white/5" : "border-slate-100"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-md",
              isDark 
                ? "bg-sky-500/10 border-sky-500/25 text-sky-400 shadow-sky-950/20" 
                : "bg-sky-50 border-sky-100 text-sky-700 shadow-sky-100"
            )}>
              <Building size={22} className="stroke-[2]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight leading-none">Add Partner</DialogTitle>
              <DialogDescription className={cn(
                "text-[11px] font-medium mt-1 leading-normal",
                isDark ? "text-slate-400" : "text-slate-500"
              )}>
                Register a new partner organization and schedule their camp date.
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
            
            {/* Left Column: Organization & Schedule */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="org_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Organization Name</Label>
                <div className="relative group">
                  <Building size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    id="org_name"
                    required
                    className={cn(
                      "pl-10 h-10 border transition-all rounded-xl font-bold text-xs",
                      isDark 
                        ? "bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/50 focus-visible:bg-sky-500/[0.02]" 
                        : "border-slate-200 focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01]"
                    )}
                    placeholder="e.g. Columbus Youth Foundation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Camp Date</Label>
                
                {/* Trigger Button that looks like a Shadcn Input */}
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={cn(
                    "w-full h-10 px-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-between text-left outline-none",
                    isDark 
                      ? "bg-white/5 border-white/10 text-white hover:bg-white/10" 
                      : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span>
                      {selectedDateString === 'unscheduled' 
                        ? 'Standby / Unassigned' 
                        : new Date(selectedDateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                      }
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Right Column: Primary Contact */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Primary Contact</Label>
                <div className="relative group">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    id="contact_name"
                    required
                    className={cn(
                      "pl-10 h-10 border transition-all rounded-xl font-bold text-xs",
                      isDark 
                        ? "bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/50 focus-visible:bg-sky-500/[0.02]" 
                        : "border-slate-200 focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01]"
                    )}
                    placeholder="Albert Einstein"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact_email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Email Address</Label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    id="contact_email"
                    required
                    type="email"
                    className={cn(
                      "pl-10 h-10 border transition-all rounded-xl font-bold text-xs",
                      isDark 
                        ? "bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/50 focus-visible:bg-sky-500/[0.02]" 
                        : "border-slate-200 focus-visible:border-sky-500/30 focus-visible:bg-sky-500/[0.01]"
                    )}
                    placeholder="name@example.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-tight">
                  An automated credential invite will be dispatched to this address upon creation.
                </p>
              </div>
            </div>

          </div>

          <DialogFooter className={cn(
            "pt-4 border-t gap-2 bg-transparent dark:bg-transparent",
            isDark ? "border-white/5" : "border-slate-100"
          )}>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              className={cn(
                "rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 border border-transparent",
                isDark 
                  ? "text-slate-400 hover:bg-white/5 hover:text-white" 
                  : "text-slate-50 hover:bg-slate-50"
              )}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className={cn(
                "rounded-xl h-10 px-5 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border",
                isDark 
                  ? "bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50" 
                  : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
              )}
            >
              {loading ? 'Adding...' : 'Add Partner'}
            </Button>
          </DialogFooter>
        </form>

        {/* Custom Popover Dropdown Calendar centered in popup overlay */}
        {isCalendarOpen && (
          <>
            {/* Dimmed glassmorphism backdrop inside the popup card bounds */}
            <div className="absolute inset-0 bg-black/20 dark:bg-black/35 backdrop-blur-[1px] z-40 rounded-2xl" onClick={() => setIsCalendarOpen(false)} />
            
            <div className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl border p-4 shadow-2xl w-auto",
              isDark ? "bg-[#020617] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            )}>
              <CalendarSheet
                selectedDateString={selectedDateString}
                onSelect={(dateStr) => { setSelectedDateString(dateStr); setIsCalendarOpen(false); }}
                isDark={isDark}
              />
              
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => { setSelectedDateString('unscheduled'); setIsCalendarOpen(false); }}
                  className={cn(
                    "w-full text-center py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors",
                    selectedDateString === 'unscheduled' ? "text-amber-500 bg-amber-500/5" : "text-amber-500"
                  )}
                >
                  Standby / Unassigned
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Org Data Drawer ──────────────────────────────────────────────────────────
type OrgDataTab = 'students' | 'picks';

function OrgDataDrawer({
  org,
  isDark,
  onClose,
}: {
  org: Organization;
  isDark: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<OrgDataTab>('students');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          '!fixed !inset-0 !top-0 !left-0 !transform-none !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !rounded-none !border-none !p-0 !gap-0 flex flex-col overflow-hidden',
          isDark ? 'bg-black text-white' : 'bg-white text-slate-900'
        )}
      >
        <div className={cn(
          "grid grid-cols-3 items-center px-8 h-16 border-b shrink-0",
          isDark ? "border-white/10" : "border-slate-200"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'size-9 rounded-xl flex items-center justify-center shrink-0 border',
                isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              <Database size={16} />
            </div>
            <h2 className="text-base font-black tracking-tight leading-none truncate">
              {org.name}
            </h2>
          </div>

          <div className="flex items-center justify-center h-full">
            <nav className="flex items-center gap-8 h-full">
              <button
                onClick={() => setActiveTab('students')}
                className={cn(
                  "relative flex items-center h-full text-[13px] font-semibold transition-all duration-500 whitespace-nowrap",
                  activeTab === 'students'
                    ? (isDark ? "text-white" : "text-blue-600")
                    : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                )}
              >
                <span>Student Directory</span>
                {activeTab === 'students' && (
                  <div className={cn(
                    "absolute bottom-0 left-0 w-full h-[2.5px] rounded-t-full transition-all duration-300",
                    isDark ? "bg-white" : "bg-blue-600"
                  )} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('picks')}
                className={cn(
                  "relative flex items-center h-full text-[13px] font-semibold transition-all duration-500 whitespace-nowrap",
                  activeTab === 'picks'
                    ? (isDark ? "text-white" : "text-blue-600")
                    : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                )}
              >
                <span>Lab Preferences</span>
                {activeTab === 'picks' && (
                  <div className={cn(
                    "absolute bottom-0 left-0 w-full h-[2.5px] rounded-t-full transition-all duration-300",
                    isDark ? "bg-white" : "bg-blue-600"
                  )} />
                )}
              </button>
            </nav>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className={cn(
                'size-9 rounded-xl flex items-center justify-center border transition-all duration-200',
                isDark
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              )}
            >
              <X size={16} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
          <div className="w-full flex-1 min-h-0 flex flex-col partner-enter">
            <section className="relative flex-1 min-h-0 flex flex-col">
              {activeTab === 'students' ? (
                <StudentGrid organizationId={org.id} isDark={isDark} />
              ) : (
                <PicksGrid organizationId={org.id} isDark={isDark} />
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Modal ───────────────────────────────────────────────────────────
function ManageModal({
  org,
  campDays,
  isDark,
  onClose,
  onSave,
}: {
  org: Organization;
  campDays: any[];
  isDark: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(org.name);
  const [selectedDateString, setSelectedDateString] = useState<string>(
    org.camp_days[0]?.date || 'unscheduled'
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInvite = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: 'partner', organizationId: org.id, fullName: inviteName.trim() })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to send invite');
      setInviteMessage({ type: 'success', text: `Invited ${inviteEmail}` });
      setInviteEmail('');
      setInviteName('');
    } catch (err: any) {
      setInviteMessage({ type: 'error', text: err.message || 'Error sending invite' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeletePartner = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm(`Permanently delete "${org.name}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', org.id);
      if (error) throw error;
      onSave();
    } catch (err) {
      console.error(err);
      alert('Error deleting organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: orgError } = await supabase.from('organizations').update({ name }).eq('id', org.id);
      if (orgError) throw orgError;

      const { error: deleteError } = await supabase.from('camp_day_organizations').delete().eq('organization_id', org.id);
      if (deleteError) throw deleteError;

      if (selectedDateString !== 'unscheduled') {
        let targetCampDayId = '';
        const { data: existingDay } = await supabase.from('camp_days').select('id').eq('date', selectedDateString).maybeSingle();
        if (existingDay) {
          targetCampDayId = existingDay.id;
        } else {
          const { data: newDay, error: insertDayError } = await supabase.from('camp_days').insert({ date: selectedDateString }).select('id').single();
          if (insertDayError) throw insertDayError;
          if (newDay) targetCampDayId = newDay.id;
        }
        if (targetCampDayId) {
          const { error: insertError } = await supabase.from('camp_day_organizations').insert({ organization_id: org.id, camp_day_id: targetCampDayId });
          if (insertError) throw insertError;
        }
      }
      onSave();
    } catch (err) {
      console.error('Error saving organization changes:', err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = cn(
    'h-10 border rounded-xl text-xs font-semibold transition-all',
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-slate-600 focus-visible:border-sky-500/40 focus-visible:ring-0'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:border-sky-400 focus-visible:ring-0'
  );
  const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          '!fixed !inset-0 !top-0 !left-0 !transform-none !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !rounded-none !border-none !p-0 !gap-0 flex flex-col overflow-hidden',
          isDark ? 'bg-black text-white' : 'bg-white text-slate-900'
        )}
      >
        {/* ── Header ── */}
        <div className={cn(
          'grid grid-cols-3 items-center px-8 h-16 border-b shrink-0',
          isDark ? 'border-white/10' : 'border-slate-200'
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'size-9 rounded-xl flex items-center justify-center shrink-0 border',
              isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
            )}>
              <SlidersHorizontal size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manage Partner</p>
              <h2 className={cn('text-sm font-black tracking-tight leading-none truncate', isDark ? 'text-white' : 'text-slate-900')}>
                {org.name}
              </h2>
            </div>
          </div>

          <div />

          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className={cn(
                'size-9 rounded-xl flex items-center justify-center border transition-all duration-200',
                isDark
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              )}
            >
              <X size={15} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full flex flex-col max-w-5xl mx-auto w-full px-6 py-6 gap-6">

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Left: Settings stacked ── */}
              <div className="flex flex-col gap-5 overflow-y-auto pr-1">

                {/* Org Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="manage_org_name" className={labelCls}>Organization Name</Label>
                  <div className="relative">
                    <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      id="manage_org_name"
                      required
                      className={cn(inputCls, 'pl-9')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Camp Date */}
                <div className="space-y-1.5 relative">
                  <Label className={labelCls}>Camp Date</Label>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={cn(
                      'w-full h-10 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between text-left outline-none',
                      isDark
                        ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <span>
                        {selectedDateString === 'unscheduled'
                          ? 'Standby / Unassigned'
                          : new Date(selectedDateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                        }
                      </span>
                    </div>
                    <ChevronDown size={13} className={cn('text-slate-400 transition-transform', isCalendarOpen && 'rotate-180')} />
                  </button>

                  {isCalendarOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
                      <div className={cn(
                        'absolute top-[calc(100%+4px)] left-0 w-auto z-50 rounded-2xl border p-3.5 shadow-2xl',
                        isDark ? 'bg-[#020617] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      )}>
                        <CalendarSheet
                          selectedDateString={selectedDateString}
                          onSelect={(dateStr) => { setSelectedDateString(dateStr); setIsCalendarOpen(false); }}
                          isDark={isDark}
                        />
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => { setSelectedDateString('unscheduled'); setIsCalendarOpen(false); }}
                            className={cn(
                              'w-full text-center py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors',
                              selectedDateString === 'unscheduled' ? 'text-amber-500 bg-amber-500/5' : 'text-amber-500'
                            )}
                          >
                            Standby / Unassigned
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Divider */}
                <div className={cn('border-t', isDark ? 'border-white/5' : 'border-slate-100')} />

                 {/* Invite Member */}
                <div className="space-y-1.5">
                  <Label className={labelCls}>Invite Member</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Albert Einstein"
                        className={cn(inputCls, 'pl-9')}
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          className={cn(inputCls, 'pl-9')}
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        disabled={inviteLoading}
                        onClick={handleInvite}
                        className={cn(
                          'rounded-xl h-10 px-4 font-semibold text-xs transition-all border shrink-0',
                          isDark
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20'
                            : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                        )}
                      >
                        {inviteLoading ? 'Sending...' : 'Invite'}
                      </Button>
                    </div>
                  </div>
                  {inviteMessage && (
                    <p className={cn(
                      'text-[11px] font-semibold mt-1',
                      inviteMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                    )}>
                      {inviteMessage.text}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className={cn('border-t', isDark ? 'border-white/5' : 'border-slate-100')} />

                {/* Danger Zone */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Danger Zone</p>
                  <p className={cn('text-[11px] leading-snug', isDark ? 'text-slate-500' : 'text-slate-400')}>
                    Permanently delete this partner organization and all associated data.
                  </p>
                  <Button
                    type="button"
                    disabled={loading}
                    onClick={handleDeletePartner}
                    className="mt-1 rounded-xl h-9 px-4 text-xs font-semibold border bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all w-full"
                  >
                    <Trash2 size={12} className="mr-1.5" />
                    Delete Partner Organization
                  </Button>
                </div>

              </div>

              {/* ── Right: Active Members panel ── */}
              <div className={cn(
                'rounded-2xl border flex flex-col min-h-0 overflow-hidden',
                isDark ? 'border-white/10 bg-white/[0.01]' : 'border-slate-200 bg-slate-50/40'
              )}>
                {/* Panel header */}
                <div className={cn(
                  'px-4 py-3 border-b shrink-0',
                  isDark ? 'border-white/10' : 'border-slate-200'
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Members</p>
                  <p className={cn('text-[11px] mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>
                    {org.members && org.members.length > 0
                      ? `${org.members.length} member${org.members.length > 1 ? 's' : ''} with access`
                      : 'No members associated yet'}
                  </p>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {org.members && org.members.length > 0 ? (
                    <div className={cn('divide-y', isDark ? 'divide-white/5' : 'divide-slate-100')}>
                      {org.members.map((member) => {
                        const memberInitials = member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                        return (
                          <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                            <div className={cn(
                              'size-8 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0',
                              isDark ? 'bg-slate-900 border-white/10 text-sky-400' : 'bg-sky-50 border-sky-100 text-sky-700'
                            )}>
                              {memberInitials}
                            </div>
                            <div className="min-w-0">
                              <p className={cn('text-[13px] font-semibold leading-none truncate', isDark ? 'text-white' : 'text-slate-900')}>
                                {member.full_name}
                              </p>
                              <p className={cn('text-[10px] mt-1 truncate', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                {member.email}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 opacity-30">
                      <Users size={32} className="mb-3 text-slate-400" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No members yet</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── Footer ── */}
            <div className={cn(
              'flex items-center justify-end gap-3 pt-4 border-t shrink-0',
              isDark ? 'border-white/5' : 'border-slate-100'
            )}>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className={cn(
                  'rounded-xl h-10 px-5 font-semibold text-xs transition-all border border-transparent',
                  isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  'rounded-xl h-10 px-5 font-semibold text-xs transition-all border shadow-sm',
                  isDark
                    ? 'bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/40'
                    : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300'
                )}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Calendar Sheet ──────────────────────────────────────────────────────────
function CalendarSheet({
  selectedDateString,
  onSelect,
  isDark,
}: {
  selectedDateString: string;
  onSelect: (dateStr: string) => void;
  isDark: boolean;
}) {
  const initialDate = selectedDateString && selectedDateString !== 'unscheduled' 
    ? new Date(selectedDateString + 'T00:00:00') 
    : new Date();
    
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleDayClick = (dayNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    onSelect(dateStr);
  };

  return (
    <div className="w-[280px] p-2 space-y-3 select-none">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            "p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white stroke-[2.5]"
          )}
        >
          <ChevronDown size={16} className="rotate-90" />
        </button>
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
          {months[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            "p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white stroke-[2.5]"
          )}
        >
          <ChevronDown size={16} className="-rotate-90" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          
          const monthStr = String(currentMonth + 1).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
          const isSelected = selectedDateString === dateStr;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={(e) => handleDayClick(day, e)}
              className={cn(
                "size-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all",
                isSelected 
                  ? (isDark ? "bg-sky-500/10 text-sky-400 border border-sky-500/25" : "bg-sky-50 text-sky-700 border border-sky-100") 
                  : (isDark ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-100 text-slate-700")
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
