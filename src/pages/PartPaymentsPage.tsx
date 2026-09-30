import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  selectActiveLoan,
  selectActiveLoanRules,
  selectActiveLoanOverrides,
} from '../app/selectors';
import {
  addRule,
  updateRule,
  deleteRule,
  addOverride,
  deleteOverride,
} from '../features/partPayments/partPaymentSlice';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PercentageInput } from '../components/ui/PercentageInput';
import { DateInput } from '../components/ui/DateInput';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import {
  PartPaymentRule,
  PartPaymentOverride,
  PartPaymentFrequency,
  PartPaymentAmountType,
  RepaymentMode,
} from '../domain/loan/types';
import { formatINR, rupeesToPaise } from '../domain/loan/money';
import { formatDisplayDate, todayLocalDate } from '../domain/loan/dates';
import {
  Zap,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const PartPaymentsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeLoan = useAppSelector(selectActiveLoan);
  const rules = useAppSelector(selectActiveLoanRules);
  const overrides = useAppSelector(selectActiveLoanOverrides);

  // Rule Modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PartPaymentRule | null>(null);
  const [ruleFrequency, setRuleFrequency] = useState<PartPaymentFrequency>('MONTHLY');
  const [ruleAmountType, setRuleAmountType] = useState<PartPaymentAmountType>('FIXED');
  const [ruleAmount, setRuleAmount] = useState<number>(25000); // rupees or percentage
  const [ruleStartDate, setRuleStartDate] = useState<string>(todayLocalDate());
  const [ruleEndDate, setRuleEndDate] = useState<string>('');
  const [ruleTreatment, setRuleTreatment] = useState<RepaymentMode>('REDUCE_TENURE');
  const [ruleNotes, setRuleNotes] = useState<string>('');

  // Override Modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string>(todayLocalDate());
  const [overrideAmount, setOverrideAmount] = useState<number>(50000);
  const [overrideCancelled, setOverrideCancelled] = useState<boolean>(false);
  const [overrideNotes, setOverrideNotes] = useState<string>('');

  const [itemToDelete, setItemToDelete] = useState<{
    type: 'rule' | 'override';
    id: string;
  } | null>(null);

  const handleOpenAddRule = () => {
    setEditingRule(null);
    setRuleFrequency('MONTHLY');
    setRuleAmountType('FIXED');
    setRuleAmount(25000);
    setRuleStartDate(todayLocalDate());
    setRuleEndDate('');
    setRuleTreatment(activeLoan?.repaymentMode ?? 'REDUCE_TENURE');
    setRuleNotes('');
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = () => {
    if (!activeLoan) return;

    const amountPaiseOrPct =
      ruleAmountType === 'FIXED' ? rupeesToPaise(ruleAmount) : ruleAmount;

    const rulePayload: PartPaymentRule = {
      id: editingRule ? editingRule.id : `rule-${Date.now()}`,
      loanId: activeLoan.id,
      frequency: ruleFrequency,
      amountType: ruleAmountType,
      amount: amountPaiseOrPct,
      startDate: ruleStartDate,
      endDate: ruleEndDate ? ruleEndDate : undefined,
      treatment: ruleTreatment,
      status: 'ACTIVE',
      notes: ruleNotes || undefined,
      createdAt: editingRule ? editingRule.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingRule) {
      dispatch(updateRule(rulePayload));
    } else {
      dispatch(addRule(rulePayload));
    }
    setIsRuleModalOpen(false);
  };

  const handleOpenAddOverride = () => {
    setOverrideDate(todayLocalDate());
    setOverrideAmount(50000);
    setOverrideCancelled(false);
    setOverrideNotes('');
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverride = () => {
    if (!activeLoan) return;

    const overridePayload: PartPaymentOverride = {
      id: `ov-${Date.now()}`,
      loanId: activeLoan.id,
      date: overrideDate,
      amount: overrideCancelled ? 0 : rupeesToPaise(overrideAmount),
      cancelled: overrideCancelled,
      notes: overrideNotes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(addOverride(overridePayload));
    setIsOverrideModalOpen(false);
  };

  if (!activeLoan) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={<Zap className="w-8 h-8" />}
          title="No active loan selected"
          description="Select or create a loan to manage part-payment strategies."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Part-Payment Rules & Overrides
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure automated recurring prepayment rules and month-specific overrides
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleOpenAddOverride} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Monthly Override
          </Button>
          <Button size="sm" onClick={handleOpenAddRule} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Recurring Rule
          </Button>
        </div>
      </div>

      {/* Precedence Notice Card (Section 12 & 21) */}
      <div className="p-3.5 rounded-lg border border-border bg-muted/30 text-xs flex items-start space-x-3">
        <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-foreground">
            Deterministic Precedence Resolution:
          </span>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            When multiple conditions coincide on a payment date, the engine resolves payments in strict priority order:
            <br />
            <strong>1. Cancellation Override (₹0)</strong> &gt;{' '}
            <strong>2. Specific Monthly Override Amount</strong> &gt;{' '}
            <strong>3. One-Time Payment Record</strong> &gt;{' '}
            <strong>4. Recurring Rule</strong> &gt;{' '}
            <strong>5. No Extra Payment</strong>
          </p>
        </div>
      </div>

      {/* Section 1: Recurring Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center space-x-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>Active Recurring Rules ({rules.length})</span>
          </h2>
        </div>

        {rules.length === 0 ? (
          <EmptyState
            icon={<Zap className="w-6 h-6" />}
            title="No recurring prepayment rules"
            description="Create a recurring rule (such as ₹25,000 monthly or 10% annual bonus) to automatically simulate prepayments across your amortization schedule."
            actionLabel="Add Recurring Rule"
            onAction={handleOpenAddRule}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {rule.frequency}
                      </span>
                      <div className="text-base font-bold text-foreground mt-2">
                        {rule.amountType === 'PERCENTAGE'
                          ? `${rule.amount}% of balance`
                          : formatINR(rule.amount)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setItemToDelete({ type: 'rule', id: rule.id })}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs pt-0">
                  <div className="py-2 border-t border-border space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Starts:</span>
                      <span className="font-medium">{formatDisplayDate(rule.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ends:</span>
                      <span className="font-medium">
                        {rule.endDate ? formatDisplayDate(rule.endDate) : 'Until loan closure'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode:</span>
                      <span className="font-medium">
                        {rule.treatment === 'REDUCE_TENURE' ? 'Reduce Tenure' : 'Reduce EMI'}
                      </span>
                    </div>
                  </div>
                  {rule.notes && (
                    <p className="text-[11px] text-muted-foreground italic truncate">
                      "{rule.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Individual Monthly Overrides */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Individual Month Overrides ({overrides.length})</span>
          </h2>
        </div>

        {overrides.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No specific monthly overrides defined. You can override individual months (e.g. skip December or increase Diwali month) without changing the entire recurring rule.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {overrides.map((ov) => (
              <Card key={ov.id} className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {formatDisplayDate(ov.date)}
                    </span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {ov.cancelled ? 'Cancelled (₹0)' : formatINR(ov.amount)}
                    </span>
                    {ov.notes && (
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[150px]">
                        {ov.notes}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItemToDelete({ type: 'override', id: ov.id })}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Recurring Rule Dialog */}
      <Dialog
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? 'Edit Recurring Rule' : 'New Recurring Part-Payment Rule'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Repayment Frequency
              </label>
              <select
                value={ruleFrequency}
                onChange={(e) => setRuleFrequency(e.target.value as PartPaymentFrequency)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly (Every 3 months)</option>
                <option value="YEARLY">Yearly (Annual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Amount Type
              </label>
              <select
                value={ruleAmountType}
                onChange={(e) => setRuleAmountType(e.target.value as PartPaymentAmountType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="FIXED">Fixed Amount (₹)</option>
                <option value="PERCENTAGE">Percentage of Balance (%)</option>
              </select>
            </div>
          </div>

          {ruleAmountType === 'FIXED' ? (
            <MoneyInput
              label="Prepayment Amount (₹)"
              value={ruleAmount}
              onChange={setRuleAmount}
            />
          ) : (
            <PercentageInput
              label="Percentage of Current Balance (%)"
              value={ruleAmount}
              onChange={setRuleAmount}
              max={100}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="Rule Start Date"
              value={ruleStartDate}
              onChange={setRuleStartDate}
            />
            <DateInput
              label="End Date (Optional)"
              value={ruleEndDate}
              onChange={setRuleEndDate}
              helperText="Leave empty for indefinite"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Repayment Treatment
            </label>
            <select
              value={ruleTreatment}
              onChange={(e) => setRuleTreatment(e.target.value as RepaymentMode)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="REDUCE_TENURE">Reduce Tenure (Keep EMI constant)</option>
              <option value="REDUCE_EMI">Reduce EMI (Maintain tenure)</option>
            </select>
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Annual company bonus"
            value={ruleNotes}
            onChange={(e) => setRuleNotes(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveRule}>
              Save Rule
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Override Dialog */}
      <Dialog
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Add Monthly Prepayment Override"
        maxWidth="md"
      >
        <div className="space-y-4">
          <DateInput
            label="Month / Date to Override"
            value={overrideDate}
            onChange={setOverrideDate}
          />

          <div className="flex items-center space-x-2 py-1">
            <input
              type="checkbox"
              id="cancel-checkbox"
              checked={overrideCancelled}
              onChange={(e) => setOverrideCancelled(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <label htmlFor="cancel-checkbox" className="text-xs font-medium text-foreground cursor-pointer">
              Cancel payment in this month (₹0 prepayment)
            </label>
          </div>

          {!overrideCancelled && (
            <MoneyInput
              label="Override Prepayment Amount (₹)"
              value={overrideAmount}
              onChange={setOverrideAmount}
              helperText="Replaces any recurring payment rule for this specific month"
            />
          )}

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Higher prepayment in festive month"
            value={overrideNotes}
            onChange={(e) => setOverrideNotes(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveOverride}>
              Save Override
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete?.type === 'rule') {
            dispatch(deleteRule(itemToDelete.id));
          } else if (itemToDelete?.type === 'override') {
            dispatch(deleteOverride(itemToDelete.id));
          }
          setItemToDelete(null);
        }}
        title={`Delete ${itemToDelete?.type === 'rule' ? 'Recurring Rule' : 'Override'}`}
        message="Are you sure you want to remove this prepayment rule? The schedule will automatically recalculate without it."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
};
