import React from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  selectLoans,
  selectActiveLoan,
  selectFileState,
  selectTheme,
  selectAsOfDate,
  selectFullExportPayload,
} from '../../app/selectors';
import { setActiveLoan } from '../../features/loans/loanSlice';
import { openLoanSetup, setTheme, setAsOfDate } from '../../features/ui/uiSlice';
import { Button } from '../ui/Button';
import {
  Building2,
  Plus,
  Save,
  Upload,
  Sun,
  Moon,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  saveCsvAsWithPicker,
  triggerCsvDownload,
} from '../../services/filesystem';
import { serializeToCsv } from '../../services/csv';
import { markFileSaved, setSaveError } from '../../features/fileManagement/fileSlice';

interface NavbarProps {
  onOpenImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenImport }) => {
  const dispatch = useAppDispatch();
  const loans = useAppSelector(selectLoans);
  const activeLoan = useAppSelector(selectActiveLoan);
  const fileState = useAppSelector(selectFileState);
  const currentTheme = useAppSelector(selectTheme);
  const asOfDate = useAppSelector(selectAsOfDate);
  const exportPayload = useAppSelector(selectFullExportPayload);

  const toggleTheme = () => {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    dispatch(setTheme(next));
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleQuickSave = async () => {
    try {
      const csvData = serializeToCsv(exportPayload);

      if (isFileSystemAccessSupported()) {
        const result = await saveCsvAsWithPicker(csvData, fileState.currentFileName || 'loan-data.csv');
        if (result.success) {
          dispatch(markFileSaved({ fileName: result.filename }));
        }
      } else {
        triggerCsvDownload(csvData, fileState.currentFileName || 'loan-data.csv');
        dispatch(markFileSaved({ fileName: 'loan-data.csv' }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        dispatch(setSaveError(err.message));
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand & Loan Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:inline-block">
              LoanTracker
            </span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Loan Switcher Dropdown */}
          {loans.length > 0 ? (
            <div className="flex items-center space-x-1.5">
              <select
                value={activeLoan?.id ?? ''}
                onChange={(e) => dispatch(setActiveLoan(e.target.value))}
                className="h-8 max-w-[180px] sm:max-w-[240px] truncate rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.name}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dispatch(openLoanSetup(null))}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Create another loan"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatch(openLoanSetup(null))}
              className="h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Loan
            </Button>
          )}
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* As-Of Date Filter */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border">
            <Clock className="w-3.5 h-3.5" />
            <span>As Of:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => dispatch(setAsOfDate(e.target.value))}
              className="h-6 bg-transparent text-xs font-mono text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          {/* Persistence / Save status indicator (Section 29) */}
          <div className="hidden md:flex items-center space-x-1.5 text-[11px]">
            {fileState.hasUnsavedChanges ? (
              <span className="flex items-center text-amber-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                Unsaved changes
              </span>
            ) : fileState.currentFileName ? (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {fileState.currentFileName}
              </span>
            ) : (
              <span className="flex items-center text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Browser backup
              </span>
            )}
          </div>

          {/* File Operations */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickSave}
            className="h-8 text-xs"
            title="Save loan data to CSV"
          >
            <Save className="w-3.5 h-3.5 mr-1 text-primary" />
            <span className="hidden sm:inline">Save CSV</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenImport}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            title="Import from CSV"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Import</span>
          </Button>

          {/* Theme switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Toggle color theme"
          >
            {currentTheme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
