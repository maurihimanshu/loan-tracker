# MASTER BUILD PROMPT

## Enterprise-Grade React Loan Tracking, Amortization, Part-Payment & Financial Analytics Application

You are a senior staff/principal frontend engineer, financial-software architect, UX engineer, and QA engineer.

Build a complete, production-ready, enterprise-grade **Loan Tracking & Prepayment Analytics web application** from scratch.

The application must be a modern, responsive, local-first React application for tracking loans, EMI schedules, actual payments, broken-period payments, part-payments, future payment plans, and detailed interest/tenure savings analytics.

The application must NOT require a backend or database.

The user's browser is the primary runtime and Redux is the primary application state management layer. User loan data must be persistable to CSV files on the user's local machine.

Do not create a toy/demo application. Build a maintainable application with strong architecture, strict TypeScript, comprehensive validation, deterministic financial calculations, automated tests, accessible UI, error handling, and production-quality UX.

---

# 1. PRODUCT OBJECTIVE

The application allows a user to:

1. Create and configure one or more loans.
2. Enter original principal amount.
3. Enter annual interest rate.
4. Enter loan tenure.
5. Enter loan start/disbursement date.
6. Configure EMI start date.
7. Configure broken-period interest/payment.
8. Track actual EMI payments.
9. Track actual part-payments.
10. Create future planned part-payments.
11. Create recurring part-payment rules.
12. Modify individual months even when a recurring rule exists.
13. Compare actual payment history with the original loan schedule.
14. Calculate principal paid.
15. Calculate interest paid.
16. Calculate remaining principal.
17. Calculate remaining interest.
18. Calculate interest saved because of part-payments.
19. Calculate tenure saved because of part-payments.
20. Simulate future payment strategies.
21. Compare multiple scenarios.
22. See projected interest savings.
23. See projected loan closure dates.
24. See projected tenure reduction.
25. Visualize the entire loan trajectory.
26. Export/import loan data using CSV.
27. Persist the current working state locally in the browser.
28. Allow users to explicitly select a file location when supported by the browser.
29. Work without a server/database.
30. Recover gracefully if browser file-system functionality is unavailable.

The application must clearly distinguish:

* Historical/actual values
* Planned future values
* Projected values
* Scenario/what-if values

Never mix these concepts without explicitly labeling them.

---

# 2. NON-GOALS

Do NOT implement:

* Backend API
* Server database
* User authentication
* Cloud synchronization
* Online banking integration
* Automatic bank transaction retrieval
* Financial advice
* Investment recommendations

The application is a financial tracking/calculation tool, not a financial advisory system.

---

# 3. TECHNOLOGY STACK

Use current stable versions compatible with one another.

Preferred stack:

* React
* TypeScript
* Vite
* Redux Toolkit
* React Redux
* React Hook Form
* Zod
* Recharts
* TanStack Table
* date-fns
* Tailwind CSS
* shadcn/ui or equivalent accessible component system
* Vitest
* React Testing Library
* ESLint
* Prettier

Use strict TypeScript.

Avoid `any`.

Do not use unnecessary dependencies.

Keep the application entirely client-side.

Use npm unless there is a strong reason to use another package manager.

---

# 4. ARCHITECTURAL PRINCIPLES

Follow these principles strictly:

## 4.1 Separation of concerns

Separate:

* UI
* Redux state
* domain models
* financial calculation engine
* selectors
* CSV serialization
* file-system persistence
* browser persistence
* validation
* scenario engine

React components must NOT contain complicated financial calculations.

The calculation engine must be pure and deterministic wherever possible.

---

## 4.2 Source state vs derived state

Redux should contain source-of-truth editable data.

Do NOT unnecessarily store derived values such as:

* total interest
* interest saved
* tenure saved
* current balance
* projected closure date

as independently editable Redux fields.

Instead derive these using selectors/calculation functions.

Avoid duplicated sources of truth.

---

## 4.3 Financial precision

Never use careless floating-point calculations for monetary values.

Create a robust money/precision strategy.

Prefer integer minor units where practical, e.g.:

```text
₹50,000.25 -> 5000025 paise
```

or use a reliable decimal arithmetic approach.

Document the precision and rounding strategy.

All calculations must have deterministic rounding.

Use explicit rounding rules for:

* EMI
* interest
* principal
* part-payment
* final payment
* outstanding balance

Never silently round intermediate values without documenting why.

---

# 5. PROJECT STRUCTURE

Use a feature/domain-oriented structure similar to:

src/

app/
store.ts
hooks.ts
routes.tsx

domain/
loan/
types.ts
constants.ts
validation.ts
emi.ts
interest.ts
amortization.ts
brokenPeriod.ts
payments.ts
partPayments.ts
scenarios.ts
calculations.ts

features/
loans/
loanSlice.ts
selectors.ts
components/

```
payments/
  paymentSlice.ts
  selectors.ts
  components/

partPayments/
  partPaymentSlice.ts
  selectors.ts
  components/

scenarios/
  scenarioSlice.ts
  selectors.ts
  components/

dashboard/
  selectors.ts
  components/

fileManagement/
  fileSlice.ts
  components/
```

components/
ui/
charts/
tables/
forms/
layout/

