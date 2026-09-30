import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectLoans, selectActiveLoanId } from '../app/selectors';
import { deleteLoan, setActiveLoan } from '../features/loans/loanSlice';
import { openLoanSetup, setActiveTab } from '../features/ui/uiSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { formatINR } from '../domain/loan/money';
import { formatDisplayDate } from '../domain/loan/dates';
import { Building2, Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';

export const LoansPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const loans = useAppSelector(selectLoans);
  const activeLoanId = useAppSelector(selectActiveLoanId);

  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Loan Portfolio Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure, manage, and switch between your tracked loans
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => dispatch(openLoanSetup(null))}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create New Loan
        </Button>
      </div>

      {loans.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="No loans configured"
          description="Create your first loan to begin tracking amortizations and interest savings."
          actionLabel="Create Loan"
          onAction={() => dispatch(openLoanSetup(null))}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loans.map((loan) => {
            const isActive = loan.id === activeLoanId;

            return (
              <Card
                key={loan.id}
                className={`relative flex flex-col justify-between transition-all ${
                  isActive
                    ? 'border-primary ring-1 ring-primary/30 shadow-md'
                    : 'hover:border-border/80'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <CardTitle className="text-base font-bold">
                          {loan.name}
                        </CardTitle>
                        {isActive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sanctioned on {formatDisplayDate(loan.startDate)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dispatch(openLoanSetup(loan.id))}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Edit loan parameters"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLoanToDelete(loan.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete loan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Principal</span>
                      <span className="font-bold text-foreground">
                        {formatINR(loan.originalPrincipal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Interest Rate</span>
                      <span className="font-bold text-foreground">
                        {loan.annualInterestRate}% p.a.
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Tenure</span>
                      <span className="font-medium text-foreground">
                        {loan.originalTenureMonths} months ({Math.floor(loan.originalTenureMonths / 12)}y)
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Repayment Mode</span>
                      <span className="font-medium text-foreground">
                        {loan.repaymentMode === 'REDUCE_TENURE' ? 'Reduce Tenure' : 'Reduce EMI'}
                      </span>
                    </div>
                  </div>

                  {loan.notes && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      "{loan.notes}"
                    </p>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    {!isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dispatch(setActiveLoan(loan.id))}
                        className="w-full text-xs"
                      >
                        Switch to this Loan
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => dispatch(setActiveTab('dashboard'))}
                        className="w-full text-xs"
                      >
                        View Analytics Dashboard
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Deleting Loan */}
      <ConfirmDialog
        isOpen={Boolean(loanToDelete)}
        onClose={() => setLoanToDelete(null)}
        onConfirm={() => {
          if (loanToDelete) {
            dispatch(deleteLoan(loanToDelete));
            setLoanToDelete(null);
          }
        }}
        title="Delete Loan Confirmation"
        message="Are you sure you want to delete this loan? All recorded actual payments, recurring part-payment rules, overrides, and scenarios associated with this loan will be permanently removed."
        confirmLabel="Delete Loan"
        variant="destructive"
      />
    </div>
  );
};
