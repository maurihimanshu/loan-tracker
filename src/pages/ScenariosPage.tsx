import React, { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  selectActiveLoan,
  selectActiveCalculation,
  selectScenarioResults,
  selectSelectedScenarioId,
} from '../app/selectors';
import {
  addScenario,
  deleteScenario,
  setSelectedScenarioId,
} from '../features/scenarios/scenarioSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { MoneyInput } from '../components/ui/MoneyInput';
import { DateInput } from '../components/ui/DateInput';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Scenario, RepaymentMode } from '../domain/loan/types';
import { formatINR, rupeesToPaise } from '../domain/loan/money';
import { formatDisplayDate, todayLocalDate } from '../domain/loan/dates';
import { calculateScenario } from '../domain/loan/scenarios';
import {
  TrendingUp,
  Plus,
  Trash2,
  Sliders,
} from 'lucide-react';

export const ScenariosPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeLoan = useAppSelector(selectActiveLoan);
  const calculation = useAppSelector(selectActiveCalculation);
  const scenarios = useAppSelector(selectScenarioResults);
  const selectedScenarioId = useAppSelector(selectSelectedScenarioId);

  // What-If Simulator Live Interactive State
  const [simExtraMonthlyRupees, setSimExtraMonthlyRupees] = useState<number>(25000);
  const [simRepaymentMode, setSimRepaymentMode] = useState<RepaymentMode>('REDUCE_TENURE');
  const [simName, setSimName] = useState<string>('Custom Strategy');
  const [simStartDate, setSimStartDate] = useState<string>(todayLocalDate());

  // Save Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);

  // Instant simulator live calculation
  const simResult = useMemo(() => {
    if (!activeLoan || !calculation) return null;

    const tempScenario: Scenario = {
      id: 'sim-live',
      loanId: activeLoan.id,
      name: simName,
      additionalMonthlyPayment: rupeesToPaise(simExtraMonthlyRupees),
      oneTimePayments: [],
      repaymentMode: simRepaymentMode,
      startDate: simStartDate,
      createdAt: '',
      updatedAt: '',
    };

    return calculateScenario(activeLoan, tempScenario, calculation);
  }, [activeLoan, calculation, simExtraMonthlyRupees, simRepaymentMode, simName, simStartDate]);

  const handleSaveSimulatedScenario = () => {
    if (!activeLoan) return;

    const newScenario: Scenario = {
      id: `scen-${Date.now()}`,
      loanId: activeLoan.id,
      name: simName || `+${formatINR(rupeesToPaise(simExtraMonthlyRupees))} Monthly`,
      additionalMonthlyPayment: rupeesToPaise(simExtraMonthlyRupees),
      oneTimePayments: [],
      repaymentMode: simRepaymentMode,
      startDate: simStartDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(addScenario(newScenario));
    dispatch(setSelectedScenarioId(newScenario.id));
    setIsSaveModalOpen(false);
  };

  if (!activeLoan || !calculation) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={<TrendingUp className="w-8 h-8" />}
          title="No active loan selected"
          description="Select or create a loan to simulate prepayment scenarios."
        />
      </div>
    );
  }

  const baselineKpis = calculation.kpis;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            What-If Simulator & Scenario Analysis
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test custom prepayment strategies and compare their impact on interest savings and loan closure dates
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsSaveModalOpen(true)}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Save Current Simulation
        </Button>
      </div>

      {/* Interactive What-If Simulator Panel (Section 18) */}
      <Card className="border-primary/30 shadow-sm">
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-primary" />
              <CardTitle>Interactive What-If Simulator</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Results update in real-time
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Input 1: Extra Monthly Payment */}
            <div>
              <MoneyInput
                label="Additional Monthly Payment"
                value={simExtraMonthlyRupees}
                onChange={setSimExtraMonthlyRupees}
                helperText="Extra principal added to every installment"
              />
              {/* Quick Preset Buttons */}
              <div className="flex items-center space-x-1.5 mt-2">
                {[10000, 25000, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSimExtraMonthlyRupees(preset)}
                    className="px-2 py-0.5 text-[11px] rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    +₹{preset / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* Input 2: Start Date */}
            <div>
              <DateInput
                label="Strategy Start Date"
                value={simStartDate}
                onChange={setSimStartDate}
                helperText="Cycle from which extra payment starts"
              />
            </div>

            {/* Input 3: Treatment Mode */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Repayment Treatment Mode
              </label>
              <select
                value={simRepaymentMode}
                onChange={(e) => setSimRepaymentMode(e.target.value as RepaymentMode)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
              >
                <option value="REDUCE_TENURE">Reduce Tenure (Same EMI, early closure)</option>
                <option value="REDUCE_EMI">Reduce EMI (Lower monthly payment)</option>
              </select>
            </div>
          </div>

          {/* Live Simulator Impact Output */}
          {simResult && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="text-xs font-semibold text-primary flex items-center justify-between">
                <span>Estimated Impact of this Strategy</span>
                <span className="font-mono">{simName}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Interest Saved</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(simResult.interestSavedVsBaseline)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tenure Reduction</span>
                  <span className="text-base font-bold text-foreground">
                    {simResult.tenureSavedMonths} months earlier
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">New Projected Closure</span>
                  <span className="text-base font-bold text-foreground">
                    {formatDisplayDate(simResult.projectedClosureDate)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">New Total Interest</span>
                  <span className="text-base font-bold text-foreground">
                    {formatINR(simResult.projectedInterest)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario Comparison Table (Section 19) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Saved Scenarios Comparison ({scenarios.length})</span>
          </h2>
        </div>

        {scenarios.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No scenarios saved yet. Use the simulator above and click "Save Current Simulation" to compare multiple strategies side-by-side.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">Scenario</th>
                    <th className="p-3">Total Interest</th>
                    <th className="p-3">Interest Saved</th>
                    <th className="p-3">Remaining Tenure</th>
                    <th className="p-3">Tenure Saved</th>
                    <th className="p-3">Projected Closure</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Baseline Row */}
                  <tr className="bg-muted/20 font-medium">
                    <td className="p-3 font-semibold text-foreground">
                      Original Baseline Schedule
                    </td>
                    <td className="p-3 font-mono">
                      {formatINR(baselineKpis.originalTotalInterest)}
                    </td>
                    <td className="p-3 text-muted-foreground">-</td>
                    <td className="p-3">
                      {baselineKpis.originalTenureMonths} months
                    </td>
                    <td className="p-3 text-muted-foreground">-</td>
                    <td className="p-3">
                      {formatDisplayDate(baselineKpis.originalMaturityDate)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">Reference</td>
                  </tr>

                  {/* Scenarios Rows */}
                  {scenarios.map((sc) => {
                    const isSelected = sc.scenarioId === selectedScenarioId;

                    return (
                      <tr
                        key={sc.scenarioId}
                        className={`hover:bg-muted/30 transition-colors ${
                          isSelected ? 'bg-primary/5 font-medium' : ''
                        }`}
                      >
                        <td className="p-3">
                          <span className="font-bold text-foreground block">
                            {sc.scenarioName}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-primary font-semibold">
                              ● Active in Charts
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {formatINR(sc.projectedInterest)}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatINR(sc.interestSavedVsBaseline)}
                        </td>
                        <td className="p-3">
                          {sc.remainingTenureMonths} months
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          {sc.tenureSavedMonths} months
                        </td>
                        <td className="p-3">
                          {formatDisplayDate(sc.projectedClosureDate)}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          {!isSelected ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => dispatch(setSelectedScenarioId(sc.scenarioId))}
                              className="h-7 text-xs"
                            >
                              Compare in Charts
                            </Button>
                          ) : (
                            <span className="text-xs text-primary font-medium mr-2">
                              Active
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setScenarioToDelete(sc.scenarioId)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete scenario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Scenario Modal */}
      <Dialog
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Simulation as Scenario"
        description="Save this payment strategy to compare against your baseline and dashboard analytics"
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Scenario Name"
            placeholder="e.g. ₹25K Extra Monthly, Aggressive Prepayment"
            value={simName}
            onChange={(e) => setSimName(e.target.value)}
          />

          <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional Monthly:</span>
              <span className="font-bold text-foreground">₹{new Intl.NumberFormat('en-IN').format(simExtraMonthlyRupees)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repayment Mode:</span>
              <span className="font-semibold text-foreground">
                {simRepaymentMode === 'REDUCE_TENURE' ? 'Reduce Tenure' : 'Reduce EMI'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Interest Saved:</span>
              <span className="font-bold text-emerald-600">
                {simResult ? formatINR(simResult.interestSavedVsBaseline) : '-'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveSimulatedScenario}>
              Save Scenario
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(scenarioToDelete)}
        onClose={() => setScenarioToDelete(null)}
        onConfirm={() => {
          if (scenarioToDelete) {
            dispatch(deleteScenario(scenarioToDelete));
            setScenarioToDelete(null);
          }
        }}
        title="Delete Scenario"
        message="Are you sure you want to delete this scenario?"
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
};
