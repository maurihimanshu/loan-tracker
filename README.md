# LoanTracker: Enterprise Loan Tracking & Prepayment Analytics

An enterprise-grade, responsive, local-first web application built with React, TypeScript, Redux Toolkit, and Tailwind CSS. It enables borrowers to track loans, model amortization schedules, record actual payments, schedule flexible part-payments, and simulate prepayment strategies with deterministic financial calculations.

---

## Key Features

1. **Deterministic Financial Calculation Engine (Contract v1.0)**:
   - Uses exact integer minor units (paise) and deterministic `HALF_UP` rounding to eliminate binary floating-point errors.
   - Accurately models Equated Monthly Installment (EMI) schedules under monthly reducing balance.
   - Implements broken-period interest modeling (Actual/365 day count convention) with support for Interest Only, Interest + Principal, Capitalized Interest, and User-Entered values.
   - Enforces key financial invariants: conservation of original principal, scheduled EMI = interest + principal (with final period residual absorption), and zero negative balances.

2. **Advanced Part-Payment & Prepayment Engine**:
   - **Reduce Tenure Mode**: Keeps EMI constant; extra payments reduce principal and accelerate loan closure.
   - **Reduce EMI Mode**: Recalculates lower monthly installment for remaining tenure.
   - **Recurring Rules**: Supports Monthly, Quarterly, and Annual recurring prepayments (fixed amount or percentage of outstanding balance).
   - **Individual Monthly Overrides**: Enables modifying or cancelling specific months (e.g., higher payment during bonus months or ₹0 during festive months).
   - **Strict Precedence Resolution**: Cancellation (₹0) > Explicit Override > One-Time Payment > Recurring Rule > No Payment.

3. **What-If Strategy Simulator & Scenario Comparison**:
   - Live interactive simulator for testing custom prepayment amounts, frequencies, and repayment modes.
   - Side-by-side scenario comparison table comparing baseline vs projected strategies (Interest Saved, Tenure Reduction, Projected Closure Date).
   - Dynamic comparison curves in analytical charts.

4. **Multi-Loan Portfolio Support**:
   - Track multiple loans (Home Loan, Car Loan, Personal Loan) simultaneously.
   - Seamless loan switcher with individual analytical breakdowns and an aggregate consolidated portfolio overview.

5. **Local-First Privacy & Offline Persistence**:
   - Zero backend and zero cloud database: all loan and transaction data remains private and local to your browser.
   - Automatic background backup to browser local storage.
   - Native integration with the **File System Access API** (`showOpenFilePicker` / `showSaveFilePicker`) on supported browsers with clean fallback to standardized CSV download/upload.

6. **Standardized CSV Versioning (Schema v1)**:
   - RFC 4180-compliant export and import with multi-line, comma, and quote escaping.
   - Full validation before commit to prevent partial or corrupted state mutations.

7. **Accessible & Responsive Design**:
   - Responsive layouts optimized for Desktop, Tablet, and Mobile.
   - Mobile amortization view converts wide tables into expandable detail cards.
   - Dark mode, light mode, and system theme support.

---

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: Strict TypeScript (no `any`, full type safety)
- **State Management**: Redux Toolkit + React-Redux (normalized source state + memoized selectors)
- **Forms & Validation**: React Hook Form + Zod
- **Analytics & Visualizations**: Recharts
- **Data Tables**: TanStack Table v8
- **Styling**: Tailwind CSS + Lucide React
- **Testing**: Vitest + React Testing Library + jsdom

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

The application will launch at `http://localhost:3000`.

### Running Tests

```bash
npm run test
```

### Type Checking & Production Build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

---

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): Architecture overview, separation of concerns, and Redux state hierarchy.
- [FINANCIAL_CALCULATIONS.md](FINANCIAL_CALCULATIONS.md): Formal financial calculation specification, precision standards, and invariants.
- [CSV_SCHEMA.md](CSV_SCHEMA.md): Complete CSV schema documentation and format specification.
- [TESTING.md](TESTING.md): Testing strategy, test suites, and reference fixtures.