services/
csv/
filesystem/
persistence/

pages/
DashboardPage.tsx
LoanSetupPage.tsx
PaymentSchedulePage.tsx
PartPaymentsPage.tsx
ScenariosPage.tsx
SettingsPage.tsx

utils/

tests/

Adapt the structure if necessary, but maintain the same architectural separation.

---

# 6. CORE DOMAIN MODEL

Design strong TypeScript domain models.

At minimum support:

## Loan

```ts
Loan {
  id
  name
  currency
  principal
  annualInterestRate
  tenureMonths
  startDate
  emiStartDate
  repaymentFrequency
  repaymentMode
  interestMethod
  status
  createdAt
  updatedAt
}
```

---

# 7. REPAYMENT MODES

Support:

## Reduce Tenure

After a part-payment:

* EMI remains the same where applicable.
* Outstanding principal reduces.
* Loan closure occurs earlier.

## Reduce EMI

After a part-payment:

* Remaining tenure remains approximately the same.
* EMI is recalculated based on the remaining principal and remaining tenure.

The user must be able to configure the preferred behavior.

Where real-world lender rules differ, clearly label calculations as modeled/projected rather than guaranteed lender behavior.

---

# 8. INTEREST CALCULATION

Initially support:

* Monthly reducing-balance interest.

Design the engine so additional methods can be added later.

For standard monthly reducing balance:

```text
monthlyRate = annualRate / 12 / 100

EMI =
P × r × (1+r)^n
----------------
(1+r)^n - 1
```

Do not blindly rely on this formula after arbitrary part-payments.

Generate a month/event schedule and calculate each period from the current outstanding balance.

---

# 9. EVENT-BASED CALCULATION ENGINE

Design the calculation engine around financial events.

Support events such as:

```ts
LoanEvent =
  | DISBURSEMENT
  | EMI
  | PART_PAYMENT
  | RATE_CHANGE
  | FEE
  | BROKEN_PERIOD_PAYMENT
  | MANUAL_ADJUSTMENT
```

Each event must have:

* id
* date
* type
* amount
* source
* metadata

This architecture should allow future expansion without rewriting the calculation engine.

---

# 10. BROKEN PERIOD

Support broken-period handling.

Example:

Loan disbursement:

15 September

First EMI:

5 November

The application must support configurable broken-period treatment.

At minimum:

1. Interest only
2. Interest + principal
3. Capitalized interest
4. User-entered broken-period amount

Allow the user to explicitly enter:

* Start date
* End date
* Number of days
* Interest amount
* Principal component
* Total amount
* Treatment

Do not assume every lender uses the same broken-period convention.

Clearly display the selected methodology.

---

# 11. PART-PAYMENT SYSTEM

Part-payment must be extremely flexible.

A user must be able to create:

## One-time payment

Example:

```text
15 March 2027
₹100,000
```

## Recurring payment

Example:

```text
₹25,000
Every month
October 2026 → December 2028
```

## Quarterly

```text
₹50,000
Every quarter
```

## Annual

```text
₹2,00,000
Every year
```

## Percentage based

Allow optional percentage-based rules.

Example:

```text
10% of outstanding principal
```

Support:

* Start date
* End date
* Frequency
* Amount
* Amount type
* Treatment
* Notes
* Active/inactive status

---

# 12. INDIVIDUAL MONTH OVERRIDES

This is critical.

Suppose the user defines:

```text
₹25,000 monthly
```

but wants:

```text
December = ₹50,000
March = ₹1,00,000
July = ₹0
```

The application must allow individual overrides.

The effective schedule must resolve:

```text
Recurring rule
        +
Individual override
        +
One-time payment
        =
Effective payment plan
```

Document and implement deterministic precedence rules.

Suggested precedence:

1. Explicit cancellation
2. Individual override
3. One-time payment
4. Recurring rule
5. No payment

Make the precedence visible in code and tests.

---

# 13. ACTUAL VS PLANNED PAYMENTS

Every payment should have a status such as:

```text
ACTUAL
PLANNED
CANCELLED
```

Historical payments should not accidentally be treated as future plans.

Dashboard calculations must expose:

* Actual paid principal
* Actual paid interest
* Actual part-payments
* Planned principal
* Planned interest
* Planned part-payments
* Projected remaining balance

---

# 14. PAYMENT SCHEDULE

Generate a complete amortization schedule.

Each row should contain at minimum:

```text
periodNumber
date
openingBalance
scheduledEMI
interest
scheduledPrincipal
partPayment
fees
totalPayment
closingBalance
paymentStatus
eventIds
```

Also support:

* actual vs planned
* cumulative principal
* cumulative interest
* cumulative payment
* cumulative part-payment

The final payment must never exceed the amount required to close the loan.

Prevent negative outstanding balances.

---

# 15. LOAN ANALYTICS

Calculate at minimum:

## Original

* Original principal
* Original EMI
* Original tenure
* Original total interest
* Original total repayment
* Original maturity date

## Current

* Current outstanding principal
* Principal paid
* Interest paid
* Total paid
* Current EMI
* Remaining tenure
* Remaining interest
* Projected maturity date

## Savings

* Interest saved to date
* Projected interest saved
* Tenure saved
* Projected additional interest saving
* Projected additional tenure saving

