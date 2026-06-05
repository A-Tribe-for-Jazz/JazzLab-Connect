import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Users, Layers, Search, Settings2, Settings } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Lab {
  id: string;
  name: string;
  description: string;
  capacity_per_session: number;
  min_age: number;
  max_age: number;
  instructors: string[];
}

export default function AdminLabs() {
  const { isDark }: any = useOutletContext();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('labs')
        .select(`
          id, name, description, capacity_per_session, min_age, max_age,
          lab_instructors(
            profiles(full_name)
          )
        `);

      if (error) throw error;

      const formatted = (data || []).map((lab: any) => ({
        id: lab.id,
        name: lab.name,
        description: lab.description,
        capacity_per_session: lab.capacity_per_session,
        min_age: lab.min_age,
        max_age: lab.max_age,
        instructors: lab.lab_instructors?.map((li: any) => li.profiles?.full_name).filter(Boolean) || [],
      }));

      setLabs(formatted);
    } catch (error) {
      console.error('Error fetching labs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search filter computations
  const filteredLabs = labs.filter(lab => 
    lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.instructors.some(ins => ins.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={cn(
      "h-[calc(100dvh-5rem)] overflow-hidden flex flex-col",
      isDark ? "bg-black text-white" : "bg-white text-slate-900"
    )}>

      <div className="w-full mx-auto px-4 flex-1 min-h-0 flex flex-col partner-enter">
        <section className="relative flex-1 min-h-0 flex flex-col">

          {loading ? (
            <div className="p-40 text-center flex flex-col items-center justify-center space-y-4">
              <div className={cn(
                "size-12 border-4 rounded-full animate-spin",
                isDark ? "border-white/10 border-t-white" : "border-slate-200 border-t-slate-900"
              )}></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading curriculum directory matrix...</p>
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
                      placeholder="Search curriculum modules, descriptions, instructors..."
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
                    asChild
                    className={cn(
                      "rounded-xl h-10 px-5 font-semibold tracking-wide text-[13px] transition-all duration-300 border flex items-center gap-2 shrink-0 md:w-auto w-full justify-center shadow-sm",
                      isDark
                        ? "bg-sky-500/20 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:border-sky-500/50"
                        : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                    )}
                  >
                    <Link to="/admin/labs/new">
                      <Plus size={16} />
                      <span>Add Lab</span>
                    </Link>
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
                      <th className={cn(
                        "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 overflow-hidden w-[280px]",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Lab Module</th>
                      <th className={cn(
                        "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 text-center w-[150px] overflow-hidden",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Capacity</th>
                      <th className={cn(
                        "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 text-center w-[150px] overflow-hidden",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Age Group</th>
                      <th className={cn(
                        "py-3 px-4 font-semibold text-[13px] border-r last:border-r-0 overflow-hidden w-[250px]",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Instructor(s)</th>
                      <th className={cn(
                        "py-3 px-4 font-semibold text-[13px] text-center w-[160px] last:border-r-0 overflow-hidden",
                        isDark 
                          ? "bg-slate-900 text-slate-400 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md" 
                          : "bg-slate-50 text-slate-500 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]"
                      )}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLabs.map((lab, index) => {
                      return (
                        <tr 
                          key={lab.id}
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

                          {/* Lab Name */}
                          <td className={cn(
                            "py-1 px-4 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <span className={cn("font-semibold text-[13px]", isDark ? "text-white" : "text-slate-900")}>
                              {lab.name}
                            </span>
                          </td>

                          {/* Capacity */}
                          <td className={cn(
                            "py-1 px-4 text-center border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <div className="flex items-center justify-center gap-1 text-[13px] font-semibold">
                              <Users size={12} className="text-slate-400" />
                              <span className={cn(isDark ? "text-slate-200" : "text-slate-700")}>{lab.capacity_per_session} seats</span>
                            </div>
                          </td>

                          {/* Age Group */}
                          <td className={cn(
                            "py-1 px-4 text-center border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            <div className="flex items-center justify-center gap-1 text-[13px] font-semibold">
                              <Layers size={12} className="text-slate-400" />
                              <span className={cn(isDark ? "text-slate-200" : "text-slate-700")}>{lab.min_age} - {lab.max_age} yrs</span>
                            </div>
                          </td>

                          {/* Instructor */}
                          <td className={cn(
                            "py-1 px-4 border-r last:border-r-0 overflow-hidden",
                            isDark ? "border-white/20" : "border-slate-300"
                          )}>
                            {lab.instructors.length > 0 ? (
                              <div className="flex items-center gap-1.5 text-[13px]">
                                <div className={cn(
                                  "size-7 rounded-full flex items-center justify-center text-[9px] font-semibold border uppercase shrink-0",
                                  isDark ? "bg-slate-900 border-white/10 text-sky-400" : "bg-sky-50 border-sky-100 text-sky-700"
                                )}>
                                  {lab.instructors[0].split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span className={cn("font-medium truncate", isDark ? "text-slate-200" : "text-slate-700")}>
                                  {lab.instructors.join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[13px] font-medium text-slate-400 dark:text-slate-600 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Actions Deck */}
                          <td className="py-1 px-4 text-center overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                asChild
                                className={cn(
                                  "rounded-xl h-8 px-3 font-semibold tracking-wide text-[10px] transition-all duration-300 border flex items-center gap-1.5",
                                  isDark
                                    ? "bg-sky-500/15 border-sky-500/20 text-sky-400 hover:bg-sky-500/30 shadow-md shadow-sky-500/5"
                                    : "bg-sky-50 border-sky-200/60 text-sky-700 hover:bg-sky-100 shadow-sm"
                                )}
                              >
                                <Link to={`/admin/labs/${lab.id}/edit`}>
                                  <Settings size={11} />
                                  Manage
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredLabs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                            <Settings2 size={32} className="text-slate-400" />
                            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                              No curriculum labs found matching filters
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
    </div>
  );
}
