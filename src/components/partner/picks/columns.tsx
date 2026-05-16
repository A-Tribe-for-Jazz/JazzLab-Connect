import type { ColumnDef } from "@tanstack/react-table";
import { User, CheckCircle2, AlertCircle, Check, Eraser, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type LabPickRow = {
  id: string;
  first_name: string;
  last_name: string;
  preferences: { lab_id: string; rank: number }[];
  sync_status?: 'synced' | 'saving' | 'error';
};

interface ColumnProps {
  labs: { id: string, name: string }[];
  handlePreferenceToggle: (studentId: string, labId: string) => void;
  handleClearPreferences: (studentId: string) => void;
  isDark: boolean;
}

const LAB_SHORT_NAMES: Record<string, string> = {
  "Arts Collaboratorium": "Arts Collab",
  "Jazz Fab Lab": "Jazz Fab",
  "Virtual Reality MusicMaking": "VR Music",
  "Conga Drumming": "Conga Drum",
  "Afro-Futuristic Studio": "Afro-Future",
  "Remix the Code": "Remix Code",
  "Pixel Beats Lab": "Pixel Beats",
  "The Decibel Lab with DriveOhio": "Decibel Lab",
  "The Vocal Resonance Lab with The Singing Buckeyes": "Vocal Resonance",
  "The Vocal Resonance Lab": "Vocal Resonance",
  "Vocal Resonance Lab": "Vocal Resonance",
  "Guitar \u0026 Audio Engineering": "Guitar / Audio Eng",
  "Guitar Lab (8+) or Audio Engineering (11+)": "Guitar / Audio Eng",
};

export const getColumns = ({
  labs,
  handlePreferenceToggle,
  handleClearPreferences,
  isDark
}: ColumnProps): ColumnDef<LabPickRow>[] => {
  const baseColumns: ColumnDef<LabPickRow>[] = [
    {
      id: "serial",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">#</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full h-10">
          <span className={cn(
            "font-black text-[11px] tracking-tighter opacity-30",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            {(row.index + 1).toString().padStart(2, '0')}
          </span>
        </div>
      ),
      size: 36,
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: () => (
        <div className="flex items-center px-4">
          <span className="font-semibold text-[13px] text-slate-500">Student Name</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-2 flex items-center h-10">
          <div className={cn(
            "font-bold text-[13px] whitespace-nowrap",
            isDark ? "text-white" : "text-slate-900"
          )}>
            {row.original.first_name} {row.original.last_name}
          </div>
        </div>
      ),
      size: 250,
    },
  ];

  // Dynamic Lab Columns
  const labColumns: ColumnDef<LabPickRow>[] = labs.map((lab) => ({
    id: `lab-${lab.id}`,
    header: () => (
      <div className="flex items-center justify-center w-full">
        <span className="font-bold text-[10px] text-slate-500 whitespace-nowrap">
          {LAB_SHORT_NAMES[lab.name] || lab.name}
        </span>
      </div>
    ),
    cell: ({ row }) => {
      const { first_name, last_name } = row.original;
      if (!first_name?.trim() && !last_name?.trim()) return <div className="h-10" />;

      const pref = row.original.preferences?.find(p => p.lab_id === lab.id);
      const rank = pref?.rank;

      return (
        <button
          onClick={() => handlePreferenceToggle(row.original.id, lab.id)}
          className={cn(
            "w-full h-10 flex items-center justify-center transition-all duration-300 group/btn outline-none",
            rank
              ? isDark
                ? "bg-sky-400/[0.05] text-sky-400 font-black ring-2 ring-inset ring-sky-400/40 relative z-10"
                : "bg-sky-400/[0.05] text-sky-600 font-black ring-2 ring-inset ring-sky-400/40 relative z-10"
              : isDark
                ? "bg-transparent text-slate-700 hover:text-sky-400"
                : "bg-transparent text-slate-300 hover:text-sky-600"
          )}
        >
          {rank ? (
            <span className="text-[14px]">{rank}</span>
          ) : (
            <span className="opacity-0 group-hover/btn:opacity-100 text-xl transition-opacity font-light">+</span>
          )}
        </button>
      );
    },
    size: 85,
  }));

  const statusColumn: ColumnDef<LabPickRow> = {
    id: "status",
    header: () => (
      <div className="flex items-center justify-center">
        <span className="font-semibold text-[13px] text-slate-500">Status</span>
      </div>
    ),
    cell: ({ row }) => {
      const { first_name, last_name, preferences, sync_status } = row.original;
      if (!first_name?.trim() && !last_name?.trim()) return <div className="h-10" />;

      const count = preferences?.length || 0;
      const isComplete = count === 5;
      const hasSelections = count > 0;

      return (
        <div className="flex items-center justify-center h-10 px-4">
          {sync_status === 'saving' ? (
            <div className={cn(
              "p-1.5 rounded-full transition-all duration-500 animate-spin-slow",
              isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
            )}>
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : hasSelections ? (
            <div className={cn(
              "p-1.5 rounded-full transition-all duration-500",
              isComplete
                ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                : isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
            )}>
              {isComplete ? <Check size={14} /> : <AlertCircle size={14} />}
            </div>
          ) : null}
        </div>
      );
    },
    size: 80,
  };

  const actionColumn: ColumnDef<LabPickRow> = {
    id: "actions",
    header: () => (
      <div className="flex items-center justify-center">
        <span className="font-semibold text-[13px] text-slate-500">Action</span>
      </div>
    ),
    cell: ({ row }) => {
      const { first_name, last_name, preferences } = row.original;
      const hasAnyData = !!(first_name?.trim() || last_name?.trim());
      const hasPrefs = preferences && preferences.length > 0;

      if (!hasAnyData || !hasPrefs) return <div className="h-10 w-full" />;

      return (
        <div className="h-full w-full relative min-h-[40px]">
          <button
            onClick={() => handleClearPreferences(row.original.id)}
            title="Clear Selections"
            className={cn(
              "absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300 group/clear hover:bg-rose-50/50 dark:hover:bg-rose-900/10",
              isDark ? "text-rose-400" : "text-rose-500"
            )}
          >
            <Eraser
              size={18}
              className="transition-all duration-300 group-hover/clear:scale-110 opacity-100 group-hover/clear:shake"
            />
          </button>
        </div>
      );
    },
    size: 80,
  };

  return [...baseColumns, ...labColumns, statusColumn, actionColumn];
};
