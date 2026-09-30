import React, { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import {
  selectActiveTab,
  selectLoans,
  selectFileState,
  selectActiveLoanId,
  selectFullExportPayload,
} from './app/selectors';
import {
  setAllLoans,
  setActiveLoan,
  addLoan,
} from './features/loans/loanSlice';
import { setAllEvents } from './features/payments/paymentSlice';
import { setAllRules, setAllOverrides, addRule } from './features/partPayments/partPaymentSlice';
import { setAllScenarios, addScenario } from './features/scenarios/scenarioSlice';
import { markLocalSaved, markUnsavedChanges } from './features/fileManagement/fileSlice';
import { closeLoanSetup } from './features/ui/uiSlice';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  loadPreferences,
} from './services/persistence';
import { ExportDataPayload } from './services/csv';
import { Navbar } from './components/layout/Navbar';
import { NavTabs } from './components/layout/NavTabs';
import { Footer } from './components/layout/Footer';
import { DashboardPage } from './pages/DashboardPage';
import { LoansPage } from './pages/LoansPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PartPaymentsPage } from './pages/PartPaymentsPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { SchedulePage } from './pages/SchedulePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoanSetupModal } from './components/forms/LoanSetupModal';
import { ImportCsvModal } from './components/forms/ImportCsvModal';
import { Loan } from './domain/loan/types';
import { rupeesToPaise } from './domain/loan/money';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);
  const loans = useAppSelector(selectLoans);
  const fileState = useAppSelector(selectFileState);
  const isLoanSetupOpen = useAppSelector((state) => state.ui.isLoanSetupOpen);
  const editingLoanId = useAppSelector((state) => state.ui.editingLoanId);
  const exportPayload = useAppSelector(selectFullExportPayload);
  const activeLoanId = useAppSelector(selectActiveLoanId);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const isInitialMount = useRef(true);

  // 1. Initial State Restoration from Browser Storage or Sample Loan (Section 29 & 102)
  useEffect(() => {
    const prefs = loadPreferences();
    if (
      prefs.theme === 'dark' ||
      (prefs.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    }

    const savedState = loadFromLocalStorage();

    if (savedState && savedState.loans && savedState.loans.length > 0) {
      dispatch(setAllLoans(savedState.loans));
      dispatch(setAllEvents(savedState.events ?? []));
      dispatch(setAllRules(savedState.rules ?? []));
      dispatch(setAllOverrides(savedState.overrides ?? []));
      dispatch(setAllScenarios(savedState.scenarios ?? []));
      if (savedState.activeLoanId) {
        dispatch(setActiveLoan(savedState.activeLoanId));
      }
    } else {
      // First-time visit: initialize with a realistic sample loan so user can test immediately
      const sampleLoan: Loan = {
        id: 'sample-home-loan',
        name: 'HDFC Home Loan (Sample)',
        currency: 'INR',
        originalPrincipal: rupeesToPaise(5000000), // ₹50 Lakhs
        annualInterestRate: 8.5,
        originalTenureMonths: 240, // 20 years
        startDate: '2026-09-15',
        firstEmiDate: '2026-11-05',
        repaymentFrequency: 'MONTHLY',
        repaymentMode: 'REDUCE_TENURE',
        interestMethod: 'MONTHLY_REDUCING_BALANCE',
        brokenPeriod: {
          startDate: '2026-09-15',
          endDate: '2026-11-05',
          treatment: 'INTEREST_ONLY',
          dayCount: 'ACTUAL_365',
        },
        status: 'ACTIVE',
        notes: 'Initial sample loan tracking ₹50L sanction with broken-period interest',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch(addLoan(sampleLoan));
      dispatch(setActiveLoan(sampleLoan.id));

      // Add a planned recurring part-payment of ₹25,000 to demonstrate interest savings
      dispatch(
        addRule({
          id: 'sample-rule-1',
          loanId: sampleLoan.id,
          startDate: '2027-01-05',
          frequency: 'MONTHLY',
          amountType: 'FIXED',
          amount: rupeesToPaise(25000),
          treatment: 'REDUCE_TENURE',
          status: 'ACTIVE',
          notes: 'Extra ₹25,000 monthly part-payment',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );

      // Add a comparison scenario
      dispatch(
        addScenario({
          id: 'sample-scenario-1',
          loanId: sampleLoan.id,
          name: 'Aggressive ₹50K Monthly Prepayment',
          description: 'Double monthly part-payments to close loan in under 8 years',
          additionalMonthlyPayment: rupeesToPaise(50000),
          oneTimePayments: [],
          repaymentMode: 'REDUCE_TENURE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );
    }
  }, [dispatch]);

  // 2. Autosave to LocalStorage with debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (exportPayload.loans.length > 0) {
        saveToLocalStorage({
          ...exportPayload,
          activeLoanId,
          lastPersistedAt: new Date().toISOString(),
        });
        dispatch(markLocalSaved());
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [exportPayload, activeLoanId, dispatch]);

  // 3. Unsaved changes browser alert (Section 66)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (fileState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [fileState.hasUnsavedChanges]);

  // Handle committing CSV import
  const handleCommitImport = (data: ExportDataPayload) => {
    if (data.loans.length > 0) {
      dispatch(setAllLoans(data.loans));
      dispatch(setAllEvents(data.events));
      dispatch(setAllRules(data.rules));
      dispatch(setAllOverrides(data.overrides));
      dispatch(setAllScenarios(data.scenarios));
      dispatch(setActiveLoan(data.loans[0]!.id));
      dispatch(markUnsavedChanges());
    }
  };

  const editingLoan = editingLoanId
    ? loans.find((l) => l.id === editingLoanId)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      {/* Global Top Navbar */}
      <Navbar onOpenImport={() => setIsImportModalOpen(true)} />

      {/* Navigation Tabs Bar */}
      <NavTabs />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'loans' && <LoansPage />}
        {activeTab === 'payments' && <PaymentsPage />}
        {activeTab === 'partPayments' && <PartPaymentsPage />}
        {activeTab === 'scenarios' && <ScenariosPage />}
        {activeTab === 'schedule' && <SchedulePage />}
        {activeTab === 'settings' && (
          <SettingsPage onOpenImport={() => setIsImportModalOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Loan Setup Wizard Modal */}
      {isLoanSetupOpen && (
        <LoanSetupModal
          isOpen={isLoanSetupOpen}
          onClose={() => dispatch(closeLoanSetup())}
          onSaveLoan={(savedLoan) => {
            if (editingLoanId) {
              dispatch({ type: 'loans/updateLoan', payload: savedLoan });
            } else {
              dispatch(addLoan(savedLoan));
              dispatch(setActiveLoan(savedLoan.id));
            }
            dispatch(markUnsavedChanges());
          }}
          initialLoan={editingLoan}
        />
      )}

      {/* CSV Import Modal */}
      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onCommitImport={handleCommitImport}
      />
    </div>
  );
};
