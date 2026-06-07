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
import { useVirtualizer } from "@tanstack/react-virtual"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Settings2 } from "lucide-react"
import { getThemeClasses, type BgFlavor } from "@/lib/theme"

// Fixed row height — must match the h-10 (40px) on TableRow
const ROW_HEIGHT = 40;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isDark?: boolean;
  bgFlavor?: BgFlavor;
  toolbar?: React.ReactNode;
  refineGridlines?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isDark = false,
  bgFlavor = 'slate',
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

  const { rows } = table.getRowModel()

  // Ref for the scrollable container
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Virtualizer — renders only the visible rows + a small overscan buffer
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15, // render 15 extra rows above/below viewport for smooth scrolling
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalHeight = virtualizer.getTotalSize()

  // Padding spacers so the scrollbar size is correct
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalHeight - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0

  const theme = getThemeClasses(isDark, bgFlavor);

  const themeStyles = {
    wrapperBorder: theme.cardBorder,
    tableBorder: refineGridlines
      ? theme.borderLight
      : theme.border,
    headerBorder: refineGridlines
      ? theme.borderLight
      : theme.border,
    headBg: theme.tableHeadBg,
    rowBorder: refineGridlines
      ? theme.borderLight
      : theme.border,
    cellBorder: theme.border,
  };

  return (
    <div className={cn(
      "rounded-[1.25rem] border overflow-hidden relative flex flex-col flex-1 min-h-0 transition-colors duration-700",
      themeStyles.wrapperBorder,
      theme.cardBg,
      isDark
        ? "shadow-2xl shadow-black/40"
        : "shadow-xl shadow-slate-200/40"
    )}>
      {/* Unified Toolbar */}
      {toolbar && (
        <div className={cn(
          "p-3 md:p-4 border-b shrink-0 transition-colors duration-700",
          themeStyles.headerBorder,
          isDark ? "bg-white/[0.02]" : "bg-slate-50/30"
        )}>
          {toolbar}
        </div>
      )}

      {/* Scrollable container — virtualizer watches this element */}
      <div
        ref={scrollRef}
        className={cn("flex-1 overflow-auto min-h-0 border-r", themeStyles.tableBorder)}
        style={{ contain: "strict" }}
      >
        <Table className="border-collapse" wrapperClassName="overflow-visible" style={{ width: "100%" }}>
          {/* Sticky header stays outside the virtualizer */}
          <TableHeader className="sticky top-0 z-40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={cn("border-b", themeStyles.headerBorder)}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.column.getSize(),
                      minWidth: header.column.getSize(),
                      maxWidth: header.column.getSize(),
                    }}
                    className={cn(
                      "font-semibold text-[13px] border-r last:border-r-0 overflow-hidden sticky top-0 z-30",
                      header.id.startsWith("lab-") ? "py-1.5 px-1.5" : "py-3 px-4",
                      header.id === "serial" && "px-0",
                      themeStyles.headBg
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className={cn("p-4 rounded-[1.5rem]", isDark ? "bg-white/5" : "bg-slate-50")}>
                      <Settings2 size={32} className="text-slate-400 animate-spin-slow" />
                    </div>
                    <p className="text-slate-500 font-bold italic text-sm">No matching students discovered.</p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Top spacer — fills the space above visible rows */}
                {paddingTop > 0 && (
                  <tr style={{ height: paddingTop }}>
                    <td colSpan={columns.length} />
                  </tr>
                )}

                {/* Only visible rows are rendered here */}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  if (!row) return null
                  return (
                    <tr
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={cn(
                        "h-10 border-b group transition-colors duration-500",
                        isDark
                          ? `hover:${theme.rowHover} data-[state=selected]:bg-white/[0.05]`
                          : `hover:${theme.rowHover} data-[state=selected]:bg-slate-50/70`,
                        virtualRow.index % 2 === 1 && theme.rowOdd,
                        themeStyles.rowBorder
                      )}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                          }}
                          className={cn(
                            "p-0 border-r last:border-r-0 relative overflow-hidden",
                            (cell.column.columnDef.meta as any)?.isEditable && [
                              "hover:ring-1 hover:ring-inset hover:ring-sky-400/30 hover:z-20 hover:bg-sky-400/[0.02]",
                              "focus-within:ring-2 focus-within:ring-inset focus-within:ring-sky-400 focus-within:z-30 focus-within:bg-sky-400/[0.05]"
                            ],
                            themeStyles.cellBorder
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })}

                {/* Bottom spacer — fills the space below visible rows */}
                {paddingBottom > 0 && (
                  <tr style={{ height: paddingBottom }}>
                    <td colSpan={columns.length} />
                  </tr>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
