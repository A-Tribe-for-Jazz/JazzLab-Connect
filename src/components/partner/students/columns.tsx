import type { ColumnDef } from "@tanstack/react-table";
import { Check, Loader2, AlertCircle, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, hasAnyStudentData } from "@/lib/utils";

import { useState, useRef, useEffect, useCallback } from "react";

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  age: number | '';
  last_grade_completed?: string;
  home_zip_code?: string;
  race?: string;
  ethnicity?: string;
  gender?: string;
  first_language?: string;
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
  type,
  isIncomplete
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
  isIncomplete?: boolean;
}) {
  // Local state for instant input response — parent update is deferred
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);

  // Sync from parent when value changes externally (colleague edit, realtime)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((e: any) => {
    const newVal = e.target.value;
    setLocalValue(newVal);             // instant — only this input re-renders
    onChange(e);                        // sync — ensures dirty-marking before any navigation
  }, [onChange]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
    if (onFocus) onFocus();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    if (onBlur) onBlur();
  }, [onBlur]);

  const isOtherEditing = !!activeCursorsRef.current[`${studentId}_${fieldName}`];

  return (
    <div className={cn(
      "relative w-full h-10 flex items-center transition-all duration-300",
      isOtherEditing && "outline outline-2 outline-purple-500 outline-offset-[-2px] bg-purple-500/10 z-10",
      isIncomplete && "outline outline-2 outline-orange-600 dark:outline-orange-500 outline-offset-[-2px] bg-orange-500/[0.15] dark:bg-orange-500/[0.12] shadow-[0_0_14px_rgba(249,115,22,0.8)] dark:shadow-[0_0_16px_rgba(249,115,22,0.75)] z-10"
    )}>
      <Input
        type={type}
        value={localValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          className,
          "bg-transparent dark:bg-transparent placeholder:text-[11px] placeholder:opacity-90 truncate"
        )}
        title={localValue}
      />
    </div>
  );
}

