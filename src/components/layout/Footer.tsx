import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-card/40 mt-auto py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Local-First & Private:</strong> All loan data is processed and stored locally on your device. No cloud database or tracking.
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-center md:text-right">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
          <span>
            Financial calculation model v1.0. Figures are projected estimates; verify against your lender's official statement.
          </span>
        </div>
      </div>
    </footer>
  );
};