Always define what baseline is being used.

---

# 16. SAVINGS DEFINITIONS

Do not use ambiguous "interest saved".

Expose separate metrics:

### Realized Interest Saving

Original schedule interest minus interest actually incurred/paid according to the current historical schedule.

### Projected Interest Saving

Original schedule interest minus projected total interest under actual + planned payments.

### Scenario Interest Saving

Projected interest under the baseline plan minus projected interest under the selected scenario.

Similarly calculate:

* realized tenure reduction
* projected tenure reduction
* scenario tenure reduction

---

# 17. SCENARIO ENGINE

Create a dedicated scenario system.

A scenario can contain:

* name
* description
* additional recurring payment
* one-time payments
* overrides
* start date
* end date
* repayment mode
* assumptions

Examples:

```text
Current Plan

₹10K Extra Monthly

₹25K Extra Monthly

₹50K Extra Monthly

₹1L Every Quarter

Custom Plan
```

A scenario must NOT mutate the original loan.

Scenarios must be calculated immutably.

---

# 18. WHAT-IF SIMULATOR

Build an interactive simulator.

Inputs:

* Additional payment
* Frequency
* Start date
* End date
* Reduce EMI / Reduce Tenure

Outputs:

* New maturity date
* New remaining tenure
* Interest saving
* Total additional payment
* New total interest
* Additional interest saving

Results should update immediately after valid input changes.

Debounce expensive calculations if necessary.

---

# 19. SCENARIO COMPARISON

Provide a comparison table.

Example columns:

```text
Scenario
Additional Payment
Total Interest
Interest Saved
Remaining Tenure
Tenure Saved
Projected Closure Date
Total Additional Cash Outflow
```

Allow users to select a scenario and make it the dashboard comparison baseline.

Do not rank scenarios as "best" or "worst".

The UI should present factual comparisons only.

---

# 20. DASHBOARD

Build a polished modern financial analytics dashboard.

It must be responsive for:

* desktop
* laptop
* tablet
* mobile

Use a professional financial/SaaS visual language.

Avoid excessive decoration.

Prioritize:

* information hierarchy
* whitespace
* readability
* accessibility
* clear numerical formatting

---

# 21. DASHBOARD KPI CARDS

Create KPI cards for:

1. Original Principal
2. Outstanding Principal
3. Current EMI
4. Principal Paid
5. Interest Paid
6. Remaining Interest
7. Interest Saved
8. Tenure Saved
9. Projected Closure Date
10. Total Part-Payment

Each card should support:

* primary value
* secondary context
* optional comparison
* tooltip explaining the metric

---

# 22. DASHBOARD CHARTS

Implement multiple analytical visualizations.

## A. Outstanding Balance Trajectory

Line chart with:

* Original schedule
* Actual + planned schedule
* Selected scenario

X-axis:

* month/date

Y-axis:

* outstanding principal

---

## B. Principal vs Interest

Use a donut/pie chart for a single point-in-time composition.

Support:

* Paid
* Remaining
* Interest
* Principal

Do not use pie charts for time-series data.

---

## C. Interest Cost Comparison

Bar chart comparing:

* Original plan
* Actual/projected plan
* Scenario

---

## D. Monthly Payment Composition

Stacked bar chart showing:

* Interest
* Principal
* Part payment

per month.

---

## E. Cumulative Principal vs Interest

Line chart.

---

## F. Part-Payment Impact

Chart showing cumulative additional payments versus cumulative interest savings.

---

## G. Tenure Reduction

Visualize:

```text
Original maturity
Current projected maturity
Scenario maturity
```

---

# 23. INTERACTIVE DASHBOARD FILTERS

Provide:

* As-of date
* Scenario selector
* Date range
* Actual / Planned / Projected
* Chart period
* Currency formatting

Changing filters must update all dependent analytics consistently.

---

# 24. AMORTIZATION TABLE

Create a professional data table.

Columns:

* Period
* Date
* Opening Balance
* EMI
* Interest
* Principal
* Part Payment
* Total Payment
* Closing Balance
* Status

Features:

* sorting
* filtering
* column visibility
* sticky header
* pagination/virtualization if necessary
* search
* date filtering
* export
* responsive behavior

For mobile, transform the row into an expandable detail card rather than forcing a huge horizontal table.

---

# 25. PAYMENT MANAGEMENT

Create a dedicated payments screen.

Users can:

* add payment
* edit payment
* delete/cancel payment
* mark planned as actual
* change amount
* change date
* add notes

Validation must prevent impossible states.

Examples:

* negative payment
* invalid date
* payment after loan closure
* part-payment greater than outstanding balance unless explicitly allowed and handled as closure
* duplicate event ambiguity

---

# 26. PART PAYMENT MANAGEMENT

Create a dedicated part-payment screen.

Include:

* calendar/list view
* recurring rules
* individual overrides
* actual payments
* planned payments
* effective payment schedule

Provide clear visual distinction between:

* Actual
* Planned
* Overridden
* Cancelled

---

# 27. FILE PERSISTENCE

No backend.

Use browser APIs.

Preferred behavior:

## Supported File System Access API

Allow:

```text
Open Loan CSV
Save
Save As
```

The user explicitly chooses the file.

