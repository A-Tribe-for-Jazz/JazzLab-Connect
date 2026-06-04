"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Settings2 } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isDark?: boolean;
  toolbar?: React.ReactNode;
  refineGridlines?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isDark = false,
  toolbar,
  refineGridlines = false
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const themeStyles = {
    wrapperBorder: isDark ? "border-white/10" : "border-slate-200",
    tableBorder: refineGridlines
      ? (isDark ? "border-white/5" : "border-slate-100")
      : (isDark ? "border-white/20" : "border-slate-300"),
    headerBorder: refineGridlines
      ? (isDark ? "border-white/5" : "border-slate-200")
      : (isDark ? "border-white/10" : "border-slate-300"),
    headBg: isDark ? "bg-slate-950 text-slate-200 border-white/20 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.1)]" : "bg-slate-100 text-slate-800 border-slate-300 shadow-[inset_0_-1px_0_0_#cbd5e1]",
    rowBorder: refineGridlines
      ? (isDark ? "border-white/5" : "border-slate-100")
      : (isDark ? "border-white/10" : "border-slate-200")
  };

  return (
    <div className={cn(
        "rounded-[1.25rem] border transition-colors duration-700 overflow-hidden relative flex flex-col flex-1 min-h-0",
        themeStyles.wrapperBorder,
        isDark 
          ? "bg-[#020617] shadow-2xl shadow-black/40" 
          : "bg-white shadow-xl shadow-slate-200/40"
      )}>
        {/* Unified Toolbar */}
        {toolbar && (
          <div className={cn(
            "p-3 md:p-4 border-b",
            isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/30"
          )}>
            {toolbar}
          </div>
        )}

        {/* Scrollable table area — toolbar above stays fixed, thead sticks to top of scroll */}
        <Table wrapperClassName={cn("flex-1 overflow-auto min-h-0 border-r", themeStyles.tableBorder)} className="border-collapse">
          <TableHeader className="sticky top-0 z-40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={cn(
                "border-b transition-colors duration-700",
                themeStyles.headerBorder
              )}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      style={{ 
                        width: header.column.getSize(),
                        minWidth: header.column.getSize(),
                        maxWidth: header.column.getSize()
                      }} 
                      className={cn(
                        "font-semibold text-[13px] transition-colors duration-700 border-r last:border-r-0 overflow-hidden",
                        header.id.startsWith("lab-") ? "py-1.5 px-1.5" : "py-3 px-4",
                        header.id === "serial" && "px-0",
                        themeStyles.headBg
                      )}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "h-10 border-b transition-colors duration-300 group",
                    isDark 
                      ? "hover:bg-white/[0.02] data-[state=selected]:bg-white/[0.05]"
                      : "hover:bg-slate-50/30 data-[state=selected]:bg-slate-50/50",
                    index % 2 === 1 && (isDark ? "bg-white/[0.015]" : "bg-slate-50/40"),
                    themeStyles.rowBorder
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      style={{ 
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                        maxWidth: cell.column.getSize()
                      }} 
                      className={cn(
                        "p-0 transition-colors duration-150 border-r last:border-r-0 relative overflow-hidden",
                        (cell.column.columnDef.meta as any)?.isEditable && [
                          "hover:ring-1 hover:ring-inset hover:ring-sky-400/30 hover:z-20 hover:bg-sky-400/[0.02]",
                          "focus-within:ring-2 focus-within:ring-inset focus-within:ring-sky-400 focus-within:z-30 focus-within:bg-sky-400/[0.05]"
                        ],
                        themeStyles.tableBorder
                      )}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : null}

            {(!table.getRowModel().rows?.length) && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className={cn(
                      "p-4 rounded-[1.5rem]",
                      isDark ? "bg-white/5" : "bg-slate-50"
                    )}>
                      <Settings2 size={32} className="text-slate-400 animate-spin-slow" />
                    </div>
                    <p className="text-slate-500 font-bold italic text-sm">No matching students discovered.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  )
}
