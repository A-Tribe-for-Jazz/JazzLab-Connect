import type { ColumnDef } from '@tanstack/react-table';
import { Check, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback, startTransition } from 'react';

export type StaffRow = {
  id: string;
  name: string;
  title: string;
  email: string;
  cell: string;
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
  staffId,
  fieldName,
  activeCursorsRef,
  type,
}: {
  value: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className: string;
  staffId: string;
  fieldName: string;
  activeCursorsRef: { current: { [key: string]: string } };
  type?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isLocalEdit = useRef(false);

  useEffect(() => {
    if (!isLocalEdit.current) setLocalValue(value);
    isLocalEdit.current = false;
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      isLocalEdit.current = true;
      setLocalValue(newVal);
      startTransition(() => onChange(e));
    },
    [onChange]
  );

  const isOtherEditing = !!activeCursorsRef.current[`${staffId}_${fieldName}`];

  return (
    <div
      className={cn(
        'relative w-full h-10 flex items-center transition-all duration-200',
        isOtherEditing && 'outline outline-2 outline-purple-500 outline-offset-[-2px] bg-purple-500/10 z-10'
      )}
    >
      <Input
        type={type}
        value={localValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(className, 'bg-transparent dark:bg-transparent placeholder:text-[11px] placeholder:opacity-90')}
      />
    </div>
  );
}

interface ColumnProps {
  handleFieldChange: (id: string, field: keyof StaffRow, value: any) => void;
  deleteStaff: (id: string) => void;
  isDark: boolean;
  activeCursorsRef?: { current: { [cellKey: string]: string } };
  handleCellFocus?: (staffId: string, field: string) => void;
  handleCellBlur?: () => void;
}

const defaultCursorsRef = { current: {} as { [cellKey: string]: string } };

export const getColumns = ({
  handleFieldChange,
  deleteStaff,
  isDark,
  activeCursorsRef = defaultCursorsRef,
  handleCellFocus,
  handleCellBlur,
}: ColumnProps): ColumnDef<StaffRow>[] => {
  const headerTextClass =
    'font-bold text-[11px] tracking-wide ' + (isDark ? 'text-slate-400' : 'text-slate-500');

  const inputCls = cn(
    'h-10 px-3 font-semibold text-[13px] border-none focus:ring-0 bg-transparent transition-all rounded-none w-full',
    isDark ? 'text-white placeholder:text-slate-700' : 'text-slate-900 placeholder:text-slate-300'
  );

  return [
    {
      id: 'serial',
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className={cn('font-black tracking-widest text-[10px]', isDark ? 'text-slate-200' : 'text-slate-800')}>
            #
          </span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full h-10">
          <span className={cn('font-black text-[11px] tracking-tighter opacity-30', isDark ? 'text-slate-400' : 'text-slate-600')}>
            {(row.index + 1).toString().padStart(2, '0')}
          </span>
        </div>
      ),
      size: 36,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>Staff Name</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeInput
          value={row.original.name}
          placeholder=""
          onChange={(e) => handleFieldChange(row.original.id, 'name', e.target.value)}
          onFocus={() => handleCellFocus?.(row.original.id, 'name')}
          onBlur={() => handleCellBlur?.()}
          className={inputCls}
          staffId={row.original.id}
          fieldName="name"
          activeCursorsRef={activeCursorsRef}
        />
      ),
      meta: { isEditable: true },
      size: 220,
    },
    {
      accessorKey: 'title',
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>Title</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeInput
          value={row.original.title}
          placeholder=""
          onChange={(e) => handleFieldChange(row.original.id, 'title', e.target.value)}
          onFocus={() => handleCellFocus?.(row.original.id, 'title')}
          onBlur={() => handleCellBlur?.()}
          className={inputCls}
          staffId={row.original.id}
          fieldName="title"
          activeCursorsRef={activeCursorsRef}
        />
      ),
      meta: { isEditable: true },
      size: 160,
    },
    {
      accessorKey: 'email',
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>Email</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeInput
          type="email"
          value={row.original.email}
          placeholder=""
          onChange={(e) => handleFieldChange(row.original.id, 'email', e.target.value)}
          onFocus={() => handleCellFocus?.(row.original.id, 'email')}
          onBlur={() => handleCellBlur?.()}
          className={inputCls}
          staffId={row.original.id}
          fieldName="email"
          activeCursorsRef={activeCursorsRef}
        />
      ),
      meta: { isEditable: true },
      size: 260,
    },
    {
      accessorKey: 'cell',
      header: () => (
        <div className="flex items-center">
          <span className={headerTextClass}>Phone Number (optional)</span>
        </div>
      ),
      cell: ({ row }) => (
        <CollaborativeInput
          type="tel"
          value={row.original.cell}
          placeholder=""
          onChange={(e) => handleFieldChange(row.original.id, 'cell', e.target.value)}
          onFocus={() => handleCellFocus?.(row.original.id, 'cell')}
          onBlur={() => handleCellBlur?.()}
          className={inputCls}
          staffId={row.original.id}
          fieldName="cell"
          activeCursorsRef={activeCursorsRef}
        />
      ),
      meta: { isEditable: true },
      size: 200,
    },
    {
      id: 'status',
      header: () => (
        <div className="flex items-center justify-center">
          <span className={headerTextClass}>Complete</span>
        </div>
      ),
      cell: ({ row }) => {
        const { sync_status, name, title, email, cell } = row.original;
        const requiredFields = [name, title, email];
        const allFields = [name, title, email, cell];
        const hasAnyData = allFields.some((f) => f !== '' && f !== null && f !== undefined);
        const isAllFilled = requiredFields.every((f) => f !== '' && f !== null && f !== undefined);

        return (
          <div className="flex items-center justify-center h-10">
            {sync_status === 'saving' ? (
              <div className={cn('p-1.5 rounded-full', isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')}>
                <Loader2 size={14} className="animate-spin" />
              </div>
            ) : sync_status === 'error' || (hasAnyData && !isAllFilled) ? (
              <div className={cn('p-1.5 rounded-full', isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')}>
                <AlertCircle size={14} />
              </div>
            ) : isAllFilled ? (
              <div className={cn('p-1.5 rounded-full', isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}>
                <Check size={14} />
              </div>
            ) : null}
          </div>
        );
      },
      size: 65,
    },
    {
      id: 'actions',
      header: () => (
        <div className="flex items-center justify-center">
          <span className={headerTextClass}>Delete</span>
        </div>
      ),
      cell: ({ row }) => {
        const { name, title, email, cell } = row.original;
        const hasAnyData = [name, title, email, cell].some((f) => f !== '' && f !== null && f !== undefined);
        if (!hasAnyData) return <div className="h-10 w-full" />;
        return (
          <div className="h-full w-full relative min-h-[40px]">
            <button
              onClick={() => deleteStaff(row.original.id)}
              className={cn(
                'absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-300 group/delete',
                isDark ? 'text-rose-400 hover:bg-rose-900/10' : 'text-rose-500 hover:bg-rose-50/50'
              )}
            >
              <Trash2 size={18} className="transition-all duration-300 group-hover/delete:scale-110" />
            </button>
          </div>
        );
      },
      size: 65,
    },
  ];
};