Maintain a file handle where supported and permitted.

Do not attempt to access arbitrary filesystem paths without user permission.

---

# 28. FALLBACK FILE HANDLING

If File System Access API is unavailable:

Support:

```text
Import CSV
Download CSV
```

The application must remain fully functional.

Do not make the application dependent on File System Access API.

---

# 29. BROWSER CACHE / LOCAL PERSISTENCE

Use local browser persistence for recovery.

Options:

* IndexedDB
* localStorage for lightweight metadata

The cached state should allow the user to recover unsaved work after a page refresh.

Clearly distinguish:

```text
Saved to file
```

from:

```text
Saved locally in browser
```

Example status:

```text
✓ Saved to loan.csv
✓ Browser backup updated
```

If unsaved changes exist:

```text
● Unsaved changes
```

Warn before destructive navigation where appropriate.

---

# 30. CSV FORMAT

Create a documented versioned CSV schema.

Include:

```text
schemaVersion
recordType
loanId
entityId
date
amount
principal
interest
status
frequency
amountType
treatment
description
metadata
```

Support record types such as:

```text
LOAN
PAYMENT
PART_PAYMENT
PART_PAYMENT_RULE
PART_PAYMENT_OVERRIDE
RATE_CHANGE
FEE
SCENARIO
SCENARIO_PAYMENT
BROKEN_PERIOD
```

You may improve the schema if required.

The schema must be deterministic and documented.

---

# 31. CSV IMPORT

When importing:

1. Validate file structure.
2. Validate schema version.
3. Validate required fields.
4. Validate dates.
5. Validate monetary values.
6. Validate loan references.
7. Detect duplicate IDs.
8. Report all errors.
9. Do not partially mutate Redux state if import fails.

Show an import summary:

```text
Imported:
1 loan
24 payments
8 part-payments
3 recurring rules

Warnings:
2 records ignored

Errors:
0
```

Allow users to review errors before committing imported data.

---

# 32. CSV EXPORT

Export deterministic, stable CSV.

Do not depend on object key ordering accidentally.

Use explicit column ordering.

Escape:

* commas
* quotes
* line breaks

correctly.

Use UTF-8.

If useful, include BOM support for spreadsheet compatibility.

---

# 33. FILE VERSIONING / MIGRATION

Design CSV schema versioning from the beginning.

Example:

```text
schemaVersion = 1
```

If future versions exist, create migration functions:

```text
v1 -> v2
v2 -> v3
```

Do not silently reinterpret old files.

---

# 34. AUTOSAVE

Provide browser-cache autosave.

Do not automatically overwrite the user's selected CSV file without explicit permission/clear save behavior.

The UI should show:

```text
Saved locally 8:42 PM
File saved 8:40 PM
Unsaved file changes: Yes
```

---

# 35. ERROR HANDLING

Implement a global error boundary.

Errors must be:

* caught
* logged locally where appropriate
* displayed in user-friendly language
* recoverable where possible

Never expose stack traces in normal UI.

Provide developer diagnostics only in development mode.

---

# 36. VALIDATION

Use Zod for user-facing input validation.

Validate:

* principal
* rate
* tenure
* dates
* payment amount
* payment frequency
* part-payment rules
* scenario definitions

Examples:

Principal:

```text> 0
```

Annual rate:

```text>= 0
```

Tenure:

```textpositive integer
```

Payment:

```text>= 0
```

Date relationships:

```textstartDate <= emiStartDate
```

Do not allow impossible financial states.

---

# 37. DATE HANDLING

Use a consistent date strategy.

Avoid accidental timezone shifts.

Loan financial dates should generally be represented as calendar dates rather than JavaScript timestamps when time-of-day is irrelevant.

Do not let:

```text2026-10-01
```

become:

```text2026-09-30
```

because of timezone conversion.

Write tests for date boundaries.

---

# 38. CURRENCY

Initially support INR.

However, design the domain model so currency is not hard-coded everywhere.

Use:

```textcurrency = "INR"
```

and format using Intl.NumberFormat.

Example:

```text₹12,45,000
```

Allow future currencies without rewriting the calculation engine.

---

# 39. RESPONSIVE DESIGN

Desktop:

* multi-column analytics
* wide charts
* full tables

Tablet:

* two-column analytics
* collapsible panels

Mobile:

* single-column cards
* horizontally scrollable charts where necessary
* expandable schedule rows
* bottom navigation or compact navigation
* sticky primary action

Do not simply shrink the desktop UI.

Create intentional mobile layouts.

---

# 40. ACCESSIBILITY

Target WCAG 2.2 AA where practical.

Include:

* keyboard navigation
* visible focus states
* semantic HTML
* proper labels
* accessible dialogs
* accessible form errors
* screen-reader-friendly charts/tables
* sufficient contrast
* reduced-motion support

Do not rely on color alone to communicate payment status.

---

# 41. THEMING

Support:

* Light theme
* Dark theme
* System theme

Charts must work correctly in both themes.

Persist theme preference locally.

---

# 42. NAVIGATION

Create a professional application shell.

Suggested navigation:

```text
Dashboard
Loans
Payments
Part Payments
Scenarios
Schedule
Settings
```

Top bar:

