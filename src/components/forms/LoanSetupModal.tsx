import React, { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MoneyInput } from '../ui/MoneyInput';
import { PercentageInput } from '../ui/PercentageInput';
import { DateInput } from '../ui/DateInput';
import { loanFormSchema, LoanFormValues } from '../../domain/loan/validation';
import { Loan } from '../../domain/loan/types';
import { rupeesToPaise, paiseToRupees, formatINR } from '../../domain/loan/money';
import { calculateStandardEmi } from '../../domain/loan/emi';
import { calculateBrokenPeriod } from '../../domain/loan/brokenPeriod';
import { addMonthsToDate, todayLocalDate } from '../../domain/loan/dates';
import { Calculator, Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface LoanSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLoan: (loan: Loan) => void;
  initialLoan?: Loan | null;
}

export const LoanSetupModal: React.FC<LoanSetupModalProps> = ({
  isOpen,
  onClose,
  onSaveLoan,
  initialLoan,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const defaultStartDate = todayLocalDate();
  const defaultEmiDate = addMonthsToDate(defaultStartDate, 1);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      name: initialLoan ? initialLoan.name : '',
      originalPrincipal: initialLoan ? paiseToRupees(initialLoan.originalPrincipal) : 5000000, // ₹50L default
      annualInterestRate: initialLoan ? initialLoan.annualInterestRate : 8.5,
      originalTenureMonths: initialLoan ? initialLoan.originalTenureMonths : 240, // 20 years
      startDate: initialLoan ? initialLoan.startDate : defaultStartDate,
      firstEmiDate: initialLoan ? initialLoan.firstEmiDate : defaultEmiDate,
      repaymentMode: initialLoan ? initialLoan.repaymentMode : 'REDUCE_TENURE',
      enableBrokenPeriod: Boolean(initialLoan?.brokenPeriod),
      brokenPeriodTreatment: initialLoan?.brokenPeriod?.treatment ?? 'INTEREST_ONLY',
      brokenPeriodCustomInterest: initialLoan?.brokenPeriod?.customInterest
        ? paiseToRupees(initialLoan.brokenPeriod.customInterest)
        : undefined,
      brokenPeriodCustomPrincipal: initialLoan?.brokenPeriod?.customPrincipal
        ? paiseToRupees(initialLoan.brokenPeriod.customPrincipal)
        : undefined,
      notes: initialLoan?.notes ?? '',
    },
  });

  const formValues = watch();

  useEffect(() => {
    if (!isOpen) return;
    if (initialLoan) {
      reset({
        name: initialLoan.name,
        originalPrincipal: paiseToRupees(initialLoan.originalPrincipal),
        annualInterestRate: initialLoan.annualInterestRate,
        originalTenureMonths: initialLoan.originalTenureMonths,
        startDate: initialLoan.startDate,
        firstEmiDate: initialLoan.firstEmiDate,
        repaymentMode: initialLoan.repaymentMode,
        enableBrokenPeriod: Boolean(initialLoan.brokenPeriod),
        brokenPeriodTreatment: initialLoan.brokenPeriod?.treatment ?? 'INTEREST_ONLY',
        brokenPeriodCustomInterest: initialLoan.brokenPeriod?.customInterest
          ? paiseToRupees(initialLoan.brokenPeriod.customInterest)
          : undefined,
        brokenPeriodCustomPrincipal: initialLoan.brokenPeriod?.customPrincipal
          ? paiseToRupees(initialLoan.brokenPeriod.customPrincipal)
          : undefined,
        notes: initialLoan.notes ?? '',
      });
    } else {
      reset({
        name: '',
        originalPrincipal: 5000000,
        annualInterestRate: 8.5,
        originalTenureMonths: 240,
        startDate: defaultStartDate,
        firstEmiDate: defaultEmiDate,
        repaymentMode: 'REDUCE_TENURE',
        enableBrokenPeriod: false,
        brokenPeriodTreatment: 'INTEREST_ONLY',
        brokenPeriodCustomInterest: undefined,
        brokenPeriodCustomPrincipal: undefined,
        notes: '',
      });
    }
    setCurrentStep(1);
  }, [isOpen, initialLoan, reset, defaultStartDate, defaultEmiDate]);

  // Live calculation preview
  const livePreview = useMemo(() => {
    const principalPaise = rupeesToPaise(formValues.originalPrincipal || 0);
    const rate = formValues.annualInterestRate || 0;
    const tenure = formValues.originalTenureMonths || 0;

    const emi = calculateStandardEmi(principalPaise, rate, tenure);
    const totalPayment = emi * tenure;
    const totalInterest = Math.max(0, totalPayment - principalPaise);

    let brokenPeriodInterest = 0;
    if (formValues.enableBrokenPeriod && formValues.startDate && formValues.firstEmiDate) {
      const bp = calculateBrokenPeriod(principalPaise, rate, {
        startDate: formValues.startDate,
        endDate: formValues.firstEmiDate,
        treatment: formValues.brokenPeriodTreatment || 'INTEREST_ONLY',
        dayCount: 'ACTUAL_365',
        customInterest: formValues.brokenPeriodCustomInterest
          ? rupeesToPaise(formValues.brokenPeriodCustomInterest)
          : undefined,
        customPrincipal: formValues.brokenPeriodCustomPrincipal
          ? rupeesToPaise(formValues.brokenPeriodCustomPrincipal)
          : undefined,
      });
      brokenPeriodInterest = bp.interest;
    }

    return {
      emi,
      totalInterest,
      totalPayment,
      brokenPeriodInterest,
    };
  }, [
    formValues.originalPrincipal,
    formValues.annualInterestRate,
    formValues.originalTenureMonths,
    formValues.enableBrokenPeriod,
    formValues.startDate,
    formValues.firstEmiDate,
    formValues.brokenPeriodTreatment,
    formValues.brokenPeriodCustomInterest,
    formValues.brokenPeriodCustomPrincipal,
  ]);

  const onSubmit = (data: LoanFormValues) => {
    const principalPaise = rupeesToPaise(data.originalPrincipal);
    const newLoan: Loan = {
      id: initialLoan ? initialLoan.id : `loan-${Date.now()}`,
      name: data.name,
      currency: 'INR',
      originalPrincipal: principalPaise,
      annualInterestRate: data.annualInterestRate,
      originalTenureMonths: data.originalTenureMonths,
      startDate: data.startDate,
      firstEmiDate: data.firstEmiDate,
      repaymentFrequency: 'MONTHLY',
      repaymentMode: data.repaymentMode,
      interestMethod: 'MONTHLY_REDUCING_BALANCE',
      status: initialLoan ? initialLoan.status : 'ACTIVE',
      brokenPeriod: data.enableBrokenPeriod
        ? {
            startDate: data.startDate,
            endDate: data.firstEmiDate,
            treatment: data.brokenPeriodTreatment,
            dayCount: 'ACTUAL_365',
            customInterest: data.brokenPeriodCustomInterest
              ? rupeesToPaise(data.brokenPeriodCustomInterest)
              : undefined,
            customPrincipal: data.brokenPeriodCustomPrincipal
              ? rupeesToPaise(data.brokenPeriodCustomPrincipal)
              : undefined,
          }
        : undefined,
      notes: data.notes,
      createdAt: initialLoan ? initialLoan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveLoan(newLoan);
    reset();
    setCurrentStep(1);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialLoan ? 'Edit Loan Details' : 'Create New Loan'}
      description="Configure loan parameters, interest terms, and prepayment preferences"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Wizard Steps Navigation */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > step
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step ? <Check className="w-3.5 h-3.5" /> : step}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Step {currentStep} of 3
          </span>
        </div>

        {/* Step 1: Basic Information & Principal */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <Input
              label="Loan Name / Identifier"
              placeholder="e.g. HDFC Home Loan, Axis Car Loan"
              error={errors.name?.message}
              {...register('name')}
            />

            <Controller
              name="originalPrincipal"
              control={control}
              render={({ field }) => (
                <MoneyInput
                  label="Original Principal Amount"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.originalPrincipal?.message}
                  helperText="Total sanction or disbursed loan amount in Rupees"
                />
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DateInput
                    label="Disbursement / Start Date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.startDate?.message}
                  />
                )}
              />

              <Controller
                name="firstEmiDate"
                control={control}
                render={({ field }) => (
                  <DateInput
                    label="First EMI Repayment Date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.firstEmiDate?.message}
                  />
                )}
              />
            </div>
          </div>
        )}

        {/* Step 2: Interest, Tenure & Repayment Mode */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                name="annualInterestRate"
                control={control}
                render={({ field }) => (
                  <PercentageInput
                    label="Annual Interest Rate (%)"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.annualInterestRate?.message}
                    helperText="e.g. 8.50% p.a."
                  />
                )}
              />

              <Input
                label="Original Loan Tenure (Months)"
                type="number"
                min={1}
                max={600}
                placeholder="240"
                helperText={`${Math.floor((formValues.originalTenureMonths || 0) / 12)} years ${(formValues.originalTenureMonths || 0) % 12} months`}
                error={errors.originalTenureMonths?.message}
                {...register('originalTenureMonths')}
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-medium text-foreground">
                Default Part-Payment Repayment Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="radio"
                    value="REDUCE_TENURE"
                    className="mt-1 text-primary focus:ring-primary"
                    {...register('repaymentMode')}
                  />
                  <div>
                    <span className="text-xs font-semibold block text-foreground">
                      Reduce Tenure
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Keep EMI constant; loan closes earlier to maximize interest savings.
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="radio"
                    value="REDUCE_EMI"
                    className="mt-1 text-primary focus:ring-primary"
                    {...register('repaymentMode')}
                  />
                  <div>
                    <span className="text-xs font-semibold block text-foreground">
                      Reduce EMI
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Recalculate smaller monthly EMI; loan tenure remains same.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Broken Period & Review */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-primary focus:ring-primary"
                  {...register('enableBrokenPeriod')}
                />
                <span className="text-xs font-semibold text-foreground">
                  Enable Broken-Period Interest Treatment
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground pl-6">
                Applies when loan disbursement date differs from first EMI cycle start.
                Applies when loan disbursement date differs from first EMI cycle start. If you paid a specific pre-EMI interest (e.g. ₹4,027), choose &quot;User-Entered Actual Amounts&quot; below to set it.
              </p>

              {formValues.enableBrokenPeriod && (
                <div className="space-y-3 pt-2 pl-6">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Treatment Method
                    </label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                      {...register('brokenPeriodTreatment')}
                    >
                      <option value="INTEREST_ONLY">Interest Only (Paid separately)</option>
                      <option value="INTEREST_PLUS_PRINCIPAL">Interest + Principal</option>
                      <option value="CAPITALIZE_INTEREST">Capitalize Interest (Added to loan balance)</option>
                      <option value="USER_ENTERED">User-Entered Actual Amounts (e.g. ₹4,027)</option>
                    </select>
                  </div>

                  {formValues.brokenPeriodTreatment === 'USER_ENTERED' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <Controller
                        name="brokenPeriodCustomInterest"
                        control={control}
                        render={({ field }) => (
                          <MoneyInput
                            label="Broken Period Interest Paid (₹)"
                            value={field.value ?? 0}
                            onChange={field.onChange}
                            helperText="Pre-EMI interest paid to lender (e.g. ₹4,027)"
                          />
                        )}
                      />
                      <Controller
                        name="brokenPeriodCustomPrincipal"
                        control={control}
                        render={({ field }) => (
                          <MoneyInput
                            label="Broken Period Principal (₹, Optional)"
                            value={field.value ?? 0}
                            onChange={field.onChange}
                            helperText="Usually ₹0 unless part of principal was paid upfront"
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="Notes / Description (Optional)"
              placeholder="e.g. Disbursed under PMAY subsidy, fixed for 2 years"
              {...register('notes')}
            />
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-primary">
            <span className="flex items-center space-x-1.5">
              <Calculator className="w-3.5 h-3.5" />
              <span>Live Schedule Preview</span>
            </span>
            <span>Standard Monthly Reducing</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Monthly EMI</span>
              <span className="font-bold text-foreground text-sm">
                {formatINR(livePreview.emi)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Interest</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {formatINR(livePreview.totalInterest)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Repayment</span>
              <span className="font-semibold text-foreground">
                {formatINR(livePreview.totalPayment)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Broken Period</span>
              <span className="font-medium text-muted-foreground">
                {formValues.enableBrokenPeriod
                  ? formatINR(livePreview.brokenPeriodInterest)
                  : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Navigation Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentStep((s) => Math.min(3, s + 1))}
              >
                Next
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            ) : (
              <Button type="submit" size="sm" variant="primary">
                {initialLoan ? 'Save Changes' : 'Create Loan'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
};
