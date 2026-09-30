import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectTheme, selectFullExportPayload } from '../app/selectors';
import { setTheme } from '../features/ui/uiSlice';
import { resetLoans } from '../features/loans/loanSlice';
import { resetPayments } from '../features/payments/paymentSlice';
import { resetPartPayments } from '../features/partPayments/partPaymentSlice';
import { resetScenarios } from '../features/scenarios/scenarioSlice';
import { resetFileState } from '../features/fileManagement/fileSlice';
import { clearLocalStorage } from '../services/persistence';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FCC_VERSION } from '../domain/loan/types';
import {
  Sun,
  Moon,
  Laptop,
  Trash2,
  Shield,
  Download,
  Upload,
} from 'lucide-react';
import { serializeToCsv } from '../services/csv';
import { triggerCsvDownload } from '../services/filesystem';

interface SettingsPageProps {
  onOpenImport: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenImport }) => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const exportPayload = useAppSelector(selectFullExportPayload);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(newTheme));
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleExportBackup = () => {
    const csv = serializeToCsv(exportPayload);
    triggerCsvDownload(csv, `loan-tracker-backup-${Date.now()}.csv`);
  };

  const handleResetAllData = () => {
    clearLocalStorage();
    dispatch(resetLoans());
    dispatch(resetPayments());
    dispatch(resetPartPayments());
    dispatch(resetScenarios());
    dispatch(resetFileState());
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 animate-in fade-in">
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Application Settings & Preferences
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure appearance, local storage backups, and view financial calculation standards
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme & Display */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle>Appearance & Theme</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Interface Color Scheme
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    theme === 'light'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange('system')}
                  className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    theme === 'system'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-xs text-muted-foreground block">
                Currency: <strong>Indian Rupee (INR - ₹)</strong> using Indian numbering format (Lakhs / Crores).
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Local Storage & File Backup */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle>Local Data & Backup Management</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              Your loans are stored locally in your browser cache. Export a CSV file at any time to back up or transfer your records to another device.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleExportBackup} className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download CSV Backup
              </Button>

              <Button size="sm" variant="outline" onClick={onOpenImport} className="text-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Restore from CSV
              </Button>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-destructive block">
                  Danger Zone: Reset All Data
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Permanently deletes all loans, payment records, rules, and scenarios from browser cache.
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                className="text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Reset All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial Disclaimer & Contract Version */}
        <Card className="border-border bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle>Financial Calculation Standard</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
            <p>
              Calculation Engine Contract: <strong>Version {FCC_VERSION}</strong> (Deterministic HALF_UP paise precision, Monthly Reducing Balance, Actual/365 broken-period day counting).
            </p>
            <div className="p-3 bg-card border border-border rounded-lg text-[11px] leading-relaxed">
              <strong>Official Disclaimer:</strong> This application provides calculations and projections for tracking and planning purposes only. Actual loan calculations, interest, prepayment treatment, fees, taxes, dates, and outstanding balances may differ from those applied by your lender. Verify important figures against your lender's official statement.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetAllData}
        title="Reset All Application Data"
        message="Are you sure you want to permanently erase all local loans, payment records, and prepayment rules? This action cannot be undone."
        confirmLabel="Erase Everything"
        variant="destructive"
      />
    </div>
  );
};