```text
Current Loan
Search
Save status
Theme
Help
```

---

# 43. LOAN SETUP UX

Create a multi-step setup flow.

Step 1:

Loan details

Step 2:

Interest & tenure

Step 3:

EMI / broken period

Step 4:

Existing payment history

Step 5:

Initial part-payment plan

Step 6:

Review

Step 7:

Create loan

Show a live calculation preview throughout.

---

# 44. EXISTING LOAN SUPPORT

The user may start tracking a loan that began before using this application.

Support:

```text
Original loan date
Original principal
Original rate
Original tenure

Current tracking date
Current outstanding principal
Historical payments
Historical part-payments
```

Do not require the user to manually enter every historical EMI if there is a simpler supported initialization mode.

Provide an "Initialize from current outstanding balance" workflow.

Clearly distinguish modeled historical values from user-entered actual values.

---

# 45. RATE CHANGES

Design the domain model for future floating-rate support.

At minimum, allow rate-change events in the internal model even if advanced UI support is deferred.

A rate change must have:

```text
date
new annual rate
```

The calculation engine should be designed so future implementation does not require major restructuring.

---

# 46. FEES AND CHARGES

Support optional fees.

Examples:

* processing fee
* prepayment charge
* administrative fee

Do not automatically include fees in interest unless explicitly configured.

Show them separately.

---

# 47. FINANCIAL SAFETY

The application must include a clear disclaimer in Settings/About:

```text
This application provides calculations and projections for tracking and planning purposes only. Actual loan calculations, interest, prepayment treatment, fees, taxes, dates, and outstanding balances may differ from those applied by your lender. Verify important figures against your lender's official statement.
```

Do not present projections as guaranteed lender outcomes.

---

# 48. PERFORMANCE

The application should remain responsive with:

* thousands of schedule rows
* many payment events
* many scenarios

Use memoization/selectors appropriately.

Avoid recalculating every component on every keystroke unnecessarily.

Use virtualization for very large tables if necessary.

Do not prematurely optimize at the expense of correctness.

---

# 49. TESTING STRATEGY

This is critical.

Create comprehensive automated tests.

## Unit tests

Test:

* EMI calculation
* monthly interest
* principal calculation
* final payment
* rounding
* broken-period calculation
* part-payment
* recurring payment resolution
* override precedence
* reduce-tenure
* reduce-EMI
* loan closure
* interest savings
* tenure savings
* scenario comparison
* CSV serialization
* CSV parsing
* schema validation
* date handling

---

# 50. PROPERTY / EDGE TESTS

Test cases such as:

1. Zero interest loan.
2. Very high interest rate.
3. One-month loan.
4. Very long loan.
5. Part-payment equal to outstanding balance.
6. Part-payment greater than outstanding balance.
7. Part-payment on EMI date.
8. Part-payment before EMI.
9. Part-payment after EMI.
10. Multiple part-payments on same date.
11. Recurring rule + override.
12. Recurring rule cancellation.
13. Loan closes before future planned payments.
14. Broken period of one day.
15. Broken period spanning multiple months.
16. Leap year.
17. February.
18. Month-end EMI.
19. Large principal.
20. Decimal interest rate.
21. Decimal payment.
22. Zero planned payment.
23. Imported malformed CSV.
24. Duplicate CSV IDs.
25. Unsupported CSV version.

---

# 51. TEST FIXTURES

Create deterministic fixtures.

Example:

```text
Principal: ₹1,000,000
Rate: 8%
Tenure: 120 months
```

Generate expected schedule values.

Tests must assert:

* balance reaches zero
* total principal equals original principal
* total interest is correct within defined rounding tolerance
* final payment is correct
* no negative balance occurs

---

# 52. CSV TESTING

Test:

* export -> import -> export

The normalized result should be equivalent.

Test special characters:

```text
, 
"
newline
₹
Unicode
```

Test malformed files.

Test version migration.

---

# 53. UI TESTING

Use React Testing Library for:

* Loan setup
* Part-payment creation
* Override editing
* Scenario creation
* Dashboard filter changes
* CSV import
* Save state
* Unsaved state
* Error states

---

# 54. E2E TESTING

If the environment supports it, add Playwright.

Critical flow:

```text
Create loan
↓
Generate schedule
↓
Add part-payment
↓
Dashboard updates
↓
Create scenario
↓
Compare scenario
↓
Export CSV
↓
Import CSV
↓
Verify data
```

---

# 55. CODE QUALITY

Enforce:

* strict TypeScript
* no `any`
* no unused variables
* no dead code
* ESLint
* Prettier
* consistent naming
* small focused functions
* pure domain functions
* meaningful comments only

Avoid over-commenting obvious code.

Comments should explain financial/business rules where necessary.

---

# 56. DOCUMENTATION

Create:

```text
README.md
ARCHITECTURE.md
FINANCIAL_CALCULATIONS.md
CSV_SCHEMA.md
TESTING.md
```

README must explain:

* installation
* development
* build
* testing
* architecture
* supported browsers
* file persistence behavior
* limitations

FINANCIAL_CALCULATIONS.md must document:

* EMI
* interest
* principal
* broken period
* part-payment
* reduce EMI
* reduce tenure
* rounding
* final payment
* savings calculations

