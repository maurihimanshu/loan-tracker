# Contributing to LoanTracker

Thank you for your interest in contributing to LoanTracker! This project aims to provide borrowers with transparent, deterministic, and privacy-preserving loan tracking and prepayment analytics.

Please take a moment to review this document before submitting contributions.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior through our repository issue channels or maintainer contacts.

---

## Development Workflow

### Prerequisites
- **Node.js**: Version 20.x or 24.x
- **npm**: Version 10.x or higher
- **Git**

### Initial Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/loan-tracker.git
   cd loan-tracker
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Quality & Verification Gates

Before submitting a Pull Request, all automated checks must pass:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Linting
npm run lint

# 3. Test execution
npm test

# 4. Production build
npm run build
```

---

## Critical Architecture Principles

### 1. Deterministic Financial Invariants (Contract v1.0)
LoanTracker is built on exact financial math. All domain financial calculations in `src/domain/loan/` MUST adhere to the following principles:
- **Integer Minor Units (Paise)**: Monetary balances, payments, principal, and interest must be stored and computed as integer minor units (`Money = number` representing paise, where ₹1.00 = 100 paise).
- **Rounding Half Up**: Use `roundHalfUp(x)` consistently for all interest and EMI rounding. Never rely on native JavaScript `Math.round()` directly for half-values or floating-point rounding.
- **Principal Conservation**: The sum of scheduled principal repayments plus closing balance must equal opening balance.
- **Non-Negative Balances**: Balances must never be negative (`Math.max(0, ...)`).
- **Final Period Residual Absorption**: Small 1–2 paise rounding residuals must be absorbed into the final period principal, ensuring total principal repaid equals original principal down to the exact paisa.

### 2. Local-First Privacy
- **Zero Cloud / No Backend**: All data stays on the user's machine (stored in LocalStorage or user-managed local CSV files via File System Access API).
- **No External Telemetry**: Do not introduce analytics scripts, external trackers, or telemetry endpoints that transmit user financial details.

### 3. Clean Separation of Concerns
- `src/domain/`: Pure TypeScript business logic, financial formulas, amortization generators, and CSV parsers. No React, UI, or Redux imports allowed here.
- `src/app/`: Redux Toolkit store, state slices, and memoized selectors.
- `src/components/`: Reusable, accessible UI components built with Tailwind CSS.
- `src/pages/`: Application screens (Dashboard, Schedule, Portfolio, Prepayment Simulator, Import/Export).

---

## Branching & Commit Guidelines

- Create feature branches with descriptive names:
  - `feat/feature-name` (e.g. `feat/step-up-emi-simulation`)
  - `fix/bug-name` (e.g. `fix/broken-period-amortization-rounding`)
  - `docs/topic-name` (e.g. `docs/update-csv-schema`)
- Write clear, concise commit messages following Conventional Commits format:
  - `feat: add quarterly part-payment rule option`
  - `fix: resolve floating-point inaccuracy in baseline interest kpi`
  - `test: add edge cases for pre-EMI payments`

---

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a Pull Request targeting the `main` branch.
3. Complete the [Pull Request Template](.github/pull_request_template.md).
4. Verify that the GitHub Actions CI pipeline passes all build, lint, and test checks.
5. Address code review feedback promptly.

Thank you for helping make loan analytics transparent and accessible to everyone!

