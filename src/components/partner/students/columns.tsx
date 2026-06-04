import type { ColumnDef } from "@tanstack/react-table";
import { Check, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useState, useRef, useEffect, useCallback } from "react";

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  age: number | '';
  last_grade_completed?: string;
  home_zip_code?: string;
  race_ethnicity?: string;
  gender?: string;
  total_program_hours?: number | '';
  camp_day_id: string | null;
  notes?: string;
  organization_id?: string;
  sync_status: 'synced' | 'saving' | 'error';
  order_index: number;
};

function CollaborativeInput({
  value,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  className,
  studentId,
  fieldName,
  activeCursorsRef,
  type
}: {
  value: any;
  placeholder: string;
  onChange: (e: any) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className: string;
  studentId: string;
  fieldName: string;
  activeCursorsRef: { current: { [key: string]: string } };
  type?: string;
}) {
  // Local state for instant input response — parent update is deferred
  const [localValue, setLocalValue] = useState(value);
  const isLocalEdit = useRef(false);

  // Sync from parent when value changes externally (colleague edit, realtime)
  useEffect(() => {
    if (!isLocalEdit.current) {
      setLocalValue(value);
    }
    isLocalEdit.current = false;
  }, [value]);

  const handleChange = useCallback((e: any) => {
    const newVal = e.target.value;
    isLocalEdit.current = true;
    setLocalValue(newVal);             // instant — only this input re-renders
    onChange(e);                        // sync — ensures dirty-marking before any navigation
  }, [onChange]);

  const isOtherEditing = !!activeCursorsRef.current[`${studentId}_${fieldName}`];

  return (
    <div className={cn(
      "relative w-full h-10 flex items-center transition-all duration-200",
      isOtherEditing && "outline outline-2 outline-purple-500 outline-offset-[-2px] bg-purple-500/10 z-10"
    )}>
      <Input
        type={type}
        value={localValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          className,
          "bg-transparent dark:bg-transparent placeholder:text-[11px] placeholder:opacity-90"
        )}
      />
    </div>
  );
}

// ─── CollaborativeSelect ────────────────────────────────────────────────────
// Dynamically scales the font size of the selected value so it always fits
// within the cell — short values stay full size, long ones shrink to fit.
function getSelectFontSize(len: number): string {
  if (len <= 12) return '13px';
  if (len <= 20) return '11px';
  if (len <= 28) return '10px';
  if (len <= 36) return '9px';
  return '8px';
}

