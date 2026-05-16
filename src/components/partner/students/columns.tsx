import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Check, Loader2, AlertCircle, Trash2, User, Calendar, Hash, Eye, Copy, ShieldAlert, Activity, Zap, ShieldCheck, Settings2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  age: number | '';
  gender: string;
  race: string;
  ethnicity: string;
  zip_code: string;
  camp_day_id: string | null;
  notes?: string;
  sync_status: 'synced' | 'saving' | 'error';
  order_index: number;
};

interface ColumnProps {
  handleFieldChange: (id: string, field: keyof StudentRow, value: any) => void;
  handleKeyDown?: (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  deleteStudent: (id: string) => void;
  campDays: { id: string, date: string }[];
  isDark: boolean;
}

export const getColumns = ({
  handleFieldChange,
  deleteStudent,
  isDark
}: ColumnProps): ColumnDef<StudentRow>[] => [
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
      size: 24,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "first_name",
      header: ({ column }) => (
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent font-semibold text-[13px] text-slate-500"
          >
            First Name
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <Input
          value={row.original.first_name}
          placeholder="First Name"
          onChange={(e) => handleFieldChange(row.original.id, 'first_name', e.target.value)}
          className={cn(
            "h-10 px-3 font-bold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full",
            isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
          )}
        />
      ),
      meta: { isEditable: true },
    },
    {
      accessorKey: "last_name",
      header: ({ column }) => (
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent font-semibold text-[13px] text-slate-500"
          >
            Last Name
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <Input
          value={row.original.last_name}
          placeholder="Last Name"
          onChange={(e) => handleFieldChange(row.original.id, 'last_name', e.target.value)}
          className={cn(
            "h-10 px-3 font-bold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full",
            isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
          )}
        />
      ),
      meta: { isEditable: true },
    },
    {
      accessorKey: "age",
      header: ({ column }) => (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent font-semibold text-[13px] text-slate-500"
          >
            Age
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <Input
          type="number"
          value={row.original.age}
          placeholder="Age"
          onChange={(e) => handleFieldChange(row.original.id, 'age', e.target.value)}
          className={cn(
            "h-10 px-3 font-black text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
          )}
        />
      ),
      meta: { isEditable: true },
    },
    {
      accessorKey: "notes",
      header: ({ column }) => (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent font-semibold text-[13px] text-slate-500"
          >
            Notes
          </Button>
        </div>
      ),
      cell: ({ row }) => <NotesCell row={row} handleFieldChange={handleFieldChange} isDark={isDark} />,
      meta: { isEditable: true },
    },
    {
      id: "status",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="font-semibold text-[13px] text-slate-500">Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const { sync_status, first_name, last_name, age } = row.original;

        const fields = [first_name, last_name, age];
        const hasAnyData = fields.some(f => f !== '' && f !== null && f !== undefined);
        const isAllFilled = fields.every(f => f !== '' && f !== null && f !== undefined);

        return (
          <div className="flex items-center justify-center h-10">
            {sync_status === 'saving' ? (
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-500 animate-spin-slow",
                isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
              )}>
                <Loader2 size={14} className="animate-spin" />
              </div>
            ) : sync_status === 'error' || (hasAnyData && !isAllFilled) ? (
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-500",
                isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
              )}>
                <AlertCircle size={14} />
              </div>
            ) : isAllFilled ? (
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-500",
                isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
              )}>
                <Check size={14} />
              </div>
            ) : null}
          </div>
        );
      },
      size: 80,
    },
    {
      id: "actions",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="font-semibold text-[13px] text-slate-500">Action</span>
        </div>
      ),
      cell: ({ row }) => {
        const { first_name, last_name, age } = row.original;
        const fields = [first_name, last_name, age];
        const hasAnyData = fields.some(f => f !== '' && f !== null && f !== undefined);

        if (!hasAnyData) return <div className="h-10 w-full" />;

        return (
          <div className="h-full w-full relative min-h-[40px]">
            <button
              onClick={() => deleteStudent(row.original.id)}
              className={cn(
                "absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300 group/delete hover:bg-rose-50/50 dark:hover:bg-rose-900/10",
                isDark ? "text-rose-400" : "text-rose-500"
              )}
            >
              <Trash2
                size={18}
                className="transition-all duration-300 group-hover/delete:scale-110 opacity-100 group-hover/delete:shake"
              />
            </button>
          </div>
        );
      },
      size: 80,
    },
  ];

function NotesCell({ row, handleFieldChange, isDark }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(row.original.notes || '');

  const { first_name, last_name, age, notes } = row.original;
  const hasAnyData = !!(first_name?.trim() || last_name?.trim() || age !== '');
  const hasNotes = !!notes?.trim();

  if (!hasAnyData) return <div className="h-10 w-full" />;

  return (
    <div className="h-full w-full min-h-[40px]">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={cn(
              "absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300 group/note hover:bg-slate-50/50 dark:hover:bg-white/[0.02]",
              open && (isDark ? "bg-white/[0.02]" : "bg-slate-50/50")
            )}
            onClick={() => setDraft(notes || '')}
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
          </button>
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
                  "h-full w-full rounded-none border-none transition-all duration-500 text-[15px] shadow-none resize-none leading-relaxed p-0",
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
                  handleFieldChange(row.original.id, 'notes', draft);
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