CSV_SCHEMA.md must document every field and record type.

---

# 57. SECURITY

Although this is local-only, follow secure development practices.

Do not:

* use eval
* execute imported data
* inject HTML from CSV
* trust CSV contents
* expose secrets
* add unnecessary third-party tracking

Sanitize imported text where rendered.

Do not send loan data to external servers.

The application must make this clear to the user.

---

# 58. PRIVACY

The application should be explicitly local-first.

Add a privacy/about statement:

```text
Your loan data is processed locally in your browser. This application does not require a server database for loan storage.
```

Do not add analytics or tracking unless explicitly requested.

---

# 59. DASHBOARD UX DETAILS

The dashboard should feel polished.

Use:

* subtle animation
* skeleton loaders only where meaningful
* tooltips
* hover states
* smooth chart transitions
* compact badges
* status indicators
* empty states
* helpful onboarding

Do not over-animate financial information.

Respect reduced-motion preferences.

---

# 60. EMPTY STATES

For a new user:

```text
No loan yet

Create your first loan to start tracking:

[ Create Loan ]
```

For no part-payments:

```text
No part-payments

Add a payment or create a recurring plan to analyze potential savings.

[ Add Part Payment ]
```

---

# 61. DASHBOARD DEFAULT STATE

When a loan is opened, show:

Top:

```text
Loan name
Current balance
Current EMI
Projected closure
```

Then:

```text
KPI row
Outstanding trajectory
Principal/interest composition
Interest savings
Payment composition
Upcoming payments
Scenario comparison
Recent payment activity
```

---

# 62. RECENT ACTIVITY

Add a compact activity feed:

```text
Today
Part-payment ₹50,000 recorded

5 Sep
EMI ₹48,750 recorded

1 Sep
Monthly part-payment plan changed to ₹25,000
```

This is derived from events.

---

# 63. UPCOMING PAYMENTS

Show:

```text
Next EMI
5 Oct 2026
₹48,750

Planned part-payment
5 Oct 2026
₹25,000

Next month
₹73,750 total planned
```

---

# 64. SCENARIO VISUALIZATION

When viewing a scenario:

Clearly label:

```text
BASELINE
CURRENT PLAN

SCENARIO
₹25,000 MONTHLY PART-PAYMENT
```

Charts should compare these two explicitly.

Do not imply that the scenario will definitely happen.

---

# 65. IMPORT/EXPORT UX

The file management area should include:

```text
Current file
File status
Last saved
Last modified
Open
Save
Save As
Download Backup
Import
```

When a save fails:

Explain why.

Example:

```text
Unable to save the file.

The browser permission may have expired.

[ Reconnect File ]
[ Download Copy ]
```

---

# 66. UNSAVED CHANGES

Track:

```text
redux state
vs
last persisted file state
```

Expose:

```text
Saved
Unsaved
Saving
Save failed
```

Before closing/navigating away from the application, warn about unsaved changes where the browser permits it.

---

# 67. STATE NORMALIZATION

Normalize collections by ID.

For example:

```ts
createEntityAdapter()
```

may be used for:

* loans
* payments
* part-payment rules
* scenarios
* events

Use Redux Toolkit idioms.

---

# 68. SELECTORS

Create memoized selectors for:

```text
selectActiveLoan
selectCurrentBalance
selectPrincipalPaid
selectInterestPaid
selectRemainingInterest
selectProjectedInterest
selectInterestSaved
selectTenureSaved
selectProjectedClosureDate
selectAmortizationSchedule
selectUpcomingPayments
selectScenarioResults
```

Keep selectors composable.

---

# 69. CALCULATION API

The core calculation engine should expose clear functions such as:

```ts
calculateEMI()

calculateInterest()

calculateAmortizationSchedule()

resolvePartPaymentRules()

applyPartPayment()

calculateLoanProjection()

calculateLoanSavings()

calculateScenario()

compareScenarios()
```

Functions should be deterministic.

---

# 70. NO BUSINESS LOGIC IN CHART COMPONENTS

Charts receive already-calculated data.

For example:

```tsx
<OutstandingTrajectoryChart
  data={trajectoryData}
/>
```

The chart component must not calculate loan interest.

---

# 71. FORM ARCHITECTURE

Use React Hook Form + Zod.

Forms should:

* validate on appropriate events
* display field-level errors
* preserve user input
* prevent accidental loss
* support keyboard navigation

Do not make users repeatedly enter the same information.

---

# 72. NUMBER INPUT UX

Financial fields should support:

* commas
* decimal values where appropriate
* currency formatting
* keyboard entry

But underlying values must remain numeric and validated.

Avoid parsing values using fragile string replacements throughout the application.

Centralize financial input parsing/formatting.

---

# 73. DATE INPUT UX

Provide:

* date picker
* keyboard input
* validation
* locale-aware display

Internally use a consistent canonical representation.

---

# 74. SETTINGS

Settings page:

```text
Currency
Theme
Date format
Default repayment mode
Default part-payment behavior
Rounding preference
File preferences
Browser storage
About
```

Do not expose dangerous technical settings to normal users.

---

# 75. DATA RESET

Provide:

```text
Clear current loan
Delete all local browser data
```

with strong confirmation dialogs.