function CollaborativeSelect({
  value,
  options,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  className,
  isDark,
}: {
  value: string;
  options: { label: string; value: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className: string;
  isDark?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isLocalEdit = useRef(false);

  useEffect(() => {
    if (!isLocalEdit.current) setLocalValue(value);
    isLocalEdit.current = false;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    isLocalEdit.current = true;
    setLocalValue(e.target.value);
    onChange(e.target.value);           // sync — ensures dirty-marking before any navigation
  }, [onChange]);

  const visibleText = localValue || placeholder;
  const fontSize = getSelectFontSize(visibleText.length);

  return (
    <div className="group/select relative w-full h-10 flex items-center">
      <select
        value={localValue}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={handleChange}
        style={{ fontSize }}
        className={cn(
          className,
          "appearance-none cursor-pointer pr-7 transition-[font-size] duration-150 outline-none focus:outline-none",
          !localValue && (isDark ? "!text-slate-700" : "!text-slate-300")
        )}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {/* Chevron icon */}
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-0 group-hover/select:opacity-40 group-focus-within/select:opacity-40 transition-opacity duration-200"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="2 4 6 8 10 4" />
      </svg>
    </div>
  );
}

const RACE_ETHNICITY_OPTIONS = [
  { value: "American Indian or Alaska Native", label: "American Indian or Alaska Native" },
  { value: "Asian", label: "Asian" },
  { value: "Black or African American", label: "Black or African American" },
  { value: "Hispanic or Latino", label: "Hispanic or Latino" },
  { value: "Native Hawaiian or Pacific Islander", label: "Native Hawaiian or Pacific Islander" },
  { value: "White", label: "White" },
  { value: "Two or more races", label: "Two or more races" },
  { value: "Prefer not to say", label: "Prefer not to say" },
  { value: "Other", label: "Other" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-binary", label: "Non-binary" },
  { value: "Transgender", label: "Transgender" },
  { value: "Prefer not to say", label: "Prefer not to say" },
  { value: "Other", label: "Other" },
];

const GRADE_OPTIONS = [
  { value: "Pre-K", label: "Pre-K" },
  { value: "Kindergarten", label: "Kindergarten" },
  { value: "1st Grade", label: "1st Grade" },
  { value: "2nd Grade", label: "2nd Grade" },
  { value: "3rd Grade", label: "3rd Grade" },
  { value: "4th Grade", label: "4th Grade" },
  { value: "5th Grade", label: "5th Grade" },
  { value: "6th Grade", label: "6th Grade" },
  { value: "7th Grade", label: "7th Grade" },
  { value: "8th Grade", label: "8th Grade" },
  { value: "9th Grade", label: "9th Grade" },
  { value: "10th Grade", label: "10th Grade" },
  { value: "11th Grade", label: "11th Grade" },
  { value: "12th Grade", label: "12th Grade" },
  { value: "College/Post-Secondary", label: "College/Post-Secondary" },
  { value: "Other", label: "Other" },
];

interface ColumnProps {
  handleFieldChange: (id: string, field: keyof StudentRow, value: any) => void;
  handleKeyDown?: (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  deleteStudent: (id: string) => void;
  campDays: { id: string, date: string }[];
  isDark: boolean;
  activeCursorsRef?: { current: { [cellKey: string]: string } };
  handleCellFocus?: (studentId: string, field: string) => void;
  handleCellBlur?: () => void;
}

const defaultCursorsRef = { current: {} as { [cellKey: string]: string } };

export const getColumns = ({
  handleFieldChange,
  deleteStudent,
  isDark,
  activeCursorsRef = defaultCursorsRef,
  handleCellFocus,
  handleCellBlur
}: ColumnProps): ColumnDef<StudentRow>[] => {
  const headerTextClass = "font-bold text-[11px] tracking-wide " + (isDark ? "text-slate-400" : "text-slate-500");

  return [
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
      enableHiding: false,
    },
    {
      accessorKey: "first_name",
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>First Name</span>
        </div>
      ),
      cell: ({ row }) => (
        <div id={row.index === 0 ? "tour-student-name" : undefined}>
          <CollaborativeInput
            value={row.original.first_name}
            placeholder=""
            onChange={(e) => handleFieldChange(row.original.id, 'first_name', e.target.value)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'first_name')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full",
              isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
            )}
            studentId={row.original.id}
            fieldName="first_name"
            activeCursorsRef={activeCursorsRef}
          />
        </div>
      ),
      meta: { isEditable: true },
      size: 185,
    },
    {
      accessorKey: "last_name",
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>Last Name</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeInput
          value={row.original.last_name}
          placeholder=""
          onChange={(e) => handleFieldChange(row.original.id, 'last_name', e.target.value)}
          onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'last_name')}
          onBlur={() => handleCellBlur && handleCellBlur()}
          className={cn(
            "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full",
            isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
          )}
          studentId={row.original.id}
          fieldName="last_name"
          activeCursorsRef={activeCursorsRef}
        />
      ),
      meta: { isEditable: true },
      size: 185,
    },
    {
      accessorKey: "age",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={headerTextClass}>Age</span>
        </div>
      ),
      cell: ({ row }) => (
        <div id={row.index === 0 ? "tour-student-cell" : undefined}>
          <CollaborativeInput
            type="number"
            value={row.original.age}
            placeholder=""
            onChange={(e) => handleFieldChange(row.original.id, 'age', e.target.value)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'age')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
            )}
            studentId={row.original.id}
            fieldName="age"
            activeCursorsRef={activeCursorsRef}
          />
        </div>
      ),
      meta: { isEditable: true },
      size: 60,
    },
    {
      accessorKey: "last_grade_completed",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={cn(headerTextClass, "text-center")}>Last grade completed</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeSelect
          value={row.original.last_grade_completed ?? ""}
          options={GRADE_OPTIONS}
          placeholder=""
          onChange={(val) => handleFieldChange(row.original.id, 'last_grade_completed', val)}
          onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'last_grade_completed')}
          onBlur={() => handleCellBlur && handleCellBlur()}
          isDark={isDark}
          className={cn(
            "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full text-center",
            isDark
              ? "text-white [&>option]:bg-slate-900 [&>option]:text-white"
              : "text-slate-900 [&>option]:bg-white [&>option]:text-slate-900"
          )}
        />
      ),
      meta: { isEditable: true },
      size: 160,
    },
    {
      accessorKey: "home_zip_code",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={cn(headerTextClass, "text-center")}>Home zip code</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeInput
          value={row.original.home_zip_code ?? ""}
          placeholder=""
          onChange={(e) => handleFieldChange(row.original.id, 'home_zip_code', e.target.value)}
          onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'home_zip_code')}
          onBlur={() => handleCellBlur && handleCellBlur()}
          className={cn(
            "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full text-center",
            isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
          )}
          studentId={row.original.id}
          fieldName="home_zip_code"
          activeCursorsRef={activeCursorsRef}
        />
      ),
      meta: { isEditable: true },
      size: 120,
    },
    {
      accessorKey: "race_ethnicity",
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>Race/ethnicity</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeSelect
          value={row.original.race_ethnicity ?? ""}
          options={RACE_ETHNICITY_OPTIONS}
          placeholder=""
          onChange={(val) => handleFieldChange(row.original.id, 'race_ethnicity', val)}
          onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'race_ethnicity')}
          onBlur={() => handleCellBlur && handleCellBlur()}
          isDark={isDark}
          className={cn(
            "h-10 px-3 font-semibold border-none focus:ring-0 bg-transparent transition-all rounded-none w-full",
            isDark
              ? "text-white [&>option]:bg-slate-900 [&>option]:text-white [&>option]:text-[13px]"
              : "text-slate-900 [&>option]:bg-white [&>option]:text-slate-900 [&>option]:text-[13px]"
          )}
        />
      ),
      meta: { isEditable: true },
      size: 180,
    },
    {
      accessorKey: "gender",
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>Gender</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeSelect
          value={row.original.gender ?? ""}
          options={GENDER_OPTIONS}
          placeholder=""
          onChange={(val) => handleFieldChange(row.original.id, 'gender', val)}
          onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'gender')}
          onBlur={() => handleCellBlur && handleCellBlur()}
          isDark={isDark}
          className={cn(
            "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full",
            isDark
              ? "text-white [&>option]:bg-slate-900 [&>option]:text-white"
              : "text-slate-900 [&>option]:bg-white [&>option]:text-slate-900"
          )}
        />
      ),
      meta: { isEditable: true },
      size: 120,
    },
    {
      accessorKey: "total_program_hours",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn(headerTextClass, "text-center whitespace-normal leading-tight px-1")}>Total number of program hours completed</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeInput
          type="number"
          value={row.original.total_program_hours ?? ""}
          placeholder=""
          onChange={(e) => handleFieldChange(row.original.id, 'total_program_hours', e.target.value)}
          onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'total_program_hours')}
          onBlur={() => handleCellBlur && handleCellBlur()}
          className={cn(
            "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
          )}
          studentId={row.original.id}
          fieldName="total_program_hours"
          activeCursorsRef={activeCursorsRef}
        />
      ),
      meta: { isEditable: true },
      size: 200,
    },

    {
      id: "status",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={headerTextClass}>Complete</span>
        </div>
      ),
      cell: ({ row }) => {
        const { sync_status, first_name, last_name, age, last_grade_completed, home_zip_code, race_ethnicity, gender, total_program_hours } = row.original;

        const fields = [first_name, last_name, age, last_grade_completed, home_zip_code, race_ethnicity, gender, total_program_hours];
        const hasAnyData = fields.some(f => f !== '' && f !== null && f !== undefined);
        const isAllFilled = fields.every(f => f !== '' && f !== null && f !== undefined);

        return (
          <div id={row.index === 0 ? "tour-status-ready" : undefined} className="flex items-center justify-center h-10">
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
      size: 65,
    },
    {
      id: "actions",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={headerTextClass}>Delete</span>
        </div>
      ),
      cell: ({ row }) => {
        const { first_name, last_name, age, last_grade_completed, home_zip_code, race_ethnicity, gender, total_program_hours } = row.original;
        const fields = [first_name, last_name, age, last_grade_completed, home_zip_code, race_ethnicity, gender, total_program_hours];
        const hasAnyData = fields.some(f => f !== '' && f !== null && f !== undefined);

        if (!hasAnyData) return <div className="h-10 w-full" />;

        return (
          <div id={row.index === 0 ? "tour-delete-action" : undefined} className="h-full w-full relative min-h-[40px]">
            <button
              onClick={() => deleteStudent(row.original.id)}
              className={cn(
                "absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300 group/delete",
                isDark ? "text-rose-400 hover:bg-rose-900/10" : "text-rose-500 hover:bg-rose-50/50"
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
      size: 65,
    },
  ];
};
