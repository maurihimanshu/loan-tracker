import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { AmortizationRow } from '../../domain/loan/types';
import { formatINR, paiseToRupees } from '../../domain/loan/money';
import { formatDisplayDate } from '../../domain/loan/dates';
import { StatusBadge, FinancialStatus } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { triggerCsvDownload } from '../../services/filesystem';

interface AmortizationTableProps {
  schedule: AmortizationRow[];
  loanName?: string;
  className?: string;
}

export const AmortizationTable: React.FC<AmortizationTableProps> = ({
  schedule,
  loanName = 'Loan',
  className,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(12);
  const [expandedMobileRow, setExpandedMobileRow] = useState<number | null>(null);

  const columns = useMemo<ColumnDef<AmortizationRow>[]>(
    () => [
      {
        accessorKey: 'periodNumber',
        header: ({ column }) => (
          <button
            className="flex items-center space-x-1 hover:text-foreground cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>Period</span>
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          </button>
        ),
        cell: (info) => {
          const val = info.getValue() as number;
          return (
            <span
              className={`font-mono text-xs font-semibold ${
                val === 0
                  ? 'px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                  : ''
              }`}
              title={val === 0 ? 'Pre-EMI Broken Period' : `Period #${val}`}
            >
              {val === 0 ? 'BP' : `#${val}`}
            </span>
          );
        },
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <button
            className="flex items-center space-x-1 hover:text-foreground cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>Date</span>
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          </button>
        ),
        cell: (info) => (
          <span className="font-medium text-xs">
            {formatDisplayDate(info.getValue() as string)}
          </span>
        ),
      },
      {
        accessorKey: 'openingBalance',
        header: 'Opening Balance',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatINR(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'scheduledEmi',
        header: 'EMI',
        cell: (info) => (
          <span className="font-mono text-xs font-medium text-foreground">
            {formatINR(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'interest',
        header: 'Interest',
        cell: (info) => (
          <span className="font-mono text-xs text-rose-600 dark:text-rose-400">
            {formatINR(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'scheduledPrincipal',
        header: 'Principal',
        cell: (info) => (
          <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
            {formatINR(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'partPayment',
        header: 'Part Payment',
        cell: (info) => {
          const val = info.getValue() as number;
          return val > 0 ? (
            <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              +{formatINR(val)}
            </span>
          ) : (
            <span className="text-muted-foreground/40 text-xs">-</span>
          );
        },
      },
      {
        accessorKey: 'totalPayment',
        header: 'Total Payment',
        cell: (info) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {formatINR(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'closingBalance',
        header: 'Closing Balance',
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            {formatINR(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => (
          <StatusBadge status={info.getValue() as FinancialStatus} />
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: schedule,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 12,
      },
    },
  });

  const handleExportSchedule = () => {
    const csvHeader =
      'Period,Date,Opening Balance,Scheduled EMI,Interest,Principal,Part Payment,Total Payment,Closing Balance,Status';
    const csvLines = schedule.map((r) =>
      [
        r.periodNumber,
        r.date,
        paiseToRupees(r.openingBalance).toFixed(2),
        paiseToRupees(r.scheduledEmi).toFixed(2),
        paiseToRupees(r.interest).toFixed(2),
        paiseToRupees(r.scheduledPrincipal).toFixed(2),
        paiseToRupees(r.partPayment).toFixed(2),
        paiseToRupees(r.totalPayment).toFixed(2),
        paiseToRupees(r.closingBalance).toFixed(2),
        r.status,
      ].join(','),
    );
    const content = [csvHeader, ...csvLines].join('\r\n');
    triggerCsvDownload(content, `${loanName.toLowerCase().replace(/\s+/g, '-')}-schedule.csv`);
  };

  const paginatedRows = table.getRowModel().rows;

  return (
    <Card className={className}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Amortization Schedule</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {schedule.length} total payment periods
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search date or status..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-40 sm:w-56"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSchedule}
              className="h-8 text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Desktop & Tablet full table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="p-3 text-xs">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center p-8 text-muted-foreground">
                    No matching payment periods found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3 whitespace-nowrap">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Expandable Cards view (Section 24 & 90) */}
        <div className="block md:hidden divide-y divide-border">
          {paginatedRows.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No matching payment periods found.
            </div>
          ) : (
            paginatedRows.map((row) => {
              const r = row.original;
              const isExpanded = expandedMobileRow === r.periodNumber;

              return (
                <div key={row.id} className="p-4 space-y-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedMobileRow(isExpanded ? null : r.periodNumber)
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                        #{r.periodNumber}
                      </span>
                      <span className="font-medium text-sm text-foreground">
                        {formatDisplayDate(r.date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={r.status} />
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground">Total Payment:</span>{' '}
                      <span className="font-bold text-foreground">
                        {formatINR(r.totalPayment)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Closing:</span>{' '}
                      <span className="font-mono font-medium text-foreground">
                        {formatINR(r.closingBalance)}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-dashed border-border grid grid-cols-2 gap-y-2 gap-x-4 text-xs bg-muted/20 p-2.5 rounded-lg animate-in fade-in">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Opening Balance</span>
                        <span className="font-mono font-medium">{formatINR(r.openingBalance)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Scheduled EMI</span>
                        <span className="font-mono font-medium">{formatINR(r.scheduledEmi)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Interest Component</span>
                        <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                          {formatINR(r.interest)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Principal Component</span>
                        <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                          {formatINR(r.scheduledPrincipal)}
                        </span>
                      </div>
                      {r.partPayment > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">Part-Payment Applied</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatINR(r.partPayment)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-t border-border gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const s = Number(e.target.value);
                setPageSize(s);
                table.setPageSize(s);
              }}
              className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={60}>60</option>
              <option value={schedule.length}>All</option>
            </select>
            <span className="text-muted-foreground ml-2">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount() || 1}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
