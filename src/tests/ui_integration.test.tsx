import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../app/store';
import { App } from '../App';
import { addLoan, setActiveLoan } from '../features/loans/loanSlice';
import { rupeesToPaise } from '../domain/loan/money';

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('UI Integration & Navigation Flow', () => {
  beforeEach(() => {
    // Seed loan into store
    const testLoan = {
      id: 'ui-test-loan',
      name: 'UI Test Home Loan',
      currency: 'INR' as const,
      originalPrincipal: rupeesToPaise(4000000), // 40L
      annualInterestRate: 8.5,
      originalTenureMonths: 180,
      startDate: '2026-09-01',
      firstEmiDate: '2026-10-01',
      repaymentFrequency: 'MONTHLY' as const,
      repaymentMode: 'REDUCE_TENURE' as const,
      interestMethod: 'MONTHLY_REDUCING_BALANCE' as const,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.dispatch(addLoan(testLoan));
    store.dispatch(setActiveLoan(testLoan.id));
  });

  it('renders application navigation tabs and dashboard KPIs', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    // Verify tabs exist
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Loans')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Part Payments')).toBeInTheDocument();
    expect(screen.getByText('Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Verify KPI cards on dashboard
    expect(screen.getByText('Outstanding Principal')).toBeInTheDocument();
    expect(screen.getByText('Current Monthly EMI')).toBeInTheDocument();
    expect(screen.getByText('Projected Interest Saved')).toBeInTheDocument();
  });

  it('navigates seamlessly across different application pages', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    // Click on 'Part Payments' tab
    fireEvent.click(screen.getByText('Part Payments'));
    expect(screen.getByText('Part-Payment Rules & Overrides')).toBeInTheDocument();
    expect(screen.getByText('Create Recurring Rule')).toBeInTheDocument();

    // Click on 'Scenarios' tab
    fireEvent.click(screen.getByText('Scenarios'));
    expect(
      screen.getByText('What-If Simulator & Scenario Analysis'),
    ).toBeInTheDocument();
    expect(screen.getByText('Interactive What-If Simulator')).toBeInTheDocument();

    // Click on 'Schedule' tab
    fireEvent.click(screen.getByText('Schedule'));
    expect(
      screen.getByText('Amortization & Payment Schedule'),
    ).toBeInTheDocument();

    // Click on 'Settings' tab
    fireEvent.click(screen.getByText('Settings'));
    expect(
      screen.getByText('Application Settings & Preferences'),
    ).toBeInTheDocument();
    expect(screen.getByText('Download CSV Backup')).toBeInTheDocument();
  });

  it('opens and closes the loan setup modal', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    // Click 'New Loan' or loan setup button
    const createBtns = screen.getAllByTitle(/Create another loan/i);
    if (createBtns.length > 0) {
      fireEvent.click(createBtns[0]!);
      expect(screen.getByText('Create New Loan')).toBeInTheDocument();
      expect(screen.getByText('Live Schedule Preview')).toBeInTheDocument();

      // Click Cancel
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Create New Loan')).not.toBeInTheDocument();
    }
  });
});
