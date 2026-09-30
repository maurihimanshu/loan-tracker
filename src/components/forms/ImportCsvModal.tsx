import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { parseAndValidateCsv, CsvImportResult } from '../../services/csv';
import { readCsvFromFileObject } from '../../services/filesystem';
import { Upload, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ExportDataPayload } from '../../services/csv';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitImport: (data: ExportDataPayload) => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onCommitImport,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);
    setImportResult(null);

    try {
      const text = await readCsvFromFileObject(file);
      const result = parseAndValidateCsv(text);
      setImportResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportResult({
        success: false,
        summary: { loansCount: 0, eventsCount: 0, rulesCount: 0, overridesCount: 0, scenariosCount: 0 },
        warnings: [],
        errors: [`Failed to read file: ${msg}`],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommit = () => {
    if (importResult?.success && importResult.data) {
      onCommitImport(importResult.data);
      onClose();
      // Reset state
      setSelectedFile(null);
      setImportResult(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import Loan Data from CSV"
      description="Select a standardized loan tracking CSV file to restore or import loan records"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* File drop / select area */}
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            id="csv-file-input"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="csv-file-input"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="p-3 bg-primary/10 rounded-full text-primary mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {selectedFile ? selectedFile.name : 'Choose a CSV file to inspect'}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Supports CSV files adhering to Schema Version 1
            </span>
          </label>
        </div>

        {isProcessing && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Parsing and validating records...
          </div>
        )}

        {/* Validation and Preview Report */}
        {importResult && (
          <div className="space-y-4 animate-in fade-in">
            {importResult.success ? (
              <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validation Passed — Ready to Import</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="bg-card p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-[11px]">Loans</span>
                    <span className="font-bold text-foreground">
                      {importResult.summary.loansCount}
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-[11px]">Payments</span>
                    <span className="font-bold text-foreground">
                      {importResult.summary.eventsCount}
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-[11px]">Recurring Rules</span>
                    <span className="font-bold text-foreground">
                      {importResult.summary.rulesCount}
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-[11px]">Overrides</span>
                    <span className="font-bold text-foreground">
                      {importResult.summary.overridesCount}
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded border border-border">
                    <span className="text-muted-foreground block text-[11px]">Scenarios</span>
                    <span className="font-bold text-foreground">
                      {importResult.summary.scenariosCount}
                    </span>
                  </div>
                </div>

                {importResult.warnings.length > 0 && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                    <div className="font-semibold flex items-center space-x-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{importResult.warnings.length} Warnings:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                      {importResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2">
                <div className="flex items-center space-x-2 text-destructive font-semibold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Import Validation Failed ({importResult.errors.length} errors)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The file cannot be committed because it violates schema invariants:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-destructive max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!importResult?.success}
            onClick={handleCommit}
          >
            Commit Import
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
