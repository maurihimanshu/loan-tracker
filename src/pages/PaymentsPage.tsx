import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  selectActiveLoan,
  selectActiveLoanEvents,
} from '../app/selectors';
import {
  addEvent,
  updateEvent,
  deleteEvent,
  markEventAsActual,
} from '../features/payments/paymentSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { MoneyInput } from '../components/ui/MoneyInput';
import { DateInput } from '../components/ui/DateInput';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoanEvent, LoanEventType, PaymentStatus } from '../domain/loan/types';
import { formatINR, paiseToRupees, rupeesToPaise } from '../domain/loan/money';
import { formatDisplayDate, todayLocalDate } from '../domain/loan/dates';
import { CreditCard, Plus, Edit2, Trash2, CheckCircle2, Clock } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeLoan = useAppSelector(selectActiveLoan);
  const events = useAppSelector(selectActiveLoanEvents);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LoanEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<LoanEventType>('PART_PAYMENT');
  const [status, setStatus] = useState<PaymentStatus>('ACTUAL');
  const [amountRupees, setAmountRupees] = useState<number>(50000);
  const [date, setDate] = useState<string>(todayLocalDate());
  const [notes, setNotes] = useState<string>('');

  const handleOpenAdd = (
    initialType: LoanEventType = 'PART_PAYMENT',
    initialAmountRupees: number = 50000,
    initialDate: string = todayLocalDate(),
    initialNotes: string = '',
  ) => {
    setEditingEvent(null);
    setType(initialType);
    setStatus('ACTUAL');
    setAmountRupees(initialAmountRupees);
    setDate(initialDate);
    setNotes(initialNotes);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ev: LoanEvent) => {
    setEditingEvent(ev);
    setType(ev.type);
    setStatus(ev.status);
    setAmountRupees(paiseToRupees(ev.amount));
    setDate(ev.date);
    setNotes(ev.notes ?? '');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!activeLoan) return;

    const amountPaise = rupeesToPaise(amountRupees);
    const eventPayload: LoanEvent = {
      id: editingEvent ? editingEvent.id : `event-${Date.now()}`,
      loanId: activeLoan.id,
      date,
      type,
      status,
      amount: amountPaise,
      interestComponent:
        type === 'BROKEN_PERIOD_PAYMENT' ? amountPaise : editingEvent?.interestComponent,
      principalComponent:
        type === 'PART_PAYMENT'
          ? amountPaise
          : type === 'BROKEN_PERIOD_PAYMENT'
            ? 0
            : editingEvent?.principalComponent,
      source: 'USER_ENTERED',
      notes: notes || undefined,
      createdAt: editingEvent ? editingEvent.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingEvent) {
      dispatch(updateEvent(eventPayload));
    } else {
      dispatch(addEvent(eventPayload));
    }

    setIsModalOpen(false);
  };

  const renderEventTypeBadge = (eventType: LoanEventType) => {
    switch (eventType) {
      case 'BROKEN_PERIOD_PAYMENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            Broken-Period Interest
          </span>
        );
      case 'PART_PAYMENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            Part-Payment
          </span>
        );
      case 'EMI':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
            Monthly EMI
          </span>
        );
      case 'FEE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            Fee / Charge
          </span>
        );
      case 'MANUAL_ADJUSTMENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
            Adjustment
          </span>
        );
      default:
        return (
          <span className="font-semibold text-foreground">
            {(eventType as string).replaceAll('_', ' ')}
          </span>
        );
    }
  };

  if (!activeLoan) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={<CreditCard className="w-8 h-8" />}
          title="No active loan selected"
          description="Select or create a loan to record payments."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Payment & Transaction Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record actual statement repayments, pre-EMI broken-period interest, ad-hoc part-payments, and fee adjustments
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeLoan.brokenPeriod && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleOpenAdd(
                  'BROKEN_PERIOD_PAYMENT',
                  activeLoan.brokenPeriod?.customInterest
                    ? paiseToRupees(activeLoan.brokenPeriod.customInterest)
                    : 4027,
                  activeLoan.brokenPeriod?.endDate || activeLoan.startDate,
                  'Pre-EMI broken period interest paid to lender',
                )
              }
              className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              Add Broken-Period Interest
            </Button>
          )}
          <Button size="sm" onClick={() => handleOpenAdd()} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Record Payment
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-8 h-8" />}
          title="No individual payment records"
          description="The loan is currently following its modeled amortization schedule. You can record actual statement payments or one-time prepayments here."
          actionLabel="Record Payment"
          onAction={() => handleOpenAdd()}
        />
      ) : (
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle>Recorded Payment Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium whitespace-nowrap">
                        {formatDisplayDate(ev.date)}
                      </td>
                      <td className="p-3">
                        {renderEventTypeBadge(ev.type)}
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground">
                        {formatINR(ev.amount)}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={ev.status} />
                      </td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">
                        {ev.notes || '-'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap space-x-1">
                        {ev.status === 'PLANNED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dispatch(markEventAsActual({ id: ev.id }))}
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                            title="Mark planned payment as actual"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Mark Actual
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(ev)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit payment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEventToDelete(ev.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Payment Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Edit Payment Record' : 'Record New Payment'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Payment Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as LoanEventType;
                setType(newType);
                if (newType === 'BROKEN_PERIOD_PAYMENT' && !editingEvent) {
                  if (activeLoan.brokenPeriod?.customInterest) {
                    setAmountRupees(paiseToRupees(activeLoan.brokenPeriod.customInterest));
                  } else {
                    setAmountRupees(4027);
                  }
                  if (activeLoan.startDate) {
                    setDate(activeLoan.brokenPeriod?.endDate || activeLoan.startDate);
                  }
                  if (!notes) {
                    setNotes('Pre-EMI broken-period interest paid to lender');
                  }
                }
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="BROKEN_PERIOD_PAYMENT">
                Broken-Period Interest Payment (Pre-EMI Interest)
              </option>
              <option value="PART_PAYMENT">Part-Payment (Principal Prepayment)</option>
              <option value="EMI">Regular Monthly EMI Payment</option>
              <option value="FEE">Fee / Charge</option>
              <option value="MANUAL_ADJUSTMENT">Manual Principal Adjustment</option>
            </select>
          </div>

          {type === 'BROKEN_PERIOD_PAYMENT' && (
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
              <span className="font-semibold block">Pre-EMI Broken Period Interest</span>
              Enter the interest amount paid to the lender (e.g. ₹4,027) before your first regular EMI started. This will be recorded as actual interest paid and reflected in Period 0 of your amortization schedule.
            </div>
          )}

          <MoneyInput
            label="Payment Amount"
            value={amountRupees}
            onChange={setAmountRupees}
            helperText="Amount paid in Rupees"
          />

          <DateInput
            label="Payment Date"
            value={date}
            onChange={setDate}
          />

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Payment Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="ACTUAL">Actual (Already Paid / Incurred)</option>
              <option value="PLANNED">Planned (Future Scheduled Assumption)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <Input
            label="Notes / Statement Reference (Optional)"
            placeholder="e.g. Bank transaction ref #88219"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              {editingEvent ? 'Save Changes' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => {
          if (eventToDelete) {
            dispatch(deleteEvent(eventToDelete));
            setEventToDelete(null);
          }
        }}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment record? Recalculation will adjust the amortization schedule automatically."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
};
