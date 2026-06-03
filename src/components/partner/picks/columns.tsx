import type { ColumnDef } from "@tanstack/react-table";
import { User, CheckCircle2, AlertCircle, Check, Eraser, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export type LabPickRow = {
  id: string;
  first_name: string;
  last_name: string;
  age?: number | '';
  notes?: string;
  preferences: { lab_id: string; rank: number }[];
  sync_status?: 'synced' | 'saving' | 'error';
};

interface ColumnProps {
  labs: { id: string, name: string }[];
  handlePreferenceToggle: (studentId: string, labId: string) => void;
  handleClearPreferences: (studentId: string) => void;
  handleNoteSave: (studentId: string, notes: string) => void;
  isDark: boolean;
}

const LAB_SHORT_NAMES: Record<string, string> = {
  "Arts Collaboratorium": "Arts Collab",
  "Jazz Fab Lab": "Jazz Fab",
  "Virtual Reality MusicMaking": "VR Music",
  "Conga Drumming": "Conga",
  "Afro-Futuristic Studio": "Afro-Future",
  "Remix the Code": "Remix Code",
  "Pixel Beats Lab": "Pixel Beats",
  "Eco Jazz Sound Lab": "Eco Jazz",
  "The Vocal Resonance Lab with The Singing Buckeyes": "Vocal Resonance",
  "Young Producers Lab": "Young Producers",
};

export const LAB_DETAILS: Record<string, { short: string; room: string; desc: string; icon: string; ageRequirement: string }> = {
  "Arts Collaboratorium": { short: "Arts Collaboratorium", room: "106", desc: "Collage art making", icon: "🎨", ageRequirement: "all ages" },
  "Young Producers Lab": { short: "Future Producers Lab", room: "108", desc: "Singer-Songwriter activities", icon: "🎙️", ageRequirement: "11+" },
  "Future Producers Lab": { short: "Future Producers Lab", room: "108", desc: "Singer-Songwriter activities", icon: "🎙️", ageRequirement: "11+" },
  "Afro-Futuristic Studio": { short: "Afro-Futuristic Studio", room: "110", desc: "Ai Image & Music-Making", icon: "🚀", ageRequirement: "10+" },
  "AI World-Building Lab": { short: "Afro-Futuristic Studio", room: "110", desc: "Ai Image & Music-Making", icon: "🚀", ageRequirement: "10+" },
  "Pixel Beats Lab": { short: "Pixel Beats Lab", room: "112", desc: "Video game music coding", icon: "🎮", ageRequirement: "9+" },
  "The Vocal Resonance Lab with The Singing Buckeyes": { short: "Vocal Resonance Lab", room: "120", desc: "Harmonizing/ Singing", icon: "🎤", ageRequirement: "all ages" },
  "Vocal Resonance Lab": { short: "Vocal Resonance Lab", room: "120", desc: "Harmonizing/ Singing", icon: "🎤", ageRequirement: "all ages" },
  "Remix the Code": { short: "Remix the Code", room: "122", desc: "Music Coding w/ JavaScript", icon: "💻", ageRequirement: "11+" },
  "Eco Jazz Sound Lab": { short: "EcoJazz Sound Lab", room: "123", desc: "Nature recording/ mixing", icon: "🌱", ageRequirement: "9+" },
  "Virtual Reality MusicMaking": { short: "Virtual Reality", room: "124", desc: "Music Composing in VR", icon: "🕶️", ageRequirement: "7+" },
  "Conga Drumming": { short: "Conga Drumming", room: "125A", desc: "Cultural Drumming/ Rhythms", icon: "🥁", ageRequirement: "all ages" },
  "Jazz Fab Lab": { short: "JazzFabLab", room: "130", desc: "Engineering Instruments", icon: "🛠️", ageRequirement: "7+" },
};

export const getColumns = ({
  labs,
  handlePreferenceToggle,
  handleClearPreferences,
  handleNoteSave,
  isDark
}: ColumnProps): ColumnDef<LabPickRow>[] => {
  const baseColumns: ColumnDef<LabPickRow>[] = [
    {
      id: "serial",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn(
            "font-black tracking-widest text-[10px]",
            isDark ? "text-slate-200" : "text-slate-800"
          )}>#</span>
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
          <span className={cn(
            "font-bold text-[11px] tracking-wide",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>Student Name</span>
        </div>
      ),
      cell: ({ row }) => (
        <div id={row.index === 0 ? "tour-student-name" : undefined} className="px-4 flex items-center h-10 w-full min-w-0">
          <span className={cn(
            "font-semibold text-[13px] truncate",
            isDark ? "text-white" : "text-slate-900"
          )}>
            {row.original.first_name} {row.original.last_name}
          </span>
        </div>
      ),
      size: 215,
    },
    {
      accessorKey: "age",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={cn(
            "font-bold text-[11px] tracking-wide",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>Age</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center h-10">
          <span className={cn(
            "text-[13px] font-medium",
            isDark ? "text-slate-300" : "text-slate-600"
          )}>
            {row.original.age || ""}
          </span>
        </div>
      ),
      size: 45,
    },
    {
      accessorKey: "notes",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={cn(
            "font-bold text-[11px] tracking-wide",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>Notes</span>
        </div>
      ),
      cell: ({ row }) => <NotesCell row={row} handleNoteSave={handleNoteSave} isDark={isDark} />,
      size: 50,
    },
  ];

  // Dynamic Lab Columns
  const labColumns: ColumnDef<LabPickRow>[] = labs.map((lab, colIdx) => ({
    id: `lab-${lab.id}`,
    header: () => {
      const details = LAB_DETAILS[lab.name] || { short: LAB_SHORT_NAMES[lab.name] || lab.name, room: "TBD", desc: "", ageRequirement: "all ages" };
      
      return (
        <div className="flex flex-col justify-between py-1.5 h-full w-full select-none text-center leading-normal min-w-0 overflow-hidden">
          {/* Age Req */}
          <span className={cn(
            "text-[9px] font-black tracking-wider whitespace-normal break-words inline-block w-full opacity-85",
            isDark ? "text-sky-300" : "text-sky-700"
          )}>
            Age: {details.ageRequirement}
          </span>
          
          {/* Divider */}
          <div className={cn(
            "my-1 border-t w-full",
            isDark ? "border-white/10" : "border-slate-200"
          )} />
          
          {/* Lab Name */}
          <span className={cn(
            "font-black text-[10.5px] leading-tight px-0.5 whitespace-normal break-words inline-block w-full",
            isDark ? "text-white" : "text-slate-900"
          )}>
            {details.short}
          </span>
          
          {/* Divider */}
          <div className={cn(
            "my-1 border-t w-full",
            isDark ? "border-white/10" : "border-slate-200"
          )} />
          
          {/* Brief Description */}
          <span className={cn(
            "text-[10px] font-semibold leading-tight px-0.5 italic whitespace-normal break-normal inline-block w-full",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>
            {details.desc}
          </span>
        </div>
      );
    },
    cell: ({ row }) => {
      const { first_name, last_name } = row.original;
      if (!first_name?.trim() && !last_name?.trim()) return <div className="h-10" />;

      const pref = row.original.preferences?.find(p => p.lab_id === lab.id);
      const rank = pref?.rank;

      return (
        <button
          id={row.index === 0 && colIdx === 0 ? "tour-lab-cell" : undefined}
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
    size: 97,
  }));

  const statusColumn: ColumnDef<LabPickRow> = {
    id: "status",
    header: () => (
      <div className="flex items-center justify-center">
        <span className={cn(
          "font-bold text-[11px] tracking-wide",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>Ready?</span>
      </div>
    ),
    cell: ({ row }) => {
      const { first_name, last_name, preferences, sync_status } = row.original;
      if (!first_name?.trim() && !last_name?.trim()) return <div className="h-10" />;

      const count = preferences?.length || 0;
      const isComplete = count === 10;
      const hasSelections = count > 0;

      return (
        <div id={row.index === 0 ? "tour-status-ready" : undefined} className="flex items-center justify-center h-10 px-1">
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
    size: 50,
  };

  const actionColumn: ColumnDef<LabPickRow> = {
    id: "actions",
    header: () => (
      <div className="flex items-center justify-center">
        <span className={cn(
          "font-bold text-[11px] tracking-wide",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>Clear</span>
      </div>
    ),
    cell: ({ row }) => {
      const { first_name, last_name, preferences } = row.original;
      const hasAnyData = !!(first_name?.trim() || last_name?.trim());
      const hasPrefs = preferences && preferences.length > 0;

      if (!hasAnyData || !hasPrefs) return <div className="h-10 w-full" />;

      return (
        <div id={row.index === 0 ? "tour-clear-action" : undefined} className="h-full w-full relative min-h-[40px]">
          <button
            onClick={() => handleClearPreferences(row.original.id)}
            title="Clear Selections"
            className={cn(
              "absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300 group/clear",
              isDark ? "text-rose-400 hover:bg-rose-900/10" : "text-rose-500 hover:bg-rose-50/50"
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
    size: 50,
  };

  return [...baseColumns, ...labColumns, statusColumn, actionColumn];
};

function NotesCell({ row, handleNoteSave, isDark }: { row: any; handleNoteSave: (studentId: string, notes: string) => void; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(row.original.notes || '');

  const { first_name, last_name, notes } = row.original;
  const hasAnyData = !!(first_name?.trim() || last_name?.trim());
  const hasNotes = !!notes?.trim();

  if (!hasAnyData) return <div className="h-10 w-full" />;

  return (
    <div className="h-full w-full min-h-[40px]">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button
              className={cn(
                "absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300 group/note",
                isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/50",
                open && (isDark ? "bg-white/[0.02]" : "bg-slate-50/50")
              )}
              onClick={() => setDraft(notes || '')}
            />
          }
        >
          <FileText
            size={18}
            fill="none"
            className={cn(
              "transition-all duration-300 group-hover/note:scale-110",
              hasNotes || open
                ? "text-yellow-400 opacity-100"
                : (isDark
                  ? "text-slate-700 group-hover/note:text-yellow-400"
                  : "text-slate-300 group-hover/note:text-yellow-400")
            )}
          />
        </DialogTrigger>
        <DialogContent className={cn(
          "w-[480px] rounded-[24px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-0 overflow-hidden translate-x-[-50%] translate-y-[-50%] transition-all duration-500",
          " [&_[data-slot=dialog-close]]:bg-transparent [&_[data-slot=dialog-close]]:opacity-20 [&_[data-slot=dialog-close]]:hover:opacity-100 [&_[data-slot=dialog-close]]:transition-all [&_[data-slot=dialog-close]]:duration-300 [&_[data-slot=dialog-close]]:hover:scale-110",
          isDark ? "bg-slate-950/90 backdrop-blur-xl text-white ring-1 ring-white/10" : "bg-white ring-1 ring-slate-100"
        )}>
          <div className="p-6 flex flex-col h-[320px]">
            <div className="flex-1">
              <Textarea
                placeholder="e.g. Hearing sensitivity to loud percussion..."
                className={cn(
                  "h-full w-full rounded-none border-none transition-all duration-500 text-[15px] shadow-none resize-none leading-relaxed p-0 pr-10",
                  "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none ring-0 ring-offset-0",
                  isDark
                    ? "bg-transparent text-slate-200 placeholder:text-slate-700"
                    : "bg-transparent text-slate-700 placeholder:text-slate-300"
                )}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end items-center gap-6">
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  "text-[13px] font-semibold transition-all duration-300 hover:opacity-100",
                  isDark ? "text-slate-500 opacity-40" : "text-slate-400 opacity-60"
                )}
              >
                Cancel
              </button>
              <Button
                onClick={() => {
                  handleNoteSave(row.original.id, draft);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-xl h-10 px-6 font-semibold tracking-wide text-xs transition-all duration-300 shadow-sm border",
                  isDark
                    ? "bg-yellow-500/20 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 hover:border-yellow-500/50"
                    : "bg-yellow-50 border-yellow-200/60 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300"
                )}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