Never make destructive actions one-click without confirmation.

---

# 76. MULTIPLE LOANS

Support multiple loans in the data model.

Dashboard can have:

```text
Home Loan
Car Loan
Personal Loan
```

Provide a loan switcher.

Optional aggregate dashboard:

```text
Total outstanding
Total EMI
Total interest remaining
Total projected interest savings
```

Clearly distinguish aggregate metrics from individual loan metrics.

---

# 77. AGGREGATE DASHBOARD

If multiple loans exist, provide:

* total outstanding
* total monthly EMI
* total principal paid
* total interest paid
* total remaining interest
* total planned part-payment

Charts can show loan distribution.

---

# 78. DATA INTEGRITY

Every mutation should maintain invariants.

Examples:

```text
outstanding >= 0

principalPaid <= originalPrincipal

loan balance cannot become negative

final schedule balance = 0

payment amount >= 0

dates are valid

IDs are unique
```

Create assertions where appropriate in development/test environments.

---

# 79. RECALCULATION STRATEGY

When a user changes:

* rate
* tenure
* payment
* part-payment
* date
* repayment mode

recalculate dependent derived data.

Do not mutate historical source records unintentionally.

Use immutable updates.

---

# 80. PERFORMANCE STRATEGY

For large schedules:

* memoize expensive calculations
* memoize selectors
* use Web Worker only if profiling demonstrates the need
* virtualize long tables

Do not introduce Web Workers prematurely.

---

# 81. BROWSER COMPATIBILITY

Support modern Chromium-based browsers and current Firefox/Safari where possible.

File System Access API is optional capability.

Feature-detect:

```ts
window.showOpenFilePicker
window.showSaveFilePicker
```

Never assume availability.

---

# 82. ACCESSIBILITY OF CHARTS

Every chart must have:

* meaningful title
* textual summary
* accessible fallback/table when practical

Do not make charts the only way users can understand important numbers.

---

# 83. FINANCIAL NUMBER FORMATTING

Use consistent formatting:

```text
₹50,00,000
₹48,750
8.50%
31 months
29 Sep 2026
```

Provide utility functions.

Do not format numbers differently across dashboard components.

---

# 84. USER EXPERIENCE FOR SAVINGS

Avoid misleading language such as:

```text
Guaranteed savings
```

Use:

```text
Projected interest saving
Estimated tenure reduction
```

when based on future assumptions.

---

# 85. LOAN CLOSURE

When balance reaches zero:

Set:

```text
status = CLOSED
```

Record:

* closure date
* final payment
* total paid
* total interest

Future payments should be prevented unless the user explicitly reopens/adjusts the loan.

---

# 86. FINAL PAYMENT

The final payment must be dynamically calculated.

Example:

If:

```text
Outstanding = ₹48,750
```

and scheduled EMI is:

```text
₹50,000
```

the final payment must not be ₹50,000 if only ₹48,750 is actually required.

Handle rounding carefully.

---

# 87. PART PAYMENT ABOVE BALANCE

If a user enters:

```text
Outstanding = ₹100,000
Part payment = ₹150,000
```

do not blindly create a negative balance.

Provide a validation warning:

```text
Part-payment exceeds outstanding principal.

Maximum applicable payment: ₹100,000.

Do you want to close the loan?
```

---

# 88. AUDITABILITY

Every user-modifiable financial event should have:

* ID
* createdAt
* updatedAt
* source
* optional note

Do not overwrite history without preserving enough information to understand what changed.

---

# 89. UX FOR EDITING

Editing a payment should immediately show:

```text
Before
After
Impact
```

Example:

```text
Part-payment changed

₹25,000 → ₹50,000

Projected interest saving:
+₹18,450

Projected closure:
3 months earlier
```

This is a useful enterprise-grade UX feature.

---

# 90. RESPONSIVE TABLE DESIGN

Desktop:

Full table.

Tablet:

Reduced columns + horizontal scrolling.

Mobile:

Card/accordion representation:

```text
Oct 2026

Opening ₹49.8L
EMI ₹48.7K
Interest ₹34.8K
Principal ₹13.9K
Part payment ₹25K
Closing ₹49.3L

[ View details ]
```

---

# 91. COMPONENT REUSABILITY

Build reusable:

* MoneyInput
* PercentageInput
* DateInput
* CurrencyDisplay
* MetricCard
* StatusBadge
* ConfirmDialog
* EmptyState
* ErrorState
* ChartContainer
* DataTable
* SaveStatus
* ScenarioBadge

---

# 92. DESIGN SYSTEM

Define:

* spacing
* typography
* radius
* shadows
* colors
* status colors
* chart conventions

Do not hard-code arbitrary styling repeatedly.

---

# 93. CHART COLOR SEMANTICS

Use consistent chart meaning.

For example:

* Principal
* Interest
* Baseline
* Actual
* Planned
* Scenario
* Savings

Colors should remain consistent throughout the application.

Also ensure the design remains understandable without color.

---

# 94. INTERNATIONALIZATION READINESS

Do not hard-code financial assumptions into UI text.

Keep strings centralized enough to allow future i18n.

English is the initial language.

---

# 95. LOGGING

Development:

Useful structured console logging.

Production:

No noisy console logs.

