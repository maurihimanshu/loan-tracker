# Testing Strategy & Verification Report

## Overview

The application features comprehensive automated testing covering unit calculations, property invariants, edge cases, Redux state selectors, CSV serialization round-trips, and UI integration flows.

---

## 1. Test Architecture

The testing stack comprises:
- **Test Runner**: Vitest v2.1
- **DOM Environment**: jsdom
- **Component Testing**: React Testing Library + `@testing-library/jest-dom`
- **Assertion Framework**: Chai / Jest matchers

---

## 2. Test Suites

### Suite 1: Financial Calculation Contract Invariants (`src/tests/financial_calculations.test.ts`)
Validates every clause of the Financial Calculation Contract (FCC v1.0):
1. **Integer Paise & HALF_UP Rounding**:
   - Paise conversions from floating-point Rupees.
   - Halfway value rounding away from zero ($1.235 \rightarrow 1.24$).
   - Indian Numbering system formatting (`₹12,34,567`).
2. **Date Boundaries & Month-End Clamping**:
   - Leap year detection ($2024, 2028$ leap years vs $2026$).
   - Clamping month-end payment cycles (e.g. Jan 31 + 1 month $\rightarrow$ Feb 28/29) avoiding JavaScript Date overflow.
3. **Standard EMI Reference Fixture (Contract Section 72)**:
   - Canonical loan: ₹10,00,000 principal, 12% annual rate, 12-month tenure.
   - Asserts monthly EMI equals exactly **₹88,848.79** ($8,884,879$ paise).
   - Zero-interest loan verification ($R = 0\% \implies \text{EMI} = P / n$).
4. **Broken-Period Treatments**:
   - `INTEREST_ONLY`: Actual/365 time fraction calculation.
   - `CAPITALIZE_INTEREST`: Starting schedule principal includes accrued interest.
   - `USER_ENTERED`: Authoritative user-entered components are preserved.
5. **Part-Payment Precedence & Overrides**:
   - Cancellation override (`cancelled: true`) forces ₹0 prepayment.
   - Individual monthly override takes precedence over one-time and recurring rules.
   - Percentage-based rules correctly calculate percentage of current opening balance.
6. **Mandatory Invariants (Contract Section 71)**:
   - **No Negative Balances**: Opening and closing balances $\ge 0$.
   - **Principal Conservation**: $\sum \text{Principal Repaid} = \text{Original Principal}$.
   - **EMI Component Identity**: $\text{Scheduled EMI} = \text{Interest} + \text{Principal}$.
   - **Final Payment Absorption**: Final payment dynamically closes the loan without overcharging.
7. **Repayment Modes (Reduce Tenure vs Reduce EMI)**:
   - `REDUCE_TENURE`: Constant EMI, tenure reduction.
   - `REDUCE_EMI`: Recalculated lower EMI, preserved tenure.
   - Excess prepayments clamp to remaining balance.
8. **Scenario Independence**:
   - Simulating what-if scenarios never mutates baseline or current projections.

### Suite 2: CSV Serialization Roundtrip (`src/tests/csv_roundtrip.test.ts`)
Validates export/import lossless fidelity:
- RFC 4180 escaping of double quotes (`""`), commas, and multi-line descriptions.
- Currency symbols (₹) and UTF-8 characters.
- Complete roundtrip: `Export -> CSV String -> Parse & Validate -> Equivalent Domain State`.
- Malformed and corrupt CSV rejection with descriptive validation diagnostics.

### Suite 3: Redux Store & Selectors (`src/tests/store_selectors.test.ts`)
Validates normalized Redux state and memoized selectors:
- Adding, updating, and switching active loans.
- Dynamic derivation of savings metrics upon rule addition.
- What-if scenario calculation through selectors.
- Portfolio aggregate KPIs across multiple active loans.

### Suite 4: UI Integration & Navigation (`src/tests/ui_integration.test.tsx`)
Validates user interaction and navigation flows:
- Application navigation tabs switching.
- Dashboard KPI cards and charts rendering.
- Loan setup modal opening, previewing live calculations, and closing.

---

## 3. Running the Test Suite

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