// ─── SelectWithOther ─────────────────────────────────────────────────────────
function SelectWithOther({
  value,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  className,
  isDark,
  studentId,
  activeCursorsRef,
  fieldName,
  predefined,
  inputPlaceholder,
  isIncomplete
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className: string;
  isDark?: boolean;
  studentId: string;
  activeCursorsRef?: { current: { [key: string]: string } };
  fieldName: string;
  predefined: string[];
  inputPlaceholder: string;
  isIncomplete?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
      if (value && !predefined.includes(value)) {
        setShowInput(true);
      } else {
        setShowInput(false);
      }
    }
  }, [value, predefined]);

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "Other") {
      setShowInput(true);
      setLocalValue("");
      onChange("");
    } else {
      setLocalValue(val);
      onChange(val);
    }
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onChange(val);
  }, [onChange]);

  const handleReset = useCallback(() => {
    setShowInput(false);
    setLocalValue("");
    onChange("");
  }, [onChange]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
    if (onFocus) onFocus();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    if (onBlur) onBlur();
  }, [onBlur]);

  const isOtherEditing = activeCursorsRef?.current ? !!activeCursorsRef.current[`${studentId}_${fieldName}`] : false;

  if (showInput) {
    return (
      <div className={cn(
        "relative w-full h-10 flex items-center pr-8 transition-all duration-300",
        isOtherEditing && "outline outline-2 outline-purple-500 outline-offset-[-2px] bg-purple-500/10 z-10",
        isIncomplete && "outline outline-2 outline-orange-600 dark:outline-orange-500 outline-offset-[-2px] bg-orange-500/[0.15] dark:bg-orange-500/[0.12] shadow-[0_0_14px_rgba(249,115,22,0.8)] dark:shadow-[0_0_16px_rgba(249,115,22,0.75)] z-10"
      )}>
        <Input
          value={localValue}
          placeholder={inputPlaceholder}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            className,
            "bg-transparent dark:bg-transparent placeholder:text-[11px] placeholder:opacity-90 pr-6 w-full text-center"
          )}
        />
        <button
          onClick={handleReset}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors animate-in fade-in zoom-in duration-300"
          type="button"
          title="Reset to dropdown"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  const visibleText = localValue || placeholder;

  return (
    <div className={cn(
      "group/select relative w-full h-10 flex items-center justify-center transition-all duration-300",
      isOtherEditing && "outline outline-2 outline-purple-500 outline-offset-[-2px] bg-purple-500/10 z-10",
      isIncomplete && "outline outline-2 outline-orange-600 dark:outline-orange-500 outline-offset-[-2px] bg-orange-500/[0.15] dark:bg-orange-500/[0.12] shadow-[0_0_14px_rgba(249,115,22,0.8)] dark:shadow-[0_0_16px_rgba(249,115,22,0.75)] z-10"
    )}>
      {/* Underlying Display Wrapper */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-4 text-center">
        <span
          className={cn(
            "text-[12px] leading-tight font-semibold truncate w-full block",
            !localValue
              ? (isDark ? "text-slate-700" : "text-slate-350")
              : (isDark ? "text-white" : "text-slate-900")
          )}
          title={visibleText}
        >
          {visibleText}
        </span>
      </div>
      <select
        value={localValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleSelectChange}
        className={cn(
          className,
          "absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none outline-none focus:outline-none"
        )}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {predefined.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value="Other">Other...</option>
      </select>
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

const GRADE_PREDEFINED = [
  "Pre-K",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "College/Post-Secondary",
  "CSCC"
];

const RACE_PREDEFINED = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Biracial",
  "Caucasian",
  "Native Hawaiian or Pacific Islander",
  "White",
  "Two or more races"
];

const ETHNICITY_PREDEFINED = [
  "Hispanic or Latino",
  "Not Hispanic or Latino"
];

const GENDER_PREDEFINED = [
  "Male",
  "Female",
  "Non-binary",
  "Transgender"
];

const LANGUAGE_PREDEFINED = [
  "English",
  "Spanish",
  "Amharic",
  "Nepali",
  "Somali",
  "Zomi"
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
  isAdmin?: boolean;
}

const defaultCursorsRef = { current: {} as { [cellKey: string]: string } };

export const getColumns = ({
  handleFieldChange,
  deleteStudent,
  isDark,
  activeCursorsRef = defaultCursorsRef,
  handleCellFocus,
  handleCellBlur,
  isAdmin = false
}: ColumnProps): ColumnDef<StudentRow>[] => {
  const headerTextClass = "font-bold text-[11px] tracking-wide " + (isDark ? "text-slate-400" : "text-slate-500");

  const cols: ColumnDef<StudentRow>[] = [
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
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <div id={row.index === 0 ? "tour-student-name" : undefined}>
            <CollaborativeInput
              value={row.original.first_name}
              placeholder=""
              onChange={(e) => handleFieldChange(row.original.id, 'first_name', e.target.value)}
              onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'first_name')}
              onBlur={() => handleCellBlur && handleCellBlur()}
              className={cn(
                "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full",
                isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
              )}
              studentId={row.original.id}
              fieldName="first_name"
              activeCursorsRef={activeCursorsRef}
              isIncomplete={isRowActive && !row.original.first_name?.trim()}
            />
          </div>
        );
      },
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
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <CollaborativeInput
            value={row.original.last_name}
            placeholder=""
            onChange={(e) => handleFieldChange(row.original.id, 'last_name', e.target.value)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'last_name')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full",
              isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
            )}
            studentId={row.original.id}
            fieldName="last_name"
            activeCursorsRef={activeCursorsRef}
            isIncomplete={isRowActive && !row.original.last_name?.trim()}
          />
        );
      },
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
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <div id={row.index === 0 ? "tour-student-cell" : undefined}>
            <CollaborativeInput
              type="number"
              value={row.original.age}
              placeholder=""
              onChange={(e) => handleFieldChange(row.original.id, 'age', e.target.value)}
              onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'age')}
              onBlur={() => handleCellBlur && handleCellBlur()}
              className={cn(
                "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
              )}
              studentId={row.original.id}
              fieldName="age"
              activeCursorsRef={activeCursorsRef}
              isIncomplete={isRowActive && (row.original.age === '' || row.original.age === null || row.original.age === undefined)}
            />
          </div>
        );
      },
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
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <SelectWithOther
            value={row.original.last_grade_completed ?? ""}
            placeholder=""
            onChange={(val) => handleFieldChange(row.original.id, 'last_grade_completed', val)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'last_grade_completed')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            isDark={isDark}
            studentId={row.original.id}
            activeCursorsRef={activeCursorsRef}
            fieldName="last_grade_completed"
            predefined={GRADE_PREDEFINED}
            inputPlaceholder="Type grade..."
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full text-center",
              isDark ? "text-white" : "text-slate-900"
            )}
            isIncomplete={isRowActive && !row.original.last_grade_completed?.trim()}
          />
        );
      },
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
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <CollaborativeInput
            value={row.original.home_zip_code ?? ""}
            placeholder=""
            onChange={(e) => handleFieldChange(row.original.id, 'home_zip_code', e.target.value)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'home_zip_code')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full text-center",
              isDark ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-300"
            )}
            studentId={row.original.id}
            fieldName="home_zip_code"
            activeCursorsRef={activeCursorsRef}
            isIncomplete={isRowActive && (!row.original.home_zip_code?.trim() || !/^\d{5}$/.test(row.original.home_zip_code.trim()))}
          />
        );
      },
      meta: { isEditable: true },
      size: 120,
    },
    {
      accessorKey: "race",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn(headerTextClass, "text-center")}>Race</span>
        </div>
      ),
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <SelectWithOther
            value={row.original.race ?? ""}
            placeholder=""
            onChange={(val) => handleFieldChange(row.original.id, 'race', val)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'race')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            isDark={isDark}
            studentId={row.original.id}
            activeCursorsRef={activeCursorsRef}
            fieldName="race"
            predefined={RACE_PREDEFINED}
            inputPlaceholder="Type race..."
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full",
              isDark ? "text-white" : "text-slate-900"
            )}
            isIncomplete={isRowActive && !row.original.race?.trim()}
          />
        );
      },
      meta: { isEditable: true },
      size: 160,
    },
    {
      accessorKey: "ethnicity",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn(headerTextClass, "text-center")}>Ethnicity</span>
        </div>
      ),
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <SelectWithOther
            value={row.original.ethnicity ?? ""}
            placeholder=""
            onChange={(val) => handleFieldChange(row.original.id, 'ethnicity', val)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'ethnicity')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            isDark={isDark}
            studentId={row.original.id}
            activeCursorsRef={activeCursorsRef}
            fieldName="ethnicity"
            predefined={ETHNICITY_PREDEFINED}
            inputPlaceholder="Type ethnicity..."
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full",
              isDark ? "text-white" : "text-slate-900"
            )}
            isIncomplete={isRowActive && !row.original.ethnicity?.trim()}
          />
        );
      },
      meta: { isEditable: true },
      size: 160,
    },
    {
      accessorKey: "gender",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn(headerTextClass, "text-center")}>Gender</span>
        </div>
      ),
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <SelectWithOther
            value={row.original.gender ?? ""}
            placeholder=""
            onChange={(val) => handleFieldChange(row.original.id, 'gender', val)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'gender')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            isDark={isDark}
            studentId={row.original.id}
            activeCursorsRef={activeCursorsRef}
            fieldName="gender"
            predefined={GENDER_PREDEFINED}
            inputPlaceholder="Type gender..."
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full",
              isDark ? "text-white" : "text-slate-900"
            )}
            isIncomplete={isRowActive && !row.original.gender?.trim()}
          />
        );
      },
      meta: { isEditable: true },
      size: 100,
    },
    {
      accessorKey: "first_language",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn(headerTextClass, "text-center")}>First Language</span>
        </div>
      ),
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
          <SelectWithOther
            value={row.original.first_language ?? ""}
            placeholder=""
            onChange={(val) => handleFieldChange(row.original.id, 'first_language', val)}
            onFocus={() => handleCellFocus && handleCellFocus(row.original.id, 'first_language')}
            onBlur={() => handleCellBlur && handleCellBlur()}
            isDark={isDark}
            studentId={row.original.id}
            activeCursorsRef={activeCursorsRef}
            fieldName="first_language"
            predefined={LANGUAGE_PREDEFINED}
            inputPlaceholder="Type language..."
            className={cn(
              "h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent rounded-none w-full",
              isDark ? "text-white" : "text-slate-900"
            )}
            isIncomplete={isRowActive && !row.original.first_language?.trim()}
          />
        );
      },
      meta: { isEditable: true },
      size: 130,
    },
    {
      accessorKey: "total_program_hours",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn(headerTextClass, "text-center whitespace-normal leading-tight px-1")}>Total number of program hours completed</span>
        </div>
      ),
      cell: ({ row }) => {
        const isRowActive = hasAnyStudentData(row.original);
        return (
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
            isIncomplete={isRowActive && (row.original.total_program_hours === '' || row.original.total_program_hours === null || row.original.total_program_hours === undefined)}
          />
        );
      },
      meta: { isEditable: true },
      size: 120,
    },

    {
      id: "status",
      header: () => (
        <div className="flex items-center justify-center">
          <span className={headerTextClass}>Complete</span>
        </div>
      ),
      cell: ({ row }) => {
        const { sync_status, first_name, last_name, age, last_grade_completed, home_zip_code, race, ethnicity, gender, first_language, total_program_hours } = row.original;

        const fields = [
          first_name,
          last_name,
          age,
          last_grade_completed,
          home_zip_code,
          race,
          ethnicity,
          gender,
          first_language,
          ...(isAdmin ? [total_program_hours] : [])
        ];
        const hasAnyData = fields.some(f => f !== '' && f !== null && f !== undefined);
        const isZipValid = /^\d{5}$/.test(home_zip_code?.trim() || '');
        const isAllFilled = fields.every(f => f !== '' && f !== null && f !== undefined) && isZipValid;

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
        const { first_name, last_name, age, last_grade_completed, home_zip_code, race, ethnicity, gender, first_language, total_program_hours } = row.original;
        const fields = [
          first_name,
          last_name,
          age,
          last_grade_completed,
          home_zip_code,
          race,
          ethnicity,
          gender,
          first_language,
          ...(isAdmin ? [total_program_hours] : [])
        ];
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

  return cols.filter(col => {
    if (!isAdmin && (col as any).accessorKey === "total_program_hours") {
      return false;
    }
    return true;
  });
};