Never log sensitive financial information unnecessarily.

---

# 96. BUILD REQUIREMENTS

The application must successfully run:

```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
```

Add scripts as necessary.

The production build must complete without TypeScript errors.

---

# 97. DEFINITION OF DONE

Do not consider the task complete merely because the UI renders.

The application is complete only when:

1. Loan creation works.
2. EMI calculation works.
3. Amortization works.
4. Broken period works.
5. Actual payments work.
6. Part-payments work.
7. Recurring rules work.
8. Individual overrides work.
9. Reduce-tenure works.
10. Reduce-EMI works.
11. Scenarios work.
12. Dashboard analytics work.
13. Charts work.
14. Tables work.
15. CSV export works.
16. CSV import works.
17. Browser recovery works.
18. File System Access API integration works where supported.
19. Fallback download/import works.
20. Multiple loans work.
21. Validation works.
22. Error handling works.
23. Dark/light mode works.
24. Responsive UI works.
25. Accessibility is addressed.
26. Unit tests pass.
27. Integration tests pass.
28. Production build passes.
29. Documentation exists.
30. No critical TypeScript/ESLint errors remain.

---

# 98. DEVELOPMENT PROCESS

Follow this implementation order:

## Phase 1

Create project and configuration.

## Phase 2

Create domain types and financial calculation engine.

## Phase 3

Create comprehensive calculation tests.

Do not continue if fundamental financial tests fail.

## Phase 4

Create Redux store and slices.

## Phase 5

Implement CSV serialization/import/export.

## Phase 6

Implement browser persistence.

## Phase 7

Implement loan setup UI.

## Phase 8

Implement payment and part-payment management.

## Phase 9

Implement scenario engine and simulator.

## Phase 10

Implement dashboard and charts.

## Phase 11

Implement responsive/mobile UI.

## Phase 12

Implement accessibility and polish.

## Phase 13

Add integration/E2E tests.

## Phase 14

Run full production validation.

---

# 99. IMPORTANT CODING-AGENT BEHAVIOR

You are expected to actually implement the application.

Do not stop after:

* architecture
* wireframes
* pseudo-code
* TODO lists
* partial examples

When you encounter an ambiguity:

1. Prefer a sensible production-grade default.
2. Document the assumption.
3. Make it configurable when practical.
4. Continue implementation.

Do not repeatedly ask for confirmation for ordinary engineering decisions.

Only ask for clarification if proceeding would create a fundamentally incompatible architecture.

---

# 100. DO NOT FAKE FUNCTIONALITY

Do not create buttons that do nothing.

Do not create fake charts using hardcoded values.

Do not create fake CSV persistence.

Do not create placeholder calculations.

Every visible feature must either:

* be fully implemented, or
* clearly be marked as unavailable/not implemented.

Prefer implementing it.

---

# 101. NO HARDCODED ANALYTICS

Dashboard values must come from actual Redux/domain data.

Never hardcode:

```text
₹5,55,000 saved
31 months saved
```

These must be calculated from the current loan.

---

# 102. SAMPLE DATA

Provide an optional sample/demo loan only for development/testing.

Clearly distinguish sample data from user data.

Do not automatically overwrite user data with sample data.

---

# 103. FINAL VALIDATION

Before declaring completion:

Run:

```bash
npm run lint
npm run test
npm run build
```

Fix all errors.

If Playwright is available:

```bash
npm run test:e2e
```

Also manually verify:

1. Create loan.
2. Add payment.
3. Add part-payment.
4. Add recurring rule.
5. Override one month.
6. Generate scenario.
7. Compare scenarios.
8. Change dashboard filters.
9. Export CSV.
10. Reload application.
11. Recover browser state.
12. Import CSV.
13. Save CSV.
14. Reopen saved CSV.
15. Verify calculations remain consistent.

---

# 104. FINAL DELIVERABLE

At completion provide:

1. Complete source code.
2. Fully configured package.json.
3. README.md.
4. ARCHITECTURE.md.
5. FINANCIAL_CALCULATIONS.md.
6. CSV_SCHEMA.md.
7. TESTING.md.
8. Unit tests.
9. Integration tests.
10. E2E tests if supported.
11. Example/sample CSV.
12. Production build configuration.

Also provide a concise final report containing:

```text
Implemented features
Architecture
Financial calculation methodology
CSV persistence approach
Browser compatibility
Test coverage
Known limitations
How to run
How to build
```

---

# 105. MOST IMPORTANT REQUIREMENT

Financial correctness takes priority over visual polish.

The application must never show internally inconsistent numbers.

For example:

```text
Original Principal
=
Principal Paid
+
Outstanding Principal
```

subject to explicitly documented rounding rules.

Likewise:

```text
Total Payment
=
Principal
+
Interest
+
Applicable Fees
```

and:

```text
Original Interest
-
Projected Interest
=
Projected Interest Saving
```

subject to the defined baseline and rounding methodology.

All such invariants must be tested.

Build the application as if it will be used by real users to track significant financial obligations.

Do not optimize for a quick demo.

Optimize for:

* correctness
* maintainability
* auditability
* usability
* accessibility
* reliability
* extensibility
* local privacy
* deterministic calculations

Start implementing the project now.
